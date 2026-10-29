import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sessionTotal,
  splitSessionMoney,
  femaleSessionShare,
  collectFemaleSessionIncome,
  isInPeriod,
  sessionActivityLabel,
} from '../src/female-income.js';

const dayKey = date => {
  const d = new Date(date);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const femaleSession = {
  id: 's1',
  date: new Date(2026, 9, 29, 12).getTime(), // 29 Oct 2026 local
  price: 1500,
  clientCount: 3,
  sessionCount: 1,
  clients: [
    { activity: 'musculation', price: 500, gender: 'female' },
    { activity: 'cardio', price: 500, gender: 'male' },
    { activity: 'musculation', price: 500, gender: 'female' },
  ],
};

test('sessionTotal prefers the recorded cash total over the client sum', () => {
  assert.equal(sessionTotal(femaleSession), 1500);
  // Cashier overrides the auto total (discount): the total is authoritative.
  assert.equal(sessionTotal({ ...femaleSession, price: 1200 }), 1200);
  // Missing total: fall back to the sum of client prices.
  assert.equal(sessionTotal({ ...femaleSession, price: undefined }), 1500);
  assert.equal(sessionTotal(null), 0);
});

test('female clients get a proportional share of the session total', () => {
  const share = femaleSessionShare(femaleSession);
  assert.equal(share.femaleClients, 2);
  assert.equal(share.maleClients, 1);
  assert.equal(share.femaleRevenue, 1000, 'two of three equal clients => 1000 of 1500');
  assert.equal(share.total, 1500);
});

test('an overridden session total is split proportionally, never by the typed prices', () => {
  const share = femaleSessionShare({
    ...femaleSession,
    price: 900,
  });
  assert.equal(share.femaleRevenue, 600);
  assert.equal(share.total, 900);
});

test('uneven client prices follow their weight', () => {
  const share = femaleSessionShare({
    id: 's2',
    price: 1000,
    clients: [
      { activity: 'cardio', price: 600, gender: 'female' },
      { activity: 'cardio', price: 200, gender: 'male' },
      { activity: 'cardio', price: 200, gender: 'male' },
    ],
  });
  assert.equal(share.femaleRevenue, 600);
  assert.equal(share.maleClients, 2);
});

test('clients without prices are split equally and rounding stays exact', () => {
  const parts = splitSessionMoney({
    price: 1000,
    clients: [
      { activity: 'cardio', gender: 'male' },
      { activity: 'cardio', gender: 'female' },
      { activity: 'cardio', gender: 'female' },
    ],
  });
  assert.equal(parts.reduce((sum, part) => sum + part.amount, 0), 1000, 'no dinar created or lost');
  // 333 + 333 with the 1-dinar remainder settled on the last (female) client.
  assert.deepEqual(parts.map(part => part.amount), [333, 333, 334]);
  assert.equal(parts.filter(part => part.female).reduce((sum, part) => sum + part.amount, 0), 667);
});

test('legacy sessions without a gender count as male (no phantom female income)', () => {
  const share = femaleSessionShare({
    id: 'legacy',
    price: 1000,
    clients: [{ activity: 'musculation', price: 500 }, { activity: 'cardio', price: 500 }],
  });
  assert.equal(share.femaleClients, 0);
  assert.equal(share.femaleRevenue, 0);
});

test('collectFemaleSessionIncome only keeps sessions with female clients in the period', () => {
  const today = '2026-10-29';
  const older = { ...femaleSession, id: 'old', date: new Date(2026, 7, 10, 12).getTime() };
  const maleOnly = { id: 'male', date: new Date(2026, 9, 29, 9).getTime(), price: 700, clients: [{ activity: 'cardio', price: 700, gender: 'male' }] };
  const sessions = [femaleSession, older, maleOnly];

  const month = collectFemaleSessionIncome(sessions, { period: 'month', todayKey: today, dateKeyOf: dayKey });
  assert.equal(month.sessionCount, 1);
  assert.equal(month.femaleRevenue, 1000);
  assert.equal(month.femaleClients, 2);
  assert.equal(month.rows[0].femaleRevenue, 1000);
  assert.deepEqual(month.rows[0].activities, ['musculation', 'cardio']);

  const all = collectFemaleSessionIncome(sessions, { period: 'all', todayKey: today, dateKeyOf: dayKey });
  assert.equal(all.sessionCount, 2);
  assert.equal(all.femaleRevenue, 2000);

  const todayOnly = collectFemaleSessionIncome(sessions, { period: 'today', todayKey: today, dateKeyOf: dayKey });
  assert.equal(todayOnly.sessionCount, 1);

  const year = collectFemaleSessionIncome(sessions, { period: 'year', todayKey: today, dateKeyOf: dayKey });
  assert.equal(year.sessionCount, 2);
});

test('a credit filter hides cash sessions, and search matches the session label', () => {
  const today = '2026-10-29';
  const sessions = [femaleSession];
  const credit = collectFemaleSessionIncome(sessions, { period: 'month', todayKey: today, dateKeyOf: dayKey, paymentFilter: 'credit' });
  assert.equal(credit.sessionCount, 0);
  assert.equal(credit.femaleRevenue, 0);

  const searchHit = collectFemaleSessionIncome(sessions, { period: 'month', todayKey: today, dateKeyOf: dayKey, search: 'حصة' });
  assert.equal(searchHit.sessionCount, 1);

  const searchMiss = collectFemaleSessionIncome(sessions, { period: 'month', todayKey: today, dateKeyOf: dayKey, search: 'اسم غير موجود' });
  assert.equal(searchMiss.sessionCount, 0);
});

test('a session with zero total still counts its female clients but adds no income', () => {
  const income = collectFemaleSessionIncome([{ id: 'free', date: new Date(2026, 9, 29).getTime(), price: 0, clients: [{ activity: 'cardio', gender: 'female' }] }],
    { period: 'month', todayKey: '2026-10-29', dateKeyOf: dayKey });
  assert.equal(income.femaleClients, 1);
  assert.equal(income.femaleRevenue, 0);
});

test('isInPeriod treats undated rows as visible and validates periods', () => {
  assert.equal(isInPeriod('', 'month', '2026-10-29'), true);
  assert.equal(isInPeriod('2026-10-01', 'today', '2026-10-29'), false);
  assert.equal(isInPeriod('2026-10-29', 'today', '2026-10-29'), true);
  assert.equal(isInPeriod('2025-12-31', 'year', '2026-10-29'), false);
  assert.equal(isInPeriod('2026-01-01', 'year', '2026-10-29'), true);
  assert.equal(isInPeriod('2020-01-01', 'unknown', '2026-10-29'), true);
});

test('sessionActivityLabel renders the activity mix', () => {
  assert.equal(sessionActivityLabel(['musculation', 'cardio']), 'Musculation · Cardio');
  assert.equal(sessionActivityLabel([]), 'حصة سريعة');
});
