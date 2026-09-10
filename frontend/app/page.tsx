'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { ProviderCard } from '@/components/ProviderCard';
import { Skeleton } from '@/components/EmptyState';
import { listProviders } from '@/lib/api';
import type { Provider } from '@/lib/types';

const HERO =
  'https://images.unsplash.com/photo-1521590832167-7bcbfaaae64f?w=2000&q=80';

export default function HomePage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProviders({ limit: 3 })
      .then((res) => setProviders(res.items))
      .catch(() => setProviders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <section className="relative min-h-[88vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: 'url(' + HERO + ')' }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/25" />
        <div className="relative mx-auto flex min-h-[88vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6">
          <p className="font-display text-5xl leading-none tracking-tight text-white sm:text-7xl animate-fadeUp">
            Ledger
          </p>
          <p className="mt-5 max-w-xl font-sans text-base leading-relaxed text-white/85 sm:text-lg">
            Book the providers people trust — real availability, clear prices, and reviews tied to
            visits that actually happened.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/explore">
              <Button size="lg" className="bg-white text-ink hover:bg-mist">
                Explore providers
              </Button>
            </Link>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="border-white/40 bg-transparent text-white hover:border-white hover:text-white">
                Create account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-3xl">Featured this week</h2>
            <p className="mt-2 font-sans text-sm text-muted">Live from the marketplace — not placeholders.</p>
          </div>
          <Link href="/explore" className="font-sans text-sm text-teal hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? [1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)
            : providers.map((p) => <ProviderCard key={p.id} provider={p} />)}
          {!loading && !providers.length ? (
            <p className="font-sans text-sm text-muted sm:col-span-3">
              No providers yet. Register as a provider to appear here.
            </p>
          ) : null}
        </div>
      </section>

      <section className="border-y border-border bg-white/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:grid-cols-3 sm:px-6">
          {[
            ['Browse with intent', 'Filter by category and rating. See photos, prices, and real guest scores.'],
            ['Book a real slot', 'Pick a service and an open time — no email ping-pong, no double booking.'],
            ['Review the visit', 'Stars unlock only after a completed booking, so trust stays honest.'],
          ].map(([t, d]) => (
            <div key={t}>
              <h3 className="font-display text-xl">{t}</h3>
              <p className="mt-2 font-sans text-sm leading-relaxed text-muted">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
