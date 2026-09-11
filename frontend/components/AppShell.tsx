'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { clearSession, getStoredUser } from '@/lib/auth';
import type { User } from '@/lib/types';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { CompareTray } from './CompareTray';
import { SearchInput } from './SearchInput';
import { SearchOverlay } from './SearchOverlay';
import { ThemeToggle } from './ThemeToggle';
import { ToastProvider } from './Toast';

function DesktopNavLink({
  href,
  children,
  exact,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href ||
      (href === '/explore' && pathname === '/explore') ||
      (href !== '/' && href !== '/explore' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={
        'rounded-control px-2.5 py-1.5 font-sans text-small font-medium transition-colors duration-fast ' +
        (active ? 'bg-subtle text-ink' : 'text-muted hover:text-ink')
      }
      aria-current={active ? 'page' : undefined}
    >
      {children}
    </Link>
  );
}

function MobileNavItem({
  href,
  label,
  icon,
  exact,
}: {
  href: string;
  label: string;
  icon: string;
  exact?: boolean;
}) {
  const pathname = usePathname();
  const active = exact
    ? pathname === href
    : pathname === href ||
      (href === '/explore' && pathname === '/explore') ||
      (href !== '/' && href !== '/explore' && pathname.startsWith(href));
  return (
    <Link
      href={href}
      className={
        'flex flex-1 flex-col items-center gap-0.5 py-2.5 font-sans text-caption transition-colors duration-fast ' +
        (active ? 'text-teal' : 'text-muted')
      }
      aria-current={active ? 'page' : undefined}
    >
      <span className="text-base leading-none" aria-hidden>
        {icon}
      </span>
      <span className={active ? 'font-semibold' : ''}>{label}</span>
    </Link>
  );
}

function MenuItem({
  href,
  onClick,
  children,
  danger,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  const className =
    'block w-full px-3 py-2 text-left font-sans text-small transition-colors duration-fast hover:bg-subtle focus-visible:bg-subtle outline-none ' +
    (danger ? 'text-coral' : 'text-ink');
  if (href) {
    return (
      <Link href={href} role="menuitem" className={className} onClick={onClick}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" role="menuitem" className={className} onClick={onClick}>
      {children}
    </button>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isCustomer = user?.role === 'customer';
  const isProvider = user?.role === 'provider' || user?.role === 'admin';
  const showBottomNav = !!user && !isAuthPage;

  useEffect(() => {
    setUser(getStoredUser());
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setAccountOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  function logout() {
    clearSession();
    setUser(null);
    setAccountOpen(false);
    router.push('/');
  }

  function openSearch() {
    setSearchOpen(true);
  }

  return (
    <ToastProvider>
      <div className="min-h-screen bg-surface text-ink">
        {!isAuthPage ? (
          <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur-sm">
            <div className="shell flex h-14 items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-5">
                <Link
                  href="/"
                  className="shrink-0 font-display text-xl font-medium tracking-tight text-ink"
                >
                  Ledger
                </Link>
                <nav className="hidden items-center gap-0.5 md:flex" aria-label="Primary">
                  {isCustomer ? (
                    <>
                      <DesktopNavLink href="/explore">Explore</DesktopNavLink>
                      <DesktopNavLink href="/bookings">Bookings</DesktopNavLink>
                      <DesktopNavLink href="/reviews">Reviews</DesktopNavLink>
                    </>
                  ) : null}
                  {isProvider ? (
                    <>
                      <DesktopNavLink href="/dashboard" exact>
                        Home
                      </DesktopNavLink>
                      <DesktopNavLink href="/dashboard/bookings">Bookings</DesktopNavLink>
                      <DesktopNavLink href="/dashboard/profile">Profile</DesktopNavLink>
                    </>
                  ) : null}
                  {!user ? <DesktopNavLink href="/explore">Explore</DesktopNavLink> : null}
                </nav>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden w-52 lg:block xl:w-64">
                  <SearchInput onActivate={openSearch} />
                </div>
                <button
                  type="button"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-muted transition-colors duration-fast hover:bg-subtle hover:text-ink lg:hidden"
                  aria-label="Search"
                  onClick={openSearch}
                >
                  <span aria-hidden>⌕</span>
                </button>
                <ThemeToggle />

                {!user ? (
                  <>
                    <Link
                      href="/login"
                      className="hidden font-sans text-small font-medium text-muted transition-colors duration-fast hover:text-ink sm:inline"
                    >
                      Sign in
                    </Link>
                    <Link href="/register">
                      <Button size="sm">Get started</Button>
                    </Link>
                  </>
                ) : (
                  <div className="relative" ref={accountRef}>
                    <button
                      type="button"
                      className="rounded-full transition-opacity duration-fast hover:opacity-90"
                      aria-expanded={accountOpen}
                      aria-haspopup="menu"
                      aria-controls={menuId}
                      onClick={() => setAccountOpen((o) => !o)}
                    >
                      <Avatar name={user.full_name} src={user.avatar_url} size="sm" />
                    </button>
                    {accountOpen ? (
                      <div
                        id={menuId}
                        role="menu"
                        className="absolute right-0 mt-2 w-56 animate-scaleIn overflow-hidden rounded-card border border-border bg-surface py-1 shadow-menu"
                      >
                        <p className="border-b border-border px-3 py-2.5 font-sans text-caption text-muted">
                          {user.full_name}
                        </p>
                        {isCustomer ? (
                          <>
                            <MenuItem href="/account" onClick={() => setAccountOpen(false)}>
                              Account
                            </MenuItem>
                            <MenuItem href="/bookings" onClick={() => setAccountOpen(false)}>
                              Bookings
                            </MenuItem>
                            <MenuItem href="/reviews" onClick={() => setAccountOpen(false)}>
                              Reviews
                            </MenuItem>
                            <MenuItem href="/saved" onClick={() => setAccountOpen(false)}>
                              Saved
                            </MenuItem>
                            <MenuItem href="/help" onClick={() => setAccountOpen(false)}>
                              Help
                            </MenuItem>
                          </>
                        ) : null}
                        {isProvider ? (
                          <>
                            <MenuItem href="/dashboard" onClick={() => setAccountOpen(false)}>
                              Home
                            </MenuItem>
                            <MenuItem
                              href="/dashboard/bookings"
                              onClick={() => setAccountOpen(false)}
                            >
                              Bookings
                            </MenuItem>
                            <MenuItem
                              href="/dashboard/profile"
                              onClick={() => setAccountOpen(false)}
                            >
                              Business profile
                            </MenuItem>
                            <MenuItem href="/account" onClick={() => setAccountOpen(false)}>
                              Account
                            </MenuItem>
                            <MenuItem href="/help" onClick={() => setAccountOpen(false)}>
                              Help
                            </MenuItem>
                          </>
                        ) : null}
                        {!isCustomer && !isProvider ? (
                          <>
                            <MenuItem href="/account" onClick={() => setAccountOpen(false)}>
                              Account
                            </MenuItem>
                            <MenuItem href="/help" onClick={() => setAccountOpen(false)}>
                              Help
                            </MenuItem>
                          </>
                        ) : null}
                        <div className="my-1 border-t border-border" />
                        <MenuItem onClick={logout} danger>
                          Sign out
                        </MenuItem>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </header>
        ) : null}

        <main
          className={
            isAuthPage
              ? ''
              : 'shell py-6 sm:py-8 ' + (showBottomNav ? 'pb-24 md:pb-10' : '')
          }
        >
          {children}
          {!isAuthPage ? (
            <footer className="mt-16 border-t border-border pt-6 pb-2 font-sans text-caption text-muted">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p>Ledger — request appointments. No payments in this product.</p>
                <div className="flex gap-4">
                  <Link href="/help" className="hover:text-ink hover:underline">
                    Help
                  </Link>
                  <Link href="/explore" className="hover:text-ink hover:underline">
                    Explore
                  </Link>
                </div>
              </div>
            </footer>
          ) : null}
        </main>

        {!isAuthPage ? <CompareTray /> : null}
        <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />

        {showBottomNav && isCustomer ? (
          <nav
            className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm md:hidden"
            aria-label="Mobile"
          >
            <div className="flex">
              <MobileNavItem href="/explore" label="Explore" icon="⌕" />
              <MobileNavItem href="/bookings" label="Bookings" icon="☰" />
              <MobileNavItem href="/reviews" label="Reviews" icon="★" />
              <MobileNavItem href="/account" label="Account" icon="○" />
            </div>
          </nav>
        ) : null}

        {showBottomNav && isProvider ? (
          <nav
            className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur-sm md:hidden"
            aria-label="Mobile"
          >
            <div className="flex">
              <MobileNavItem href="/dashboard" label="Home" icon="⌂" exact />
              <MobileNavItem href="/dashboard/bookings" label="Bookings" icon="☰" />
              <MobileNavItem href="/dashboard/profile" label="Profile" icon="◎" />
              <MobileNavItem href="/account" label="Account" icon="○" />
            </div>
          </nav>
        ) : null}
      </div>
    </ToastProvider>
  );
}
