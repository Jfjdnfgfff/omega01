import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveSaleUnitPrice,
    parseWeightSpec,
    isWeightSaleProduct,
    resolveKiloStockDeduction,
    resolveKiloSale
} from '../src/product-pricing.js';

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

test('measurement parsing keeps the unit the stock is denominated in', () => {
    const kgSpec = parseWeightSpec('الوزن - 2.5kg');
    assert.equal(kgSpec.type, 'الوزن');
    assert.equal(kgSpec.value, 2.5);
    assert.equal(kgSpec.unitText, 'kg');
    assert.equal(kgSpec.isGrams, false);
    assert.equal(kgSpec.hasWeightUnit, true);
    assert.equal(kgSpec.unitLabel, 'كغ');
    assert.equal(parseWeightSpec('الوزن - 500g').isGrams, true);
    assert.equal(parseWeightSpec('الوزن - 500 غرام').isGrams, true);
    assert.equal(parseWeightSpec('الوزن - 2.5 كيلو').isGrams, false);
    assert.equal(parseWeightSpec('الحجم - 1.5L').hasWeightUnit, false);
    assert.equal(parseWeightSpec('').value, null);
});

test('only products measured by weight can be sold by the kilo', () => {
    assert.equal(isWeightSaleProduct({ weight: 'الوزن - 2.5kg' }), true);
    assert.equal(isWeightSaleProduct({ weight: 'الكمية (Doza) - 30 دوزة' }), false);
    assert.equal(isWeightSaleProduct({ weight: 'الحجم - 1.5L' }), false);
    assert.equal(isWeightSaleProduct({ weight: '' }), false);
    assert.equal(isWeightSaleProduct({ weight: '2.5kg' }), true);
    assert.equal(isWeightSaleProduct({ weight: 'Large' }), false);
    assert.equal(isWeightSaleProduct(null), false);
});

test('a kilo sale charges the chosen per-kilo price and deducts the sold weight', () => {
    const product = { id: 'p1', name: 'بروتين', weight: 'الوزن - 2.5kg', price: 4200, cost: 5000, stock: 10 };

    const sale = resolveKiloSale({ product, qtyKg: '0.5', pricePerKg: '1800' });

    assert.equal(sale.valid, true);
    assert.equal(sale.total, 900);
    assert.equal(sale.stockDeduction, 0.5);
    assert.equal(sale.cost, 1000);
    assert.equal(sale.qtyUnit, 'kg');
    assert.equal(sale.stockUnitLabel, 'كغ');
    // The catalog price stays untouched: the lower kilo price applies to this sale only.
    assert.equal(product.price, 4200);
});

test('stock kept in grams is deducted in grams when selling by the kilo', () => {
    const product = { id: 'p2', weight: 'الوزن - 500g', price: 900, cost: 700, stock: 5000 };

    assert.equal(resolveKiloStockDeduction(product, 0.5), 500);
    const sale = resolveKiloSale({ product, qtyKg: 0.5, pricePerKg: 1600 });
    assert.equal(sale.valid, true);
    assert.equal(sale.stockDeduction, 500);
    assert.equal(sale.stockUnitLabel, 'غرام');
    assert.equal(sale.cost, 700);
});

test('kilo sales reject a missing or non-positive price and a bad weight', () => {
    const product = { id: 'p3', weight: 'الوزن - 1kg', price: 2000, cost: 1500, stock: 5 };

    assert.equal(resolveKiloSale({ product, qtyKg: 1, pricePerKg: '' }).error, 'invalid_price');
    assert.equal(resolveKiloSale({ product, qtyKg: 1, pricePerKg: '0' }).error, 'invalid_price');
    assert.equal(resolveKiloSale({ product, qtyKg: 1, pricePerKg: 'abc' }).error, 'invalid_price');
    assert.equal(resolveKiloSale({ product, qtyKg: 0, pricePerKg: '1800' }).error, 'invalid_quantity');
    assert.equal(resolveKiloSale({ product, qtyKg: -2, pricePerKg: '1800' }).error, 'invalid_quantity');
    assert.equal(resolveKiloSale({ product, qtyKg: 1, pricePerKg: '1800' }).valid, true);
});

test('products that are not weighed cannot be sold by the kilo', () => {
    const box = { id: 'b1', category: 'boxes', weight: '', price: 4200, cost: 3000, stock: 3 };

    assert.equal(resolveKiloSale({ product: box, qtyKg: 1, pricePerKg: '1800' }).error, 'not_a_weight_product');
});
