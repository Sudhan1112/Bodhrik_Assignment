'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/Button';
import { Input, Select } from '@/components/Input';
import { ApiError, loginUser, registerUser } from '@/lib/api';
import { setSession } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [role, setRole] = useState<UserRole>('customer');
  const [businessName, setBusinessName] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('salon');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await registerUser({
        email,
        password,
        full_name: fullName,
        role,
        business_name: role === 'provider' ? businessName || undefined : undefined,
        city: role === 'provider' ? city || undefined : undefined,
        category: role === 'provider' ? category : undefined,
      });
      const res = await loginUser(email, password);
      setSession(res.access_token, res.user);
      router.push(res.user.role === 'customer' ? '/bookings' : '/dashboard');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
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
        <h1 className="type-h1 mt-8 text-[1.85rem]">Create account</h1>
        <p className="mt-2 font-sans text-small text-muted">
          Join Ledger to request appointments — or list your services as a provider.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <Input
            label="Full name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
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
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              hint="At least 8 characters"
            />
            <button
              type="button"
              className="absolute right-3 top-9 font-sans text-caption text-muted hover:text-ink"
              onClick={() => setShow((s) => !s)}
            >
              {show ? 'Hide' : 'Show'}
            </button>
          </div>
          <Select
            label="I am a"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            <option value="customer">Customer</option>
            <option value="provider">Provider</option>
          </Select>
          {role === 'provider' ? (
            <>
              <Input
                label="Business name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
              />
              <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
              <Select
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="salon">Hair & beauty</option>
                <option value="clinic">Healthcare</option>
                <option value="consulting">Professional</option>
              </Select>
            </>
          ) : null}
          {error ? (
            <p className="font-sans text-small text-coral" role="alert">
              {error}
            </p>
          ) : null}
          <Button type="submit" loading={busy} className="w-full">
            Create account
          </Button>
        </form>
        <p className="mt-6 font-sans text-small text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-teal hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
