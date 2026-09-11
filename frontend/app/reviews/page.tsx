'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { EmptyState, ErrorBanner, Skeleton } from '@/components/EmptyState';
import { StarRating } from '@/components/StarRating';
import {
  ApiError,
  formatWhen,
  getProvider,
  listBookings,
  listProviderReviews,
} from '@/lib/api';
import { getStoredUser, getToken } from '@/lib/auth';
import type { Booking, Review, User } from '@/lib/types';

export default function ReviewsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [toWrite, setToWrite] = useState<Booking[]>([]);
  const [submitted, setSubmitted] = useState<Array<{ booking: Booking; review: Review }>>([]);
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const u = getStoredUser();
    if (!getToken() || !u) {
      router.replace('/login?next=/reviews');
      return;
    }
    if (u.role !== 'customer') {
      router.replace('/dashboard');
      return;
    }
    setUser(u);
    try {
      const bookings = await listBookings();
      const completed = bookings.filter((b) => b.status === 'completed');
      const providerIds = Array.from(new Set(completed.map((b) => b.provider_id)));
      const reviewLists = await Promise.all(
        providerIds.map((id) => listProviderReviews(id).catch(() => [] as Review[])),
      );
      const byBooking = new Map<string, Review>();
      for (const list of reviewLists) {
        for (const r of list) {
          if (r.author_id === u.id) byBooking.set(r.booking_id, r);
        }
      }
      const write: Booking[] = [];
      const done: Array<{ booking: Booking; review: Review }> = [];
      for (const b of completed) {
        const r = byBooking.get(b.id);
        if (r) done.push({ booking: b, review: r });
        else write.push(b);
      }
      setToWrite(write);
      setSubmitted(done);

      const names: Record<string, string> = {};
      await Promise.all(
        providerIds.map(async (id) => {
          try {
            const p = await getProvider(id);
            names[id] = p.business_name || p.full_name;
          } catch {
            names[id] = 'Provider';
          }
        }),
      );
      setProviderNames(names);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load reviews.");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading || !user) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="animate-fadeUp">
      <p className="eyebrow">Reviews</p>
      <h1 className="type-h1 mt-2">Your reviews</h1>
      <p className="mt-2 max-w-xl font-sans text-small text-muted">
        Reviews can only be written after a completed visit.
      </p>

      {error ? (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="type-h2">To write</h2>
        <div className="mt-4 space-y-3">
          {toWrite.length === 0 ? (
            <EmptyState
              title="No reviews to write"
              description="Completed visits without a review will appear here."
              actionHref="/explore"
              actionLabel="Find a provider"
            />
          ) : (
            toWrite.map((b) => (
              <div key={b.id} className="surface flex flex-wrap items-center justify-between gap-3 p-4">
                <div>
                  <Link
                    href={'/providers/' + b.provider_id}
                    className="font-display text-lg text-ink hover:text-teal hover:underline"
                  >
                    {providerNames[b.provider_id] || 'Provider'}
                  </Link>
                  <p className="mt-0.5 font-sans text-small text-muted">
                    {b.service_name} · {formatWhen(b.start_time)}
                  </p>
                </div>
                <Link href={'/bookings/' + b.id + '#review'}>
                  <Button size="sm">Write review</Button>
                </Link>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="type-h2">Submitted</h2>
        <div className="mt-4 space-y-3">
          {submitted.length === 0 ? (
            <p className="font-sans text-small text-muted">You haven&apos;t submitted a review yet.</p>
          ) : (
            submitted.map(({ booking, review }) => (
              <div key={booking.id} className="surface p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <Link
                      href={'/providers/' + booking.provider_id}
                      className="font-display text-lg text-ink hover:text-teal hover:underline"
                    >
                      {providerNames[booking.provider_id] || 'Provider'}
                    </Link>
                    <p className="mt-0.5 font-sans text-small text-muted">{booking.service_name}</p>
                  </div>
                  <StarRating value={review.rating} readOnly size="sm" />
                </div>
                {review.comment ? (
                  <p className="mt-2 font-sans text-small text-ink/85">{review.comment}</p>
                ) : null}
                <Link
                  href={'/bookings/' + booking.id}
                  className="mt-2 inline-block font-sans text-small text-teal hover:underline"
                >
                  View booking
                </Link>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
