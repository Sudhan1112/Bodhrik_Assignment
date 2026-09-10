'use client';

import type { Slot } from '@/lib/types';

export function SlotPicker({
  slots,
  selected,
  onSelect,
  loading,
}: {
  slots: Slot[];
  selected: string | null;
  onSelect: (start: string) => void;
  loading?: boolean;
}) {
  if (loading) {
    return <p className="font-sans text-sm text-muted">Loading times…</p>;
  }
  if (!slots.length) {
    return (
      <p className="font-sans text-sm text-muted">
        No open slots this day. Try another date.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
      {slots.map((s) => {
        const label = new Date(s.start_time).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        });
        const active = selected === s.start_time;
        return (
          <button
            key={s.start_time}
            type="button"
            onClick={() => onSelect(s.start_time)}
            className={
              'rounded-xl border px-2 py-2.5 font-sans text-sm transition-all ' +
              (active
                ? 'border-teal bg-teal text-white shadow-lift scale-[1.02]'
                : 'border-border bg-white text-ink hover:border-teal')
            }
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
