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

  return (
    <div
      className={
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-subtle font-sans font-semibold text-ink ring-1 ring-border ' +
        sizes[size] +
        ' ' +
        className
      }
      style={
        src
          ? {
              backgroundImage: 'url(' + src + ')',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
      role={src ? 'img' : undefined}
      aria-label={src ? name : undefined}
      aria-hidden={!src}
    >
      {!src ? initials || '?' : null}
    </div>
  );
}
