import { Router } from 'express';
import { body } from 'express-validator';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const FIELDS = ['phone', 'date_of_birth', 'gender', 'address', 'city', 'blood_type', 'allergies', 'emergency_contact'] as const;

// GET /api/profile/me — the caller's profile (null if not created yet)
router.get('/me', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', req.user!.id)
    .maybeSingle();

  if (error) return res.status(500).json({ error: 'Failed to load profile' });
  res.json(data ?? null);
});

// PUT /api/profile/me — create or update the caller's profile
router.put(
  '/me',
  requireAuth,
  validate([
    body('phone').optional({ values: 'falsy' }).trim().isLength({ max: 50 }),
    body('date_of_birth').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
    body('gender').optional({ values: 'falsy' }).isIn(['male', 'female', 'other']),
    body('address').optional({ values: 'falsy' }).trim().isLength({ max: 300 }),
    body('city').optional({ values: 'falsy' }).trim().isLength({ max: 100 }),
    body('blood_type').optional({ values: 'falsy' }).isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
    body('allergies').optional({ values: 'falsy' }).trim().isLength({ max: 500 }),
    body('emergency_contact').optional({ values: 'falsy' }).trim().isLength({ max: 150 }),
  ]),
  async (req, res) => {
    // Empty strings become NULL so CHECK constraints (e.g. gender) stay happy.
    const updates: Record<string, unknown> = { id: req.user!.id, updated_at: new Date().toISOString() };
    for (const field of FIELDS) {
      if (field in req.body) updates[field] = req.body[field] === '' ? null : req.body[field];
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert(updates, { onConflict: 'id' })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to save profile' });
    res.json(data);
  }
);

export default router;
