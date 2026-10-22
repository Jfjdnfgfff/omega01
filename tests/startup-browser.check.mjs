// Opt-in browser integration test. Install puppeteer-core separately, set
// CHROME_PATH, then run: node tests/startup-browser.check.mjs
// BROWSER_TOOLS_DIR may point at an isolated npm prefix (e.g. .cache/tools).
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { build, preview } from 'vite';
const require = createRequire(resolve(process.env.BROWSER_TOOLS_DIR || '.', 'package.json'));
const { default: puppeteer } = await import(require.resolve('puppeteer-core'));
await build({
  resolve: { alias: {
    'firebase/app': resolve('tests/fixtures/firebase-sdk.js'),
    'firebase/database': resolve('tests/fixtures/firebase-sdk.js'),
  } },
  build: { outDir: '.cache/browser-test-dist', emptyOutDir: true },
});
const server = await preview({ build: { outDir: '.cache/browser-test-dist' }, preview: { host: '0.0.0.0', port: 0 } });
const port = server.httpServer.address().port;
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
try {
  for (const width of [412, 1440]) {
    const page = await browser.newPage(); await page.setViewport({ width, height: 900 });
    await page.evaluateOnNewDocument(() => {
      window.__firebaseTestDelay = 1500;
      window.__testCLS = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__testCLS += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
    });
    const errors = [], requests = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      requests.push(request.url());
      if (request.url().startsWith(`http://localhost:${port}/`) || request.url().startsWith('data:')) request.continue();
      else request.abort();
    });
    await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
    assert.equal(await page.evaluate(() => window.__startupFetchPromise), true);
    const initial = await page.evaluate(() => ({
      reads: window.__firebaseTest, loaded: window.firebaseLoadedSections,
      customers: window.appState.customers.length, sales: window.appState.sales.length,
      overflow: document.documentElement.scrollWidth > innerWidth, cls: window.__testCLS,
    }));
    assert.equal(await page.evaluate(() => window.appState.v2Stats.allTime.sales), 100);
    assert.equal(initial.customers, 500); assert.equal(initial.sales, 1);
    assert.equal(initial.overflow, false);
    assert.ok(initial.cls < 0.1, `CLS with delayed data: ${initial.cls}`);
    assert.equal(initial.reads.subscriptions.filter(path => path === 'v2/customers').length, 1);
    assert.equal(initial.reads.gets.includes('v2/customers'), false);
    assert.equal(initial.reads.gets.includes('v2/sales'), false, 'pager must not race the first sales snapshot');
    assert.equal(initial.reads.subscriptions.includes('appState'), false);
    assert.equal(initial.reads.subscriptions.includes('appState/hideFinances'), true);
    assert.equal(initial.reads.subscriptions.includes('v2/activityLogs'), false);
    assert.equal(requests.some(url => /full-report-|activity-log-view-/.test(url)), false);
    assert.equal(requests.some(url => url.includes('firebaseio.com')), false);
    await page.evaluate(async () => { await Promise.all([window.lazyLoadSection('customers'), window.lazyLoadSection('customers', true)]); });
    assert.equal(await page.evaluate(() => window.__firebaseTest.subscriptions.filter(path => path === 'v2/customers').length), 1);
    await page.evaluate(() => window.__firebaseTest.listeners['v2/products']({ product1: { id: 'product1', name: 'منتج تجريبي', stock: 9, price: 100 } }));
    await page.waitForFunction(() => window.appState.products[0].stock === 9);
    await page.evaluate(() => window.openFullReportModal());
    await page.waitForSelector('#fullReportModal.active');
    assert.ok((await page.$eval('#fullReportContent', el => el.textContent)).includes('منتج تجريبي'));
    await page.evaluate(() => window.closeModal('fullReportModal'));
    await page.evaluate(() => window.openActivityLogModal());
    await page.waitForSelector('#activityLogModal.active');
    assert.equal(await page.evaluate(() => window.__firebaseTest.subscriptions.filter(path => path === 'v2/activityLogs').length), 1);
    assert.deepEqual(errors, []);
    console.log(`PASS ${width}px: single reads, live update, complete data, lazy report/activity, no JS errors or overflow; CLS ${initial.cls}`);
    await page.close();
  }
  // Initialization failure uses REST once per section, respects runtime config,
  // and does not report a rejected read as loaded. Retry remains possible.
  const page = await browser.newPage();
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(() => { window.__firebaseTestFail = true; });
  let denyCustomers = true;
  const fallbackRequests = [];
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/firebase.config.json') {
      return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ apiKey: 'test', databaseURL: 'https://fixture.invalid' }) });
    }
    if (url.hostname === 'fixture.invalid') {
      fallbackRequests.push(url.pathname);
      const denied = denyCustomers && url.pathname === '/v2/customers.json';
      const data = url.pathname === '/v2/customers.json' ? { c1: { id: 'c1', name: 'Fixture' } } : null;
      return request.respond({ status: denied ? 403 : 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(data) });
    }
    if (url.hostname === 'localhost' || url.protocol === 'data:') request.continue();
    else request.abort();
  });
  await page.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
  assert.equal(await page.evaluate(() => window.__startupFetchPromise), null);
  assert.equal(await page.evaluate(() => !!window.firebaseLoadedSections.customers), false);
  assert.equal(fallbackRequests.filter(path => path === '/v2/customers.json').length, 1);
  assert.equal(fallbackRequests.includes('/customers.json'), false, 'permission error must not trigger legacy download');
  assert.equal(fallbackRequests.includes('/appState.json'), false);
  denyCustomers = false;
  assert.equal(await page.evaluate(() => window.fetchAndLoadFirebaseData(true)), true);
  assert.equal(await page.evaluate(() => window.appState.customers.length), 1);
  console.log('PASS SDK failure: REST respects config, no duplicate reads, errors stay retryable');
  await page.close();
  const historyPage = await browser.newPage();
  await historyPage.setBypassServiceWorker(true);
  await historyPage.evaluateOnNewDocument(() => {
    window.__firebaseTestLargeSales = true;
    window.__firebaseTestFailSection = 'v2/suppliers';
  });
  await historyPage.setRequestInterception(true);
  historyPage.on('request', request => request.url().startsWith(`http://localhost:${port}/`) || request.url().startsWith('data:') ? request.continue() : request.abort());
  await historyPage.goto(`http://localhost:${port}/`, { waitUntil: 'networkidle0' });
  await historyPage.waitForFunction(() => window.salesHistoryComplete);
  assert.equal(await historyPage.evaluate(() => window.appState.sales.length), 3000);
  const salesReads = await historyPage.evaluate(() => window.__firebaseTest.getQueries.filter(q => q.path === 'v2/sales'));
  assert.equal(salesReads.length, 1);
  assert.ok(salesReads[0].constraints.some(c => c.before), 'history query must begin after the first window, not repeat it');
  assert.equal(await historyPage.evaluate(() => window.firebaseLoadedSections.suppliers), false);
  console.log('PASS sales history: waits for initial window and completes despite an unrelated section failure');
  await historyPage.close();
} finally {
  await browser.close(); await new Promise(resolve => server.httpServer.close(resolve));
}
