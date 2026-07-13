import { supabaseAdmin } from '../config/supabase';

/**
 * What a patient must have on file before a booking is accepted.
 *
 * The client stops them at the slot and sends them to /settings, but that is a
 * courtesy, not a control — anyone can POST straight to the API. This is the
 * rule that actually holds.
 *
 * Kept in step with client/src/lib/patientProfile.ts.
 */
export const REQUIRED_PROFILE_FIELDS = ['phone', 'date_of_birth'] as const;

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

/**
 * Required fields the patient still hasn't filled in. No profile row at all
 * means all of them are missing.
 */
export async function missingProfileFields(patientId: string): Promise<RequiredProfileField[]> {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('phone, date_of_birth')
    .eq('id', patientId)
    .maybeSingle();

  if (error) throw new Error(`Failed to load profile: ${error.message}`);
  if (!data) return [...REQUIRED_PROFILE_FIELDS];

  const row = data as Record<RequiredProfileField, unknown>;
  return REQUIRED_PROFILE_FIELDS.filter(field => !String(row[field] ?? '').trim());
}
