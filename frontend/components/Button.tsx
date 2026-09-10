import { ButtonHTMLAttributes } from 'react';

const variants = {
  primary: 'bg-teal text-white hover:bg-teal-dark',
  secondary: 'border border-ink/20 bg-white text-ink hover:border-teal hover:text-teal',
  ghost: 'text-muted hover:text-ink',
  danger: 'border border-coral/40 text-coral hover:bg-coral hover:text-white',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2.5 text-sm',
  lg: 'px-6 py-3 text-sm',
};

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}) {
  return (
    <button
      className={
        'inline-flex items-center justify-center rounded-full font-sans font-medium transition-colors disabled:opacity-50 ' +
        variants[variant] +
        ' ' +
        sizes[size] +
        ' ' +
        className
      }
      {...props}
    />
  );
}
