'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Button } from '@/components/Button';
import { EmptyState, ErrorBanner } from '@/components/EmptyState';
import { ProviderCard, ProviderCardSkeleton } from '@/components/ProviderCard';
import { listProviders } from '@/lib/api';
import { getTaxonomyBySlug } from '@/lib/taxonomy';
import type { Provider } from '@/lib/types';

export default function CategoryDetailPage() {
  const params = useParams<{ slug: string }>();
  const category = getTaxonomyBySlug(params.slug);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    if (!category) return;
    setLoading(true);
    setError(null);
    const type = category.providerTypes[0];
    listProviders({ category: type, limit: 48 })
      .then((res) => setProviders(res.items))
      .catch(() => setError("Couldn't load providers for this category."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.slug]);

  const serviceChips = useMemo(() => category?.popularServices || [], [category]);

  if (!category) {
    return (
      <EmptyState
        title="Category not found"
        description="That category isn't in Ledger yet."
        actionHref="/categories"
        actionLabel="Browse categories"
      />
    );
  }

  return (
    <div className="animate-fadeUp">
      <Breadcrumb
        items={[
          { label: 'Explore', href: '/explore' },
          { label: 'Categories', href: '/categories' },
          { label: category.title },
        ]}
      />
      <div
        className="mt-4 aspect-[3/1] overflow-hidden rounded-card bg-subtle bg-cover bg-center sm:aspect-[3.5/1]"
        style={{ backgroundImage: 'url(' + category.image + ')' }}
      />
      <h1 className="type-h1 mt-6">{category.title}</h1>
      <p className="mt-2 max-w-xl font-sans text-small text-muted">
        Find a provider for your next appointment. {category.description}.
      </p>

      {serviceChips.length ? (
        <div className="mt-6">
          <p className="font-sans text-caption font-semibold uppercase tracking-wide text-muted">
            Services
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {serviceChips.map((s) => (
              <Link
                key={s}
                href={
                  '/explore?q=' +
                  encodeURIComponent(s) +
                  '&category=' +
                  (category.providerTypes[0] || '')
                }
                className="rounded-full border border-border px-3 py-1.5 font-sans text-caption hover:border-teal hover:text-teal"
              >
                {s}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex items-end justify-between gap-3">
        <div>
          <h2 className="type-h2">Providers</h2>
          <p className="mt-1 font-sans text-small text-muted">
            {loading
              ? 'Loading…'
              : providers.length + ' provider' + (providers.length === 1 ? '' : 's')}
          </p>
        </div>
        <Link
          href={'/explore?category=' + (category.providerTypes[0] || '')}
        >
          <Button size="sm" variant="secondary">
            View all providers
          </Button>
        </Link>
      </div>

      {error ? (
        <div className="mt-4">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <ProviderCardSkeleton key={i} />)
          : providers.map((p) => <ProviderCard key={p.id} provider={p} />)}
      </div>

      {!loading && !providers.length && !error ? (
        <div className="mt-6">
          <EmptyState
            title="No providers in this category yet"
            description="Try another category or search across all providers."
            actionHref="/explore"
            actionLabel="Explore providers"
          />
        </div>
      ) : null}
    </div>
  );
}
