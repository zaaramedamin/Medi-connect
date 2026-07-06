export interface Doctor {
  id: number;
  name: string;
  email: string;
  description: string | null;
  phone: string | null;
  location: string | null;
  specialty: string | null;
  cost: number | null;
  photos_url: string | null;
  working_hours_start: string | null;
  working_hours_end: string | null;
  avg_consultation_time: number | null;
  created_at: string;
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
}

export interface BlockedSlot {
  id: number;
  doctor_id: number;
  start_time: string;
  end_time: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'patient' | 'doctor';
}

// Augment Express Request with our user type
declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
