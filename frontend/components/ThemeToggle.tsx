'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'ledger.theme';

export type ThemeMode = 'light' | 'dark';

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'dark') root.classList.add('dark');
  else root.classList.remove('dark');
}

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function setTheme(mode: ThemeMode) {
  applyTheme(mode);
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    /* ignore */
  }
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  const [mode, setMode] = useState<ThemeMode>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMode(getStoredTheme());
    setMounted(true);
  }, []);

  function toggle() {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        'inline-flex h-10 w-10 items-center justify-center rounded-control border border-border text-muted transition-colors duration-fast hover:bg-subtle hover:text-ink ' +
        className
      }
      aria-label={mounted && mode === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      title={mounted && mode === 'dark' ? 'Light theme' : 'Dark theme'}
    >
      <span aria-hidden className="text-base leading-none">
        {mounted && mode === 'dark' ? '☀' : '☾'}
      </span>
    </button>
  );
}
