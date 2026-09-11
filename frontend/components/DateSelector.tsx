'use client';

import { useMemo, useState } from 'react';

function addDays(from: Date, n: number): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + day;
}

export function DateSelector({
  value,
  onChange,
  days = 14,
  availableDates,
  loadingDates,
}: {
  value: string;
  onChange: (ymd: string) => void;
  days?: number;
  /** When provided, dates not in the set are shown as unavailable (still selectable unless empty). */
  availableDates?: Set<string> | null;
  loadingDates?: boolean;
}) {
  const todayYmd = toYmd(startOfToday());
  const [offset, setOffset] = useState(0);
  const windowDays = days;

  const chips = useMemo(() => {
    const today = new Date(todayYmd + 'T12:00:00');
    return Array.from({ length: windowDays }, (_, i) => {
      const d = addDays(today, offset + i);
      return {
        ymd: toYmd(d),
        weekday: d.toLocaleDateString(undefined, { weekday: 'short' }),
        day: d.getDate(),
        month: d.toLocaleDateString(undefined, { month: 'short' }),
      };
    });
  }, [offset, todayYmd, windowDays]);

  const monthLabel = (
    value
      ? new Date(value + 'T12:00:00')
      : chips[0]
        ? new Date(chips[0].ymd + 'T12:00:00')
        : new Date(todayYmd + 'T12:00:00')
  ).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const canPrev = offset > 0;
  const canNext = offset + windowDays < 60;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="font-sans text-small font-semibold text-ink">{monthLabel}</p>
        <div className="flex gap-1">
          <button
            type="button"
            disabled={!canPrev}
            aria-label="Previous dates"
            onClick={() => setOffset((o) => Math.max(0, o - windowDays))}
            className="rounded-control border border-border px-2.5 py-1 font-sans text-caption disabled:opacity-40 hover:border-teal"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={!canNext}
            aria-label="Next dates"
            onClick={() => setOffset((o) => o + windowDays)}
            className="rounded-control border border-border px-2.5 py-1 font-sans text-caption disabled:opacity-40 hover:border-teal"
          >
            Next
          </button>
        </div>
      </div>
      {loadingDates ? (
        <p className="mb-2 font-sans text-caption text-muted" aria-live="polite">
          Checking open dates…
        </p>
      ) : null}
      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        role="listbox"
        aria-label="Choose a date"
      >
        {chips.map((c) => {
          const selected = c.ymd === value;
          const known = availableDates != null;
          const hasSlots = !known || availableDates.has(c.ymd);
          const unavailable = known && !hasSlots;
          return (
            <button
              key={c.ymd}
              type="button"
              role="option"
              aria-selected={selected}
              aria-disabled={unavailable}
              disabled={unavailable}
              onClick={() => onChange(c.ymd)}
              className={
                'flex min-w-[4.25rem] shrink-0 flex-col items-center rounded-control border px-2 py-2.5 font-sans transition-all duration-fast ' +
                (selected
                  ? 'border-teal bg-teal font-semibold text-white ring-2 ring-teal/30 ring-offset-1'
                  : unavailable
                    ? 'cursor-not-allowed border-border/60 bg-subtle text-muted line-through opacity-50'
                    : hasSlots && known
                      ? 'border-teal/40 bg-white text-ink hover:border-teal'
                      : 'border-border bg-white text-ink hover:border-teal')
              }
            >
              <span className={'text-caption ' + (selected ? 'text-white/85' : 'text-muted')}>
                {c.weekday}
              </span>
              <span className="mt-0.5 text-body tabular-nums">{c.day}</span>
              <span className={'text-caption ' + (selected ? 'text-white/85' : 'text-muted')}>
                {c.month}
              </span>
              {known && hasSlots && !selected ? (
                <span className="mt-1 h-1 w-1 rounded-full bg-teal" aria-hidden />
              ) : (
                <span className="mt-1 h-1 w-1" aria-hidden />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Alias for Phase 3 naming */
export { DateSelector as AvailabilityCalendar };
