import Link from 'next/link';
import { formatMoney, formatWhen } from '@/lib/api';
import type { Booking } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

export function LedgerRow({
  booking,
  href,
  trailing,
}: {
  booking: Pick<
    Booking,
    'id' | 'service_name' | 'start_time' | 'end_time' | 'status' | 'price_cents'
  >;
  href?: string;
  trailing?: React.ReactNode;
}) {
  const main = (
    <>
      <div className="font-sans text-sm text-ink/70 sm:col-span-3">
        {formatWhen(booking.start_time)}
      </div>
      <div className="font-display text-base sm:col-span-4">{booking.service_name}</div>
      <div className="font-sans text-sm sm:col-span-2">
        <StatusBadge status={booking.status} />
      </div>
      <div className="font-sans text-sm tabular-nums sm:col-span-2">
        {formatMoney(booking.price_cents)}
      </div>
    </>
  );

  return (
    <div className="ledger-rule grid grid-cols-1 gap-2 py-3 sm:grid-cols-12 sm:items-baseline sm:gap-4">
      {href ? (
        <Link href={href} className="contents transition-opacity hover:opacity-80">
          {main}
        </Link>
      ) : (
        main
      )}
      {trailing ? <div className="sm:col-span-1 sm:justify-self-end">{trailing}</div> : null}
    </div>
  );
}
