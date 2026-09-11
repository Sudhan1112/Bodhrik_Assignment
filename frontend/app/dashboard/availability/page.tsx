'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { ErrorBanner, Skeleton, SuccessBanner } from '@/components/EmptyState';
import { Input } from '@/components/Input';
import { ProviderSubnav } from '@/components/ProviderSubnav';
import { useToast } from '@/components/Toast';
import { ApiError, getMyAvailability, replaceMyAvailability } from '@/lib/api';
import { useProviderSession } from '@/lib/useProviderSession';

const DAYS = [
  { weekday: 0, label: 'Monday' },
  { weekday: 1, label: 'Tuesday' },
  { weekday: 2, label: 'Wednesday' },
  { weekday: 3, label: 'Thursday' },
  { weekday: 4, label: 'Friday' },
  { weekday: 5, label: 'Saturday' },
  { weekday: 6, label: 'Sunday' },
] as const;

type DayState = {
  enabled: boolean;
  start: string;
  end: string;
};

function toInputTime(t: string): string {
  // "09:00:00" or "09:00" → "09:00"
  return t.slice(0, 5);
}

function toApiTime(t: string): string {
  return t.length === 5 ? t + ':00' : t;
}

function emptyWeek(): DayState[] {
  return DAYS.map((d) => ({
    enabled: d.weekday < 5,
    start: '09:00',
    end: '17:00',
  }));
}

export default function ProviderAvailabilityPage() {
  const { user, ready } = useProviderSession();
  const { toast } = useToast();
  const [days, setDays] = useState<DayState[]>(emptyWeek);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rules = await getMyAvailability();
      const next = emptyWeek().map((d, i) => {
        const rule = rules.find((r) => r.weekday === i && r.is_active);
        if (!rule) return { ...d, enabled: false };
        return {
          enabled: true,
          start: toInputTime(rule.start_time),
          end: toInputTime(rule.end_time),
        };
      });
      // If no rules at all, keep sensible Mon–Fri defaults but disabled until save? Spec: show actual.
      // If empty from API, show all disabled with default times for easy enable.
      if (!rules.length) {
        setDays(
          emptyWeek().map((d) => ({
            ...d,
            enabled: false,
          })),
        );
      } else {
        setDays(next);
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Something went wrong loading availability.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

  function updateDay(i: number, patch: Partial<DayState>) {
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  async function onSave() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const rules = days
        .map((d, weekday) =>
          d.enabled
            ? {
                weekday,
                start_time: toApiTime(d.start),
                end_time: toApiTime(d.end),
                is_active: true,
              }
            : null,
        )
        .filter(Boolean) as {
        weekday: number;
        start_time: string;
        end_time: string;
        is_active: boolean;
      }[];

      for (const r of rules) {
        if (r.end_time <= r.start_time) {
          throw new ApiError(422, 'End time must be after start time for each open day.');
        }
      }

      await replaceMyAvailability(rules);
      setMessage('Availability saved. Customers will see slots based on these hours.');
      toast('Availability saved');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save availability.');
    } finally {
      setBusy(false);
    }
  }

  function applyWeekdays() {
    setDays((prev) =>
      prev.map((d, i) =>
        i < 5 ? { enabled: true, start: '09:00', end: '17:00' } : { ...d, enabled: false },
      ),
    );
  }

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fadeUp pb-8">
      <ProviderSubnav />
      <h1 className="type-h1">Availability</h1>
      <p className="mt-2 font-sans text-body text-muted">
        Weekly hours used to generate open appointment slots for customers.
      </p>

      {message ? (
        <div className="mt-4" aria-live="polite">
          <SuccessBanner message={message} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-4" role="alert">
          <ErrorBanner message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      {loading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          <div className="mt-6">
            <Button type="button" variant="secondary" size="sm" onClick={applyWeekdays}>
              Prefill Mon–Fri 9:00–17:00
            </Button>
          </div>

          <ul className="mt-6 divide-y divide-border rounded-card border border-border bg-white">
            {DAYS.map((day, i) => {
              const d = days[i];
              return (
                <li key={day.weekday} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
                  <label className="flex min-w-[8rem] items-center gap-2 font-sans text-small font-medium">
                    <input
                      type="checkbox"
                      checked={d.enabled}
                      onChange={(e) => updateDay(i, { enabled: e.target.checked })}
                      className="h-4 w-4 accent-teal"
                    />
                    {day.label}
                  </label>
                  {d.enabled ? (
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      <Input
                        aria-label={day.label + ' start'}
                        type="time"
                        value={d.start}
                        onChange={(e) => updateDay(i, { start: e.target.value })}
                        className="max-w-[9rem]"
                      />
                      <span className="font-sans text-small text-muted">to</span>
                      <Input
                        aria-label={day.label + ' end'}
                        type="time"
                        value={d.end}
                        onChange={(e) => updateDay(i, { end: e.target.value })}
                        className="max-w-[9rem]"
                      />
                    </div>
                  ) : (
                    <p className="font-sans text-small text-muted">Closed</p>
                  )}
                </li>
              );
            })}
          </ul>

          <Button className="mt-6" loading={busy} onClick={() => void onSave()}>
            {busy ? 'Saving…' : 'Save availability'}
          </Button>
        </>
      )}
    </div>
  );
}
