import { useCallback } from 'react';
import type { Language } from '@/types';
import { ar } from '@/i18n/ar';
import { en } from '@/i18n/en';
import { useSettings } from '@/lib/store/store';

export type TKey = keyof typeof ar;
export type Params = Record<string, string | number>;

const dictionaries: Record<Language, Record<string, string>> = { ar, en };

export function translate(lang: Language, key: string, params?: Params): string {
  const dict = dictionaries[lang] ?? ar;
  const raw = dict[key] ?? ar[key];
  if (raw === undefined) return key;
  if (!params) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) =>
    params[name] !== undefined ? String(params[name]) : match,
  );
}

export type Translator = (key: string, params?: Params) => string;

export function makeTranslator(lang: Language): Translator {
  return (key, params) => translate(lang, key, params);
}

export function useT(): Translator {
  const { language } = useSettings();
  return useCallback((key: string, params?: Params) => translate(language, key, params), [language]);
}

export function useLang(): Language {
  return useSettings().language;
}

export { ar, en };
