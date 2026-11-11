import type { AuthUser, CollectionName, DataCollections } from '@/types';
import type { AuthDriver, DataDriver } from '@/lib/storage/types';
import { emptyData } from '@/lib/storage/types';

/**
 * سائق تخزين وهمي لاختبار طبقة الإجراءات والواجهة
 * دون متصفح أو Firestore.
 */
export class FakeDriver implements DataDriver {
  kind = 'local' as const;

  available = true;

  store: Record<string, Record<string, Record<string, unknown>>> = {};

  meta: Record<string, unknown> = {};

  failNextWrite = false;

  writes = 0;

  private bucket(collection: CollectionName) {
    if (!this.store[collection]) this.store[collection] = {};
    return this.store[collection];
  }

  async loadAll(): Promise<DataCollections> {
    const out = emptyData();
    for (const key of Object.keys(out) as CollectionName[]) {
      (out[key] as unknown[]) = Object.values(this.store[key] ?? {});
    }
    return out;
  }

  async upsert(_uid: string, collection: CollectionName, doc: Record<string, unknown>) {
    this.writes += 1;
    if (this.failNextWrite) throw new Error('offline');
    this.bucket(collection)[String(doc.id)] = doc;
  }

  async remove(_uid: string, collection: CollectionName, id: string) {
    this.writes += 1;
    if (this.failNextWrite) throw new Error('offline');
    delete this.bucket(collection)[id];
  }

  async replaceAll(_uid: string, data: DataCollections) {
    this.store = {};
    for (const key of Object.keys(data) as CollectionName[]) {
      for (const doc of data[key] as unknown as Record<string, unknown>[]) {
        this.bucket(key)[String(doc.id)] = doc;
      }
    }
  }

  async clearAll() {
    this.store = {};
  }

  async loadMeta<T>(_uid: string, key: string): Promise<T | null> {
    return (this.meta[key] as T) ?? null;
  }

  async saveMeta(_uid: string, key: string, value: unknown) {
    this.writes += 1;
    if (this.failNextWrite) throw new Error('offline');
    this.meta[key] = value;
  }
}

export function makeFakeAuth(user: AuthUser): AuthDriver {
  let listener: ((u: AuthUser | null) => void) | null = null;
  return {
    mode: 'local',
    async currentUser() {
      return user;
    },
    onAuthChange(cb) {
      listener = cb;
      const id = setTimeout(() => cb(user), 0);
      return () => clearTimeout(id);
    },
    async signOut() {
      listener?.(null);
    },
  };
}

export const TEST_USER: AuthUser = { uid: 'u1', email: 'test@example.com', displayName: 'Tester', local: false };
