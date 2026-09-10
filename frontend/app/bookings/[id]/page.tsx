'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/EmptyState';
import { Textarea } from '@/components/Input';
import { StarRating } from '@/components/StarRating';
import {
  ApiError,
  createReview,
  formatMoney,
  formatWhen,
  getBooking,
  listProviderReviews,
  updateBooking,
} from '@/lib/api';
import { getStoredUser, getToken } from '@/lib/auth';
import type { Booking, Review, User } from '@/lib/types';

const FLOW: Array<Booking['status']> = ['pending', 'confirmed', 'completed'];

export default function BookingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login');
      return;
    }
    const u = getStoredUser();
    setUser(u);
    try {
      const b = await getBooking(params.id);
      setBooking(b);
      const reviews = await listProviderReviews(b.provider_id);
      setExistingReview(reviews.find((r) => r.booking_id === b.id) || null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load booking');
    }
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onReview(e: FormEvent) {
    e.preventDefault();
    if (!booking) return;
    try {
      const r = await createReview({
        booking_id: booking.id,
        rating,
        comment: comment || undefined,
      });
      setExistingReview(r);
      setMessage('Thanks — your review is live on the provider profile.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Review failed');
    }
  }

  async function cancelPending() {
    if (!booking) return;
    try {
      setBooking(await updateBooking(booking.id, { status: 'cancelled' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cancel failed');
    }
  }

  if (error && !booking) {
    return <p className="font-sans text-sm text-coral">{error}</p>;
  }
  if (!booking || !user) {
    return <Skeleton className="h-64 w-full" />;
  }

  const isCustomer = user.role === 'customer' && user.id === booking.customer_id;
  const canReview = isCustomer && booking.status === 'completed' && !existingReview;
  const showContactToCancel = isCustomer && booking.status === 'confirmed';

  return (
    <div className="mx-auto max-w-2xl animate-fadeUp">
      <Link href="/dashboard" className="font-sans text-sm text-teal hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 font-display text-4xl">{booking.service_name}</h1>
      <div className="mt-3">
        <Badge status={booking.status} />
      </div>

      <ol className="mt-8 flex gap-2">
        {FLOW.map((step, i) => {
          const done =
            FLOW.indexOf(
              booking.status === 'cancelled' || booking.status === 'no_show'
                ? 'pending'
                : booking.status,
            ) >= i || booking.status === step;
          const active = booking.status === step;
          return (
            <li
              key={step}
              className={
                'flex-1 rounded-full px-2 py-2 text-center font-sans text-[11px] uppercase tracking-wide ' +
                (active
                  ? 'bg-teal text-white'
                  : done
                    ? 'bg-teal/15 text-teal'
                    : 'bg-mist text-muted')
              }
            >
              {step.replace('_', ' ')}
            </li>
          );
        })}
      </ol>

      <dl className="panel mt-8 grid gap-4 p-5 font-sans text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted">Starts</dt>
          <dd className="mt-1">{formatWhen(booking.start_time)}</dd>
        </div>
        <div>
          <dt className="text-muted">Ends</dt>
          <dd className="mt-1">{formatWhen(booking.end_time)}</dd>
        </div>
        <div>
          <dt className="text-muted">Price</dt>
          <dd className="mt-1 tabular-nums">{formatMoney(booking.price_cents)}</dd>
        </div>
        <div>
          <dt className="text-muted">Provider</dt>
          <dd className="mt-1">
            <Link
              href={'/providers/' + booking.provider_id}
              className="text-teal hover:underline"
            >
              View profile
            </Link>
          </dd>
        </div>
        {booking.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-muted">Notes</dt>
            <dd className="mt-1">{booking.notes}</dd>
          </div>
        ) : null}
      </dl>

      {isCustomer && booking.status === 'pending' ? (
        <Button className="mt-6" variant="danger" onClick={() => void cancelPending()}>
          Cancel booking
        </Button>
      ) : null}

      {showContactToCancel ? (
        <p className="mt-6 rounded-2xl border border-border bg-mist/60 px-4 py-3 font-sans text-sm text-muted">
          Contact your provider to cancel — once confirmed, only they can change the status.
        </p>
      ) : null}

      {existingReview ? (
        <section className="panel mt-8 p-5">
          <h2 className="font-display text-xl">Your review</h2>
          <div className="mt-3">
            <StarRating value={existingReview.rating} readOnly />
            {existingReview.comment ? (
              <p className="mt-2 font-sans text-sm">{existingReview.comment}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {canReview ? (
        <section className="panel mt-8 p-5">
          <h2 className="font-display text-xl">How was your visit?</h2>
          <p className="mt-1 font-sans text-sm text-muted">
            Honest reviews help the next guest choose with confidence.
          </p>
          <form onSubmit={onReview} className="mt-4 space-y-4">
            <div>
              <p className="mb-1 font-sans text-sm">Rating</p>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>
            <Textarea
              label="Say a few words (optional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <Button type="submit">Submit review</Button>
          </form>
        </section>
      ) : null}

      {message ? <p className="mt-4 font-sans text-sm text-sage">{message}</p> : null}
      {error ? <p className="mt-4 font-sans text-sm text-coral">{error}</p> : null}
    </div>
  );
}
