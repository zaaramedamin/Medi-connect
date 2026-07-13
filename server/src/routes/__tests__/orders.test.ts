import request from 'supertest';
import express from 'express';
import orderRoutes from '../orders';

jest.mock('../../config/supabase', () => ({
  supabaseAdmin: {
    auth: { getUser: jest.fn(), admin: { getUserById: jest.fn() } },
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '../../config/supabase';
const mockAuth = supabaseAdmin.auth as jest.Mocked<typeof supabaseAdmin.auth>;
const mockFrom = supabaseAdmin.from as jest.Mock;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', orderRoutes);
  return app;
}

function mockUser(role: 'patient' | 'admin' = 'patient') {
  (mockAuth.getUser as jest.Mock).mockResolvedValue({
    data: { user: { id: 'user-1', email: 'user@test.com', app_metadata: { role }, user_metadata: {} } },
    error: null,
  });
}

const validItems = [
  { id: 'digital-thermometer', name: 'Digital Thermometer', price: 25, quantity: 2 },
  { id: 'vitamin-d3', name: 'Vitamin D3', price: 30, quantity: 1 },
];

describe('POST /api/orders', () => {
  it('returns 401 without auth', async () => {
    const res = await request(makeApp()).post('/api/orders').send({ items: validItems });
    expect(res.status).toBe(401);
  });

  it('rejects an empty bag', async () => {
    mockUser();
    const res = await request(makeApp())
      .post('/api/orders')
      .set('Authorization', 'Bearer token')
      .send({ items: [] });
    expect(res.status).toBe(400);
  });

  it('rejects invalid quantities', async () => {
    mockUser();
    const res = await request(makeApp())
      .post('/api/orders')
      .set('Authorization', 'Bearer token')
      .send({ items: [{ id: 'x', name: 'X', price: 10, quantity: 0 }] });
    expect(res.status).toBe(400);
  });

  it('places an order and recomputes totals server-side', async () => {
    mockUser();
    const insertMock = jest.fn().mockReturnThis();
    const fromMock = {
      insert: insertMock,
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockImplementation(() =>
        Promise.resolve({ data: { id: 1, reference: 'MC-TEST', status: 'placed' }, error: null })
      ),
    };
    mockFrom.mockReturnValue(fromMock);

    const res = await request(makeApp())
      .post('/api/orders')
      .set('Authorization', 'Bearer token')
      .send({ items: validItems });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('reference');

    // subtotal 25*2 + 30 = 80 → below the 150 threshold, so shipping applies
    const inserted = insertMock.mock.calls[0][0];
    expect(inserted.subtotal).toBe(80);
    expect(inserted.shipping).toBe(7);
    expect(inserted.total).toBe(87);
    expect(inserted.user_id).toBe('user-1');
  });

  it('gives free shipping over the threshold', async () => {
    mockUser();
    const insertMock = jest.fn().mockReturnThis();
    const fromMock = {
      insert: insertMock,
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 2, reference: 'MC-BIG' }, error: null }),
    };
    mockFrom.mockReturnValue(fromMock);

    const res = await request(makeApp())
      .post('/api/orders')
      .set('Authorization', 'Bearer token')
      .send({ items: [{ id: 'bp', name: 'BP Monitor', price: 120, quantity: 2 }] });

    expect(res.status).toBe(201);
    const inserted = insertMock.mock.calls[0][0];
    expect(inserted.subtotal).toBe(240);
    expect(inserted.shipping).toBe(0);
    expect(inserted.total).toBe(240);
  });
});

describe('GET /api/orders/my', () => {
  it('returns the caller orders', async () => {
    mockUser();
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [{ id: 1, reference: 'MC-TEST' }], error: null }),
    };
    mockFrom.mockReturnValue(fromMock);

    const res = await request(makeApp()).get('/api/orders/my').set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('GET /api/orders (admin)', () => {
  it('is forbidden for patients', async () => {
    mockUser('patient');
    const res = await request(makeApp()).get('/api/orders').set('Authorization', 'Bearer token');
    expect(res.status).toBe(403);
  });

  it('lists all orders with customer names for admins', async () => {
    mockUser('admin');
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [{ id: 1, reference: 'MC-1', user_id: 'u1' }], error: null }),
    };
    mockFrom.mockReturnValue(fromMock);
    (mockAuth.admin.getUserById as jest.Mock).mockResolvedValue({
      data: { user: { user_metadata: { name: 'Mohamed' } } },
    });

    const res = await request(makeApp()).get('/api/orders').set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(res.body[0].customer_name).toBe('Mohamed');
  });
});

describe('PATCH /api/orders/:id/status', () => {
  it('rejects unknown statuses', async () => {
    mockUser('admin');
    const res = await request(makeApp())
      .patch('/api/orders/1/status')
      .set('Authorization', 'Bearer token')
      .send({ status: 'shipped' });
    expect(res.status).toBe(400);
  });

  it('updates the status', async () => {
    mockUser('admin');
    const fromMock = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 1, status: 'delivered' }, error: null }),
    };
    mockFrom.mockReturnValue(fromMock);

    const res = await request(makeApp())
      .patch('/api/orders/1/status')
      .set('Authorization', 'Bearer token')
      .send({ status: 'delivered' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('delivered');
  });
});
