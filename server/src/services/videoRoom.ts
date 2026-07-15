import { createHmac } from 'crypto';

/**
 * The Jitsi room for a video appointment.
 *
 * Derived, not stored, and unguessable: the room name is the appointment id
 * plus an HMAC of it under a server secret. Knowing an appointment id is not
 * enough to guess the room — only the server can produce the tag — and the
 * `/call` endpoint only reveals it to that appointment's doctor and patient.
 *
 * Uses the public meet.jit.si server (no account, no key). For production you
 * would point JITSI_DOMAIN at a self-hosted instance with JWT auth.
 */
export const JITSI_DOMAIN = process.env.JITSI_DOMAIN ?? 'meet.jit.si';

const SECRET = process.env.CALL_SECRET ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'dev-call-secret';

export function roomForAppointment(appointmentId: number | string): string {
  const tag = createHmac('sha256', SECRET).update(`appointment:${appointmentId}`).digest('hex').slice(0, 24);
  return `mediconnect-${appointmentId}-${tag}`;
}

/**
 * A video call is joinable from 10 minutes before the slot until 2 hours after
 * — early enough to settle in, long enough to cover an over-running visit,
 * without leaving the room open indefinitely.
 */
export function callWindow(timeSlot: string): { open: boolean; opensAt: Date; closesAt: Date } {
  const start = new Date(timeSlot);
  const opensAt = new Date(start.getTime() - 10 * 60 * 1000);
  const closesAt = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const now = new Date();
  return { open: now >= opensAt && now <= closesAt, opensAt, closesAt };
}
