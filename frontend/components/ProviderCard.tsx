import Link from 'next/link';
import { categoryLabel, formatDuration, formatMoney } from '@/lib/api';
import type { Provider, Service } from '@/lib/types';
import { StarRating } from './StarRating';

export function ProviderCard({ provider }: { provider: Provider }) {
  const title = provider.business_name || provider.full_name;
  return (
    <Link
      href={'/providers/' + provider.id}
      className="group panel overflow-hidden transition-shadow hover:shadow-lift animate-fadeUp"
    >
      <div
        className="h-36 bg-mist bg-cover bg-center"
        style={{
          backgroundImage: provider.cover_url ? 'url(' + provider.cover_url + ')' : undefined,
        }}
      />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className="h-12 w-12 shrink-0 rounded-full bg-border bg-cover bg-center ring-2 ring-white"
            style={{
              backgroundImage: provider.avatar_url
                ? 'url(' + provider.avatar_url + ')'
                : undefined,
              marginTop: '-2rem',
            }}
          />
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate font-display text-lg group-hover:text-teal">{title}</p>
            <p className="font-sans text-xs text-muted">
              {categoryLabel(provider.category)}
              {provider.city ? ' · ' + provider.city : ''}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <StarRating value={provider.average_rating ?? 0} readOnly size="sm" />
          <span className="font-sans text-xs text-muted tabular-nums">
            {provider.average_rating != null ? provider.average_rating.toFixed(1) : 'New'}
            {provider.review_count ? ' · ' + provider.review_count : ''}
          </span>
        </div>
        {provider.bio ? (
          <p className="mt-2 line-clamp-2 font-sans text-sm text-muted">{provider.bio}</p>
        ) : null}
      </div>
    </Link>
  );
}

export function ServiceCard({
  service,
  selected,
  onSelect,
}: {
  service: Service;
  selected?: boolean;
  onSelect?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        'w-full rounded-2xl border p-4 text-left transition-all ' +
        (selected
          ? 'border-teal bg-teal/5 shadow-soft'
          : 'border-border bg-white hover:border-teal/50')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg">{service.name}</p>
          {service.description ? (
            <p className="mt-1 font-sans text-sm text-muted">{service.description}</p>
          ) : null}
          <p className="mt-2 font-sans text-xs text-muted">
            {formatDuration(service.duration_minutes)}
          </p>
        </div>
        <p className="font-sans text-sm font-semibold tabular-nums">
          {formatMoney(service.price_cents)}
        </p>
      </div>
    </button>
  );
}
