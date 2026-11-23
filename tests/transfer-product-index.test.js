import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeSearchText,
  transferProductLocation,
  transferProductsSignature,
  buildTransferProductIndex,
  searchTransferProducts,
  createTransferProductIndexer,
} from '../src/transfer-product-index.js';

const prod = (id, name, extra = {}) => ({ id, name, stock: 5, stockLocation: 'stock1', ...extra });

const sample = [
  prod('p1', 'Whey Gold', { barcode: '6291041500213', stock: 12, stockLocation: 'stock2', weight: '3kg', brand: 'BSN' }),
  prod('p2', 'Creatine Monohydrate', { barcode: 'CR8800', stock: 4, stockLocation: 'stock2' }),
  prod('p3', 'Whey Gold', { barcode: '6291041500213', stock: 2, stockLocation: 'stock1', weight: '3kg' }),
  prod('p4', 'شاي أخضر', { barcode: '7788', stock: 9, stockLocation: 'stock2' }),
  prod('p5', 'زجاجة ماء', { barcode: '5544', stock: 0, stockLocation: 'stock2' }),
  prod('p6', 'عصير برتقال', { barcode: '9911', stock: 3 }),
];

test('normalizeSearchText strips diacritics/tatweel, unifies letter variants, folds digits and lowercases Latin', () => {
  assert.equal(normalizeSearchText('  أَحْمَد   '), 'احمد');
  assert.equal(normalizeSearchText('إضافة'), 'اضافه');
  assert.equal(normalizeSearchText('مصطفى'), 'مصطفي');
  assert.equal(normalizeSearchText('Whey GOLD'), 'whey gold');
  assert.equal(normalizeSearchText('مبيــعات'), 'مبيعات');
  assert.equal(normalizeSearchText('٦٢٩١'), '6291');
  assert.equal(normalizeSearchText('۶۲۹۱'), '6291');
  assert.equal(normalizeSearchText(null), '');
  assert.equal(normalizeSearchText(undefined), '');
});

test('transferProductLocation defaults to stock1 and only stock2 maps to the warehouse', () => {
  assert.equal(transferProductLocation({}), 'stock1');
  assert.equal(transferProductLocation({ stockLocation: '' }), 'stock1');
  assert.equal(transferProductLocation({ stockLocation: 'stock1' }), 'stock1');
  assert.equal(transferProductLocation({ stockLocation: 'stock2' }), 'stock2');
  assert.equal(transferProductLocation(null), 'stock1');
});

test('buildTransferProductIndex keeps only source-location products with stock > 0', () => {
  const index = buildTransferProductIndex([...sample, null, 'junk', 42], 'stock2');
  assert.equal(index.fromLoc, 'stock2');
  assert.deepEqual(index.entries.map((e) => e.id), ['p1', 'p2', 'p4']);
  assert.equal(index.size, 3);

  // p5 (stock2) has zero stock, p3/p6 live elsewhere → excluded.
  assert.equal(index.byId.has('p5'), false);
  assert.equal(index.byId.has('p3'), false);
  assert.equal(index.byId.has('p6'), false);

  // O(1) lookups.
  assert.equal(index.byId.get('p1').product.name, 'Whey Gold');
  assert.equal(index.byBarcode.get('6291041500213').id, 'p1');
  assert.equal(index.byBarcode.get('cr8800').id, 'p2');
});

test('buildTransferProductIndex treats a missing stockLocation as stock1', () => {
  const index = buildTransferProductIndex(sample, 'stock1');
  assert.deepEqual(index.entries.map((e) => e.id), ['p3', 'p6']);
});

test('buildTransferProductIndex tolerates a missing/degenerate source', () => {
  for (const value of [undefined, null, 'nope', 5, {}]) {
    const index = buildTransferProductIndex(value, 'stock2');
    assert.equal(index.size, 0);
    assert.equal(index.entries.length, 0);
    assert.equal(index.byId.size, 0);
    assert.equal(index.byBarcode.size, 0);
  }
});

test('empty query lists the transferable products and respects limit', () => {
  const index = buildTransferProductIndex(sample, 'stock2');
  assert.deepEqual(searchTransferProducts(index, '').map((p) => p.id), ['p1', 'p2', 'p4']);
  assert.deepEqual(searchTransferProducts(index, '   ').map((p) => p.id), ['p1', 'p2', 'p4']);
  assert.deepEqual(searchTransferProducts(index, '', { limit: 2 }).map((p) => p.id), ['p1', 'p2']);
});

test('an exact barcode match returns that product alone in O(1)', () => {
  const index = buildTransferProductIndex(sample, 'stock2');
  assert.deepEqual(searchTransferProducts(index, '6291041500213').map((p) => p.id), ['p1']);
  // Latin barcode is case-insensitive.
  assert.deepEqual(searchTransferProducts(index, 'cr8800').map((p) => p.id), ['p2']);
  assert.deepEqual(searchTransferProducts(index, 'CR8800').map((p) => p.id), ['p2']);
});

test('partial queries match names, brands, weights and barcodes as substrings', () => {
  const index = buildTransferProductIndex(sample, 'stock2');
  assert.deepEqual(searchTransferProducts(index, 'whey').map((p) => p.id), ['p1']);
  assert.deepEqual(searchTransferProducts(index, 'crea').map((p) => p.id), ['p2']);
  assert.deepEqual(searchTransferProducts(index, '629104').map((p) => p.id), ['p1']);
  assert.deepEqual(searchTransferProducts(index, '3kg').map((p) => p.id), ['p1']);
  assert.deepEqual(searchTransferProducts(index, 'bsn').map((p) => p.id), ['p1']);
});

test('search ignores Arabic diacritics and letter variants on both sides', () => {
  const index = buildTransferProductIndex([
    prod('a1', 'عصير برتقال', { stockLocation: 'stock2', barcode: '11' }),
    prod('a2', 'أحمد وليم', { stockLocation: 'stock2', barcode: '22' }),
  ], 'stock2');
  assert.deepEqual(searchTransferProducts(index, 'برتقال').map((p) => p.id), ['a1']);
  assert.deepEqual(searchTransferProducts(index, 'احمد').map((p) => p.id), ['a2']);
  assert.deepEqual(searchTransferProducts(index, 'أحمد').map((p) => p.id), ['a2']);
});

test('multi-token search requires every token (AND semantics)', () => {
  const index = buildTransferProductIndex(sample, 'stock2');
  assert.deepEqual(searchTransferProducts(index, 'whey gold').map((p) => p.id), ['p1']);
  assert.deepEqual(searchTransferProducts(index, 'whey 3kg').map((p) => p.id), ['p1']);
  assert.equal(searchTransferProducts(index, 'whey creatine').length, 0);
  assert.equal(searchTransferProducts(index, 'منتج غير موجود').length, 0);
});

test('transferProductsSignature is stable for identical data and reacts to every mutation path', () => {
  const list = sample.map((p) => ({ ...p }));
  const base = transferProductsSignature(list, 'stock2');
  assert.equal(transferProductsSignature(list.map((p) => ({ ...p })), 'stock2'), base);

  const afterStock = list.map((p) => ({ ...p, stock: p.id === 'p1' ? 11 : p.stock }));
  assert.notEqual(transferProductsSignature(afterStock, 'stock2'), base);

  const afterMove = list.map((p) => ({ ...p, stockLocation: p.id === 'p2' ? 'stock1' : p.stockLocation }));
  assert.notEqual(transferProductsSignature(afterMove, 'stock2'), base);

  const afterRename = list.map((p) => ({ ...p, name: p.id === 'p4' ? 'شاي أحمر' : p.name }));
  assert.notEqual(transferProductsSignature(afterRename, 'stock2'), base);

  // Direction is part of the fingerprint.
  assert.notEqual(transferProductsSignature(list, 'stock1'), base);

  // Fractional stock (gram-priced goods) is compared at 1/100 precision.
  const frac = [{ id: 'f1', name: 'عسل', stock: 1.25, stockLocation: 'stock2' }];
  const fracSig = transferProductsSignature(frac, 'stock2');
  assert.equal(transferProductsSignature([{ ...frac[0] }], 'stock2'), fracSig);
  assert.notEqual(transferProductsSignature([{ ...frac[0], stock: 1.26 }], 'stock2'), fracSig);
});

test('createTransferProductIndexer memoises until the signature changes', () => {
  const indexer = createTransferProductIndexer();
  const list = sample.map((p) => ({ ...p }));

  const first = indexer.get(list, 'stock2');
  assert.equal(indexer.get(list, 'stock2'), first, 'same data must return the cached index');

  list[0] = { ...list[0], stock: 11 };
  const second = indexer.get(list, 'stock2');
  assert.notEqual(second, first, 'a stock change must rebuild');
  assert.equal(second.byId.get('p1').product.stock, 11);

  // Switching direction rebuilds even for untouched data.
  const flipped = indexer.get(sample, 'stock1');
  assert.equal(flipped.fromLoc, 'stock1');

  indexer.invalidate();
  assert.notEqual(indexer.get(sample, 'stock1'), flipped, 'invalidate must force a rebuild');
});
