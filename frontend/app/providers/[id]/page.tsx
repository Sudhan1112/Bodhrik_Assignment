'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { DateSelector } from '@/components/DateSelector';
import { EmptyState, ErrorBanner, Skeleton } from '@/components/EmptyState';
import { ServiceRow } from '@/components/ProviderCard';
import { RatingBreakdown } from '@/components/RatingBreakdown';
import { ReviewCard } from '@/components/ReviewCard';
import { Rating } from '@/components/StarRating';
import { StatusBadge } from '@/components/Badge';
import { TimeSlotGrid } from '@/components/TimeSlotGrid';
import { useToast } from '@/components/Toast';
import {
  ApiError,
  createBooking,
  formatDuration,
  formatMoney,
  formatWhen,
  getProvider,
  getReviewStats,
  listProviderReviews,
  listProviderServices,
  listSlots,
} from '@/lib/api';
import { getStoredUser, getToken } from '@/lib/auth';
import {
  addCompareIdAndNotify,
  getCompareIds,
  isProviderSaved,
  onDiscoveryChange,
  pushRecentlyViewedAndNotify,
  removeCompareIdAndNotify,
  toggleSavedProviderAndNotify,
} from '@/lib/discoveryStorage';
import {
  getTaxonomyForProviderCategory,
  taxonomyTitleForProviderCategory,
} from '@/lib/taxonomy';
import type { Booking, ProviderDetail, Review, ReviewStats, Service, Slot, User } from '@/lib/types';

type Step = 'service' | 'date' | 'time' | 'review';

function ProviderPageInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const bookRef = useRef<HTMLDivElement>(null);

  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>('service');
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Booking | null>(null);
  const [saved, setSaved] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [starFilter, setStarFilter] = useState<number | 'all'>('all');
  const [availableDates, setAvailableDates] = useState<Set<string> | null>(null);
  const [loadingDates, setLoadingDates] = useState(false);
  const [serviceDeepLinkMiss, setServiceDeepLinkMiss] = useState(false);

  function loadAll() {
    setLoading(true);
    setLoadError(null);
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
        const deep = searchParams.get('service');
        if (deep) {
          if (s.some((x) => x.id === deep)) {
            setServiceId(deep);
            setStep('date');
            setServiceDeepLinkMiss(false);
          } else {
            setServiceDeepLinkMiss(true);
          }
        }
      })
      .catch((err) =>
        setLoadError(
          err instanceof ApiError && err.status === 404
            ? 'not_found'
            : err instanceof ApiError
              ? err.message
              : "Couldn't load provider",
        ),
      )
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setUser(getStoredUser());
    loadAll();
    pushRecentlyViewedAndNotify(params.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  useEffect(() => {
    function sync() {
      setSaved(isProviderSaved(params.id));
      setInCompare(getCompareIds().includes(params.id));
    }
    sync();
    return onDiscoveryChange(sync);
  }, [params.id]);

  function loadSlots() {
    if (!serviceId || !date) {
      setSlots([]);
      setSlotLoading(false);
      return;
    }
    setSlotLoading(true);
    setSlotError(null);
    setSelectedSlot(null);
    listSlots(params.id, date, serviceId)
      .then(setSlots)
      .catch(() => {
        setSlots([]);
        setSlotError('Something went wrong while checking available times.');
      })
      .finally(() => setSlotLoading(false));
  }

  useEffect(() => {
    loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, serviceId, date]);

  useEffect(() => {
    if (!serviceId) {
      setAvailableDates(null);
      setLoadingDates(false);
      return;
    }
    let cancelled = false;
    setLoadingDates(true);
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const days = Array.from({ length: 21 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    });
    Promise.all(
      days.map((ymd) =>
        listSlots(params.id, ymd, serviceId)
          .then((slots) => (slots.length ? ymd : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      setAvailableDates(new Set(results.filter(Boolean) as string[]));
      setLoadingDates(false);
    });
    return () => {
      cancelled = true;
    };
  }, [params.id, serviceId]);

  const selectedService = useMemo(
    () => services.find((s) => s.id === serviceId) || null,
    [services, serviceId],
  );

  const filteredReviews = useMemo(() => {
    if (starFilter === 'all') return reviews;
    return reviews.filter((r) => r.rating === starFilter);
  }, [reviews, starFilter]);

  const dayLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';

  function selectService(id: string) {
    setServiceId(id);
    setDate('');
    setSelectedSlot(null);
    setStep('date');
    setError(null);
    setServiceDeepLinkMiss(false);
    bookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function scrollToBook() {
    bookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function submitRequest() {
    if (!getToken()) {
      router.push(
        '/login?next=' +
          encodeURIComponent(
            '/providers/' + params.id + (serviceId ? '?service=' + serviceId : ''),
          ),
      );
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
      setCreated(booking);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || /overlap|conflict|available/i.test(err.message))) {
        setError('That time is no longer available. Someone else may have taken this appointment slot.');
        setSelectedSlot(null);
        setStep('time');
        loadSlots();
      } else {
        setError(
          err instanceof ApiError
            ? err.message
            : 'We couldn’t complete your request. Please try again.',
        );
      }
    } finally {
      setBusy(false);
    }
  }

  function onSave() {
    const now = toggleSavedProviderAndNotify(params.id);
    setSaved(now);
    toast(now ? 'Saved — added to your saved providers.' : 'Removed from saved');
  }

  function onCompare() {
    if (inCompare) {
      removeCompareIdAndNotify(params.id);
      setInCompare(false);
      toast('Removed from compare');
      return;
    }
    const label = provider?.business_name || provider?.full_name || 'Provider';
    const r = addCompareIdAndNotify(params.id, label);
    if (!r.ok) {
      toast(r.reason || 'Compare limit reached');
      return;
    }
    setInCompare(true);
    toast('Added to compare');
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-fadeUp">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="aspect-[2.4/1] w-full" />
        <div className="grid gap-4 lg:grid-cols-5">
          <Skeleton className="h-64 lg:col-span-3" />
          <Skeleton className="h-64 lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (loadError === 'not_found' || (!provider && loadError)) {
    return (
      <EmptyState
        title="Provider not found"
        description="This provider may no longer be available."
        actionHref="/explore"
        actionLabel="Explore providers"
      />
    );
  }

  if (loadError && !provider) {
    return <ErrorBanner message={loadError} onRetry={loadAll} />;
  }

  if (!provider) return null;

  const title = provider.business_name || provider.full_name;
  const tax = getTaxonomyForProviderCategory(provider.category);
  const isOwner = user?.role === 'provider' && user.id === provider.id;
  const showStarFilters = reviews.length >= 5;

  if (created) {
    return (
      <div className="mx-auto max-w-lg animate-fadeUp py-8 text-center" aria-live="polite">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-teal-soft text-2xl text-teal">
          ✓
        </div>
        <h1 className="type-h1 mt-5">Appointment requested</h1>
        <p className="mt-2 font-sans text-body text-muted">
          Your request has been sent to {title}.
        </p>
        <div className="card mt-8 px-5 py-4 text-left font-sans text-small">
          <div className="flex items-center justify-between gap-2">
            <p className="font-display text-xl font-medium">{title}</p>
            <StatusBadge status="pending" />
          </div>
          <p className="mt-4 text-muted">Service</p>
          <p>{created.service_name}</p>
          <p className="mt-3 text-muted">When</p>
          <p>{formatWhen(created.start_time)}</p>
          <p className="mt-3 text-muted">Duration / Price</p>
          <p>
            {selectedService ? formatDuration(selectedService.duration_minutes) : '—'}
            {' · '}
            {formatMoney(created.price_cents)}
          </p>
        </div>
        <p className="mt-6 font-sans text-small text-muted">
          Waiting for provider confirmation. You can track this request from Bookings.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href={'/bookings/' + created.id + '?requested=1'}>
            <Button>View appointment</Button>
          </Link>
          <Link href="/explore">
            <Button variant="secondary">Back to Explore</Button>
          </Link>
        </div>
      </div>
    );
  }

  const stickyLabel =
    step === 'review'
      ? 'Request appointment'
      : !selectedService
        ? 'Book appointment'
        : !date || step === 'date'
          ? 'Choose time'
          : selectedSlot
            ? 'Review request'
            : 'Choose time';

  const stickyAction = () => {
    if (!selectedService) {
      setStep('service');
      scrollToBook();
      return;
    }
    if (!date || step === 'date') {
      if (date) setStep('time');
      scrollToBook();
      return;
    }
    if (step === 'time' && selectedSlot) {
      setStep('review');
      scrollToBook();
      return;
    }
    if (step === 'review') {
      void submitRequest();
      return;
    }
    scrollToBook();
  };

  const stickyEnabled =
    stickyLabel === 'Book appointment' ||
    (stickyLabel === 'Choose time' && !!selectedService && (!!date || step === 'date')) ||
    (stickyLabel === 'Review request' && !!selectedSlot) ||
    (stickyLabel === 'Request appointment' && !!selectedSlot && !busy);

  const bookingPanel = (
    <div className="space-y-5" id="booking-panel">
      <div>
        <p className="eyebrow">Request an appointment</p>
        <div className="mt-2 flex gap-1.5 font-sans text-caption text-muted">
          {(['service', 'date', 'time', 'review'] as Step[]).map((s, i) => (
            <span
              key={s}
              className={
                'rounded-md px-2 py-0.5 ' +
                (step === s ? 'bg-teal text-white' : 'bg-subtle')
              }
            >
              {i + 1}. {s === 'service' ? 'Service' : s === 'date' ? 'Date' : s === 'time' ? 'Time' : 'Review'}
            </span>
          ))}
        </div>
      </div>

      {step === 'service' ? (
        <div>
          <h3 className="font-sans text-h3 font-semibold">Choose a service</h3>
          <div className="mt-2">
            {services.map((s) => (
              <ServiceRow
                key={s.id}
                service={s}
                selected={serviceId === s.id}
                actionLabel="Book"
                onSelect={() => selectService(s.id)}
              />
            ))}
            {!services.length ? (
              <p className="py-4 font-sans text-small text-muted">No services listed yet.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      {step === 'date' && selectedService ? (
        <div>
          <div className="mb-3 rounded-card bg-canvas px-3 py-2 font-sans text-small">
            <p className="font-semibold">{selectedService.name}</p>
            <p className="text-muted">
              {formatDuration(selectedService.duration_minutes)} ·{' '}
              {formatMoney(selectedService.price_cents)}
            </p>
          </div>
          <h3 className="font-sans text-h3 font-semibold">Choose a date</h3>
          <div className="mt-3">
            <DateSelector
              value={date}
              onChange={(ymd) => {
                setDate(ymd);
                setSelectedSlot(null);
              }}
              availableDates={availableDates}
              loadingDates={loadingDates}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep('service')}>
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!date}
              onClick={() => setStep('time')}
            >
              Continue
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'time' && selectedService ? (
        <div>
          <div className="mb-3 rounded-card bg-canvas px-3 py-2 font-sans text-small">
            <p className="font-semibold">{selectedService.name}</p>
            <p className="text-muted">{dayLabel || 'Select a date'}</p>
          </div>
          <h3 className="font-sans text-h3 font-semibold">Available times</h3>
          <div className="mt-3">
            <TimeSlotGrid
              slots={slots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
              loading={slotLoading}
              error={slotError}
              onRetry={loadSlots}
              emptyHint={
                date
                  ? 'There are no available times on this date.'
                  : 'Choose a date to see open times.'
              }
              onChooseAnotherDate={() => setStep('date')}
            />
            {error && step === 'time' ? (
              <div className="mt-3" role="alert" aria-live="assertive">
                <ErrorBanner
                  message={error}
                  onRetry={() => {
                    setError(null);
                    loadSlots();
                  }}
                />
              </div>
            ) : null}
          </div>
          <div className="mt-4 flex gap-2">
            <Button type="button" variant="ghost" onClick={() => setStep('date')}>
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={!selectedSlot}
              onClick={() => setStep('review')}
            >
              Review request
            </Button>
          </div>
        </div>
      ) : null}

      {step === 'review' && selectedService && selectedSlot ? (
        <div>
          <h3 className="font-sans text-h3 font-semibold">Review your request</h3>
          <dl className="mt-3 space-y-2 rounded-card bg-canvas px-4 py-3 font-sans text-small">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Provider</dt>
              <dd className="text-right font-medium">{title}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Service</dt>
              <dd className="text-right">{selectedService.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Date</dt>
              <dd className="text-right">{dayLabel}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Time</dt>
              <dd className="text-right">
                {new Date(selectedSlot).toLocaleTimeString(undefined, {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted">Duration</dt>
              <dd>{formatDuration(selectedService.duration_minutes)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border pt-2 font-semibold">
              <dt>Price</dt>
              <dd className="tabular-nums">{formatMoney(selectedService.price_cents)}</dd>
            </div>
          </dl>
          <p className="mt-3 font-sans text-caption text-muted">
            This sends a request. The provider must confirm before it becomes an appointment.
          </p>
          {user?.role === 'customer' || !user ? (
            <Button
              type="button"
              className="mt-4 w-full"
              loading={busy}
              onClick={() => void submitRequest()}
            >
              {busy ? 'Sending request…' : user ? 'Request appointment' : 'Sign in to request'}
            </Button>
          ) : (
            <p className="mt-4 font-sans text-small text-muted">
              Switch to a customer account to request an appointment.
            </p>
          )}
          <Button type="button" variant="ghost" className="mt-2 w-full" onClick={() => setStep('time')}>
            Back
          </Button>
          {error ? (
            <div className="mt-3" role="alert" aria-live="assertive">
              <ErrorBanner message={error} />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="animate-fadeUp pb-28 lg:pb-0">
      <div className="hidden sm:block">
        <Breadcrumb
          items={[
            { label: 'Explore', href: '/explore' },
            ...(tax
              ? [{ label: tax.title, href: '/categories/' + tax.slug }]
              : [{ label: taxonomyTitleForProviderCategory(provider.category), href: '/explore' }]),
            { label: title },
          ]}
        />
      </div>
      <Link href="/explore" className="font-sans text-small text-teal hover:underline sm:hidden">
        ← Explore
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-5 lg:items-start">
        <div
          className="aspect-[16/10] overflow-hidden rounded-card bg-subtle bg-cover bg-center lg:col-span-3 lg:aspect-[2/1]"
          style={{
            backgroundImage: provider.cover_url ? 'url(' + provider.cover_url + ')' : undefined,
          }}
        />
        <div className="lg:col-span-2">
          <div className="flex items-start gap-3">
            <Avatar name={title} src={provider.avatar_url} size="lg" />
            <div className="min-w-0">
              <h1 className="type-h1 text-[1.65rem] sm:text-h1">{title}</h1>
              <p className="mt-1 font-sans text-small text-muted">
                {taxonomyTitleForProviderCategory(provider.category)}
                {provider.city ? ' · ' + provider.city : ''}
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Rating average={stats?.average_rating} count={stats?.review_count} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={scrollToBook}>
              Book appointment
            </Button>
            <Button type="button" variant="secondary" onClick={onSave}>
              {saved ? 'Saved' : 'Save'}
            </Button>
            <Button type="button" variant="ghost" onClick={onCompare}>
              {inCompare ? 'Remove from compare' : 'Compare'}
            </Button>
          </div>
        </div>
      </div>

      {serviceDeepLinkMiss ? (
        <div className="mt-4" role="status">
          <ErrorBanner message="Service unavailable — this service is no longer listed. Choose another below." />
        </div>
      ) : null}

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <div className="space-y-10 lg:col-span-3">
          {provider.bio ? (
            <section>
              <h2 className="type-h2">About</h2>
              <p className="mt-3 font-sans text-body leading-relaxed text-ink/85">{provider.bio}</p>
              {provider.review_summary ? (
                <div className="mt-4 border-l-2 border-teal bg-canvas px-4 py-3">
                  <p className="eyebrow">Guest summary</p>
                  <p className="mt-2 font-sans text-small leading-relaxed">
                    {provider.review_summary}
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section>
            <h2 className="type-h2">Services</h2>
            <div className="mt-2">
              {services.map((s) => (
                <ServiceRow
                  key={s.id}
                  service={s}
                  selected={serviceId === s.id}
                  actionLabel="Book"
                  onSelect={() => selectService(s.id)}
                />
              ))}
              {!services.length ? (
                <p className="py-4 font-sans text-small text-muted">No services listed.</p>
              ) : null}
            </div>
          </section>

          <section>
            <h2 className="type-h2">Reviews</h2>
            {stats && stats.review_count > 0 ? (
              <div className="mt-4">
                <RatingBreakdown stats={stats} />
              </div>
            ) : null}
            {showStarFilters ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {(['all', 5, 4, 3, 2, 1] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setStarFilter(v)}
                    className={
                      'rounded-full border px-3 py-1 font-sans text-caption ' +
                      (starFilter === v
                        ? 'border-teal bg-teal text-white'
                        : 'border-border hover:border-teal')
                    }
                  >
                    {v === 'all' ? 'All' : v + ' ★'}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-2">
              {reviews.length === 0 ? (
                <EmptyState
                  title="No reviews yet"
                  description="Be the first to share your experience after a completed visit."
                />
              ) : filteredReviews.length === 0 ? (
                <p className="py-6 font-sans text-small text-muted">No reviews at this rating.</p>
              ) : (
                filteredReviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    canReply={isOwner}
                    onReplied={(updated) =>
                      setReviews((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                    }
                  />
                ))
              )}
            </div>
          </section>

          {provider.city ? (
            <section>
              <h2 className="type-h2">Location</h2>
              <p className="mt-2 font-sans text-small text-muted">{provider.city}</p>
            </section>
          ) : null}
        </div>

        <aside className="lg:col-span-2" ref={bookRef}>
          <div className="card sticky top-20 hidden p-5 lg:block">{bookingPanel}</div>
          <div className="card mt-2 p-5 lg:hidden">{bookingPanel}</div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 font-sans text-small">
            {selectedService ? (
              <>
                <p className="truncate font-semibold">{selectedService.name}</p>
                <p className="tabular-nums text-muted">
                  {formatMoney(selectedService.price_cents)}
                </p>
              </>
            ) : (
              <p className="text-muted">Select a service to continue</p>
            )}
          </div>
          <Button type="button" disabled={!stickyEnabled || busy} loading={busy} onClick={stickyAction}>
            {busy ? 'Sending request…' : stickyLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ProviderPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      }
    >
      <ProviderPageInner />
    </Suspense>
  );
}
