import { supabase } from '@/lib/supabase';
import type { Doctor, Appointment, TimeSlot, Review, AdminDoctor, NewDoctorInput } from '@/types';

// In dev this is empty and Vite proxies /api → localhost. In production set
// VITE_API_URL to the deployed API origin (there is no proxy on a static host).
const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// Doctors
export interface DoctorSearchFilters {
  specialty?: string;
  location?: string;
}

export const searchDoctors = (q: string, filters: DoctorSearchFilters = {}) => {
  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (filters.specialty) params.set('specialty', filters.specialty);
  if (filters.location) params.set('location', filters.location);
  return apiFetch<Doctor[]>(`/api/doctors/search?${params.toString()}`);
};

export const getDoctor = (id: string) =>
  apiFetch<Doctor>(`/api/doctors/${id}`);

export const getDoctorSlots = (id: string, date: string) =>
  apiFetch<TimeSlot[]>(`/api/doctors/${id}/slots?date=${date}`);

export const updateDoctorProfile = (updates: Partial<Doctor>) =>
  apiFetch<Doctor>('/api/doctors/profile', { method: 'PUT', body: JSON.stringify(updates) });

export const blockSlot = (start_time: string, end_time: string) =>
  apiFetch('/api/doctors/block-slot', { method: 'POST', body: JSON.stringify({ start_time, end_time }) });

export const deleteDoctorAccount = () =>
  apiFetch('/api/doctors/account', { method: 'DELETE' });

// Appointments
export const bookAppointment = (doctor_id: string, time_slot: string, payment_method: 'cash' | 'online') =>
  apiFetch<Appointment>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({ doctor_id, time_slot, payment_method }),
  });

export const getMyAppointments = () =>
  apiFetch<Appointment[]>('/api/appointments/my');

export const getDoctorAppointments = () =>
  apiFetch<(Appointment & { patient_name: string; patient_email: string })[]>('/api/appointments/doctor');

export const cancelAppointment = (id: number) =>
  apiFetch<Appointment>(`/api/appointments/${id}/cancel`, { method: 'PATCH' });

export const completeAppointment = (id: number) =>
  apiFetch<Appointment>(`/api/appointments/${id}/complete`, { method: 'PATCH' });

// Reviews
export const getDoctorReviews = (doctorId: string) =>
  apiFetch<Review[]>(`/api/reviews/doctor/${doctorId}`);

export const createReview = (doctor_id: string, rating: number, comment: string) =>
  apiFetch<Review>('/api/reviews', {
    method: 'POST',
    body: JSON.stringify({ doctor_id, rating, comment }),
  });

// Admin
export const getAdminDoctors = () =>
  apiFetch<AdminDoctor[]>('/api/admin/doctors');

export const createDoctor = (input: NewDoctorInput) =>
  apiFetch<AdminDoctor>('/api/admin/doctors', { method: 'POST', body: JSON.stringify(input) });

export const setDoctorSubscription = (id: string, action: 'activate' | 'deactivate') =>
  apiFetch<AdminDoctor>(`/api/admin/doctors/${id}/subscription`, {
    method: 'PATCH',
    body: JSON.stringify({ action }),
  });

export const deleteDoctor = (id: string) =>
  apiFetch<void>(`/api/admin/doctors/${id}`, { method: 'DELETE' });

// Photo upload (base64)
export const uploadPhoto = async (file: File): Promise<{ url: string }> => {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return apiFetch('/api/uploads/photo', {
    method: 'POST',
    body: JSON.stringify({ base64, mimeType: file.type }),
  });
};
