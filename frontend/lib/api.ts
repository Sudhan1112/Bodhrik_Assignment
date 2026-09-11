import { clearSession, getToken } from './auth';
import type {
  AuthResponse,
  AvailabilityRule,
  Booking,
  BookingStatus,
  Provider,
  ProviderDetail,
  ProviderList,
  Review,
  ReviewStats,
  Service,
  Slot,
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
    if (token) headers.Authorization = 'Bearer ' + token;
  }

  const res = await fetch(API_URL + path, { ...options, headers });
  if (res.status === 401 && auth) clearSession();
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
  city?: string;
  category?: string;
}): Promise<User> {
  return request<User>('/auth/register', { method: 'POST', body: JSON.stringify(payload) });
}

export function loginUser(email: string, password: string): Promise<AuthResponse> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function listBookings(status?: BookingStatus): Promise<Booking[]> {
  const q = status ? '?status=' + status : '';
  return request<Booking[]>('/bookings' + q, {}, true);
}

export function getBooking(id: string): Promise<Booking> {
  return request<Booking>('/bookings/' + id, {}, true);
}

export function createBooking(payload: {
  provider_id: string;
  service_id: string;
  start_time: string;
  notes?: string;
}): Promise<Booking> {
  return request<Booking>('/bookings', { method: 'POST', body: JSON.stringify(payload) }, true);
}

export function updateBooking(
  id: string,
  payload: Partial<{
    status: BookingStatus;
    notes: string;
    start_time: string;
    end_time: string;
  }>,
): Promise<Booking> {
  return request<Booking>(
    '/bookings/' + id,
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

export function replyToReview(id: string, provider_reply: string): Promise<Review> {
  return request<Review>(
    '/reviews/' + id + '/reply',
    { method: 'PATCH', body: JSON.stringify({ provider_reply }) },
    true,
  );
}

export function listProviders(params?: {
  q?: string;
  category?: string;
  min_rating?: number;
  limit?: number;
  offset?: number;
}): Promise<ProviderList> {
  const sp = new URLSearchParams();
  if (params?.q) sp.set('q', params.q);
  if (params?.category) sp.set('category', params.category);
  if (params?.min_rating != null) sp.set('min_rating', String(params.min_rating));
  if (params?.limit != null) sp.set('limit', String(params.limit));
  if (params?.offset != null) sp.set('offset', String(params.offset));
  const q = sp.toString() ? '?' + sp.toString() : '';
  return request<ProviderList>('/providers' + q);
}

export function getProvider(id: string): Promise<ProviderDetail> {
  return request<ProviderDetail>('/providers/' + id);
}

export function listProviderReviews(id: string): Promise<Review[]> {
  return request<Review[]>('/providers/' + id + '/reviews');
}

export function getReviewStats(id: string): Promise<ReviewStats> {
  return request<ReviewStats>('/providers/' + id + '/reviews/stats');
}

export function listProviderServices(id: string): Promise<Service[]> {
  return request<Service[]>('/providers/' + id + '/services');
}

export function listSlots(providerId: string, date: string, serviceId: string): Promise<Slot[]> {
  const q = '?date=' + date + '&service_id=' + serviceId;
  return request<Slot[]>('/providers/' + providerId + '/slots' + q);
}

export function createService(payload: {
  name: string;
  description?: string;
  duration_minutes: number;
  price_cents: number;
}): Promise<Service> {
  return request<Service>('/services', { method: 'POST', body: JSON.stringify(payload) }, true);
}

export function updateService(
  id: string,
  payload: Partial<{
    name: string;
    description: string | null;
    duration_minutes: number;
    price_cents: number;
    is_active: boolean;
  }>,
): Promise<Service> {
  return request<Service>(
    '/services/' + id,
    { method: 'PATCH', body: JSON.stringify(payload) },
    true,
  );
}

export function deleteService(id: string): Promise<void> {
  return request<void>('/services/' + id, { method: 'DELETE' }, true);
}

export function getMyAvailability(): Promise<AvailabilityRule[]> {
  return request<AvailabilityRule[]>('/providers/me/availability', {}, true);
}

export function replaceMyAvailability(
  rules: { weekday: number; start_time: string; end_time: string; is_active?: boolean }[],
): Promise<AvailabilityRule[]> {
  return request<AvailabilityRule[]>(
    '/providers/me/availability',
    { method: 'PUT', body: JSON.stringify({ rules }) },
    true,
  );
}

export function summariseReviews(providerId: string): Promise<{
  job_id: string;
  status: string;
  review_count: number;
}> {
  return request('/providers/' + providerId + '/reviews/summarise', { method: 'POST' }, true);
}

export function formatMoney(cents: number | null | undefined): string {
  if (cents == null) return '—';
  return '$' + (cents / 100).toFixed(2);
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return minutes + ' min';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? h + 'h ' + m + 'm' : h + 'h';
}

import { taxonomyTitleForProviderCategory } from './taxonomy';

export function categoryLabel(c: string | null | undefined): string {
  return taxonomyTitleForProviderCategory(c);
}

export type { Provider };
