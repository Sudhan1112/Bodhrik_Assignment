'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  ProviderBookingCard,
  ProviderBookingCardSkeleton,
} from '@/components/ProviderBookingCard';
import { ProviderSubnav } from '@/components/ProviderSubnav';
import { EmptyState, ErrorBanner, Skeleton } from '@/components/EmptyState';
import { ApiError, listBookings } from '@/lib/api';
import { useProviderSession } from '@/lib/useProviderSession';
import type { Booking } from '@/lib/types';

type Tab = 'requests' | 'upcoming' | 'past';

const TABS: { id: Tab; label: string }[] = [
  { id: 'requests', label: 'Requests' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'past', label: 'Past' },
];

const EMPTY: Record<Tab, { title: string; description: string }> = {
  requests: {
    title: 'No booking requests',
    description: 'Pending appointment requests will appear here.',
  },
  upcoming: {
    title: 'No upcoming appointments',
    description: 'Confirmed appointments will appear here.',
  },
  past: {
    title: 'No past appointments',
    description: 'Completed, cancelled, and no-show appointments will appear here.',
  },
};

function filterTab(bookings: Booking[], tab: Tab): Booking[] {
  const now = Date.now();
  if (tab === 'requests') {
    return bookings
      .filter((b) => b.status === 'pending')
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }
  if (tab === 'upcoming') {
    return bookings
      .filter(
        (b) => b.status === 'confirmed' && new Date(b.start_time).getTime() >= now,
      )
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }
  return bookings
    .filter(
      (b) =>
        b.status === 'completed' ||
        b.status === 'cancelled' ||
        b.status === 'no_show' ||
        (b.status === 'confirmed' && new Date(b.start_time).getTime() < now),
    )
    .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
}

function BookingsInner() {
  const { user, ready } = useProviderSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as Tab | null;
  const initial: Tab =
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'requests';

  const [tab, setTab] = useState<Tab>(initial);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setBookings(await listBookings());
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong loading bookings.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) setTab(tabParam);
  }, [tabParam]);

  function selectTab(next: Tab) {
    setTab(next);
    router.replace('/dashboard/bookings?tab=' + next, { scroll: false });
  }

  const filtered = useMemo(() => filterTab(bookings, tab), [bookings, tab]);

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <ProviderBookingCardSkeleton />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fadeUp pb-8">
      <ProviderSubnav />
      <h1 className="type-h1">Bookings</h1>
      <p className="mt-2 font-sans text-body text-muted">
        Review requests and manage your appointments.
      </p>

      <div
        className="mt-6 flex gap-1 overflow-x-auto border-b border-border pb-px"
        role="tablist"
        aria-label="Booking filters"
      >
        {TABS.map((t) => {
          const count = filterTab(bookings, t.id).length;
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => selectTab(t.id)}
              className={
                'shrink-0 border-b-2 px-3 py-2.5 font-sans text-small font-medium transition-colors duration-fast ' +
                (selected
                  ? 'border-teal text-ink'
                  : 'border-transparent text-muted hover:text-ink')
              }
            >
              {t.label}
              {!loading && count > 0 ? (
                <span className="ml-1.5 tabular-nums text-muted">({count})</span>
              ) : null}
            </button>
          );
        })}
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorBanner message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      <div className="mt-6 space-y-3" role="tabpanel">
        {loading ? (
          <>
            <ProviderBookingCardSkeleton />
            <ProviderBookingCardSkeleton />
            <ProviderBookingCardSkeleton />
          </>
        ) : filtered.length === 0 ? (
          <EmptyState title={EMPTY[tab].title} description={EMPTY[tab].description} />
        ) : (
          filtered.map((b) => <ProviderBookingCard key={b.id} booking={b} />)
        )}
      </div>
    </div>
  );
}

export default function ProviderBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl space-y-4">
          <Skeleton className="h-8 w-40" />
          <ProviderBookingCardSkeleton />
        </div>
      }
    >
      <BookingsInner />
    </Suspense>
  );
}
