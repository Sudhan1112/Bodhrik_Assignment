'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { getStoredUser, getToken } from '@/lib/auth';
import type { User } from '@/lib/types';

/** Ensures a provider/admin session; redirects customers to /bookings. */
export function useProviderSession() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    if (!getToken()) {
      router.replace('/login?next=/dashboard');
      return;
    }
    const u = getStoredUser();
    if (!u) {
      router.replace('/login?next=/dashboard');
      return;
    }
    if (u.role === 'customer') {
      router.replace('/bookings');
      return;
    }
    setUser(u);
    setReady(true);
  }, [router]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { user, ready, refresh };
}
