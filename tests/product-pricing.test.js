import test from 'node:test';
import assert from 'node:assert/strict';
import {
    resolveSaleUnitPrice,
    parseWeightSpec,
    isWeightSaleProduct,
    isDoseProduct,
    isKiloSaleProduct,
    isGramPricedProduct,
    stockUnitsPerKg,
    resolveKiloStockDeduction,
    resolveKiloSale,
    resolveGramSale,
    normalizeKiloPrice,
    defaultKiloSalePrice,
    normalizeGramPrice,
    defaultGramSalePrice,
    defaultGramCostPrice,
    defaultDoseGrams,
    gramsPerUnit,
    deriveUnitPricesFromGrams
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

test('the sell-by-kilo switch covers weighed products and dose products', () => {
    assert.equal(isKiloSaleProduct({ weight: 'الوزن - 2.5kg' }), true);
    assert.equal(isKiloSaleProduct({ category: 'doses', weight: 'الكمية (Doza) - 30 دوزة' }), true);
    // A dose measurement alone is enough, even when the category was never saved.
    assert.equal(isKiloSaleProduct({ weight: 'الكمية (Doza) - 30 دوزة' }), true);
    // An explicit box/frigo category wins over a dose-looking name.
    assert.equal(isKiloSaleProduct({ category: 'boxes', weight: 'الكمية (Doza) - 30 دوزة' }), false);
    assert.equal(isKiloSaleProduct({ category: 'boxes', weight: '' }), false);
    assert.equal(isKiloSaleProduct({ category: 'frigo', weight: '' }), false);
    assert.equal(isKiloSaleProduct({ weight: 'الحجم - 1.5L' }), false);
    assert.equal(isKiloSaleProduct(null), false);

    assert.equal(isDoseProduct({ category: 'doses' }), true);
    assert.equal(isDoseProduct({ weight: 'الكمية (Doza) - 30 دوزة' }), true);
    assert.equal(isDoseProduct({ weight: 'الوزن - 2.5kg' }), false);
    assert.equal(isDoseProduct(null), false);
});

test('dose stock is kept in grams, so one kilo deducts 1000 units', () => {
    const dose = { id: 'd1', category: 'doses', weight: 'الكمية (Doza) - 60 دوزة', stock: 2400 };

    assert.equal(parseWeightSpec('الكمية (Doza) - 60 دوزة').unitLabel, 'غرام');
    assert.equal(stockUnitsPerKg(dose), 1000);
    assert.equal(resolveKiloStockDeduction(dose, 1), 1000);
    assert.equal(resolveKiloStockDeduction(dose, 0.5), 500);
    assert.equal(resolveKiloStockDeduction(dose, 2.4), 2400);
});

test('a dose kilo sale charges the typed per-kilo price and deducts the sold weight in grams', () => {
    const product = {
        id: 'd2', name: 'واي بروتين', category: 'doses',
        weight: 'الكمية (Doza) - 60 دوزة', price: 12000, cost: 9000, stock: 2400
    };

    const sale = resolveKiloSale({ product, qtyKg: 0.5, pricePerKg: '2000' });

    assert.equal(sale.valid, true);
    assert.equal(sale.isDose, true);
    assert.equal(sale.total, 1000);
    assert.equal(sale.stockDeduction, 500);
    assert.equal(sale.stockUnitLabel, 'غرام');
    assert.equal(sale.qtyUnit, 'kg');
    // The dose count is not a stock denominator: dose cost = recorded cost × kg sold,
    // the same `cost × qty` a normal (per-dose) sale of this product would record.
    assert.equal(sale.cost, 4500);
    assert.equal(product.stock, 2400);
});

test('a dose product without a measurement still sells by the kilo at 1000 units per kg', () => {
    const product = { id: 'd3', category: 'doses', weight: '', price: 12000, cost: 9, stock: 3000 };

    const sale = resolveKiloSale({ product, qtyKg: 1, pricePerKg: '2000' });

    assert.equal(sale.valid, true);
    assert.equal(sale.stockDeduction, 1000);
    assert.equal(sale.cost, 9);
    assert.equal(sale.total, 2000);
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

test('products that are neither weighed nor doses cannot be sold by the kilo', () => {
    const box = { id: 'b1', category: 'boxes', weight: '', price: 4200, cost: 3000, stock: 3 };

    assert.equal(resolveKiloSale({ product: box, qtyKg: 1, pricePerKg: '1800' }).error, 'not_a_kilo_product');
    assert.equal(resolveKiloSale({ product: { weight: 'الحجم - 1.5L' }, qtyKg: 1, pricePerKg: '1800' }).error, 'not_a_kilo_product');
});

test('the per-kilo price saved on a product prefills the sale, and invalid values save as 0', () => {
    assert.equal(normalizeKiloPrice('1800'), 1800);
    assert.equal(normalizeKiloPrice(''), 0);
    assert.equal(normalizeKiloPrice('-5'), 0);
    assert.equal(normalizeKiloPrice('abc'), 0);
    assert.equal(normalizeKiloPrice(undefined), 0);

    const dose = { id: 'd2', category: 'doses', weight: 'الكمية (Doza) - 60 دوزة', price: 500, kiloPrice: 2400 };
    assert.equal(defaultKiloSalePrice(dose), '2400');
    assert.equal(defaultKiloSalePrice({ id: 'd3', category: 'doses', price: 500 }), '');
});

test('gram-priced doses multiply grams per dose, dose count and gram price, and deduct grams', () => {
    const product = { id: 'dose', category: 'doses', weight: 'الكمية (Doza) - 30 دوزة', price: 150, cost: 70, stock: 2000 };
    const single = resolveGramSale({ product, mode: 'dose', qty: 1, gramsPerDose: 50, pricePerGram: 4 });
    assert.equal(single.valid, true);
    assert.equal(single.total, 200);
    assert.equal(single.pricePerUnit, 200);
    assert.equal(single.stockDeduction, 50);
    assert.equal(single.cost, 70);
    const two = resolveGramSale({ product, mode: 'dose', qty: 2, gramsPerDose: 50, pricePerGram: 4 });
    assert.equal(two.total, 400);
    assert.equal(two.stockDeduction, 100);
    assert.equal(product.price, 150);
    assert.equal(product.stock, 2000);
});

test('gram-priced kilo multiplies 1000 grams per kg, including fractional kg', () => {
    const product = { id: 'dose', category: 'doses', stock: 2000, cost: 90 };
    const kilo = resolveGramSale({ product, mode: 'kilo', qty: 1, pricePerGram: 4 });
    assert.equal(kilo.valid, true);
    assert.equal(kilo.total, 4000);
    assert.equal(kilo.pricePerKg, 4000);
    assert.equal(kilo.gramsSold, 1000);
    assert.equal(kilo.stockDeduction, 1000);
    const half = resolveGramSale({ product, mode: 'kilo', qty: 0.5, pricePerGram: 4 });
    assert.equal(half.total, 2000);
    assert.equal(half.stockDeduction, 500);
    const weighed = resolveGramSale({ product: { weight: 'الوزن - 2kg', cost: 1000 }, mode: 'kilo', qty: 1, pricePerGram: 4 });
    assert.equal(weighed.total, 4000);
    assert.equal(weighed.stockDeduction, 1);
});

test('gram pricing rejects invalid price, dose grams and unsupported product types', () => {
    const product = { category: 'doses', cost: 20 };
    assert.equal(resolveGramSale({ product, mode: 'dose', qty: 1, pricePerGram: '', gramsPerDose: 50 }).error, 'invalid_price');
    assert.equal(resolveGramSale({ product, mode: 'dose', qty: 1, pricePerGram: 4, gramsPerDose: '' }).error, 'invalid_grams');
    assert.equal(resolveGramSale({ product, mode: 'dose', qty: 1, pricePerGram: 4, gramsPerDose: -50 }).error, 'invalid_grams');
    assert.equal(resolveGramSale({ product, mode: 'kilo', qty: 0, pricePerGram: 4 }).error, 'invalid_quantity');
    assert.equal(resolveGramSale({ product: { category: 'boxes' }, mode: 'dose', qty: 1, pricePerGram: 4, gramsPerDose: 50 }).error, 'invalid_mode');
});

test('a product saves fractional gram pricing and a dose weight to prefill both sale modes', () => {
    assert.equal(normalizeGramPrice('0.025'), 0.025);
    assert.equal(normalizeGramPrice(''), 0);
    assert.equal(normalizeGramPrice('-5'), 0);
    assert.equal(normalizeGramPrice('bad'), 0);
    const product = {
        category: 'doses',
        gramPrice: normalizeGramPrice('4'),
        gramSalePrice: normalizeGramPrice('6'),
        doseGrams: 50
    };
    assert.equal(defaultGramCostPrice(product), '4');
    assert.equal(defaultGramSalePrice(product), '6');
    assert.equal(defaultDoseGrams(product), '50');
    assert.equal(resolveGramSale({ product, mode: 'dose', qty: 1, gramsPerDose: defaultDoseGrams(product), pricePerGram: defaultGramSalePrice(product) }).total, 300);
    assert.equal(resolveGramSale({ product, mode: 'kilo', qty: 1, pricePerGram: defaultGramSalePrice(product) }).total, 6000);
    // A product saved before the selling gram price existed has no prefill for it:
    // its old `gramPrice` is the purchase price, never a selling price.
    assert.equal(defaultGramSalePrice({ category: 'doses', gramPrice: 4 }), '');
    assert.equal(defaultGramCostPrice({ category: 'doses', gramPrice: 4 }), '4');
    assert.equal(defaultGramSalePrice({}), '');
    assert.equal(defaultGramCostPrice({}), '');
    assert.equal(defaultDoseGrams({}), '50');
});

test('the two gram prices give the cost, the selling price and the net profit of one dose', () => {
    const product = { category: 'doses', weight: 'الكمية (Doza) - 30 دوزة', doseGrams: 50 };
    const derived = deriveUnitPricesFromGrams({ product, costPerGram: '4', salePerGram: '6' });

    assert.equal(derived.valid, true);
    assert.equal(derived.gramsPerUnit, 50);
    assert.equal(derived.cost, 200);
    assert.equal(derived.price, 300);
    assert.equal(derived.profit, 100);
    // A missing gram price is reported instead of silently saving a zero price.
    assert.equal(deriveUnitPricesFromGrams({ product, costPerGram: '', salePerGram: '6' }).error, 'invalid_cost_gram');
    assert.equal(deriveUnitPricesFromGrams({ product, costPerGram: '4', salePerGram: '' }).error, 'invalid_sale_gram');
    // A sale below the purchase price is still computed, it is simply a loss.
    assert.equal(deriveUnitPricesFromGrams({ product, costPerGram: 6, salePerGram: 4 }).profit, -100);
});

test('a weighed product is priced per gram over the whole package weight', () => {
    const kgPack = { weight: 'الوزن - 2.5kg' };
    const gramPack = { weight: 'الوزن - 500g' };
    const box = { category: 'boxes', weight: '' };

    assert.equal(gramsPerUnit(kgPack), 2500);
    assert.equal(gramsPerUnit(gramPack), 500);
    assert.equal(isGramPricedProduct(kgPack), true);
    assert.equal(isGramPricedProduct({ category: 'doses', weight: 'الكمية (Doza) - 30 دوزة', doseGrams: 50 }), true);
    // Without a dose weight there is nothing to price by the gram yet.
    assert.equal(isGramPricedProduct({ category: 'doses', weight: '' }), false);
    assert.equal(isGramPricedProduct(box), false);
    assert.equal(deriveUnitPricesFromGrams({ product: kgPack, costPerGram: 4, salePerGram: 6 }).price, 15000);
});

test('a dose sale priced by the gram charges the selling gram price and costs the purchase one', () => {
    const product = { category: 'doses', weight: 'الكمية (Doza) - 30 دوزة', cost: 150, price: 300, stock: 2000 };

    const sale = resolveGramSale({ product, mode: 'dose', qty: 2, gramsPerDose: 50, pricePerGram: 6, costPerGram: 4 });

    assert.equal(sale.valid, true);
    assert.equal(sale.gramsSold, 100);
    assert.equal(sale.total, 600);
    assert.equal(sale.cost, 400);
    assert.equal(sale.profit, 200);
    assert.equal(sale.costPerGram, 4);
    // Without a purchase gram price the recorded package cost is still used.
    assert.equal(resolveGramSale({ product, mode: 'dose', qty: 2, gramsPerDose: 50, pricePerGram: 6 }).cost, 300);
});

test('a kilo sale priced by the gram costs the grams sold times the purchase gram price', () => {
    const product = { category: 'doses', weight: 'الكمية (Doza) - 60 دوزة', cost: 9000, stock: 2400 };

    const sale = resolveGramSale({ product, mode: 'kilo', qty: 0.5, pricePerGram: 6, costPerGram: 4 });

    assert.equal(sale.valid, true);
    assert.equal(sale.gramsSold, 500);
    assert.equal(sale.stockDeduction, 500);
    assert.equal(sale.total, 3000);
    assert.equal(sale.cost, 2000);
    assert.equal(sale.profit, 1000);

    const weighed = resolveKiloSale({ product: { weight: 'الوزن - 2.5kg', cost: 10000, stock: 10 }, qtyKg: 0.5, pricePerKg: 6000, costPerGram: 4 });
    assert.equal(weighed.total, 3000);
    assert.equal(weighed.cost, 2000);
    assert.equal(weighed.profit, 1000);
});
