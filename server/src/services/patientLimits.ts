import { supabaseAdmin } from '../config/supabase';
import { logger } from './logger';

/**
 * Patient reliability limits — penalties for wasted bookings.
 *
 * A "false reservation" (strike) is a no-show (an appointment still confirmed
 * 24h after its slot) or a late cancellation (< 2h before the slot). The state
 * machine, per the spec:
 *   miss 1  -> flagged (doctors can see it)
 *   miss 2  -> temporary 2-day platform-wide booking ban; strike counter resets
 *   2nd ban -> permanent blacklist
 *
 * The table (patient_penalties) is server-only. Everything here degrades to a
 * clean no-penalty state if seed/patient-limits.sql hasn't been applied, so
 * booking never breaks before the migration.
 */

export const BAN_DAYS = 2;
export const STRIKES_BEFORE_BAN = 2;
/** How long after a slot a still-confirmed appointment is treated as a no-show. */
export const NO_SHOW_GRACE_HOURS = 24;
/** Cancelling within this window before the slot counts as a strike. */
export const LATE_CANCEL_HOURS = 2;

export type StrikeReason = 'no_show' | 'late_cancel';

export interface PenaltyState {
  patient_id: string;
  missed_count: number;
  total_missed: number;
  ban_count: number;
  banned_until: string | null;
  blacklisted: boolean;
  last_reason: StrikeReason | null;
  /** Derived: a temp ban that hasn't expired. */
  is_banned: boolean;
}

function zero(patientId: string): PenaltyState {
  return {
    patient_id: patientId,
    missed_count: 0,
    total_missed: 0,
    ban_count: 0,
    banned_until: null,
    blacklisted: false,
    last_reason: null,
    is_banned: false,
  };
}

function withDerived(row: Record<string, unknown>, patientId: string): PenaltyState {
  const banned_until = (row.banned_until as string) ?? null;
  return {
    patient_id: patientId,
    missed_count: Number(row.missed_count ?? 0),
    total_missed: Number(row.total_missed ?? 0),
    ban_count: Number(row.ban_count ?? 0),
    banned_until,
    blacklisted: Boolean(row.blacklisted),
    last_reason: (row.last_reason as StrikeReason) ?? null,
    is_banned: banned_until != null && new Date(banned_until) > new Date(),
  };
}

/** The penalty row for a patient, or a clean zero-state (also on any error). */
export async function getPenalty(patientId: string): Promise<PenaltyState> {
  const { data, error } = await supabaseAdmin
    .from('patient_penalties')
    .select('*')
    .eq('patient_id', patientId)
    .maybeSingle();
  if (error || !data) return zero(patientId);
  return withDerived(data, patientId);
}

/** Penalty rows for several patients at once (doctor/admin lists). Missing rows = zero-state. */
export async function getPenalties(patientIds: string[]): Promise<Map<string, PenaltyState>> {
  const out = new Map<string, PenaltyState>();
  if (patientIds.length === 0) return out;
  const { data, error } = await supabaseAdmin
    .from('patient_penalties')
    .select('*')
    .in('patient_id', patientIds);
  if (!error) for (const row of data ?? []) out.set(row.patient_id, withDerived(row, row.patient_id));
  for (const id of patientIds) if (!out.has(id)) out.set(id, zero(id));
  return out;
}

export interface BookingBlock {
  code: 'BLACKLISTED' | 'BANNED';
  message: string;
  until?: string;
}

/** Why a patient may not book right now, or null if they're clear. */
export async function bookingBlock(patientId: string): Promise<BookingBlock | null> {
  const p = await getPenalty(patientId);
  if (p.blacklisted) {
    return { code: 'BLACKLISTED', message: 'Your account is blacklisted from booking. Contact support.' };
  }
  if (p.is_banned) {
    return {
      code: 'BANNED',
      message: 'You are temporarily banned from booking after missed appointments.',
      until: p.banned_until!,
    };
  }
  return null;
}

/**
 * Apply one strike and run the escalation. Read-modify-write; the callers (the
 * no-show job flipping a row exactly once, and a single cancel action) don't
 * race on the same patient in practice.
 */
export async function recordStrike(patientId: string, reason: StrikeReason): Promise<PenaltyState | null> {
  const current = await getPenalty(patientId);

  // Already blacklisted — nothing further to escalate.
  if (current.blacklisted) return current;

  const next: {
    total_missed: number;
    missed_count: number;
    ban_count: number;
    banned_until: string | null;
    blacklisted: boolean;
  } = {
    total_missed: current.total_missed + 1,
    missed_count: current.missed_count + 1,
    ban_count: current.ban_count,
    banned_until: current.banned_until,
    blacklisted: current.blacklisted,
  };

  if (next.missed_count >= STRIKES_BEFORE_BAN) {
    next.missed_count = 0;           // a ban consumes the strikes
    next.ban_count += 1;
    if (next.ban_count >= 2) {
      // Second ban → permanent blacklist (supersedes the temp ban).
      next.blacklisted = true;
      next.banned_until = null;
    } else {
      next.banned_until = new Date(Date.now() + BAN_DAYS * 24 * 3600 * 1000).toISOString();
    }
  }

  const { data, error } = await supabaseAdmin
    .from('patient_penalties')
    .upsert({
      patient_id: patientId,
      ...next,
      last_reason: reason,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'patient_id' })
    .select()
    .single();

  if (error) {
    // Pre-migration or transient — don't let penalty bookkeeping break the caller.
    logger.warn('recordStrike failed', { patientId, reason, error: error.message });
    return null;
  }
  logger.info('patient strike', { patientId, reason, ban_count: next.ban_count, blacklisted: next.blacklisted });
  return withDerived(data, patientId);
}

/** Lift a temporary ban (treating doctor or admin). Clears the ban and strikes; keeps ban_count history. */
export async function liftBan(patientId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('patient_penalties')
    .update({ banned_until: null, missed_count: 0, updated_at: new Date().toISOString() })
    .eq('patient_id', patientId);
  if (error) throw new Error(`Failed to lift ban: ${error.message}`);
}

/** Clear a blacklist (admin only). Also resets the ban state. */
export async function clearBlacklist(patientId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('patient_penalties')
    .update({ blacklisted: false, banned_until: null, missed_count: 0, ban_count: 0, updated_at: new Date().toISOString() })
    .eq('patient_id', patientId);
  if (error) throw new Error(`Failed to clear blacklist: ${error.message}`);
}

/**
 * Detect no-shows: any appointment still 'confirmed' more than NO_SHOW_GRACE_HOURS
 * after its slot. Flips it to 'no_show' (once — the filter guards re-processing)
 * and strikes the patient. Runs on the reminder interval; ungated by email.
 */
export async function processNoShows(): Promise<void> {
  const cutoff = new Date(Date.now() - NO_SHOW_GRACE_HOURS * 3600 * 1000).toISOString();
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('id, user_id')
    .eq('status', 'confirmed')
    .lt('time_slot', cutoff);
  if (error || !data?.length) return;

  for (const apt of data) {
    // Flip exactly once: the .eq('status','confirmed') guard makes a concurrent
    // second run update zero rows, so we only strike on a real transition.
    const { data: flipped, error: flipErr } = await supabaseAdmin
      .from('appointments')
      .update({ status: 'no_show' })
      .eq('id', apt.id)
      .eq('status', 'confirmed')
      .select('id');
    if (flipErr || !flipped?.length) continue;
    await recordStrike(apt.user_id, 'no_show');
  }
}
