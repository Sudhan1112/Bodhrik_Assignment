'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  getCompareItems,
  onDiscoveryChange,
  removeCompareIdAndNotify,
  type CompareItem,
} from '@/lib/discoveryStorage';
import { Button } from './Button';

export function CompareTray() {
  const [items, setItems] = useState<CompareItem[]>([]);

  useEffect(() => {
    function sync() {
      setItems(getCompareItems());
    }
    sync();
    return onDiscoveryChange(sync);
  }, []);

  if (!items.length) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3 md:bottom-4 md:px-6">
      <div className="mx-auto flex max-w-shell animate-fadeUp items-center justify-between gap-3 rounded-card border border-border bg-white p-3 shadow-menu">
        <div className="min-w-0">
          <p className="font-sans text-caption font-semibold text-muted">
            Compare · {items.length}/3
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {items.map((item) => (
              <span
                key={item.id}
                className="inline-flex max-w-[10rem] items-center gap-1 truncate rounded-md bg-subtle px-2 py-1 font-sans text-caption text-ink"
              >
                <span className="truncate">{item.label}</span>
                <button
                  type="button"
                  className="shrink-0 text-muted hover:text-ink"
                  aria-label={'Remove ' + item.label}
                  onClick={() => removeCompareIdAndNotify(item.id)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
        <Link href="/compare">
          <Button size="sm">Compare</Button>
        </Link>
      </div>
    </div>
  );
}
