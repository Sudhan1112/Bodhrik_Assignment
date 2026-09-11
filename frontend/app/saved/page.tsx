'use client';

import { useEffect, useState } from 'react';
import { EmptyState, ErrorBanner } from '@/components/EmptyState';
import { ProviderCard, ProviderCardSkeleton } from '@/components/ProviderCard';
import { getProvider } from '@/lib/api';
import {
  getSavedProviderIds,
  onDiscoveryChange,
  pruneSavedProviders,
} from '@/lib/discoveryStorage';
import type { Provider } from '@/lib/types';

export default function SavedPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [removedCount, setRemovedCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    const ids = getSavedProviderIds();
    if (!ids.length) {
      setProviders([]);
      setRemovedCount(0);
      setLoading(false);
      return;
    }
    Promise.all(ids.map((id) => getProvider(id).then((p) => ({ id, p })).catch(() => ({ id, p: null }))))
      .then((rows) => {
        const ok = rows.filter((r) => r.p).map((r) => r.p!) as Provider[];
        const validIds = ok.map((p) => p.id);
        const missing = ids.length - validIds.length;
        if (missing > 0) {
          pruneSavedProviders(validIds);
        }
        setProviders(ok);
        setRemovedCount(missing);
      })
      .catch(() => setError("Couldn't load saved providers."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
    return onDiscoveryChange(load);
  }, []);

  return (
    <div className="animate-fadeUp">
      <p className="eyebrow">Saved</p>
      <h1 className="type-h1 mt-2">Saved providers</h1>
      <p className="mt-2 font-sans text-small text-muted">
        Providers you want to come back to. Saved on this device.
      </p>
      {removedCount > 0 ? (
        <p className="mt-3 font-sans text-caption text-muted" role="status">
          {removedCount} saved listing{removedCount === 1 ? ' was' : 's were'} no longer available
          and {removedCount === 1 ? 'has' : 'have'} been removed.
        </p>
      ) : null}
      {error ? (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={load} />
        </div>
      ) : null}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProviderCardSkeleton key={i} />
            ))}
          </div>
        ) : providers.length === 0 ? (
          <EmptyState
            title="No saved providers yet"
            description="Save providers from search or a profile to find them here later."
            actionHref="/explore"
            actionLabel="Explore providers"
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {providers.map((p) => (
              <ProviderCard key={p.id} provider={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
