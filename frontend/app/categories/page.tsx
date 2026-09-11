'use client';

import { useEffect, useMemo, useState } from 'react';
import { CategoryGrid } from '@/components/CategoryCard';
import { ErrorBanner, Skeleton } from '@/components/EmptyState';
import { listProviders } from '@/lib/api';
import { TAXONOMY } from '@/lib/taxonomy';
import type { Provider } from '@/lib/types';

export default function CategoriesPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    listProviders({ limit: 48 })
      .then((res) => setProviders(res.items))
      .catch(() => setError("Couldn't load categories."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const items = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of providers) {
      const c = (p.category || '').toLowerCase();
      counts[c] = (counts[c] || 0) + 1;
    }
    return TAXONOMY.map((category) => ({
      category,
      count: category.providerTypes.reduce((s, t) => s + (counts[t] || 0), 0) || undefined,
    }));
  }, [providers]);

  return (
    <div className="animate-fadeUp">
      <p className="eyebrow">Explore</p>
      <h1 className="type-h1 mt-2">Explore services</h1>
      <p className="mt-2 max-w-xl font-sans text-small text-muted">
        Find a provider for what you need.
      </p>
      {error ? (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      ) : null}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : (
          <CategoryGrid items={items} />
        )}
      </div>
    </div>
  );
}
