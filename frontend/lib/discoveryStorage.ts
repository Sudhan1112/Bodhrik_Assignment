const KEYS = {
  recentSearches: 'ledger.recentSearches',
  savedProviders: 'ledger.savedProviders',
  recentlyViewed: 'ledger.recentlyViewed',
  compare: 'ledger.compareProviders',
} as const;

export type RecentSearch = {
  what: string;
  where?: string;
  when?: string;
  at: number;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function getRecentSearches(): RecentSearch[] {
  return readJson<RecentSearch[]>(KEYS.recentSearches, []);
}

export function pushRecentSearch(entry: Omit<RecentSearch, 'at'>) {
  const next: RecentSearch = { ...entry, at: Date.now() };
  const prev = getRecentSearches().filter(
    (r) =>
      !(
        r.what === next.what &&
        (r.where || '') === (next.where || '') &&
        (r.when || '') === (next.when || '')
      ),
  );
  writeJson(KEYS.recentSearches, [next, ...prev].slice(0, 8));
}

export function clearRecentSearches() {
  writeJson(KEYS.recentSearches, []);
}

export function getSavedProviderIds(): string[] {
  return readJson<string[]>(KEYS.savedProviders, []);
}

export function isProviderSaved(id: string): boolean {
  return getSavedProviderIds().includes(id);
}

export function toggleSavedProvider(id: string): boolean {
  const ids = getSavedProviderIds();
  const i = ids.indexOf(id);
  if (i >= 0) {
    ids.splice(i, 1);
    writeJson(KEYS.savedProviders, ids);
    return false;
  }
  writeJson(KEYS.savedProviders, [id, ...ids]);
  return true;
}

export function getRecentlyViewedIds(): string[] {
  return readJson<string[]>(KEYS.recentlyViewed, []);
}

export function pushRecentlyViewed(id: string) {
  const prev = getRecentlyViewedIds().filter((x) => x !== id);
  writeJson(KEYS.recentlyViewed, [id, ...prev].slice(0, 10));
}

export type CompareItem = { id: string; label: string };

export function getCompareItems(): CompareItem[] {
  const raw = readJson<Array<string | CompareItem>>(KEYS.compare, []);
  return raw.map((x) => (typeof x === 'string' ? { id: x, label: x.slice(0, 8) } : x));
}

export function getCompareIds(): string[] {
  return getCompareItems().map((x) => x.id);
}

export function addCompareId(
  id: string,
  label?: string,
): { ok: boolean; reason?: string } {
  const items = getCompareItems();
  if (items.some((x) => x.id === id)) return { ok: true };
  if (items.length >= 3) return { ok: false, reason: 'You can compare up to 3 providers.' };
  writeJson(KEYS.compare, [...items, { id, label: label || id.slice(0, 8) }]);
  return { ok: true };
}

export function removeCompareId(id: string) {
  writeJson(
    KEYS.compare,
    getCompareItems().filter((x) => x.id !== id),
  );
}

export function clearCompare() {
  writeJson(KEYS.compare, []);
}

export function subscribeStorage(cb: () => void) {
  function onStorage(e: StorageEvent) {
    if (!e.key || Object.values(KEYS).includes(e.key as (typeof KEYS)[keyof typeof KEYS])) {
      cb();
    }
  }
  window.addEventListener('storage', onStorage);
  return () => window.removeEventListener('storage', onStorage);
}

/** Same-tab updates */
export function notifyDiscoveryChange() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event('ledger-discovery'));
}

export function onDiscoveryChange(cb: () => void) {
  if (typeof window === 'undefined') return () => undefined;
  const handler = () => cb();
  window.addEventListener('ledger-discovery', handler);
  const unsub = subscribeStorage(cb);
  return () => {
    window.removeEventListener('ledger-discovery', handler);
    unsub();
  };
}

// wrap writes to notify
const _pushRecent = pushRecentSearch;
export function pushRecentSearchAndNotify(entry: Omit<RecentSearch, 'at'>) {
  _pushRecent(entry);
  notifyDiscoveryChange();
}

export function toggleSavedProviderAndNotify(id: string): boolean {
  const r = toggleSavedProvider(id);
  notifyDiscoveryChange();
  return r;
}

export function pushRecentlyViewedAndNotify(id: string) {
  pushRecentlyViewed(id);
  notifyDiscoveryChange();
}

export function addCompareIdAndNotify(id: string, label?: string) {
  const r = addCompareId(id, label);
  if (r.ok) notifyDiscoveryChange();
  return r;
}

export function removeCompareIdAndNotify(id: string) {
  removeCompareId(id);
  notifyDiscoveryChange();
}

export function clearCompareAndNotify() {
  clearCompare();
  notifyDiscoveryChange();
}

export function clearRecentSearchesAndNotify() {
  clearRecentSearches();
  notifyDiscoveryChange();
}

/** Keep only IDs that still resolve; prune localStorage. */
export function setSavedProviderIds(ids: string[]) {
  writeJson(KEYS.savedProviders, ids);
}

export function setRecentlyViewedIds(ids: string[]) {
  writeJson(KEYS.recentlyViewed, ids.slice(0, 10));
}

/** Silent prune (no event) — use when loading to avoid refresh loops. */
export function pruneSavedProviders(validIds: string[]) {
  const current = getSavedProviderIds();
  if (
    current.length === validIds.length &&
    current.every((id, i) => id === validIds[i])
  ) {
    return false;
  }
  setSavedProviderIds(validIds);
  return true;
}

export function pruneRecentlyViewed(validIds: string[]) {
  const current = getRecentlyViewedIds();
  if (
    current.length === validIds.length &&
    current.every((id, i) => id === validIds[i])
  ) {
    return false;
  }
  setRecentlyViewedIds(validIds);
  return true;
}

export function pruneSavedProvidersAndNotify(validIds: string[]) {
  if (pruneSavedProviders(validIds)) notifyDiscoveryChange();
}

export function pruneRecentlyViewedAndNotify(validIds: string[]) {
  if (pruneRecentlyViewed(validIds)) notifyDiscoveryChange();
}

