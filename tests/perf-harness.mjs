// Before/after performance harness.
// Usage: node tests/perf-harness.mjs [distDir]
// Boots a production build in jsdom, seeds a realistic data set and measures
// the main-thread work (longest single task + totals) and the critical path.
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { JSDOM, VirtualConsole } from 'jsdom';

const dist = path.resolve(process.argv[2] || 'dist');
const html = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const entry = html.match(/<script type="module"[^>]*src="\/assets\/([^"]+)"/)[1];

const gz = f => zlib.gzipSync(fs.readFileSync(path.join(dist, f))).length;
const raw = f => fs.statSync(path.join(dist, f)).length;

// ---- critical path ---------------------------------------------------------
// <noscript> fallbacks are not render-blocking for a JS-enabled client.
const htmlNoNoscript = html.replace(/<noscript>[\s\S]*?<\/noscript>/g, '');
const blockingCss = [...htmlNoNoscript.matchAll(/<link[^>]*rel="stylesheet"[^>]*>/g)]
  .map(m => m[0])
  .filter(t => !/media="print"/.test(t));
const preloads = [...html.matchAll(/<link[^>]*rel="modulepreload"[^>]*>/g)].map(m => m[0]);
const cssFile = (html.match(/<link[^>]*rel="stylesheet"[^>]*href="\/assets\/([^"]+\.css)"/) || [])[1];

const report = {
  label: path.basename(dist),
  entry,
  html: { raw: raw('index.html'), gzip: gz('index.html') },
  css: cssFile ? { file: cssFile, raw: raw('assets/' + cssFile), gzip: gz('assets/' + cssFile) } : null,
  entryJs: { raw: raw('assets/' + entry), gzip: gz('assets/' + entry) },
  renderBlockingStylesheets: blockingCss.length,
  modulepreloadTags: preloads.length,
  firebaseChunkEager: /rel="modulepreload"[^>]*firebase/.test(html),
};
// Everything the browser must fetch before it can boot: the document, the
// render-blocking CSS, the entry chunk and any modulepreloaded chunk
// (a modulepreload is fetched + parsed on the critical path even though it
// does not block paint).
report.preloadedChunks = preloads
  .map(t => (t.match(/href="\/assets\/([^"]+)"/) || [])[1])
  .filter(Boolean)
  .map(f => ({ file: f, gzip: gz('assets/' + f) }));
report.criticalPathGzip = report.html.gzip + (report.css ? report.css.gzip : 0) + report.entryJs.gzip +
  report.preloadedChunks.reduce((sum, c) => sum + c.gzip, 0);

// ---- jsdom boot ------------------------------------------------------------
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + (e.message || e)));
vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ').slice(0, 200)));
['warn', 'log', 'info'].forEach(k => vc.on(k, () => {}));

const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost:4173/', pretendToBeVisual: true, virtualConsole: vc });
const { window } = dom;
window.matchMedia = q => ({ matches: false, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
window.scrollTo = () => {};
window.Element.prototype.scrollIntoView = function() {};
window.HTMLElement.prototype.scrollIntoView = function() {};
window.HTMLCanvasElement.prototype.getContext = () => null;
try { Object.defineProperty(window.navigator, 'serviceWorker', { value: { register: () => Promise.resolve({}) }, configurable: true }); } catch {}
window.requestIdleCallback = cb => window.setTimeout(() => cb({ didTimeout: false, timeRemaining: () => 40 }), 1);
window.cancelIdleCallback = id => window.clearTimeout(id);
class StubWebSocket {
  constructor(url) { this.url = url; this.readyState = 0; }
  addEventListener() {} removeEventListener() {} send() {} close() {}
}
window.WebSocket = StubWebSocket;
globalThis.WebSocket = StubWebSocket;
const noNet = url => Promise.reject(new Error('offline harness: ' + String(url).slice(0, 60)));
window.fetch = noNet; globalThis.fetch = noNet;

for (const key of ['window', 'document', 'navigator', 'location', 'localStorage', 'sessionStorage',
  'cancelAnimationFrame', 'matchMedia', 'getComputedStyle', 'HTMLElement', 'Element', 'Node', 'Event',
  'CustomEvent', 'MutationObserver', 'DOMParser', 'FormData', 'Blob', 'File', 'FileReader', 'URL',
  'URLSearchParams', 'Image', 'scrollTo', 'alert', 'confirm', 'prompt', 'history', 'screen', 'crypto']) {
  if (window[key] === undefined) continue;
  try { globalThis[key] = window[key]; }
  catch { try { Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true }); } catch {} }
}
globalThis.self = window; globalThis.top = window; globalThis.parent = window;
process.on('unhandledRejection', () => {});

// Instrument every animation-frame callback: this is where the app does its
// rendering, so the longest one is the app's worst "long task".
const frameTasks = [];
const raf = window.requestAnimationFrame.bind(window);
const instrumentedRaf = cb => raf(t => {
  const s = process.hrtime.bigint();
  try { cb(t); } finally { frameTasks.push(Number(process.hrtime.bigint() - s) / 1e6); }
});
window.requestAnimationFrame = instrumentedRaf;
globalThis.requestAnimationFrame = instrumentedRaf;

const time = fn => { const s = process.hrtime.bigint(); const r = fn(); return [Number(process.hrtime.bigint() - s) / 1e6, r]; };
const flush = (frames = 3) => new Promise(res => {
  let n = 0;
  const step = () => (++n >= frames ? res() : window.setTimeout(() => raf(step), 0));
  window.setTimeout(() => raf(step), 0);
});

const bootMs = (await time(async () => {}) , null);
const t0 = process.hrtime.bigint();
await import(pathToFileURL(path.join(dist, 'assets', entry)).href);
report.moduleEvalMs = Number(process.hrtime.bigint() - t0) / 1e6;

for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalThis) continue;
  try { const v = window[key]; if (typeof v === 'function' || typeof v === 'object') globalThis[key] = v; } catch {}
}

// ---- seed a realistic data set --------------------------------------------
const mkProduct = i => ({ id: 'p' + i, name: 'منتج مكمل ' + i, barcode: '61300000' + i, price: 100 + i, cost: 50, stock: 10, stockLocation: 'stock1', category: 'boxes', weight: 'الوزن - 500g' });
const mkSale = i => ({ id: String(1700000000000 + i), prodName: 'بيع منتج ' + i, qty: 1, price: 120, total: 120, profit: 20, cost: 100, coachName: i % 5 === 0 ? 'كوتش' : 'عام', date: new Date(Date.now() - i * 60000).toISOString(), category: 'boxes', stockLocation: 'stock1', paymentStatus: 'paid', paymentMethod: 'cash', cashPaid: 120 });
const mkCustomer = i => ({ id: 'c' + i, name: 'زبون ' + i, phone: '055000' + String(i).padStart(4, '0'), gender: i % 3 === 0 ? 'female' : 'male', packageId: 'pkg1', price: 2000, paymentStatus: i % 4 === 0 ? 'credit' : 'paid', debtAmount: i % 4 === 0 ? 500 : 0, startDate: new Date().toISOString(), endDate: new Date(Date.now() + 86400000 * ((i % 40) - 5)).toISOString(), subscriptionType: 'time' });
const mkCredit = i => ({ id: 'cr' + i, name: 'دين زبون ' + i, amount: 300 + i, status: 'open', date: new Date().toISOString(), source: 'product_sale' });

window.appState.packages = [{ id: 'pkg1', name: 'باقة شهر', price: 2000, durationDays: 30 }];
const seed = [
  ['products', Array.from({ length: 220 }, (_, i) => mkProduct(i))],
  ['sales', Array.from({ length: 900 }, (_, i) => mkSale(i))],
  ['customers', Array.from({ length: 260 }, (_, i) => mkCustomer(i))],
  ['credits', Array.from({ length: 120 }, (_, i) => mkCredit(i))],
  ['expenses', Array.from({ length: 60 }, (_, i) => ({ id: 'e' + i, amount: 500, date: new Date().toISOString().slice(0, 10), category: 'other' }))],
  ['quickSessions', Array.from({ length: 40 }, (_, i) => ({ id: 'q' + i, price: 300, clientCount: 1, sessionCount: 1, date: new Date().toISOString() }))],
];
let mergeMs = 0;
for (const [section, items] of seed) mergeMs += time(() => window.applyFirebaseSectionUpdate(section, items, 'harness'))[0];
report.dataMergeMs = +mergeMs.toFixed(1);

await flush(6);
report.firstRender = summarise('first render (dashboard)');

const views = ['products', 'customers', 'credits', 'expenses', 'caisse', 'dashboard'];
const perView = {};
for (const v of views) {
  frameTasks.length = 0;
  const [ms] = time(() => window.toggleView(v));
  await flush(8);
  perView[v] = { syncToggleMs: +ms.toFixed(1), ...summarise('view ' + v) };
}
report.views = perView;

// repeated render passes (what happens on every Firebase section update)
frameTasks.length = 0;
let repeated = 0;
for (let i = 0; i < 10; i++) { window.render(); await flush(4); }
report.tenRenders = summarise('10 x render()');

function summarise(label) {
  if (!frameTasks.length) return { tasks: 0, longestTaskMs: 0, totalTaskMs: 0 };
  const sorted = [...frameTasks].sort((a, b) => b - a);
  return {
    tasks: frameTasks.length,
    longestTaskMs: +sorted[0].toFixed(1),
    totalTaskMs: +frameTasks.reduce((a, b) => a + b, 0).toFixed(1),
    over50ms: frameTasks.filter(t => t > 50).length,
  };
}

report.errors = errors.length;
report.errorSample = errors.slice(0, 3);
console.log(JSON.stringify(report, null, 2));
process.exit(0);
