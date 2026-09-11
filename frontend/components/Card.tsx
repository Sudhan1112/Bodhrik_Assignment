import { HTMLAttributes } from 'react';

export function Card({
  className = '',
  padded = true,
  shadow = false,
  children,
  ...rest
}: HTMLAttributes<HTMLDivElement> & {
  padded?: boolean;
  shadow?: boolean;
}) {
  return (
    <div
      className={
        'rounded-card border border-border bg-surface ' +
        (padded ? 'p-4 sm:p-5 ' : '') +
        (shadow ? 'shadow-soft ' : '') +
        className
      }
      {...rest}
    >
      {children}
    </div>
  );
}
