import type { AuthUser, Settings } from '@/types';
import { COLLECTION_NAMES, type CollectionName } from '@/types';
import { initBackend, type Backend } from '@/lib/storage/index';
import { defaultSettings, store } from '@/lib/store/store';
import { setBackend } from '@/lib/store/actions';
import { emptyData } from '@/lib/storage/types';

/**
 * إقلاع التطبيق: اختيار الخلفية، الاستماع لتغيّر المستخدم،
 * ثم تحميل البيانات وضبط الاشتراكات اللحظية عند الحاجة فقط.
 */

let unsubscribes: (() => void)[] = [];
let authUnsubscribe: (() => void) | null = null;
let started = false;
let backendRef: Backend | null = null;

export function getBackend(): Backend | null {
  return backendRef;
}

function clearSubscriptions() {
  unsubscribes.forEach((u) => u());
  unsubscribes = [];
}

async function hydrate(backend: Backend, user: AuthUser) {
  store.setState({ user, phase: 'boot' });
  try {
    const [data, savedSettings] = await Promise.all([
      backend.data.loadAll(user.uid),
      backend.data.loadMeta<Settings>(user.uid, 'settings'),
    ]);
    const merged: Settings = {
      ...defaultSettings(),
      ...(savedSettings ?? {}),
      profile: { ...defaultSettings().profile, ...(savedSettings?.profile ?? {}) },
      privacy: { ...defaultSettings().privacy, ...(savedSettings?.privacy ?? {}) },
      coach: { ...defaultSettings().coach, provider: 'none', ...(savedSettings?.coach ?? {}), baseUrl: savedSettings?.coach?.baseUrl ?? defaultSettings().coach.baseUrl },
      pomodoro: { ...defaultSettings().pomodoro, ...(savedSettings?.pomodoro ?? {}) },
    };
    store.setSettings(merged);
    store.setData(data);

    // مزامنة لحظية بين الأجهزة — فقط مع Firebase وعندما يسمح المستخدم بذلك.
    if (backend.mode === 'firebase' && merged.privacy.cloudSyncEnabled && backend.data.subscribe) {
      for (const collection of COLLECTION_NAMES) {
        const stop = backend.data.subscribe(user.uid, collection as CollectionName, (docs) => {
          store.setData({ [collection]: docs } as unknown as Partial<typeof data>);
        });
        unsubscribes.push(stop);
      }
    }

    store.setState({ phase: 'ready' });
  } catch (err) {
    console.error('[LifeOS] فشل تحميل البيانات', err);
    store.setState({ phase: 'error', data: emptyData() });
    store.endSave('errors.loadFailed');
  }
}

export async function bootstrap(): Promise<void> {
  if (started) return;
  started = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => store.setState({ online: true }));
    window.addEventListener('offline', () => store.setState({ online: false }));
  }

  let backend: Backend;
  try {
    backend = await initBackend();
  } catch (err) {
    console.error('[LifeOS] تعذّر تهيئة الخلفية', err);
    store.setState({ phase: 'error' });
    return;
  }

  setBackend(backend);
  backendRef = backend;
  store.setState({ mode: backend.mode });

  authUnsubscribe?.();
  authUnsubscribe = backend.auth.onAuthChange((user) => {
    clearSubscriptions();
    if (!user) {
      store.setState({ user: null, phase: 'auth', data: emptyData() });
      return;
    }
    void hydrate(backend, user);
  });

  // بعض الخلفيات (الوضع المحلي) تُبلغ فورًا، لكن نضمن حالة أولية صريحة.
  const initial = await backend.auth.currentUser();
  if (!initial) store.setState({ phase: 'auth' });
}

export function teardown() {
  clearSubscriptions();
  authUnsubscribe?.();
  authUnsubscribe = null;
  started = false;
}

export { initBackend };
