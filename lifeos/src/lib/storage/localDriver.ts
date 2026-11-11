import { COLLECTION_NAMES, type CollectionName } from '@/types';
import { emptyData, type DataDriver } from '@/lib/storage/types';

/**
 * تخزين محلي على هذا الجهاز عبر IndexedDB.
 * ملاحظة: لا تُخزَّن بيانات حساسة في LocalStorage — LocalStorage يُستخدم فقط
 * لتفضيلات العرض (السمة/اللغة) في وحدة prefs.
 */

const DB_NAME = 'lifeos';
const DB_VERSION = 1;
const META_STORE = 'meta';

let dbPromise: Promise<IDBDatabase | null> | null = null;
let memoryFallback: Map<string, Map<string, unknown>> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') {
      resolve(null);
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch {
      resolve(null);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of [...COLLECTION_NAMES, META_STORE]) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
    req.onblocked = () => resolve(null);
  });
  return dbPromise;
}

function memory(): Map<string, Map<string, unknown>> {
  if (!memoryFallback) memoryFallback = new Map();
  return memoryFallback;
}

function memStore(name: string): Map<string, unknown> {
  const m = memory();
  if (!m.has(name)) m.set(name, new Map());
  return m.get(name) as Map<string, unknown>;
}

function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        if (!db) {
          reject(new Error('idb-unavailable'));
          return;
        }
        const t = db.transaction(store, mode);
        const req = fn(t.objectStore(store));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error('idb-error'));
      }),
  );
}

export const localDriver: DataDriver = {
  kind: 'local',
  get available() {
    return true;
  },

  async loadAll() {
    const out = emptyData();
    await Promise.all(
      COLLECTION_NAMES.map(async (name: CollectionName) => {
        try {
          const rows = await tx<unknown[]>(name, 'readonly', (s) => s.getAll() as IDBRequest<unknown[]>);
          (out[name] as unknown[]) = rows;
        } catch {
          const rows = [...memStore(name).values()];
          (out[name] as unknown[]) = rows;
        }
      }),
    );
    return out;
  },

  async upsert(_uid, collection, doc) {
    try {
      await tx(collection, 'readwrite', (s) => s.put(doc));
    } catch {
      memStore(collection).set(String(doc.id), doc);
    }
  },

  async remove(_uid, collection, id) {
    try {
      await tx(collection, 'readwrite', (s) => s.delete(id));
    } catch {
      memStore(collection).delete(id);
    }
  },

  async replaceAll(_uid, data) {
    for (const name of COLLECTION_NAMES) {
      const docs = data[name] as unknown as Record<string, unknown>[];
      try {
        await tx(name, 'readwrite', (s) => s.clear());
        for (const doc of docs) {
          await tx(name, 'readwrite', (s) => s.put(doc));
        }
      } catch {
        const store = memStore(name);
        store.clear();
        for (const doc of docs) store.set(String(doc.id), doc);
      }
    }
  },

  async clearAll() {
    for (const name of COLLECTION_NAMES) {
      try {
        await tx(name, 'readwrite', (s) => s.clear());
      } catch {
        memStore(name).clear();
      }
    }
    try {
      await tx(META_STORE, 'readwrite', (s) => s.clear());
    } catch {
      memStore(META_STORE).clear();
    }
  },

  async loadMeta<T>(_uid: string, key: string): Promise<T | null> {
    try {
      const row = (await tx<unknown>(META_STORE, 'readonly', (s) => s.get(key))) as { value?: T } | undefined;
      return (row?.value as T) ?? null;
    } catch {
      const row = memStore(META_STORE).get(key) as { value?: T } | undefined;
      return (row?.value as T) ?? null;
    }
  },

  async saveMeta(_uid: string, key: string, value: unknown): Promise<void> {
    const row = { id: key, value };
    try {
      await tx(META_STORE, 'readwrite', (s) => s.put(row));
    } catch {
      memStore(META_STORE).set(key, row);
    }
  },
};

/** تهيئة مبكرة لقاعدة البيانات حتى تكون أول قراءة سريعة */
export function warmupLocalDB(): Promise<IDBDatabase | null> {
  return openDB();
}
