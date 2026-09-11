'use client';

import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { DateSelector } from '@/components/DateSelector';
import { ErrorBanner, Skeleton, SuccessBanner } from '@/components/EmptyState';
import { Textarea } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { StarRating } from '@/components/StarRating';
import { TimeSlotGrid } from '@/components/TimeSlotGrid';
import { useToast } from '@/components/Toast';
import {
  ApiError,
  createReview,
  formatDuration,
  formatMoney,
  formatWhen,
  getBooking,
  getProvider,
  listProviderReviews,
  listSlots,
  updateBooking,
} from '@/lib/api';
import { getStoredUser, getToken } from '@/lib/auth';
import { bookingDurationMinutes, statusHeadline } from '@/lib/bookingLifecycle';
import type { Booking, Review, Slot, User } from '@/lib/types';

type RescheduleStep = 'idle' | 'date' | 'time' | 'review';

function downloadIcs(booking: Booking) {
  const stamp = (iso: string) =>
    new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Ledger//Booking//EN',
    'BEGIN:VEVENT',
    'UID:' + booking.id + '@ledger.local',
    'DTSTAMP:' + stamp(new Date().toISOString()),
    'DTSTART:' + stamp(booking.start_time),
    'DTEND:' + stamp(booking.end_time),
    'SUMMARY:' + booking.service_name.replace(/[,;\\]/g, ' '),
    'DESCRIPTION:Ledger booking ' + booking.id + ' (' + booking.status + ')',
    'STATUS:' + (booking.status === 'confirmed' ? 'CONFIRMED' : 'TENTATIVE'),
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'ledger-' + booking.id.slice(0, 8) + '.ics';
  a.click();
  URL.revokeObjectURL(url);
}

function BookingTimeline({ booking }: { booking: Booking }) {
  const status = booking.status;

  if (status === 'cancelled') {
    return (
      <ol className="space-y-3 font-sans text-small" aria-label="Booking timeline">
        <TimelineItem done label="Appointment request sent" />
        <TimelineItem done label="Cancelled" detail="This appointment will not take place." />
      </ol>
    );
  }

  if (status === 'no_show') {
    return (
      <ol className="space-y-3 font-sans text-small" aria-label="Booking timeline">
        <TimelineItem done label="Appointment request sent" />
        <TimelineItem done label="Appointment confirmed" />
        <TimelineItem done label="Marked as no-show" />
      </ol>
    );
  }

  const pending = status === 'pending';
  const confirmed = status === 'confirmed';
  const completed = status === 'completed';

  return (
    <ol className="space-y-3 font-sans text-small" aria-label="Booking timeline">
      <TimelineItem done label="Appointment request sent" />
      <TimelineItem
        done={!pending}
        active={pending}
        label={pending ? 'Waiting for provider confirmation' : 'Provider responded'}
        detail={pending ? 'Your request is pending — not confirmed yet.' : undefined}
      />
      <TimelineItem
        done={confirmed || completed}
        active={confirmed}
        label="Appointment confirmed"
      />
      <TimelineItem
        done={completed}
        active={confirmed}
        label="Appointment takes place"
      />
      <TimelineItem done={completed} active={completed} label="Appointment completed" />
    </ol>
  );
}

function TimelineItem({
  label,
  detail,
  done,
  active,
}: {
  label: string;
  detail?: string;
  done?: boolean;
  active?: boolean;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-caption font-semibold ' +
          (done
            ? 'border-teal bg-teal text-white'
            : active
              ? 'border-teal text-teal'
              : 'border-border text-muted')
        }
        aria-hidden
      >
        {done ? '✓' : active ? '●' : '○'}
      </span>
      <div>
        <p className={done || active ? 'font-semibold text-ink' : 'text-muted'}>{label}</p>
        {detail ? <p className="mt-0.5 text-muted">{detail}</p> : null}
      </div>
    </li>
  );
}

function BookingDetailInner() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const requested = searchParams.get('requested') === '1';

  const [user, setUser] = useState<User | null>(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [providerName, setProviderName] = useState<string | null>(null);
  const [existingReview, setExistingReview] = useState<Review | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const [rescheduleStep, setRescheduleStep] = useState<RescheduleStep>('idle');
  const [date, setDate] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotLoading, setSlotLoading] = useState(false);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [availableDates, setAvailableDates] = useState<Set<string> | null>(null);
  const [loadingDates, setLoadingDates] = useState(false);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login?next=/bookings/' + params.id);
      return;
    }
    const u = getStoredUser();
    setUser(u);
    try {
      const b = await getBooking(params.id);
      setBooking(b);
      setNotFound(false);
      setError(null);
      try {
        const p = await getProvider(b.provider_id);
        setProviderName(p.business_name || p.full_name);
      } catch {
        setProviderName(null);
      }
      const reviews = await listProviderReviews(b.provider_id).catch(() => []);
      setExistingReview(reviews.find((r) => r.booking_id === b.id) || null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setBooking(null);
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't load booking.");
      }
    }
  }, [params.id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const duration = useMemo(
    () => (booking ? bookingDurationMinutes(booking) : 0),
    [booking],
  );

  function loadSlotsForDate(ymd: string, serviceId: string, providerId: string) {
    setSlotLoading(true);
    setSlotError(null);
    setSelectedSlot(null);
    listSlots(providerId, ymd, serviceId)
      .then(setSlots)
      .catch(() => {
        setSlots([]);
        setSlotError('Something went wrong while checking available times.');
      })
      .finally(() => setSlotLoading(false));
  }

  useEffect(() => {
    if (rescheduleStep === 'idle' || !booking?.service_id || !date) return;
    loadSlotsForDate(date, booking.service_id, booking.provider_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, rescheduleStep, booking?.service_id, booking?.provider_id]);

  useEffect(() => {
    if (rescheduleStep === 'idle' || !booking?.service_id) {
      setAvailableDates(null);
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
        listSlots(booking.provider_id, ymd, booking.service_id!)
          .then((s) => (s.length ? ymd : null))
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
  }, [rescheduleStep, booking?.provider_id, booking?.service_id]);

  async function onReview(e: FormEvent) {
    e.preventDefault();
    if (!booking || busy) return;
    setBusy(true);
    setError(null);
    try {
      const r = await createReview({
        booking_id: booking.id,
        rating,
        comment: comment || undefined,
      });
      setExistingReview(r);
      setMessage('Review saved. Thank you for sharing your experience.');
      toast('Review saved');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit review.');
    } finally {
      setBusy(false);
    }
  }

  async function confirmCancel() {
    if (!booking || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateBooking(booking.id, { status: 'cancelled' });
      setBooking(updated);
      setCancelOpen(false);
      setMessage('Appointment cancelled');
      toast('Appointment cancelled');
      setRescheduleStep('idle');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not cancel appointment.');
    } finally {
      setBusy(false);
    }
  }

  async function saveReschedule() {
    if (!booking || !selectedSlot || busy) return;
    setBusy(true);
    setError(null);
    const start = new Date(selectedSlot);
    const end = new Date(start.getTime() + duration * 60000);
    try {
      const updated = await updateBooking(booking.id, {
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      });
      setBooking(updated);
      setRescheduleStep('idle');
      setDate('');
      setSelectedSlot(null);
      setMessage('Appointment request updated. Still waiting for provider confirmation.');
      toast('Appointment request updated');
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || /overlap|conflict|available/i.test(err.message))) {
        setError('This time is no longer available. Choose another time.');
        setSelectedSlot(null);
        setRescheduleStep('time');
        if (date && booking.service_id) {
          loadSlotsForDate(date, booking.service_id, booking.provider_id);
        }
      } else {
        setError(err instanceof ApiError ? err.message : 'Could not update appointment.');
      }
    } finally {
      setBusy(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-lg animate-fadeUp py-10 text-center">
        <h1 className="type-h1">Booking not found</h1>
        <p className="mt-2 font-sans text-body text-muted">
          This appointment may have been removed or you don’t have access.
        </p>
        <Link href="/bookings" className="mt-6 inline-block">
          <Button>Back to bookings</Button>
        </Link>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="mx-auto max-w-4xl">
        <ErrorBanner message={error} onRetry={() => void load()} />
      </div>
    );
  }

  if (!booking || !user) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 animate-fadeUp">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const isCustomer = user.role === 'customer' && user.id === booking.customer_id;
  const canReview = isCustomer && booking.status === 'completed' && !existingReview;
  const canCancel = isCustomer && booking.status === 'pending';
  const canReschedule = isCustomer && booking.status === 'pending' && !!booking.service_id;
  const showContactForChange = isCustomer && booking.status === 'confirmed';
  const headline = statusHeadline(booking.status);
  const rebookHref = booking.service_id
    ? '/providers/' + booking.provider_id + '?service=' + booking.service_id
    : '/providers/' + booking.provider_id;

  const dayLabel = date
    ? new Date(date + 'T12:00:00').toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <div className="mx-auto max-w-4xl animate-fadeUp pb-28 sm:pb-8">
      <Link href="/bookings" className="font-sans text-small text-teal hover:underline">
        ← Bookings
      </Link>

      {requested && booking.status === 'pending' ? (
        <div className="mt-4" aria-live="polite">
          <SuccessBanner message="Request sent. Waiting for provider confirmation — not confirmed yet." />
        </div>
      ) : null}

      {message ? (
        <div className="mt-4" aria-live="polite">
          <SuccessBanner message={message} />
        </div>
      ) : null}

      <header className="mt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow">Appointment</p>
            <h1 className="type-h1 mt-1">{booking.service_name}</h1>
            {providerName ? (
              <p className="mt-2 font-sans text-body text-ink/85">{providerName}</p>
            ) : null}
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <div className="mt-4 rounded-card border border-border bg-canvas px-4 py-3">
          <p className="font-sans text-small font-semibold text-ink">{headline.title}</p>
          <p className="mt-1 font-sans text-small text-muted">{headline.detail}</p>
        </div>
      </header>

      <dl className="mt-6 grid gap-4 rounded-card border border-border bg-surface p-5 font-sans text-small sm:grid-cols-2">
        <div>
          <dt className="text-muted">When</dt>
          <dd className="mt-1 font-medium">{formatWhen(booking.start_time)}</dd>
        </div>
        <div>
          <dt className="text-muted">Duration</dt>
          <dd className="mt-1">{duration ? formatDuration(duration) : '—'}</dd>
        </div>
        <div>
          <dt className="text-muted">Price</dt>
          <dd className="mt-1 tabular-nums">{formatMoney(booking.price_cents)}</dd>
        </div>
        <div>
          <dt className="text-muted">Provider</dt>
          <dd className="mt-1">
            <Link href={'/providers/' + booking.provider_id} className="text-teal hover:underline">
              {providerName || 'View profile'}
            </Link>
          </dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="type-h2">Status</h2>
        <div className="mt-4">
          <BookingTimeline booking={booking} />
        </div>
      </section>

      {rescheduleStep !== 'idle' && canReschedule ? (
        <section className="mt-8 rounded-card border border-border bg-surface p-5" aria-live="polite">
          <h2 className="type-h2">Reschedule request</h2>
          <p className="mt-1 font-sans text-small text-muted">
            Current: {formatWhen(booking.start_time)}. Status stays pending after you save.
          </p>

          {rescheduleStep === 'date' ? (
            <div className="mt-4">
              <h3 className="font-sans text-small font-semibold">Choose a new date</h3>
              <div className="mt-3">
                <DateSelector
                  value={date}
                  onChange={setDate}
                  availableDates={availableDates}
                  loadingDates={loadingDates}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setRescheduleStep('idle')}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!date}
                  onClick={() => setRescheduleStep('time')}
                >
                  Continue
                </Button>
              </div>
            </div>
          ) : null}

          {rescheduleStep === 'time' ? (
            <div className="mt-4">
              <h3 className="font-sans text-small font-semibold">Choose a new time</h3>
              <p className="mt-1 font-sans text-caption text-muted">{dayLabel}</p>
              <div className="mt-3">
                <TimeSlotGrid
                  slots={slots}
                  selected={selectedSlot}
                  onSelect={setSelectedSlot}
                  loading={slotLoading}
                  error={slotError}
                  onRetry={() =>
                    booking.service_id &&
                    loadSlotsForDate(date, booking.service_id, booking.provider_id)
                  }
                  onChooseAnotherDate={() => setRescheduleStep('date')}
                />
              </div>
              <div className="mt-4 flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setRescheduleStep('date')}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  disabled={!selectedSlot}
                  onClick={() => setRescheduleStep('review')}
                >
                  Review change
                </Button>
              </div>
            </div>
          ) : null}

          {rescheduleStep === 'review' && selectedSlot ? (
            <div className="mt-4">
              <h3 className="font-sans text-small font-semibold">Review change</h3>
              <dl className="mt-3 space-y-2 rounded-card bg-canvas px-4 py-3 font-sans text-small">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Service</dt>
                  <dd>{booking.service_name}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">New time</dt>
                  <dd>{formatWhen(selectedSlot)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Duration</dt>
                  <dd>{formatDuration(duration)}</dd>
                </div>
              </dl>
              <div className="mt-4 flex gap-2">
                <Button type="button" variant="ghost" onClick={() => setRescheduleStep('time')}>
                  Back
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  loading={busy}
                  onClick={() => void saveReschedule()}
                >
                  {busy ? 'Saving changes…' : 'Save changes'}
                </Button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {existingReview ? (
        <section className="mt-8 rounded-card border border-border bg-surface p-5" id="review">
          <h2 className="type-h2">Your review</h2>
          <div className="mt-3">
            <StarRating value={existingReview.rating} readOnly />
            {existingReview.comment ? (
              <p className="mt-2 font-sans text-small leading-relaxed">{existingReview.comment}</p>
            ) : (
              <p className="mt-2 font-sans text-small text-muted">Rated without a written comment.</p>
            )}
            <p className="mt-2 font-sans text-caption text-muted">
              {new Date(existingReview.created_at).toLocaleDateString()}
            </p>
          </div>
        </section>
      ) : null}

      {canReview ? (
        <section className="mt-8 rounded-card border border-border bg-surface p-5" id="review">
          <h2 className="type-h2">How was your experience?</h2>
          <p className="mt-1 font-sans text-small text-muted">
            {formatWhen(booking.start_time)} · {booking.service_name}
          </p>
          <form onSubmit={onReview} className="mt-4 space-y-4">
            <div>
              <p className="mb-1 font-sans text-small">Rating</p>
              <StarRating value={rating} onChange={setRating} size="lg" />
            </div>
            <Textarea
              label="Tell us about your visit"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
            <Button type="submit" loading={busy}>
              Submit review
            </Button>
          </form>
        </section>
      ) : null}

      {showContactForChange ? (
        <p className="mt-8 rounded-card border border-border bg-canvas px-4 py-3 font-sans text-small text-muted">
          Need to change this appointment? Please contact the provider. Once confirmed, only the
          provider can cancel or complete the visit.
        </p>
      ) : null}

      {isCustomer && (booking.status === 'completed' || booking.status === 'cancelled') ? (
        <div className="mt-8">
          <Link href={rebookHref}>
            <Button className="w-full sm:w-auto">Book again</Button>
          </Link>
        </div>
      ) : null}

      <div className="mt-8 hidden flex-wrap gap-2 sm:flex">
        {(booking.status === 'pending' || booking.status === 'confirmed') && (
          <Button variant="secondary" onClick={() => downloadIcs(booking)}>
            Add to calendar
          </Button>
        )}
        <Link href={'/providers/' + booking.provider_id}>
          <Button variant="ghost">View provider</Button>
        </Link>
        {canReschedule && rescheduleStep === 'idle' ? (
          <Button
            variant="secondary"
            onClick={() => {
              setRescheduleStep('date');
              setError(null);
              setMessage(null);
            }}
          >
            Reschedule
          </Button>
        ) : null}
        {canCancel ? (
          <Button variant="danger" onClick={() => setCancelOpen(true)}>
            Cancel
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4" role="alert" aria-live="assertive">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      {/* Mobile sticky actions — sit above bottom nav */}
      {isCustomer && rescheduleStep === 'idle' ? (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur sm:hidden">
          <div className="flex flex-wrap gap-2">
            {canReschedule ? (
              <Button
                className="flex-1"
                variant="secondary"
                onClick={() => {
                  setRescheduleStep('date');
                  setError(null);
                }}
              >
                Reschedule
              </Button>
            ) : null}
            {canCancel ? (
              <Button className="flex-1" variant="danger" onClick={() => setCancelOpen(true)}>
                Cancel
              </Button>
            ) : null}
            {canReview ? (
              <a href="#review" className="flex-1">
                <Button className="w-full">Write a review</Button>
              </a>
            ) : null}
            {booking.status === 'completed' && existingReview ? (
              <Link href={rebookHref} className="flex-1">
                <Button className="w-full">Book again</Button>
              </Link>
            ) : null}
            {booking.status === 'confirmed' ? (
              <Link href={'/providers/' + booking.provider_id} className="flex-1">
                <Button className="w-full" variant="secondary">
                  View provider
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <Modal
        open={cancelOpen}
        title="Cancel appointment?"
        cancelLabel="Keep appointment"
        confirmLabel={busy ? 'Cancelling…' : 'Cancel appointment'}
        danger
        busy={busy}
        onClose={() => !busy && setCancelOpen(false)}
        onConfirm={() => void confirmCancel()}
      >
        Are you sure you want to cancel this appointment request? The provider will no longer see
        it as active.
      </Modal>
    </div>
  );
}

export default function BookingDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      }
    >
      <BookingDetailInner />
    </Suspense>
  );
}
