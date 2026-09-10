import type { ReviewStats } from '@/lib/types';
import { StarRating } from './StarRating';

export function RatingBreakdown({ stats }: { stats: ReviewStats }) {
  const max = Math.max(1, ...Object.values(stats.histogram));
  return (
    <div className="panel p-5">
      <div className="flex items-end gap-4">
        <div>
          <p className="font-display text-4xl tabular-nums">
            {stats.average_rating != null ? stats.average_rating.toFixed(1) : '—'}
          </p>
          <StarRating value={stats.average_rating ?? 0} readOnly size="sm" />
          <p className="mt-1 font-sans text-xs text-muted">
            {stats.review_count} review{stats.review_count === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((n) => {
            const count = stats.histogram[String(n)] || 0;
            const pct = (count / max) * 100;
            return (
              <div key={n} className="flex items-center gap-2 font-sans text-xs text-muted">
                <span className="w-3 tabular-nums">{n}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-mist">
                  <div className="h-full rounded-full bg-teal" style={{ width: pct + '%' }} />
                </div>
                <span className="w-6 text-right tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
