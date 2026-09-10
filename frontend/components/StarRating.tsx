'use client';

export function StarRating({
  value,
  onChange,
  readOnly = false,
  size = 'md',
}: {
  value: number;
  onChange?: (n: number) => void;
  readOnly?: boolean;
  size?: 'sm' | 'md';
}) {
  const cls = size === 'sm' ? 'text-sm' : 'text-lg';
  return (
    <div
      className={`inline-flex gap-0.5 ${cls}`}
      role={readOnly ? 'img' : 'group'}
      aria-label={`${value} of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        if (readOnly) {
          return (
            <span key={n} className={filled ? 'text-brass' : 'text-hairline'} aria-hidden>
              ★
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            className={filled ? 'text-brass' : 'text-hairline'}
            onClick={() => onChange?.(n)}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
