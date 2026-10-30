// ============================================================================
// ACTIVITY LOG CACHE — كاش سجل العمليات
// ----------------------------------------------------------------------------
// The index (src/activity-log-index.js) makes *reading* the log cheap; this
// module makes *re-reading* it free. Three caches, each with its own
// change-detection rule, so a cached value can never outlive the data it was
// derived from:
//
//   1. Card cache (per record)
//      The HTML of one activity card depends only on that record. Keying it by
//      a fingerprint of (timestamp, type, title, details, amount) means an
//      edited row rebuilds its card while every untouched row is reused — this
//      is what makes typing in the search box cost almost nothing after the
//      first render, since the matching cards are already built.
//
//   2. Query cache (per data snapshot)
//      A page of results is keyed by the whole collection signature plus the
//      exact (type, query, limit, offset). Any change to the collection bumps
//      the signature, which drops every cached page at once — no stale counts.
//
//   3. Paging state (persisted)
//      "The older history has been fully fetched" is the only fact that cannot
//      be recomputed from the rows themselves. It is stored through the local
//      IndexedDB cache (local-db kv store) together with the oldest key at the
//      time of completion, and is only trusted again if that key is still
//      present in memory. Lost cache ⇒ we simply page again.
//
// Everything is pure/injected except for the tiny localStorage-free helpers,
// so `node --test` covers it without a DOM.
// ============================================================================

import { oldestActivityLogKey } from './activity-log-index.js';

export const ACTIVITY_LOG_CURSOR_KEY = 'activityLogCursor';

/**
 * Identity of one rendered card. Two records with the same fingerprint render
 * to the same HTML; anything that appears in the card must be part of it.
 */
export function activityLogCardFingerprint(log) {
  if (!log || typeof log !== 'object') return '';
  return [
    log.timestamp ?? '',
    log.type ?? '',
    log.title ?? '',
    log.details ?? '',
    log.amount ?? '',
  ].join('\u0000');
}

/**
 * LRU-ish card cache: `get(id, fingerprint, build)` returns the remembered
 * HTML when the record is unchanged, otherwise rebuilds and remembers it.
 * `maxEntries` bounds memory (the log itself is capped at 500 rows in
 * appState, so this is generous); the oldest inserted entry is evicted first.
 */
export function createActivityLogCardCache({ maxEntries = 1500 } = {}) {
  const limit = Math.max(1, Math.floor(Number(maxEntries) || 1));
  const entries = new Map();
  let hits = 0;
  let misses = 0;
  let stale = 0;

  function touch(key, value) {
    entries.delete(key);
    entries.set(key, value);
    while (entries.size > limit) {
      const oldest = entries.keys().next().value;
      if (oldest === undefined) break;
      entries.delete(oldest);
    }
  }

  return {
    get(id, fingerprint, build) {
      const key = id === undefined || id === null ? '' : String(id);
      if (!key) return build();
      const cached = entries.get(key);
      if (cached && cached.fingerprint === fingerprint) {
        hits += 1;
        touch(key, cached);
        return cached.html;
      }
      if (cached) stale += 1; // the record changed under us
      misses += 1;
      const html = build();
      touch(key, { fingerprint, html });
      return html;
    },
    clear() {
      entries.clear();
    },
    size() {
      return entries.size;
    },
    stats() {
      return { size: entries.size, hits, misses, stale, maxEntries: limit };
    },
  };
}

/**
 * Result cache for the filtered/sorted pages. `get(signature, key, compute)`
 * drops everything as soon as the collection signature changes, so a new or
 * deleted log can never be served from an older page.
 */
export function createActivityLogQueryCache({ maxEntries = 16 } = {}) {
  const limit = Math.max(1, Math.floor(Number(maxEntries) || 1));
  const entries = new Map();
  let signature = null;
  let hits = 0;
  let misses = 0;
  let invalidations = 0;

  function reset(nextSignature) {
    entries.clear();
    signature = nextSignature;
  }

  return {
    get(currentSignature, key, compute) {
      if (currentSignature !== signature) {
        if (entries.size) invalidations += 1;
        reset(currentSignature);
      }
      const cacheKey = String(key);
      if (entries.has(cacheKey)) {
        hits += 1;
        const value = entries.get(cacheKey);
        entries.delete(cacheKey);
        entries.set(cacheKey, value);
        return value;
      }
      misses += 1;
      const value = compute();
      entries.set(cacheKey, value);
      while (entries.size > limit) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
      return value;
    },
    invalidate() {
      reset(null);
    },
    size() {
      return entries.size;
    },
    stats() {
      return { size: entries.size, hits, misses, invalidations, maxEntries: limit };
    },
  };
}

/**
 * The persisted paging fact: "nothing older than `oldestKey` is left".
 * `hasMore !== false` is intentionally not cached — the cursor for an
 * incomplete history is always recomputed from the rows in memory.
 */
export function buildActivityLogCursorMeta({ cursor = null, items = [], now = () => Date.now() } = {}) {
  const next = { hasMore: !(cursor && cursor.hasMore === false), oldestKey: null, savedAt: now() };
  const key = (cursor && cursor.oldestKey) || oldestActivityLogKey(items);
  next.oldestKey = key === undefined ? null : key;
  return next;
}

/**
 * A persisted "history complete" flag is only believed when the oldest record
 * it points at is still loaded. That keeps a cleared/stale local cache from
 * silently hiding the older half of the log.
 */
export function isActivityLogCompletionValid(meta, items = []) {
  if (!meta || typeof meta !== 'object') return false;
  if (meta.hasMore !== false) return false;
  if (!meta.oldestKey) return false;
  const target = String(meta.oldestKey);
  const list = Array.isArray(items) ? items : [];
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    if (!item || typeof item !== 'object') continue;
    const key = item._rtdbKey ?? item.id;
    if (key === undefined || key === null || key === '') continue;
    if (String(key) === target) return true;
  }
  return false;
}
