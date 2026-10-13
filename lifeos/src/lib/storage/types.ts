import type { AuthUser, CollectionName, DataCollections } from '@/types';

/**
 * عقد طبقة التخزين.
 * الواجهة لا تعرف إن كانت البيانات في IndexedDB أو Firestore —
 * هذا الفصل هو ما يسمح بالتبديل بينهما دون لمس أي مكوّن.
 */
export interface DataDriver {
  readonly kind: 'local' | 'firebase';
  /** هل التخزين يعمل فعلًا (IndexedDB متاح / Firestore مهيّأ) */
  readonly available: boolean;

  loadAll(uid: string): Promise<DataCollections>;
  upsert(uid: string, collection: CollectionName, doc: Record<string, unknown>): Promise<void>;
  remove(uid: string, collection: CollectionName, id: string): Promise<void>;
  replaceAll(uid: string, data: DataCollections): Promise<void>;
  clearAll(uid: string): Promise<void>;

  /** سجلات ميتا (الإعدادات وغيرها) — مستند واحد لكل مفتاح */
  loadMeta<T>(uid: string, key: string): Promise<T | null>;
  saveMeta(uid: string, key: string, value: unknown): Promise<void>;

  /** اشتراك لحظي — يُستخدم فقط عند الحاجة (المزامنة بين الأجهزة) */
  subscribe?(uid: string, collection: CollectionName, onChange: (docs: unknown[]) => void): () => void;
}

export interface AuthDriver {
  readonly mode: 'local' | 'firebase';
  currentUser(): Promise<AuthUser | null>;
  onAuthChange(cb: (user: AuthUser | null) => void): () => void;
  signUp?(email: string, password: string, displayName: string): Promise<AuthUser>;
  signIn?(email: string, password: string): Promise<AuthUser>;
  /** الوضع المحلي: فتح جلسة على هذا الجهاز فقط */
  signInLocal?(): Promise<AuthUser>;
  signOut(): Promise<void>;
  deleteAccount?(): Promise<void>;
}

export function emptyData(): DataCollections {
  return {
    goals: [],
    tasks: [],
    habits: [],
    habitLogs: [],
    projects: [],
    timeBlocks: [],
    timeLogs: [],
    transactions: [],
    savingsGoals: [],
    notes: [],
    reviews: [],
  };
}
