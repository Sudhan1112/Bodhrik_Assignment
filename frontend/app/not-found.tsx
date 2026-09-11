import Link from 'next/link';
import { Button } from '@/components/Button';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg animate-fadeUp py-16 text-center">
      <p className="eyebrow">404</p>
      <h1 className="type-h1 mt-2">Page not found</h1>
      <p className="mt-3 font-sans text-body text-muted">
        That page doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/">
          <Button>Go home</Button>
        </Link>
        <Link href="/explore">
          <Button variant="secondary">Explore providers</Button>
        </Link>
        <Link href="/help">
          <Button variant="ghost">Help</Button>
        </Link>
      </div>
    </div>
  );
}
