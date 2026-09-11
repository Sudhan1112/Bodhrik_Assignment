'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/Button';
import { EmptyState, ErrorBanner, Skeleton } from '@/components/EmptyState';
import { Select } from '@/components/Input';
import { FilterChip, ProviderCard, ProviderCardSkeleton } from '@/components/ProviderCard';
import { MarketplaceSearch } from '@/components/SearchBar';
import { listProviderServices, listProviders } from '@/lib/api';
import { pushRecentSearchAndNotify } from '@/lib/discoveryStorage';
import { searchNeedles, TAXONOMY } from '@/lib/taxonomy';
import type { Provider } from '@/lib/types';

type SortKey = 'recommended' | 'rating' | 'reviews' | 'price_asc';

function providerMatchesNeedles(
  provider: Provider,
  serviceText: string,
  needles: string[],
): boolean {
  const hay = [
    provider.full_name,
    provider.business_name,
    provider.city,
    provider.bio,
    provider.category,
    serviceText,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return needles.some((n) => hay.includes(n));
}

function ExploreInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [city, setCity] = useState(searchParams.get('city') || '');
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [minRating, setMinRating] = useState<number | undefined>(
    searchParams.get('min_rating') ? Number(searchParams.get('min_rating')) : undefined,
  );
  const [priceMax, setPriceMax] = useState<number | undefined>(
    searchParams.get('price_max') ? Number(searchParams.get('price_max')) : undefined,
  );
  const [sort, setSort] = useState<SortKey>(
    (searchParams.get('sort') as SortKey) || 'recommended',
  );
  const [items, setItems] = useState<Provider[]>([]);
  const [priceMap, setPriceMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  function syncUrl(patch: {
    q?: string;
    city?: string;
    category?: string;
    min_rating?: number | null;
    price_max?: number | null;
    sort?: SortKey;
  }) {
    const qq = patch.q !== undefined ? patch.q : q;
    const cc = patch.city !== undefined ? patch.city : city;
    const cat = patch.category !== undefined ? patch.category : category;
    const mr = patch.min_rating !== undefined ? patch.min_rating : minRating;
    const pm = patch.price_max !== undefined ? patch.price_max : priceMax;
    const ss = patch.sort ?? sort;
    const params = new URLSearchParams();
    if (qq) params.set('q', qq);
    if (cc) params.set('city', cc);
    if (cat) params.set('category', cat);
    if (mr != null) params.set('min_rating', String(mr));
    if (pm != null) params.set('price_max', String(pm));
    if (ss && ss !== 'recommended') params.set('sort', ss);
    const date = searchParams.get('date');
    if (date) params.set('date', date);
    router.replace('/explore' + (params.toString() ? '?' + params.toString() : ''));
  }

  function load() {
    setLoading(true);
    setError(null);
    const needles = searchNeedles(q);
    // API `q` only matches provider fields — not services. Fetch by category/rating,
    // then match provider + service text client-side when a query is present.
    listProviders({
      category: category || undefined,
      min_rating: minRating,
      limit: 48,
    })
      .then(async (res) => {
        let list = res.items;
        if (city.trim()) {
          const c = city.trim().toLowerCase();
          list = list.filter((p) => (p.city || '').toLowerCase().includes(c));
        }
        const prices: Record<string, number> = {};
        const withServices = await Promise.all(
          list.map(async (p) => {
            try {
              const services = await listProviderServices(p.id);
              if (services.length) {
                prices[p.id] = Math.min(...services.map((s) => s.price_cents));
              }
              const serviceText = services
                .map((s) => s.name + ' ' + (s.description || ''))
                .join(' ');
              return { provider: p, serviceText };
            } catch {
              return { provider: p, serviceText: '' };
            }
          }),
        );
        if (needles.length) {
          list = withServices
            .filter((row) => providerMatchesNeedles(row.provider, row.serviceText, needles))
            .map((row) => row.provider);
        }
        setItems(list);
        setPriceMap(prices);
      })
      .catch(() => {
        setItems([]);
        setError("Couldn't load providers. Something went wrong while loading.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    const t = setTimeout(load, 160);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, city, category, minRating]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (priceMax != null) {
      list = list.filter((p) => priceMap[p.id] != null && priceMap[p.id] <= priceMax * 100);
    }
    if (sort === 'rating') {
      list.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    } else if (sort === 'reviews') {
      list.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    } else if (sort === 'price_asc') {
      list.sort((a, b) => (priceMap[a.id] ?? 1e12) - (priceMap[b.id] ?? 1e12));
    }
    return list;
  }, [items, priceMap, priceMax, sort]);

  const chips: Array<{ key: string; label: string; clear: () => void }> = [];
  if (category) {
    const tax = TAXONOMY.find((t) => t.providerTypes.includes(category));
    chips.push({
      key: 'cat',
      label: tax?.title || category,
      clear: () => {
        setCategory('');
        syncUrl({ category: '' });
      },
    });
  }
  if (city) {
    chips.push({
      key: 'city',
      label: city,
      clear: () => {
        setCity('');
        syncUrl({ city: '' });
      },
    });
  }
  if (minRating != null) {
    chips.push({
      key: 'rating',
      label: minRating + '+',
      clear: () => {
        setMinRating(undefined);
        syncUrl({ min_rating: null });
      },
    });
  }
  if (priceMax != null) {
    chips.push({
      key: 'price',
      label: '$' + priceMax,
      clear: () => {
        setPriceMax(undefined);
        syncUrl({ price_max: null });
      },
    });
  }

  function clearAll() {
    setQ('');
    setCity('');
    setCategory('');
    setMinRating(undefined);
    setPriceMax(undefined);
    setSort('recommended');
    router.replace('/explore');
  }

  const headline = [q, city].filter(Boolean).join(' · ') || 'Explore';

  const filtersBody = (
    <div className="space-y-5">
      <div>
        <p className="font-sans text-caption font-semibold uppercase tracking-wide text-muted">
          Category
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setCategory('');
              syncUrl({ category: '' });
            }}
            className={
              'rounded-full border px-3 py-1 font-sans text-caption ' +
              (!category ? 'border-teal bg-teal text-white' : 'border-border hover:border-teal')
            }
          >
            All
          </button>
          {TAXONOMY.map((t) => {
            const val = t.providerTypes[0];
            return (
              <button
                key={t.slug}
                type="button"
                onClick={() => {
                  setCategory(val);
                  syncUrl({ category: val });
                }}
                className={
                  'rounded-full border px-3 py-1 font-sans text-caption ' +
                  (category === val
                    ? 'border-teal bg-teal text-white'
                    : 'border-border hover:border-teal')
                }
              >
                {t.title}
              </button>
            );
          })}
        </div>
      </div>
      <Select
        label="Minimum rating"
        value={minRating ?? ''}
        onChange={(e) => {
          const v = e.target.value ? Number(e.target.value) : undefined;
          setMinRating(v);
          syncUrl({ min_rating: v ?? null });
        }}
      >
        <option value="">Any</option>
        <option value="4">4+</option>
        <option value="4.5">4.5+</option>
        <option value="5">5</option>
      </Select>
      <Select
        label="Maximum price"
        value={priceMax ?? ''}
        onChange={(e) => {
          const v = e.target.value ? Number(e.target.value) : undefined;
          setPriceMax(v);
          syncUrl({ price_max: v ?? null });
        }}
      >
        <option value="">Any</option>
        <option value="50">$50</option>
        <option value="100">$100</option>
        <option value="200">$200</option>
      </Select>
      {chips.length ? (
        <Button type="button" variant="ghost" size="sm" onClick={clearAll}>
          Clear all
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="animate-fadeUp pb-16">
      <p className="eyebrow">Explore</p>
      <h1 className="type-h1 mt-2">{headline}</h1>
      <p className="mt-1 font-sans text-small text-muted">
        {loading ? 'Loading…' : filtered.length + ' provider' + (filtered.length === 1 ? '' : 's')}
      </p>

      <div className="mt-5">
        <MarketplaceSearch
          compact
          initialWhat={q}
          initialWhere={city}
          initialWhen={searchParams.get('date') || ''}
          onSearch={({ what, where, when }) => {
            setQ(what);
            setCity(where);
            pushRecentSearchAndNotify({ what, where, when });
            const params = new URLSearchParams();
            if (what) params.set('q', what);
            if (where) params.set('city', where);
            if (when) params.set('date', when);
            if (category) params.set('category', category);
            if (minRating != null) params.set('min_rating', String(minRating));
            if (priceMax != null) params.set('price_max', String(priceMax));
            router.replace('/explore' + (params.toString() ? '?' + params.toString() : ''));
          }}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 lg:hidden">
        <Button type="button" variant="secondary" size="sm" onClick={() => setFiltersOpen(true)}>
          Filters{chips.length ? ' · ' + chips.length : ''}
        </Button>
        <Select
          aria-label="Sort"
          value={sort}
          onChange={(e) => {
            const v = e.target.value as SortKey;
            setSort(v);
            syncUrl({ sort: v });
          }}
          className="!mt-0 min-w-[10rem]"
        >
          <option value="recommended">Recommended</option>
          <option value="rating">Highest rated</option>
          <option value="reviews">Most reviewed</option>
          <option value="price_asc">Lowest price</option>
        </Select>
      </div>

      {chips.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="font-sans text-caption text-muted">
            {chips.length} filter{chips.length === 1 ? '' : 's'} applied
          </span>
          {chips.map((c) => (
            <FilterChip key={c.key} label={c.label} onRemove={c.clear} />
          ))}
          <button
            type="button"
            className="font-sans text-caption text-teal hover:underline"
            onClick={clearAll}
          >
            Clear all
          </button>
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[17rem_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 card p-4">{filtersBody}</div>
        </aside>
        <div>
          <div className="mb-4 hidden items-center justify-between lg:flex">
            <p className="font-sans text-small text-muted">
              {chips.length ? 'Filtered results' : 'Showing all matches'}
            </p>
            <Select
              aria-label="Sort"
              value={sort}
              onChange={(e) => {
                const v = e.target.value as SortKey;
                setSort(v);
                syncUrl({ sort: v });
              }}
              className="!mt-0 w-48"
            >
              <option value="recommended">Recommended</option>
              <option value="rating">Highest rated</option>
              <option value="reviews">Most reviewed</option>
              <option value="price_asc">Lowest price</option>
            </Select>
          </div>

          {error ? <ErrorBanner message={error} onRetry={load} /> : null}

          {loading ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProviderCardSkeleton key={i} />
              ))}
            </div>
          ) : filtered.length === 0 && !error ? (
            <EmptyState
              title="No providers found"
              description={
                q.trim()
                  ? 'No providers matched “' +
                    q.trim() +
                    '”. Try a service name like Cut or Blowout, pick Hair & Beauty alone, or clear filters.'
                  : 'Try another category, location, or fewer filters.'
              }
              actionLabel="Clear filters"
              onAction={clearAll}
            />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {filtered.map((p) => (
                <ProviderCard
                  key={p.id}
                  provider={p}
                  fromCents={priceMap[p.id]}
                  enrichPrice={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal aria-label="Filters">
          <button
            type="button"
            className="absolute inset-0 bg-ink/40"
            aria-label="Close filters"
            onClick={() => setFiltersOpen(false)}
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-surface p-5 shadow-menu animate-fadeUp">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-sans text-h3 font-semibold">Filters</h2>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFiltersOpen(false)}>
                Show results
              </Button>
            </div>
            {filtersBody}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ExplorePageClient() {
  return (
    <Suspense fallback={<Skeleton className="h-96 w-full" />}>
      <ExploreInner />
    </Suspense>
  );
}
