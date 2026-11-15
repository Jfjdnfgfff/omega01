import test from 'node:test';
import assert from 'node:assert/strict';
import { createSearchIndex } from '../src/search-index.js';

test('searchCustomers matches partial/prefix Arabic tokens and phone substrings without full-word requirement', () => {
  const idx = createSearchIndex();
  idx.rebuild({
    customers: [
      { id: 101, name: 'محمد أمين بوعلام', phone: '0555123456', barcode: 'BC9901' },
      { id: 102, name: 'كريم سلطاني', phone: '0661987654', barcode: 'BC9902' },
    ],
    products: [],
  });

  // Partial Arabic prefix ("محم" for "محمد")
  const byPrefix = idx.searchCustomers('محم');
  assert.equal(byPrefix.length, 1);
  assert.equal(byPrefix[0].id, 101);

  // Multi-word partial prefix ("محم بوع")
  const byMultiPrefix = idx.searchCustomers('محم بوع');
  assert.equal(byMultiPrefix.length, 1);
  assert.equal(byMultiPrefix[0].id, 101);

  // Partial phone digits ("5123")
  const byDigits = idx.searchCustomers('5123');
  assert.equal(byDigits.length, 1);
  assert.equal(byDigits[0].id, 101);

  // Empty query returns up to limit in O(limit)
  const limited = idx.searchCustomers('', { limit: 1 });
  assert.equal(limited.length, 1);
});

test('removeCustomer and removeProduct handle numeric and string IDs consistently', () => {
  const idx = createSearchIndex();
  idx.addCustomer({ id: 77, name: 'يوسف مرابط', phone: '0770112233' });
  idx.addProduct({ id: 88, name: 'Creatine Monohydrate', barcode: 'CR8800' });

  assert.equal(idx.searchCustomers('يوس').length, 1);
  assert.equal(idx.searchProducts('crea').length, 1);

  idx.removeCustomer(77);
  idx.removeProduct('88');

  assert.equal(idx.searchCustomers('يوس').length, 0);
  assert.equal(idx.searchProducts('crea').length, 0);
});
