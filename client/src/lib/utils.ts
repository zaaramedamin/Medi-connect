import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// Honorifics that must not be mistaken for a first name. Every doctor in the
// database is stored as "Dr. Sarra Mansouri", so a naive first-letter-of-each-word
// yields "DS" instead of "SM".
const HONORIFIC = /^(dr|dre|pr|prof|professeur|mr|mrs|ms|mme|mlle|m)\.?$/i;

/**
 * Initials for an avatar fallback: "Dr. Sarra Mansouri" → "SM", "Mohamed Sassi" → "MS".
 * Falls back to the first two letters when a name is a single word.
 */
export function initialsOf(name: string | null | undefined): string {
  const words = (name ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => !HONORIFIC.test(w));

  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[1][0]).toUpperCase();
}

/**
 * Splits the honorific off a display name so it can be set apart typographically:
 * "Dr. Sarra Mansouri" → { title: 'Dr.', name: 'Sarra Mansouri' }.
 */
export function splitName(full: string | null | undefined): { title: string | null; name: string } {
  const words = (full ?? '').split(/\s+/).filter(Boolean);
  if (words.length > 1 && HONORIFIC.test(words[0])) {
    return { title: words[0], name: words.slice(1).join(' ') };
  }
  return { title: null, name: words.join(' ') };
}

/** Great-circle distance between two lat/lng points, in kilometers. */
export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
