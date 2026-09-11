'use client';

import { useCallback, useEffect, useState } from 'react';
import { EmptyState, ErrorBanner, Skeleton, SuccessBanner } from '@/components/EmptyState';
import { ProviderSubnav } from '@/components/ProviderSubnav';
import { RatingBreakdown } from '@/components/RatingBreakdown';
import { ReviewCard } from '@/components/ReviewCard';
import { Button } from '@/components/Button';
import {
  ApiError,
  getReviewStats,
  listProviderReviews,
  summariseReviews,
} from '@/lib/api';
import { useProviderSession } from '@/lib/useProviderSession';
import type { Review, ReviewStats } from '@/lib/types';

export default function ProviderReviewsPage() {
  const { user, ready } = useProviderSession();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [revs, st] = await Promise.all([
        listProviderReviews(user.id),
        getReviewStats(user.id),
      ]);
      setReviews(revs);
      setStats(st);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong loading reviews.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

  async function onSummarise() {
    if (!user || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await summariseReviews(user.id);
      setMessage(
        'Summarisation queued (job ' +
          res.job_id.slice(0, 8) +
          '…) for ' +
          res.review_count +
          ' review(s).',
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not queue summarisation.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl animate-fadeUp pb-8">
      <ProviderSubnav />
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="type-h1">Reviews</h1>
          <p className="mt-2 font-sans text-body text-muted">
            Feedback from completed customer visits.
          </p>
        </div>
        {reviews.length > 0 ? (
          <Button variant="secondary" size="sm" loading={busy} onClick={() => void onSummarise()}>
            Summarise reviews
          </Button>
        ) : null}
      </div>

      {message ? (
        <div className="mt-4" aria-live="polite">
          <SuccessBanner message={message} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <ErrorBanner message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <>
          {stats && stats.review_count > 0 ? (
            <div className="mt-8">
              <RatingBreakdown stats={stats} />
            </div>
          ) : null}

          <div className="mt-6">
            {reviews.length === 0 ? (
              <EmptyState
                title="No reviews yet"
                description="Your reviews will appear here after completed appointments."
              />
            ) : (
              reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  canReply
                  onReplied={(updated) =>
                    setReviews((prev) => prev.map((x) => (x.id === updated.id ? updated : x)))
                  }
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
