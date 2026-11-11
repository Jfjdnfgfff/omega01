import { COLLECTION_NAMES, type AuthUser, type CollectionName } from '@/types';
import { emptyData, type AuthDriver, type DataDriver } from '@/lib/storage/types';

/**
 * واجهة Firebase (Auth + Cloud Firestore).
 * - تُحمَّل ديناميكيًا حتى لا تُدفع مكتبة Firebase إلى الحزمة ما لم تُضبط الإعدادات.
 * - كل البيانات تحت /users/{uid}/... والقواعد في firestore.rules تمنع وصول الآخرين.
 * - لا يوجد أي مفتاح إداري (Admin SDK) هنا: إعدادات العميل العامة فقط، من متغيرات البيئة.
 */

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export function firebaseConfigFromEnv(): FirebaseClientConfig | null {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
  const apiKey = env.VITE_LIFEOS_FIREBASE_API_KEY || env.VITE_FIREBASE_API_KEY;
  const authDomain = env.VITE_LIFEOS_FIREBASE_AUTH_DOMAIN || env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = env.VITE_LIFEOS_FIREBASE_PROJECT_ID || env.VITE_FIREBASE_PROJECT_ID;
  const appId = env.VITE_LIFEOS_FIREBASE_APP_ID || env.VITE_FIREBASE_APP_ID;
  if (!apiKey || !projectId || !appId) return null;
  return { apiKey, authDomain: authDomain ?? `${projectId}.firebaseapp.com`, projectId, appId };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFirebase = any;

export interface FirebaseBackend {
  auth: AuthDriver;
  data: DataDriver;
}

export async function createFirebaseBackend(config: FirebaseClientConfig): Promise<FirebaseBackend | null> {
  try {
    const [{ initializeApp, getApps }, authMod, fsMod] = await Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
      import('firebase/firestore'),
    ]);

    const app = getApps().length ? getApps()[0] : initializeApp(config);
    const auth = authMod.getAuth(app);
    const db = fsMod.getFirestore(app);

    const toUser = (u: AnyFirebase): AuthUser => ({
      uid: u.uid as string,
      email: (u.email as string | null) ?? null,
      displayName: (u.displayName as string | null) ?? null,
      local: false,
    });

    const colRef = (uid: string, collection: CollectionName) =>
      fsMod.collection(db, `users/${uid}/${collection}`) as AnyFirebase;

    const dataDriver: DataDriver = {
      kind: 'firebase',
      get available() {
        return true;
      },
      async loadAll(uid: string) {
        const out = emptyData();
        await Promise.all(
          COLLECTION_NAMES.map(async (name) => {
            const snap = await fsMod.getDocs(colRef(uid, name));
            (out[name] as unknown[]) = snap.docs.map((d: AnyFirebase) => d.data());
          }),
        );
        return out;
      },
      async upsert(uid, collection, doc) {
        const id = String(doc.id);
        await fsMod.setDoc(fsMod.doc(colRef(uid, collection), id), doc, { merge: true });
      },
      async remove(uid, collection, id) {
        await fsMod.deleteDoc(fsMod.doc(colRef(uid, collection), id));
      },
      async replaceAll(uid, data) {
        const batch = fsMod.writeBatch(db);
        for (const name of COLLECTION_NAMES) {
          const docs = data[name] as unknown as Record<string, unknown>[];
          for (const doc of docs) {
            batch.set(fsMod.doc(colRef(uid, name), String(doc.id)), doc, { merge: true });
          }
        }
        await batch.commit();
      },
      async clearAll(uid) {
        for (const name of COLLECTION_NAMES) {
          const snap = await fsMod.getDocs(colRef(uid, name));
          if (snap.empty) continue;
          const batch = fsMod.writeBatch(db);
          snap.docs.forEach((d: AnyFirebase) => batch.delete(d.ref));
          await batch.commit();
        }
      },
      subscribe(uid, collection, onChange) {
        const q = fsMod.query(colRef(uid, collection));
        return fsMod.onSnapshot(
          q,
          (snap: AnyFirebase) => onChange(snap.docs.map((d: AnyFirebase) => d.data())),
          () => onChange([]),
        ) as () => void;
      },
      async loadMeta<T>(uid: string, key: string): Promise<T | null> {
        const snap = await fsMod.getDoc(fsMod.doc(db, `users/${uid}/meta/${key}`));
        return snap.exists() ? ((snap.data().value as T) ?? null) : null;
      },
      async saveMeta(uid: string, key: string, value: unknown): Promise<void> {
        await fsMod.setDoc(fsMod.doc(db, `users/${uid}/meta/${key}`), { value }, { merge: true });
      },
    };

    const authDriver: AuthDriver = {
      mode: 'firebase',
      async currentUser() {
        const u = auth.currentUser;
        return u ? toUser(u) : null;
      },
      onAuthChange(cb) {
        return authMod.onAuthStateChanged(auth, (u: AnyFirebase) => cb(u ? toUser(u) : null)) as () => void;
      },
      async signUp(email, password, displayName) {
        const cred = await authMod.createUserWithEmailAndPassword(auth, email.trim(), password);
        if (displayName) await authMod.updateProfile(cred.user, { displayName });
        return toUser(cred.user);
      },
      async signIn(email, password) {
        const cred = await authMod.signInWithEmailAndPassword(auth, email.trim(), password);
        return toUser(cred.user);
      },
      async signOut() {
        await authMod.signOut(auth);
      },
      async deleteAccount() {
        const u = auth.currentUser;
        if (!u) return;
        await dataDriver.clearAll(u.uid);
        await authMod.deleteUser(u);
      },
    };

    return { auth: authDriver, data: dataDriver };
  } catch (err) {
    console.warn('[LifeOS] Firebase غير متاح، سيتم استخدام الوضع المحلي', err);
    return null;
  }
}
