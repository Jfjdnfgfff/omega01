import test from 'node:test';
import assert from 'node:assert/strict';
import { readSupplierTransactions, isSupplierPurchase, readSupplierLegacy } from '../src/supplier-read.js';

test('legacy supplier records fill gaps without duplicating or modifying live transactions', () => {
  const live = Object.freeze([{ supplierName: ' ACME ', paidAmount: 200 }]);
  const suppliers = [{ name: 'acme', paid: 200 }, { name: "D'Atlas", paid: 50, debt: 25 }];
  const rows = readSupplierTransactions(suppliers, live);
  assert.equal(live.length, 1);
  assert.equal(rows.length, 2);
  assert.equal(rows[1].totalAmount, 75);
  assert.equal(rows[1].date, '');
  assert.equal(isSupplierPurchase(rows[1]), true);
  assert.equal(isSupplierPurchase({ type: 'payment', items: 'دفعة' }), false);
});

test('legacy supplier read finds nested records and does not mask network failures', async () => {
  const rows = { a: { name: 'Atlas' } };
  const paths = [];
  assert.equal(await readSupplierLegacy(async path => {
    paths.push(path);
    return path === 'gym_app_state/suppliers' ? rows : null;
  }, 'suppliers'), rows);
  assert.deepEqual(paths, ['suppliers', 'appState/suppliers', 'gym_app_state/suppliers']);
  await assert.rejects(readSupplierLegacy(async () => { throw new Error('offline'); }, 'suppliers'), /offline/);
});
