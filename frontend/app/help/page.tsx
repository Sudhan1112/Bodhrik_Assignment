import Link from 'next/link';
import { Button } from '@/components/Button';

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl animate-fadeUp pb-10">
      <p className="eyebrow">Help</p>
      <h1 className="type-h1 mt-2">How Ledger works</h1>
      <p className="mt-2 font-sans text-body text-muted">
        A short guide to requesting appointments, confirmations, and reviews — based on how the
        product actually behaves today.
      </p>

      <div className="mt-10 space-y-10 font-sans text-small leading-relaxed text-ink/90">
        <section>
          <h2 className="type-h2">Booking</h2>
          <p className="mt-3 text-muted">
            Customers choose a provider, pick a service, then select an available date and time.
            Submitting sends a request — it does not charge payment and does not instantly confirm
            the appointment.
          </p>
        </section>

        <section>
          <h2 className="type-h2">Pending requests</h2>
          <p className="mt-3 text-muted">
            New requests start as <strong className="font-semibold text-ink">Pending</strong>. That
            means waiting for the provider to confirm. Until then, the appointment is not scheduled.
          </p>
        </section>

        <section>
          <h2 className="type-h2">Confirmation</h2>
          <p className="mt-3 text-muted">
            When a provider accepts, the status becomes{' '}
            <strong className="font-semibold text-ink">Confirmed</strong>. You can track it under
            Bookings.
          </p>
        </section>

        <section>
          <h2 className="type-h2">Cancellation &amp; changes</h2>
          <p className="mt-3 text-muted">
            Customers can cancel or reschedule while a request is still pending. After confirmation,
            only the provider can cancel, complete, or mark a no-show through Ledger. Contact the
            provider outside the app if you need a change after confirmation — messaging is not
            built into Ledger yet.
          </p>
        </section>

        <section>
          <h2 className="type-h2">Reviews</h2>
          <p className="mt-3 text-muted">
            Reviews unlock after a booking is marked completed. Each review is tied to a completed
            visit. Providers may reply to reviews on their listing.
          </p>
        </section>

        <section>
          <h2 className="type-h2">For providers</h2>
          <p className="mt-3 text-muted">
            Keep services and weekly availability up to date so customers see real open slots.
            Respond to pending requests promptly. Completing visits unlocks customer reviews.
          </p>
        </section>

        <section>
          <h2 className="type-h2">What Ledger does not include yet</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-muted">
            <li>Payments, refunds, or invoices</li>
            <li>In-app messaging or notification inbox</li>
            <li>Password reset (use your demo credentials for this assignment)</li>
            <li>Editing account or provider profile fields after registration</li>
          </ul>
        </section>
      </div>

      <div className="mt-10 flex flex-wrap gap-2">
        <Link href="/explore">
          <Button>Explore providers</Button>
        </Link>
        <Link href="/bookings">
          <Button variant="secondary">Your bookings</Button>
        </Link>
      </div>
    </div>
  );
}
