'use client';

import { FormEvent, useState } from 'react';
import { replyToReview } from '@/lib/api';
import type { Review } from '@/lib/types';
import { Avatar } from './Avatar';
import { Button } from './Button';
import { Textarea } from './Input';
import { StarRating } from './StarRating';

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 14) return days + ' days ago';
  if (days < 60) return Math.round(days / 7) + ' weeks ago';
  return d.toLocaleDateString();
}

export function ReviewCard({
  review,
  canReply,
  onReplied,
}: {
  review: Review;
  canReply?: boolean;
  onReplied?: (r: Review) => void;
}) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const updated = await replyToReview(review.id, reply);
      onReplied?.(updated);
      setReply('');
    } catch {
      setError('Could not post reply.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border-b border-border py-5 last:border-0">
      <div className="flex items-start gap-3">
        <Avatar name={review.author_id.slice(0, 2).toUpperCase()} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StarRating value={review.rating} readOnly size="sm" />
            <span className="rounded-md bg-teal-soft px-2 py-0.5 font-sans text-caption font-semibold text-ink">
              Completed visit
            </span>
            <span className="font-sans text-caption text-muted">
              {relativeDate(review.created_at)}
            </span>
          </div>
          {review.comment ? (
            <p className="mt-2 font-sans text-small leading-relaxed text-ink/90">
              {review.comment}
            </p>
          ) : (
            <p className="mt-2 font-sans text-small text-muted">Rated without a written comment.</p>
          )}
          {review.provider_reply ? (
            <p className="mt-3 rounded-xl bg-canvas px-3 py-2 font-sans text-small text-muted">
              <span className="font-medium text-ink">Provider · </span>
              {review.provider_reply}
            </p>
          ) : null}
          {canReply && !review.provider_reply ? (
            <form onSubmit={submit} className="mt-3 space-y-2">
              <Textarea
                label="Reply to this review"
                rows={2}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                required
              />
              {error ? <p className="text-caption text-coral">{error}</p> : null}
              <Button type="submit" size="sm" loading={busy}>
                Post reply
              </Button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  );
}
