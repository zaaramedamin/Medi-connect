import { Router } from 'express';
import { body } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// GET /api/reviews/doctor/:id — list a doctor's reviews (public)
router.get('/doctor/:id', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('id, rating, comment, created_at, patient_id')
    .eq('doctor_id', req.params.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch reviews' });

  // Attach the reviewer's display name from auth.users
  const enriched = await Promise.all(
    (data ?? []).map(async r => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(r.patient_id);
      return {
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        patient_name: (u.user?.user_metadata?.name as string) ?? 'Patient',
      };
    })
  );

  res.json(enriched);
});

// POST /api/reviews — create/update a review (patient, after a completed visit)
router.post(
  '/',
  requireAuth,
  requireRole('patient'),
  validate([
    body('doctor_id').notEmpty().trim(),
    body('rating').isInt({ min: 1, max: 5 }),
    body('comment').optional().trim().isLength({ max: 1000 }).escape(),
  ]),
  async (req, res) => {
    const { doctor_id, rating, comment } = req.body;
    const patientId = req.user!.id;

    // A patient may only review a doctor they have completed an appointment with
    const { data: appt } = await supabaseAdmin
      .from('appointments')
      .select('id')
      .eq('doctor_id', doctor_id)
      .eq('user_id', patientId)
      .eq('status', 'completed')
      .limit(1)
      .maybeSingle();

    if (!appt) {
      return res.status(403).json({ error: 'You can only review a doctor after a completed appointment.' });
    }

    const { data, error } = await supabaseAdmin
      .from('reviews')
      .upsert(
        { doctor_id, patient_id: patientId, rating, comment: comment ?? null },
        { onConflict: 'doctor_id,patient_id' }
      )
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to submit review' });
    res.status(201).json(data);
  }
);

export default router;
