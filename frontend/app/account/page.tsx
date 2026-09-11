'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Skeleton } from '@/components/EmptyState';
import { clearSession, getStoredUser, getToken } from '@/lib/auth';
import type { User } from '@/lib/types';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?next=/account');
      return;
    }
    setUser(getStoredUser());
  }, [router]);

  if (!user) return <Skeleton className="h-48 w-full" />;

  function signOut() {
    clearSession();
    router.push('/');
  }

  const isCustomer = user.role === 'customer';
  const isProvider = user.role === 'provider' || user.role === 'admin';

  return (
    <div className="mx-auto max-w-lg animate-fadeUp pb-8">
      <p className="eyebrow">Account</p>
      <h1 className="type-h1 mt-2">Your account</h1>
      <p className="mt-2 font-sans text-small text-muted">
        Sign-in details for Ledger. Account editing is not available through the current API.
      </p>

      <dl className="mt-8 divide-y divide-border rounded-card border border-border bg-surface">
        <div className="px-4 py-3">
          <dt className="font-sans text-caption text-muted">Name</dt>
          <dd className="mt-0.5 font-sans text-body">{user.full_name}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="font-sans text-caption text-muted">Email</dt>
          <dd className="mt-0.5 font-sans text-body">{user.email}</dd>
        </div>
        <div className="px-4 py-3">
          <dt className="font-sans text-caption text-muted">Role</dt>
          <dd className="mt-0.5 font-sans text-body capitalize">{user.role}</dd>
        </div>
      </dl>

      <nav className="mt-8" aria-label="Account links">
        <p className="font-sans text-caption font-semibold uppercase tracking-wide text-muted">
          Shortcuts
        </p>
        <ul className="mt-2 divide-y divide-border rounded-card border border-border bg-surface font-sans text-small">
          {isCustomer ? (
            <>
              <Li href="/bookings">Bookings</Li>
              <Li href="/reviews">Reviews</Li>
              <Li href="/saved">Saved providers</Li>
              <Li href="/compare">Compare</Li>
              <Li href="/explore">Explore</Li>
            </>
          ) : null}
          {isProvider ? (
            <>
              <Li href="/dashboard">Home</Li>
              <Li href="/dashboard/bookings">Bookings</Li>
              <Li href="/dashboard/profile">Business profile</Li>
              <Li href="/dashboard/services">Services</Li>
              <Li href="/dashboard/availability">Availability</Li>
              <Li href="/dashboard/reviews">Reviews</Li>
              <Li href={'/providers/' + user.id}>Public profile</Li>
            </>
          ) : null}
          <Li href="/help">Help</Li>
        </ul>
      </nav>

      <Button className="mt-8" variant="danger" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}

function Li({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="block px-4 py-3 text-ink transition-colors duration-fast hover:bg-subtle hover:text-teal"
      >
        {children}
      </Link>
    </li>
  );
}
