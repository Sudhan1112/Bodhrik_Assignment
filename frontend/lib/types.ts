export type UserRole = 'admin' | 'provider' | 'customer';

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  business_name: string | null;
  bio: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  provider_id: string;
  customer_id: string;
  service_name: string;
  start_time: string;
  end_time: string;
  status: BookingStatus;
  notes: string | null;
  price_cents: number | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  author_id: string;
  provider_id: string;
  rating: number;
  comment: string | null;
  summary: string | null;
  summarised_at: string | null;
  created_at: string;
}

export interface Provider {
  id: string;
  full_name: string;
  business_name: string | null;
  bio: string | null;
}

export interface ProviderDetail extends Provider {
  average_rating: number | null;
  review_count: number;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
