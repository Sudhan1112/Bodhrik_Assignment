'use client';

import type { Slot } from '@/lib/types';
import { Button } from './Button';
import { Skeleton } from './EmptyState';

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function period(iso: string): 'Morning' | 'Afternoon' | 'Evening' {
  const h = new Date(iso).getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

export function TimeSlotGrid({
  slots,
  selected,
  onSelect,
  loading,
  error,
  onRetry,
  emptyHint,
  grouped = true,
  onChooseAnotherDate,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (start: string) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyHint?: string;
  grouped?: boolean;
  onChooseAnotherDate?: () => void;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="rounded-card border border-coral/20 bg-coral/5 px-3 py-3 font-sans text-small text-coral"
        role="alert"
      >
        <p className="font-semibold">Couldn&apos;t load availability</p>
        <p className="mt-1">{error}</p>
        {onRetry ? (
          <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={onRetry}>
            Try again
          </Button>
        ) : null}
      </div>
    );
  }

  if (!slots.length) {
    return (
      <div className="rounded-card border border-dashed border-border bg-canvas px-4 py-5" role="status">
        <p className="font-sans text-small font-semibold text-ink">No appointments available</p>
        <p className="mt-1 font-sans text-small text-muted">
          {emptyHint || 'There are no available times on this date.'}
        </p>
        {onChooseAnotherDate ? (
          <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onChooseAnotherDate}>
            Choose another date
          </Button>
        ) : null}
      </div>
    );
  }

  const groups: Array<{ label: string; items: Slot[] }> = grouped
    ? (['Morning', 'Afternoon', 'Evening'] as const)
        .map((label) => ({
          label,
          items: slots.filter((s) => period(s.start_time) === label),
        }))
        .filter((g) => g.items.length)
    : [{ label: '', items: slots }];

  return (
    <div className="space-y-4" role="listbox" aria-label="Available times">
      {groups.map((g) => (
        <div key={g.label || 'all'}>
          {g.label ? (
            <p className="mb-2 font-sans text-caption font-semibold uppercase tracking-wide text-muted">
              {g.label}
            </p>
          ) : null}
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {g.items.map((s) => {
              const active = selected === s.start_time;
              return (
                <button
                  key={s.start_time}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => onSelect(s.start_time)}
                  className={
                    'rounded-control border px-2 py-2.5 font-sans text-small tabular-nums transition-all duration-fast ' +
                    (active
                      ? 'border-teal bg-teal font-semibold text-white'
                      : 'border-border bg-surface text-ink hover:border-teal')
                  }
                >
                  {formatTime(s.start_time)}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export { TimeSlotGrid as SlotPicker };
