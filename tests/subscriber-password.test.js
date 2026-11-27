import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PASSWORD_SPACE,
  normalizeSubscriberPassword,
  isValidSubscriberPassword,
  collectUsedSubscriberPasswords,
  createPasswordAllocator,
  generateSubscriberPassword,
  assignMissingPasswords,
  findCustomerByPassword,
  isPasswordTaken,
} from '../src/subscriber-password.js';

// مولّد عشوائي متحكم به لتكرار التعارضات في الاختبارات
const sequenceRandom = (values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('normalizes Arabic-Indic and Persian digits into a 4-digit string', () => {
  assert.equal(normalizeSubscriberPassword('1234'), '1234');
  assert.equal(normalizeSubscriberPassword(9876), '9876');
  assert.equal(normalizeSubscriberPassword(' ١٢٣٤ '), '1234');
  assert.equal(normalizeSubscriberPassword('۱۲۳۴'), '1234');
  assert.equal(normalizeSubscriberPassword('12-34'), '1234');
  assert.equal(isValidSubscriberPassword('0042'), true);
});

test('rejects short, long, empty and non-numeric passwords', () => {
  for (const value of ['', '   ', '123', '12345', '12a4', 'abcd', null, undefined, NaN, Infinity, {}, []]) {
    assert.equal(normalizeSubscriberPassword(value), '', `should reject ${JSON.stringify(value)}`);
    assert.equal(isValidSubscriberPassword(value), false);
  }
});

test('allocator never repeats a password and keeps the 4-digit format', () => {
  const allocator = createPasswordAllocator([]);
  const issued = new Set();
  for (let i = 0; i < PASSWORD_SPACE; i++) {
    const password = allocator.next();
    assert.match(password, /^\d{4}$/);
    assert.ok(Number(password) >= 1000 && Number(password) <= 9999, `out of range: ${password}`);
    assert.equal(issued.has(password), false, `duplicate password ${password}`);
    issued.add(password);
  }
  assert.equal(issued.size, PASSWORD_SPACE);
  assert.equal(allocator.available, 0);
  assert.throws(() => allocator.next(), /استُنفدت/);
});

test('allocator skips passwords already used by existing subscribers', () => {
  // نفس البذرة العشوائية ترجع 1000 مرتين ثم 1001
  const random = sequenceRandom([0, 0, 0.00012]);
  const allocator = createPasswordAllocator([{ id: 'a', password: '1000' }], { random });
  assert.equal(allocator.isUsed('1000'), true);
  assert.equal(allocator.next(), '1001');
  assert.equal(allocator.isUsed('1001'), true);
});

test('generateSubscriberPassword avoids every existing subscriber, including numeric passwords', () => {
  const customers = Array.from({ length: 200 }, (_, i) => ({
    id: `c${i + 1}`,
    password: String(1000 + i),
  }));
  for (let i = 0; i < 50; i++) {
    const password = generateSubscriberPassword(customers);
    assert.match(password, /^\d{4}$/);
    assert.equal(customers.some(c => c.password === password), false);
  }
});

test('generateSubscriberPassword can exclude the record being edited', () => {
  const customers = [
    { id: 'me', password: '1234' },
    { id: 'other', password: '5678' },
  ];
  const password = generateSubscriberPassword(customers, { excludeIds: ['me'], random: () => 0 });
  assert.equal(password, '1000'); // 1234 is free for others, but 1000 is the first pick
  assert.notEqual(password, '5678');
  assert.equal(collectUsedSubscriberPasswords(customers).size, 2);
});

test('assignMissingPasswords backfills legacy subscribers without touching existing codes', () => {
  const customers = [
    { id: 'a', password: '1234' },
    { id: 'b' },
    { id: 'c', password: 5678 },
    { id: 'd', password: '12' },      // تالف
    { id: 'e', password: '1234' },    // مكرر
  ];
  const hints = new Map();
  const result = assignMissingPasswords(customers, { hints });

  assert.equal(result.changed.length, 3);
  assert.equal(result.duplicates, 1);
  for (const c of customers) assert.match(String(c.password), /^\d{4}$/);

  const passwords = customers.map(c => c.password);
  assert.equal(new Set(passwords).size, customers.length, 'all passwords must be unique');
  assert.equal(customers[0].password, '1234');   // أول ظهور يحتفظ بالكود
  assert.equal(customers[2].password, '5678');   // الرقم يُحوَّل إلى نص
  assert.equal(hints.get('a'), '1234');
  assert.equal(hints.get('e'), customers[4].password);
});

test('assignMissingPasswords is idempotent and honours stored hints', () => {
  const customers = [{ id: 'a' }, { id: 'b' }];
  const hints = new Map();
  const first = assignMissingPasswords(customers, { hints });
  assert.equal(first.changed.length, 2);

  // إعادة تشغيل على نسخة جديدة من نفس البيانات بلا أكواد (مثل بيانات Firebase)
  const reloaded = [{ id: 'a' }, { id: 'b' }];
  const second = assignMissingPasswords(reloaded, { hints });
  assert.deepEqual(reloaded.map(c => c.password), customers.map(c => c.password));

  // وعندما تصبح الأكواد محفوظة فعلياً لا يتغير شيء
  const stable = assignMissingPasswords(reloaded, { hints });
  assert.equal(stable.changed.length, 0);
  assert.equal(stable.duplicates, 0);
});

test('assignMissingPasswords tolerates junk input', () => {
  for (const value of [null, undefined, 'junk', 42, {}]) {
    const result = assignMissingPasswords(value);
    assert.equal(result.changed.length, 0);
    assert.equal(result.duplicates, 0);
  }
  const mixed = [null, 'x', 5, { id: 'ok' }];
  const result = assignMissingPasswords(mixed);
  assert.equal(result.changed.length, 1);
  assert.match(mixed[3].password, /^\d{4}$/);
});

test('findCustomerByPassword matches only the right subscriber', () => {
  const customers = [
    { id: 'a', name: 'أحمد', password: '1111' },
    { id: 'b', name: 'ياسين', password: '2222' },
  ];
  assert.equal(findCustomerByPassword(customers, '2222').id, 'b');
  assert.equal(findCustomerByPassword(customers, '٢٢٢٢').id, 'b');
  assert.equal(findCustomerByPassword(customers, '2222', { excludeIds: ['b'] }), null);
  assert.equal(findCustomerByPassword(customers, '9999'), null);
  assert.equal(findCustomerByPassword(customers, ''), null);
  assert.equal(isPasswordTaken(customers, '1111'), true);
  assert.equal(isPasswordTaken(customers, '1111', { excludeIds: ['a'] }), false);
});
