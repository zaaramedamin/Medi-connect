import request from 'supertest';
import express from 'express';
import doctorRoutes from '../doctors';

jest.mock('../../config/supabase', () => ({
  supabaseAdmin: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

import { supabaseAdmin } from '../../config/supabase';
const mockAuth = supabaseAdmin.auth as jest.Mocked<typeof supabaseAdmin.auth>;
const mockFrom = supabaseAdmin.from as jest.Mock;

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/doctors', doctorRoutes);
  return app;
}

function mockDoctor() {
  (mockAuth.getUser as jest.Mock).mockResolvedValue({
    data: { user: { id: 'doc-1', email: 'doc@test.com', app_metadata: { role: 'doctor' }, user_metadata: {} } },
    error: null,
  });
}

describe('GET /api/doctors/search', () => {
  it('returns list of doctors', async () => {
    const orderMock = jest.fn().mockReturnThis();
    const limitMock = jest.fn().mockResolvedValue({ data: [{ id: 'doc-1', name: 'Dr. Smith' }], error: null });
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      order: orderMock,
      limit: limitMock,
      eq: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      // rating summary lookup: .select(...).in(...)
      in: jest.fn().mockResolvedValue({ data: [], error: null }),
    };
    mockFrom.mockReturnValue(fromMock);

    const app = makeApp();
    const res = await request(app).get('/api/doctors/search?q=Smith');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toHaveProperty('avg_rating');
  });
});

describe('GET /api/doctors/:id', () => {
  it('returns 404 for unknown doctor', async () => {
    const fromMock = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'not found' } }),
    };
    mockFrom.mockReturnValue(fromMock);

    const app = makeApp();
    const res = await request(app).get('/api/doctors/unknown-id');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/doctors/profile', () => {
  it('returns 401 without auth', async () => {
    const app = makeApp();
    const res = await request(app).put('/api/doctors/profile').send({ name: 'Dr. Test' });
    expect(res.status).toBe(401);
  });

  it('returns 400 with invalid specialty (too long)', async () => {
    mockDoctor();
    const app = makeApp();
    const res = await request(app)
      .put('/api/doctors/profile')
      .set('Authorization', 'Bearer token')
      .send({ specialty: 'x'.repeat(200) });
    expect(res.status).toBe(400);
  });

  it('updates profile successfully', async () => {
    mockDoctor();
    const fromMock = {
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { id: 'doc-1', name: 'Dr. Updated' }, error: null }),
    };
    mockFrom.mockReturnValue(fromMock);

    const app = makeApp();
    const res = await request(app)
      .put('/api/doctors/profile')
      .set('Authorization', 'Bearer token')
      .send({ name: 'Dr. Updated', specialty: 'Cardiology' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
  });
});

describe('appointmentService', () => {
  it('generates correct time slots', () => {
    const { generateTimeSlots } = require('../../services/appointmentService');
    const slots = generateTimeSlots('09:00', '11:00', 30, '2025-12-01');
    expect(slots).toHaveLength(4);
    expect(slots[0]).toBe('2025-12-01T09:00:00');
    expect(slots[3]).toBe('2025-12-01T10:30:00');
  });

  it('marks booked slots as unavailable', () => {
    const { buildAvailableSlots } = require('../../services/appointmentService');
    const allSlots = ['2025-12-01T09:00:00', '2025-12-01T09:30:00'];
    const booked = ['2025-12-01T09:00:00'];
    const result = buildAvailableSlots(allSlots, booked, []);
    expect(result[0].available).toBe(false);
    expect(result[1].available).toBe(true);
  });
});
