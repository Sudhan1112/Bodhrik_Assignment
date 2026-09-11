'use client';

import Link from 'next/link';
import { formatDuration, formatMoney, formatWhen } from '@/lib/api';
import { bookingDurationMinutes } from '@/lib/bookingLifecycle';
import type { Booking } from '@/lib/types';
import { StatusBadge } from './Badge';
import { Button } from './Button';

function customerLabel(booking: Booking): string {
  return 'Customer · ' + booking.customer_id.slice(0, 8);
}

export function providerBookingPrimary(booking: Booking): { label: string; href: string } {
  if (booking.status === 'pending') {
    return { label: 'Review request', href: '/dashboard/bookings/' + booking.id };
  }
  if (booking.status === 'confirmed') {
    return { label: 'View appointment', href: '/dashboard/bookings/' + booking.id };
  }
  if (booking.status === 'completed') {
    return { label: 'View appointment', href: '/dashboard/bookings/' + booking.id };
  }
  return { label: 'View details', href: '/dashboard/bookings/' + booking.id };
}

export function ProviderBookingCard({
  booking,
  featured,
}: {
  booking: Booking;
  featured?: boolean;
}) {
  const mins = bookingDurationMinutes(booking);
  const primary = providerBookingPrimary(booking);

  return (
    <article
      className={
        'rounded-card border border-border bg-surface p-4 ' +
        (featured ? 'border-teal/30 shadow-soft' : '')
      }
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={booking.status} />
            <span className="font-sans text-caption text-muted">
              {formatWhen(booking.start_time)}
            </span>
          </div>
          <p className="mt-2 font-display text-xl font-medium">{booking.service_name}</p>
          <p className="mt-1 font-sans text-small text-muted">{customerLabel(booking)}</p>
          <p className="mt-1 font-sans text-small text-muted">
            {mins ? formatDuration(mins) : null}
            {mins && booking.price_cents != null ? ' · ' : null}
            {booking.price_cents != null ? formatMoney(booking.price_cents) : null}
          </p>
        </div>
        <Link href={primary.href}>
          <Button size="sm">{primary.label}</Button>
        </Link>
      </div>
    </article>
  );
}

export function ProviderBookingCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-4" aria-hidden>
      <div className="h-5 w-24 animate-pulseSoft rounded bg-subtle" />
      <div className="mt-3 h-6 w-48 animate-pulseSoft rounded bg-subtle" />
      <div className="mt-2 h-4 w-40 animate-pulseSoft rounded bg-subtle" />
    </div>
  );
}
