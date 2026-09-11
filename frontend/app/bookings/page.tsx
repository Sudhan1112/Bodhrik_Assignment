'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { BookingCard, BookingCardSkeleton } from '@/components/BookingCard';
import { EmptyState, ErrorBanner, Skeleton } from '@/components/EmptyState';
import { getProvider, listBookings, listProviderReviews, ApiError } from '@/lib/api';
import { getStoredUser, getToken } from '@/lib/auth';
import {
  filterBookingsByTab,
  type BookingTab,
} from '@/lib/bookingLifecycle';
import type { Booking, User } from '@/lib/types';

const TABS: { id: BookingTab; label: string }[] = [
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'pending', label: 'Pending' },
  { id: 'past', label: 'Past' },
  { id: 'cancelled', label: 'Cancelled' },
];

const EMPTY: Record<BookingTab, { title: string; description: string }> = {
  upcoming: {
    title: 'No upcoming appointments',
    description: 'Your confirmed appointments will appear here.',
  },
  pending: {
    title: 'No pending requests',
    description: 'Appointment requests waiting for provider confirmation will appear here.',
  },
  past: {
    title: 'No past appointments',
    description: 'Completed appointments will appear here.',
  },
  cancelled: {
    title: 'No cancelled appointments',
    description: 'Cancelled appointments will appear here.',
  },
};

function BookingsInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab') as BookingTab | null;
  const initialTab: BookingTab =
    tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : 'upcoming';

  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [providerNames, setProviderNames] = useState<Record<string, string>>({});
  const [reviewedIds, setReviewedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<BookingTab>(initialTab);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!getToken()) {
      router.replace('/login?next=/bookings');
      return;
    }
    const u = getStoredUser();
    if (!u) {
      router.replace('/login?next=/bookings');
      return;
    }
    if (u.role === 'provider' || u.role === 'admin') {
      router.replace('/dashboard');
      return;
    }
    setUser(u);
    setLoading(true);
    try {
      const list = await listBookings();
      setBookings(list);

      const ids = Array.from(new Set(list.map((b) => b.provider_id)));
      const names: Record<string, string> = {};
      await Promise.all(
        ids.map(async (id) => {
          try {
            const p = await getProvider(id);
            names[id] = p.business_name || p.full_name;
          } catch {
            names[id] = 'Provider';
          }
        }),
      );
      setProviderNames(names);

      const completed = list.filter((b) => b.status === 'completed');
      const reviewIds = new Set<string>();
      if (completed.length) {
        const providerIds = Array.from(new Set(completed.map((b) => b.provider_id)));
        const lists = await Promise.all(
          providerIds.map((id) => listProviderReviews(id).catch(() => [])),
        );
        for (const reviews of lists) {
          for (const r of reviews) {
            if (r.author_id === u.id) reviewIds.add(r.booking_id);
          }
        }
      }
      setReviewedIds(reviewIds);
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong loading your bookings.',
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (tabParam && TABS.some((t) => t.id === tabParam)) setTab(tabParam);
  }, [tabParam]);

  function selectTab(next: BookingTab) {
    setTab(next);
    router.replace('/bookings?tab=' + next, { scroll: false });
  }

  const filtered = useMemo(() => filterBookingsByTab(bookings, tab), [bookings, tab]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 animate-fadeUp">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72" />
        <div className="flex gap-2">
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
          <Skeleton className="h-9 w-24" />
        </div>
        <BookingCardSkeleton />
        <BookingCardSkeleton />
        <BookingCardSkeleton />
      </div>
    );
  }

  if (!user) return null;

  if (error && !bookings.length) {
    return (
      <div className="mx-auto max-w-4xl">
        <ErrorBanner message={error} onRetry={() => void load()} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl animate-fadeUp pb-8">
      <header>
        <h1 className="type-h1">Your bookings</h1>
        <p className="mt-2 font-sans text-body text-muted">
          Manage your appointments and requests.
        </p>
      </header>

      <div
        className="mt-6 flex gap-1 overflow-x-auto border-b border-border pb-px"
        role="tablist"
        aria-label="Booking filters"
      >
        {TABS.map((t) => {
          const count = filterBookingsByTab(bookings, t.id).length;
          const selected = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={'tab-' + t.id}
              onClick={() => selectTab(t.id)}
              className={
                'shrink-0 border-b-2 px-3 py-2.5 font-sans text-small font-medium transition-colors duration-fast ' +
                (selected
                  ? 'border-teal text-ink'
                  : 'border-transparent text-muted hover:text-ink')
              }
            >
              {t.label}
              {count > 0 ? (
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

      <div className="mt-6 space-y-3" role="tabpanel" aria-labelledby={'tab-' + tab}>
        {filtered.length === 0 ? (
          <EmptyState
            title={EMPTY[tab].title}
            description={EMPTY[tab].description}
            actionHref="/explore"
            actionLabel="Explore providers"
          />
        ) : (
          filtered.map((b) => (
            <BookingCard
              key={b.id}
              booking={b}
              user={user}
              providerName={providerNames[b.provider_id]}
              hasReview={reviewedIds.has(b.id)}
              showReviewCta={b.status === 'completed' && !reviewedIds.has(b.id)}
            />
          ))
        )}
      </div>

      <p className="mt-8 text-center font-sans text-small text-muted">
        Looking for someone new?{' '}
        <Link href="/explore" className="text-teal hover:underline">
          Explore providers
        </Link>
      </p>
    </div>
  );
}

export default function BookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-4xl space-y-4">
          <Skeleton className="h-8 w-48" />
          <BookingCardSkeleton />
        </div>
      }
    >
      <BookingsInner />
    </Suspense>
  );
}
