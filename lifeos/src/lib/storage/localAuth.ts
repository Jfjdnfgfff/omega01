import type { AuthUser } from '@/types';
import type { AuthDriver } from '@/lib/storage/types';

/**
 * مصادقة محلية: جلسة واحدة على هذا الجهاز.
 * تُستخدم عندما لا تكون إعدادات Firebase متوفرة. تُعرض بوضوح في الواجهة
 * على أنها "وضع محلي" بدون مزامنة سحابية.
 */

const LOCAL_UID = 'local-device-user';

function localUser(): AuthUser {
  return { uid: LOCAL_UID, email: null, displayName: null, local: true };
}

let session: AuthUser | null = null;
const listeners = new Set<(user: AuthUser | null) => void>();

function emit() {
  listeners.forEach((l) => l(session));
}

export const localAuth: AuthDriver = {
  mode: 'local',
  async currentUser() {
    return session;
  },
  onAuthChange(cb) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  async signInLocal() {
    session = localUser();
    emit();
    return session;
  },
  async signOut() {
    session = null;
    emit();
  },
};
