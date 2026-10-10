// UI check for the gram pricing flow: loads the real index.html and the real
// src/main.js in jsdom, then drives the product form and a real sale.
//
// Run it with:  npm run test:ui
//
// It is a standalone script (not part of `npm test`) because loading the app pulls
// in Firebase, which keeps retry timers alive and would stop `node --test` from
// exiting. jsdom is dev-only and deliberately not pinned in package.json — the repo
// ships both bun.lock and package-lock.json. Install it to run this check:
//     npm install --no-save jsdom
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';

let jsdom;
try {
    jsdom = await import('jsdom');
} catch {
    console.log('SKIP  tests/gram-pricing-ui.check.mjs — jsdom is not installed (npm install --no-save jsdom)');
    process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const { JSDOM, VirtualConsole } = jsdom;

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', () => {});
virtualConsole.on('error', () => {});
const dom = new JSDOM(readFileSync(join(root, 'index.html'), 'utf8'), {
    url: 'http://localhost:3000/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
});
const { window } = dom;

// Minimal browser surface main.js touches while loading.
window.Worker = class { postMessage() {} terminate() {} addEventListener() {} };
window.matchMedia = window.matchMedia || (() => ({
    matches: false, media: '', addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null
}));
window.scrollTo = () => {};
if (!window.crypto) Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', { value: () => null, configurable: true });
// jsdom has no innerText, and setElemText() writes labels through it.
Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    get() { return this.textContent; },
    set(v) { this.textContent = (v === undefined || v === null) ? '' : String(v); },
    configurable: true
});
for (const key of ['window', 'document', 'navigator', 'localStorage', 'HTMLElement', 'Node', 'Event',
    'CustomEvent', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
    'DOMParser', 'FormData', 'Blob', 'File', 'FileReader', 'URL', 'crypto', 'Worker', 'matchMedia',
    'Image', 'XMLHttpRequest', 'fetch']) {
    if (window[key] !== undefined && globalThis[key] === undefined) globalThis[key] = window[key];
}
globalThis.window = window;
globalThis.document = window.document;

await import('../src/main.js');

const $ = id => window.document.getElementById(id);
const submit = form => $(form).dispatchEvent(new window.Event('submit', { cancelable: true, bubbles: true }));
const results = [];
function check(label, fn) {
    try {
        fn();
        results.push({ ok: true, label });
    } catch (e) {
        results.push({ ok: false, label, error: e.message });
    }
}

check('the dose price and the kilo price inputs are gone, the two gram prices are there', () => {
    assert.equal($('prodKiloPrice'), null);
    assert.equal($('sellKiloPrice'), null);
    assert.equal($('sellPriceBasis'), null);
    assert.ok($('prodGramPrice'));
    assert.ok($('prodGramSalePrice'));
    assert.ok($('sellGramPrice'));
    assert.equal($('prodGramPrice').previousElementSibling.textContent.trim(), 'سعر الغرام الواحد للشراء (دج)');
    assert.equal($('prodGramSalePrice').previousElementSibling.textContent.trim(), 'سعر الغرام الواحد عند البيع (دج)');
});

check('a dose product is priced by the gram and both totals are computed, not typed', () => {
    $('prodCategory').value = 'doses';
    $('prodWeightType').value = 'الكمية (Doza)';
    $('prodWeight').value = '30 دوزة';
    $('prodDoseGrams').value = '50';
    $('prodGramPrice').value = '4';
    $('prodGramSalePrice').value = '6';
    window.syncProdKiloPriceField();

    assert.equal($('prodGramSummaryCost').textContent.trim(), '200 دج');
    assert.equal($('prodGramSummaryPrice').textContent.trim(), '300 دج');
    assert.equal($('prodGramSummaryProfit').textContent.trim(), '100 دج');
    // The manual cost/price inputs are hidden and must not block the submit.
    assert.ok($('prodCostField').classList.contains('hidden'));
    assert.ok($('prodPriceField').classList.contains('hidden'));
    assert.equal($('prodCost').required, false);

    // A sealed box keeps its two manual totals.
    $('prodCategory').value = 'boxes';
    window.syncProdKiloPriceField();
    assert.ok(!$('prodCostField').classList.contains('hidden'));
    assert.equal($('prodCost').required, true);
    assert.ok($('prodGramSummary').classList.contains('hidden'));
});

check('saving a gram-priced product stores the derived cost, price and both gram prices', () => {
    window.appState.products = [];
    window.appState.sales = [];
    $('prodCategory').value = 'doses';
    $('prodWeightType').value = 'الكمية (Doza)';
    $('prodWeight').value = '30 دوزة';
    $('prodName').value = 'واي بروتين';
    $('prodBarcode').value = '111222333';
    $('prodStockLocation').value = 'stock1';
    if ($('prodStock')) $('prodStock').value = '100';
    $('prodStock1').value = '100';
    $('prodDoseGrams').value = '50';
    $('prodGramPrice').value = '4';
    $('prodGramSalePrice').value = '6';
    submit('addProductForm');
    // Stand in for the master password being accepted.
    if (typeof window.pendingPasswordCallback === 'function') window.pendingPasswordCallback();

    const saved = window.appState.products.find(p => p.barcode === '111222333');
    assert.ok(saved, 'the product was not saved');
    assert.equal(saved.cost, 200);
    assert.equal(saved.price, 300);
    assert.equal(saved.gramPrice, 4);
    assert.equal(saved.gramSalePrice, 6);
    assert.equal(saved.doseGrams, 50);
    assert.equal(saved.kiloPrice, undefined);
});

check('a dose sale charges the selling gram price and records the net profit', () => {
    const saved = window.appState.products.find(p => p.barcode === '111222333');
    $('sellProdId').value = String(saved.id);
    $('sellProdQty').value = '2';
    $('sellPaymentMethod').value = 'paid';
    window.updateStockInfoDisplay();

    // Prefilled with the selling gram price saved on the product.
    assert.equal($('sellGramPrice').value, '6');
    assert.match($('sellGramProfitHint').textContent, /صافي الربح = \(6 − 4\) دج\/غ × 100 غ = 200 دج/);
    assert.ok($('stockInfo').innerHTML.includes('600.00 دج'), 'the sale total is missing');
    assert.ok($('stockInfo').innerHTML.includes('400 دج'), 'the cost line is missing');

    const stockBefore = saved.stock;
    submit('sellProductForm');
    const sale = window.appState.sales[0];
    assert.ok(sale, 'the sale was not recorded');
    assert.equal(sale.total, 600);
    assert.equal(sale.cost, 400);
    assert.equal(sale.profit, 200);
    assert.equal(sale.gramsSold, 100);
    assert.equal(sale.stockDeduction, 100);
    assert.equal(saved.stock, stockBefore - 100);
    assert.equal(sale.priceBasis, 'gram');
    assert.equal(sale.pricePerGram, 6);
    assert.equal(sale.costPerGram, 4);
});

check('a kilo sale is priced by the gram too, and a missing purchase price is reported', () => {
    const saved = window.appState.products.find(p => p.barcode === '111222333');
    saved.stock = 2000;
    $('sellProdId').value = String(saved.id);
    window.setSellUnitMode('kilo');
    $('sellProdQty').value = '0.5';
    window.updateStockInfoDisplay();

    assert.match($('sellGramProfitHint').textContent, /× 500 غ = 1,000 دج/);
    assert.ok($('stockInfo').innerHTML.includes('3000.00 دج'), 'the kilo total is missing');

    // After the form reset the price is taken from the product again.
    window.setSellUnitMode('unit');
    assert.equal($('sellGramPrice').value, '6');

    saved.gramPrice = 0;
    $('sellProdQty').value = '1';
    window.updateStockInfoDisplay();
    assert.match($('sellGramProfitHint').textContent + $('stockInfo').textContent,
        /سجّل «سعر الغرام الواحد للشراء»/);
});

for (const r of results) {
    console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.label}${r.ok ? '' : `\n      ${r.error}`}`);
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n# ui checks ${results.length}, passed ${results.length - failed}, failed ${failed}`);
// Firebase keeps retry timers alive, so the loop never drains on its own.
process.exit(failed ? 1 : 0);
