import type { AuthDriver, DataDriver } from '@/lib/storage/types';
import { localAuth } from '@/lib/storage/localAuth';
import { localDriver } from '@/lib/storage/localDriver';
import { createFirebaseBackend, firebaseConfigFromEnv } from '@/lib/storage/firebaseDriver';

export interface Backend {
  auth: AuthDriver;
  data: DataDriver;
  mode: 'local' | 'firebase';
}

let backendPromise: Promise<Backend> | null = null;

/**
 * يختار الخلفية المناسبة:
 * - Firebase إن كانت إعدادات العميل موجودة في متغيرات البيئة ومكتبة Firebase تعمل.
 * - وإلا وضع محلي على الجهاز (IndexedDB) مع إظهار ذلك للمستخدم بوضوح.
 */
export function initBackend(): Promise<Backend> {
  if (backendPromise) return backendPromise;
  backendPromise = (async () => {
    const config = firebaseConfigFromEnv();
    if (config) {
      const fb = await createFirebaseBackend(config);
      if (fb) return { auth: fb.auth, data: fb.data, mode: 'firebase' as const };
    }
    return { auth: localAuth, data: localDriver, mode: 'local' as const };
  })();
  return backendPromise;
}

export { emptyData } from '@/lib/storage/types';
export type { AuthDriver, DataDriver } from '@/lib/storage/types';
