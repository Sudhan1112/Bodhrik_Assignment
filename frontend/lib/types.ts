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
  avatar_url: string | null;
  cover_url: string | null;
  city: string | null;
  category: string | null;
  review_summary: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  provider_id: string;
  customer_id: string;
  service_id: string | null;
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
  provider_reply: string | null;
  replied_at: string | null;
  created_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Provider {
  id: string;
  full_name: string;
  business_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  city: string | null;
  category: string | null;
  average_rating: number | null;
  review_count: number;
}

export interface ProviderDetail extends Provider {
  review_summary: string | null;
}

export interface ProviderList {
  items: Provider[];
  total: number;
  limit: number;
  offset: number;
}

export interface ReviewStats {
  average_rating: number | null;
  review_count: number;
  histogram: Record<string, number>;
}

export interface Slot {
  start_time: string;
  end_time: string;
}

export interface AvailabilityRule {
  id: string;
  provider_id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}
