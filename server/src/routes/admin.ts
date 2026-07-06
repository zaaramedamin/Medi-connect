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

export default router;
