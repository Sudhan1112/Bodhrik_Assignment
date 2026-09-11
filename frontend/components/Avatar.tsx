'use client';

import { useEffect, useState } from 'react';

export function Avatar({
  name,
  src,
  size = 'md',
  className = '',
}: {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const sizes = {
    sm: 'h-8 w-8 text-caption',
    md: 'h-10 w-10 text-small',
    lg: 'h-12 w-12 text-body',
    xl: 'h-16 w-16 text-h3',
  };
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  useEffect(() => {
    setBroken(false);
  }, [src]);

  const showImage = Boolean(src) && !broken;

  return (
    <div
      className={
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-subtle font-sans font-semibold text-ink ring-1 ring-border ' +
        sizes[size] +
        ' ' +
        className
      }
      role={showImage ? 'img' : undefined}
      aria-label={showImage ? name : undefined}
      aria-hidden={!showImage}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src!}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initials || '?'
      )}
    </div>
  );
}
