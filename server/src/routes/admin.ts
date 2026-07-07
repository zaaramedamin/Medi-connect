import { Router } from 'express';
import { body } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// Every route here requires an authenticated admin
router.use(requireAuth, requireRole('admin'));

// GET /api/admin/doctors — list all doctors with subscription info
router.get('/doctors', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('doctors')
    .select('id, name, specialty, location, cost, photos_url, subscription_status, subscription_expires, created_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch doctors' });
  res.json(data);
});

// POST /api/admin/doctors — onboard a new doctor (creates auth user + profile)
router.post(
  '/doctors',
  validate([
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().isLength({ min: 2, max: 100 }),
    body('specialty').optional().trim().isLength({ max: 100 }),
    body('location').optional().trim().isLength({ max: 200 }),
    body('cost').optional().isFloat({ min: 0 }),
    body('activate').optional().isBoolean(),
  ]),
  async (req, res) => {
    const { email, password, name, specialty, location, cost, activate = true } = req.body;

    // 1. Create the auth user with the doctor role
    const { data: created, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, role: 'doctor' },
    });

    if (authError || !created.user) {
      return res.status(400).json({ error: authError?.message ?? 'Failed to create user' });
    }

    // 2. Create the doctor profile
    const oneYear = new Date();
    oneYear.setFullYear(oneYear.getFullYear() + 1);

    const { data: doctor, error: profileError } = await supabaseAdmin
      .from('doctors')
      .insert({
        id: created.user.id,
        name,
        specialty: specialty ?? null,
        location: location ?? null,
        cost: cost ?? null,
        subscription_status: activate ? 'active' : 'inactive',
        subscription_expires: activate ? oneYear.toISOString() : null,
      })
      .select()
      .single();

    if (profileError) {
      // Roll back the auth user if the profile insert failed
      await supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return res.status(500).json({ error: 'Failed to create doctor profile' });
    }

    res.status(201).json(doctor);
  }
);

// PATCH /api/admin/doctors/:id/subscription — activate or deactivate (mock)
router.patch(
  '/doctors/:id/subscription',
  validate([body('action').isIn(['activate', 'deactivate'])]),
  async (req, res) => {
    const { action } = req.body;

    const updates =
      action === 'activate'
        ? (() => {
            const expires = new Date();
            expires.setFullYear(expires.getFullYear() + 1);
            return { subscription_status: 'active', subscription_expires: expires.toISOString() };
          })()
        : { subscription_status: 'inactive', subscription_expires: null };

    const { data, error } = await supabaseAdmin
      .from('doctors')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, subscription_status, subscription_expires')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update subscription' });
    res.json(data);
  }
);

// DELETE /api/admin/doctors/:id — remove a doctor entirely
router.delete('/doctors/:id', async (req, res) => {
  const doctorId = req.params.id;

  await supabaseAdmin.from('appointments').delete().eq('doctor_id', doctorId);
  await supabaseAdmin.from('blocked_slots').delete().eq('doctor_id', doctorId);
  await supabaseAdmin.from('doctors').delete().eq('id', doctorId);
  await supabaseAdmin.auth.admin.deleteUser(doctorId);

  res.status(204).send();
});

// Mock yearly subscription fee used for the revenue estimate
const YEARLY_SUBSCRIPTION_FEE = 600;

// GET /api/admin/stats — platform analytics (doctors, reservations, peak times, sales)
router.get('/stats', async (_req, res) => {
  const [{ data: doctors }, { data: appts }, usersRes] = await Promise.all([
    supabaseAdmin.from('doctors').select('id, name, specialty, cost, subscription_status'),
    supabaseAdmin.from('appointments').select('doctor_id, user_id, time_slot, status'),
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const docs = doctors ?? [];
  const appointments = appts ?? [];
  const costById = new Map<string, number>(docs.map(d => [d.id, Number(d.cost ?? 0)]));
  const nameById = new Map<string, string>(docs.map(d => [d.id, d.name]));
  const specById = new Map<string, string | null>(docs.map(d => [d.id, d.specialty]));

  const now = Date.now();
  const completed = appointments.filter(a => a.status === 'completed');
  const upcoming = appointments.filter(a => a.status === 'confirmed' && new Date(a.time_slot).getTime() > now);
  const activeDoctors = docs.filter(d => d.subscription_status === 'active').length;

  // Revenue: consultations (completed visits) + mock subscriptions
  const consultationRevenue = completed.reduce((sum, a) => sum + (costById.get(a.doctor_id) ?? 0), 0);
  const subscriptionRevenue = activeDoctors * YEARLY_SUBSCRIPTION_FEE;

  // Top doctors by reservations (excluding cancellations) + their earned revenue
  const reservationCount = new Map<string, number>();
  const revenueByDoctor = new Map<string, number>();
  for (const a of appointments) {
    if (a.status === 'cancelled') continue;
    reservationCount.set(a.doctor_id, (reservationCount.get(a.doctor_id) ?? 0) + 1);
  }
  for (const a of completed) {
    revenueByDoctor.set(a.doctor_id, (revenueByDoctor.get(a.doctor_id) ?? 0) + (costById.get(a.doctor_id) ?? 0));
  }
  const topDoctors = [...reservationCount.entries()]
    .map(([id, reservations]) => ({
      id,
      name: nameById.get(id) ?? 'Doctor',
      specialty: specById.get(id) ?? null,
      reservations,
      revenue: revenueByDoctor.get(id) ?? 0,
    }))
    .sort((a, b) => b.reservations - a.reservations)
    .slice(0, 5);

  // Booking distribution by hour of day and weekday (most efficient times)
  const hourly = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
  const weekday = Array.from({ length: 7 }, () => 0);
  for (const a of appointments) {
    if (a.status === 'cancelled') continue;
    const d = new Date(a.time_slot);
    if (Number.isNaN(d.getTime())) continue;
    hourly[d.getHours()].count += 1;
    weekday[d.getDay()] += 1;
  }
  const peakHour = hourly.reduce((best, h) => (h.count > best.count ? h : best), hourly[0]);

  const patients = (usersRes.data?.users ?? []).filter(
    u => (u.user_metadata?.role ?? 'patient') === 'patient'
  ).length;

  res.json({
    totals: {
      doctors: docs.length,
      activeDoctors,
      patients,
      appointments: appointments.length,
      completed: completed.length,
      upcoming: upcoming.length,
    },
    revenue: {
      consultation: consultationRevenue,
      subscription: subscriptionRevenue,
      total: consultationRevenue + subscriptionRevenue,
    },
    topDoctors,
    hourly,
    peakHour,
    weekday,
  });
});

// GET /api/admin/patients — list patient accounts with their booking counts
router.get('/patients', async (_req, res) => {
  const [usersRes, { data: appts }] = await Promise.all([
    supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    supabaseAdmin.from('appointments').select('user_id'),
  ]);

  const bookings = new Map<string, number>();
  for (const a of appts ?? []) bookings.set(a.user_id, (bookings.get(a.user_id) ?? 0) + 1);

  const patients = (usersRes.data?.users ?? [])
    .filter(u => (u.user_metadata?.role ?? 'patient') === 'patient')
    .map(u => ({
      id: u.id,
      name: (u.user_metadata?.name as string) ?? u.email ?? 'Patient',
      email: u.email ?? '',
      created_at: u.created_at,
      appointments: bookings.get(u.id) ?? 0,
    }))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  res.json(patients);
});

// DELETE /api/admin/patients/:id — remove a patient account and their bookings
router.delete('/patients/:id', async (req, res) => {
  const patientId = req.params.id;

  // appointments.user_id has no cascade, so clear bookings first;
  // reviews and comments cascade when the auth user is deleted.
  await supabaseAdmin.from('appointments').delete().eq('user_id', patientId);
  const { error } = await supabaseAdmin.auth.admin.deleteUser(patientId);
  if (error) return res.status(500).json({ error: 'Failed to delete patient' });

  res.status(204).send();
});

export default router;
