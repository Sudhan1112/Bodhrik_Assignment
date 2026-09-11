'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { ErrorBanner, Skeleton } from '@/components/EmptyState';
import { ProviderSubnav } from '@/components/ProviderSubnav';
import { Rating } from '@/components/StarRating';
import { ApiError, categoryLabel, getProvider, getReviewStats } from '@/lib/api';
import { useProviderSession } from '@/lib/useProviderSession';
import type { ProviderDetail, ReviewStats } from '@/lib/types';

export default function ProviderProfilePage() {
  const { user, ready } = useProviderSession();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [p, st] = await Promise.all([
        getProvider(user.id),
        getReviewStats(user.id).catch(() => null),
      ]);
      setProvider(p);
      setStats(st);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load profile.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const title = provider?.business_name || user.business_name || user.full_name;

  return (
    <div className="mx-auto max-w-5xl animate-fadeUp pb-8">
      <ProviderSubnav />
      <h1 className="type-h1">Profile</h1>
      <p className="mt-2 font-sans text-body text-muted">
        How customers see you on Ledger. Profile editing is not available through the current API.
      </p>

      {error ? (
        <div className="mt-4">
          <ErrorBanner message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      {loading || !provider ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
        <>
          <div className="mt-8 flex flex-wrap items-start gap-4 rounded-card border border-border bg-surface p-5">
            <Avatar name={title} src={provider.avatar_url} size="xl" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-2xl font-medium">{title}</h2>
              <p className="mt-1 font-sans text-small text-muted">
                {categoryLabel(provider.category)}
                {provider.city ? ' · ' + provider.city : ''}
              </p>
              <div className="mt-2">
                <Rating average={stats?.average_rating} count={stats?.review_count} />
              </div>
            </div>
          </div>

          <dl className="mt-6 divide-y divide-border rounded-card border border-border bg-surface font-sans text-small">
            <div className="px-4 py-3">
              <dt className="text-muted">Business name</dt>
              <dd className="mt-0.5">{provider.business_name || '—'}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-muted">Contact name</dt>
              <dd className="mt-0.5">{provider.full_name}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-muted">Category</dt>
              <dd className="mt-0.5">{categoryLabel(provider.category)}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-muted">City</dt>
              <dd className="mt-0.5">{provider.city || '—'}</dd>
            </div>
            <div className="px-4 py-3">
              <dt className="text-muted">About</dt>
              <dd className="mt-0.5 whitespace-pre-wrap leading-relaxed">
                {provider.bio || 'No bio on file.'}
              </dd>
            </div>
            {provider.review_summary ? (
              <div className="px-4 py-3">
                <dt className="text-muted">Guest summary</dt>
                <dd className="mt-0.5 leading-relaxed">{provider.review_summary}</dd>
              </div>
            ) : null}
          </dl>

          <p className="mt-4 rounded-card border border-border bg-canvas px-4 py-3 font-sans text-small text-muted">
            To change profile details, the backend would need a provider profile update endpoint.
            Registration fields are set at account creation.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={'/providers/' + user.id}>
              <Button>View public profile</Button>
            </Link>
            <Link href="/dashboard/services">
              <Button variant="secondary">Manage services</Button>
            </Link>
            <Link href="/dashboard/availability">
              <Button variant="ghost">Edit availability</Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
