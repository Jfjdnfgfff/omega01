import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CACHEABLE_SECTIONS,
  compareRtdbKeys,
  reconcileMode,
  idsToRemoveOnReconcile,
  shouldRestoreSalesHistoryComplete,
  createMemoryStorage,
  createIndexedDBStorage,
  createLocalCache,
} from '../src/local-db.js';

// ---------------------------------------------------------------------------
// Pure rules
// ---------------------------------------------------------------------------

test('compareRtdbKeys orders numeric keys numerically, others lexicographically', () => {
  assert.ok(compareRtdbKeys('2', '10') < 0);
  assert.ok(compareRtdbKeys('10', '2') > 0);
  assert.equal(compareRtdbKeys('7', '7'), 0);
  assert.ok(compareRtdbKeys('sale_a', 'sale_b') < 0);
  assert.ok(compareRtdbKeys('-Nxyz', '-Nabc') > 0);
  assert.ok(compareRtdbKeys('', 'a') < 0);
});

test('reconcileMode: non-sales sections always reconcile against the full node', () => {
  assert.equal(reconcileMode({ section: 'customers', snapshotCount: 5, cachedCount: 9, windowSize: 3000 }), 'full');
  assert.equal(reconcileMode({ section: 'products', snapshotCount: 99999, cachedCount: 99999, windowSize: 3000 }), 'full');
});

test('reconcileMode: a sales snapshot smaller than the window is the whole node', () => {
  assert.equal(reconcileMode({ section: 'sales', snapshotCount: 12, cachedCount: 5000, windowSize: 3000 }), 'full');
  assert.equal(reconcileMode({ section: 'sales', snapshotCount: 0, cachedCount: 5000, windowSize: 3000 }), 'full');
});

test('reconcileMode: windowed snapshot + small cache has no history to protect', () => {
  assert.equal(reconcileMode({ section: 'sales', snapshotCount: 3000, cachedCount: 1, windowSize: 3000 }), 'full');
  assert.equal(reconcileMode({ section: 'sales', snapshotCount: 3000, cachedCount: 3000, windowSize: 3000 }), 'full');
});

test('reconcileMode: windowed snapshot + large cache only judges inside the window', () => {
  assert.equal(reconcileMode({ section: 'sales', snapshotCount: 3000, cachedCount: 4500, windowSize: 3000 }), 'window');
});

test('idsToRemoveOnReconcile (full): drops cloud-deleted rows, keeps present and protected', () => {
  const cachedEntries = [
    { id: 'a', key: 'a' },
    { id: 'b', key: 'b' },
    { id: 'c', key: 'key-c' },   // present via its RTDB key
    { id: 'd', key: 'd' },       // missing from snapshot but locally pending
    { id: 'e', key: 'e' },       // deleted in the cloud
  ];
  const removed = idsToRemoveOnReconcile({
    cachedEntries,
    snapshotIds: new Set(['a', 'b', 'key-c']),
    mode: 'full',
    protectedIds: new Set(['d']),
  });
  assert.deepEqual(removed, [{ id: 'e', key: 'e' }]);
});

test('idsToRemoveOnReconcile (window): history older than the window is never judged', () => {
  const cachedEntries = [
    { id: '1', key: '1' },     // older than window, missing -> keep (history)
    { id: '50', key: '50' },   // inside window, missing -> remove
    { id: '60', key: '60' },   // inside window, present -> keep
    { id: '70', key: '70' },   // inside window, missing but protected -> keep
  ];
  const removed = idsToRemoveOnReconcile({
    cachedEntries,
    snapshotIds: new Set(['60']),
    mode: 'window',
    windowOldestKey: '40',
    protectedIds: new Set(['70']),
  });
  assert.deepEqual(removed, [{ id: '50', key: '50' }]);
});

test('idsToRemoveOnReconcile (window) without a window bound removes nothing', () => {
  const removed = idsToRemoveOnReconcile({
    cachedEntries: [{ id: 'x', key: 'x' }],
    snapshotIds: new Set(),
    mode: 'window',
    windowOldestKey: null,
  });
  assert.deepEqual(removed, []);
});

test('shouldRestoreSalesHistoryComplete only for a complete cache bigger than the window', () => {
  assert.equal(shouldRestoreSalesHistoryComplete({ metaComplete: true, cachedSalesCount: 4500, windowSize: 3000 }), true);
  assert.equal(shouldRestoreSalesHistoryComplete({ metaComplete: true, cachedSalesCount: 3000, windowSize: 3000 }), false);
  assert.equal(shouldRestoreSalesHistoryComplete({ metaComplete: true, cachedSalesCount: 12, windowSize: 3000 }), false);
  assert.equal(shouldRestoreSalesHistoryComplete({ metaComplete: false, cachedSalesCount: 9000, windowSize: 3000 }), false);
});

test('CACHEABLE_SECTIONS covers every appState array section', () => {
  for (const name of ['customers', 'products', 'sales', 'expenses', 'credits', 'caisseLogs', 'activityLogs']) {
    assert.ok(CACHEABLE_SECTIONS.includes(name), name);
  }
  assert.ok(!CACHEABLE_SECTIONS.includes('stats'));
  assert.ok(!CACHEABLE_SECTIONS.includes('privacy'));
});

// ---------------------------------------------------------------------------
// Storage adapters
// ---------------------------------------------------------------------------

test('memory storage clones values in and out (no shared references)', async () => {
  const storage = createMemoryStorage();
  const original = { items: [{ id: '1', name: 'A' }] };
  await storage.set('section:customers', original);
  original.items[0].name = 'MUTATED';
  const read = await storage.get('section:customers');
  assert.equal(read.items[0].name, 'A');
  read.items[0].name = 'MUTATED AGAIN';
  assert.equal((await storage.get('section:customers')).items[0].name, 'A');
  await storage.delete('section:customers');
  assert.equal(await storage.get('section:customers'), undefined);
  await storage.set('a', 1);
  await storage.clear();
  assert.equal((await storage.getAll()).size, 0);
});

// Minimal in-memory IndexedDB good enough for the adapter surface we use:
// open (+upgrade), one store, get/put/delete/clear/getAll/getAllKeys.
// `put` structured-clones like the real thing, so functions raise a
// synchronous DataCloneError exactly as a browser would.
function createFakeIndexedDB() {
  const databases = new Map(); // dbName -> Map(storeName -> Map(key -> value))
  const succeed = (req, exec) => queueMicrotask(() => {
    try { req.result = exec(); req.onsuccess?.(); } catch (e) { req.error = e; req.onerror?.(); }
  });
  function storeFacade(data) {
    const req = exec => {
      const r = { result: undefined, error: null, onsuccess: null, onerror: null };
      succeed(r, exec);
      return r;
    };
    return {
      get: key => req(() => (data.has(key) ? structuredClone(data.get(key)) : undefined)),
      put: (value, key) => { const cloned = structuredClone(value); return req(() => { data.set(key, cloned); return key; }); },
      delete: key => req(() => { data.delete(key); return undefined; }),
      clear: () => req(() => { data.clear(); return undefined; }),
      getAll: () => req(() => Array.from(data.values()).map(v => structuredClone(v))),
      getAllKeys: () => req(() => Array.from(data.keys())),
    };
  }
  return {
    open(name) {
      const req = { result: undefined, error: null, onsuccess: null, onerror: null, onupgradeneeded: null, onblocked: null };
      queueMicrotask(() => {
        const isNew = !databases.has(name);
        if (isNew) databases.set(name, new Map());
        const stores = databases.get(name);
        req.result = {
          objectStoreNames: { contains: store => stores.has(store) },
          createObjectStore: store => { if (!stores.has(store)) stores.set(store, new Map()); },
          transaction: store => ({
            objectStore: () => storeFacade(stores.get(store)),
            oncomplete: null, onerror: null, onabort: null,
          }),
        };
        if (isNew) req.onupgradeneeded?.();
        req.onsuccess?.();
      });
      return req;
    },
  };
}

test('createIndexedDBStorage requires an IndexedDB implementation', () => {
  assert.throws(() => createIndexedDBStorage({}), /IndexedDB is not available/);
  assert.throws(() => createIndexedDBStorage(), /IndexedDB is not available/);
});

test('IndexedDB adapter round-trips values through a fake IDB', async () => {
  const storage = createIndexedDBStorage({ indexedDB: createFakeIndexedDB(), dbName: 'test-db' });
  await storage.set('section:sales', { items: [{ id: 's1', total: 100 }], count: 1 });
  await storage.set('meta', { salesHistoryComplete: true });
  assert.deepEqual(await storage.get('section:sales'), { items: [{ id: 's1', total: 100 }], count: 1 });
  const all = await storage.getAll();
  assert.equal(all.size, 2);
  assert.deepEqual(all.get('meta'), { salesHistoryComplete: true });
  await storage.delete('meta');
  assert.equal(await storage.get('meta'), undefined);
  await storage.clear();
  assert.equal((await storage.getAll()).size, 0);
});

test('IndexedDB adapter falls back to a JSON-sanitized copy on DataCloneError', async () => {
  const storage = createIndexedDBStorage({ indexedDB: createFakeIndexedDB(), dbName: 'clone-db' });
  await storage.set('kv:weird', { ok: 1, fn: () => 42, nested: { also: 'fine' } });
  assert.deepEqual(await storage.get('kv:weird'), { ok: 1, nested: { also: 'fine' } });
});

// ---------------------------------------------------------------------------
// LocalCache engine
// ---------------------------------------------------------------------------

function fakeTimers() {
  let pending = null;
  return {
    setTimeoutFn(cb, ms) { pending = { cb, ms }; return pending; },
    clearTimeoutFn(handle) { if (pending === handle) pending = null; },
    fire() { const p = pending; pending = null; if (p) p.cb(); },
    get pending() { return pending; },
  };
}

function cacheHarness(overrides = {}) {
  const storage = createMemoryStorage();
  const timers = fakeTimers();
  const state = {
    customers: [{ id: 'c1', name: 'أحمد' }, { id: 'c2', name: 'سارة' }],
    sales: [{ id: 's1', total: 250 }],
    products: [],
  };
  const errors = [];
  const flushes = [];
  const cache = createLocalCache({
    storage,
    readSection: name => state[name] || [],
    readStats: () => ({ daily: { '2026-10-23': { sales: 250 } } }),
    readMeta: () => ({ salesHistoryComplete: state.sales.length > 0 }),
    setTimeoutFn: timers.setTimeoutFn,
    clearTimeoutFn: timers.clearTimeoutFn,
    now: () => 1700000000000,
    onError: err => errors.push(err),
    onFlush: s => flushes.push(s),
    ...overrides,
  });
  return { cache, storage, timers, state, errors, flushes };
}

test('markDirty schedules a debounced flush that snapshots live section data', async () => {
  const h = cacheHarness();
  h.cache.markDirty('customers');
  assert.ok(h.timers.pending, 'flush scheduled');
  h.state.customers.push({ id: 'c3', name: 'يوسف' }); // mutation after marking
  h.timers.fire();
  await new Promise(resolve => setImmediate(resolve));
  const stored = await h.storage.get('section:customers');
  assert.equal(stored.count, 3, 'flush reads the array at flush time, not mark time');
  assert.equal(stored.updatedAt, 1700000000000);
  const meta = await h.storage.get('meta');
  assert.equal(meta.salesHistoryComplete, true);
  assert.equal(meta.schemaVersion, 1);
  assert.equal(h.flushes.length, 1);
  assert.equal(h.cache.stats().totalRecords, 3);
});

test('unknown sections are ignored by markDirty; stats persists via the kv slot', async () => {
  const h = cacheHarness();
  h.cache.markDirty('notASection');
  assert.equal(h.timers.pending, null);
  h.cache.markDirty('stats');
  await h.cache.flush();
  assert.deepEqual(await h.storage.get('kv:v2Stats'), { daily: { '2026-10-23': { sales: 250 } } });
});

test('loadAll returns sections, meta, stats, write-queue and tombstone backups', async () => {
  const h = cacheHarness();
  h.cache.markAllDirty();
  await h.cache.flush();
  await h.cache.setKV('writeQueue', [{ action: 'saveSectionItem', sectionPath: 'sales', itemData: { id: 's9' } }]);
  await h.cache.setKV('tombstones', ['credits:cr1']);

  const reader = createLocalCache({ storage: h.storage });
  const data = await reader.loadAll();
  assert.equal(data.sections.get('customers').length, 2);
  assert.equal(data.sections.get('sales')[0].total, 250);
  assert.deepEqual(data.sections.get('products'), []);
  assert.equal(data.meta.salesHistoryComplete, true);
  assert.deepEqual(data.v2Stats, { daily: { '2026-10-23': { sales: 250 } } });
  assert.equal(data.writeQueue[0].itemData.id, 's9');
  assert.deepEqual(data.tombstones, ['credits:cr1']);
  assert.equal(reader.stats().totalRecords, 3);
});

test('loadSection reads one section and tolerates missing or corrupt entries', async () => {
  const h = cacheHarness();
  assert.equal(await h.cache.loadSection('sales'), null);
  await h.storage.set('section:sales', { items: 'not-an-array' });
  assert.equal(await h.cache.loadSection('sales'), null);
  await h.storage.set('section:sales', { items: [{ id: 's1' }, null, 'junk', { id: 's2' }] });
  assert.deepEqual(await h.cache.loadSection('sales'), [{ id: 's1' }, { id: 's2' }]);
  assert.equal(await h.cache.loadSection('unknown'), null);
});

test('clearAll wipes storage and cancels any pending flush', async () => {
  const h = cacheHarness();
  h.cache.markDirty('customers');
  await h.cache.clearAll();
  assert.equal(h.timers.pending, null, 'pending flush cancelled so nothing is rewritten');
  h.timers.fire();
  await h.cache.flush();
  assert.equal((await h.storage.getAll()).size, 0);
  assert.equal(h.cache.stats().totalRecords, 0);
});

test('a broken store disables the layer after 3 failed flushes instead of throwing', async () => {
  const failing = {
    async get() { throw new Error('quota'); },
    async set() { throw new Error('quota'); },
    async delete() {},
    async clear() {},
    async getAll() { throw new Error('quota'); },
  };
  const errors = [];
  const cache = createLocalCache({
    storage: failing,
    readSection: () => [{ id: 'x' }],
    onError: err => errors.push(err),
  });
  cache.markDirty('sales');
  await cache.flush();
  await cache.flush();
  assert.equal(cache.stats().available, true, 'still retrying after 2 failures');
  await cache.flush();
  assert.equal(cache.stats().available, false, 'disabled after the 3rd failure');
  assert.equal(errors.length, 3);
  const data = await cache.loadAll();
  assert.equal(data.sections.size, 0, 'loadAll degrades to empty, never throws');
});

test('loadAll on an unreadable store returns empty data and disables the layer', async () => {
  const cache = createLocalCache({
    storage: {
      async get() { return undefined; },
      async set() {},
      async delete() {},
      async clear() {},
      async getAll() { throw new Error('private mode'); },
    },
  });
  const data = await cache.loadAll();
  assert.deepEqual(
    { sections: data.sections.size, meta: data.meta, v2Stats: data.v2Stats, writeQueue: data.writeQueue, tombstones: data.tombstones },
    { sections: 0, meta: null, v2Stats: null, writeQueue: null, tombstones: null },
  );
  assert.equal(cache.stats().available, false);
});

test('end-to-end over the fake IndexedDB: persist in one session, hydrate in the next', async () => {
  const idb = createFakeIndexedDB();
  const storageA = createIndexedDBStorage({ indexedDB: idb, dbName: 'omega-gym-local-v2' });
  const sessionA = createLocalCache({
    storage: storageA,
    readSection: name => (name === 'customers' ? [{ id: 'c1', name: 'أحمد' }] : []),
    readMeta: () => ({ salesHistoryComplete: false }),
  });
  sessionA.markAllDirty();
  await sessionA.flush();

  const storageB = createIndexedDBStorage({ indexedDB: idb, dbName: 'omega-gym-local-v2' });
  const sessionB = createLocalCache({ storage: storageB });
  const data = await sessionB.loadAll();
  assert.deepEqual(data.sections.get('customers'), [{ id: 'c1', name: 'أحمد' }]);
});

test('reconcileMode: any section subscribed with limitToLast protects beyond-window cache rows', () => {
  // activityLogs is now windowed too (SECTION_WINDOW_LIMITS.activityLogs), so a
  // 400-row snapshot must not delete the 900 older cached log rows.
  assert.equal(reconcileMode({ section: 'activityLogs', snapshotCount: 400, cachedCount: 1200, windowSize: 400, windowed: true }), 'window');
  assert.equal(reconcileMode({ section: 'activityLogs', snapshotCount: 400, cachedCount: 200, windowSize: 400, windowed: true }), 'full');
  // Explicitly unwindowed sections keep the strict full-node rule.
  assert.equal(reconcileMode({ section: 'customers', snapshotCount: 10, cachedCount: 900, windowSize: 400, windowed: false }), 'full');
});
