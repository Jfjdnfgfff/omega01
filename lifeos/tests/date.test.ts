import { describe, expect, it } from 'vitest';
import { addDays, diffDays, endOfWeek, isoWeekKey, isValidISODate, monthRange, pct, startOfWeek, startOfISOWeek, timeToMinutes, weekRange } from '@/lib/date';
import { deterministicId, uid } from '@/lib/id';
import { formatMoney } from '@/lib/currency';

describe('date helpers', () => {
  it('adds and diffs days across month boundaries', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
    expect(diffDays('2026-02-02', '2026-01-30')).toBe(3);
  });

  it('computes week ranges for different week starts', () => {
    // 2026-01-10 is a Saturday
    expect(startOfWeek('2026-01-10', 6)).toBe('2026-01-10'); // week starts Saturday
    expect(startOfWeek('2026-01-10', 1)).toBe('2026-01-05'); // week starts Monday
    expect(endOfWeek('2026-01-10', 1)).toBe('2026-01-11');
    expect(weekRange('2026-01-10', 1)).toEqual([
      '2026-01-05',
      '2026-01-06',
      '2026-01-07',
      '2026-01-08',
      '2026-01-09',
      '2026-01-10',
      '2026-01-11',
    ]);
  });

  it('produces stable ISO week keys', () => {
    expect(isoWeekKey('2026-01-05')).toBe(isoWeekKey('2026-01-11'));
    expect(isoWeekKey('2026-01-04')).not.toBe(isoWeekKey('2026-01-05'));
    expect(startOfISOWeek(isoWeekKey('2026-01-10'))).toBe('2026-01-05');
  });

  it('validates dates and rejects nonsense', () => {
    expect(isValidISODate('2026-02-29')).toBe(false);
    expect(isValidISODate('2026-02-28')).toBe(true);
    expect(isValidISODate('2026-13-01')).toBe(false);
    expect(isValidISODate(null)).toBe(false);
  });

  it('computes month ranges', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' });
  });

  it('clamps percentages and converts times', () => {
    expect(pct(1, 3)).toBe(33);
    expect(pct(5, 0)).toBe(0);
    expect(pct(-1, 4)).toBe(0);
    expect(timeToMinutes('09:30')).toBe(570);
  });
});

describe('ids', () => {
  it('generates unique ids', () => {
    expect(new Set(Array.from({ length: 500 }, () => uid('t'))).size).toBe(500);
  });

  it('is deterministic for the same inputs (idempotent retries)', () => {
    expect(deterministicId('habit1::2026-01-10')).toBe(deterministicId('habit1::2026-01-10'));
    expect(deterministicId('habit1::2026-01-10')).not.toBe(deterministicId('habit1::2026-01-11'));
  });
});

describe('currency', () => {
  it('formats the Algerian dinar with its symbol and digits', () => {
    const out = formatMoney(1250.5, 'DZD', 'ar');
    expect(out).toContain('د.ج');
    // ar-DZ يستخدم النقطة فاصلةً للآلاف: 1.250,5
    expect(out).toContain('1.250');
  });

  it('formats USD in English locale', () => {
    expect(formatMoney(99, 'USD', 'en')).toContain('$');
  });

  it('never throws on invalid amounts', () => {
    expect(() => formatMoney(Number.NaN, 'DZD', 'ar')).not.toThrow();
  });
});
