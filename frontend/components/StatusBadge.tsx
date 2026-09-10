import type { BookingStatus } from '@/lib/types';

const STYLES: Record<BookingStatus, string> = {
  pending: 'text-brass',
  confirmed: 'text-sage',
  completed: 'text-ink',
  cancelled: 'text-clay',
  no_show: 'text-clay',
};

const LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={`font-sans text-xs font-semibold uppercase tracking-wide ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}
