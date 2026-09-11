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
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-xl' };
  return (
    <div
      className={'inline-flex gap-0.5 ' + sizes[size]}
      role={readOnly ? 'img' : 'radiogroup'}
      aria-label={readOnly ? value + ' out of 5 stars' : 'Rating'}
    >
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= Math.round(value);
        if (readOnly) {
          return (
            <span key={n} className={filled ? 'text-teal' : 'text-border'} aria-hidden>
              ★
            </span>
          );
        }
        return (
          <button
            key={n}
            type="button"
            className={
              'rounded px-0.5 transition-colors duration-fast ' +
              (filled ? 'text-teal' : 'text-border hover:text-teal/50')
            }
            aria-label={n + ' stars'}
            aria-checked={n === value}
            role="radio"
            onClick={() => onChange?.(n)}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

/** Marketplace rating line — hides stars when there are no reviews */
export function Rating({
  average,
  count,
  compact = false,
  size = 'sm',
}: {
  average?: number | null;
  count?: number;
  compact?: boolean;
  size?: 'sm' | 'md';
}) {
  if (!count || count <= 0 || average == null) {
    return (
      <p className="font-sans text-small text-muted">
        {compact ? 'No reviews' : 'No reviews yet'}
      </p>
    );
  }
  return (
    <div className="inline-flex flex-wrap items-center gap-1.5 font-sans text-small">
      <StarRating value={average} readOnly size={size} />
      <span className="font-semibold tabular-nums text-ink">{average.toFixed(1)}</span>
      <span className="text-muted">
        · {count} review{count === 1 ? '' : 's'}
      </span>
    </div>
  );
}
