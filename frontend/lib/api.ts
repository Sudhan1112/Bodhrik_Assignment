import { clearSession, getToken } from './auth';
import type {
  AuthResponse,
  Booking,
  BookingStatus,
  Provider,
  ProviderDetail,
  Review,
  User,
  UserRole,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = false,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (res.status === 401 && auth) {
    clearSession();
  }
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      if (typeof body.detail === 'string') detail = body.detail;
      else if (Array.isArray(body.detail)) {
        detail = body.detail
          .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
          .join('; ');
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, detail);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function registerUser(payload: {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
  business_name?: string;
  bio?: string;
}): Promise<User> {
  return request<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function loginUser(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function listBookings(status?: BookingStatus): Promise<Booking[]> {
  const q = status ? `?status=${status}` : '';
  return request<Booking[]>(`/bookings${q}`, {}, true);
}

export function getBooking(id: string): Promise<Booking> {
  return request<Booking>(`/bookings/${id}`, {}, true);
}

export function createBooking(payload: {
  provider_id: string;
  service_name: string;
  start_time: string;
  end_time: string;
  notes?: string;
  price_cents?: number;
}): Promise<Booking> {
  return request<Booking>(
    '/bookings',
    { method: 'POST', body: JSON.stringify(payload) },
    true,
  );
}

export function updateBooking(
  id: string,
  payload: Partial<{
    status: BookingStatus;
    service_name: string;
    start_time: string;
    end_time: string;
    notes: string;
    price_cents: number;
  }>,
): Promise<Booking> {
  return request<Booking>(
    `/bookings/${id}`,
    { method: 'PATCH', body: JSON.stringify(payload) },
    true,
  );
}

export function createReview(payload: {
  booking_id: string;
  rating: number;
  comment?: string;
}): Promise<Review> {
  return request<Review>('/reviews', { method: 'POST', body: JSON.stringify(payload) }, true);
}

export function listProviders(): Promise<Provider[]> {
  return request<Provider[]>('/providers');
}

export function getProvider(id: string): Promise<ProviderDetail> {
  return request<ProviderDetail>(`/providers/${id}`);
}

export function listProviderReviews(id: string): Promise<Review[]> {
  return request<Review[]>(`/providers/${id}/reviews`);
}

export function summariseReviews(providerId: string): Promise<{
  job_id: string;
  status: string;
  review_count: number;
}> {
  return request(`/providers/${providerId}/reviews/summarise`, { method: 'POST' }, true);
}

export function formatMoney(cents: number | null): string {
  if (cents == null) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

export function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
