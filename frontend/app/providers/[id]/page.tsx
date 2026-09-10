'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { RatingBreakdown } from '@/components/RatingBreakdown';
import { ServiceCard } from '@/components/ProviderCard';
import { SlotPicker } from '@/components/SlotPicker';
import { Skeleton } from '@/components/EmptyState';
import { StarRating } from '@/components/StarRating';
import {
  ApiError,
  categoryLabel,
  createBooking,
  getProvider,
  getReviewStats,
  listProviderReviews,
  listProviderServices,
  listSlots,
} from '@/lib/api';
import { getStoredUser, getToken } from '@/lib/auth';
import type { ProviderDetail, Review, ReviewStats, Service, Slot, User } from '@/lib/types';

export default function ProviderPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setUser(getStoredUser());
    Promise.all([
      getProvider(params.id),
      listProviderServices(params.id),
      listProviderReviews(params.id),
      getReviewStats(params.id),
    ])
      .then(([p, s, r, st]) => {
        setProvider(p);
        setServices(s);
        setReviews(r);
        setStats(st);
        if (s[0]) setServiceId(s[0].id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Failed to load'));
  }, [params.id]);

  useEffect(() => {
    if (!serviceId || !date) {
      setSlots([]);
      return;
    }
    setSlotLoading(true);
    setSelectedSlot(null);
    listSlots(params.id, date, serviceId)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setSlotLoading(false));
  }, [params.id, serviceId, date]);

  async function onBook(e: FormEvent) {
    e.preventDefault();
    if (!getToken()) {
      router.push('/login');
      return;
    }
    if (!serviceId || !selectedSlot) return;
    setBusy(true);
    setError(null);
    try {
      const booking = await createBooking({
        provider_id: params.id,
        service_id: serviceId,
        start_time: selectedSlot,
      });
      setMessage('Booking requested — awaiting confirmation.');
      router.push('/bookings/' + booking.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not book');
    } finally {
      setBusy(false);
    }
  }

  if (error && !provider) {
    return <p className="font-sans text-sm text-coral">{error}</p>;
  }
  if (!provider) {
    return <Skeleton className="h-80 w-full" />;
  }

  const title = provider.business_name || provider.full_name;

  return (
    <div className="animate-fadeUp">
      <div
        className="relative h-56 overflow-hidden rounded-3xl bg-mist bg-cover bg-center sm:h-72"
        style={{
          backgroundImage: provider.cover_url ? 'url(' + provider.cover_url + ')' : undefined,
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
        <div className="absolute bottom-0 flex items-end gap-4 p-6 text-white">
          <div
            className="h-20 w-20 rounded-full bg-border bg-cover bg-center ring-4 ring-white/30"
            style={{
              backgroundImage: provider.avatar_url
                ? 'url(' + provider.avatar_url + ')'
                : undefined,
            }}
          />
          <div>
            <h1 className="font-display text-3xl sm:text-4xl">{title}</h1>
            <p className="mt-1 font-sans text-sm text-white/80">
              {provider.full_name}
              {provider.city ? ' · ' + provider.city : ''}
              {' · '}
              {categoryLabel(provider.category)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-8 lg:col-span-3">
          {provider.bio ? (
            <p className="font-sans text-base leading-relaxed text-ink/85">{provider.bio}</p>
          ) : null}

          {provider.review_summary ? (
            <div className="panel border-l-4 border-l-teal p-5">
              <p className="font-sans text-xs uppercase tracking-wide text-muted">Guest summary</p>
              <p className="mt-2 font-sans text-sm leading-relaxed">{provider.review_summary}</p>
            </div>
          ) : null}

          {stats ? <RatingBreakdown stats={stats} /> : null}

          <section>
            <h2 className="font-display text-2xl">Reviews</h2>
            <div className="mt-4 space-y-4">
              {reviews.length === 0 ? (
                <p className="font-sans text-sm text-muted">No reviews yet.</p>
              ) : (
                reviews.map((r) => (
                  <article key={r.id} className="panel p-4">
                    <StarRating value={r.rating} readOnly size="sm" />
                    {r.comment ? (
                      <p className="mt-2 font-sans text-sm leading-relaxed">{r.comment}</p>
                    ) : null}
                    {r.provider_reply ? (
                      <p className="mt-3 rounded-xl bg-mist px-3 py-2 font-sans text-sm text-muted">
                        <span className="font-medium text-ink">Provider · </span>
                        {r.provider_reply}
                      </p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </section>
        </div>

        <aside className="lg:col-span-2">
          <form onSubmit={onBook} className="panel sticky top-24 space-y-5 p-5">
            <h2 className="font-display text-2xl">Book a visit</h2>
            <div className="space-y-3">
              {services.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  selected={serviceId === s.id}
                  onSelect={() => setServiceId(s.id)}
                />
              ))}
              {!services.length ? (
                <p className="font-sans text-sm text-muted">No services listed yet.</p>
              ) : null}
            </div>
            <label className="block font-sans text-sm">
              Date
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-border bg-white px-3.5 py-2.5"
              />
            </label>
            <div>
              <p className="mb-2 font-sans text-sm">Available times</p>
              <SlotPicker
                slots={slots}
                selected={selectedSlot}
                onSelect={setSelectedSlot}
                loading={slotLoading}
              />
            </div>
            {user?.role === 'customer' ? (
              <Button type="submit" disabled={busy || !selectedSlot} className="w-full">
                {busy ? 'Requesting…' : 'Request booking'}
              </Button>
            ) : user ? (
              <p className="font-sans text-sm text-muted">
                Switch to a customer account to book this provider.
              </p>
            ) : (
              <Button
                type="button"
                className="w-full"
                onClick={() => router.push('/login')}
              >
                Sign in to book
              </Button>
            )}
            {!user ? (
              <p className="text-center font-sans text-xs text-muted">
                <Link href="/login" className="text-teal hover:underline">
                  Sign in
                </Link>{' '}
                or{' '}
                <Link href="/register" className="text-teal hover:underline">
                  register
                </Link>
              </p>
            ) : null}
            {message ? <p className="font-sans text-sm text-sage">{message}</p> : null}
            {error ? <p className="font-sans text-sm text-coral">{error}</p> : null}
          </form>
        </aside>
      </div>
    </div>
  );
}
