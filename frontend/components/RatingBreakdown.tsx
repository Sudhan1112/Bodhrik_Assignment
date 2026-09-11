import type { ReviewStats } from '@/lib/types';
import { StarRating } from './StarRating';

export function RatingBreakdown({ stats }: { stats: ReviewStats }) {
  const max = Math.max(1, ...Object.values(stats.histogram || {}));
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
      <div className="text-center sm:text-left">
        <p className="font-display text-4xl font-medium tabular-nums">
          {stats.average_rating?.toFixed(1) ?? '—'}
        </p>
        <div className="mt-1 flex justify-center sm:justify-start">
          <StarRating value={stats.average_rating || 0} readOnly />
        </div>
        <p className="mt-1 font-sans text-small text-muted">
          {stats.review_count} review{stats.review_count === 1 ? '' : 's'}
        </p>
      </div>
      <div className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((star) => {
          const count = stats.histogram?.[String(star)] || 0;
          const pct = Math.round((count / max) * 100);
          return (
            <div key={star} className="flex items-center gap-2 font-sans text-caption">
              <span className="w-3 tabular-nums text-muted">{star}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-mist">
                <div className="h-full rounded-full bg-teal" style={{ width: pct + '%' }} />
              </div>
              <span className="w-6 text-right tabular-nums text-muted">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
