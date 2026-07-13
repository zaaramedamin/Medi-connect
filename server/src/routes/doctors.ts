import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { generateTimeSlots, buildAvailableSlots } from '../services/appointmentService';
import { embedQuery, reindexDoctor } from '../services/embeddings';

const router = Router();

interface DoctorRow {
  id: string;
  [key: string]: unknown;
}

// Merge average rating + review count into a list of doctor rows
async function attachRatings<T extends DoctorRow>(doctors: T[]): Promise<(T & { avg_rating: number; review_count: number })[]> {
  if (doctors.length === 0) return [];
  const ids = doctors.map(d => d.id);
  const { data: summaries } = await supabaseAdmin
    .from('doctor_rating_summary')
    .select('doctor_id, avg_rating, review_count')
    .in('doctor_id', ids);

  const map = new Map((summaries ?? []).map(s => [s.doctor_id, s]));
  return doctors.map(d => ({
    ...d,
    avg_rating: Number(map.get(d.id)?.avg_rating ?? 0),
    review_count: Number(map.get(d.id)?.review_count ?? 0),
  }));
}

// Merge lat/lng into doctor rows. Resilient: if the columns don't exist yet
// (map migration not run), doctors are returned unchanged instead of erroring.
async function attachCoords<T extends DoctorRow>(doctors: T[]): Promise<T[]> {
  if (doctors.length === 0) return doctors;
  const ids = doctors.map(d => d.id);
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('id, lat, lng')
    .in('id', ids);

  if (error) return doctors;
  const map = new Map((data ?? []).map(r => [r.id, r]));
  return doctors.map(d => ({
    ...d,
    lat: map.get(d.id)?.lat ?? null,
    lng: map.get(d.id)?.lng ?? null,
  }));
}

// Extended profile columns + clinic posts (seed/doctor-profile.sql). Both are
// best-effort for the same reason attachCoords is: if that migration hasn't
// been run, the profile still renders — just without these sections.
const PROFILE_EXTRAS = 'phone, email, website, address, years_experience, languages';

async function getProfileExtras(doctorId: string): Promise<Record<string, unknown>> {
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select(PROFILE_EXTRAS)
    .eq('id', doctorId)
    .maybeSingle();

  if (error || !data) return {};
  return data;
}

export interface ClinicPost {
  id: number;
  clinic_name: string;
  role: string | null;
  city: string | null;
  start_year: number | null;
  end_year: number | null;
}

async function getClinicPosts(doctorId: string): Promise<ClinicPost[]> {
  const { data, error } = await supabaseAdmin
    .from('doctor_clinics')
    .select('id, clinic_name, role, city, start_year, end_year')
    .eq('doctor_id', doctorId)
    // Current posts (no end year) first, then the most recently ended.
    .order('end_year', { ascending: false, nullsFirst: true })
    .order('start_year', { ascending: false });

  if (error) return [];
  return (data ?? []) as ClinicPost[];
}

// GET /api/doctors/search?q=&specialty=&location=
router.get('/search', async (req, res) => {
  const { q = '', specialty, location } = req.query as Record<string, string>;

  let queryBuilder = supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, location, description, photos_url, cost, avg_consultation_time')
    // Only doctors with an active subscription are listed to patients
    .eq('subscription_status', 'active')
    .order('name');

  if (q) {
    queryBuilder = queryBuilder.or(`name.ilike.%${q}%,specialty.ilike.%${q}%,location.ilike.%${q}%`);
  }
  if (specialty) queryBuilder = queryBuilder.ilike('specialty', `%${specialty}%`);
  if (location) queryBuilder = queryBuilder.ilike('location', `%${location}%`);

  const { data, error } = await queryBuilder.limit(20);
  if (error) return res.status(500).json({ error: 'Failed to search doctors' });

  res.json(await attachCoords(await attachRatings(data ?? [])));
});

// GET /api/doctors/semantic-search?q= — natural-language doctor finder.
// Ranks active doctors by how well their profile (specialty + city + bio)
// matches the phrasing, via match_doctors. Registered before "/:id" so the
// literal "semantic-search" isn't captured as an id.
router.get('/semantic-search', async (req, res) => {
  const q = String(req.query.q ?? '').trim();
  if (q.length < 3) return res.json([]);

  let ranked: { id: string; similarity: number }[] = [];
  try {
    const queryEmbedding = await embedQuery(q);
    const { data, error } = await supabaseAdmin.rpc('match_doctors', {
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: 12,
    });
    if (error) throw new Error(error.message);
    ranked = (data ?? []) as { id: string; similarity: number }[];
  } catch (err) {
    console.error('doctors/semantic-search error:', err);
    return res.status(502).json({ error: 'Search is temporarily unavailable' });
  }

  // Keep reasonably-relevant matches only, in best-match order.
  const MIN_SIMILARITY = 0.76;
  const ids = ranked.filter(r => r.similarity >= MIN_SIMILARITY).map(r => r.id);
  if (!ids.length) return res.json([]);

  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, location, description, photos_url, cost, avg_consultation_time')
    .in('id', ids)
    .eq('subscription_status', 'active');
  if (error) return res.status(500).json({ error: 'Failed to search doctors' });

  const byId = new Map((data ?? []).map(d => [d.id, d]));
  const ordered = ids.map(id => byId.get(id)).filter((d): d is NonNullable<typeof d> => Boolean(d));
  res.json(await attachCoords(await attachRatings(ordered)));
});

// GET /api/doctors/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, location, description, photos_url, cost, working_hours_start, working_hours_end, avg_consultation_time')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Doctor not found' });

  const [{ data: summary }, coords, extras, clinics] = await Promise.all([
    supabaseAdmin
      .from('doctor_rating_summary')
      .select('avg_rating, review_count')
      .eq('doctor_id', req.params.id)
      .maybeSingle(),
    supabaseAdmin
      .from('doctors')
      .select('lat, lng')
      .eq('id', req.params.id)
      .maybeSingle(),
    getProfileExtras(req.params.id),
    getClinicPosts(req.params.id),
  ]);

  res.json({
    ...data,
    ...extras,
    avg_rating: Number(summary?.avg_rating ?? 0),
    review_count: Number(summary?.review_count ?? 0),
    lat: coords.data?.lat ?? null,
    lng: coords.data?.lng ?? null,
    clinics,
  });
});

// GET /api/doctors/:id/slots?date=YYYY-MM-DD
router.get('/:id/slots', async (req, res) => {
  const { date } = req.query as { date?: string };
  if (!date) return res.status(400).json({ error: 'date query param required' });

  const { data: doctor, error: docError } = await supabaseAdmin
    .from('doctors')
    .select('working_hours_start, working_hours_end, avg_consultation_time')
    .eq('id', req.params.id)
    .single();

  if (docError || !doctor) return res.status(404).json({ error: 'Doctor not found' });
  if (!doctor.working_hours_start || !doctor.avg_consultation_time) {
    return res.json([]);
  }

  const allSlots = generateTimeSlots(
    doctor.working_hours_start,
    doctor.working_hours_end ?? '17:00',
    doctor.avg_consultation_time,
    date
  );

  const startOfDay = `${date}T00:00:00`;
  const endOfDay = `${date}T23:59:59`;

  const [{ data: booked }, { data: blocked }] = await Promise.all([
    supabaseAdmin
      .from('appointments')
      .select('time_slot')
      .eq('doctor_id', req.params.id)
      .eq('status', 'confirmed')
      .gte('time_slot', startOfDay)
      .lte('time_slot', endOfDay),
    supabaseAdmin
      .from('blocked_slots')
      .select('start_time, end_time')
      .eq('doctor_id', req.params.id)
      .gte('start_time', startOfDay)
      .lte('end_time', endOfDay),
  ]);

  const slots = buildAvailableSlots(
    allSlots,
    (booked ?? []).map(r => r.time_slot),
    blocked ?? []
  );

  res.json(slots);
});

// A cleared form field arrives as '' — store it as NULL, not an empty string.
const blankToNull = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);

// The text fields below are NOT .escape()d. React escapes every interpolated
// string on render and nothing here is passed to dangerouslySetInnerHTML, so
// escaping on the way in would only corrupt what the doctor actually typed —
// "I'm a cardiologist" would be stored, and shown, as "I&#x27;m a cardiologist".

// PUT /api/doctors/profile — update own profile (doctor only)
router.put(
  '/profile',
  requireAuth,
  requireRole('doctor'),
  validate([
    body('name').optional().trim().isLength({ min: 2, max: 100 }),
    body('specialty').optional().trim().isLength({ max: 100 }),
    body('location').optional().trim().isLength({ max: 200 }),
    body('description').optional().trim().isLength({ max: 2000 }),
    body('cost').optional().isFloat({ min: 0 }),
    body('phone').optional({ values: 'falsy' }).trim().isMobilePhone('any'),
    body('working_hours_start').optional().matches(/^\d{2}:\d{2}$/),
    body('working_hours_end').optional().matches(/^\d{2}:\d{2}$/),
    body('avg_consultation_time').optional().isInt({ min: 10, max: 240 }),
    // Public profile fields (seed/doctor-profile.sql)
    body('email').optional({ values: 'falsy' }).trim().isEmail(),
    body('website').optional({ values: 'falsy' }).trim().isURL(),
    body('address').optional().trim().isLength({ max: 300 }),
    body('years_experience').optional({ values: 'null' }).isInt({ min: 0, max: 70 }),
    body('languages').optional().isArray({ max: 10 }),
    body('languages.*').trim().isLength({ min: 1, max: 40 }),
    body('clinics').optional().isArray({ max: 20 }),
    body('clinics.*.clinic_name').trim().isLength({ min: 1, max: 120 }),
    body('clinics.*.role').optional({ values: 'falsy' }).trim().isLength({ max: 120 }),
    body('clinics.*.city').optional({ values: 'falsy' }).trim().isLength({ max: 80 }),
    body('clinics.*.start_year').optional({ values: 'null' }).isInt({ min: 1950, max: 2100 }),
    body('clinics.*.end_year').optional({ values: 'null' }).isInt({ min: 1950, max: 2100 }),
  ]),
  async (req, res) => {
    const { clinics, ...body } = req.body;

    const FIELDS = [
      'name', 'specialty', 'location', 'description', 'cost', 'phone',
      'working_hours_start', 'working_hours_end', 'avg_consultation_time',
      'photos_url', 'email', 'website', 'address', 'years_experience', 'languages',
    ] as const;

    const updates: Record<string, unknown> = {};
    for (const field of FIELDS) {
      if (body[field] !== undefined) updates[field] = blankToNull(body[field]);
    }

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .update(updates)
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update profile' });

    // Clinic posts live in their own table and are edited as a whole list, so
    // the RPC swaps them atomically — a failed insert can't leave the doctor
    // with no posts. Untouched when the request didn't mention them.
    const saved: Record<string, unknown> = { ...data };
    if (clinics !== undefined) {
      const { error: clinicError } = await supabaseAdmin.rpc('replace_doctor_clinics', {
        p_doctor_id: req.user!.id,
        p_clinics: clinics,
      });
      if (clinicError) return res.status(500).json({ error: 'Failed to update clinic posts' });
      saved.clinics = await getClinicPosts(req.user!.id);
    }

    // Re-embed when a field that feeds the natural-language finder changed.
    if (body.specialty !== undefined || body.location !== undefined || body.description !== undefined) {
      void reindexDoctor(req.user!.id).catch(err => console.error('Doctor reindex failed:', err));
    }

    res.json(saved);
  }
);

// POST /api/doctors/block-slot
router.post(
  '/block-slot',
  requireAuth,
  requireRole('doctor'),
  validate([
    body('start_time').isISO8601().toDate(),
    body('end_time').isISO8601().toDate(),
  ]),
  async (req, res) => {
    const { start_time, end_time } = req.body;

    const { data, error } = await supabaseAdmin
      .from('blocked_slots')
      .insert({ doctor_id: req.user!.id, start_time, end_time })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to block slot' });
    res.status(201).json(data);
  }
);

// DELETE /api/doctors/block-slot/:id
router.delete('/block-slot/:id', requireAuth, requireRole('doctor'), async (req, res) => {
  const { error } = await supabaseAdmin
    .from('blocked_slots')
    .delete()
    .eq('id', req.params.id)
    .eq('doctor_id', req.user!.id);

  if (error) return res.status(500).json({ error: 'Failed to remove blocked slot' });
  res.status(204).send();
});

// DELETE /api/doctors/account — delete own account
router.delete('/account', requireAuth, requireRole('doctor'), async (req, res) => {
  const doctorId = req.user!.id;

  // Delete appointments, blocked slots, and doctor profile in sequence
  await supabaseAdmin.from('appointments').delete().eq('doctor_id', doctorId);
  await supabaseAdmin.from('blocked_slots').delete().eq('doctor_id', doctorId);
  await supabaseAdmin.from('doctors').delete().eq('id', doctorId);
  await supabaseAdmin.auth.admin.deleteUser(doctorId);

  res.status(204).send();
});

export default router;
