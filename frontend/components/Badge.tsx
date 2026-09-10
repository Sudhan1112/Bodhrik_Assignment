import type { BookingStatus } from '@/lib/types';

const STYLES: Record<BookingStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 ring-amber-200',
  confirmed: 'bg-teal/10 text-teal ring-teal/20',
  completed: 'bg-mist text-ink ring-border',
  cancelled: 'bg-coral/10 text-coral ring-coral/20',
  no_show: 'bg-coral/10 text-coral ring-coral/20',
};

const LABELS: Record<BookingStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No show',
};

export function Badge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={
        'inline-flex rounded-full px-2.5 py-0.5 font-sans text-[11px] font-semibold uppercase tracking-wide ring-1 ' +
        STYLES[status]
      }
    >
      {LABELS[status]}
    </span>
  );
}

export { Badge as StatusBadge };
