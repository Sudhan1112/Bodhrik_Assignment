import Link from 'next/link';
import { LedgerRow } from '@/components/LedgerRow';
import type { Booking } from '@/lib/types';

const SAMPLE: Booking[] = [
  {
    id: '1',
    provider_id: 'p',
    customer_id: 'c',
    service_name: 'Initial consultation',
    start_time: '2030-03-12T09:30:00Z',
    end_time: '2030-03-12T10:15:00Z',
    status: 'confirmed',
    notes: null,
    price_cents: 8500,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    provider_id: 'p',
    customer_id: 'c',
    service_name: 'Follow-up session',
    start_time: '2030-03-14T14:00:00Z',
    end_time: '2030-03-14T14:45:00Z',
    status: 'pending',
    notes: null,
    price_cents: 6000,
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    provider_id: 'p',
    customer_id: 'c',
    service_name: 'Colour treatment',
    start_time: '2030-02-28T11:00:00Z',
    end_time: '2030-02-28T12:30:00Z',
    status: 'completed',
    notes: null,
    price_cents: 12000,
    created_at: '',
    updated_at: '',
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="border-b border-hairline pb-12 pt-6">
        <p className="font-display text-5xl leading-none tracking-tight sm:text-6xl">Ledger</p>
        <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-ink/80">
          A quiet appointment book for providers and the people who book them. Offer a time,
          confirm the visit, keep the record straight — and review only what actually happened.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/register"
            className="bg-ink px-5 py-2.5 font-sans text-sm text-paper transition-colors hover:bg-brass"
          >
            Open an account
          </Link>
          <Link
            href="/login"
            className="border border-ink px-5 py-2.5 font-sans text-sm transition-colors hover:border-brass hover:text-brass"
          >
            Sign in
          </Link>
        </div>
      </section>

      <section className="border-b border-hairline py-12">
        <h2 className="font-display text-2xl">What a day looks like</h2>
        <p className="mt-2 font-sans text-sm text-ink/70">
          Example ledger rows — the same layout you will use on your dashboard.
        </p>
        <div className="mt-6">
          <div className="mb-1 hidden font-sans text-xs uppercase tracking-wide text-ink/50 sm:grid sm:grid-cols-12 sm:gap-4">
            <span className="sm:col-span-3">When</span>
            <span className="sm:col-span-4">Service</span>
            <span className="sm:col-span-2">Status</span>
            <span className="sm:col-span-2">Price</span>
          </div>
          {SAMPLE.map((b) => (
            <LedgerRow key={b.id} booking={b} />
          ))}
        </div>
      </section>

      <section className="grid gap-10 py-12 sm:grid-cols-3">
        <div>
          <h3 className="font-display text-xl">Book without back-and-forth</h3>
          <p className="mt-2 font-sans text-sm leading-relaxed text-ink/75">
            Customers request a slot; providers confirm or cancel. The status lives in one place.
          </p>
        </div>
        <div>
          <h3 className="font-display text-xl">Reviews tied to visits</h3>
          <p className="mt-2 font-sans text-sm leading-relaxed text-ink/75">
            A review can only be written after a booking is marked completed — no drive-by ratings.
          </p>
        </div>
        <div>
          <h3 className="font-display text-xl">An accurate record</h3>
          <p className="mt-2 font-sans text-sm leading-relaxed text-ink/75">
            Every change is on the ledger: pending, confirmed, done, cancelled, or no-show.
          </p>
        </div>
      </section>
    </div>
  );
}
