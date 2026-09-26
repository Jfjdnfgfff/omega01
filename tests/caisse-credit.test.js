import test from 'node:test';
import assert from 'node:assert/strict';
import { isCaisseClosing, creditPaymentsOnDate, subscriptionPaidForCaisse } from '../src/caisse-credit.js';

const dateKey = input => String(input || '').slice(0, 10);
const subscriber = { id: 'member-1', startDate: '2026-09-24T09:00:00Z', price: 1000, paymentStatus: 'credit', debtAmount: 400 };
const receipt = { id: 'credit_payment_cr-1', type: 'credit_payment', creditId: 'cr-1', date: '2026-09-26T10:00:00Z', amount: 400, customerId: subscriber.id, subscriptionDate: '2026-09-24', subscriptionPaidBeforeSettlement: 600 };

test('repayment belongs to settlement date, while the original day retains only the paid portion', () => {
    const closedSubscriber = { ...subscriber, paymentStatus: 'paid', debtAmount: 0 };
    const logs = [receipt];
    assert.equal(subscriptionPaidForCaisse(subscriber, 1000, [], dateKey), 600);
    assert.equal(subscriptionPaidForCaisse(closedSubscriber, 1000, logs, dateKey), 600);
    assert.equal(creditPaymentsOnDate(logs, '2026-09-24', dateKey).length, 0);
    assert.equal(creditPaymentsOnDate(logs, '2026-09-26', dateKey)[0].amount, 400);
    assert.equal(subscriptionPaidForCaisse(closedSubscriber, 1000, logs, dateKey) + receipt.amount, 1000);
});

test('same-day repayment is not double-counted or treated as a caisse closing', () => {
    const sameDay = { ...subscriber, startDate: '2026-09-26T09:00:00Z', paymentStatus: 'paid', debtAmount: 0 };
    const sameDayReceipt = { ...receipt, subscriptionDate: '2026-09-26' };
    const closing = { id: 'caisse-1', date: '2026-09-26', actualAmount: 1000 };
    const logs = [sameDayReceipt, closing];
    const total = subscriptionPaidForCaisse(sameDay, 1000, logs, dateKey) +
        creditPaymentsOnDate(logs, '2026-09-26', dateKey).reduce((sum, p) => sum + p.amount, 0);
    assert.equal(total, 1000);
    assert.deepEqual(logs.filter(isCaisseClosing), [closing]);
});

test('a new subscription cycle on the same date does not inherit an old settlement', () => {
    const renewed = { ...subscriber, startDate: '2026-09-24T15:00:00Z', subscriptionCycleId: 'renew-2', paymentStatus: 'paid', debtAmount: 0 };
    assert.equal(subscriptionPaidForCaisse(renewed, 1500, [{ ...receipt, subscriptionDate: '2026-09-24' }], dateKey), 1500);
});

test('standalone credits count as repayment income and unrelated subscribers are unchanged', () => {
    const standalone = { id: 'credit_payment_cr-2', type: 'credit_payment', date: '2026-09-26T11:00:00Z', amount: 250 };
    assert.equal(creditPaymentsOnDate([receipt, standalone], '2026-09-26', dateKey)
        .reduce((sum, p) => sum + p.amount, 0), 650);
    assert.equal(subscriptionPaidForCaisse({ ...subscriber, id: 'member-2', paymentStatus: 'paid' }, 1000, [receipt], dateKey), 1000);
    assert.deepEqual(creditPaymentsOnDate(null, '2026-09-26', dateKey), []);
});
