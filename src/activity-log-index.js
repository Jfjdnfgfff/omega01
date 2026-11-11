// ============================================================================
// ACTIVITY LOG INDEX — فهرس سجل العمليات
// ----------------------------------------------------------------------------
// Opening the log (or typing one letter in its search box) used to rebuild the
// working set from scratch: copy the whole array, lowercase every title and
// details string, filter, then sort newest-first — right before a large
// innerHTML write. With the realtime window (SECTION_WINDOW_LIMITS.activityLogs
// = 400) plus cached history that is `O(n log n)` sorting and `O(total text)`
// of string allocation on the main thread, repeated on *every* keystroke.
//
// This module builds the index once per data change and answers queries from
// it:
//
//   entries : newest-first list of { id, log, ts, type, text }
//   byId    : id → entry            (O(1) lookup, e.g. delete by id)
//   byType  : type → newest-first entries
//   counts  : type → number of records
//   text    : pre-normalised search blob (diacritics stripped, Arabic
//             letter variants unified) computed once per record
//
// A render therefore costs one linear filtered pass over an already sorted
// list: no array copy, no re-sort, no repeated normalisation. The index is
// memoised and rebuilt only when `activityLogsSignature()` reports a change,
// so the steady state for search-as-you-type is "read the cached index".
//
// Everything here is pure and environment-agnostic (no DOM, no timers), which
// keeps it unit-testable under `node --test`.
// ============================================================================

// Tashkeel / Quranic marks + tatweel: they never carry meaning for search.
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * Search-side normalisation. Applied to BOTH the indexed records and the
 * user's query, so it can only widen matches — never break an exact one.
 *   - lower case (Latin product names such as "Whey")
 *   - Arabic diacritics / tatweel removed
 *   - آ أ إ ٱ → ا  and  ى → ي  and  ة → ه  (the variants users skip on a phone)
 *   - whitespace collapsed so "  whey   gold " matches "whey gold"
 */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(ARABIC_MARKS, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Timestamps are stored as ISO strings by `logActivity`, but older rows may
 * carry numbers (or nothing at all). Normalise to epoch ms; unusable values
 * sort last instead of poisoning the comparator with NaN.
 */
export function toActivityLogTime(value) {
  if (value == null || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

const EMPTY_LOGS = Object.freeze([]);

/**
 * Cheap change detector: `len:hash` over every id + timestamp. Any add,
 * delete, replace, truncation or re-order changes it, which is what lets the
 * indexer keep a cached index without ever serving stale rows (the viewer's
 * delete / clear / sync paths all mutate through those two fields).
 */
export function activityLogsSignature(logs) {
  const list = Array.isArray(logs) ? logs : EMPTY_LOGS;
  let hash = list.length | 0;
  for (let i = 0; i < list.length; i += 1) {
    const log = list[i];
    const id = log && typeof log === 'object' ? String(log.id ?? '') : String(log ?? '');
    for (let j = 0; j < id.length; j += 1) hash = (hash * 31 + id.charCodeAt(j)) | 0;
    hash = (hash * 31 + (toActivityLogTime(log && log.timestamp) | 0)) | 0;
  }
  return `${list.length}:${hash}`;
}

function logTypeOf(log) {
  const type = log && log.type != null ? String(log.type) : '';
  return type || 'system';
}

/**
 * Build the immutable index for a log array. Invalid rows are skipped (the
 * same rows the viewer could not render before either), duplicates are kept
 * as-is so counts stay faithful to the stored data — `byId` simply points at
 * the newest occurrence.
 */
export function buildActivityLogIndex(logs = EMPTY_LOGS) {
  const source = Array.isArray(logs) ? logs : EMPTY_LOGS;
  const entries = [];
  const byId = new Map();
  const byType = new Map();
  const counts = {};

  for (let i = 0; i < source.length; i += 1) {
    const log = source[i];
    if (!log || typeof log !== 'object') continue;
    const id = log.id == null ? '' : String(log.id);
    const entry = {
      id,
      log,
      ts: toActivityLogTime(log.timestamp),
      type: logTypeOf(log),
      text: normalizeSearchText(`${log.title || ''} ${log.details || ''}`),
    };
    entries.push(entry);
    if (id && !byId.has(id)) byId.set(id, entry);
  }

  // Modern engines sort stably, so equal timestamps keep their source order —
  // the same tie-breaking the previous inline sort had.
  entries.sort((a, b) => b.ts - a.ts);

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    let bucket = byType.get(entry.type);
    if (!bucket) {
      bucket = [];
      byType.set(entry.type, bucket);
    }
    bucket.push(entry);
    counts[entry.type] = (counts[entry.type] || 0) + 1;
  }

  return {
    size: entries.length,
    entries,
    byId,
    byType,
    counts,
    types: Array.from(byType.keys()),
  };
}

/**
 * Query the index: type bucket first (already newest-first), then the search
 * tokens against the pre-normalised text. `matched` is the full number of
 * hits, so the UI can print "N عملية" while rendering only one page and know
 * how much is left.
 *
 * @param {object} index result of buildActivityLogIndex()
 * @param {{query?: string, type?: string, limit?: number, offset?: number}} options
 *        `limit <= 0` means "no page limit"; `type` 'all' or '' means no filter.
 * @returns {{items: object[], matched: number, total: number, hasMore: boolean, offset: number}}
 */
export function queryActivityLogPage(index, { query = '', type = 'all', limit = 0, offset = 0 } = {}) {
  const pageLimit = Math.max(0, Math.floor(Number(limit) || 0));
  const start = Math.max(0, Math.floor(Number(offset) || 0));
  const empty = { items: [], matched: 0, total: 0, hasMore: false, offset: start };
  if (!index) return empty;

  const useType = Boolean(type) && type !== 'all';
  const source = useType ? (index.byType.get(String(type)) || EMPTY_LOGS) : index.entries;
  const tokens = normalizeSearchText(query).split(' ').filter(Boolean);

  // No search terms: the bucket is already sorted newest-first, so the page is
  // a plain slice and the count is the bucket length — O(page), not O(rows).
  if (!tokens.length) {
    const matched = source.length;
    const end = pageLimit > 0 ? Math.min(matched, start + pageLimit) : matched;
    const items = [];
    for (let i = start; i < end; i += 1) items.push(source[i].log);
    return { items, matched, total: matched, hasMore: matched > start + items.length, offset: start };
  }

  const items = [];
  let matched = 0;
  for (let i = 0; i < source.length; i += 1) {
    const entry = source[i];
    if (tokens.length) {
      let hit = true;
      for (let t = 0; t < tokens.length; t += 1) {
        if (!entry.text.includes(tokens[t])) { hit = false; break; }
      }
      if (!hit) continue;
    }
    if (matched >= start && (pageLimit === 0 || items.length < pageLimit)) items.push(entry.log);
    matched += 1;
  }

  return { items, matched, total: source.length, hasMore: matched > start + items.length, offset: start };
}

/** Convenience wrapper when only the matching logs are needed. */
export function queryActivityLogs(index, options = {}) {
  return queryActivityLogPage(index, options).items;
}

// RTDB key ordering, numeric-aware ("10" after "2"), the same rule the sales
// pager uses. Used to find the oldest key currently in memory, i.e. the
// `endBefore()` cursor for the next older page.
export function compareActivityLogKeys(a, b) {
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  const na = Number(sa);
  const nb = Number(sb);
  if (sa !== '' && sb !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) {
    return na < nb ? -1 : na > nb ? 1 : 0;
  }
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

/** The oldest RTDB key held by `items` (their `_rtdbKey`, else their id). */
export function oldestActivityLogKey(items = EMPTY_LOGS) {
  let oldest = null;
  const list = Array.isArray(items) ? items : EMPTY_LOGS;
  for (let i = 0; i < list.length; i += 1) {
    const item = list[i];
    if (!item || typeof item !== 'object') continue;
    const raw = item._rtdbKey ?? item.id;
    if (raw === undefined || raw === null || raw === '') continue;
    const key = String(raw);
    if (oldest === null || compareActivityLogKeys(key, oldest) < 0) oldest = key;
  }
  return oldest;
}

/**
 * Cursor bookkeeping after one older page came back from the cloud:
 * `oldestKey` moves to the oldest fetched key (so the next request asks for
 * strictly older rows), and `hasMore` becomes false on a short/empty page —
 * the standard "fewer than a full page means the end" rule.
 */
export function advanceActivityLogCursor({ items = [], pageSize = 100, cursor = {} } = {}) {
  const fetched = Array.isArray(items) ? items : [];
  const size = Math.max(1, Math.floor(Number(pageSize) || 1));
  const next = { oldestKey: cursor && cursor.oldestKey != null ? cursor.oldestKey : null, hasMore: true };
  if (cursor && cursor.hasMore === false) next.hasMore = false;
  if (!fetched.length) {
    next.hasMore = false;
    return next;
  }
  const oldestFetched = oldestActivityLogKey(fetched);
  if (oldestFetched !== null) next.oldestKey = oldestFetched;
  if (fetched.length < size) next.hasMore = false;
  return next;
}

/**
 * Memoised index holder. `get(logs)` returns the cached index while the array
 * reference *and* the signature are unchanged, and rebuilds otherwise.
 */
export function createActivityLogIndexer() {
  let source = null;
  let signature = null;
  let index = null;
  let builds = 0;

  return {
    get(logs) {
      const arr = Array.isArray(logs) ? logs : EMPTY_LOGS;
      const nextSignature = activityLogsSignature(arr);
      if (index && arr === source && nextSignature === signature) return index;
      index = buildActivityLogIndex(arr);
      source = arr;
      signature = nextSignature;
      builds += 1;
      return index;
    },
    invalidate() {
      source = null;
      signature = null;
      index = null;
    },
    stats() {
      return { builds, size: index ? index.size : 0, signature };
    },
  };
}
