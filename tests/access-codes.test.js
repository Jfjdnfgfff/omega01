import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeAccessCode,
  isValidAccessCode,
  normalizeSupplierName,
  normalizeWorkerName,
  collectAccessCodes,
  generateAccessCode,
  isSupplierCodeTaken,
  isWorkerCodeTaken,
  assignSupplierPasswords,
  assignWorkerPasswords,
  findSupplierByCode,
  findWorkerByCode,
} from '../src/access-codes.js';

const sequenceRandom = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('normalizes 4-digit codes and rejects invalid ones', () => {
  assert.equal(normalizeAccessCode('4321'), '4321');
  assert.equal(normalizeAccessCode(4321), '4321');
  assert.equal(normalizeAccessCode('٤٣٢١'), '4321');
  assert.equal(normalizeAccessCode(' 43-21 '), '4321');
  for (const value of ['', '123', '12345', 'abcd', null, undefined, NaN, {}]) {
    assert.equal(normalizeAccessCode(value), '');
    assert.equal(isValidAccessCode(value), false);
  }
});

test('name normalization matches the staff and supplier screens', () => {
  assert.equal(normalizeWorkerName('  Ahmed   Ali '), 'ahmed ali');
  assert.equal(normalizeSupplierName('  Omega   Store '), 'omega store');
  assert.equal(normalizeWorkerName(null), '');
  assert.equal(normalizeSupplierName(undefined), '');
});

test('collectAccessCodes gathers codes from customers, suppliers and staff', () => {
  const used = collectAccessCodes({
    customers: [{ password: '1111' }, { password: '2222' }],
    suppliers: [{ password: '3333' }],
    staff: { 'ahmed ali': { name: 'Ahmed Ali', password: '4444' } },
  });
  assert.deepEqual([...used].sort(), ['1111', '2222', '3333', '4444']);
  assert.equal(collectAccessCodes({}).size, 0);
  assert.equal(collectAccessCodes(null || {}).size, 0);
});

test('generateAccessCode never reuses any customer, supplier or staff code', () => {
  const state = {
    customers: [{ password: '1000' }, { password: '1001' }],
    suppliers: [{ password: '1002' }],
    staff: [{ name: 'x', password: '1003' }],
  };
  for (let i = 0; i < 40; i++) {
    const code = generateAccessCode(state);
    assert.match(code, /^\d{4}$/);
    assert.equal(collectAccessCodes(state).has(code), false, `reused ${code}`);
  }
});

test('generateAccessCode skips the record\'s own previous code when regenerating', () => {
  const state = { suppliers: [], staff: [] };
  // نفس البذرة ترجع 1000 مرتين ثم 1001
  const code = generateAccessCode(state, { previous: '1000', random: sequenceRandom([0, 0, 0.00012]) });
  assert.notEqual(code, '1000');
  assert.equal(code, '1001');
});

test('generateAccessCode honours explicit exclusions', () => {
  const state = { suppliers: [{ name: 'a', password: '4000' }] };
  const code = generateAccessCode(state, { exclude: ['4000'] });
  assert.notEqual(code, '4000');
});

test('supplier and worker code checks ignore the excluded record only', () => {
  const suppliers = [
    { name: 'Omega Store', password: '5555' },
    { name: 'Other', password: '6666' },
  ];
  assert.equal(isSupplierCodeTaken(suppliers, '5555'), true);
  assert.equal(isSupplierCodeTaken(suppliers, '5555', { excludeNames: ['  omega   store '] }), false);
  assert.equal(isSupplierCodeTaken(suppliers, '0000'), false);

  const staff = [{ name: 'Ahmed Ali', password: '7777' }];
  assert.equal(isWorkerCodeTaken(staff, '٧٧٧٧'), true);
  assert.equal(isWorkerCodeTaken(staff, '7777', { excludeNames: ['ahmed ali'] }), false);
});

test('assignSupplierPasswords backfills, repairs duplicates and keeps valid codes', () => {
  const state = { customers: [{ password: '1111' }] };
  const suppliers = [
    { name: 'a', password: '2222' },
    { name: 'b' },
    { name: 'c', password: '1111' },   // يتعارض مع مشترك
    { name: 'd', password: '2222' },   // مكرر
    { name: 'e', password: '12' },     // تالف
  ];
  const result = assignSupplierPasswords(suppliers, { state });
  assert.equal(result.changed.length, 4);
  const codes = suppliers.map(s => s.password);
  codes.forEach(code => assert.match(String(code), /^\d{4}$/));
  assert.equal(new Set(codes).size, suppliers.length, 'codes must be unique');
  assert.equal(suppliers[0].password, '2222');
  assert.notEqual(suppliers[2].password, '1111');
  assert.equal(state.customers[0].password, '1111', 'customers are never modified');
});

test('assignWorkerPasswords backfills workers and avoids supplier codes', () => {
  const state = { suppliers: [{ name: 's', password: '3333' }] };
  const staff = [
    { name: 'Ahmed', password: '4444' },
    { name: 'Bilal' },
    { name: 'Karim', password: '3333' },
    { name: 'Sami', password: '4444' },
  ];
  const result = assignWorkerPasswords(staff, { state });
  assert.equal(result.changed.length, 3);
  const codes = staff.map(w => w.password);
  assert.equal(new Set(codes).size, staff.length);
  assert.equal(CodesHasNo(state.suppliers[0].password, codes), false);
  assert.equal(staff[0].password, '4444');
});

const CodesHasNo = (code, codes) => codes.includes(code);

test('assignment is idempotent for already-valid data', () => {
  const state = {};
  const suppliers = [{ name: 'a', password: '1212' }, { name: 'b', password: '3434' }];
  const staff = [{ name: 'x', password: '5656' }];
  assert.equal(assignSupplierPasswords(suppliers, { state }).changed.length, 0);
  assert.equal(assignWorkerPasswords(staff, { state }).changed.length, 0);
});

test('assignment tolerates junk input', () => {
  for (const value of [null, undefined, 'junk', 4, {}]) {
    assert.equal(assignSupplierPasswords(value).changed.length, 0);
    assert.equal(assignWorkerPasswords(value).changed.length, 0);
  }
});

test('find by code returns the right supplier / worker', () => {
  const suppliers = [{ name: 'Omega', password: '8080' }, { name: 'Other', password: '9090' }];
  assert.equal(findSupplierByCode(suppliers, '9090').name, 'Other');
  assert.equal(findSupplierByCode(suppliers, '9090', { excludeNames: ['Other'] }), null);
  assert.equal(findSupplierByCode(suppliers, '0000'), null);

  const staff = [{ name: 'Ahmed', password: '7171' }];
  assert.equal(findWorkerByCode(staff, '٧١٧١').name, 'Ahmed');
  assert.equal(findWorkerByCode(staff, '7171', { excludeNames: ['ahmed'] }), null);
});
