// Opt-in browser check for split customer images (lazy load + dual read).
// Synthetic data only; the Firebase SDK is the test fixture.
//   CHROME_PATH=/path/to/chrome BROWSER_TOOLS_DIR=.cache/tools node tests/image-split.check.mjs
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { build, preview } from 'vite';
import { planSectionMigration } from '../src/image-store.js';

const require = createRequire(resolve(process.env.BROWSER_TOOLS_DIR || '.', 'package.json'));
const { default: puppeteer } = await import(require.resolve('puppeteer-core'));

// --- synthetic dataset: 30 split images, 6 legacy inline, 14 without image ---
const TINY = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
const imageFor = i => `data:image/png;base64,${TINY}#${i}`;
const customers = {};
for (let i = 0; i < 50; i++) {
  const id = `c${i}`;
  const rec = { id, name: `مشترك ${i}`, phone: `0555${String(i).padStart(6, '0')}`, packageId: 'p1', price: 1000, paymentStatus: 'paid', startDate: '2026-10-01', endDate: '2026-12-31' };
  if (i < 30) rec.imageUrl = imageFor(i);          // split candidates
  else if (i < 36) rec.imageUrl = imageFor(i);     // legacy inline (will stay inline)
  customers[id] = rec;
}
// Split the first 30 exactly as the migration script would; keep 30..35 inline (legacy).
const legacyOnly = Object.fromEntries(Object.entries(customers).filter(([k]) => Number(k.slice(1)) >= 30));
const splitPlan = planSectionMigration('customers', Object.fromEntries(Object.entries(customers).filter(([k]) => Number(k.slice(1)) < 30)), {}, 1);
const v2customers = { ...legacyOnly, ...splitPlan.records };
const v2customerImages = Object.fromEntries(Object.entries(splitPlan.images));
const dataset = {
  'v2/customers': v2customers,
  'v2/customerImages': v2customerImages,
  'v2/packages': { p1: { id: 'p1', name: 'شهري', price: 1000, durationDays: 30 } },
  'v2/products': {}, 'v2/sales': {}, 'v2/expenses': {}, 'v2/caisse': {}, 'v2/credits': {},
  'v2/stats': { daily: {}, monthly: {}, yearly: {}, allTime: { sales: 0, profit: 0 } },
  'appState/hideFinances': false,
};
const datasetText = JSON.stringify(dataset);
const expectedSplitSrc = id => imageFor(Number(id.slice(1)));

const OUT_DIR = '.cache/browser-test-dist-split';
await build({
  resolve: { alias: {
    'firebase/app': resolve('tests/fixtures/firebase-sdk.js'),
    'firebase/database': resolve('tests/fixtures/firebase-sdk.js'),
  } },
  build: { outDir: OUT_DIR, emptyOutDir: true, chunkSizeWarningLimit: 100000 },
  logLevel: 'error',
});
const server = await preview({ build: { outDir: OUT_DIR }, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const DATASET_URL = `${origin}/__perf/dataset.json`;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH, headless: true,
  userDataDir: mkdtempSync(join(tmpdir(), 'omega-split-')),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 900, isMobile: true, deviceScaleFactor: 2 });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(url => { window.__perfDatasetUrl = url; }, DATASET_URL);
  await page.setRequestInterception(true);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', req => {
    const url = req.url();
    if (url === DATASET_URL) return req.respond({ status: 200, contentType: 'application/json', body: datasetText });
    if (url.startsWith(origin) || url.startsWith('data:')) return req.continue();
    return req.abort();
  });

  await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => { const g = document.querySelector('#customersGrid'); return !!g && g.children.length > 0; }, { timeout: 120000, polling: 50 });
  // Let the observer load the visible split avatars and the app re-render.
  await page.waitForFunction(() => document.querySelectorAll('#customersGrid img').length > 0, { timeout: 30000, polling: 100 });
  await new Promise(r => setTimeout(r, 1500));

  const boot = await page.evaluate(() => window.__firebaseTest.deliveredPaths);
  assert.ok(boot.includes('v2/customers'), 'customers are loaded at boot');
  assert.ok(!boot.includes('v2/customerImages'), 'split images are NOT loaded at boot');

  // Off-screen split placeholders must not trigger reads yet (lazy).
  const offscreenReads = await page.evaluate(() => window.__firebaseTest.gets.filter(p => p.startsWith('v2/customerImages/')).length);
  assert.equal(offscreenReads, 0, 'no image is read while its card is off-screen');

  // Scroll every split placeholder into view, one at a time, so each one loads.
  const placeholderCount = await page.evaluate(() => document.querySelectorAll('[data-split-index]').length);
  assert.ok(placeholderCount > 0, 'split placeholders exist');
  for (let i = 0; i < placeholderCount; i++) {
    await page.evaluate(idx => {
      const el = document.querySelectorAll('[data-split-index]')[idx];
      if (el) el.scrollIntoView({ block: 'center' });
    }, 0);
    await new Promise(r => setTimeout(r, 600));
  }
  await new Promise(r => setTimeout(r, 1500));

  const shown = await page.evaluate(() => Array.from(document.querySelectorAll('#customersGrid img')).map(img => ({ src: img.getAttribute('src'), alt: img.getAttribute('alt') })));
  const splitShown = shown.filter(x => /#\d+$/.test(x.src) && Number(x.alt.replace(/\D/g, '')) < 30);
  assert.ok(splitShown.length > 0, `split images render after scrolling (got ${splitShown.length})`);
  // Each split image must be the picture of its own customer (no mix-ups).
  for (const x of splitShown) {
    const n = Number(x.alt.replace(/\D/g, ''));
    assert.equal(x.src, imageFor(n), `image for ${x.alt} belongs to that customer`);
  }
  // Legacy inline images still render through the same path.
  const legacyShown = shown.filter(x => { const n = Number(x.alt.replace(/\D/g, '')); return n >= 30 && n < 36; });
  assert.equal(legacyShown.length, 6, 'legacy inline images still render');

  // One get() per split image: no duplicate reads of the same image path.
  const gets = await page.evaluate(() => window.__firebaseTest.gets.filter(p => p.startsWith('v2/customerImages/')));
  assert.equal(new Set(gets).size, gets.length, 'each image is requested at most once');
  assert.ok(gets.length <= 30, 'no more reads than split images');

  // ---- Write path: the app's real save/delete functions must keep or move images correctly ----
  const writesFor = async (fn) => page.evaluate(async fn => {
    const st = window.__firebaseTest;
    st.writes.length = 0;
    await (new Function('return (' + fn + ')()'))();
    return st.writes.map(([path, data]) => ({ path, data: JSON.parse(JSON.stringify(data ?? null)) }));
  }, fn.toString());

  // 1) New image: record has imageRef/imageVersion, no inline imageUrl; image node written.
  const created = await writesFor(async () => window.saveFirebaseSectionItem('customers', { id: 'z1', name: 'جديد', phone: '0555999999', packageId: 'p1', price: 1000, imageUrl: 'data:image/png;base64,QUJD' }));
  const createdPayload = created.find(w => !w.path)?.data || {};
  assert.ok(createdPayload['v2/customers/z1'], 'record is written');
  assert.equal('imageUrl' in createdPayload['v2/customers/z1'], false, 'no inline imageUrl on the record');
  assert.ok(createdPayload['v2/customers/z1'].imageRef === 'z1' && createdPayload['v2/customers/z1'].imageVersion, 'record carries imageRef/imageVersion');
  assert.equal(createdPayload['v2/customerImages/z1'].data, 'data:image/png;base64,QUJD', 'image node holds the picture');

  // 2) Unrelated save of a split customer (imageUrl absent): image node is NOT touched.
  const kept = await writesFor(async () => window.saveFirebaseSectionItem('customers', { id: 'c0', name: 'مشترك 0', phone: '0555000000', packageId: 'p1', price: 1000, imageRef: 'c0', imageVersion: 'e619cba778' }));
  const keptPayload = kept.find(w => !w.path)?.data || {};
  assert.equal('v2/customerImages/c0' in keptPayload, false, 'unrelated save never deletes or rewrites the image');
  assert.equal(keptPayload['v2/customers/c0'].imageRef, 'c0', 'imageRef stays on the record');

  // 3) Explicit removal (imageUrl null): image node is deleted.
  const removed = await writesFor(async () => window.saveFirebaseSectionItem('customers', { id: 'c1', name: 'مشترك 1', phone: '0555000001', packageId: 'p1', price: 1000, imageUrl: null }));
  const removedPayload = removed.find(w => !w.path)?.data || {};
  assert.equal(removedPayload['v2/customerImages/c1'], null, 'removal deletes the image node');
  assert.equal('imageRef' in removedPayload['v2/customers/c1'], false, 'removal clears imageRef');

  // 4) Delete customer: image node is removed with it.
  const deleted = await writesFor(async () => window.deleteFirebaseSectionItem('customers', 'c2', null));
  const deletedPayload = deleted.find(w => !w.path)?.data || {};
  assert.equal(deletedPayload['v2/customerImages/c2'], null, 'deleting a customer deletes its image node');

  assert.deepEqual(errors, [], 'no page errors');
  console.log(JSON.stringify({ ok: true, rendered: shown.length, splitRendered: splitShown.length, splitRequested: gets.length, legacyRendered: legacyShown.length }));
} finally {
  await browser.close();
  await server.httpServer.close();
}
