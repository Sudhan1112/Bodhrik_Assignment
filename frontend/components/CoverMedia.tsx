'use client';

import { useEffect, useState } from 'react';
import { taxonomyTitleForProviderCategory } from '@/lib/taxonomy';

function initialsFrom(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
}

/** Cover media with deterministic initials/category fallback — never a blank gray box. */
export function CoverMedia({
  coverUrl,
  title,
  category,
  className = '',
  aspectClass = 'aspect-[16/10]',
}: {
  coverUrl?: string | null;
  title: string;
  category?: string | null;
  className?: string;
  aspectClass?: string;
}) {
  const [failed, setFailed] = useState(false);
  const categoryLabel = taxonomyTitleForProviderCategory(category);
  const initials = initialsFrom(title) || '?';

  useEffect(() => {
    setFailed(false);
  }, [coverUrl]);

  const showPhoto = Boolean(coverUrl) && !failed;

  return (
    <div className={'relative overflow-hidden bg-subtle ' + aspectClass + ' ' + className}>
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={coverUrl!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-med group-hover:scale-[1.03]"
          onError={() => setFailed(true)}
        />
      ) : (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-teal-soft/70 px-4 text-center"
          aria-hidden
        >
          <span className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            {initials}
          </span>
          <span className="font-sans text-caption font-medium text-muted">{categoryLabel}</span>
        </div>
      )}
      {showPhoto ? (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
      ) : null}
    </div>
  );
}
