import Link from 'next/link';
import { Button } from './Button';

export function EmptyState({
  title,
  description,
  actionHref,
  actionLabel,
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="panel px-6 py-12 text-center animate-fadeUp">
      <h3 className="font-display text-xl text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-md font-sans text-sm text-muted">{description}</p>
      {actionHref && actionLabel ? (
        <Link href={actionHref} className="mt-6 inline-block">
          <Button>{actionLabel}</Button>
        </Link>
      ) : null}
    </div>
  );
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={'animate-pulseSoft rounded-xl bg-border/70 ' + className} />;
}
