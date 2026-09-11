import type { Booking, BookingStatus } from '@/lib/types';

export type BookingTab = 'upcoming' | 'pending' | 'past' | 'cancelled';

export function bookingDurationMinutes(booking: Booking): number {
  const ms = new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

/** Confirmed appointments still ahead of now (excludes pending requests). */
export function isUpcomingBooking(booking: Booking, now = Date.now()): boolean {
  return (
    booking.status === 'confirmed' && new Date(booking.start_time).getTime() >= now
  );
}

export function isPendingBooking(booking: Booking): boolean {
  return booking.status === 'pending';
}

export function isCancelledBooking(booking: Booking): boolean {
  return booking.status === 'cancelled' || booking.status === 'no_show';
}

/** Completed, or past confirmed that never completed, or cancelled/no-show — for Past tab we use completed + past-dated confirmed. */
export function isPastBooking(booking: Booking, now = Date.now()): boolean {
  if (booking.status === 'completed') return true;
  if (booking.status === 'confirmed' && new Date(booking.start_time).getTime() < now) {
    return true;
  }
  return false;
}

export function filterBookingsByTab(
  bookings: Booking[],
  tab: BookingTab,
  now = Date.now(),
): Booking[] {
  const sorted = [...bookings].sort(
    (a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime(),
  );
  switch (tab) {
    case 'upcoming':
      return sorted
        .filter((b) => isUpcomingBooking(b, now))
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    case 'pending':
      return sorted
        .filter(isPendingBooking)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    case 'cancelled':
      return sorted.filter(isCancelledBooking);
    case 'past':
      return sorted.filter((b) => isPastBooking(b, now));
    default:
      return sorted;
  }
}

export function statusHeadline(status: BookingStatus): { title: string; detail: string } {
  switch (status) {
    case 'pending':
      return {
        title: 'Appointment requested',
        detail: 'Waiting for provider confirmation.',
      };
    case 'confirmed':
      return {
        title: 'Appointment confirmed',
        detail: 'Your appointment is scheduled.',
      };
    case 'completed':
      return {
        title: 'Appointment completed',
        detail: 'Review your experience or book again.',
      };
    case 'cancelled':
      return {
        title: 'Appointment cancelled',
        detail: 'This appointment will not take place.',
      };
    case 'no_show':
      return {
        title: 'Marked as no-show',
        detail: 'This appointment was closed as a no-show.',
      };
    default:
      return { title: 'Appointment', detail: '' };
  }
}

export function primaryListAction(
  booking: Booking,
  hasReview: boolean,
): { label: string; href: string } {
  if (booking.status === 'pending') {
    return { label: 'View request', href: '/bookings/' + booking.id };
  }
  if (booking.status === 'confirmed') {
    return { label: 'View appointment', href: '/bookings/' + booking.id };
  }
  if (booking.status === 'completed') {
    if (hasReview) {
      return { label: 'View review', href: '/bookings/' + booking.id + '#review' };
    }
    return { label: 'Write a review', href: '/bookings/' + booking.id + '#review' };
  }
  if (booking.status === 'cancelled' || booking.status === 'no_show') {
    return { label: 'View details', href: '/bookings/' + booking.id };
  }
  return { label: 'View details', href: '/bookings/' + booking.id };
}
