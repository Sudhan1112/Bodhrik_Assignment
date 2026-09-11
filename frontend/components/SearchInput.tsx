'use client';

import { ButtonHTMLAttributes } from 'react';

/**
 * Visual search trigger for Phase 1.
 * Full search state machine comes in a later phase.
 */
export function SearchInput({
  placeholder = 'Search services, providers…',
  onActivate,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  placeholder?: string;
  onActivate?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={
        'focus-host flex h-10 w-full items-center gap-2 rounded-control border border-border bg-surface px-3 text-left font-sans text-small text-muted transition-all duration-fast hover:border-ink/20 hover:bg-subtle focus-visible:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal/20 ' +
        className
      }
      aria-label={placeholder}
      {...rest}
    >
      <span aria-hidden className="text-muted">
        ⌕
      </span>
      <span className="truncate">{placeholder}</span>
    </button>
  );
}
