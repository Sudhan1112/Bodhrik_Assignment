'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getStoredUser } from '@/lib/auth';
import type { User } from '@/lib/types';
import { Button } from './Button';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const marketing = pathname === '/';

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  function logout() {
    clearSession();
    setUser(null);
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-ivory text-ink">
      <header
        className={
          marketing
            ? 'absolute inset-x-0 top-0 z-20 border-b border-white/10 bg-ink/20 backdrop-blur-md'
            : 'sticky top-0 z-20 border-b border-border bg-ivory/90 backdrop-blur'
        }
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className={
              'font-display text-2xl tracking-tight ' + (marketing ? 'text-white' : 'text-ink')
            }
          >
            Ledger
          </Link>
          <nav
            className={
              'flex items-center gap-4 font-sans text-sm ' +
              (marketing ? 'text-white/90' : 'text-ink')
            }
          >
            <Link href="/explore" className="hover:opacity-80">
              Explore
            </Link>
            {user ? (
              <>
                <Link href="/dashboard" className="hover:opacity-80">
                  Dashboard
                </Link>
                <button type="button" onClick={logout} className="hover:opacity-80">
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:opacity-80">
                  Sign in
                </Link>
                <Link href="/register">
                  <Button size="sm" className={marketing ? 'bg-white text-ink hover:bg-mist' : ''}>
                    Get started
                  </Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className={marketing ? '' : 'mx-auto max-w-6xl px-4 py-8 sm:px-6'}>{children}</main>
    </div>
  );
}
