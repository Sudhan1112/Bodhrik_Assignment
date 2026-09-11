'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const LINKS: { href: string; label: string; exact?: boolean }[] = [
  { href: '/dashboard', label: 'Home', exact: true },
  { href: '/dashboard/bookings', label: 'Bookings' },
  { href: '/dashboard/services', label: 'Services' },
  { href: '/dashboard/availability', label: 'Availability' },
  { href: '/dashboard/reviews', label: 'Reviews' },
  { href: '/dashboard/profile', label: 'Profile' },
];

export function ProviderSubnav() {
  const pathname = usePathname();
  return (
    <nav
      className="-mx-1 mb-8 flex gap-1 overflow-x-auto border-b border-border pb-px"
      aria-label="Provider console"
    >
      {LINKS.map((l) => {
        const active = l.exact
          ? pathname === l.href
          : pathname === l.href || pathname.startsWith(l.href + '/');
        return (
          <Link
            key={l.href}
            href={l.href}
            className={
              'shrink-0 border-b-2 px-3 py-2.5 font-sans text-small font-medium transition-colors duration-fast ' +
              (active
                ? 'border-teal text-ink'
                : 'border-transparent text-muted hover:text-ink')
            }
            aria-current={active ? 'page' : undefined}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
