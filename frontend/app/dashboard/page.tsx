'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { EmptyState, Skeleton } from '@/components/EmptyState';
import { Input, Textarea } from '@/components/Input';
import {
  ApiError,
  createService,
  formatMoney,
  formatWhen,
  listBookings,
  replaceMyAvailability,
  summariseReviews,
  updateBooking,
} from '@/lib/api';
import { getStoredUser, getToken } from '@/lib/auth';
import type { Booking, User } from '@/lib/types';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [svcName, setSvcName] = useState('');
  const [svcMins, setSvcMins] = useState(60);
  const [svcPrice, setSvcPrice] = useState(50);
  const [svcDesc, setSvcDesc] = useState('');

  const load = useCallback(async () => {
    const u = getStoredUser();
    if (!getToken() || !u) {
      router.replace('/login');
      return;
    }
    setUser(u);
    try {
      setBookings(await listBookings());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

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
  const pending = useMemo(
    () => bookings.filter((b) => b.status === 'pending'),
    [bookings],
  );

  async function setStatus(
    id: string,
    status: 'confirmed' | 'completed' | 'cancelled' | 'no_show',
  ) {
    try {
      await updateBooking(id, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    }
  }

  async function onSummarise() {
    if (!user) return;
    try {
      const res = await summariseReviews(user.id);
      setMessage(
        'Summarisation queued (job ' +
          res.job_id.slice(0, 8) +
          '…) for ' +
          res.review_count +
          ' review(s).',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Summarise failed');
    }
  }

  async function onAddService(e: FormEvent) {
    e.preventDefault();
    try {
      await createService({
        name: svcName,
        duration_minutes: svcMins,
        price_cents: Math.round(svcPrice * 100),
        description: svcDesc || undefined,
      });
      setSvcName('');
      setSvcDesc('');
      setMessage('Service added.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add service');
    }
  }

  async function onDefaultHours() {
    try {
      const rules = [0, 1, 2, 3, 4].map((weekday) => ({
        weekday,
        start_time: '09:00:00',
        end_time: '17:00:00',
        is_active: true,
      }));
      await replaceMyAvailability(rules);
      setMessage('Weekday hours set to 9:00–17:00.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save hours');
    }
  }

  if (loading || !user) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl">Dashboard</h1>
          <p className="mt-1 font-sans text-sm text-muted">
            {user.full_name} · {user.role}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {user.role === 'customer' ? (
            <Link href="/explore">
              <Button>Find a provider</Button>
            </Link>
          ) : null}
          {user.role === 'provider' ? (
            <>
              <Link href={'/providers/' + user.id}>
                <Button variant="secondary">Public profile</Button>
              </Link>
              <Button variant="secondary" onClick={() => void onSummarise()}>
                Summarise reviews
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {message ? <p className="mt-4 font-sans text-sm text-sage">{message}</p> : null}
      {error ? <p className="mt-4 font-sans text-sm text-coral">{error}</p> : null}

      {user.role === 'provider' ? (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <form onSubmit={onAddService} className="panel space-y-3 p-5">
            <h2 className="font-display text-xl">Add a service</h2>
            <Input label="Name" required value={svcName} onChange={(e) => setSvcName(e.target.value)} />
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Duration (min)"
                type="number"
                min={5}
                value={svcMins}
                onChange={(e) => setSvcMins(Number(e.target.value))}
              />
              <Input
                label="Price ($)"
                type="number"
                min={0}
                step={0.01}
                value={svcPrice}
                onChange={(e) => setSvcPrice(Number(e.target.value))}
              />
            </div>
            <Textarea label="Description" rows={2} value={svcDesc} onChange={(e) => setSvcDesc(e.target.value)} />
            <Button type="submit">Save service</Button>
          </form>
          <div className="panel p-5">
            <h2 className="font-display text-xl">Availability</h2>
            <p className="mt-2 font-sans text-sm text-muted">
              Set weekday hours so customers see real open slots on your profile.
            </p>
            <Button className="mt-4" variant="secondary" onClick={() => void onDefaultHours()}>
              Apply Mon–Fri 9–5
            </Button>
            {pending.length ? (
              <p className="mt-6 font-sans text-sm text-amber-800">
                {pending.length} pending request{pending.length === 1 ? '' : 's'} need a decision.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <section className="mt-10">
        <h2 className="font-display text-2xl">Upcoming</h2>
        <div className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <EmptyState
              title="Nothing upcoming"
              description={
                user.role === 'customer'
                  ? 'Browse providers and book an open slot.'
                  : 'When customers request times, they will appear here.'
              }
              actionHref={user.role === 'customer' ? '/explore' : undefined}
              actionLabel={user.role === 'customer' ? 'Explore' : undefined}
            />
          ) : (
            upcoming.map((b) => (
              <AppointmentRow
                key={b.id}
                booking={b}
                user={user}
                onStatus={setStatus}
              />
            ))
          )}
        </div>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Past</h2>
        <div className="mt-4 space-y-3">
          {past.length === 0 ? (
            <p className="font-sans text-sm text-muted">No past bookings yet.</p>
          ) : (
            past.map((b) => (
              <AppointmentRow key={b.id} booking={b} user={user} onStatus={setStatus} />
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function AppointmentRow({
  booking,
  user,
  onStatus,
}: {
  booking: Booking;
  user: User;
  onStatus: (id: string, status: 'confirmed' | 'completed' | 'cancelled' | 'no_show') => void;
}) {
  return (
    <div className="panel flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <Link href={'/bookings/' + booking.id} className="min-w-0 flex-1 hover:opacity-80">
        <div className="flex flex-wrap items-center gap-2">
          <Badge status={booking.status} />
          <span className="font-sans text-xs text-muted">{formatWhen(booking.start_time)}</span>
        </div>
        <p className="mt-1 font-display text-lg">{booking.service_name}</p>
        <p className="font-sans text-sm text-muted tabular-nums">
          {formatMoney(booking.price_cents)}
        </p>
      </Link>
      <div className="flex flex-wrap gap-2">
        {user.role === 'customer' && booking.status === 'pending' ? (
          <Button size="sm" variant="danger" onClick={() => onStatus(booking.id, 'cancelled')}>
            Cancel
          </Button>
        ) : null}
        {(user.role === 'provider' || user.role === 'admin') && booking.status === 'pending' ? (
          <>
            <Button size="sm" onClick={() => onStatus(booking.id, 'confirmed')}>
              Confirm
            </Button>
            <Button size="sm" variant="danger" onClick={() => onStatus(booking.id, 'cancelled')}>
              Decline
            </Button>
          </>
        ) : null}
        {(user.role === 'provider' || user.role === 'admin') && booking.status === 'confirmed' ? (
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
  );
}
