import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SECTION_WINDOW_LIMITS,
  tailWindow,
  headWindow,
  rangeWindow,
  describeSectionWindow,
  olderPageSpec,
  windowExhausted,
  buildWindowQuery,
  trimWindow,
  compareKeys,
} from '../src/firebase-query-window.js';

// Minimal stand-ins for the modular Firebase SDK functions: they only record
// how they were composed, which is exactly what we want to assert.
function fakeSdk() {
  const calls = [];
  const fns = {
    ref: (db, path) => { calls.push(['ref', path]); return { path }; },
    query: (base, ...constraints) => { calls.push(['query', constraints.length]); return { base, constraints }; },
    orderByKey: () => { calls.push(['orderByKey']); return { c: 'orderByKey' }; },
    limitToLast: n => { calls.push(['limitToLast', n]); return { c: 'limitToLast', n }; },
    limitToFirst: n => { calls.push(['limitToFirst', n]); return { c: 'limitToFirst', n }; },
    startAfter: k => { calls.push(['startAfter', k]); return { c: 'startAfter', k }; },
    startAt: k => { calls.push(['startAt', k]); return { c: 'startAt', k }; },
    endAt: k => { calls.push(['endAt', k]); return { c: 'endAt', k }; },
    endBefore: k => { calls.push(['endBefore', k]); return { c: 'endBefore', k }; },
  };
  return { fns, calls };
}

test('tailWindow bounds a node to its newest N children and rejects empty limits', () => {
  assert.deepEqual(tailWindow('v2/sales', 500), { kind: 'tail', path: 'v2/sales', limit: 500, before: null });
  assert.equal(tailWindow('v2/sales', 0), null);
  assert.equal(tailWindow('v2/sales', -10), null);
  assert.throws(() => tailWindow('', 10), /needs a path/);
});

test('describeSectionWindow truncates only the append-only sections by default', () => {
  const sales = describeSectionWindow('sales', { path: 'v2/sales', limit: 3000 });
  assert.equal(sales.kind, 'tail');
  assert.equal(sales.limit, 3000);
  // Financial ledgers stay unbounded so closing balances keep every movement.
  assert.equal(describeSectionWindow('caisseLogs', { path: 'v2/caisse' }), null);
  assert.equal(describeSectionWindow('customers', { path: 'v2/customers' }), null);
  assert.ok(SECTION_WINDOW_LIMITS.activityLogs > 0);
});

test('olderPageSpec pages backwards with endBefore instead of re-reading the tail', () => {
  const spec = olderPageSpec('v2/sales', { pageSize: 500, oldestKey: '1700000000000' });
  assert.deepEqual(spec, { kind: 'tail', path: 'v2/sales', limit: 500, before: '1700000000000' });
});

test('buildWindowQuery compiles a tail window into orderByKey + endBefore + limitToLast', () => {
  const { fns, calls } = fakeSdk();
  buildWindowQuery(fns, {}, olderPageSpec('v2/sales', { pageSize: 200, oldestKey: 'k9' }));
  assert.deepEqual(calls, [['ref', 'v2/sales'], ['orderByKey'], ['endBefore', 'k9'], ['limitToLast', 200], ['query', 3]]);
});

test('buildWindowQuery without a cursor only adds limitToLast', () => {
  const { fns, calls } = fakeSdk();
  buildWindowQuery(fns, {}, tailWindow('v2/sales', 3000));
  assert.deepEqual(calls, [['ref', 'v2/sales'], ['orderByKey'], ['limitToLast', 3000], ['query', 2]]);
});

test('head and range windows compile to the forward / bounded constraints', () => {
  const head = fakeSdk();
  buildWindowQuery(head.fns, {}, headWindow('v2/activityLogs', 50, { after: 'k3' }));
  assert.deepEqual(head.calls, [
    ['ref', 'v2/activityLogs'], ['orderByKey'], ['startAfter', 'k3'], ['limitToFirst', 50], ['query', 3],
  ]);

  const range = fakeSdk();
  buildWindowQuery(range.fns, {}, rangeWindow('v2/sales', { from: '2026-10-01', to: '2026-10-31', limit: 100 }));
  assert.deepEqual(range.calls, [
    ['ref', 'v2/sales'], ['orderByKey'], ['startAt', '2026-10-01'], ['endAt', '2026-10-31'], ['limitToLast', 100], ['query', 4],
  ]);
  assert.throws(() => rangeWindow('v2/sales', { from: 'a' }), /from\/to/);
});

test('windowExhausted tells a pager when to stop asking for older pages', () => {
  assert.equal(windowExhausted(500, 500), false);
  assert.equal(windowExhausted(499, 500), true);
  assert.equal(windowExhausted(0, 500), true);
});

test('trimWindow keeps the newest rows and never grows beyond the limit', () => {
  const items = Array.from({ length: 10 }, (_, i) => ({ _rtdbKey: String(i + 1) }));
  const trimmed = trimWindow(items, 3);
  assert.deepEqual(trimmed.map(i => i._rtdbKey), ['8', '9', '10']);
  assert.equal(trimWindow(items, 0).length, 10, 'a zero limit means unbounded');
  assert.equal(trimWindow(items, 100).length, 10);
});

test('compareKeys orders numeric RTDB keys numerically', () => {
  assert.ok(compareKeys('2', '10') < 0);
  assert.ok(compareKeys('10', '2') > 0);
  assert.equal(compareKeys('a', 'a'), 0);
  assert.ok(compareKeys('a', 'b') < 0);
  assert.ok(compareKeys('abc', '10') > 0);
});
