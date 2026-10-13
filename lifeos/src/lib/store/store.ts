import { useSyncExternalStore } from 'react';
import type { AuthUser, DataCollections, Language, Settings, Theme } from '@/types';
import { emptyData } from '@/lib/storage/types';

export type SavePhase = 'idle' | 'saving' | 'saved' | 'error';

export interface AppState {
  phase: 'boot' | 'auth' | 'ready' | 'error';
  mode: 'local' | 'firebase' | null;
  user: AuthUser | null;
  data: DataCollections;
  settings: Settings;
  save: { phase: SavePhase; lastSavedAt: string | null; error: string | null; pending: number };
  online: boolean;
}

const PREFS_KEY = 'lifeos:prefs';

export function defaultSettings(): Settings {
  const now = new Date().toISOString();
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  return {
    id: 'settings',
    createdAt: now,
    updatedAt: now,
    profile: { name: '', avatarColor: '#2563eb' },
    language: 'ar',
    theme: prefersDark ? 'dark' : 'light',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Algiers',
    weekStartsOn: 6,
    currency: 'DZD',
    monthlyBudget: 0,
    dailyFocusTargetMinutes: 240,
    pomodoro: { focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15 },
    privacy: { showFinanceOnDashboard: true, showAiCoach: true, cloudSyncEnabled: true },
    coach: { provider: 'none', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  };
}

function readPrefs(): Partial<Pick<Settings, 'language' | 'theme' | 'weekStartsOn'>> & { dir?: string } {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writePrefs(settings: Settings) {
  try {
    localStorage.setItem(
      PREFS_KEY,
      JSON.stringify({
        language: settings.language,
        theme: settings.theme,
        weekStartsOn: settings.weekStartsOn,
        dir: settings.language === 'ar' ? 'rtl' : 'ltr',
      }),
    );
  } catch {
    /* التخزين المحلي غير متاح — ليس حرجًا */
  }
}

const prefs = readPrefs();

const initialState: AppState = {
  phase: 'boot',
  mode: null,
  user: null,
  data: emptyData(),
  settings: {
    ...defaultSettings(),
    ...(prefs.language ? { language: prefs.language as Language } : {}),
    ...(prefs.theme ? { theme: prefs.theme as Theme } : {}),
    ...(prefs.weekStartsOn !== undefined ? { weekStartsOn: prefs.weekStartsOn as Settings['weekStartsOn'] } : {}),
  },
  save: { phase: 'idle', lastSavedAt: null, error: null, pending: 0 },
  online: typeof navigator === 'undefined' ? true : navigator.onLine,
};

type Listener = () => void;

class Store {
  private state: AppState = initialState;

  private listeners = new Set<Listener>();

  getState = (): AppState => this.state;

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  setState(patch: Partial<AppState> | ((prev: AppState) => Partial<AppState>)) {
    const next = typeof patch === 'function' ? patch(this.state) : patch;
    this.state = { ...this.state, ...next };
    this.listeners.forEach((l) => l());
  }

  setData(patch: Partial<DataCollections>) {
    this.setState((prev) => ({ data: { ...prev.data, ...patch } }));
  }

  setSettings(patch: Partial<Settings>) {
    this.setState((prev) => {
      const settings = { ...prev.settings, ...patch, updatedAt: new Date().toISOString() };
      applyPrefs(settings);
      writePrefs(settings);
      return { settings };
    });
  }

  beginSave() {
    this.setState((prev) => ({ save: { ...prev.save, phase: 'saving', pending: prev.save.pending + 1, error: null } }));
  }

  endSave(error: string | null) {
    this.setState((prev) => ({
      save: {
        phase: error ? 'error' : 'saved',
        lastSavedAt: error ? prev.save.lastSavedAt : new Date().toISOString(),
        error,
        pending: Math.max(0, prev.save.pending - 1),
      },
    }));
  }

  clearSaveError() {
    this.setState((prev) => ({ save: { ...prev.save, error: null, phase: prev.save.pending ? 'saving' : 'idle' } }));
  }
}

export const store = new Store();

function applyPrefs(settings: Settings) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', settings.theme === 'dark');
  root.setAttribute('lang', settings.language);
  root.setAttribute('dir', settings.language === 'ar' ? 'rtl' : 'ltr');
}

/* --------------------------- hooks (شرائح مستقرة) --------------------------- */

export function useAppState(): AppState {
  return useSyncExternalStore(store.subscribe, store.getState, store.getState);
}

export function useData(): DataCollections {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().data,
    () => store.getState().data,
  );
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().settings,
    () => store.getState().settings,
  );
}

export function useSaveState(): AppState['save'] {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().save,
    () => store.getState().save,
  );
}

export function useUser(): AuthUser | null {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().user,
    () => store.getState().user,
  );
}

export function usePhase(): AppState['phase'] {
  return useSyncExternalStore(
    store.subscribe,
    () => store.getState().phase,
    () => store.getState().phase,
  );
}

applyPrefs(initialState.settings);
