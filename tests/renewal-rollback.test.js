import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotSubscription, restoreSubscription, renewalRollbackCheck } from '../src/renewal-rollback.js';
import { buildCaisseMovements } from '../src/caisse-transactions.js';

const dateKey = value => String(value || '').slice(0, 10);
const oldDay = '2026-09-12';
const paymentDay = '2026-09-18';
const cycle = 'renew_123_xyz';

function scenario(cash = 600) {
    const customer = {
        id: 'member-1', name: 'Member', phone: '0550000000',
        subscriptionCycleId: 'sub_member-1', price: 400,
        packageId: 'old', subscriptionType: 'session', totalSessions: 10,
        remainingSessions: 3, startDate: oldDay, paymentStatus: 'paid'
    };
    const previousSubscription = snapshotSubscription(customer);
    Object.assign(customer, {
        subscriptionCycleId: cycle, price: 1000, packageId: 'new',
        subscriptionType: 'time', startDate: paymentDay, endDate: '2026-10-18',
        paymentStatus: 'credit', debtAmount: 400
    });
    delete customer.totalSessions;
    delete customer.remainingSessions;
    const original = { id: 'cash_sub_member-1', type: 'cash_movement', source: 'subscription',
        sourceId: 'sub_member-1', amount: 400, date: `${oldDay}T10:00:00` };
    const renewal = { id: 'cash_' + cycle, type: 'cash_movement', source: 'subscription',
        sourceId: cycle, customerId: customer.id, previousSubscription,
        renewalCreditId: 'debt-1', renewalDebtAmount: 400,
        amount: cash, date: `${paymentDay}T12:00:00` };
    const state = { customers: [customer], caisseLogs: [original, renewal],
        credits: [{ id: 'debt-1', amount: 400 }] };
    return { customer, renewal, state };
}

test('deleting latest renewal restores subscription, removes its cash on the payment day, and leaves earlier cash untouched', () => {
    const { customer, renewal, state } = scenario();
    assert.equal(renewalRollbackCheck(customer, renewal, state.credits, state.caisseLogs).ok, true);
    assert.equal(buildCaisseMovements(state, paymentDay, dateKey).subIncome, 600);
    state.caisseLogs = state.caisseLogs.filter(log => log !== renewal);
    state.credits = [];
    restoreSubscription(customer, renewal.previousSubscription);
    assert.equal(buildCaisseMovements(state, paymentDay, dateKey).subIncome, 0);
    assert.equal(buildCaisseMovements(state, oldDay, dateKey).subIncome, 400);
    assert.equal(customer.remainingSessions, 3);
    assert.equal(customer.subscriptionCycleId, 'sub_member-1');
    assert.equal(customer.phone, '0550000000');
    assert.equal(Object.hasOwn(customer, 'endDate'), false);
});

test('a completely unpaid renewal is still tracked but contributes no cash, and can be undone', () => {
    const { customer, renewal, state } = scenario(0);
    assert.equal(buildCaisseMovements(state, paymentDay, dateKey).subIncome, 0);
    assert.equal(renewalRollbackCheck(customer, renewal, state.credits, state.caisseLogs).ok, true);
    state.caisseLogs = state.caisseLogs.filter(log => log !== renewal);
    restoreSubscription(customer, renewal.previousSubscription);
    assert.equal(buildCaisseMovements(state, oldDay, dateKey).subIncome, 400);
});

test('cannot undo older or legacy renewals, or a renewal whose debt was repaid', () => {
    const { customer, renewal, state } = scenario();
    assert.equal(renewalRollbackCheck({ ...customer, subscriptionCycleId: 'renew_next' }, renewal).ok, false);
    assert.equal(renewalRollbackCheck(customer, { ...renewal, previousSubscription: null }).ok, false);
    state.caisseLogs.push({ id: 'repay', type: 'credit_payment', creditId: 'debt-1', amount: 10 });
    assert.equal(renewalRollbackCheck(customer, renewal, state.credits, state.caisseLogs).reason, 'repaid');
    state.caisseLogs.pop();
    state.credits[0].amount = 390;
    assert.equal(renewalRollbackCheck(customer, renewal, state.credits, state.caisseLogs).reason, 'repaid');
});
