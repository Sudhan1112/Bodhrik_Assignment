'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
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
      const mine = reviews.find((r) => r.booking_id === b.id) || null;
      setExistingReview(mine);
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
    setError(null);
    try {
      const r = await createReview({
        booking_id: booking.id,
        rating,
        comment: comment || undefined,
      });
      setExistingReview(r);
      setMessage('Review submitted.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Review failed');
    }
  }

  async function cancelPending() {
    if (!booking) return;
    try {
      const b = await updateBooking(booking.id, { status: 'cancelled' });
      setBooking(b);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Cancel failed');
    }
  }

  if (error && !booking) {
    return <p className="font-sans text-sm text-clay">{error}</p>;
  }
  if (!booking || !user) {
    return <p className="font-sans text-sm text-ink/70">Loading…</p>;
  }

  const isCustomer = user.role === 'customer' && user.id === booking.customer_id;
  const canReview =
    isCustomer && booking.status === 'completed' && existingReview === null;
  const showContactToCancel = isCustomer && booking.status === 'confirmed';

  return (
    <div>
      <Link href="/dashboard" className="font-sans text-sm text-brass underline-offset-2 hover:underline">
        ← Dashboard
      </Link>
      <h1 className="mt-4 font-display text-3xl">{booking.service_name}</h1>
      <div className="mt-2">
        <StatusBadge status={booking.status} />
      </div>

      <dl className="mt-8 grid gap-4 border-t border-hairline pt-6 font-sans text-sm sm:grid-cols-2">
        <div>
          <dt className="text-ink/50">Starts</dt>
          <dd>{formatWhen(booking.start_time)}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Ends</dt>
          <dd>{formatWhen(booking.end_time)}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Price</dt>
          <dd>{formatMoney(booking.price_cents)}</dd>
        </div>
        <div>
          <dt className="text-ink/50">Provider</dt>
          <dd>
            <Link
              href={"/providers/" + booking.provider_id}
              className="text-brass underline-offset-2 hover:underline"
            >
              View profile
            </Link>
          </dd>
        </div>
        {booking.notes ? (
          <div className="sm:col-span-2">
            <dt className="text-ink/50">Notes</dt>
            <dd>{booking.notes}</dd>
          </div>
        ) : null}
      </dl>

      {isCustomer && booking.status === 'pending' ? (
        <button
          type="button"
          onClick={() => void cancelPending()}
          className="mt-6 border border-clay px-4 py-2 font-sans text-sm text-clay hover:bg-clay hover:text-paper"
        >
          Cancel booking
        </button>
      ) : null}

      {showContactToCancel ? (
        <p className="mt-6 border-l-2 border-brass pl-3 font-sans text-sm text-ink/80">
          Contact your provider to cancel — once confirmed, only they can change the status.
        </p>
      ) : null}

      {existingReview ? (
        <section className="mt-10 border-t border-hairline pt-6">
          <h2 className="font-display text-xl">Your review</h2>
          <div className="mt-3">
            <StarRating value={existingReview.rating} readOnly />
            {existingReview.comment ? (
              <p className="mt-2 font-sans text-sm">{existingReview.comment}</p>
            ) : null}
            {existingReview.summary ? (
              <p className="mt-2 font-sans text-sm text-ink/60">Summary: {existingReview.summary}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      {canReview ? (
        <section className="mt-10 border-t border-hairline pt-6">
          <h2 className="font-display text-xl">Leave a review</h2>
          <form onSubmit={onReview} className="mt-4 space-y-4">
            <div>
              <p className="mb-1 font-sans text-sm">Rating</p>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <label className="block font-sans text-sm">
              Comment (optional)
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
              />
            </label>
            <button
              type="submit"
              className="bg-ink px-4 py-2 font-sans text-sm text-paper hover:bg-brass"
            >
              Submit review
            </button>
          </form>
        </section>
      ) : null}

      {message ? <p className="mt-4 font-sans text-sm text-sage">{message}</p> : null}
      {error ? <p className="mt-4 font-sans text-sm text-clay">{error}</p> : null}
    </div>
  );
}
