'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { LedgerRow } from '@/components/LedgerRow';
import {
  ApiError,
  createBooking,
  listBookings,
  listProviders,
  summariseReviews,
  updateBooking,
} from '@/lib/api';
import { getStoredUser, getToken } from '@/lib/auth';
import type { Booking, Provider, User } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [providerId, setProviderId] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    const u = getStoredUser();
    if (!getToken() || !u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    try {
      const [b, p] = await Promise.all([listBookings(), listProviders()]);
      setBookings(b);
      setProviders(p);
      if (p.length && !providerId) setProviderId(p[0].id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    }
  }, [router, providerId]);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      bookings.filter(
        (b) => new Date(b.start_time).getTime() >= now && b.status !== 'cancelled',
      ),
    [bookings, now],
  );
  const past = useMemo(
    () =>
      bookings.filter(
        (b) => new Date(b.start_time).getTime() < now || b.status === 'cancelled',
      ),
    [bookings, now],
  );

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await createBooking({
        provider_id: providerId,
        service_name: serviceName,
        start_time: new Date(startLocal).toISOString(),
        end_time: new Date(endLocal).toISOString(),
        notes: notes || undefined,
      });
      setServiceName('');
      setNotes('');
      await load();
      setMessage('Booking requested.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not create booking');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(
    id: string,
    status: 'confirmed' | 'completed' | 'cancelled' | 'no_show',
  ) {
    setError(null);
    try {
      await updateBooking(id, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    }
  }

  async function onSummarise() {
    if (!user) return;
    setMessage(null);
    setError(null);
    try {
      const res = await summariseReviews(user.id);
      setMessage(
        `Summarisation queued (job ${res.job_id.slice(0, 8)}…) for ${res.review_count} review(s).`,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Summarise failed');
    }
  }

  if (!user) {
    return <p className="font-sans text-sm text-ink/70">Loading…</p>;
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-6">
        <div>
          <h1 className="font-display text-3xl">Dashboard</h1>
          <p className="mt-1 font-sans text-sm text-ink/70">
            Signed in as {user.full_name} · {user.role}
          </p>
        </div>
        {user.role === 'provider' ? (
          <button
            type="button"
            onClick={() => void onSummarise()}
            className="border border-ink px-4 py-2 font-sans text-sm hover:border-brass hover:text-brass"
          >
            Summarise reviews
          </button>
        ) : null}
      </div>

      {message ? <p className="mt-4 font-sans text-sm text-sage">{message}</p> : null}
      {error ? <p className="mt-4 font-sans text-sm text-clay">{error}</p> : null}

      {user.role === 'customer' ? (
        <section className="mt-8 border-b border-hairline pb-10">
          <h2 className="font-display text-xl">New booking</h2>
          <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block font-sans text-sm sm:col-span-2">
              Provider
              <select
                required
                value={providerId}
                onChange={(e) => setProviderId(e.target.value)}
                className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.business_name || p.full_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block font-sans text-sm sm:col-span-2">
              Service
              <input
                required
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
              />
            </label>
            <label className="block font-sans text-sm">
              Starts
              <input
                type="datetime-local"
                required
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
                className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
              />
            </label>
            <label className="block font-sans text-sm">
              Ends
              <input
                type="datetime-local"
                required
                value={endLocal}
                onChange={(e) => setEndLocal(e.target.value)}
                className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
              />
            </label>
            <label className="block font-sans text-sm sm:col-span-2">
              Notes
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
              />
            </label>
            <button
              type="submit"
              disabled={busy || !providers.length}
              className="bg-ink px-4 py-2 font-sans text-sm text-paper hover:bg-brass disabled:opacity-60 sm:col-span-2"
            >
              Request booking
            </button>
          </form>
          {!providers.length ? (
            <p className="mt-2 font-sans text-sm text-ink/60">No providers registered yet.</p>
          ) : null}
        </section>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-xl">Upcoming</h2>
        <div className="mt-4">
          {upcoming.length === 0 ? (
            <p className="font-sans text-sm text-ink/60">No upcoming bookings.</p>
          ) : (
            upcoming.map((b) => (
              <div key={b.id}>
                <LedgerRow
                  booking={b}
                  href={`/bookings/${b.id}`}
                  trailing={
                    user.role === 'provider' || user.role === 'admin' ? (
                      <Actions booking={b} onStatus={setStatus} />
                    ) : user.role === 'customer' && b.status === 'pending' ? (
                      <button
                        type="button"
                        className="font-sans text-xs text-clay underline-offset-2 hover:underline"
                        onClick={(e) => {
                          e.preventDefault();
                          void setStatus(b.id, 'cancelled');
                        }}
                      >
                        Cancel
                      </button>
                    ) : null
                  }
                />
              </div>
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-xl">Past</h2>
        <div className="mt-4">
          {past.length === 0 ? (
            <p className="font-sans text-sm text-ink/60">No past bookings.</p>
          ) : (
            past.map((b) => <LedgerRow key={b.id} booking={b} href={`/bookings/${b.id}`} />)
          )}
        </div>
      </section>

      {user.role === 'provider' ? (
        <p className="mt-8 font-sans text-sm text-ink/60">
          Public profile:{' '}
          <Link
            href={`/providers/${user.id}`}
            className="text-brass underline-offset-2 hover:underline"
          >
            View your provider page
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function Actions({
  booking,
  onStatus,
}: {
  booking: Booking;
  onStatus: (id: string, status: 'confirmed' | 'completed' | 'cancelled' | 'no_show') => void;
}) {
  return (
    <div className="flex flex-col gap-1 text-right">
      {booking.status === 'pending' ? (
        <>
          <button
            type="button"
            className="font-sans text-xs text-sage underline-offset-2 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onStatus(booking.id, 'confirmed');
            }}
          >
            Confirm
          </button>
          <button
            type="button"
            className="font-sans text-xs text-clay underline-offset-2 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onStatus(booking.id, 'cancelled');
            }}
          >
            Cancel
          </button>
        </>
      ) : null}
      {booking.status === 'confirmed' ? (
        <>
          <button
            type="button"
            className="font-sans text-xs text-sage underline-offset-2 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onStatus(booking.id, 'completed');
            }}
          >
            Complete
          </button>
          <button
            type="button"
            className="font-sans text-xs text-clay underline-offset-2 hover:underline"
            onClick={(e) => {
              e.preventDefault();
              onStatus(booking.id, 'no_show');
            }}
          >
            No-show
          </button>
        </>
      ) : null}
    </div>
  );
}
