'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { Button } from '@/components/Button';
import { Input, Select, Textarea } from '@/components/Input';
import { ApiError, loginUser, registerUser } from '@/lib/api';
import { setSession } from '@/lib/auth';
import type { UserRole } from '@/lib/types';

const SIDE =
  'https://images.unsplash.com/photo-1516975080664-ed2fc6a32937?w=1200&q=80';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<'customer' | 'provider'>('customer');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('salon');
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
        city?: string;
        category?: string;
      } = { email, password, full_name: fullName, role };
      if (role === 'provider') {
        payload.business_name = businessName || undefined;
        payload.bio = bio || undefined;
        payload.city = city || undefined;
        payload.category = category;
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
    <div className="mx-auto grid min-h-[70vh] max-w-5xl overflow-hidden rounded-3xl border border-border bg-white shadow-soft lg:grid-cols-2">
      <div
        className="relative hidden min-h-[420px] bg-cover bg-center lg:block"
        style={{ backgroundImage: 'url(' + SIDE + ')' }}
      >
        <div className="absolute inset-0 bg-ink/50" />
        <div className="relative flex h-full flex-col justify-end p-10 text-white">
          <p className="font-display text-3xl">Join Ledger</p>
          <p className="mt-2 font-sans text-sm text-white/80">
            Customers book in minutes. Providers fill their calendar with confidence.
          </p>
        </div>
      </div>
      <div className="p-8 sm:p-10">
        <h1 className="font-display text-3xl">Create account</h1>
        <p className="mt-2 font-sans text-sm text-muted">
          Already registered?{' '}
          <Link href="/login" className="text-teal hover:underline">
            Sign in
          </Link>
        </p>

        <div className="mt-6 flex rounded-full border border-border p-1">
          {(['customer', 'provider'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={
                'flex-1 rounded-full py-2 font-sans text-sm capitalize ' +
                (role === r ? 'bg-ink text-white' : 'text-muted')
              }
            >
              {r}
            </button>
          ))}
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-3">
          <Input label="Full name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <div>
            <Input
              label="Password"
              type={show ? 'text' : 'password'}
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="mt-1 font-sans text-xs text-teal" onClick={() => setShow((s) => !s)}>
              {show ? 'Hide' : 'Show'} password
            </button>
          </div>
          {role === 'provider' ? (
            <>
              <Input label="Business name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} />
              <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} />
              <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="salon">Salon</option>
                <option value="clinic">Clinic</option>
                <option value="consulting">Consulting</option>
              </Select>
              <Textarea label="Bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} />
            </>
          ) : null}
          {error ? <p className="font-sans text-sm text-coral">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Creating…' : 'Create account'}
          </Button>
        </form>
      </div>
    </div>
  );
}
