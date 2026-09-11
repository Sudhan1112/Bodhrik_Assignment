'use client';

import { ReactNode, useEffect, useId, useRef } from 'react';
import { Button } from './Button';

export function Modal({
  open,
  title,
  children,
  onClose,
  cancelLabel = 'Cancel',
  confirmLabel,
  onConfirm,
  danger,
  busy,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  onConfirm?: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-ink/40 animate-fadeIn"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative z-10 w-full max-w-md animate-scaleIn rounded-card border border-border bg-white p-5 shadow-menu outline-none"
      >
        <h2 id={titleId} className="font-sans text-h3 font-semibold text-ink">
          {title}
        </h2>
        <div className="mt-3 font-sans text-small text-muted">{children}</div>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {cancelLabel}
          </Button>
          {onConfirm && confirmLabel ? (
            <Button
              type="button"
              variant={danger ? 'danger' : 'primary'}
              loading={busy}
              onClick={onConfirm}
            >
              {confirmLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
