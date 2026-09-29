import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveSaleUnitPrice } from '../src/product-pricing.js';

test('box sales can use a per-sale price override while keeping the catalog default intact', () => {
    const product = { id: 'box-1', category: 'boxes', price: 4200 };
    const chosenPrice = resolveSaleUnitPrice(product, { allowCustom: true, customPrice: '3900' });

    assert.deepEqual(chosenPrice, { unitPrice: 3900, isCustom: true, valid: true });
    assert.equal(product.price, 4200);
});

test('regular price remains the default and invalid custom prices are rejected', () => {
    const product = { id: 'box-1', category: 'boxes', price: 4200 };

    assert.deepEqual(resolveSaleUnitPrice(product), { unitPrice: 4200, isCustom: false, valid: true });
    assert.equal(resolveSaleUnitPrice(product, { allowCustom: true, customPrice: '-50' }).valid, false);
    assert.equal(resolveSaleUnitPrice(product, { allowCustom: true, customPrice: 'abc' }).valid, false);
});
