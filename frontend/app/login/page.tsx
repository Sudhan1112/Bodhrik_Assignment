'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/Button';
import { Input } from '@/components/Input';
import { ApiError, loginUser } from '@/lib/api';
import { setSession } from '@/lib/auth';

const SIDE =
  'https://images.unsplash.com/photo-1633681926022-84c1035a3e0f?w=1200&q=80';

export default function LoginPage() {
  const router = useRouter();
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
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid min-h-[70vh] max-w-5xl overflow-hidden rounded-3xl border border-border bg-white shadow-soft lg:grid-cols-2">
      <div
        className="relative hidden min-h-[420px] bg-cover bg-center lg:block"
        style={{ backgroundImage: 'url(' + SIDE + ')' }}
      >
        <div className="absolute inset-0 bg-ink/55" />
        <div className="relative flex h-full flex-col justify-end p-10 text-white">
          <p className="font-display text-3xl">Welcome back</p>
          <p className="mt-2 font-sans text-sm text-white/80">
            Your appointments, reviews, and providers — in one calm place.
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-center p-8 sm:p-12">
        <h1 className="font-display text-3xl">Sign in</h1>
        <p className="mt-2 font-sans text-sm text-muted">
          No account?{' '}
          <Link href="/register" className="text-teal hover:underline">
            Register
          </Link>
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div>
            <Input
              label="Password"
              type={show ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="mt-1 font-sans text-xs text-teal"
              onClick={() => setShow((s) => !s)}
            >
              {show ? 'Hide' : 'Show'} password
            </button>
          </div>
          {error ? <p className="font-sans text-sm text-coral">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>
    </div>
  );
}
