/**
 * أدوات التواريخ — كلها تعتمد صيغة YYYY-MM-DD كمفتاح يوم محلي
 * حتى لا تنزح الحسابات بسبب المناطق الزمنية.
 */

export const DAY_MS = 86_400_000;

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function todayISO(now: Date = new Date()): string {
  return toISODate(now);
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function isValidISODate(iso: string | null | undefined): iso is string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = fromISODate(iso);
  return !Number.isNaN(d.getTime()) && toISODate(d) === iso;
}

export function addDays(iso: string, days: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function diffDays(a: string, b: string): number {
  return Math.round((fromISODate(a).getTime() - fromISODate(b).getTime()) / DAY_MS);
}

/** 0=الأحد ... 6=السبت */
export function weekdayIndex(iso: string): number {
  return fromISODate(iso).getDay();
}

export function startOfWeek(iso: string, weekStartsOn: 0 | 1 | 6 = 1): string {
  const wd = weekdayIndex(iso);
  const delta = (wd - weekStartsOn + 7) % 7;
  return addDays(iso, -delta);
}

export function endOfWeek(iso: string, weekStartsOn: 0 | 1 | 6 = 1): string {
  return addDays(startOfWeek(iso, weekStartsOn), 6);
}

export function weekRange(iso: string, weekStartsOn: 0 | 1 | 6 = 1): string[] {
  const start = startOfWeek(iso, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7); // YYYY-MM
}

export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split('-').map(Number);
  const start = `${y}-${`${m}`.padStart(2, '0')}-01`;
  const last = new Date(y, m, 0).getDate();
  return { start, end: `${y}-${`${m}`.padStart(2, '0')}-${last}` };
}

export function daysInMonth(month: string): number {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}

/** مفتاح الأسبوع بصيغة ISO (YYYY-Www) */
export function isoWeekKey(iso: string): string {
  const d = fromISODate(iso);
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayNr = (target.getDay() + 6) % 7; // الاثنين = 0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNr = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNr + 3);
  const week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return `${target.getFullYear()}-W${`${week}`.padStart(2, '0')}`;
}

export function startOfISOWeek(periodKey: string): string {
  const [yearPart, weekPart] = periodKey.split('-W');
  const year = Number(yearPart);
  const week = Number(weekPart);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const monday = new Date(year, 0, 4 - jan4Day + (week - 1) * 7);
  return toISODate(monday);
}

export function isOverdue(dueDate: string | null, today: string): boolean {
  return !!dueDate && dueDate < today;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function pct(part: number, total: number): number {
  if (!total || total <= 0) return 0;
  return clamp(Math.round((part / total) * 100), 0, 100);
}

export function round(n: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}

export function minutesToHuman(minutes: number, lang: 'ar' | 'en'): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (lang === 'en') {
    if (h && rest) return `${h}h ${rest}m`;
    if (h) return `${h}h`;
    return `${m}m`;
  }
  if (h && rest) return `${h} س ${rest} د`;
  if (h) return `${h} ساعة`;
  return `${m} دقيقة`;
}

export function formatMinutes(minutes: number): string {
  const h = `${Math.floor(minutes / 60)}`.padStart(2, '0');
  const m = `${Math.round(minutes % 60)}`.padStart(2, '0');
  return `${h}:${m}`;
}

export function timeToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const total = ((minutes % 1440) + 1440) % 1440;
  return `${`${Math.floor(total / 60)}`.padStart(2, '0')}:${`${total % 60}`.padStart(2, '0')}`;
}

export function formatDate(iso: string, lang: 'ar' | 'en', style: 'short' | 'long' | 'weekday' = 'short'): string {
  const d = fromISODate(iso);
  const locale = lang === 'ar' ? 'ar-DZ' : 'en-GB';
  if (style === 'long') {
    return d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }
  if (style === 'weekday') {
    return d.toLocaleDateString(locale, { weekday: 'short' });
  }
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

export function relativeDayLabel(iso: string, today: string, lang: 'ar' | 'en'): string {
  const delta = diffDays(iso, today);
  if (delta === 0) return lang === 'ar' ? 'اليوم' : 'Today';
  if (delta === 1) return lang === 'ar' ? 'غدًا' : 'Tomorrow';
  if (delta === -1) return lang === 'ar' ? 'أمس' : 'Yesterday';
  return formatDate(iso, lang);
}
