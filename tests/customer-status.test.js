import test from 'node:test';
import assert from 'node:assert/strict';
import { applyRenewalToCustomer, calculateStatus, getRemainingDays, cleanCustomerForStorage } from '../src/customer-status.js';
import { snapshotSubscription, restoreSubscription } from '../src/renewal-rollback.js';

const now = new Date(2026, 5, 15, 12);
const date = days => {
  const d = new Date(now);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00.000Z`;
};
const day = days => date(days).slice(0, 10);
const renewal = (type, extra = {}) => ({
  subscriptionType: type, packageId: 'new', price: 1000, paymentStatus: 'paid',
  debtAmount: 0, cycleId: 'renew1', paymentDateKey: day(0), now, ...extra
});

test('renewing an expired time subscription updates its status immediately and after reload', () => {
  const customer = { subscriptionType: 'time', status: 'active', endDate: date(-10), _endMs: Date.parse(date(-10)) };
  assert.equal(calculateStatus(customer, now.getTime()), 'expired');
  applyRenewalToCustomer(customer, renewal('time', { startDateVal: day(0), endDateVal: day(30) }));
  assert.equal(calculateStatus(customer, now.getTime()), 'active');
  assert.equal(getRemainingDays(customer, now.getTime()), 30);
  assert.equal(customer._endMs, undefined);
  const reloaded = JSON.parse(JSON.stringify(cleanCustomerForStorage(customer)));
  assert.equal(calculateStatus(reloaded, now.getTime()), 'active');
});

test('near expiry stays near expiry, and stale persisted cache is ignored', () => {
  const customer = { subscriptionType: 'time', endDate: date(3), _endMs: Date.parse(date(-10)), _endMsFor: date(3) };
  assert.equal(calculateStatus(customer, now.getTime()), 'near_expiry');
  assert.equal(getRemainingDays(customer, now.getTime()), 3);
  assert.deepEqual(cleanCustomerForStorage(customer), { subscriptionType: 'time', endDate: date(3) });
});

test('cache tracks edits, freeze extensions and rollback without explicit invalidation', () => {
  const customer = { subscriptionType: 'time', endDate: date(-1) };
  assert.equal(calculateStatus(customer, now.getTime()), 'expired');
  customer.endDate = date(30);
  assert.equal(calculateStatus(customer, now.getTime()), 'active');
  const snapshot = snapshotSubscription(customer);
  customer.endDate = date(2);
  assert.equal(calculateStatus(customer, now.getTime()), 'near_expiry');
  customer.status = 'frozen';
  assert.equal(calculateStatus(customer, now.getTime()), 'frozen');
  customer.endDate = date(40);
  customer.status = 'active';
  assert.equal(getRemainingDays(customer, now.getTime()), 40);
  restoreSubscription(customer, snapshot);
  assert.equal(getRemainingDays(customer, now.getTime()), 30);
});

test('switching between session and time subscriptions clears old cycle fields', () => {
  const c = { subscriptionType: 'session', remainingSessions: 0, totalSessions: 10, endDate: date(-10) };
  assert.equal(calculateStatus(c, now.getTime()), 'expired');
  applyRenewalToCustomer(c, renewal('time', { startDateVal: day(0), endDateVal: day(30) }));
  assert.equal(c.remainingSessions, null);
  assert.equal(calculateStatus(c, now.getTime()), 'active');
  applyRenewalToCustomer(c, renewal('session', { totalSessions: 10, remainingSessions: 2 }));
  assert.equal(c.endDate, null);
  assert.equal(calculateStatus(c, now.getTime()), 'near_expiry');
  c.remainingSessions = 0;
  assert.equal(calculateStatus(c, now.getTime()), 'expired');
});

test('session renewal clears expired dates but retains a future session expiry', () => {
  const c = { subscriptionType: 'session', remainingSessions: 0, endDate: date(-5) };
  applyRenewalToCustomer(c, renewal('session', { totalSessions: 10, remainingSessions: 10 }));
  assert.equal(c.endDate, null);
  assert.equal(calculateStatus(c, now.getTime()), 'active');
  c.endDate = date(30);
  applyRenewalToCustomer(c, renewal('session', { totalSessions: 10, remainingSessions: 10 }));
  assert.equal(c.endDate, date(30));
});

test('explicit time subscriptions ignore stale session counts, legacy sessions still work', () => {
  assert.equal(calculateStatus({ subscriptionType: 'time', remainingSessions: 0, endDate: date(30) }, now.getTime()), 'active');
  assert.equal(calculateStatus({ remainingSessions: 0 }, now.getTime()), 'expired');
  assert.equal(calculateStatus({ remainingSessions: 2 }, now.getTime()), 'near_expiry');
});
