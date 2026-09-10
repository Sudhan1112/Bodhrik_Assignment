'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { ApiError, loginUser, registerUser } from '@/lib/api';
import { setSession } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const payload: {
        email: string;
        password: string;
        full_name: string;
        role: UserRole;
        business_name?: string;
        bio?: string;
      } = {
        email,
        password,
        full_name: fullName,
        role,
      };
      if (role === 'provider') {
        payload.business_name = businessName || undefined;
        payload.bio = bio || undefined;
      }
      await registerUser(payload);
      const res = await loginUser(email, password);
      setSession(res.access_token, res.user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl">Register</h1>
      <p className="mt-2 font-sans text-sm text-ink/70">
        Already have an account?{' '}
        <Link href="/login" className="text-brass underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>

      <div className="mt-6 flex border border-hairline">
        <button
          type="button"
          onClick={() => setRole('customer')}
          className={`flex-1 py-2 font-sans text-sm ${
            role === 'customer' ? 'bg-ink text-paper' : 'bg-mist text-ink'
          }`}
        >
          Customer
        </button>
        <button
          type="button"
          onClick={() => setRole('provider')}
          className={`flex-1 py-2 font-sans text-sm ${
            role === 'provider' ? 'bg-ink text-paper' : 'bg-mist text-ink'
          }`}
        >
          Provider
        </button>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <label className="block font-sans text-sm">
          Full name
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
          />
        </label>
        <label className="block font-sans text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
          />
        </label>
        <label className="block font-sans text-sm">
          Password
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
          />
        </label>
        {role === 'provider' ? (
          <>
            <label className="block font-sans text-sm">
              Business name
              <input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
              />
            </label>
            <label className="block font-sans text-sm">
              Bio
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                className="mt-1 w-full border border-hairline bg-mist px-3 py-2"
              />
            </label>
          </>
        ) : null}
        {error ? <p className="font-sans text-sm text-clay">{error}</p> : null}
        <button
          type="submit"
          disabled={busy}
          className="w-full bg-ink px-4 py-2.5 font-sans text-sm text-paper hover:bg-brass disabled:opacity-60"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
