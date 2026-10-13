import { describe, expect, it } from 'vitest';
import { ar } from '@/i18n/ar';
import { en } from '@/i18n/en';
import { translate } from '@/i18n';

describe('i18n', () => {
  it('keeps the Arabic and English dictionaries in sync', () => {
    const arKeys = Object.keys(ar).sort();
    const enKeys = Object.keys(en).sort();
    expect(enKeys).toEqual(arKeys);
  });

  it('has no empty translations', () => {
    for (const [key, value] of Object.entries({ ...ar, ...en })) {
      expect(value, `${key} is empty`).toBeTruthy();
    }
  });

  it('interpolates parameters', () => {
    expect(translate('en', 'dashboard.alert.overdueTasks', { count: 3 })).toContain('3');
    expect(translate('ar', 'goals.dueIn', { days: 5 })).toContain('5');
  });

  it('returns the key when a translation is missing instead of crashing', () => {
    expect(translate('en', 'does.not.exist')).toBe('does.not.exist');
  });
});
