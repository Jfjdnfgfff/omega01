// Bounded Realtime Database reads.
//
// The `lp?id=...&ns=...` requests Lighthouse flags come from Firebase's
// long-poll transport (`lp` = long poll). Their size is the size of the node
// you subscribed to: `ref(db, 'v2/sales')` downloads *every* sale ever written.
// A `limitToLast(n)` query downloads the newest n children only, and the rest
// of the history is fetched on demand with cursor pagination (`endBefore`).
//
// This module builds query *descriptors* (plain data, easy to unit test) and
// turns them into real `query()` objects with the modular SDK functions that
// `src/main.js` already loads dynamically.
//
//   tail  : newest N children          -> limitToLast(n)            [+ endBefore(cursor)]
//   head  : oldest N children, paging  -> limitToFirst(n) [startAfter(cursor)]
//   range : between two keys           -> orderByKey + startAt/endAt
//   none  : unbounded (small, authoritative nodes such as stats/privacy)

export const SECTION_WINDOW_LIMITS = Object.freeze({
  // Append-only collections: the live tail is what the UI shows.
  sales: 3000,
  activityLogs: 400,
  // Financial ledgers are *not* truncated by default: closing balances need
  // every movement. Window them only after adding a matching backfill pager.
  caisseLogs: 0,
  expenses: 0,
  customers: 0,
  products: 0,
});

/** Build a "newest N children" descriptor. */
export function tailWindow(path, limit, { before } = {}) {
  if (!path) throw new Error('tailWindow() needs a path');
  const size = Math.floor(Number(limit) || 0);
  if (size <= 0) return null;
  return { kind: 'tail', path, limit: size, before: before == null ? null : String(before) };
}

/** Build an "oldest N children after a cursor" descriptor (forward paging). */
export function headWindow(path, limit, { after } = {}) {
  if (!path) throw new Error('headWindow() needs a path');
  const size = Math.floor(Number(limit) || 0);
  if (size <= 0) return null;
  return { kind: 'head', path, limit: size, after: after == null ? null : String(after) };
}

/** Build a key-range descriptor: `startAt(from)` .. `endAt(to)`, bounded by `limit`. */
export function rangeWindow(path, { from, to, limit } = {}) {
  if (!path) throw new Error('rangeWindow() needs a path');
  const size = Math.floor(Number(limit) || 0);
  if (!from || !to) throw new Error('rangeWindow() needs from/to keys');
  return { kind: 'range', path, from: String(from), to: String(to), limit: size > 0 ? size : 0 };
}

/**
 * Pick the descriptor for a section, honouring per-section limits.
 * Returns `null` when the section must stay unbounded.
 */
export function describeSectionWindow(section, { path, limit } = {}) {
  const targetPath = path || section;
  const size = limit != null ? limit : SECTION_WINDOW_LIMITS[section];
  if (!size || size <= 0) return null;
  return tailWindow(targetPath, size);
}

/** Describe the *next older* page for a tail/history pager. */
export function olderPageSpec(path, { pageSize = 500, oldestKey = null } = {}) {
  return tailWindow(path, pageSize, { before: oldestKey });
}

/** True when the window is exhausted (fewer rows than requested). */
export function windowExhausted(receivedCount, limit) {
  return Number(receivedCount) < Number(limit || 0);
}

/**
 * Turn a descriptor into a real Firebase query.
 * `fns` = { ref, query, orderByKey, limitToLast, limitToFirst, startAfter, endBefore, startAt, endAt }
 */
export function buildWindowQuery(fns, database, spec) {
  if (!spec) throw new Error('buildWindowQuery() needs a descriptor');
  const { ref, query, orderByKey, limitToLast, limitToFirst, startAfter, endBefore, startAt, endAt } = fns;
  const base = ref(database, spec.path);
  if (spec.kind === 'tail') {
    const constraints = [orderByKey()];
    if (spec.before) constraints.push(endBefore(spec.before));
    constraints.push(limitToLast(spec.limit));
    return query(base, ...constraints);
  }
  if (spec.kind === 'head') {
    const constraints = [orderByKey()];
    if (spec.after) constraints.push(startAfter(spec.after));
    constraints.push(limitToFirst(spec.limit));
    return query(base, ...constraints);
  }
  if (spec.kind === 'range') {
    const constraints = [orderByKey(), startAt(spec.from), endAt(spec.to)];
    if (spec.limit > 0) constraints.push(limitToLast(spec.limit));
    return query(base, ...constraints);
  }
  throw new Error(`Unknown window kind: ${spec.kind}`);
}

/**
 * Trim a merged list to the newest `limit` entries, keeping `keyOf` ordering.
 * Used by pagers so an in-memory window can never grow without bound.
 */
export function trimWindow(items, limit, keyOf = item => item?._rtdbKey ?? item?.id) {
  const list = Array.isArray(items) ? items : [];
  const size = Math.floor(Number(limit) || 0);
  if (size <= 0 || list.length <= size) return list;
  const sorted = list.slice().sort((a, b) => compareKeys(keyOf(a), keyOf(b)));
  return sorted.slice(sorted.length - size);
}

/** Compare RTDB keys: numeric keys numerically, string keys lexicographically. */
export function compareKeys(a, b) {
  const sa = a == null ? '' : String(a);
  const sb = b == null ? '' : String(b);
  const na = Number(sa);
  const nb = Number(sb);
  if (sa !== '' && sb !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  if (sa === sb) return 0;
  return sa < sb ? -1 : 1;
}
