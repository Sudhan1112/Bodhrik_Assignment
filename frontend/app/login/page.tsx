'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ApiError, loginUser } from '@/lib/api';
import { setSession } from '@/lib/auth';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await loginUser(email, password);
      setSession(res.access_token, res.user);
      const next = searchParams.get('next');
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        router.push(next);
      } else if (res.user.role === 'customer') {
        router.push('/bookings');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fadeUp">
        <Link href="/" className="font-display text-2xl font-medium text-ink">
          Ledger
        </Link>
        <h1 className="type-h1 mt-8 text-[1.85rem]">Sign in</h1>
        <p className="mt-2 font-sans text-small text-muted">
          Book and manage your services in one place.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="relative">
            <Input
              label="Password"
              type={show ? 'text' : 'password'}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="absolute right-3 top-9 font-sans text-caption text-muted hover:text-ink"
              onClick={() => setShow((s) => !s)}
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          {error ? (
            <p className="font-sans text-small text-coral" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={busy} className="w-full">
            Sign in
          </Button>
        </form>
        <p className="mt-6 font-sans text-small text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-teal hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginInner />
    </Suspense>
  );
}
