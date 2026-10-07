// Runtime smoke test: boots the PRODUCTION bundle inside jsdom and reports
// any ReferenceError / TypeError thrown while main.js evaluates and renders.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const dist = path.resolve('dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const entry = html.match(/<script type="module"[^>]*src="\/assets\/([^"]+)"/)[1];
console.log('entry chunk:', entry);

const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.stack || e.message)));
vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ').slice(0, 300)));
vc.on('warn', () => {});
vc.on('log', () => {});
vc.on('info', () => {});

const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://localhost:4173/',
  pretendToBeVisual: true,
  virtualConsole: vc,
});
const { window } = dom;

// --- shims for APIs jsdom does not implement -------------------------------
window.matchMedia = window.matchMedia || (q => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }));
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = function() {};
window.HTMLElement.prototype.scrollIntoView = function() {};
window.Element.prototype.scrollBy = function() {};
window.HTMLCanvasElement.prototype.getContext = () => null;
try { Object.defineProperty(window.navigator, 'serviceWorker', { value: { register: () => Promise.resolve({}) }, configurable: true }); } catch {}
window.requestIdleCallback = cb => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 40 }), 1);
window.cancelIdleCallback = id => window.clearTimeout(id);
window.Worker = class { constructor() { throw new Error('Worker not available in smoke test'); } };

// Never touch the real network: a live Firebase WebSocket crashes Node's undici
// inside jsdom. The stub socket stays in CONNECTING forever (which is exactly
// the "offline" path the app already handles).
class StubWebSocket {
  static CONNECTING = 0; static OPEN = 1; static CLOSING = 2; static CLOSED = 3;
  constructor(url) { this.url = url; this.readyState = 0; this.bufferedAmount = 0; }
  addEventListener() {} removeEventListener() {}
  send() {} close() { this.readyState = 3; }
}
window.WebSocket = StubWebSocket;
globalThis.WebSocket = StubWebSocket;
const blockedFetch = (url) => Promise.reject(new Error('network disabled in smoke test: ' + String(url).slice(0, 80)));
window.fetch = blockedFetch;
globalThis.fetch = blockedFetch;

for (const key of ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'requestAnimationFrame', 'cancelAnimationFrame', 'requestIdleCallback', 'cancelIdleCallback',
  'matchMedia', 'getComputedStyle', 'HTMLElement', 'Element', 'Node', 'Event', 'CustomEvent',
  'MutationObserver', 'DOMParser', 'FormData', 'Blob', 'File', 'FileReader', 'URL', 'URLSearchParams',
  'Image', 'scrollTo', 'alert', 'confirm', 'prompt', 'history', 'screen', 'crypto']) {
  if (window[key] === undefined) continue;
  try { globalThis[key] = window[key]; }
  catch { try { Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true }); } catch {} }
}
globalThis.self = window;
globalThis.top = window;
globalThis.parent = window;

process.on('unhandledRejection', r => errors.push('unhandledRejection: ' + (r && (r.stack || r.message) || String(r))));

const started = Date.now();
try {
  await import(pathToFileURL(path.join(dist, 'assets', entry)).href);
  console.log(`✔ entry module evaluated in ${Date.now() - started}ms`);
} catch (err) {
  console.log('✘ entry module threw:', err && err.stack ? err.stack.split('\n').slice(0, 6).join('\n') : err);
  process.exitCode = 1;
}

// In a browser every `window.x = fn` assignment also creates a global binding,
// which the app relies on (bare `getPackageById(...)` calls). Reproduce that here.
for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) continue;
  try { const v = window[key]; if (typeof v === 'function' || typeof v === 'object') globalThis[key] = v; } catch {}
}

// let the rAF-scheduled first render + idle callbacks run
await new Promise(r => window.setTimeout(r, 1200));

const checks = {
  'window.render': typeof window.render,
  'window.performFullRender': typeof window.performFullRender,
  'window.executeProductSale': typeof window.executeProductSale,
  'window.handleBarcodeScan': typeof window.handleBarcodeScan,
  'window.updateStockInfoDisplay': typeof window.updateStockInfoDisplay,
  'window.renderProductsList': typeof window.renderProductsList,
  'window.renderSalesList': typeof window.renderSalesList,
  'window.renderCustomers': typeof window.renderCustomers,
  'window.renderCreditsList': typeof window.renderCreditsList,
  'window.calculateCaisseDetails': typeof window.calculateCaisseDetails,
  'window.applyFirebaseSectionUpdate': typeof window.applyFirebaseSectionUpdate,
  'window.saveFirebaseSectionItem': typeof window.saveFirebaseSectionItem,
  'window.runStartupFirebaseFetch': typeof window.runStartupFirebaseFetch,
  'window.ensurePerfWorker': typeof window.ensurePerfWorker,
  'window.saleSortKey?': typeof window.saleSortKey,
};
console.log('\n--- global API surface ---');
for (const [k, v] of Object.entries(checks)) console.log(`${v === 'function' ? '✔' : '✘'} ${k}: ${v}`);

// Feed fake data through the real merge + render pipeline (the hot path I changed).
console.log('\n--- data -> render pipeline ---');
try {
  const mkProduct = i => ({ id: 'p' + i, name: 'منتج ' + i, barcode: '61300' + i, price: 100 + i, cost: 50, stock: 10, stockLocation: 'stock1', category: 'boxes', weight: 'الوزن - 500g' });
  const mkSale = i => ({ id: String(1700000000000 + i), prodName: 'بيع ' + i, qty: 1, price: 120, total: 120, profit: 20, cost: 100, coachName: 'عام', date: new Date(Date.now() - i * 60000).toISOString(), category: 'boxes', stockLocation: 'stock1', paymentStatus: 'paid', paymentMethod: 'cash', cashPaid: 120 });
  const mkCustomer = i => ({ id: 'c' + i, name: 'زبون ' + i, phone: '05500000' + String(i).padStart(2, '0'), gender: i % 3 === 0 ? 'female' : 'male', packageId: 'pkg1', price: 2000, paymentStatus: i % 4 === 0 ? 'credit' : 'paid', debtAmount: i % 4 === 0 ? 500 : 0, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000 * (i % 40 - 5)).toISOString(), subscriptionType: 'time' });
  const mkCredit = i => ({ id: 'cr' + i, name: 'دين ' + i, amount: 300 + i, status: 'open', date: new Date().toISOString(), source: 'product_sale' });

  window.appState.packages = [{ id: 'pkg1', name: 'باقة شهر', price: 2000, durationDays: 30 }];
  window.applyFirebaseSectionUpdate('products', Array.from({ length: 220 }, (_, i) => mkProduct(i)), 'smoke');
  window.applyFirebaseSectionUpdate('sales', Array.from({ length: 900 }, (_, i) => mkSale(i)), 'smoke');
  window.applyFirebaseSectionUpdate('customers', Array.from({ length: 260 }, (_, i) => mkCustomer(i)), 'smoke');
  window.applyFirebaseSectionUpdate('credits', Array.from({ length: 120 }, (_, i) => mkCredit(i)), 'smoke');
  window.applyFirebaseSectionUpdate('expenses', [{ id: 'e1', amount: 500, date: new Date().toISOString().slice(0, 10), category: 'other' }], 'smoke');
  window.applyFirebaseSectionUpdate('quickSessions', [{ id: 'q1', price: 300, clientCount: 1, sessionCount: 1, date: new Date().toISOString() }], 'smoke');

  // dashboard is visible by default in the built markup -> force each view in turn
  const t0 = Date.now();
  window.performFullRender();
  console.log(`✔ performFullRender (dashboard) in ${Date.now() - t0}ms`);

  for (const view of ['products', 'customers', 'credits', 'expenses', 'caisse', 'dashboard']) {
    const t = Date.now();
    window.toggleView(view);
    window.performFullRender();
    const rows = document.querySelectorAll('#productsList > *, #salesList > *, #customersGridView > *, #creditsList > *').length;
    console.log(`✔ toggleView('${view}') + render in ${Date.now() - t}ms (rendered nodes: ${rows})`);
  }

  const listHtml = document.getElementById('productsList')?.innerHTML.length || 0;
  console.log(`✔ productsList HTML built: ${listHtml} chars`);
  await new Promise(r => window.setTimeout(r, 800));
  const listHtmlAfterStream = document.getElementById('productsList')?.innerHTML.length || 0;
  console.log(`✔ productsList after chunk streaming: ${listHtmlAfterStream} chars (should be > first chunk)`);

  // a sale must still price + deduct stock correctly through the patched code path
  const before = window.appState.products.find(p => p.id === 'p5');
  const stockBefore = Number(before.stock);
  document.getElementById('sellProdId').value = 'p5';
  document.getElementById('sellProdQty').value = '2';
  window.updateStockInfoDisplay();
  const info = document.getElementById('stockInfo')?.textContent.replace(/\s+/g, ' ') || '';
  console.log('✔ stockInfo:', info.slice(0, 180));
  await window.executeProductSale(before, 2);
  console.log(`✔ executeProductSale: stock ${stockBefore} -> ${before.stock}, last sale total = ${window.appState.sales[0]?.total}`);
} catch (err) {
  errors.push('pipeline: ' + (err && err.stack ? err.stack.split('\n').slice(0, 5).join(' | ') : String(err)));
}

console.log('\n--- errors captured (' + errors.length + ') ---');
const unique = [...new Set(errors)];
unique.slice(0, 25).forEach(e => console.log('• ' + e.slice(0, 400)));
const fatal = unique.filter(e => /ReferenceError|is not a function|is not defined|TypeError/.test(e) && !/Worker not available|firebase|Firebase|fetch|Failed to|network|Not implemented/i.test(e));
console.log('\nfatal-looking errors:', fatal.length);
fatal.slice(0, 10).forEach(e => console.log('✘ ' + e.slice(0, 500)));
process.exit(fatal.length ? 1 : 0);
