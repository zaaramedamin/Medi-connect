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
  created_at?: string;
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

export type UserRole = 'patient' | 'doctor';
