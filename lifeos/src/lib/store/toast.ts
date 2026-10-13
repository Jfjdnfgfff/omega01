import { useSyncExternalStore } from 'react';
import { uid } from '@/lib/id';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
  id: string;
  tone: ToastTone;
  messageKey: string;
  params?: Record<string, string | number>;
}

let toasts: Toast[] = [];
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function push(tone: ToastTone, messageKey: string, params?: Record<string, string | number>, ttl = 3600) {
  const item: Toast = { id: uid('toast'), tone, messageKey, params };
  toasts = [...toasts.slice(-3), item];
  emit();
  setTimeout(() => dismiss(item.id), ttl);
}

function dismiss(id: string) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export const toast = {
  success: (key: string, params?: Record<string, string | number>) => push('success', key, params),
  error: (key: string, params?: Record<string, string | number>) => push('error', key, params, 5200),
  info: (key: string, params?: Record<string, string | number>) => push('info', key, params),
  dismiss,
};

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toasts,
    () => toasts,
  );
}
