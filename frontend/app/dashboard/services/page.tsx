'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { EmptyState, ErrorBanner, Skeleton, SuccessBanner } from '@/components/EmptyState';
import { Input, Textarea } from '@/components/Input';
import { Modal } from '@/components/Modal';
import { ProviderSubnav } from '@/components/ProviderSubnav';
import { useToast } from '@/components/Toast';
import {
  ApiError,
  createService,
  deleteService,
  formatDuration,
  formatMoney,
  listProviderServices,
  updateService,
} from '@/lib/api';
import { useProviderSession } from '@/lib/useProviderSession';
import type { Service } from '@/lib/types';

export default function ProviderServicesPage() {
  const { user, ready } = useProviderSession();
  const { toast } = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mins, setMins] = useState(60);
  const [price, setPrice] = useState(50);

  const [edit, setEdit] = useState<Service | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editMins, setEditMins] = useState(60);
  const [editPrice, setEditPrice] = useState(50);
  const [removeId, setRemoveId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setServices(await listProviderServices(user.id));
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong loading services.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (ready && user) void load();
  }, [ready, user, load]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await createService({
        name,
        description: description || undefined,
        duration_minutes: mins,
        price_cents: Math.round(price * 100),
      });
      setName('');
      setDescription('');
      setMessage('Service added.');
      toast('Service added');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not add service.');
    } finally {
      setBusy(false);
    }
  }

  async function onSaveEdit() {
    if (!edit || busy) return;
    setBusy(true);
    setError(null);
    try {
      await updateService(edit.id, {
        name: editName,
        description: editDesc || null,
        duration_minutes: editMins,
        price_cents: Math.round(editPrice * 100),
      });
      setEdit(null);
      setMessage('Service updated.');
      toast('Service updated');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update service.');
    } finally {
      setBusy(false);
    }
  }

  async function onRemove() {
    if (!removeId || busy) return;
    setBusy(true);
    setError(null);
    try {
      await deleteService(removeId);
      setRemoveId(null);
      setMessage('Service removed.');
      toast('Service removed');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove service.');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !user) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl animate-fadeUp pb-8">
      <ProviderSubnav />
      <h1 className="type-h1">Services</h1>
      <p className="mt-2 font-sans text-body text-muted">
        Offerings customers can request on your public profile.
      </p>

      {message ? (
        <div className="mt-4" aria-live="polite">
          <SuccessBanner message={message} />
        </div>
      ) : null}
      {error ? (
        <div className="mt-4">
          <ErrorBanner message={error} onRetry={() => void load()} />
        </div>
      ) : null}

      <section className="mt-8 rounded-card border border-border bg-white p-5">
        <h2 className="font-sans text-h3 font-semibold">Add a service</h2>
        <form onSubmit={onCreate} className="mt-4 space-y-3">
          <Input label="Name" required value={name} onChange={(e) => setName(e.target.value)} />
          <Textarea
            label="Description"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (minutes)"
              type="number"
              min={5}
              required
              value={mins}
              onChange={(e) => setMins(Number(e.target.value))}
            />
            <Input
              label="Price ($)"
              type="number"
              min={0}
              step={0.01}
              required
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
            />
          </div>
          <Button type="submit" loading={busy}>
            Add service
          </Button>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="type-h2">Your services</h2>
        <div className="mt-4 space-y-0">
          {loading ? (
            <>
              <Skeleton className="mb-3 h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </>
          ) : services.length === 0 ? (
            <EmptyState
              title="No services yet"
              description="Add at least one service so customers can request appointments."
            />
          ) : (
            services.map((s) => (
              <div
                key={s.id}
                className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div>
                  <p className="font-sans text-body font-semibold">{s.name}</p>
                  {s.description ? (
                    <p className="mt-1 font-sans text-small text-muted">{s.description}</p>
                  ) : null}
                  <p className="mt-2 font-sans text-small text-muted">
                    {formatDuration(s.duration_minutes)} · {formatMoney(s.price_cents)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEdit(s);
                      setEditName(s.name);
                      setEditDesc(s.description || '');
                      setEditMins(s.duration_minutes);
                      setEditPrice(s.price_cents / 100);
                    }}
                  >
                    Edit
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => setRemoveId(s.id)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Modal
        open={!!edit}
        title="Edit service"
        cancelLabel="Cancel"
        confirmLabel={busy ? 'Saving…' : 'Save changes'}
        busy={busy}
        onClose={() => !busy && setEdit(null)}
        onConfirm={() => void onSaveEdit()}
      >
        <div className="space-y-3 text-left">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Textarea
            label="Description"
            rows={2}
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Duration (min)"
              type="number"
              min={5}
              value={editMins}
              onChange={(e) => setEditMins(Number(e.target.value))}
            />
            <Input
              label="Price ($)"
              type="number"
              min={0}
              step={0.01}
              value={editPrice}
              onChange={(e) => setEditPrice(Number(e.target.value))}
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={!!removeId}
        title="Remove this service?"
        cancelLabel="Keep service"
        confirmLabel={busy ? 'Removing…' : 'Remove service'}
        danger
        busy={busy}
        onClose={() => !busy && setRemoveId(null)}
        onConfirm={() => void onRemove()}
      >
        It will no longer appear on your public profile. Existing bookings are unchanged.
      </Modal>
    </div>
  );
}
