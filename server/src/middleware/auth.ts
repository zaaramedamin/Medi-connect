import { Request, Response, NextFunction } from 'express';
import type { User } from '@supabase/supabase-js';
import { supabaseAdmin } from '../config/supabase';
import { AuthUser, Role } from '../types';

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.replace('Bearer ', '');

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = {
    id: user.id,
    email: user.email!,
    role: roleOf(user),
  } satisfies AuthUser;

  next();
}

/**
 * The caller's role, taken ONLY from app_metadata.
 *
 * user_metadata is writable by the user themselves (supabase.auth.updateUser
 * sends it), so trusting a role there let any patient escalate to admin by
 * calling updateUser({ data: { role: 'admin' } }). app_metadata can only be
 * written with the service-role key — i.e. by this server. Absence defaults to
 * the least privilege. Roles are assigned in admin.ts (doctor onboarding) and
 * backfilled by seed/harden-roles.sql.
 */
function roleOf(user: User): Role {
  const role = user.app_metadata?.role;
  return role === 'admin' || role === 'doctor' ? role : 'patient';
}

/**
 * Attaches req.user when a valid Bearer token is present, but never rejects.
 * For public endpoints (the assistant) that still want to know *who* is calling
 * when the caller happens to be logged in — anonymous otherwise.
 */
export async function attachUserOptional(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();

  const token = authHeader.replace('Bearer ', '');
  const { data: { user } } = await supabaseAdmin.auth.getUser(token);
  if (user) {
    req.user = { id: user.id, email: user.email!, role: roleOf(user) } satisfies AuthUser;
  }
  next();
}

export function requireRole(role: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (req.user.role !== role) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}
