'use client';

import Link from 'next/link';
import { formatDuration, formatMoney, formatWhen } from '@/lib/api';
import {
  bookingDurationMinutes,
  primaryListAction,
  statusHeadline,
} from '@/lib/bookingLifecycle';
import type { Booking, User } from '@/lib/types';
import { StatusBadge } from './Badge';
import { Button } from './Button';

type StatusAction = 'confirmed' | 'completed' | 'cancelled' | 'no_show';

export function BookingCard({
  booking,
  user,
  onStatus,
  showReviewCta,
  featured = false,
  providerName,
  hasReview,
}: {
  booking: Booking;
  user: User;
  onStatus?: (id: string, status: StatusAction) => void;
  showReviewCta?: boolean;
  featured?: boolean;
  providerName?: string;
  hasReview?: boolean;
}) {
  const mins = bookingDurationMinutes(booking);
  const isCustomer = user.role === 'customer';
  const isProvider = user.role === 'provider' || user.role === 'admin';
  const headline = statusHeadline(booking.status);
  const primary = primaryListAction(booking, !!hasReview);

  return (
    <article
      className={
        'rounded-card border border-border bg-surface p-4 transition-shadow duration-fast ' +
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
          {headline.detail ? (
            <p className="mt-1.5 font-sans text-caption text-muted">{headline.detail}</p>
          ) : null}
          <p className="mt-2 font-display text-xl font-medium text-ink">{booking.service_name}</p>
          {providerName ? (
            <p className="mt-1 font-sans text-small text-ink/80">{providerName}</p>
          ) : null}
          <p className="mt-1 font-sans text-small text-muted">
            {mins ? formatDuration(mins) : null}
            {mins && booking.price_cents != null ? ' · ' : null}
            {booking.price_cents != null ? formatMoney(booking.price_cents) : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <Link href={primary.href}>
            <Button size="sm">{primary.label}</Button>
          </Link>
          {isCustomer && booking.status === 'pending' ? (
            <Link href={'/bookings/' + booking.id}>
              <Button size="sm" variant="secondary">
                Manage
              </Button>
            </Link>
          ) : null}
          {showReviewCta && booking.status === 'completed' && !hasReview ? (
            <Link href={'/bookings/' + booking.id + '#review'}>
              <Button size="sm" variant="secondary">
                Write a review
              </Button>
            </Link>
          ) : null}
          {isProvider && onStatus && booking.status === 'pending' ? (
            <>
              <Button size="sm" onClick={() => onStatus(booking.id, 'confirmed')}>
                Confirm
              </Button>
              <Button size="sm" variant="danger" onClick={() => onStatus(booking.id, 'cancelled')}>
                Decline
              </Button>
            </>
          ) : null}
          {isProvider && onStatus && booking.status === 'confirmed' ? (
            <>
              <Button size="sm" onClick={() => onStatus(booking.id, 'completed')}>
                Complete
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onStatus(booking.id, 'no_show')}>
                No-show
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function BookingCardSkeleton() {
  return (
    <div className="rounded-card border border-border bg-surface p-4" aria-hidden>
      <div className="h-5 w-24 animate-pulseSoft rounded bg-subtle" />
      <div className="mt-3 h-6 w-48 animate-pulseSoft rounded bg-subtle" />
      <div className="mt-2 h-4 w-32 animate-pulseSoft rounded bg-subtle" />
      <div className="mt-4 h-9 w-28 animate-pulseSoft rounded bg-subtle" />
    </div>
  );
}
