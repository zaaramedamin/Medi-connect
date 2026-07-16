import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { hasTreated } from '../services/medicalRecords';
import { getPenalty, liftBan, clearBlacklist } from '../services/patientLimits';

/**
 * Patient reliability limits — reading a patient's penalty state and lifting
 * penalties.
 *
 * Removal authority (per spec):
 *   - lift a temporary ban: a doctor who has an appointment with the patient, or an admin
 *   - clear a blacklist: admin only
 */
const router = Router();

// GET /me — the caller's own penalty state (so a banned patient sees why).
// Registered before /:patientId so "me" isn't captured as an id.
router.get('/me', requireAuth, async (req, res) => {
  res.json(await getPenalty(req.user!.id));
});

// GET /:patientId — the patient's penalty state (treating doctor or admin).
router.get('/:patientId', requireAuth, async (req, res) => {
  const { role, id } = req.user!;
  const patientId = req.params.patientId;

  const allowed = role === 'admin' || (role === 'doctor' && (await hasTreated(id, patientId)));
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  res.json(await getPenalty(patientId));
});

// POST /:patientId/lift-ban — clear a temporary ban (treating doctor or admin).
router.post('/:patientId/lift-ban', requireAuth, async (req, res) => {
  const { role, id } = req.user!;
  const patientId = req.params.patientId;

  const allowed = role === 'admin' || (role === 'doctor' && (await hasTreated(id, patientId)));
  if (!allowed) return res.status(403).json({ error: 'Forbidden' });

  try {
    await liftBan(patientId);
    res.json(await getPenalty(patientId));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to lift ban' });
  }
});

// POST /:patientId/remove-blacklist — clear a blacklist (admin only).
router.post('/:patientId/remove-blacklist', requireAuth, async (req, res) => {
  if (req.user!.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

  try {
    await clearBlacklist(req.params.patientId);
    res.json(await getPenalty(req.params.patientId));
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to clear blacklist' });
  }
});

export default router;
