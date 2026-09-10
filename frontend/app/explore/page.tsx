'use client';

import { useEffect, useState } from 'react';
import { ProviderCard } from '@/components/ProviderCard';
import { EmptyState, Skeleton } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { listProviders } from '@/lib/api';
import type { Provider } from '@/lib/types';

const CATEGORIES = [
  { id: '', label: 'All' },
  { id: 'salon', label: 'Salon' },
  { id: 'clinic', label: 'Clinic' },
  { id: 'consulting', label: 'Consulting' },
];

export default function ExplorePage() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [minRating, setMinRating] = useState<number | undefined>();
  const [items, setItems] = useState<Provider[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      listProviders({
        q: q || undefined,
        category: category || undefined,
        min_rating: minRating,
        limit: 24,
      })
        .then((res) => {
          setItems(res.items);
          setTotal(res.total);
        })
        .catch(() => {
          setItems([]);
          setTotal(0);
        })
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [q, category, minRating]);

  return (
    <div className="animate-fadeUp">
      <h1 className="font-display text-4xl">Explore</h1>
      <p className="mt-2 font-sans text-sm text-muted">
        Find a provider by craft, city, or guest rating.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            label="Search"
            placeholder="Name, city, or keyword"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.id || 'all'}
              type="button"
              onClick={() => setCategory(c.id)}
              className={
                'rounded-full px-4 py-2 font-sans text-sm ' +
                (category === c.id ? 'bg-ink text-white' : 'border border-border bg-white text-muted')
              }
            >
              {c.label}
            </button>
          ))}
        </div>
        <select
          className="rounded-xl border border-border bg-white px-3 py-2.5 font-sans text-sm"
          value={minRating ?? ''}
          onChange={(e) =>
            setMinRating(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">Any rating</option>
          <option value="4">4+ stars</option>
          <option value="4.5">4.5+ stars</option>
        </select>
      </div>

      <p className="mt-6 font-sans text-xs text-muted">{total} provider{total === 1 ? '' : 's'}</p>

      <div className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? [1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-64" />)
          : items.map((p) => <ProviderCard key={p.id} provider={p} />)}
      </div>

      {!loading && !items.length ? (
        <div className="mt-8">
          <EmptyState
            title="No matches"
            description="Try another category or clear your filters."
            actionHref="/explore"
            actionLabel="Reset explore"
          />
        </div>
      ) : null}
    </div>
  );
}
