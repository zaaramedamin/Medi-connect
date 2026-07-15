/** A post a doctor holds (or held) at a clinic or hospital. */
export interface ClinicPost {
  id: number;
  clinic_name: string;
  role: string | null;
  city: string | null;
  start_year: number | null;
  /** null = still there. */
  end_year: number | null;
}

/** A clinic post being edited in the dashboard — no id until it's saved. */
export type ClinicPostDraft = Omit<ClinicPost, 'id'> & { id?: number };

export interface Doctor {
  id: string;
  name: string;
  email?: string | null;
  description: string | null;
  phone: string | null;
  location: string | null;
  specialty: string | null;
  cost: number | null;
  photos_url: string | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  avg_consultation_time: number | null;
  lat?: number | null;
  lng?: number | null;
  avg_rating?: number;
  review_count?: number;
  created_at?: string;
  // Public profile (seed/doctor-profile.sql). Absent until that migration runs.
  website?: string | null;
  address?: string | null;
  years_experience?: number | null;
  languages?: string[] | null;
  clinics?: ClinicPost[];
}

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name: string;
}

export type ConsultationMode = 'in_person' | 'video';

export interface Appointment {
  id: number;
  doctor_id: string;
  user_id: string;
  time_slot: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  payment_method: 'cash' | 'online';
  payment_status: 'pending' | 'paid';
  mode?: ConsultationMode;
  created_at: string;
  doctors?: Pick<Doctor, 'id' | 'name' | 'specialty' | 'location' | 'photos_url'>;
}

/** The video room details for one appointment's two participants. */
export interface CallRoom {
  domain: string;
  room: string;
  display_name: string;
  is_moderator: boolean;
  closes_at: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export type UserRole = 'patient' | 'doctor' | 'admin';

export interface AdminDoctor {
  id: string;
  name: string;
  specialty: string | null;
  location: string | null;
  cost: number | null;
  photos_url: string | null;
  subscription_status: 'active' | 'inactive' | 'expired';
  subscription_expires: string | null;
  created_at: string;
}

export interface NewDoctorInput {
  email: string;
  password: string;
  name: string;
  specialty?: string;
  location?: string;
  cost?: number;
  activate?: boolean;
}

// ── Community (doctor reports, advice & discussion) ──────────────────
export type ArticleCategory = 'report' | 'advice' | 'discussion';

export interface ArticleAuthor {
  name: string;
  specialty: string | null;
  photos_url: string | null;
}

export interface Article {
  id: number;
  author_id: string;
  title: string;
  /** French translation — present on seeded articles once the bilingual migration has run. */
  title_fr?: string | null;
  category: ArticleCategory;
  excerpt: string | null;
  excerpt_fr?: string | null;
  cover_image: string | null;
  created_at: string;
  author: ArticleAuthor;
  comment_count: number;
}

export interface ArticleComment {
  id: number;
  body: string;
  created_at: string;
  author_name: string;
  author_role: string;
}

export interface ArticleDetail extends Omit<Article, 'comment_count'> {
  body: string;
  body_fr?: string | null;
  comments: ArticleComment[];
}

export interface NewArticleInput {
  title: string;
  category: ArticleCategory;
  excerpt?: string;
  body: string;
  cover_image?: string;
}

// ── Patient profile (extra details beyond the auth account) ──────────
export interface PatientProfile {
  id: string;
  phone: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  address: string | null;
  city: string | null;
  blood_type: string | null;
  allergies: string | null;
  emergency_contact: string | null;
  updated_at?: string;
}

export type PatientProfileInput = Partial<Omit<PatientProfile, 'id' | 'updated_at'>>;

// ── Medical records (doctor-authored, PHI) ───────────────────────────
export type DocumentType = 'report' | 'prescription' | 'certificate' | 'referral';

export interface Medication {
  name: string;
  dose?: string;
  frequency?: string;
}

export interface PatientChart {
  patient_id: string;
  chronic_conditions: string[];
  current_medications: Medication[];
  clinical_allergies: string | null;
  notes: string | null;
  updated_by: string | null;
  updated_at: string;
}

export type PatientChartInput = {
  chronic_conditions: string[];
  current_medications: Medication[];
  clinical_allergies: string | null;
  notes: string | null;
};

export interface Vitals {
  bp?: string;
  temperature?: string;
  weight?: string;
  heart_rate?: string;
}

export interface Consultation {
  id: number;
  patient_id: string;
  doctor_id: string;
  appointment_id: number | null;
  visit_date: string;
  reason: string | null;
  symptoms: string | null;
  examination: string | null;
  diagnosis: string | null;
  plan: string | null;
  vitals: Vitals | null;
  created_at: string;
  updated_at: string;
}

export type ConsultationInput = Partial<
  Pick<Consultation, 'reason' | 'symptoms' | 'examination' | 'diagnosis' | 'plan' | 'vitals' | 'appointment_id'>
>;

/** A doctor's patient list item. */
export interface DoctorPatient {
  id: string;
  name: string;
  email: string;
  last_visit: string;
  visits: number;
}

/** The demographic identity frozen onto a document / shown in the file header. */
export interface PatientIdentity {
  id: string;
  name: string;
  email: string;
  date_of_birth: string | null;
  gender: 'male' | 'female' | 'other' | null;
  blood_type: string | null;
  phone: string | null;
}

/** Summary row of an issued document (list views). */
export interface DocumentSummary {
  id: number;
  reference: string;
  type: DocumentType;
  issued_at: string;
  revoked_at: string | null;
  consultation_id?: number | null;
  doctor_id?: string;
  doctor_name?: string;
}

/** The frozen snapshot printed on a document. */
export interface DocumentContent {
  reference: string;
  type: DocumentType;
  issued_at: string;
  doctor: {
    name: string;
    specialty: string | null;
    clinic: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  patient: {
    name: string;
    date_of_birth: string | null;
    gender: string | null;
  };
  consultation: {
    visit_date: string;
    diagnosis: string | null;
    reason: string | null;
  };
  body: Record<string, unknown>;
}

export interface MedicalDocument {
  id: number;
  reference: string;
  type: DocumentType;
  patient_id: string;
  doctor_id: string;
  consultation_id: number | null;
  content: DocumentContent;
  issued_at: string;
  revoked_at: string | null;
  revoked_reason: string | null;
}

export interface PatientFile {
  patient: PatientIdentity;
  chart: PatientChart | null;
  consultations: Consultation[];
  documents: DocumentSummary[];
}

/** Public authenticity check — deliberately carries no patient/clinical data. */
export interface DocumentVerification {
  found: boolean;
  reference?: string;
  type?: DocumentType;
  issued_at?: string;
  status?: 'valid' | 'revoked';
  doctor_name?: string | null;
  doctor_specialty?: string | null;
}

// ── Shop orders (demo checkout — no payment) ─────────────────────────
export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image: string | null;
}

export interface Order {
  id: number;
  reference: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  total: number;
  status: 'placed' | 'delivered' | 'cancelled';
  created_at: string;
}

export interface AdminOrder extends Order {
  customer_name: string;
}

// ── Admin analytics & management ─────────────────────────────────────
export interface AdminStats {
  totals: {
    doctors: number;
    activeDoctors: number;
    patients: number;
    appointments: number;
    completed: number;
    upcoming: number;
    orders: number;
  };
  revenue: { consultation: number; subscription: number; shop: number; total: number };
  topDoctors: { id: string; name: string; specialty: string | null; reservations: number; revenue: number }[];
  hourly: { hour: number; count: number }[];
  peakHour: { hour: number; count: number };
  weekday: number[];
}

export interface AdminPatient {
  id: string;
  name: string;
  email: string;
  created_at: string;
  appointments: number;
}

// ── RAG admin console ────────────────────────────────────────────────
export interface RagParam {
  key: string;
  label: string;
  group: 'models' | 'chunking' | 'retrieval' | 'generation' | 'advisor';
  type: 'string' | 'number' | 'enum';
  default: string | number;
  value: string | number;
  isOverridden: boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  freeText?: boolean;
  requiresReingest?: boolean;
  description: string;
}

export interface RagLogRow {
  id: number;
  created_at: string;
  user_id: string | null;
  user_email: string | null;
  endpoint: 'ask' | 'search' | 'product-advice';
  mode: string | null;
  question: string | null;
  lang: string | null;
  embedding_model: string | null;
  chat_model: string | null;
  params: Record<string, unknown> | null;
  retrieved_count: number | null;
  top_similarity: number | null;
  grounded: boolean | null;
  refused: boolean | null;
  latency_ms: number | null;
  error: string | null;
}

export interface RagStats {
  total: number;
  last24h: number;
  byEndpoint: Record<string, number>;
  grounded: number;
  refused: number;
  avgLatencyMs: number | null;
  topUsers: { user_email: string | null; count: number }[];
}
