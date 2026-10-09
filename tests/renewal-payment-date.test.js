import test from 'node:test';
import assert from 'node:assert/strict';
import {
    localDateKey,
    isValidDateKey,
    resolveRenewalPaymentDate,
    renewalPaymentTimestamp
} from '../src/renewal-payment-date.js';
import { buildCaisseMovements } from '../src/caisse-transactions.js';

// Fixed "now": 9 October 2026, 15:30 local time. Built locally, so the tests do not depend on the machine's timezone.
const NOW = new Date(2026, 9, 9, 15, 30, 0);

test('isValidDateKey accepts real calendar days only', () => {
    assert.equal(isValidDateKey('2026-10-09'), true);
    assert.equal(isValidDateKey('2024-02-29'), true);
    assert.equal(isValidDateKey('2026-02-30'), false);
    assert.equal(isValidDateKey('2026-13-01'), false);
    assert.equal(isValidDateKey('2026-1-5'), false);
    assert.equal(isValidDateKey('09/10/2026'), false);
    assert.equal(isValidDateKey(''), false);
    assert.equal(isValidDateKey(null), false);
});

test('localDateKey keeps date-only strings and reads local days from timestamps', () => {
    assert.equal(localDateKey('2026-10-05'), '2026-10-05');
    assert.equal(localDateKey(new Date(2026, 9, 5, 0, 10)), '2026-10-05');
    assert.equal(localDateKey(new Date(2026, 9, 5, 23, 50).toISOString()), '2026-10-05');
    assert.equal(localDateKey('not a date'), '');
});

test('resolveRenewalPaymentDate allows today and past days, rejects future and bad input', () => {
    assert.deepEqual(resolveRenewalPaymentDate('2026-10-09', NOW), { ok: true, dateKey: '2026-10-09' });
    assert.deepEqual(resolveRenewalPaymentDate('2026-10-01', NOW), { ok: true, dateKey: '2026-10-01' });
    assert.deepEqual(resolveRenewalPaymentDate('2026-10-10', NOW), { ok: false, error: 'future' });
    assert.deepEqual(resolveRenewalPaymentDate('', NOW), { ok: false, error: 'missing' });
    assert.deepEqual(resolveRenewalPaymentDate('2026-02-30', NOW), { ok: false, error: 'invalid' });
});

test('renewalPaymentTimestamp is "now" when the payment is today', () => {
    assert.equal(renewalPaymentTimestamp('2026-10-09', NOW), NOW.toISOString());
});

test('renewalPaymentTimestamp puts a past payment on its own local day and keeps the time of day', () => {
    const back = new Date(renewalPaymentTimestamp('2026-10-05', NOW));
    assert.equal(localDateKey(back), '2026-10-05');
    assert.equal(back.getHours(), NOW.getHours());
    assert.equal(back.getMinutes(), NOW.getMinutes());
});

test('renewalPaymentTimestamp rejects an invalid day', () => {
    assert.throws(() => renewalPaymentTimestamp('2026-02-30', NOW), RangeError);
});

test('a backdated renewal payment is counted in the caisse of the chosen day only', () => {
    const state = {
        caisseLogs: [{
            id: 'cash_subscription_renew_1',
            type: 'cash_movement',
            source: 'subscription',
            sourceId: 'renew_1',
            direction: 'in',
            amount: 3000,
            date: renewalPaymentTimestamp('2026-10-05', NOW),
            title: 'تجديد اشتراك: test'
        }]
    };

    const onPaymentDay = buildCaisseMovements(state, '2026-10-05', localDateKey);
    const onRenewalDay = buildCaisseMovements(state, '2026-10-09', localDateKey);

    assert.equal(onPaymentDay.subIncome, 3000);
    assert.equal(onPaymentDay.totalIncome, 3000);
    assert.equal(onPaymentDay.transactions.length, 1);
    assert.equal(onRenewalDay.subIncome, 0);
    assert.equal(onRenewalDay.transactions.length, 0);
});
