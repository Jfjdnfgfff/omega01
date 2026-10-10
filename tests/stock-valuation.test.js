// Stock valuation must use the PER-GRAM prices for products whose stock is kept
// in grams (دوزة / موزون بالكيلو), and the per-unit prices for everything else.
// Exercises the real calculateStockValuation() from src/main.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnv, loadMain } from './gdrive-harness.mjs';

async function valuationFor(products) {
    const env = createEnv();
    const { evaluationError } = await loadMain(env);
    assert.equal(evaluationError, null,
        evaluationError ? `src/main.js failed to evaluate: ${evaluationError.message}` : '');
    env.windowStub.appState.products = products;
    return env.windowStub.calculateStockValuation();
}

// علبة بروتين بالدوزة: الدوزة 50 غ، شراء 4 دج/غ، بيع 6 دج/غ → تكلفة الدوزة 200 دج، بيعها 300 دج.
// المخزون 1000 غ (= 20 دوزة).
const DOSE_PRODUCT = {
    id: 'p1', name: 'بروتين', category: 'doses', weight: 'الكمية (Doza) - 30 دوزة',
    doseGrams: 50, gramPrice: 4, gramSalePrice: 6,
    cost: 200, price: 300,
    stock: 1000, stockLocation: 'stock1',
};

// منتج موزون بالكيلو: العلبة 1 كغ (= 1000 غ)، شراء 2 دج/غ، بيع 3 دج/غ → 2000 / 3000.
// المخزون 2500 غ (= 2.5 كغ).
const KILO_PRODUCT = {
    id: 'p2', name: 'أرز', category: 'other', weight: 'الوزن - 1kg',
    gramPrice: 2, gramSalePrice: 3,
    cost: 2000, price: 3000,
    stock: 2500, stockLocation: 'stock1',
};

// منتج عادي بالقطعة: المخزون بالقطع، والسعران للقطعة.
const PIECE_PRODUCT = {
    id: 'p3', name: 'ماء', category: 'other', weight: 'الكمية - 1',
    cost: 30, price: 50,
    stock: 10, stockLocation: 'stock1',
};

test('a dose product is valued by its purchase/sale GRAM price, not the per-dose price', async () => {
    const val = await valuationFor([DOSE_PRODUCT]);
    // 1000 غ × 4 دج/غ = 4000 دج تكلفة، و1000 غ × 6 دج/غ = 6000 دج بيع.
    assert.equal(val.totalCost, 4000,
        `رأس المال بسعر الشراء خاطئ: المخزون بالغرام (1000 غ) ضُرب في سعر الدوزة (200 دج) بدل سعر الغرام (4 دج)`);
    assert.equal(val.totalSelling, 6000,
        `قيمة البيع خاطئة: المخزون بالغرام ضُرب في سعر بيع الدوزة (300 دج) بدل سعر بيع الغرام (6 دج)`);
    assert.equal(val.totalPotentialProfit, 2000);
    assert.equal(val.profitMargin, 50);
});

test('a weighed (kilo) product is valued by its GRAM prices too', async () => {
    const val = await valuationFor([KILO_PRODUCT]);
    // 2500 غ × 2 دج/غ = 5000 دج، و2500 غ × 3 دج/غ = 7500 دج.
    assert.equal(val.totalCost, 5000, `expected 2500 g × 2 DA/g, got ${val.totalCost}`);
    assert.equal(val.totalSelling, 7500, `expected 2500 g × 3 DA/g, got ${val.totalSelling}`);
    assert.equal(val.totalPotentialProfit, 2500);
});

test('a piece product keeps using its per-unit prices', async () => {
    const val = await valuationFor([PIECE_PRODUCT]);
    assert.equal(val.totalCost, 300, '10 pieces × 30 DA');
    assert.equal(val.totalSelling, 500, '10 pieces × 50 DA');
    assert.equal(val.totalItemsCount, 10);
});

test('gram-priced and piece products can be summed together', async () => {
    const val = await valuationFor([DOSE_PRODUCT, KILO_PRODUCT, PIECE_PRODUCT]);
    assert.equal(val.totalCost, 4000 + 5000 + 300);
    assert.equal(val.totalSelling, 6000 + 7500 + 500);
    assert.equal(val.totalPotentialProfit, val.totalSelling - val.totalCost);
});

test('a gram-priced product that never saved gram prices still falls back to per-unit prices', async () => {
    const legacy = { ...DOSE_PRODUCT, gramPrice: 0, gramSalePrice: 0 };
    const val = await valuationFor([legacy]);
    // No gram prices recorded → keep the previous behaviour rather than valuing at 0.
    assert.equal(val.totalCost, 1000 * 200);
    assert.equal(val.totalSelling, 1000 * 300);
});

test('stock1 / stock2 split keeps working with gram pricing', async () => {
    const inStock2 = { ...DOSE_PRODUCT, id: 'p9', stockLocation: 'stock2', stock: 500 };
    const val = await valuationFor([DOSE_PRODUCT, inStock2]);
    assert.equal(val.stock1Cost, 1000 * 4);
    assert.equal(val.stock2Cost, 500 * 4);
    assert.equal(val.stock1Selling, 1000 * 6);
    assert.equal(val.stock2Selling, 500 * 6);
});

test('fractional gram prices do not leave float dust in the totals', async () => {
    const fractional = { ...DOSE_PRODUCT, id: 'p10', gramPrice: 0.025, gramSalePrice: 0.04, stock: 333 };
    const val = await valuationFor([fractional]);
    // 333 غ × 0.025 دج = 8.325 → 8.33 دج، و333 غ × 0.04 دج = 13.32 دج.
    assert.equal(val.totalCost, 8.33, `expected 8.33, got ${val.totalCost}`);
    assert.equal(val.totalSelling, 13.32, `expected 13.32, got ${val.totalSelling}`);
});

test('the per-product stock value uses the same helper as the dashboard totals', async () => {
    const env = createEnv();
    const { evaluationError } = await loadMain(env);
    assert.equal(evaluationError, null, evaluationError?.message ?? '');
    const win = env.windowStub;

    assert.equal(win.unitCostForStock(DOSE_PRODUCT), 4, 'سعر شراء وحدة المخزون يجب أن يكون سعر الغرام');
    assert.equal(win.unitPriceForStock(DOSE_PRODUCT), 6, 'سعر بيع وحدة المخزون يجب أن يكون سعر الغرام');
    assert.equal(win.unitCostForStock(KILO_PRODUCT), 2);
    assert.equal(win.unitPriceForStock(KILO_PRODUCT), 3);
    assert.equal(win.unitCostForStock(PIECE_PRODUCT), 30, 'المنتج العادي يبقى بسعر القطعة');
    assert.equal(win.unitPriceForStock(PIECE_PRODUCT), 50);

    // بطاقة المنتج في القائمة تعرض سطرين: «الشراء» و«البيع»، وكلاهما
    // المخزون × سعر وحدة المخزون، فيجب أن يطابقا إجماليات لوحة القيادة.
    const stock = Number(DOSE_PRODUCT.stock);
    const cardCost = stock * win.unitCostForStock(DOSE_PRODUCT);
    const cardSale = stock * win.unitPriceForStock(DOSE_PRODUCT);
    assert.equal(cardCost, 4000, 'قيمة «الشراء» في بطاقة المنتج لا تطابق الإجمالي');
    assert.equal(cardSale, 6000, 'قيمة «البيع» في بطاقة المنتج لا تطابق الإجمالي');
});
