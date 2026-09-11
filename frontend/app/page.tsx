'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { CategoryGrid } from '@/components/CategoryCard';
import { ErrorBanner, Skeleton } from '@/components/EmptyState';
import {
  ProviderCard,
  ProviderCardSkeleton,
  RecentlyViewedRow,
} from '@/components/ProviderCard';
import { MarketplaceSearch } from '@/components/SearchBar';
import { SearchOverlay } from '@/components/SearchOverlay';
import { getProvider, listProviders } from '@/lib/api';
import {
  getRecentlyViewedIds,
  onDiscoveryChange,
  pruneRecentlyViewed,
  pushRecentSearchAndNotify,
} from '@/lib/discoveryStorage';
import { popularSearchChips, TAXONOMY } from '@/lib/taxonomy';
import type { Provider } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recent, setRecent] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    listProviders({ limit: 48 })
      .then((res) => setProviders(res.items))
      .catch(() => {
        setProviders([]);
        setError("Couldn't load providers.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    function syncRecent() {
      const ids = getRecentlyViewedIds().slice(0, 8);
      if (!ids.length) {
        setRecent([]);
        return;
      }
      Promise.all(
        ids.map((id) => getProvider(id).then((p) => ({ id, p })).catch(() => ({ id, p: null }))),
      ).then((rows) => {
        const ok = rows.filter((r) => r.p).map((r) => r.p!) as Provider[];
        const validIds = ok.map((p) => p.id);
        if (validIds.length !== ids.length) {
          const remaining = getRecentlyViewedIds().filter((id) =>
            rows.some((r) => r.id === id && r.p),
          );
          pruneRecentlyViewed(remaining);
        }
        setRecent(ok.slice(0, 3));
      });
    }
    syncRecent();
    return onDiscoveryChange(syncRecent);
  }, []);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of providers) {
      const c = (p.category || '').toLowerCase();
      map[c] = (map[c] || 0) + 1;
    }
    return map;
  }, [providers]);

  const categoryItems = TAXONOMY.map((category) => ({
    category,
    count: category.providerTypes.reduce((sum, t) => sum + (counts[t] || 0), 0),
  }));

  const featured = useMemo(() => {
    const rated = [...providers]
      .filter((p) => (p.review_count || 0) > 0)
      .sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    return (rated.length ? rated : providers).slice(0, 3);
  }, [providers]);

  function goSearch(values: { what: string; where: string; when: string }) {
    const params = new URLSearchParams();
    if (values.what) params.set('q', values.what);
    if (values.where) params.set('city', values.where);
    if (values.when) params.set('date', values.when);
    pushRecentSearchAndNotify({
      what: values.what || values.where || 'Browse',
      where: values.where,
      when: values.when,
    });
    router.push('/explore' + (params.toString() ? '?' + params.toString() : ''));
  }

  return (
    <div className="animate-fadeUp space-y-12 sm:space-y-14">
      <section className="pt-1 sm:pt-2">
        <p className="eyebrow">Service marketplace</p>
        <h1 className="type-h1 mt-3 max-w-2xl text-[2rem] sm:text-display">
          Find the right service.
          <br />
          Book the right time.
        </h1>
        <p className="mt-3 max-w-xl font-sans text-body-lg text-muted">
          Discover providers, compare real reviews, and request appointments that fit your schedule.
        </p>
        <div className="mt-6">
          <MarketplaceSearch onSearch={goSearch} onFocusWhat={() => setSearchOpen(true)} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-sans text-caption text-muted">Try:</span>
          {popularSearchChips().map((chip) => (
            <Link
              key={chip.label + chip.href}
              href={chip.href}
              className="rounded-full border border-border bg-surface px-3 py-1 font-sans text-caption text-ink transition-colors duration-fast hover:border-teal hover:text-teal"
            >
              {chip.label}
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="type-h2">Explore by category</h2>
            <p className="mt-1 font-sans text-small text-muted">
              Start with the kind of visit you need.
            </p>
          </div>
          <Link href="/categories" className="font-sans text-small text-teal hover:underline">
            All categories
          </Link>
        </div>
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-52 w-full" />
            ))}
          </div>
        ) : (
          <CategoryGrid
            items={categoryItems.map(({ category, count }) => ({
              category,
              count: count > 0 ? count : undefined,
            }))}
          />
        )}
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-3">
          <div>
            <h2 className="type-h2">Top providers</h2>
            <p className="mt-1 font-sans text-small text-muted">
              Based on real ratings from completed visits.
            </p>
          </div>
          <Link href="/explore" className="font-sans text-small text-teal hover:underline">
            See all
          </Link>
        </div>
        {error ? <ErrorBanner message={error} onRetry={load} /> : null}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <ProviderCardSkeleton key={i} />)
            : featured.map((p) => <ProviderCard key={p.id} provider={p} />)}
        </div>
      </section>

      {recent.length ? <RecentlyViewedRow providers={recent} /> : null}

      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
