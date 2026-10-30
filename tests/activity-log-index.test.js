import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeSearchText,
  toActivityLogTime,
  activityLogsSignature,
  buildActivityLogIndex,
  queryActivityLogPage,
  queryActivityLogs,
  createActivityLogIndexer,
} from '../src/activity-log-index.js';

const log = (id, timestamp, type, title, details = '', amount = 0) => ({ id, timestamp, type, title, details, amount });

const sample = [
  log('a1', '2026-10-01T08:00:00.000Z', 'customer', 'إضافة مشترك: أحمد', 'الهاتف: 0550000001'),
  log('a2', '2026-10-03T09:30:00.000Z', 'sale', 'بيع منتج: Whey Gold', 'الكمية: 2 | المخزون: من 10 إلى 8', 7000),
  log('a3', '2026-10-02T18:15:00.000Z', 'expense', 'مصروف: كهرباء', 'المبلغ: 3000', 3000),
  log('a4', '2026-10-04T07:45:00.000Z', 'customer', 'تعديل مشترك: أحمد', 'الهاتف: من 0550000001 إلى 0550000002'),
];

test('normalizeSearchText strips Arabic diacritics, unifies letter variants and lowercases Latin', () => {
  assert.equal(normalizeSearchText('  أَحْمَد   '), 'احمد');
  assert.equal(normalizeSearchText('إضافة'), 'اضافه');
  assert.equal(normalizeSearchText('مصطفى'), 'مصطفي');
  assert.equal(normalizeSearchText('Whey GOLD'), 'whey gold');
  assert.equal(normalizeSearchText('مبيــعات'), 'مبيعات');
  assert.equal(normalizeSearchText(null), '');
});

test('toActivityLogTime accepts ISO strings, numbers and junk', () => {
  assert.equal(toActivityLogTime('2026-10-01T08:00:00.000Z'), Date.parse('2026-10-01T08:00:00.000Z'));
  assert.equal(toActivityLogTime(1790000000000), 1790000000000);
  assert.equal(toActivityLogTime('not a date'), 0);
  assert.equal(toActivityLogTime(null), 0);
  assert.equal(toActivityLogTime(undefined), 0);
});

test('buildActivityLogIndex sorts newest-first, buckets by type and skips invalid rows', () => {
  const index = buildActivityLogIndex([...sample, null, 'junk', 42]);
  assert.equal(index.size, 4);
  assert.deepEqual(index.entries.map(e => e.id), ['a4', 'a2', 'a3', 'a1']);

  assert.deepEqual(index.byType.get('customer').map(e => e.id), ['a4', 'a1']);
  assert.deepEqual(index.byType.get('sale').map(e => e.id), ['a2']);
  assert.deepEqual(index.counts, { customer: 2, sale: 1, expense: 1 });
  assert.deepEqual(index.types.sort(), ['customer', 'expense', 'sale']);

  // O(1) id access, newest occurrence wins.
  assert.equal(index.byId.get('a2').log.title, 'بيع منتج: Whey Gold');
});

test('buildActivityLogIndex tolerates a missing/degenerate source', () => {
  for (const value of [undefined, null, 'nope', 5, {}]) {
    const index = buildActivityLogIndex(value);
    assert.equal(index.size, 0);
    assert.equal(index.entries.length, 0);
    assert.equal(index.byType.size, 0);
  }
});

test('rows without a type fall into the system bucket', () => {
  const index = buildActivityLogIndex([{ id: 'x', timestamp: 1, title: 'بدون نوع' }]);
  assert.deepEqual(index.byType.get('system').map(e => e.id), ['x']);
  assert.equal(index.counts.system, 1);
});

test('queryActivityLogPage filters by type and keeps newest-first order', () => {
  const index = buildActivityLogIndex(sample);
  const page = queryActivityLogPage(index, { type: 'customer' });
  assert.deepEqual(page.items.map(l => l.id), ['a4', 'a1']);
  assert.equal(page.matched, 2);
  assert.equal(page.total, 2);
  assert.equal(page.hasMore, false);

  const all = queryActivityLogPage(index, { type: 'all' });
  assert.deepEqual(all.items.map(l => l.id), ['a4', 'a2', 'a3', 'a1']);
});

test('search matches title and details, ignores diacritics and letter variants', () => {
  const index = buildActivityLogIndex(sample);
  assert.deepEqual(queryActivityLogs(index, { query: 'whey' }).map(l => l.id), ['a2']);
  assert.deepEqual(queryActivityLogs(index, { query: 'نص غير موجود' }), []);
  assert.deepEqual(queryActivityLogs(index, { query: 'احمد' }).map(l => l.id), ['a4', 'a1']);
  assert.deepEqual(queryActivityLogs(index, { query: 'أحمد' }).map(l => l.id), ['a4', 'a1']);
  assert.deepEqual(queryActivityLogs(index, { query: 'مصروف' }).map(l => l.id), ['a3']);
  // details are searched too
  assert.deepEqual(queryActivityLogs(index, { query: '0550000002' }).map(l => l.id), ['a4']);
  // type filter and search combine
  assert.deepEqual(queryActivityLogs(index, { query: 'احمد', type: 'customer' }).map(l => l.id), ['a4', 'a1']);
  assert.equal(queryActivityLogs(index, { query: 'احمد', type: 'sale' }).length, 0);
});

test('multi-token search requires every token (AND semantics)', () => {
  const index = buildActivityLogIndex(sample);
  assert.deepEqual(queryActivityLogs(index, { query: 'بيع whey' }).map(l => l.id), ['a2']);
  assert.equal(queryActivityLogs(index, { query: 'بيع كهرباء' }).length, 0);
});

test('paging reports the full match count while returning one page', () => {
  const many = Array.from({ length: 25 }, (_, i) => log(`m${i}`, new Date(Date.UTC(2026, 9, 1, 0, i)).toISOString(), 'sale', `عملية ${i}`));
  const index = buildActivityLogIndex(many);

  const first = queryActivityLogPage(index, { limit: 10 });
  assert.equal(first.items.length, 10);
  assert.equal(first.matched, 25);
  assert.equal(first.total, 25);
  assert.equal(first.hasMore, true);

  const rest = queryActivityLogPage(index, { limit: 10, offset: 20 });
  assert.equal(rest.items.length, 5);
  assert.equal(rest.matched, 25);
  assert.equal(rest.hasMore, false);

  // limit <= 0 means "everything" (the old behaviour)
  assert.equal(queryActivityLogPage(index, { limit: 0 }).items.length, 25);
});

test('an unfiltered page is a slice of the sorted bucket, not a rescan', () => {
  const index = buildActivityLogIndex(sample);
  const page = queryActivityLogPage(index, { type: 'all', limit: 2 });
  assert.deepEqual(page.items, index.entries.slice(0, 2).map(e => e.log));
  assert.equal(page.hasMore, true);
  assert.equal(queryActivityLogPage(index, { limit: 2, offset: 3 }).items.length, 1);
  const beyond = queryActivityLogPage(index, { limit: 2, offset: 99 });
  assert.deepEqual(beyond.items, []);
  assert.equal(beyond.matched, 4);
  assert.equal(beyond.hasMore, false);
});

test('queryActivityLogPage is safe on a missing index or bad options', () => {
  const empty = { items: [], matched: 0, total: 0, hasMore: false, offset: 0 };
  assert.deepEqual(queryActivityLogPage(null), empty);
  assert.deepEqual(queryActivityLogPage(undefined, {}), empty);
  const index = buildActivityLogIndex(sample);
  assert.equal(queryActivityLogPage(index, { limit: 'abc', offset: -5 }).items.length, 4);
});

test('activityLogsSignature changes on every mutation path the viewer uses', () => {
  const logs = [...sample];
  const base = activityLogsSignature(logs);
  assert.equal(activityLogsSignature([...sample]), base, 'same content must hash the same');

  // append (logActivity unshifts)
  const added = [log('a5', '2026-10-05T10:00:00.000Z', 'system', 'جديد'), ...logs];
  assert.notEqual(activityLogsSignature(added), base);

  // delete (viewer filters the array)
  const deleted = logs.filter(l => l.id !== 'a2');
  assert.notEqual(activityLogsSignature(deleted), base);

  // in-place edit of a timestamp is still detected
  const edited = [...sample];
  edited[0] = { ...edited[0], timestamp: '2026-10-09T00:00:00.000Z' };
  assert.notEqual(activityLogsSignature(edited), base);

  assert.equal(activityLogsSignature(null), '0:0');
  assert.equal(activityLogsSignature([]), '0:0');
});

test('indexer caches across renders and rebuilds only when the data changes', () => {
  const indexer = createActivityLogIndexer();
  const logs = [...sample];

  const first = indexer.get(logs);
  const second = indexer.get(logs);
  assert.equal(first, second, 'unchanged data must reuse the same index');
  assert.equal(indexer.stats().builds, 1);

  logs.unshift(log('a9', '2026-10-06T12:00:00.000Z', 'system', 'متابعة'));
  const third = indexer.get(logs);
  assert.notEqual(third, first, 'new row must invalidate the index');
  assert.equal(third.size, 5);
  assert.equal(indexer.stats().builds, 2);

  indexer.invalidate();
  const fourth = indexer.get(logs);
  assert.notEqual(fourth, third);
  assert.equal(indexer.stats().builds, 3);

  // Degenerate input must not throw or keep a stale index.
  assert.equal(indexer.get(null).size, 0);
  indexer.invalidate();
  assert.equal(indexer.get(undefined).size, 0);
});
