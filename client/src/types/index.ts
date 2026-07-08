export interface Doctor {
  id: string;
  name: string;
  email?: string;
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
}

export interface Review {
  id: number;
  rating: number;
  comment: string | null;
  created_at: string;
  patient_name: string;
}

export interface Appointment {
  id: number;
  doctor_id: string;
  user_id: string;
  time_slot: string;
  status: 'confirmed' | 'cancelled' | 'completed';
  payment_method: 'cash' | 'online';
  payment_status: 'pending' | 'paid';
  created_at: string;
  doctors?: Pick<Doctor, 'id' | 'name' | 'specialty' | 'location' | 'photos_url'>;
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
  category: ArticleCategory;
  excerpt: string | null;
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
