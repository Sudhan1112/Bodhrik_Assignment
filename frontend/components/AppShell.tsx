'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { clearSession, getStoredUser } from '@/lib/auth';
import type { User } from '@/lib/types';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, [pathname]);

  function logout() {
    clearSession();
    setUser(null);
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-hairline">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="font-display text-2xl tracking-tight">
            Ledger
          </Link>
          <nav className="flex items-center gap-4 font-sans text-sm">
            {user ? (
              <>
                <Link href="/dashboard" className="hover:text-brass">
                  Dashboard
                </Link>
                <span className="hidden text-ink/60 sm:inline">{user.full_name}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="text-ink/70 underline-offset-2 hover:underline"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link href="/login" className="hover:text-brass">
                  Sign in
                </Link>
                <Link
                  href="/register"
                  className="bg-ink px-3 py-1.5 text-paper transition-colors hover:bg-brass"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
