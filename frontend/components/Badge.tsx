import type { BookingStatus } from '@/lib/types';

const STYLES: Record<BookingStatus, string> = {
  pending: 'bg-amber/10 text-amber ring-amber/20',
  confirmed: 'bg-teal-soft text-teal ring-teal/20',
  completed: 'bg-subtle text-ink ring-border',
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

/** Generic label badge */
export function Badge({
  children,
  tone = 'neutral',
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'teal' | 'amber' | 'coral';
}) {
  const tones = {
    neutral: 'bg-subtle text-ink ring-border',
    teal: 'bg-teal-soft text-teal ring-teal/20',
    amber: 'bg-amber/10 text-amber ring-amber/20',
    coral: 'bg-coral/10 text-coral ring-coral/20',
  };
  return (
    <span
      className={
        'inline-flex items-center rounded-md px-2 py-0.5 font-sans text-caption font-medium ring-1 ' +
        tones[tone]
      }
    >
      {children}
    </span>
  );
}

/** Booking status — always color + text */
export function StatusBadge({ status }: { status: BookingStatus }) {
  return (
    <span
      className={
        'inline-flex items-center rounded-md px-2 py-0.5 font-sans text-caption font-semibold ring-1 ' +
        STYLES[status]
      }
    >
      {LABELS[status]}
    </span>
  );
}

/** @deprecated prefer StatusBadge for bookings */
export function BookingBadge({ status }: { status: BookingStatus }) {
  return <StatusBadge status={status} />;
}
