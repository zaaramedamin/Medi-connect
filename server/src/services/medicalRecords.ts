import { supabaseAdmin } from '../config/supabase';

/**
 * Shared logic for the medical-records routes. The route handlers own the
 * authorization decisions; this module holds the two things worth centralising:
 * the "has this doctor treated this patient" membership test, and the append-only
 * access log.
 */

/**
 * A doctor may only touch the file of a patient they have actually seen.
 * Membership is the appointment table — the same relation the doctor dashboard
 * already lists from. Any appointment (past, cancelled, upcoming) counts as a
 * care relationship for the purpose of keeping notes.
 */
export async function hasTreated(doctorId: string, patientId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('appointments')
    .select('id')
    .eq('doctor_id', doctorId)
    .eq('user_id', patientId)
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(`Membership check failed: ${error.message}`);
  return data != null;
}

export type AccessAction =
  | 'view_chart'
  | 'update_chart'
  | 'view_patient'
  | 'create_consultation'
  | 'update_consultation'
  | 'issue_document'
  | 'view_document'
  | 'revoke_document';

/**
 * Record a PHI access. Fire-and-forget: an audit-log failure must never break
 * the clinical action, but it is logged so a broken audit path is visible.
 */
export function logAccess(entry: {
  actorId: string;
  actorRole: string;
  patientId: string | null;
  action: AccessAction;
  targetId?: string | number | null;
  ip?: string | null;
}): void {
  void supabaseAdmin
    .from('medical_access_log')
    .insert({
      actor_id: entry.actorId,
      actor_role: entry.actorRole,
      patient_id: entry.patientId,
      action: entry.action,
      target_id: entry.targetId != null ? String(entry.targetId) : null,
      ip: entry.ip ?? null,
    })
    .then(({ error }) => {
      if (error) console.warn('medical access log failed:', error.message);
    });
}

const TYPE_ABBR: Record<string, string> = {
  report: 'REP',
  prescription: 'PRE',
  certificate: 'CER',
  referral: 'REF',
};

/**
 * A stable, gap-free, collision-free reference for an issued document, e.g.
 * "MC-PRE-2026-000042". The per-(type,year) counter is bumped atomically in the
 * DB, so two documents issued at the same instant can't share a number.
 */
export async function nextReference(type: string): Promise<string> {
  const year = new Date().getFullYear();
  const { data, error } = await supabaseAdmin.rpc('next_document_number', {
    p_scope: `${type}-${year}`,
  });
  if (error) throw new Error(`Could not allocate a document number: ${error.message}`);
  const n = String(data).padStart(6, '0');
  return `MC-${TYPE_ABBR[type] ?? 'DOC'}-${year}-${n}`;
}

/** The patient's name + email from auth, and their demographic profile row. */
export async function loadPatientIdentity(patientId: string) {
  const [{ data: userData }, { data: profile }] = await Promise.all([
    supabaseAdmin.auth.admin.getUserById(patientId),
    supabaseAdmin
      .from('profiles')
      .select('date_of_birth, gender, blood_type, phone')
      .eq('id', patientId)
      .maybeSingle(),
  ]);

  return {
    id: patientId,
    name: (userData.user?.user_metadata?.name as string) ?? 'Unknown',
    email: userData.user?.email ?? '',
    date_of_birth: profile?.date_of_birth ?? null,
    gender: profile?.gender ?? null,
    blood_type: profile?.blood_type ?? null,
    phone: profile?.phone ?? null,
  };
}
