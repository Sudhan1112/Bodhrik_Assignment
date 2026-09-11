'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatMoney, listProviderServices } from '@/lib/api';
import {
  addCompareIdAndNotify,
  getCompareIds,
  isProviderSaved,
  onDiscoveryChange,
  toggleSavedProviderAndNotify,
} from '@/lib/discoveryStorage';
import { taxonomyTitleForProviderCategory } from '@/lib/taxonomy';
import type { Provider, Service } from '@/lib/types';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Rating } from './StarRating';
import { useToast } from './Toast';

export function ProviderCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="aspect-[16/10] animate-pulseSoft bg-subtle" />
      <div className="space-y-2 p-4">
        <div className="h-5 w-2/3 animate-pulseSoft rounded bg-subtle" />
        <div className="h-4 w-1/2 animate-pulseSoft rounded bg-subtle" />
        <div className="h-4 w-1/3 animate-pulseSoft rounded bg-subtle" />
      </div>
    </div>
  );
}

export function ProviderCard({
  provider,
  fromCents,
  enrichPrice = true,
}: {
  provider: Provider;
  fromCents?: number | null;
  enrichPrice?: boolean;
}) {
  const { toast } = useToast();
  const title = provider.business_name || provider.full_name;
  const [price, setPrice] = useState<number | null>(fromCents ?? null);
  const [saved, setSaved] = useState(false);
  const [inCompare, setInCompare] = useState(false);

  useEffect(() => {
    function sync() {
      setSaved(isProviderSaved(provider.id));
      setInCompare(getCompareIds().includes(provider.id));
    }
    sync();
    return onDiscoveryChange(sync);
  }, [provider.id]);

  useEffect(() => {
    if (fromCents != null) {
      setPrice(fromCents);
      return;
    }
    if (!enrichPrice) return;
    let cancelled = false;
    listProviderServices(provider.id)
      .then((services) => {
        if (cancelled || !services.length) return;
        setPrice(Math.min(...services.map((s) => s.price_cents)));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [provider.id, fromCents, enrichPrice]);

  function onSave(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const nowSaved = toggleSavedProviderAndNotify(provider.id);
    setSaved(nowSaved);
    toast(nowSaved ? 'Saved' : 'Removed from saved');
  }

  function onCompare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const r = addCompareIdAndNotify(provider.id, title);
    if (!r.ok) {
      toast(r.reason || 'Compare limit reached');
      return;
    }
    setInCompare(true);
    toast('Added to compare');
  }

  return (
    <article className="group card overflow-hidden transition-shadow duration-med hover:shadow-lift">
      <Link href={'/providers/' + provider.id} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-subtle">
          <div
            className="absolute inset-0 bg-cover bg-center transition-transform duration-med group-hover:scale-[1.03]"
            style={{
              backgroundImage: provider.cover_url
                ? 'url(' + provider.cover_url + ')'
                : undefined,
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
          <div className="absolute bottom-3 left-3">
            <Avatar name={title} src={provider.avatar_url} size="md" />
          </div>
        </div>
        <div className="p-4">
          <h3 className="font-sans text-h3 font-semibold text-ink transition-colors duration-fast group-hover:text-teal">
            {title}
          </h3>
          <p className="mt-1 font-sans text-small text-muted">
            {taxonomyTitleForProviderCategory(provider.category)}
            {provider.city ? ' · ' + provider.city : ''}
          </p>
          <div className="mt-2">
            <Rating average={provider.average_rating} count={provider.review_count} />
          </div>
          {provider.bio ? (
            <p className="mt-2 line-clamp-2 font-sans text-small text-ink/80">{provider.bio}</p>
          ) : null}
          {price != null ? (
            <p className="mt-3 font-sans text-small font-semibold tabular-nums">
              From {formatMoney(price)}
            </p>
          ) : null}
        </div>
      </Link>
      <div className="flex flex-wrap gap-2 border-t border-border px-4 py-3">
        <Link href={'/providers/' + provider.id} className="flex-1">
          <Button size="sm" className="w-full" variant="secondary">
            View profile
          </Button>
        </Link>
        <Button size="sm" variant={inCompare ? 'primary' : 'ghost'} onClick={onCompare}>
          Compare
        </Button>
        <Button size="sm" variant={saved ? 'primary' : 'ghost'} onClick={onSave}>
          {saved ? 'Saved' : 'Save'}
        </Button>
      </div>
    </article>
  );
}

export function ServiceRow({
  service,
  selected,
  onSelect,
  actionLabel = 'Select',
}: {
  service: Service;
  selected?: boolean;
  onSelect?: () => void;
  actionLabel?: string;
}) {
  return (
    <div
      className={
        'flex items-start justify-between gap-4 border-b border-border py-4 last:border-0 ' +
        (selected ? '-mx-3 rounded-card bg-teal-soft/50 px-3' : '')
      }
    >
      <div className="min-w-0">
        <p className="font-sans text-body font-semibold">{service.name}</p>
        {service.description ? (
          <p className="mt-1 font-sans text-small text-muted">{service.description}</p>
        ) : null}
        <p className="mt-2 font-sans text-small text-muted">
          {service.duration_minutes} min
          <span className="mx-1.5 text-border">·</span>
          <span className="font-semibold tabular-nums text-ink">
            {formatMoney(service.price_cents)}
          </span>
        </p>
      </div>
      {onSelect ? (
        <Button
          type="button"
          size="sm"
          variant={selected ? 'primary' : 'secondary'}
          onClick={onSelect}
        >
          {selected ? 'Selected' : actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

/** @deprecated */
export { ServiceRow as ServiceCard };

export function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-subtle px-2.5 py-1 font-sans text-caption text-ink transition-opacity duration-fast">
      {label}
      <button
        type="button"
        className="text-muted hover:text-ink"
        aria-label={'Remove ' + label}
        onClick={onRemove}
      >
        ×
      </button>
    </span>
  );
}

export function RecentlyViewedRow({ providers }: { providers: Provider[] }) {
  const router = useRouter();
  if (!providers.length) return null;
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="type-h2">Recently viewed</h2>
          <p className="mt-1 font-sans text-small text-muted">Pick up where you left off.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {providers.slice(0, 3).map((p) => (
          <button
            key={p.id}
            type="button"
            className="card flex items-center gap-3 p-3 text-left transition-shadow duration-fast hover:shadow-soft"
            onClick={() => router.push('/providers/' + p.id)}
          >
            <Avatar name={p.business_name || p.full_name} src={p.avatar_url} />
            <div className="min-w-0">
              <p className="truncate font-sans text-small font-semibold">
                {p.business_name || p.full_name}
              </p>
              <p className="truncate font-sans text-caption text-muted">
                {taxonomyTitleForProviderCategory(p.category)}
                {p.city ? ' · ' + p.city : ''}
              </p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
