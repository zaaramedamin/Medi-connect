import { Router } from 'express';
import { body } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendAppointmentConfirmation } from '../services/emailService';

const router = Router();

// POST /api/appointments — book an appointment (patient only)
router.post(
  '/',
  requireAuth,
  requireRole('patient'),
  validate([
    body('doctor_id').notEmpty().trim().escape(),
    body('time_slot').isISO8601().toDate(),
    body('payment_method').isIn(['cash', 'online']),
  ]),
  async (req, res) => {
    const { doctor_id, time_slot, payment_method } = req.body;
    const patientId = req.user!.id;

    // Check the slot is still available (prevent race condition)
    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('time_slot', time_slot)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'This time slot has just been booked. Please choose another.' });
    }

    const { data, error } = await supabaseAdmin
      .from('appointments')
      .insert({
        doctor_id,
        user_id: patientId,
        time_slot,
        payment_method,
        status: 'confirmed',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to book appointment' });

    // Send confirmation email async (don't block response)
    const [{ data: doctor }, { data: patient }] = await Promise.all([
      supabaseAdmin.from('doctors').select('name').eq('id', doctor_id).single(),
      supabaseAdmin.auth.admin.getUserById(patientId),
    ]);

    if (doctor && patient.user) {
      const appointmentDate = new Date(time_slot).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      const appointmentTime = new Date(time_slot).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      sendAppointmentConfirmation(
        patient.user.email!,
        patient.user.user_metadata?.name ?? 'Patient',
        doctor.name,
        appointmentDate,
        appointmentTime
      ).catch(console.error);
    }

    res.status(201).json(data);
  }
);

// GET /api/appointments/my — patient's own appointments
router.get('/my', requireAuth, requireRole('patient'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(`
      id, time_slot, status, payment_method, payment_status, created_at,
      doctors (id, name, specialty, location, photos_url)
    `)
    .eq('user_id', req.user!.id)
    .order('time_slot', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch appointments' });
  res.json(data);
});

// GET /api/appointments/doctor — doctor's upcoming appointments
router.get('/doctor', requireAuth, requireRole('doctor'), async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('id, time_slot, status, payment_method, payment_status, user_id')
    .eq('doctor_id', req.user!.id)
    .gte('time_slot', new Date().toISOString())
    .order('time_slot', { ascending: true });

  if (error) return res.status(500).json({ error: 'Failed to fetch appointments' });

  // Enrich with patient info from auth.users
  const enriched = await Promise.all(
    (data ?? []).map(async apt => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(apt.user_id);
      return {
        ...apt,
        patient_name: userData.user?.user_metadata?.name ?? 'Unknown',
        patient_email: userData.user?.email ?? '',
      };
    })
  );

  res.json(enriched);
});

// PATCH /api/appointments/:id/cancel — cancel an appointment
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const { data: existing } = await supabaseAdmin
    .from('appointments')
    .select('user_id, doctor_id, status')
    .eq('id', req.params.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Appointment not found' });

  // Only the patient or doctor who owns it can cancel
  const isOwner = existing.user_id === req.user!.id || existing.doctor_id === req.user!.id;
  if (!isOwner) return res.status(403).json({ error: 'Forbidden' });
  if (existing.status !== 'confirmed') return res.status(400).json({ error: 'Appointment cannot be cancelled' });

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'cancelled' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to cancel appointment' });
  res.json(data);
});

export default router;
