'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { EmptyState, ErrorBanner, Skeleton } from '@/components/EmptyState';
import { Rating } from '@/components/StarRating';
import { formatMoney, getProvider, listProviderServices } from '@/lib/api';
import {
  clearCompareAndNotify,
  getCompareItems,
  onDiscoveryChange,
  removeCompareIdAndNotify,
  type CompareItem,
} from '@/lib/discoveryStorage';
import { taxonomyTitleForProviderCategory } from '@/lib/taxonomy';
import type { Provider, Service } from '@/lib/types';

type Row = {
  item: CompareItem;
  provider: Provider | null;
  services: Service[];
  fromCents: number | null;
};

export default function ComparePage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    const items = getCompareItems();
    if (!items.length) {
      setRows([]);
      setLoading(false);
      return;
    }
    Promise.all(
      items.map(async (item) => {
        try {
          const provider = await getProvider(item.id);
          const services = await listProviderServices(item.id).catch(() => []);
          const fromCents = services.length
            ? Math.min(...services.map((s) => s.price_cents))
            : null;
          return { item, provider, services, fromCents };
        } catch {
          return { item, provider: null, services: [], fromCents: null };
        }
      }),
    )
      .then(setRows)
      .catch(() => setError("Couldn't load comparison."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    return onDiscoveryChange(load);
  }, []);

  if (!loading && !rows.length) {
    return (
      <div className="animate-fadeUp">
        <h1 className="type-h1">Compare</h1>
        <div className="mt-8">
          <EmptyState
            title="No providers selected"
            description="Add up to 3 providers from search results to compare them side by side."
            actionHref="/explore"
            actionLabel="Explore providers"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeUp">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Compare</p>
          <h1 className="type-h1 mt-2">Compare providers</h1>
          <p className="mt-2 font-sans text-small text-muted">
            Side-by-side fields from real listing data only.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => clearCompareAndNotify()}>
          Clear all
        </Button>
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">
          {rows.map((row) => {
            const p = row.provider;
            const title = p ? p.business_name || p.full_name : row.item.label;
            return (
              <article
                key={row.item.id}
                className="card w-[16.5rem] shrink-0 p-4 sm:w-auto lg:w-auto"
              >
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-sans text-h3 font-semibold">{title}</h2>
                  <button
                    type="button"
                    className="text-muted hover:text-ink"
                    aria-label="Remove"
                    onClick={() => removeCompareIdAndNotify(row.item.id)}
                  >
                    ×
                  </button>
                </div>
                {p ? (
                  <>
                    <p className="mt-1 font-sans text-small text-muted">
                      {taxonomyTitleForProviderCategory(p.category)}
                      {p.city ? ' · ' + p.city : ''}
                    </p>
                    <div className="mt-3">
                      <Rating average={p.average_rating} count={p.review_count} />
                    </div>
                    <p className="mt-3 font-sans text-small">
                      <span className="text-muted">From </span>
                      <span className="font-semibold tabular-nums">
                        {formatMoney(row.fromCents)}
                      </span>
                    </p>
                    <div className="mt-4 border-t border-border pt-3">
                      <p className="font-sans text-caption font-semibold uppercase text-muted">
                        Services
                      </p>
                      <ul className="mt-2 space-y-1 font-sans text-small">
                        {row.services.slice(0, 4).map((s) => (
                          <li key={s.id} className="flex justify-between gap-2">
                            <span className="truncate">{s.name}</span>
                            <span className="tabular-nums text-muted">
                              {formatMoney(s.price_cents)}
                            </span>
                          </li>
                        ))}
                        {!row.services.length ? (
                          <li className="text-muted">No services listed</li>
                        ) : null}
                      </ul>
                    </div>
                    <Link href={'/providers/' + p.id} className="mt-4 block">
                      <Button className="w-full" size="sm">
                        View profile
                      </Button>
                    </Link>
                  </>
                ) : (
                  <p className="mt-3 font-sans text-small text-muted">Provider unavailable.</p>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
