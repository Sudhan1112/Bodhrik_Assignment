import { ButtonHTMLAttributes } from 'react';

const variants = {
  primary:
    'bg-teal text-white hover:bg-teal-dark active:bg-teal-dark focus-visible:ring-2 focus-visible:ring-teal/30',
  secondary:
    'border border-border bg-white text-ink hover:bg-subtle active:bg-subtle focus-visible:ring-2 focus-visible:ring-teal/20',
  ghost:
    'bg-transparent text-muted hover:bg-subtle hover:text-ink active:bg-subtle focus-visible:ring-2 focus-visible:ring-teal/20',
  danger:
    'border border-coral/30 bg-white text-coral hover:bg-coral hover:text-white active:bg-coral focus-visible:ring-2 focus-visible:ring-coral/30',
};

const sizes = {
  sm: 'h-9 px-3.5 text-small',
  md: 'h-10 px-4 text-small',
  lg: 'h-11 px-5 text-body',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  loading?: boolean;
}) {
  return (
    <button
      className={
        'inline-flex items-center justify-center gap-2 rounded-control font-sans font-medium transition-all duration-fast disabled:pointer-events-none disabled:opacity-40 ' +
        variants[variant] +
        ' ' +
        sizes[size] +
        ' ' +
        className
      }
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? (
        <span
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      ) : null}
      {children}
    </button>
  );
}
