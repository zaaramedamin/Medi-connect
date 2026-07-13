import { Request, Response, NextFunction } from 'express';
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

  const role = user.user_metadata?.role as Role | undefined;

  req.user = {
    id: user.id,
    email: user.email!,
    role: role ?? 'patient',
  } satisfies AuthUser;

  next();
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
    const role = user.user_metadata?.role as Role | undefined;
    req.user = { id: user.id, email: user.email!, role: role ?? 'patient' } satisfies AuthUser;
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
