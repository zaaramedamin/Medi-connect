import type { PatientProfile } from '@/types';

/**
 * What a patient has to fill in before they can book.
 *
 * Deliberately the bare minimum: a doctor needs to be able to reach you, and
 * needs your age. Everything else on the settings form (blood type, allergies,
 * emergency contact…) stays optional — asking for it up front would just cost
 * bookings.
 *
 * This is the single source of truth: the settings banner, the required-field
 * markers and the booking gate all read it from here.
 */
export const REQUIRED_PROFILE_FIELDS = ['phone', 'date_of_birth'] as const;

export type RequiredProfileField = (typeof REQUIRED_PROFILE_FIELDS)[number];

/** English source strings — pass them through t() at the call site. */
export const REQUIRED_FIELD_LABELS: Record<RequiredProfileField, string> = {
  phone: 'Phone',
  date_of_birth: 'Date of birth',
};

/** Which required fields are still blank. A missing profile means all of them. */
export function missingProfileFields(profile?: PatientProfile | null): RequiredProfileField[] {
  if (!profile) return [...REQUIRED_PROFILE_FIELDS];
  return REQUIRED_PROFILE_FIELDS.filter(field => !String(profile[field] ?? '').trim());
}

export function isProfileComplete(profile?: PatientProfile | null): boolean {
  return missingProfileFields(profile).length === 0;
}
