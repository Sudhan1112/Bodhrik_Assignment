'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ProviderBookingCard,
  ProviderBookingCardSkeleton,
} from '@/components/ProviderBookingCard';
import { ProviderSubnav } from '@/components/ProviderSubnav';
import { Button } from '@/components/Button';
import { EmptyState, ErrorBanner, Skeleton } from '@/components/EmptyState';
import { ReviewCard } from '@/components/ReviewCard';
import { StarRating } from '@/components/StarRating';
import {
  ApiError,
  getReviewStats,
  listBookings,
  listProviderReviews,
  listProviderServices,
  getMyAvailability,
} from '@/lib/api';
import { useProviderSession } from '@/lib/useProviderSession';
import type { Booking, Review, ReviewStats } from '@/lib/types';

export default function ProviderDashboardPage() {
  const { user, ready } = useProviderSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [serviceCount, setServiceCount] = useState(0);
  const [hasAvailability, setHasAvailability] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [list, revs, st, services, rules] = await Promise.all([
        listBookings(),
        listProviderReviews(user.id).catch(() => [] as Review[]),
        getReviewStats(user.id).catch(() => null),
        listProviderServices(user.id).catch(() => []),
        getMyAvailability().catch(() => []),
      ]);
      setBookings(list);
      setReviews(revs.slice(0, 3));
      setStats(st);
      setServiceCount(services.length);
      setHasAvailability(rules.some((r) => r.is_active));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong loading your dashboard.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

  const pending = useMemo(
    () =>
      bookings
        .filter((b) => b.status === 'pending')
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()),
    [bookings],
  );

  const upcoming = useMemo(() => {
    const now = Date.now();
    return bookings
      .filter(
        (b) =>
          b.status === 'confirmed' && new Date(b.start_time).getTime() >= now,
      )
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
      .slice(0, 5);
  }, [bookings]);

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-10 w-full" />
        <ProviderBookingCardSkeleton />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = (user.business_name || user.full_name).split(' ')[0];
  const needsSetup = serviceCount === 0 || !hasAvailability;

  return (
    <div className="mx-auto max-w-3xl animate-fadeUp pb-8">
      <ProviderSubnav />

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-h1">
            {greeting}, {name}
          </h1>
          <p className="mt-2 font-sans text-body text-muted">
            Manage requests, appointments, and your listing.
          </p>
        </div>
        <Link href={'/providers/' + user.id}>
          <Button variant="secondary">View public profile</Button>
        </Link>
      </header>

      {error ? (
        <div className="mt-4">
          <ErrorBanner message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 space-y-3">
          <ProviderBookingCardSkeleton />
          <ProviderBookingCardSkeleton />
        </div>
      ) : (
        <>
          {needsSetup ? (
            <section className="mt-8 rounded-card border border-border bg-canvas px-5 py-5">
              <h2 className="font-sans text-h3 font-semibold">Complete your provider setup</h2>
              <ol className="mt-3 space-y-2 font-sans text-small text-muted">
                <li className={serviceCount > 0 ? 'text-ink' : ''}>
                  {serviceCount > 0 ? '✓' : '1.'}{' '}
                  <Link href="/dashboard/services" className="text-teal hover:underline">
                    Add your services
                  </Link>
                </li>
                <li className={hasAvailability ? 'text-ink' : ''}>
                  {hasAvailability ? '✓' : '2.'}{' '}
                  <Link href="/dashboard/availability" className="text-teal hover:underline">
                    Set your availability
                  </Link>
                </li>
                <li>
                  3.{' '}
                  <Link href="/dashboard/profile" className="text-teal hover:underline">
                    Review your public profile
                  </Link>
                </li>
              </ol>
            </section>
          ) : null}

          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="type-h2">Booking requests</h2>
              <Link
                href="/dashboard/bookings?tab=requests"
                className="font-sans text-small text-teal hover:underline"
              >
                View all
              </Link>
            </div>
            {pending.length > 0 ? (
              <p className="mt-1 font-sans text-small text-amber">
                {pending.length} request{pending.length === 1 ? '' : 's'} need your attention
              </p>
            ) : null}
            <div className="mt-4 space-y-3">
              {pending.length === 0 ? (
                <EmptyState
                  title="No booking requests yet"
                  description="When customers request appointments, they will appear here."
                />
              ) : (
                pending.slice(0, 5).map((b) => <ProviderBookingCard key={b.id} booking={b} />)
              )}
            </div>
          </section>

          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="type-h2">Upcoming</h2>
              <Link
                href="/dashboard/bookings?tab=upcoming"
                className="font-sans text-small text-teal hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="mt-4 space-y-3">
              {upcoming.length === 0 ? (
                <EmptyState
                  title="No upcoming appointments"
                  description="Confirmed appointments will appear here."
                />
              ) : (
                upcoming.map((b) => (
                  <ProviderBookingCard key={b.id} booking={b} featured={b === upcoming[0]} />
                ))
              )}
            </div>
          </section>

          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="type-h2">Recent reviews</h2>
              <Link href="/dashboard/reviews" className="font-sans text-small text-teal hover:underline">
                View all
              </Link>
            </div>
            {stats && stats.review_count > 0 ? (
              <div className="mt-2 flex items-center gap-2 font-sans text-small">
                <StarRating value={stats.average_rating || 0} readOnly size="sm" />
                <span className="font-semibold tabular-nums">
                  {(stats.average_rating || 0).toFixed(1)}
                </span>
                <span className="text-muted">· {stats.review_count} reviews</span>
              </div>
            ) : null}
            <div className="mt-4">
              {reviews.length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="Your reviews will appear here after completed appointments."
                />
              ) : (
                reviews.map((r) => <ReviewCard key={r.id} review={r} canReply />)
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
