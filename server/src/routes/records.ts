import { Router, type Request } from 'express';
import { body } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  hasTreated, logAccess, nextReference, loadPatientIdentity,
} from '../services/medicalRecords';

/**
 * Medical records — Protected Health Information.
 *
 * Access rules (enforced here; RLS on these tables has no policies, so these
 * handlers are the ONLY real control):
 *   - A doctor may read/write the file of a patient they have treated (hasTreated).
 *   - A patient may read their own documents.
 *   - Admins are excluded from clinical content entirely.
 * Every read and write is written to medical_access_log.
 */
const router = Router();

const ipOf = (req: Request) => (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null;

// ── Doctor: the patients this doctor has seen ────────────────────────
router.get('/patients', requireAuth, requireRole('doctor'), async (req, res) => {
  const doctorId = req.user!.id;
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('user_id, time_slot, status')
    .eq('doctor_id', doctorId)
    .order('time_slot', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to load patients' });

  // Distinct patients, keeping their most recent visit.
  const seen = new Map<string, { user_id: string; last_visit: string; visits: number }>();
  for (const a of data ?? []) {
    const cur = seen.get(a.user_id);
    if (cur) cur.visits += 1;
    else seen.set(a.user_id, { user_id: a.user_id, last_visit: a.time_slot, visits: 1 });
  }

  const patients = await Promise.all(
    [...seen.values()].map(async p => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(p.user_id);
      return {
        id: p.user_id,
        name: (u.user?.user_metadata?.name as string) ?? 'Unknown',
        email: u.user?.email ?? '',
        last_visit: p.last_visit,
        visits: p.visits,
      };
    })
  );

  res.json(patients);
});

// ── Doctor: full file for one patient ────────────────────────────────
router.get('/patients/:id', requireAuth, requireRole('doctor'), async (req, res) => {
  const doctorId = req.user!.id;
  const patientId = req.params.id;

  if (!(await hasTreated(doctorId, patientId))) {
    return res.status(403).json({ error: 'You do not have a patient relationship with this person.' });
  }

  const [identity, { data: chart }, { data: consultations }, { data: documents }] = await Promise.all([
    loadPatientIdentity(patientId),
    supabaseAdmin.from('patient_charts').select('*').eq('patient_id', patientId).maybeSingle(),
    supabaseAdmin.from('consultations').select('*').eq('patient_id', patientId).order('visit_date', { ascending: false }),
    supabaseAdmin.from('medical_documents').select('id, reference, type, issued_at, revoked_at, consultation_id').eq('patient_id', patientId).order('issued_at', { ascending: false }),
  ]);

  logAccess({ actorId: doctorId, actorRole: 'doctor', patientId, action: 'view_patient', ip: ipOf(req) });
  res.json({ patient: identity, chart: chart ?? null, consultations: consultations ?? [], documents: documents ?? [] });
});

// ── Doctor: create/update the standing chart ─────────────────────────
router.put(
  '/patients/:id/chart',
  requireAuth,
  requireRole('doctor'),
  validate([
    body('chronic_conditions').optional().isArray({ max: 40 }),
    body('chronic_conditions.*').isString().trim().isLength({ max: 60 }),
    body('current_medications').optional().isArray({ max: 60 }),
    body('current_medications.*.name').trim().isLength({ min: 1, max: 120 }),
    body('current_medications.*.dose').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
    body('current_medications.*.frequency').optional({ values: 'falsy' }).trim().isLength({ max: 60 }),
    body('clinical_allergies').optional({ values: 'falsy' }).trim().isLength({ max: 1000 }),
    body('notes').optional({ values: 'falsy' }).trim().isLength({ max: 4000 }),
  ]),
  async (req, res) => {
    const doctorId = req.user!.id;
    const patientId = req.params.id;
    if (!(await hasTreated(doctorId, patientId))) {
      return res.status(403).json({ error: 'You do not have a patient relationship with this person.' });
    }

    const { chronic_conditions, current_medications, clinical_allergies, notes } = req.body;
    const { data, error } = await supabaseAdmin
      .from('patient_charts')
      .upsert({
        patient_id: patientId,
        chronic_conditions: chronic_conditions ?? [],
        current_medications: current_medications ?? [],
        clinical_allergies: clinical_allergies || null,
        notes: notes || null,
        updated_by: doctorId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'patient_id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to save the chart' });
    logAccess({ actorId: doctorId, actorRole: 'doctor', patientId, action: 'update_chart', ip: ipOf(req) });
    res.json(data);
  }
);

// ── Doctor: add a consultation ───────────────────────────────────────
router.post(
  '/patients/:id/consultations',
  requireAuth,
  requireRole('doctor'),
  validate([
    body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
    body('symptoms').optional({ values: 'falsy' }).trim().isLength({ max: 3000 }),
    body('examination').optional({ values: 'falsy' }).trim().isLength({ max: 3000 }),
    body('diagnosis').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
    body('plan').optional({ values: 'falsy' }).trim().isLength({ max: 3000 }),
    body('appointment_id').optional({ values: 'null' }).isInt(),
    body('vitals').optional().isObject(),
  ]),
  async (req, res) => {
    const doctorId = req.user!.id;
    const patientId = req.params.id;
    if (!(await hasTreated(doctorId, patientId))) {
      return res.status(403).json({ error: 'You do not have a patient relationship with this person.' });
    }

    const { reason, symptoms, examination, diagnosis, plan, vitals, appointment_id } = req.body;
    const { data, error } = await supabaseAdmin
      .from('consultations')
      .insert({
        patient_id: patientId,
        doctor_id: doctorId,
        appointment_id: appointment_id ?? null,
        reason: reason || null,
        symptoms: symptoms || null,
        examination: examination || null,
        diagnosis: diagnosis || null,
        plan: plan || null,
        vitals: vitals ?? null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to save the consultation' });
    logAccess({ actorId: doctorId, actorRole: 'doctor', patientId, action: 'create_consultation', targetId: data.id, ip: ipOf(req) });
    res.status(201).json(data);
  }
);

// ── Doctor: edit a consultation they authored ────────────────────────
router.patch(
  '/consultations/:id',
  requireAuth,
  requireRole('doctor'),
  validate([
    body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
    body('symptoms').optional({ values: 'falsy' }).trim().isLength({ max: 3000 }),
    body('examination').optional({ values: 'falsy' }).trim().isLength({ max: 3000 }),
    body('diagnosis').optional({ values: 'falsy' }).trim().isLength({ max: 2000 }),
    body('plan').optional({ values: 'falsy' }).trim().isLength({ max: 3000 }),
    body('vitals').optional().isObject(),
  ]),
  async (req, res) => {
    const doctorId = req.user!.id;
    const { data: existing } = await supabaseAdmin
      .from('consultations')
      .select('doctor_id, patient_id')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!existing) return res.status(404).json({ error: 'Consultation not found' });
    if (existing.doctor_id !== doctorId) return res.status(403).json({ error: 'Forbidden' });

    const fields = ['reason', 'symptoms', 'examination', 'diagnosis', 'plan', 'vitals'] as const;
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const f of fields) if (f in req.body) updates[f] = req.body[f] || null;

    const { data, error } = await supabaseAdmin
      .from('consultations')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update the consultation' });
    logAccess({ actorId: doctorId, actorRole: 'doctor', patientId: existing.patient_id, action: 'update_consultation', targetId: req.params.id, ip: ipOf(req) });
    res.json(data);
  }
);

// ── Doctor: issue a document (freezes an immutable snapshot) ──────────
router.post(
  '/consultations/:id/documents',
  requireAuth,
  requireRole('doctor'),
  validate([
    body('type').isIn(['report', 'prescription', 'certificate', 'referral']),
    body('body').isObject(), // type-specific payload: prescription lines, certificate dates, letter text…
  ]),
  async (req, res) => {
    const doctorId = req.user!.id;
    const { data: consultation } = await supabaseAdmin
      .from('consultations')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!consultation) return res.status(404).json({ error: 'Consultation not found' });
    if (consultation.doctor_id !== doctorId) return res.status(403).json({ error: 'Forbidden' });

    // Freeze EVERYTHING the document shows, so later edits to the profile,
    // the doctor's practice, or the consultation never change an issued document.
    const [{ data: doctor }, patient, { data: clinics }] = await Promise.all([
      supabaseAdmin.from('doctors').select('name, specialty, address, phone, email, location').eq('id', doctorId).single(),
      loadPatientIdentity(consultation.patient_id),
      supabaseAdmin.from('doctor_clinics').select('clinic_name, city, end_year').eq('doctor_id', doctorId).is('end_year', null).limit(1),
    ]);

    const type = req.body.type as string;
    const reference = await nextReference(type);

    const content = {
      reference,
      type,
      issued_at: new Date().toISOString(),
      doctor: {
        name: doctor?.name ?? 'Unknown',
        specialty: doctor?.specialty ?? null,
        clinic: clinics?.[0]?.clinic_name ?? null,
        address: doctor?.address ?? doctor?.location ?? null,
        phone: doctor?.phone ?? null,
        email: doctor?.email ?? null,
      },
      patient: {
        name: patient.name,
        date_of_birth: patient.date_of_birth,
        gender: patient.gender,
      },
      // A copy of the clinical context at issue time.
      consultation: {
        visit_date: consultation.visit_date,
        diagnosis: consultation.diagnosis,
        reason: consultation.reason,
      },
      // The type-specific content the doctor entered (drug list, certificate span, letter…).
      body: req.body.body,
    };

    const { data, error } = await supabaseAdmin
      .from('medical_documents')
      .insert({
        reference,
        type,
        patient_id: consultation.patient_id,
        doctor_id: doctorId,
        consultation_id: consultation.id,
        content,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to issue the document' });
    logAccess({ actorId: doctorId, actorRole: 'doctor', patientId: consultation.patient_id, action: 'issue_document', targetId: data.id, ip: ipOf(req) });
    res.status(201).json(data);
  }
);

// ── Doctor: revoke a document they issued (never deleted) ─────────────
router.post(
  '/documents/:id/revoke',
  requireAuth,
  requireRole('doctor'),
  validate([body('reason').optional({ values: 'falsy' }).trim().isLength({ max: 300 })]),
  async (req, res) => {
    const doctorId = req.user!.id;
    const { data: doc } = await supabaseAdmin
      .from('medical_documents')
      .select('doctor_id, patient_id, revoked_at')
      .eq('id', req.params.id)
      .maybeSingle();

    if (!doc) return res.status(404).json({ error: 'Document not found' });
    if (doc.doctor_id !== doctorId) return res.status(403).json({ error: 'Forbidden' });
    if (doc.revoked_at) return res.status(400).json({ error: 'Already revoked' });

    const { data, error } = await supabaseAdmin
      .from('medical_documents')
      .update({ revoked_at: new Date().toISOString(), revoked_reason: req.body.reason || null })
      .eq('id', req.params.id)
      .select('id, reference, revoked_at, revoked_reason')
      .single();

    if (error) return res.status(500).json({ error: 'Failed to revoke the document' });
    logAccess({ actorId: doctorId, actorRole: 'doctor', patientId: doc.patient_id, action: 'revoke_document', targetId: req.params.id, ip: ipOf(req) });
    res.json(data);
  }
);

// ── Patient: my own documents ────────────────────────────────────────
router.get('/me/documents', requireAuth, requireRole('patient'), async (req, res) => {
  // Implicit scope by filter — cannot be bypassed by a forgotten branch.
  const { data, error } = await supabaseAdmin
    .from('medical_documents')
    .select('id, reference, type, issued_at, revoked_at, doctor_id')
    .eq('patient_id', req.user!.id)
    .order('issued_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to load your documents' });

  const docs = await Promise.all(
    (data ?? []).map(async d => {
      const { data: doc } = await supabaseAdmin.from('doctors').select('name').eq('id', d.doctor_id).maybeSingle();
      return { ...d, doctor_name: doc?.name ?? 'Unknown' };
    })
  );
  res.json(docs);
});

// ── One document, for the print view ─────────────────────────────────
// Readable by the patient it belongs to, or the treating doctor. Never an admin.
router.get('/documents/:id', requireAuth, async (req, res) => {
  const { role, id: userId } = req.user!;
  const { data: doc, error } = await supabaseAdmin
    .from('medical_documents')
    .select('*')
    .eq('id', req.params.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Failed to load the document' });
  if (!doc) return res.status(404).json({ error: 'Document not found' });

  const allowed =
    (role === 'patient' && doc.patient_id === userId) ||
    (role === 'doctor' && doc.doctor_id === userId);
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  logAccess({ actorId: userId, actorRole: role, patientId: doc.patient_id, action: 'view_document', targetId: doc.id, ip: ipOf(req) });
  res.json(doc);
});

export default router;
