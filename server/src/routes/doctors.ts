import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { generateTimeSlots, buildAvailableSlots } from '../services/appointmentService';

const router = Router();

// GET /api/doctors/search?q=&specialty=&location=
router.get('/search', async (req, res) => {
  const { q = '', specialty, location } = req.query as Record<string, string>;

  let queryBuilder = supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, location, description, photos_url, cost, avg_consultation_time')
    .order('name');

  if (q) {
    queryBuilder = queryBuilder.or(`name.ilike.%${q}%,specialty.ilike.%${q}%,location.ilike.%${q}%`);
  }
  if (specialty) queryBuilder = queryBuilder.ilike('specialty', `%${specialty}%`);
  if (location) queryBuilder = queryBuilder.ilike('location', `%${location}%`);

  const { data, error } = await queryBuilder.limit(20);
  if (error) return res.status(500).json({ error: 'Failed to search doctors' });

  res.json(data);
});

// GET /api/doctors/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, location, description, photos_url, cost, working_hours_start, working_hours_end, avg_consultation_time')
    .eq('id', req.params.id)
    .single();

  if (error || !data) return res.status(404).json({ error: 'Doctor not found' });
  res.json(data);
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

// PUT /api/doctors/profile — update own profile (doctor only)
router.put(
  '/profile',
  requireAuth,
  requireRole('doctor'),
  validate([
    body('name').optional().trim().isLength({ min: 2, max: 100 }).escape(),
    body('specialty').optional().trim().isLength({ max: 100 }).escape(),
    body('location').optional().trim().isLength({ max: 200 }).escape(),
    body('description').optional().trim().isLength({ max: 2000 }).escape(),
    body('cost').optional().isFloat({ min: 0 }),
    body('phone').optional().trim().isMobilePhone('any'),
    body('working_hours_start').optional().matches(/^\d{2}:\d{2}$/),
    body('working_hours_end').optional().matches(/^\d{2}:\d{2}$/),
    body('avg_consultation_time').optional().isInt({ min: 10, max: 240 }),
  ]),
  async (req, res) => {
    const { name, specialty, location, description, cost, phone, working_hours_start, working_hours_end, avg_consultation_time, photos_url } = req.body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (specialty !== undefined) updates.specialty = specialty;
    if (location !== undefined) updates.location = location;
    if (description !== undefined) updates.description = description;
    if (cost !== undefined) updates.cost = cost;
    if (phone !== undefined) updates.phone = phone;
    if (working_hours_start !== undefined) updates.working_hours_start = working_hours_start;
    if (working_hours_end !== undefined) updates.working_hours_end = working_hours_end;
    if (avg_consultation_time !== undefined) updates.avg_consultation_time = avg_consultation_time;
    if (photos_url !== undefined) updates.photos_url = photos_url;

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .update(updates)
      .eq('id', req.user!.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update profile' });
    res.json(data);
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
