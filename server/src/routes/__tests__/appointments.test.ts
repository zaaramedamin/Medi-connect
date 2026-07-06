import request from 'supertest';
import express from 'express';
import appointmentRoutes from '../appointments';

// Mock email service so Resend doesn't throw without an API key
jest.mock('../../services/emailService', () => ({
  sendAppointmentConfirmation: jest.fn().mockResolvedValue({}),
  sendAppointmentReminder: jest.fn().mockResolvedValue({}),
}));

// Mock Supabase admin client
jest.mock('../../config/supabase', () => ({
  supabaseAdmin: {
    auth: {
      getUser: jest.fn(),
      admin: { getUserById: jest.fn() },
    },
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '../../config/supabase';

const mockAuth = supabaseAdmin.auth as jest.Mocked<typeof supabaseAdmin.auth>;
const mockFrom = supabaseAdmin.from as jest.Mock;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/appointments', appointmentRoutes);
  return app;
}

function mockUser(role: 'patient' | 'doctor' = 'patient') {
  (mockAuth.getUser as jest.Mock).mockResolvedValue({
    data: { user: { id: 'user-1', email: 'test@test.com', user_metadata: { role } } },
    error: null,
  });
}

function chainable(returnValue: unknown) {
  const chain: Record<string, unknown> = {};
  const methods = ['select', 'insert', 'update', 'delete', 'eq', 'gte', 'lte', 'maybeSingle', 'single'];
  methods.forEach(m => { chain[m] = jest.fn(() => chain); });
  (chain as Record<string, unknown> & { then: unknown }).then = undefined;
  // Make it thenable last
  Object.defineProperty(chain, 'then', {
    get: () => undefined,
    configurable: true,
  });
  // Final .single() and .maybeSingle() return the value
  (chain.single as jest.Mock).mockResolvedValue(returnValue);
  (chain.maybeSingle as jest.Mock).mockResolvedValue(returnValue);
  return chain;
}

describe('POST /api/appointments', () => {
  it('returns 401 without auth header', async () => {
    const app = makeApp();
    const res = await request(app).post('/api/appointments').send({});
    expect(res.status).toBe(401);
  });

  it('returns 403 if user is a doctor (not a patient)', async () => {
    mockUser('doctor');
    mockFrom.mockReturnValue(chainable({ data: null }));
    const app = makeApp();
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', 'Bearer token')
      .send({ doctor_id: 'doc-1', time_slot: '2025-12-01T10:00:00Z', payment_method: 'cash' });
    expect(res.status).toBe(403);
  });

  it('returns 400 with invalid payload', async () => {
    mockUser('patient');
    const app = makeApp();
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', 'Bearer token')
      .send({ doctor_id: '', time_slot: 'not-a-date', payment_method: 'bitcoin' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  it('returns 409 if slot is already booked', async () => {
    mockUser('patient');
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: { id: 99 }, error: null }),
    };
    mockFrom.mockReturnValue(fromMock);

    const app = makeApp();
    const res = await request(app)
      .post('/api/appointments')
      .set('Authorization', 'Bearer token')
      .send({ doctor_id: 'doc-1', time_slot: '2025-12-01T10:00:00Z', payment_method: 'cash' });
    expect(res.status).toBe(409);
  });
});

describe('GET /api/appointments/my', () => {
  it('returns 401 without token', async () => {
    const app = makeApp();
    const res = await request(app).get('/api/appointments/my');
    expect(res.status).toBe(401);
  });

  it('returns 403 if user is a doctor', async () => {
    mockUser('doctor');
    const app = makeApp();
    const res = await request(app)
      .get('/api/appointments/my')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(403);
  });

  it('returns appointments for patient', async () => {
    mockUser('patient');
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [{ id: 1, time_slot: '2025-12-01T10:00:00Z' }], error: null }),
    };
    mockFrom.mockReturnValue(fromMock);

    const app = makeApp();
    const res = await request(app)
      .get('/api/appointments/my')
      .set('Authorization', 'Bearer token');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});
