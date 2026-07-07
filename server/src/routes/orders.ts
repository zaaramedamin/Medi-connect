import { Router } from 'express';
import { body } from 'express-validator';
import { randomBytes } from 'crypto';
import { supabaseAdmin } from '../config/supabase';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

const FREE_SHIPPING_THRESHOLD = 150;
const SHIPPING_FEE = 7;

const orderReference = () => 'MC-' + randomBytes(4).toString('hex').toUpperCase();

// POST /api/orders — place a demo order (no payment is taken)
router.post(
  '/',
  requireAuth,
  validate([
    body('items').isArray({ min: 1, max: 50 }),
    body('items.*.id').isString().trim().notEmpty(),
    body('items.*.name').isString().trim().isLength({ min: 1, max: 200 }),
    body('items.*.price').isFloat({ min: 0 }),
    body('items.*.quantity').isInt({ min: 1, max: 99 }),
    body('items.*.image').optional().isString().isLength({ max: 500 }),
  ]),
  async (req, res) => {
    type ItemInput = { id: string; name: string; price: number; quantity: number; image?: string };
    const items = (req.body.items as ItemInput[]).map(i => ({
      id: i.id,
      name: i.name,
      price: Number(i.price),
      quantity: Number(i.quantity),
      image: i.image ?? null,
    }));

    // Totals are recomputed server-side; the demo catalog lives client-side,
    // so prices are taken from the request (acceptable: nothing is charged).
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;

    const { data, error } = await supabaseAdmin
      .from('orders')
      .insert({
        user_id: req.user!.id,
        reference: orderReference(),
        items,
        subtotal,
        shipping,
        total: subtotal + shipping,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to place order' });
    res.status(201).json(data);
  }
);

// GET /api/orders/my — the caller's order history
router.get('/my', requireAuth, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .eq('user_id', req.user!.id)
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch orders' });
  res.json(data ?? []);
});

// GET /api/orders — all orders (admin)
router.get('/', requireAuth, requireRole('admin'), async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: 'Failed to fetch orders' });

  // Attach buyer names for the admin list
  const enriched = await Promise.all(
    (data ?? []).map(async o => {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(o.user_id);
      return {
        ...o,
        customer_name: (u.user?.user_metadata?.name as string) ?? u.user?.email ?? 'Customer',
      };
    })
  );

  res.json(enriched);
});

// PATCH /api/orders/:id/status — admin updates fulfilment status
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin'),
  validate([body('status').isIn(['placed', 'delivered', 'cancelled'])]),
  async (req, res) => {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status: req.body.status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Failed to update order' });
    res.json(data);
  }
);

export default router;
