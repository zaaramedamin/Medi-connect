import { Router } from 'express';
import { body } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { sendAppointmentConfirmation } from '../services/emailService';
import { missingProfileFields } from '../services/patientProfile';
import { roomForAppointment, callWindow, JITSI_DOMAIN } from '../services/videoRoom';
import { bookingBlock, recordStrike, getPenalties, LATE_CANCEL_HOURS } from '../services/patientLimits';

const router = Router();

// Whether the appointments.mode column exists yet (seed/telemedicine.sql applied).
// Probed once and cached, so booking and appointment lists keep working before
// the migration is run — same resilience the map columns get in doctors.ts.
let hasModeColumn: boolean | null = null;
async function modeColumnExists(): Promise<boolean> {
  if (hasModeColumn !== null) return hasModeColumn;
  try {
    // Pre-migration, PostgREST returns an error object (not a throw) for the
    // unknown column, so !error correctly reports false.
    const { error } = await supabaseAdmin.from('appointments').select('mode').limit(1);
    hasModeColumn = !error;
  } catch {
    // Probe genuinely unavailable (transient, or a stubbed client) — assume the
    // column is present, which is the post-migration production state.
    hasModeColumn = true;
  }
  return hasModeColumn;
}

// POST /api/appointments — book an appointment (patient only)
router.post(
  '/',
  requireAuth,
  requireRole('patient'),
  validate([
    body('doctor_id').notEmpty().trim().escape(),
    body('time_slot').isISO8601().toDate(),
    body('payment_method').isIn(['cash', 'online']),
    body('mode').optional().isIn(['in_person', 'video']),
  ]),
  async (req, res) => {
    const { doctor_id, time_slot, payment_method, mode = 'in_person' } = req.body;
    const patientId = req.user!.id;

    // Reliability gate: a blacklisted or temporarily-banned patient can't book
    // anywhere on the platform. Checked first — it's the most fundamental block.
    const block = await bookingBlock(patientId);
    if (block) {
      return res.status(403).json({ error: block.message, code: block.code, until: block.until });
    }

    // A doctor can't work with a booking they can't attach a phone number or an
    // age to. The client sends the patient to /settings before they get here,
    // but the API is reachable on its own, so this is where the rule holds.
    // Checked before the slot lookup: it's the caller's own problem to fix, so
    // it should win over "someone else took that slot".
    let missing;
    try {
      missing = await missingProfileFields(patientId);
    } catch {
      return res.status(500).json({ error: 'Failed to check your profile' });
    }

    if (missing.length > 0) {
      return res.status(400).json({
        error: 'Complete your contact details before booking.',
        code: 'PROFILE_INCOMPLETE',
        missing,
      });
    }

    // validate().toDate() hands us a Date, and supabase-js interpolates filter
    // values into the query string — so .eq('time_slot', date) would send
    // "Wed Jul 08 2026 12:00:00 GMT+0100", which Postgres cannot match against
    // the stored timestamp. Compare on ISO instead.
    const slot = new Date(time_slot).toISOString();

    // Check the slot is still available (fast, friendly answer)
    const { data: existing } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('time_slot', slot)
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
        time_slot: slot,
        payment_method,
        // Only send mode once the column exists; before the migration, a video
        // request quietly falls back to in-person rather than failing the booking.
        ...((await modeColumnExists()) ? { mode } : {}),
        status: 'confirmed',
        payment_status: 'pending',
      })
      .select()
      .single();

    if (error) {
      // UNIQUE (doctor_id, time_slot, status) — someone booked this slot between
      // the check above and this insert. That's the real race, and it's a 409,
      // not a server fault.
      if (error.code === '23505') {
        return res.status(409).json({ error: 'This time slot has just been booked. Please choose another.' });
      }
      console.error('Booking failed:', error.message);
      return res.status(500).json({ error: 'Failed to book appointment' });
    }

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
  // A plain string (not a literal) so supabase-js doesn't type-parse the
  // conditional column; result is cast below.
  const columns: string = `
    id, time_slot, status, payment_method, payment_status, created_at,
    ${(await modeColumnExists()) ? 'mode,' : ''}
    doctors (id, name, specialty, location, photos_url)
  `;
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(columns)
    .eq('user_id', req.user!.id)
    .order('time_slot', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch appointments' });
  res.json(data);
});

// GET /api/appointments/doctor — all of the doctor's appointments (newest first)
router.get('/doctor', requireAuth, requireRole('doctor'), async (req, res) => {
  const columns: string = `id, time_slot, status, payment_method, payment_status, user_id${(await modeColumnExists()) ? ', mode' : ''}`;
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select(columns)
    .eq('doctor_id', req.user!.id)
    .order('time_slot', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch appointments' });

  // Enrich with patient info from auth.users and each patient's reliability flag,
  // so the doctor can see who has missed appointments before.
  const rows = (data ?? []) as unknown as { user_id: string }[];
  const penalties = await getPenalties([...new Set(rows.map(r => r.user_id))]);
  const enriched = await Promise.all(
    rows.map(async apt => {
      const { data: userData } = await supabaseAdmin.auth.admin.getUserById(apt.user_id);
      const p = penalties.get(apt.user_id);
      return {
        ...apt,
        patient_name: userData.user?.user_metadata?.name ?? 'Unknown',
        patient_email: userData.user?.email ?? '',
        patient_penalty: p
          ? { total_missed: p.total_missed, is_banned: p.is_banned, blacklisted: p.blacklisted, banned_until: p.banned_until }
          : null,
      };
    })
  );

  res.json(enriched);
});

// PATCH /api/appointments/:id/cancel — cancel an appointment
router.patch('/:id/cancel', requireAuth, async (req, res) => {
  const { data: existing } = await supabaseAdmin
    .from('appointments')
    .select('user_id, doctor_id, status, time_slot')
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

  // A patient cancelling within LATE_CANCEL_HOURS of the slot wastes it — that's
  // a strike. Cancelling earlier, or a doctor cancelling, is always free.
  const cancelledByPatient = existing.user_id === req.user!.id;
  const lateThreshold = new Date(existing.time_slot).getTime() - LATE_CANCEL_HOURS * 3600 * 1000;
  if (cancelledByPatient && Date.now() >= lateThreshold) {
    const penalty = await recordStrike(existing.user_id, 'late_cancel');
    return res.json({ ...data, penalty });
  }
  res.json(data);
});

// PATCH /api/appointments/:id/complete — doctor marks a past visit as completed
router.patch('/:id/complete', requireAuth, requireRole('doctor'), async (req, res) => {
  const { data: existing } = await supabaseAdmin
    .from('appointments')
    .select('doctor_id, status, time_slot')
    .eq('id', req.params.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Appointment not found' });
  if (existing.doctor_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (existing.status !== 'confirmed') {
    return res.status(400).json({ error: 'Only confirmed appointments can be completed' });
  }
  if (new Date(existing.time_slot) > new Date()) {
    return res.status(400).json({ error: 'This appointment has not taken place yet' });
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'completed' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to complete appointment' });
  res.json(data);
});

// PATCH /api/appointments/:id/no-show — doctor marks a past visit as missed.
// Strikes the patient immediately rather than waiting for the 24h auto-job.
router.patch('/:id/no-show', requireAuth, requireRole('doctor'), async (req, res) => {
  const { data: existing } = await supabaseAdmin
    .from('appointments')
    .select('doctor_id, user_id, status, time_slot')
    .eq('id', req.params.id)
    .single();

  if (!existing) return res.status(404).json({ error: 'Appointment not found' });
  if (existing.doctor_id !== req.user!.id) return res.status(403).json({ error: 'Forbidden' });
  if (existing.status !== 'confirmed') {
    return res.status(400).json({ error: 'Only confirmed appointments can be marked as missed' });
  }
  if (new Date(existing.time_slot) > new Date()) {
    return res.status(400).json({ error: 'This appointment has not taken place yet' });
  }

  const { data, error } = await supabaseAdmin
    .from('appointments')
    .update({ status: 'no_show' })
    .eq('id', req.params.id)
    .eq('status', 'confirmed')
    .select()
    .single();

  if (error) return res.status(500).json({ error: 'Failed to mark as missed' });
  const penalty = await recordStrike(existing.user_id, 'no_show');
  res.json({ ...data, penalty });
});

// GET /api/appointments/:id/call — the video room, for the two participants only.
// The room name is never stored or listed; it is minted here and returned only
// to the appointment's doctor or patient, and only within the call window.
router.get('/:id/call', requireAuth, async (req, res) => {
  const { data: apt } = await supabaseAdmin
    .from('appointments')
    .select('id, doctor_id, user_id, time_slot, status, mode')
    .eq('id', req.params.id)
    .single();

  if (!apt) return res.status(404).json({ error: 'Appointment not found' });

  const isParticipant = apt.user_id === req.user!.id || apt.doctor_id === req.user!.id;
  if (!isParticipant) return res.status(403).json({ error: 'Forbidden' });
  if (apt.mode !== 'video') return res.status(400).json({ error: 'This is not a video appointment' });
  if (apt.status === 'cancelled') return res.status(400).json({ error: 'This appointment was cancelled' });

  const window = callWindow(apt.time_slot);
  if (!window.open) {
    return res.status(403).json({
      error: 'The call room is not open yet.',
      code: 'CALL_NOT_OPEN',
      opens_at: window.opensAt.toISOString(),
      closes_at: window.closesAt.toISOString(),
    });
  }

  // The doctor is the moderator; label each participant so the other sees who
  // joined. Names come from auth metadata, never anything clinical.
  const isDoctor = apt.doctor_id === req.user!.id;
  res.json({
    domain: JITSI_DOMAIN,
    room: roomForAppointment(apt.id),
    display_name: (req.user!.email ?? '').split('@')[0],
    is_moderator: isDoctor,
    closes_at: window.closesAt.toISOString(),
  });
});

export default router;
