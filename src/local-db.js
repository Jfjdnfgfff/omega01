// ============================================================================
// LOCAL DATABASE ENGINE (IndexedDB) — قاعدة البيانات المحلية
// ----------------------------------------------------------------------------
// A persistent on-device mirror of the cloud sections (Firebase RTDB stays
// the source of truth). It exists for three reasons:
//
//   1. Instant startup — the UI renders from the local copy immediately while
//      the realtime listeners sync fresh cloud data in the background.
//   2. Less cloud load — a complete local sales history is not re-paged from
//      Firebase on every launch, and the app stays fully usable offline.
//   3. Durability — the offline write-queue and the deleted-items tombstone
//      registry get an IndexedDB backup (localStorage is capped ~5 MB and
//      can silently drop data under quota pressure).
//
// Design rules (kept deliberately conservative):
//   * The cloud ALWAYS wins. Cached data is only a head-start; the first
//     authoritative snapshot per section reconciles it (see
//     idsToRemoveOnReconcile) so records deleted on another device do not
//     resurrect from the local copy.
//   * Records created/edited locally while offline are NEVER reconciled
//     away: callers pass the ids protected by the pending write queue.
//   * Fail-soft: any storage error disables the cache layer only. The app
//     behaves exactly as before this module existed.
//
// Storage layout (single object store "kv", out-of-line string keys):
//   "section:<name>" → { items: [...], count, updatedAt }
//   "kv:v2Stats"     → the stats aggregate object
//   "kv:writeQueue"  → backup of window.firebaseWriteQueue
//   "kv:tombstones"  → backup of the deleted-id registry (array of "sec:id")
//   "meta"           → { salesHistoryComplete, schemaVersion, updatedAt }
//
// The module is environment-agnostic: storage, clocks and timers are
// injected, which keeps every rule unit-testable under `node --test`.
// ============================================================================

export const LOCAL_DB_SCHEMA_VERSION = 1;

// appState array sections mirrored locally. `stats` (v2Stats object) and
// `privacy` (already in localStorage) are handled separately by the caller.
export const CACHEABLE_SECTIONS = [
  'customers', 'products', 'sales', 'quickSessions', 'expenses', 'credits',
  'suppliers', 'supplierTransactions', 'packages', 'staffPayouts',
  'coachAbsences', 'caisseLogs', 'activityLogs',
];

// Numeric-aware RTDB key comparison (same ordering rule the sales pager
// uses): "10" must sort after "2" when both keys are numeric.
export function compareRtdbKeys(a, b) {
  const sa = String(a ?? '');
  const sb = String(b ?? '');
  const na = Number(sa);
  const nb = Number(sb);
  if (sa !== '' && sb !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) {
    return na < nb ? -1 : na > nb ? 1 : 0;
  }
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}

// How aggressively may the first cloud snapshot prune hydrated cache rows?
//   'full'   — the snapshot IS the whole node, so any cached id missing from
//              it was deleted in the cloud.
//   'window' — the snapshot is only the realtime tail (sales limitToLast):
//              cached rows older than the window cannot be judged and are
//              kept as history.
// A windowed sales snapshot still counts as 'full' when the cache holds no
// more than one window of rows: there is no beyond-window history to
// protect, and the background pager re-completes anything still missing.
export function reconcileMode({ section, snapshotCount = 0, cachedCount = 0, windowSize = 3000 } = {}) {
  if (section !== 'sales') return 'full';
  if (snapshotCount < windowSize) return 'full';
  if (cachedCount <= windowSize) return 'full';
  return 'window';
}

// Pure reconciliation rule. Given the entries that were hydrated from the
// local cache ({ id, key } — key is the RTDB node key) and the ids present
// in the first authoritative cloud snapshot, returns the cached entries that
// must be dropped because the cloud no longer has them. Locally pending
// (protected) ids are always kept.
export function idsToRemoveOnReconcile({
  cachedEntries = [],
  snapshotIds = new Set(),
  mode = 'full',
  windowOldestKey = null,
  protectedIds = new Set(),
} = {}) {
  const removed = [];
  for (const entry of cachedEntries) {
    if (!entry) continue;
    const id = String(entry.id ?? '');
    const key = String(entry.key ?? entry.id ?? '');
    if (!id && !key) continue;
    if ((id && snapshotIds.has(id)) || (key && snapshotIds.has(key))) continue;
    if ((id && protectedIds.has(id)) || (key && protectedIds.has(key))) continue;
    if (mode === 'window') {
      // Without a window bound we cannot judge older rows — keep them.
      if (windowOldestKey === null || windowOldestKey === undefined) continue;
      if (compareRtdbKeys(key, String(windowOldestKey)) < 0) continue;
    }
    removed.push({ id, key });
  }
  return removed;
}

// The sales-history pager only needs to be skipped when the cache provably
// holds MORE than the realtime window (i.e. real paged history). With a
// small complete dataset the first snapshot already returns the full node,
// so restoring the flag would save nothing — and must never suppress the
// pager for a dataset that merely looks small in an old cache.
export function shouldRestoreSalesHistoryComplete({ metaComplete = false, cachedSalesCount = 0, windowSize = 3000 } = {}) {
  return Boolean(metaComplete) && cachedSalesCount > windowSize;
}

// ----------------------------------------------------------------------------
// Storage adapters: { get(key), set(key, value), delete(key), clear(),
// getAll() → Map }. Values are structured-cloned in and out, exactly like
// IndexedDB, so callers can never mutate stored rows by accident.
// ----------------------------------------------------------------------------

function cloneValue(value) {
  if (value === undefined) return value;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

export function createMemoryStorage() {
  const map = new Map();
  return {
    async get(key) { return map.has(key) ? cloneValue(map.get(key)) : undefined; },
    async set(key, value) { map.set(key, cloneValue(value)); },
    async delete(key) { map.delete(key); },
    async clear() { map.clear(); },
    async getAll() {
      const out = new Map();
      for (const [key, value] of map) out.set(key, cloneValue(value));
      return out;
    },
  };
}

export function createIndexedDBStorage({ indexedDB, dbName = 'omega-gym-local', storeName = 'kv', version = 1 } = {}) {
  if (!indexedDB) throw new Error('IndexedDB is not available in this environment');
  let dbPromise = null;

  function open() {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        let request;
        try {
          request = indexedDB.open(dbName, version);
        } catch (err) {
          reject(err);
          return;
        }
        request.onupgradeneeded = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
        request.onblocked = () => reject(new Error('IndexedDB open blocked by another tab'));
      });
      // A transient failure (e.g. blocked) may succeed on a later attempt.
      dbPromise.catch(() => { dbPromise = null; });
    }
    return dbPromise;
  }

  async function run(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction(storeName, mode);
      } catch (err) {
        reject(err);
        return;
      }
      let request;
      try {
        request = action(tx.objectStore(storeName));
      } catch (err) {
        reject(err);
        return;
      }
      if (request) {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
      } else {
        tx.oncomplete = () => resolve(undefined);
        tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
        tx.onabort = () => reject(tx.error || new Error('IndexedDB transaction aborted'));
      }
    });
  }

  async function set(key, value) {
    try {
      await run('readwrite', store => store.put(value, key));
    } catch (err) {
      // A live appState row should always be cloneable, but if one ever
      // carries a non-cloneable field, retry once with a JSON-sanitized
      // copy instead of losing the whole cache write.
      if (err && (err.name === 'DataCloneError' || /clone/i.test(String(err.message || err)))) {
        const clean = JSON.parse(JSON.stringify(value));
        await run('readwrite', store => store.put(clean, key));
        return;
      }
      throw err;
    }
  }

  async function getAll() {
    const db = await open();
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction(storeName, 'readonly');
      } catch (err) {
        reject(err);
        return;
      }
      const store = tx.objectStore(storeName);
      const keysReq = store.getAllKeys();
      const valsReq = store.getAll();
      let keys;
      let vals;
      let done = 0;
      const finish = () => {
        done += 1;
        if (done === 2) {
          const out = new Map();
          (keys || []).forEach((k, i) => out.set(k, vals ? vals[i] : undefined));
          resolve(out);
        }
      };
      keysReq.onsuccess = () => { keys = keysReq.result; finish(); };
      valsReq.onsuccess = () => { vals = valsReq.result; finish(); };
      keysReq.onerror = () => reject(keysReq.error || new Error('IndexedDB getAllKeys failed'));
      valsReq.onerror = () => reject(valsReq.error || new Error('IndexedDB getAll failed'));
    });
  }

  return {
    get: key => run('readonly', store => store.get(key)),
    set,
    delete: key => run('readwrite', store => store.delete(key)),
    clear: () => run('readwrite', store => store.clear()),
    getAll,
  };
}

// ----------------------------------------------------------------------------
// LocalCache: dirty-tracking + debounced whole-section persistence.
// Whole-section writes (instead of per-record writes) are a deliberate
// robustness choice: appState is the single in-memory truth, mutations reach
// it through many paths, and the flush always snapshots the CURRENT arrays —
// so the cache can never drift from what the user sees. Writes are async
// structured clones into IndexedDB and stay off the UI path.
// ----------------------------------------------------------------------------

export function createLocalCache({
  storage,
  readSection = () => [],
  readStats = () => null,
  readMeta = () => ({}),
  flushDelayMs = 900,
  setTimeoutFn = setTimeout,
  clearTimeoutFn = clearTimeout,
  now = () => Date.now(),
  onError = () => {},
  onFlush = () => {},
} = {}) {
  if (!storage) throw new Error('createLocalCache requires a storage adapter');
  let available = true;
  let failureCount = 0;
  let flushTimer = null;
  let lastFlushAt = null;
  const dirty = new Set();
  const counts = {};

  function stats() {
    const totalRecords = Object.values(counts).reduce((sum, n) => sum + (Number(n) || 0), 0);
    return { available, totalRecords, counts: { ...counts }, lastFlushAt };
  }

  function scheduleFlush() {
    if (flushTimer || !available) return;
    flushTimer = setTimeoutFn(() => {
      flushTimer = null;
      flush();
    }, flushDelayMs);
  }

  function markDirty(name) {
    if (!available || !name) return;
    if (name !== 'stats' && !CACHEABLE_SECTIONS.includes(name)) return;
    dirty.add(name);
    scheduleFlush();
  }

  function markAllDirty() {
    if (!available) return;
    for (const name of CACHEABLE_SECTIONS) dirty.add(name);
    dirty.add('stats');
    scheduleFlush();
  }

  async function flush() {
    if (flushTimer) {
      clearTimeoutFn(flushTimer);
      flushTimer = null;
    }
    if (!available || dirty.size === 0) return available;
    const batch = Array.from(dirty);
    dirty.clear();
    try {
      for (const name of batch) {
        if (name === 'stats') {
          const statsObj = readStats();
          if (statsObj && typeof statsObj === 'object') {
            await storage.set('kv:v2Stats', statsObj);
          }
        } else {
          const raw = readSection(name);
          const items = (Array.isArray(raw) ? raw : []).filter(it => it && typeof it === 'object');
          await storage.set(`section:${name}`, { items, count: items.length, updatedAt: now() });
          counts[name] = items.length;
        }
      }
      const meta = readMeta() || {};
      await storage.set('meta', { ...meta, schemaVersion: LOCAL_DB_SCHEMA_VERSION, updatedAt: now() });
      lastFlushAt = now();
      failureCount = 0;
      try { onFlush(stats()); } catch { /* UI callback must never break storage */ }
      return true;
    } catch (err) {
      // Keep the batch dirty so a later flush can retry, but stop hammering
      // a broken store (quota / private mode): after 3 failed flushes the
      // layer disables itself and the app runs cloud-only as before.
      batch.forEach(name => dirty.add(name));
      failureCount += 1;
      if (failureCount >= 3) available = false;
      onError(err);
      return false;
    }
  }

  function setKV(key, value) {
    if (!available || !key) return Promise.resolve(false);
    return storage.set(`kv:${key}`, value).then(() => true).catch(err => {
      onError(err);
      return false;
    });
  }

  async function getKV(key) {
    if (!available || !key) return null;
    try {
      const value = await storage.get(`kv:${key}`);
      return value === undefined ? null : value;
    } catch (err) {
      onError(err);
      return null;
    }
  }

  async function loadSection(name) {
    if (!available || !CACHEABLE_SECTIONS.includes(name)) return null;
    try {
      const entry = await storage.get(`section:${name}`);
      if (!entry || !Array.isArray(entry.items)) return null;
      const items = entry.items.filter(it => it && typeof it === 'object');
      counts[name] = items.length;
      return items;
    } catch (err) {
      onError(err);
      return null;
    }
  }

  async function loadAll() {
    const empty = { sections: new Map(), meta: null, v2Stats: null, writeQueue: null, tombstones: null };
    if (!available) return empty;
    try {
      const all = await storage.getAll();
      const result = { sections: new Map(), meta: null, v2Stats: null, writeQueue: null, tombstones: null };
      for (const [key, value] of all) {
        if (typeof key !== 'string') continue;
        if (key.startsWith('section:')) {
          const name = key.slice('section:'.length);
          if (value && Array.isArray(value.items)) {
            const items = value.items.filter(it => it && typeof it === 'object');
            result.sections.set(name, items);
            counts[name] = items.length;
          }
        } else if (key === 'meta') {
          result.meta = value && typeof value === 'object' ? value : null;
        } else if (key === 'kv:v2Stats') {
          result.v2Stats = value && typeof value === 'object' ? value : null;
        } else if (key === 'kv:writeQueue') {
          result.writeQueue = Array.isArray(value) ? value : null;
        } else if (key === 'kv:tombstones') {
          result.tombstones = Array.isArray(value) ? value : null;
        }
      }
      return result;
    } catch (err) {
      available = false;
      onError(err);
      return empty;
    }
  }

  async function clearAll() {
    if (flushTimer) {
      clearTimeoutFn(flushTimer);
      flushTimer = null;
    }
    dirty.clear();
    for (const key of Object.keys(counts)) delete counts[key];
    lastFlushAt = null;
    try {
      await storage.clear();
      return true;
    } catch (err) {
      onError(err);
      return false;
    }
  }

  return { loadAll, loadSection, markDirty, markAllDirty, flush, setKV, getKV, clearAll, stats };
}
