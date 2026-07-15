import { supabase } from '@/lib/supabase';
import type {
  Doctor, ClinicPostDraft, Appointment, ConsultationMode, CallRoom, TimeSlot, Review, AdminDoctor, NewDoctorInput,
  Article, ArticleDetail, ArticleComment, NewArticleInput,
  AdminStats, AdminPatient, Order, OrderItem, AdminOrder,
  PatientProfile, PatientProfileInput,
  RagParam, RagLogRow, RagStats,
  DoctorPatient, PatientFile, PatientChart, PatientChartInput,
  Consultation, ConsultationInput, DocumentType, MedicalDocument, DocumentSummary,
  DocumentVerification,
} from '@/types';

// In dev this is empty and Vite proxies /api → localhost. In production set
// VITE_API_URL to the deployed API origin (there is no proxy on a static host).
const API_BASE = import.meta.env.VITE_API_URL ?? '';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return {};
  return { Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json' };
}

/**
 * An error the API described, rather than a network failure. `code` lets a
 * caller react to a specific case (e.g. PROFILE_INCOMPLETE) instead of
 * string-matching the message.
 */
export class ApiError extends Error {
  status: number;
  code?: string;
  /** Extra payload the endpoint attached, e.g. which fields are missing. */
  details?: Record<string, unknown>;

  constructor(message: string, status: number, body: Record<string, unknown> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = typeof body.code === 'string' ? body.code : undefined;
    this.details = body;
  }
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers: { ...headers, ...options?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(body.error ?? 'Request failed', res.status, body);
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

// Natural-language doctor finder — ranks doctors by how well their profile
// matches a described need, rather than exact keywords.
export const searchDoctorsSemantic = (q: string) =>
  apiFetch<Doctor[]>(`/api/doctors/semantic-search?q=${encodeURIComponent(q)}`);

export const getDoctor = (id: string) =>
  apiFetch<Doctor>(`/api/doctors/${id}`);

export const getDoctorSlots = (id: string, date: string) =>
  apiFetch<TimeSlot[]>(`/api/doctors/${id}/slots?date=${date}`);

/** Profile edits. `clinics`, when present, replaces the doctor's whole list. */
export type DoctorProfileUpdate = Partial<Omit<Doctor, 'clinics'>> & { clinics?: ClinicPostDraft[] };

export const updateDoctorProfile = (updates: DoctorProfileUpdate) =>
  apiFetch<Doctor>('/api/doctors/profile', { method: 'PUT', body: JSON.stringify(updates) });

export const blockSlot = (start_time: string, end_time: string) =>
  apiFetch('/api/doctors/block-slot', { method: 'POST', body: JSON.stringify({ start_time, end_time }) });

export const deleteDoctorAccount = () =>
  apiFetch('/api/doctors/account', { method: 'DELETE' });

// Appointments
export const bookAppointment = (
  doctor_id: string, time_slot: string, payment_method: 'cash' | 'online',
  mode: ConsultationMode = 'in_person'
) =>
  apiFetch<Appointment>('/api/appointments', {
    method: 'POST',
    body: JSON.stringify({ doctor_id, time_slot, payment_method, mode }),
  });

export const getCallRoom = (appointmentId: number) =>
  apiFetch<CallRoom>(`/api/appointments/${appointmentId}/call`);

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

// Patient profile
export const getMyProfile = () => apiFetch<PatientProfile | null>('/api/profile/me');

export const updateMyProfile = (updates: PatientProfileInput) =>
  apiFetch<PatientProfile>('/api/profile/me', { method: 'PUT', body: JSON.stringify(updates) });

// Medical records (PHI)
export const getMyPatients = () =>
  apiFetch<DoctorPatient[]>('/api/records/patients');

export const getPatientFile = (patientId: string) =>
  apiFetch<PatientFile>(`/api/records/patients/${patientId}`);

export const savePatientChart = (patientId: string, chart: PatientChartInput) =>
  apiFetch<PatientChart>(`/api/records/patients/${patientId}/chart`, { method: 'PUT', body: JSON.stringify(chart) });

export const addConsultation = (patientId: string, input: ConsultationInput) =>
  apiFetch<Consultation>(`/api/records/patients/${patientId}/consultations`, { method: 'POST', body: JSON.stringify(input) });

export const updateConsultation = (id: number, input: ConsultationInput) =>
  apiFetch<Consultation>(`/api/records/consultations/${id}`, { method: 'PATCH', body: JSON.stringify(input) });

export const issueDocument = (consultationId: number, type: DocumentType, body: Record<string, unknown>) =>
  apiFetch<MedicalDocument>(`/api/records/consultations/${consultationId}/documents`, { method: 'POST', body: JSON.stringify({ type, body }) });

export const revokeDocument = (id: number, reason?: string) =>
  apiFetch<DocumentSummary>(`/api/records/documents/${id}/revoke`, { method: 'POST', body: JSON.stringify({ reason }) });

export const getDocument = (id: number) =>
  apiFetch<MedicalDocument>(`/api/records/documents/${id}`);

export const getMyDocuments = () =>
  apiFetch<DocumentSummary[]>('/api/records/me/documents');

/** Public — confirms a document is genuine and current. No PHI returned. */
export const verifyDocument = (reference: string) =>
  apiFetch<DocumentVerification>(`/api/records/verify/${encodeURIComponent(reference)}`);

export const getAdminStats = () => apiFetch<AdminStats>('/api/admin/stats');

export const updateDoctor = (id: string, updates: Partial<Pick<AdminDoctor, 'name' | 'specialty' | 'location' | 'cost'>>) =>
  apiFetch<AdminDoctor>(`/api/admin/doctors/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });

// Orders (demo checkout)
export const placeOrder = (items: OrderItem[]) =>
  apiFetch<Order>('/api/orders', { method: 'POST', body: JSON.stringify({ items }) });

export const getMyOrders = () => apiFetch<Order[]>('/api/orders/my');

export const getAdminOrders = () => apiFetch<AdminOrder[]>('/api/orders');

export const setOrderStatus = (id: number, status: Order['status']) =>
  apiFetch<Order>(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const getAdminPatients = () => apiFetch<AdminPatient[]>('/api/admin/patients');

export const deletePatient = (id: string) =>
  apiFetch<void>(`/api/admin/patients/${id}`, { method: 'DELETE' });

// RAG admin console
export const getRagConfig = () =>
  apiFetch<{ params: RagParam[] }>('/api/admin/rag/config');

export const setRagParam = (key: string, value: string | number) =>
  apiFetch<{ key: string; value: string | number }>('/api/admin/rag/config', {
    method: 'PATCH',
    body: JSON.stringify({ key, value }),
  });

export const resetRagParam = (key?: string) =>
  apiFetch<{ reset: string }>('/api/admin/rag/config/reset', {
    method: 'POST',
    body: JSON.stringify(key ? { key } : {}),
  });

export const getRagLogs = (limit = 50) =>
  apiFetch<{ logs: RagLogRow[] }>(`/api/admin/rag/logs?limit=${limit}`);

export const clearRagLogs = () =>
  apiFetch<{ removed: number }>('/api/admin/rag/logs', { method: 'DELETE' });

export const getRagStats = () => apiFetch<RagStats>('/api/admin/rag/stats');

export const runRagCommand = (command: string) =>
  apiFetch<{ lines: string[] }>('/api/admin/rag/console', {
    method: 'POST',
    body: JSON.stringify({ command }),
  });

// Community (articles + discussion)
export const getArticles = (category?: string) => {
  const qs = category && category !== 'all' ? `?category=${encodeURIComponent(category)}` : '';
  return apiFetch<Article[]>(`/api/articles${qs}`);
};

// Semantic search over articles (ranked by meaning, not keywords).
export const searchArticlesSemantic = (q: string, lang?: 'en' | 'fr') => {
  const params = new URLSearchParams({ q });
  if (lang) params.set('lang', lang);
  return apiFetch<Article[]>(`/api/articles/search?${params.toString()}`);
};

export const getArticle = (id: string | number) =>
  apiFetch<ArticleDetail>(`/api/articles/${id}`);

export const createArticle = (input: NewArticleInput) =>
  apiFetch<{ id: number }>('/api/articles', { method: 'POST', body: JSON.stringify(input) });

export const deleteArticle = (id: number) =>
  apiFetch<void>(`/api/articles/${id}`, { method: 'DELETE' });

export const addArticleComment = (articleId: number, body: string) =>
  apiFetch<ArticleComment>(`/api/articles/${articleId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });

// AI health assistant (RAG over the doctor articles)
export interface AssistantSource {
  article_id: number;
  title: string;
  category: string | null;
  cover_image: string | null;
  lang: 'en' | 'fr';
  similarity: number;
}

export interface AssistantAnswer {
  question: string;
  answer: string;
  grounded: boolean;
  sources: AssistantSource[];
}

export type AssistantMode = 'articles' | 'general';

// Public endpoint — set Content-Type explicitly since anonymous requests carry
// no auth headers (getAuthHeaders returns {} without a session).
// mode: 'articles' answers only from MediConnect articles (grounded, cited);
// 'general' answers from the model's own medical knowledge.
export const askAssistant = (question: string, lang?: 'en' | 'fr', mode: AssistantMode = 'articles') =>
  apiFetch<AssistantAnswer>('/api/assistant/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, lang, mode }),
  });

export interface ProductAdvice {
  answer: string;
  productIds: string[];
}

// Product advisor — recommends shop products for a described need.
export const getProductAdvice = (question: string) =>
  apiFetch<ProductAdvice>('/api/assistant/product-advice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
  });

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
