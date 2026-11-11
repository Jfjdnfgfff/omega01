import type { CurrencyCode, Language } from '@/types';

export interface CurrencyInfo {
  code: CurrencyCode;
  symbol: string;
  nameAr: string;
  nameEn: string;
  locale: string;
  decimals: number;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyInfo> = {
  DZD: { code: 'DZD', symbol: 'د.ج', nameAr: 'دينار جزائري', nameEn: 'Algerian Dinar', locale: 'ar-DZ', decimals: 2 },
  USD: { code: 'USD', symbol: '$', nameAr: 'دولار أمريكي', nameEn: 'US Dollar', locale: 'en-US', decimals: 2 },
  EUR: { code: 'EUR', symbol: '€', nameAr: 'يورو', nameEn: 'Euro', locale: 'de-DE', decimals: 2 },
  SAR: { code: 'SAR', symbol: 'ر.س', nameAr: 'ريال سعودي', nameEn: 'Saudi Riyal', locale: 'ar-SA', decimals: 2 },
  AED: { code: 'AED', symbol: 'د.إ', nameAr: 'درهم إماراتي', nameEn: 'UAE Dirham', locale: 'ar-AE', decimals: 2 },
  MAD: { code: 'MAD', symbol: 'د.م', nameAr: 'درهم مغربي', nameEn: 'Moroccan Dirham', locale: 'ar-MA', decimals: 2 },
  TND: { code: 'TND', symbol: 'د.ت', nameAr: 'دينار تونسي', nameEn: 'Tunisian Dinar', locale: 'ar-TN', decimals: 2 },
  EGP: { code: 'EGP', symbol: 'ج.م', nameAr: 'جنيه مصري', nameEn: 'Egyptian Pound', locale: 'ar-EG', decimals: 2 },
};

export const CURRENCY_LIST = Object.values(CURRENCIES);

const cache = new Map<string, Intl.NumberFormat | null>();

function formatter(currency: CurrencyCode, lang: Language): Intl.NumberFormat | null {
  const info = CURRENCIES[currency] ?? CURRENCIES.DZD;
  const locale = lang === 'ar' ? info.locale : 'en-US';
  const key = `${locale}:${currency}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  let f: Intl.NumberFormat | null = null;
  try {
    f = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: info.decimals,
      minimumFractionDigits: 0,
    });
  } catch {
    f = null;
  }
  cache.set(key, f);
  return f;
}

export function formatMoney(amount: number, currency: CurrencyCode = 'DZD', lang: Language = 'ar'): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  const f = formatter(currency, lang);
  if (f) {
    try {
      return f.format(safe);
    } catch {
      /* falls through to the manual format */
    }
  }
  const info = CURRENCIES[currency] ?? CURRENCIES.DZD;
  const rounded = safe.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'en-US', { maximumFractionDigits: 2 });
  return lang === 'ar' ? `${rounded} ${info.symbol}` : `${info.symbol}${rounded}`;
}

export function formatNumber(n: number, lang: Language = 'ar'): string {
  return n.toLocaleString(lang === 'ar' ? 'ar-DZ' : 'en-US', { maximumFractionDigits: 1 });
}
