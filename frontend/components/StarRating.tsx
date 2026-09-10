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
  const cls = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-lg';
  return (
    <div
      className={'inline-flex gap-0.5 ' + cls}
      role={readOnly ? 'img' : 'group'}
      aria-label={value + ' of 5 stars'}
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
            className={filled ? 'text-teal' : 'text-border'}
            onClick={() => onChange?.(n)}
            aria-label={n + (n === 1 ? ' star' : ' stars')}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
