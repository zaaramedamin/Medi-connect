import request from 'supertest';
import express from 'express';
import { requireAuth, requireRole } from '../../middleware/auth';

// Regression guard for the privilege-escalation fix: a user's role must be read
// from app_metadata (service-role-only), never from user_metadata (which the
// user can write via supabase.auth.updateUser). See seed/harden-roles.sql.

jest.mock('../../config/supabase', () => ({
  supabaseAdmin: { auth: { getUser: jest.fn() } },
}));

import { supabaseAdmin } from '../../config/supabase';
const mockGetUser = supabaseAdmin.auth.getUser as jest.Mock;

function mockToken(user: Record<string, unknown>) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

// A tiny app whose only route is admin-gated, so the response code reflects the
// resolved role directly.
function adminApp() {
  const app = express();
  app.get('/admin', requireAuth, requireRole('admin'), (_req, res) => res.json({ ok: true }));
  return app;
}

const call = () => request(adminApp()).get('/admin').set('Authorization', 'Bearer t');

describe('role is taken from app_metadata, not user_metadata', () => {
  it('grants admin when app_metadata.role is admin', async () => {
    mockToken({ id: 'u1', email: 'a@t.co', app_metadata: { role: 'admin' }, user_metadata: {} });
    expect((await call()).status).toBe(200);
  });

  it('IGNORES a self-set admin role in user_metadata (the exploit)', async () => {
    mockToken({ id: 'u2', email: 'p@t.co', app_metadata: { role: 'patient' }, user_metadata: { role: 'admin' } });
    expect((await call()).status).toBe(403);
  });

  it('defaults to patient (403) when no role is present anywhere', async () => {
    mockToken({ id: 'u3', email: 'n@t.co', app_metadata: {}, user_metadata: {} });
    expect((await call()).status).toBe(403);
  });

  it('does not accept an unknown app_metadata role as privileged', async () => {
    mockToken({ id: 'u4', email: 'x@t.co', app_metadata: { role: 'superadmin' }, user_metadata: {} });
    expect((await call()).status).toBe(403);
  });
});
