import Link from 'next/link';
import { Button } from './Button';

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div
      className="rounded-card border border-dashed border-border bg-canvas px-6 py-12 text-center"
      role="status"
    >
      <h3 className="font-sans text-h3 font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md font-sans text-small text-muted">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-6 inline-block">
          <Button>{actionLabel}</Button>
        </Link>
      ) : null}
      {onAction && actionLabel && !actionHref ? (
        <Button className="mt-6" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={'animate-pulseSoft rounded-control bg-subtle ' + className} aria-hidden />
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
}: {
  title?: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="rounded-card border border-coral/20 bg-coral/5 px-4 py-4 font-sans"
      role="alert"
    >
      <p className="text-small font-semibold text-coral">{title}</p>
      <p className="mt-1 text-small text-coral/90">{message}</p>
      {onRetry ? (
        <Button type="button" size="sm" variant="secondary" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

/** Alias used by existing pages */
export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return <ErrorState message={message} onRetry={onRetry} />;
}

export function SuccessBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-card border border-teal/20 bg-teal-soft px-4 py-3 font-sans text-small text-ink"
      role="status"
      aria-live="polite"
    >
      {message}
    </div>
  );
}
