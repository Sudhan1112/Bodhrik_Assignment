'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FormEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { listProviders } from '@/lib/api';
import {
  clearRecentSearchesAndNotify,
  getRecentSearches,
  pushRecentSearchAndNotify,
  type RecentSearch,
} from '@/lib/discoveryStorage';
import { popularSearchChips, TAXONOMY } from '@/lib/taxonomy';
import type { Provider } from '@/lib/types';
import { Button } from './Button';

type Suggestion =
  | { kind: 'service'; label: string; href: string }
  | { kind: 'category'; label: string; href: string }
  | { kind: 'provider'; label: string; href: string; id: string };

function buildStaticSuggestions(q: string): Suggestion[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const out: Suggestion[] = [];
  // Aliases that users type but map to searchable explore queries
  const aliases: Array<{ match: string; label: string; q: string; category: string }> = [
    { match: 'haircut', label: 'Cut', q: 'Cut', category: 'salon' },
    { match: 'hair cut', label: 'Cut', q: 'Cut', category: 'salon' },
    { match: 'hair coloring', label: 'Colour', q: 'Colour', category: 'salon' },
    { match: 'hair colouring', label: 'Colour', q: 'Colour', category: 'salon' },
  ];
  for (const a of aliases) {
    if (a.match.includes(needle) || needle.includes(a.match.split(' ')[0]!)) {
      out.push({
        kind: 'service',
        label: a.label,
        href:
          '/explore?q=' + encodeURIComponent(a.q) + '&category=' + a.category,
      });
    }
  }
  for (const t of TAXONOMY) {
    for (const s of t.popularServices) {
      if (s.toLowerCase().includes(needle)) {
        out.push({
          kind: 'service',
          label: s,
          href:
            '/explore?q=' +
            encodeURIComponent(s) +
            '&category=' +
            (t.providerTypes[0] || ''),
        });
      }
    }
    if (
      t.title.toLowerCase().includes(needle) ||
      t.slug.includes(needle) ||
      t.providerTypes.some((p) => p.includes(needle))
    ) {
      out.push({
        kind: 'category',
        label: t.title,
        href: '/categories/' + t.slug,
      });
    }
  }
  return out;
}

export function SearchOverlay({
  open,
  onClose,
  initialQuery = '',
}: {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const [query, setQuery] = useState(initialQuery);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [recent, setRecent] = useState<RecentSearch[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setRecent(getRecentSearches());
    setActiveIndex(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(t);
  }, [open, initialQuery]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setProviders([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const handle = window.setTimeout(() => {
      listProviders({ q, limit: 6 })
        .then((res) => setProviders(res.items))
        .catch(() => setProviders([]))
        .finally(() => setLoading(false));
    }, 180);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  const suggestions = useMemo(() => {
    const statics = buildStaticSuggestions(query);
    const providerSug: Suggestion[] = providers.map((p) => ({
      kind: 'provider' as const,
      label: p.business_name || p.full_name,
      href: '/providers/' + p.id,
      id: p.id,
    }));
    // dedupe by href
    const seen = new Set<string>();
    const merged: Suggestion[] = [];
    for (const s of [...statics, ...providerSug]) {
      if (seen.has(s.href)) continue;
      seen.add(s.href);
      merged.push(s);
    }
    return merged.slice(0, 12);
  }, [query, providers]);

  const goExplore = useCallback(
    (what: string, where?: string) => {
      const params = new URLSearchParams();
      if (what) params.set('q', what);
      if (where) params.set('city', where);
      pushRecentSearchAndNotify({ what, where });
      onClose();
      router.push('/explore' + (params.toString() ? '?' + params.toString() : ''));
    },
    [onClose, router],
  );

  function selectSuggestion(s: Suggestion) {
    pushRecentSearchAndNotify({ what: s.label });
    onClose();
    router.push(s.href);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (suggestions[activeIndex]) {
      selectSuggestion(suggestions[activeIndex]);
      return;
    }
    goExplore(query.trim());
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
      return;
    }
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
    }
  }

  if (!open) return null;

  const groups = {
    service: suggestions.filter((s) => s.kind === 'service'),
    category: suggestions.filter((s) => s.kind === 'category'),
    provider: suggestions.filter((s) => s.kind === 'provider'),
  };
  const flatIndex = (s: Suggestion) => suggestions.findIndex((x) => x.href === s.href);
  const showEmptyPrompt = !query.trim();
  const showNoMatch = query.trim().length >= 2 && !loading && suggestions.length === 0;

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-ink/30 animate-fadeIn"
        aria-label="Close search"
        onClick={onClose}
      />
      <div
        className="absolute inset-x-0 top-0 animate-fadeUp border-b border-border bg-surface shadow-menu sm:inset-x-auto sm:left-1/2 sm:top-16 sm:w-full sm:max-w-[45rem] sm:-translate-x-1/2 sm:rounded-card sm:border"
        role="dialog"
        aria-modal="true"
        aria-label="Search"
      >
        <form onSubmit={onSubmit} className="border-b border-border p-3 sm:p-4">
          <label className="sr-only" htmlFor="ledger-search-overlay">
            Search
          </label>
          <div className="focus-host flex items-center gap-2 rounded-control border border-border bg-surface px-3 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/20">
            <span aria-hidden className="text-muted">
              ⌕
            </span>
            <input
              id="ledger-search-overlay"
              ref={inputRef}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="What are you looking for?"
              className="h-11 w-full bg-transparent font-sans text-small text-ink outline-none placeholder:text-muted"
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={
                suggestions[activeIndex]
                  ? listId + '-' + activeIndex
                  : undefined
              }
            />
            <Button type="submit" size="sm">
              Search
            </Button>
          </div>
        </form>

        <div id={listId} className="max-h-[70vh] overflow-y-auto p-2 sm:max-h-96" role="listbox">
          {showEmptyPrompt ? (
            <div className="px-2 py-3">
              <p className="px-1 font-sans text-small text-muted">
                Search for a service, provider, or category.
              </p>
              {recent.length ? (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <p className="font-sans text-caption font-semibold uppercase tracking-wide text-muted">
                      Recent searches
                    </p>
                    <button
                      type="button"
                      className="font-sans text-caption text-teal hover:underline"
                      onClick={() => {
                        clearRecentSearchesAndNotify();
                        setRecent([]);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <ul className="space-y-0.5">
                    {recent.map((r) => (
                      <li key={r.at + r.what}>
                        <button
                          type="button"
                          className="w-full rounded-control px-2 py-2 text-left font-sans text-small hover:bg-subtle"
                          onClick={() => goExplore(r.what, r.where)}
                        >
                          {r.what}
                          {r.where ? ' · ' + r.where : ''}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="mt-4">
                  <p className="mb-2 px-1 font-sans text-caption font-semibold uppercase tracking-wide text-muted">
                    Try searching
                  </p>
                  <div className="flex flex-wrap gap-2 px-1">
                    {popularSearchChips().map((c) => (
                      <Link
                        key={c.href + c.label}
                        href={c.href}
                        onClick={onClose}
                        className="rounded-full border border-border px-3 py-1 font-sans text-caption hover:border-teal hover:text-teal"
                      >
                        {c.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {loading && query.trim().length >= 2 ? (
            <p className="px-3 py-4 font-sans text-small text-muted">Searching…</p>
          ) : null}

          {showNoMatch ? (
            <p className="px-3 py-6 font-sans text-small text-muted">
              No results. Try another service, category, or provider name.
            </p>
          ) : null}

          {(['service', 'category', 'provider'] as const).map((kind) => {
            const items = groups[kind];
            if (!items.length) return null;
            const title =
              kind === 'service' ? 'Services' : kind === 'category' ? 'Categories' : 'Providers';
            return (
              <div key={kind} className="mb-2">
                <p className="px-2 py-1.5 font-sans text-caption font-semibold uppercase tracking-wide text-muted">
                  {title}
                </p>
                <ul>
                  {items.map((s) => {
                    const idx = flatIndex(s);
                    const active = idx === activeIndex;
                    return (
                      <li key={s.href}>
                        <button
                          type="button"
                          id={listId + '-' + idx}
                          role="option"
                          aria-selected={active}
                          className={
                            'w-full rounded-control px-2 py-2 text-left font-sans text-small transition-colors duration-fast ' +
                            (active ? 'bg-teal-soft text-teal' : 'hover:bg-subtle')
                          }
                          onMouseEnter={() => setActiveIndex(idx)}
                          onClick={() => selectSuggestion(s)}
                        >
                          {s.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
