'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { StarRating } from '@/components/StarRating';
import { ApiError, getProvider, listProviderReviews } from '@/lib/api';
import { getStoredUser } from '@/lib/auth';
import type { ProviderDetail, Review, User } from '@/lib/types';

export default function ProviderPage() {
  const params = useParams<{ id: string }>();
  const [provider, setProvider] = useState<ProviderDetail | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
    async function load() {
      try {
        const [p, r] = await Promise.all([
          getProvider(params.id),
          listProviderReviews(params.id),
        ]);
        setProvider(p);
        setReviews(r);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Failed to load provider');
      }
    }
    void load();
  }, [params.id]);

  if (error) return <p className="font-sans text-sm text-clay">{error}</p>;
  if (!provider) return <p className="font-sans text-sm text-ink/70">Loading…</p>;

  return (
    <div>
      <h1 className="font-display text-3xl">
        {provider.business_name || provider.full_name}
      </h1>
      {provider.business_name ? (
        <p className="mt-1 font-sans text-sm text-ink/70">{provider.full_name}</p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {provider.average_rating != null ? (
          <>
            <StarRating value={Math.round(provider.average_rating)} readOnly size="sm" />
            <span className="font-sans text-sm tabular-nums">
              {provider.average_rating.toFixed(1)} · {provider.review_count} review
              {provider.review_count === 1 ? '' : 's'}
            </span>
          </>
        ) : (
          <span className="font-sans text-sm text-ink/60">No reviews yet</span>
        )}
      </div>

      {provider.bio ? (
        <p className="mt-6 max-w-2xl font-sans text-base leading-relaxed text-ink/85">
          {provider.bio}
        </p>
      ) : (
        <p className="mt-6 font-sans text-sm text-ink/60">No bio provided.</p>
      )}

      <div className="mt-8 border-t border-hairline pt-6">
        <h2 className="font-display text-xl">Book this provider</h2>
        <p className="mt-2 max-w-lg font-sans text-sm text-ink/75">
          Sign in as a customer and open your dashboard to request a time. Your booking starts
          as pending until the provider confirms.
        </p>
        {user?.role === 'customer' ? (
          <Link
            href="/dashboard"
            className="mt-4 inline-block bg-ink px-4 py-2 font-sans text-sm text-paper hover:bg-brass"
          >
            Go to dashboard
          </Link>
        ) : (
          <Link
            href="/register"
            className="mt-4 inline-block bg-ink px-4 py-2 font-sans text-sm text-paper hover:bg-brass"
          >
            Register as customer
          </Link>
        )}
      </div>

      <section className="mt-12">
        <h2 className="font-display text-xl">Reviews</h2>
        <div className="mt-4">
          {reviews.length === 0 ? (
            <p className="font-sans text-sm text-ink/60">No reviews yet.</p>
          ) : (
            reviews.map((r) => (
              <article key={r.id} className="ledger-rule py-4">
                <StarRating value={r.rating} readOnly size="sm" />
                {r.comment ? (
                  <p className="mt-2 font-sans text-sm leading-relaxed">{r.comment}</p>
                ) : null}
                {r.summary ? (
                  <p className="mt-2 font-sans text-sm text-ink/60">
                    <span className="text-ink/40">Summary · </span>
                    {r.summary}
                  </p>
                ) : null}
                <p className="mt-2 font-sans text-xs text-ink/45">
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
