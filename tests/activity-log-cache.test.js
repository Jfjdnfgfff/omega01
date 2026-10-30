import test from 'node:test';
import assert from 'node:assert/strict';

import {
  activityLogCardFingerprint,
  createActivityLogCardCache,
  createActivityLogQueryCache,
  buildActivityLogCursorMeta,
  isActivityLogCompletionValid,
  ACTIVITY_LOG_CURSOR_KEY,
} from '../src/activity-log-cache.js';

const log = (over = {}) => ({
  id: 'act_1',
  timestamp: '2026-10-01T08:00:00.000Z',
  type: 'sale',
  title: 'بيع منتج',
  details: 'الكمية: 2',
  amount: 7000,
  ...over,
});

test('the cache key is a stable storage key', () => {
  assert.equal(ACTIVITY_LOG_CURSOR_KEY, 'activityLogCursor');
});

test('a card fingerprint changes with every field the card renders', () => {
  const base = activityLogCardFingerprint(log());
  assert.equal(activityLogCardFingerprint(log()), base, 'same record ⇒ same fingerprint');

  for (const patch of [
    { timestamp: '2026-10-02T08:00:00.000Z' },
    { type: 'expense' },
    { title: 'بيع منتج آخر' },
    { details: 'الكمية: 3' },
    { amount: 0 },
  ]) {
    assert.notEqual(activityLogCardFingerprint(log(patch)), base, `change not detected: ${JSON.stringify(patch)}`);
  }

  assert.equal(activityLogCardFingerprint(null), '');
});

test('the card cache reuses unchanged cards and rebuilds edited ones', () => {
  const cache = createActivityLogCardCache();
  let builds = 0;
  const build = () => { builds += 1; return `<card>${builds}</card>`; };

  const first = cache.get('act_1', 'fp-1', build);
  const second = cache.get('act_1', 'fp-1', build);
  assert.equal(first, second, 'unchanged record must be served from cache');
  assert.equal(builds, 1);
  assert.deepEqual(cache.stats(), { size: 1, hits: 1, misses: 1, stale: 0, maxEntries: 1500 });

  const edited = cache.get('act_1', 'fp-2', build);
  assert.notEqual(edited, first, 'edited record must be rebuilt');
  assert.equal(builds, 2);
  assert.equal(cache.stats().stale, 1);
});

test('rows without an id are always built, and the cache is bounded', () => {
  const cache = createActivityLogCardCache({ maxEntries: 2 });
  let builds = 0;
  const build = () => { builds += 1; return String(builds); };
  cache.get(undefined, 'fp', build);
  cache.get('', 'fp', build);
  assert.equal(builds, 2, 'anonymous rows cannot be cached safely');

  cache.get('a', 'fp', build);
  cache.get('b', 'fp', build);
  cache.get('c', 'fp', build);
  assert.equal(cache.size(), 2, 'eviction must keep the cache bounded');

  // 'a' was evicted, so it is rebuilt; 'c' (newest) is still cached.
  const before = builds;
  cache.get('c', 'fp', build);
  assert.equal(builds, before);
  cache.get('a', 'fp', build);
  assert.equal(builds, before + 1);

  cache.clear();
  assert.equal(cache.size(), 0);
});

test('the query cache is keyed by data signature and filter', () => {
  const cache = createActivityLogQueryCache();
  let computes = 0;
  const compute = (value) => () => { computes += 1; return { items: [value] }; };

  const a = cache.get('sig-1', 'all|empty|100', compute('a'));
  const b = cache.get('sig-1', 'all|empty|100', compute('a'));
  assert.equal(a, b);
  assert.equal(computes, 1);

  cache.get('sig-1', 'sale|وhey|100', compute('x'));
  assert.equal(computes, 2);

  // A changed collection invalidates every cached page at once.
  const c = cache.get('sig-2', 'all|empty|100', compute('a'));
  assert.equal(computes, 3);
  assert.notEqual(c, a);
  assert.equal(cache.stats().invalidations, 1);

  cache.invalidate();
  assert.equal(cache.size(), 0);
});

test('the query cache stays bounded', () => {
  const cache = createActivityLogQueryCache({ maxEntries: 2 });
  let computes = 0;
  const compute = () => { computes += 1; return { items: [], matched: 0 }; };
  for (const key of ['k1', 'k2', 'k3']) cache.get('sig', key, compute);
  assert.equal(cache.size(), 2);
  assert.equal(computes, 3);
  cache.get('sig', 'k3', compute);
  assert.equal(computes, 3, 'the newest key is still cached');
  cache.get('sig', 'k1', compute);
  assert.equal(computes, 4, 'the evicted key is recomputed');
});

test('the persisted paging meta records completion and the oldest key', () => {
  const items = [{ id: 'a1', _rtdbKey: 'k1' }, { id: 'a2', _rtdbKey: 'k2' }];

  const incomplete = buildActivityToolMeta({ cursor: { oldestKey: null, hasMore: true }, items });
  assert.deepEqual(incomplete, { hasMore: true, oldestKey: 'k1', savedAt: 1234 });

  const complete = buildActivityToolMeta({ cursor: { oldestKey: 'k0', hasMore: false }, items });
  assert.deepEqual(complete, { hasMore: false, oldestKey: 'k0', savedAt: 1234 });

  // No cursor and no rows ⇒ nothing to remember.
  assert.deepEqual(buildActivityToolMeta({ cursor: null, items: [] }), { hasMore: true, oldestKey: null, savedAt: 1234 });
});

function buildActivityToolMeta(options) {
  return buildActivityLogCursorMeta({ ...options, now: () => 1234 });
}

test('the completion flag is only trusted while its oldest record is loaded', () => {
  const items = [{ id: 'a1', _rtdbKey: 'k1' }, { id: 'a2', _rtdbKey: 'k2' }];
  const meta = { hasMore: false, oldestKey: 'k1' };

  assert.equal(isActivityLogCompletionValid(meta, items), true);
  // Rows without an RTDB key fall back to their id.
  assert.equal(isActivityLogCompletionValid({ hasMore: false, oldestKey: 'a2' }, [{ id: 'a2' }]), true);

  assert.equal(isActivityLogCompletionValid(null, items), false);
  assert.equal(isActivityLogCompletionValid({ hasMore: true, oldestKey: 'k1' }, items), false);
  assert.equal(isActivityLogCompletionValid({ hasMore: false }, items), false);
  assert.equal(isActivityLogCompletionValid(meta, []), false, 'a lost local cache must refetch');
  assert.equal(isActivityLogCompletionValid(meta, [{ id: 'other' }]), false);
  assert.equal(isActivityLogCompletionValid(meta, [null, 'junk']), false);
});
