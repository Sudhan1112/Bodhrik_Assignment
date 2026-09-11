'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { ErrorBanner, Skeleton, SuccessBanner } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { ProviderSubnav } from '@/components/ProviderSubnav';
import { useToast } from '@/components/Toast';
import {
  ApiError,
  formatDuration,
  formatMoney,
  formatWhen,
  getBooking,
  updateBooking,
} from '@/lib/api';
import { bookingDurationMinutes, statusHeadline } from '@/lib/bookingLifecycle';
import { useProviderSession } from '@/lib/useProviderSession';
import type { Booking, BookingStatus } from '@/lib/types';

function Timeline({ booking }: { booking: Booking }) {
  const s = booking.status;
  if (s === 'cancelled') {
    return (
      <ol className="space-y-3 font-sans text-small" aria-label="Timeline">
        <Item done label="Customer requested appointment" />
        <Item done label="Request cancelled" detail="Stored as cancelled in Ledger." />
      </ol>
    );
  }
  if (s === 'no_show') {
    return (
      <ol className="space-y-3 font-sans text-small" aria-label="Timeline">
        <Item done label="Customer requested appointment" />
        <Item done label="Appointment confirmed" />
        <Item done label="Marked as no-show" />
      </ol>
    );
  }
  return (
    <ol className="space-y-3 font-sans text-small" aria-label="Timeline">
      <Item done label="Customer requested appointment" />
      <Item
        done={s !== 'pending'}
        active={s === 'pending'}
        label={
          s === 'pending' ? 'Waiting for your decision' : 'You responded'
        }
        detail={
          s === 'pending'
            ? 'Confirm to accept, or decline to cancel this request.'
            : undefined
        }
      />
      <Item
        done={s === 'confirmed' || s === 'completed'}
        active={s === 'confirmed'}
        label="Appointment confirmed"
      />
      <Item done={s === 'completed'} active={s === 'confirmed'} label="Appointment takes place" />
      <Item done={s === 'completed'} active={s === 'completed'} label="Completed" />
    </ol>
  );
}

function Item({
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

export default function ProviderBookingDetailPage() {
  const params = useParams<{ id: string }>();
  const { user, ready } = useProviderSession();
  const { toast } = useToast();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [cancelConfirmedOpen, setCancelConfirmedOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const b = await getBooking(params.id);
      setBooking(b);
      setNotFound(false);
      setError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
        setBooking(null);
      } else {
        setError(err instanceof ApiError ? err.message : "Couldn't load booking.");
      }
    }
  }, [params.id]);

  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

  const duration = useMemo(
    () => (booking ? bookingDurationMinutes(booking) : 0),
    [booking],
  );

  async function mutate(status: BookingStatus, successMsg: string) {
    if (!booking || busy) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await updateBooking(booking.id, { status });
      setBooking(updated);
      setMessage(successMsg);
      toast(successMsg);
      setConfirmOpen(false);
      setDeclineOpen(false);
      setCompleteOpen(false);
      setNoShowOpen(false);
      setCancelConfirmedOpen(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed. Status unchanged.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl animate-fadeUp py-10 text-center">
        <ProviderSubnav />
        <h1 className="type-h1">Booking not found</h1>
        <p className="mt-2 font-sans text-muted">This appointment may no longer be available.</p>
        <Link href="/dashboard/bookings" className="mt-6 inline-block">
          <Button>Back to bookings</Button>
        </Link>
      </div>
    );
  }

  if (error && !booking) {
    return (
      <div className="mx-auto max-w-2xl">
        <ProviderSubnav />
        <ErrorBanner message={error} onRetry={() => void load()} />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const headline = statusHeadline(booking.status);
  const isPending = booking.status === 'pending';
  const isConfirmed = booking.status === 'confirmed';

  return (
    <div className="mx-auto max-w-2xl animate-fadeUp pb-28 sm:pb-8">
      <ProviderSubnav />
      <Link href="/dashboard/bookings" className="font-sans text-small text-teal hover:underline">
        ← Bookings
      </Link>

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
            <p className="mt-2 font-sans text-small text-muted">
              Customer · {booking.customer_id.slice(0, 8)}
            </p>
          </div>
          <StatusBadge status={booking.status} />
        </div>
        <div className="mt-4 rounded-card border border-border bg-canvas px-4 py-3">
          <p className="font-sans text-small font-semibold">{headline.title}</p>
          <p className="mt-1 font-sans text-small text-muted">{headline.detail}</p>
        </div>
      </header>

      <dl className="mt-6 grid gap-4 rounded-card border border-border bg-white p-5 font-sans text-small sm:grid-cols-2">
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
          <dt className="text-muted">Status</dt>
          <dd className="mt-1 capitalize">{booking.status.replace('_', ' ')}</dd>
        </div>
      </dl>

      <section className="mt-8">
        <h2 className="type-h2">Status</h2>
        <div className="mt-4">
          <Timeline booking={booking} />
        </div>
      </section>

      {error ? (
        <div className="mt-4" role="alert" aria-live="assertive">
          <ErrorBanner message={error} />
        </div>
      ) : null}

      <div className="mt-8 hidden flex-wrap gap-2 sm:flex">
        {isPending ? (
          <>
            <Button loading={busy} onClick={() => setConfirmOpen(true)}>
              Confirm appointment
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => setDeclineOpen(true)}>
              Decline request
            </Button>
          </>
        ) : null}
        {isConfirmed ? (
          <>
            <Button loading={busy} onClick={() => setCompleteOpen(true)}>
              Mark completed
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => setNoShowOpen(true)}>
              Mark no-show
            </Button>
            <Button variant="danger" disabled={busy} onClick={() => setCancelConfirmedOpen(true)}>
              Cancel appointment
            </Button>
          </>
        ) : null}
      </div>

      {(isPending || isConfirmed) && (
        <div className="fixed inset-x-0 bottom-16 z-20 border-t border-border bg-white/95 p-3 backdrop-blur sm:hidden">
          <div className="flex flex-wrap gap-2">
            {isPending ? (
              <>
                <Button className="flex-1" loading={busy} onClick={() => setConfirmOpen(true)}>
                  Confirm
                </Button>
                <Button
                  className="flex-1"
                  variant="danger"
                  disabled={busy}
                  onClick={() => setDeclineOpen(true)}
                >
                  Decline
                </Button>
              </>
            ) : null}
            {isConfirmed ? (
              <>
                <Button className="flex-1" loading={busy} onClick={() => setCompleteOpen(true)}>
                  Complete
                </Button>
                <Button
                  className="flex-1"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setNoShowOpen(true)}
                >
                  No-show
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}

      <Modal
        open={confirmOpen}
        title="Confirm appointment?"
        cancelLabel="Keep as pending"
        confirmLabel={busy ? 'Confirming…' : 'Confirm appointment'}
        busy={busy}
        onClose={() => !busy && setConfirmOpen(false)}
        onConfirm={() => void mutate('confirmed', 'Appointment confirmed')}
      >
        This will confirm the customer&apos;s request for {formatWhen(booking.start_time)}.
      </Modal>

      <Modal
        open={declineOpen}
        title="Decline this appointment request?"
        cancelLabel="Keep request"
        confirmLabel={busy ? 'Declining…' : 'Decline request'}
        danger
        busy={busy}
        onClose={() => !busy && setDeclineOpen(false)}
        onConfirm={() =>
          void mutate(
            'cancelled',
            'Request declined. Status is stored as cancelled.',
          )
        }
      >
        The booking will be marked cancelled. Ledger does not use a separate declined status.
      </Modal>

      <Modal
        open={completeOpen}
        title="Mark as completed?"
        cancelLabel="Not yet"
        confirmLabel={busy ? 'Saving…' : 'Mark completed'}
        busy={busy}
        onClose={() => !busy && setCompleteOpen(false)}
        onConfirm={() => void mutate('completed', 'Appointment marked completed')}
      >
        The customer will be able to leave a review after completion.
      </Modal>

      <Modal
        open={noShowOpen}
        title="Mark as no-show?"
        cancelLabel="Cancel"
        confirmLabel={busy ? 'Saving…' : 'Mark no-show'}
        danger
        busy={busy}
        onClose={() => !busy && setNoShowOpen(false)}
        onConfirm={() => void mutate('no_show', 'Marked as no-show')}
      >
        Use this only if the customer did not attend.
      </Modal>

      <Modal
        open={cancelConfirmedOpen}
        title="Cancel this appointment?"
        cancelLabel="Keep appointment"
        confirmLabel={busy ? 'Cancelling…' : 'Cancel appointment'}
        danger
        busy={busy}
        onClose={() => !busy && setCancelConfirmedOpen(false)}
        onConfirm={() => void mutate('cancelled', 'Appointment cancelled')}
      >
        The customer will see this booking as cancelled.
      </Modal>
    </div>
  );
}
