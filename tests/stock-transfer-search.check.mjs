// UI check: the stock transfer modal ("تحويل بضاعة بين المخازن") must find
// products by typing AND by barcode — powered by the in-memory transfer index
// (src/transfer-product-index.js). Only source-location products with stock > 0
// are transferable; an exact barcode match selects instantly.
//
// Run it with:  npm run test:transfer-ui
// Requires jsdom (dev only):  npm install --no-save jsdom
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';

let jsdom;
try {
    jsdom = await import('jsdom');
} catch {
    console.log('SKIP  tests/stock-transfer-search.check.mjs — jsdom is not installed (npm install --no-save jsdom)');
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

window.Worker = class { postMessage() {} terminate() {} addEventListener() {} };
window.matchMedia = window.matchMedia || (() => ({
    matches: false, media: '', addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null
}));
window.scrollTo = () => {};
if (!window.crypto) Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', { value: () => null, configurable: true });
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
const options = () => [...$('transferProductSelect').options].map(o => o.value).filter(Boolean);
const results = [];
async function check(label, fn) {
    try {
        await fn();
        results.push({ ok: true, label });
    } catch (e) {
        results.push({ ok: false, label, error: e.message });
    }
}

// Two companion "Whey Gold" rows (stock2 warehouse + stock1 floor), one zero-stock
// warehouse row and one floor-only row — exactly how the app splits locations.
window.appState.products = [
    { id: 'p1', name: 'Whey Gold', barcode: '6291041500213', stock: 12, stockLocation: 'stock2', weight: '3kg', brand: 'BSN' },
    { id: 'p2', name: 'Creatine Monohydrate', barcode: 'CR8800', stock: 4, stockLocation: 'stock2' },
    { id: 'p3', name: 'Whey Gold', barcode: '6291041500213', stock: 2, stockLocation: 'stock1', weight: '3kg' },
    { id: 'p4', name: 'شاي أخضر', barcode: '7788', stock: 9, stockLocation: 'stock2' },
    { id: 'p5', name: 'زجاجة ماء', barcode: '5544', stock: 0, stockLocation: 'stock2' },
    { id: 'p6', name: 'عصير برتقال', barcode: '9911', stock: 3, stockLocation: 'stock1' },
];

await check('opening the modal lists only transferable products (source location, stock > 0)', async () => {
    window.openStockTransferModal();
    assert.deepEqual(options().sort(), ['p1', 'p2', 'p4']);
    assert.equal($('transferProductSearchInput').value, '');
});

await check('typing filters the list through the index (Latin and Arabic)', async () => {
    window.handleTransferProductSearch('whey');
    assert.deepEqual(options(), ['p1']);

    window.handleTransferProductSearch('شاي');
    assert.deepEqual(options(), ['p4']);

    window.handleTransferProductSearch('منتج غير موجود');
    assert.deepEqual(options(), []);
    assert.match($('transferSearchStatus').innerHTML, /لا يوجد منتج مطابق/);
});

await check('an exact barcode match selects the product instantly (scan / wedge keyboard)', async () => {
    window.handleTransferProductSearch('6291041500213');
    assert.equal($('transferProductSelect').value, 'p1');
    assert.match($('transferSearchStatus').innerHTML, /تم تحديد/);
    assert.equal($('transferCurrentStockInfo').classList.contains('hidden'), false, 'balances card must show');
});

await check('Enter with a single match selects and confirms it', async () => {
    window.handleTransferProductSearch('creatine', true);
    assert.equal($('transferProductSelect').value, 'p2');
    assert.match($('transferSearchStatus').innerHTML, /تم تحديد: Creatine/);
});

await check('a barcode outside the transfer scope explains why (zero stock / other location)', async () => {
    window.handleTransferProductSearch('5544');
    assert.deepEqual(options(), []);
    assert.match($('transferSearchStatus').innerHTML, /نفدت كمية/);

    window.handleTransferProductSearch('9911');
    assert.match($('transferSearchStatus').innerHTML, /Stock 1/);
    assert.match($('transferSearchStatus').innerHTML, /بدّل اتجاه التحويل/);
});

await check('flipping the transfer direction re-filters from the new source stock', async () => {
    $('transferFromStock').value = 'stock1';
    window.handleTransferFromStockChange();
    assert.equal($('transferFromStock').value, 'stock1');
    assert.equal($('transferToStock').value, 'stock2', 'destination must mirror the source');
    assert.deepEqual(options().sort(), ['p3', 'p6']);
});

await check('the clear button restores the full list of the current source', async () => {
    window.handleTransferProductSearch('عصير');
    assert.deepEqual(options(), ['p6']);
    window.clearTransferProductSearch();
    assert.equal($('transferProductSearchInput').value, '');
    assert.deepEqual(options().sort(), ['p3', 'p6']);
});

await check('stock changes re-index immediately (signature invalidation)', async () => {
    $('transferFromStock').value = 'stock2';
    window.handleTransferFromStockChange();
    assert.deepEqual(options().sort(), ['p1', 'p2', 'p4']);

    window.appState.products = window.appState.products.map(p => (p.id === 'p1' ? { ...p, stock: 0 } : p));
    window.populateTransferProducts();
    assert.deepEqual(options().sort(), ['p2', 'p4'], 'a depleted product must leave the transfer list');

    window.appState.products = window.appState.products.map(p => (p.id === 'p1' ? { ...p, stock: 12 } : p));
    window.populateTransferProducts();
    assert.deepEqual(options().sort(), ['p1', 'p2', 'p4']);
});

await check('the search input handler and camera wiring are exposed', async () => {
    assert.equal(typeof window.handleTransferProductSearchInput, 'function');
    assert.equal(typeof window.handleTransferProductSearch, 'function');
    assert.equal(typeof window.clearTransferProductSearch, 'function');
    assert.match($('stockTransferModal').innerHTML, /openBarcodeCamera\('transfer_search'\)/);
    assert.match($('stockTransferModal').innerHTML, /transferProductSearchInput/);
});

let failed = 0;
for (const r of results) {
    if (r.ok) console.log(`PASS  ${r.label}`);
    else { failed++; console.error(`FAIL  ${r.label}\n      ${r.error}`); }
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
