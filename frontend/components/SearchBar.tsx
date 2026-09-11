'use client';

import { FormEvent, useState } from 'react';
import { Button } from './Button';

export function MarketplaceSearch({
  initialWhat = '',
  initialWhere = '',
  initialWhen = '',
  onSearch,
  onFocusWhat,
  compact = false,
}: {
  initialWhat?: string;
  initialWhere?: string;
  initialWhen?: string;
  onSearch: (values: { what: string; where: string; when: string }) => void;
  onFocusWhat?: () => void;
  compact?: boolean;
}) {
  const [what, setWhat] = useState(initialWhat);
  const [where, setWhere] = useState(initialWhere);
  const [when, setWhen] = useState(initialWhen);

  function submit(e: FormEvent) {
    e.preventDefault();
    onSearch({ what: what.trim(), where: where.trim(), when });
  }

  return (
    <form
      onSubmit={submit}
      className={
        'overflow-hidden rounded-card border border-border bg-white shadow-soft ' +
        (compact ? '' : '')
      }
      aria-label="Search the marketplace"
    >
      <div
        className={
          'grid divide-y divide-border sm:divide-x sm:divide-y-0 ' +
          (compact
            ? 'sm:grid-cols-[1.3fr_1fr_1fr_auto]'
            : 'md:grid-cols-[1.4fr_1fr_1fr_auto]')
        }
      >
        <label className="block px-4 py-3">
          <span className="font-sans text-caption font-medium text-muted">What</span>
          <input
            className="mt-1 w-full bg-transparent font-sans text-small text-ink outline-none placeholder:text-muted/70"
            placeholder="What service are you looking for?"
            value={what}
            onChange={(e) => setWhat(e.target.value)}
            onFocus={onFocusWhat}
          />
        </label>
        <label className="block px-4 py-3">
          <span className="font-sans text-caption font-medium text-muted">Location</span>
          <input
            className="mt-1 w-full bg-transparent font-sans text-small text-ink outline-none placeholder:text-muted/70"
            placeholder="City"
            value={where}
            onChange={(e) => setWhere(e.target.value)}
          />
        </label>
        <label className="block px-4 py-3">
          <span className="font-sans text-caption font-medium text-muted">When</span>
          <input
            type="date"
            className="mt-1 w-full bg-transparent font-sans text-small text-ink outline-none"
            value={when}
            onChange={(e) => setWhen(e.target.value)}
          />
        </label>
        <div className="flex items-stretch p-2 sm:p-2">
          <Button type="submit" className="h-full w-full min-h-[2.75rem] sm:min-w-[6.5rem]">
            Search
          </Button>
        </div>
      </div>
    </form>
  );
}

/** @deprecated use MarketplaceSearch */
export { MarketplaceSearch as SearchBar };
