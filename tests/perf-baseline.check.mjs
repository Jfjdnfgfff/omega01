// Opt-in performance baseline. Synthetic data only, fixture Firebase SDK only.
// Requires puppeteer-core and a Chrome binary:
//   CHROME_PATH=/path/to/chrome BROWSER_TOOLS_DIR=.cache/tools node tests/perf-baseline.check.mjs
// Dataset: node scripts/perf-dataset.js (auto-generated when missing).
// Output: JSON on stdout. Set PERF_WRITE=docs/perf-baseline.json to save it.
//
// Measurement limits (also written into the JSON):
// - Headless Chromium, CPU x4 throttling. Network throttling is NOT applied because the
//   fixture SDK never touches the network, so transfer seconds are an estimate.
// - Byte counts are exact for the synthetic payloads the app requests.
// - The service worker is bypassed: src/main.js reloads the page after SW install, which
//   would make a single-navigation measurement meaningless.
// - Each phase uses its own Chrome instance. Cold and warm share one userDataDir so the
//   warm run reuses the IndexedDB written by the cold run.
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import { resolve, join } from 'node:path';
import { build, preview } from 'vite';

const SCALE = Number(process.env.PERF_SCALE || 1);
const DATASET = resolve(process.env.PERF_DATASET || (SCALE === 1 ? '.cache/perf/dataset.json' : `.cache/perf/dataset-scale${SCALE}.json`));
const OUT_DIR = '.cache/browser-test-dist-perf';
const SLOW_4G = { downloadKbps: 1600, uploadKbps: 750, latencyMs: 150 };
const DEBUG = !!process.env.PERF_DEBUG;
const log = msg => { if (DEBUG) process.stderr.write(`[perf] ${msg}\n`); };

if (!existsSync(DATASET)) {
  const { generateDataset } = await import('../scripts/perf-dataset.js');
  mkdirSync(resolve('.cache/perf'), { recursive: true });
  mkdirSync(resolve('.cache/perf'), { recursive: true });
  writeFileSync(DATASET, JSON.stringify(await generateDataset()));
}
const datasetText = readFileSync(DATASET, 'utf8');
const dataset = JSON.parse(datasetText);
const pathBytes = Object.fromEntries(Object.entries(dataset).map(([k, v]) => [k, Buffer.byteLength(JSON.stringify(v))]));
const datasetCounts = Object.fromEntries(Object.entries(dataset).map(([k, v]) => [k, Object.keys(v).length]));

const require = createRequire(resolve(process.env.BROWSER_TOOLS_DIR || '.', 'package.json'));
const { default: puppeteer } = await import(require.resolve('puppeteer-core'));

await build({
  resolve: { alias: {
    'firebase/app': resolve('tests/fixtures/firebase-sdk.js'),
    'firebase/database': resolve('tests/fixtures/firebase-sdk.js'),
  } },
  build: { outDir: OUT_DIR, emptyOutDir: true, chunkSizeWarningLimit: 100000 },
  logLevel: 'error',
});

// Initial JS (gzip) = the entry script plus modulepreloads referenced by index.html.
const distHtml = readFileSync(join(OUT_DIR, 'index.html'), 'utf8');
const initialJs = [...distHtml.matchAll(/(?:src|href)="\/(assets\/[^"]+\.js)"/g)].map(m => m[1]);
const initialJsGzip = initialJs.reduce((sum, f) => sum + gzipSync(readFileSync(join(OUT_DIR, f))).length, 0);

const { preview: startPreview } = await import('vite');
const server = await startPreview({ build: { outDir: OUT_DIR }, preview: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const DATASET_URL = `${origin}/__perf/dataset.json`;

const launch = userDataDir => puppeteer.launch({
  executablePath: process.env.CHROME_PATH,
  headless: true,
  userDataDir,
  dumpio: !!process.env.PERF_DUMP,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

async function openPage(browser, { withDataset }) {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 900, isMobile: true, deviceScaleFactor: 2.6 });
  const cdp = await page.createCDPSession();
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(url => {
    window.__longTasks = [];
    window.__cls = 0;
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) window.__longTasks.push({ start: e.startTime, dur: e.duration });
      }).observe({ type: 'longtask', buffered: true });
    } catch { /* longtask unsupported */ }
    try {
      new PerformanceObserver(list => {
        for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
      }).observe({ type: 'layout-shift', buffered: true });
    } catch { /* ignore */ }
    if (url) window.__perfDatasetUrl = url;
  }, withDataset ? DATASET_URL : null);
  await page.setRequestInterception(true);
  page.on('request', req => {
    const url = req.url();
    if (url === DATASET_URL) return req.respond({ status: 200, contentType: 'application/json', body: datasetText });
    if (url.startsWith(origin) || url.startsWith('data:')) return req.continue();
    return req.abort();
  });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('error', e => { errors.push(`CRASH: ${e.message}`); process.stderr.write(`[perf] renderer crashed: ${e.message}\n`); });
  if (DEBUG) page.on('console', m => log(`page: ${m.text().slice(0, 200)}`));
  return { page, cdp, errors };
}

const waitForCards = page => page.waitForFunction(
  () => { const g = document.querySelector('#customersGrid'); return !!g && g.children.length > 0; },
  { timeout: 120000, polling: 50 },
);

const summarizeTasks = tasks => {
  const durs = tasks.map(t => t.dur);
  return {
    count: durs.length,
    over50ms: durs.filter(d => d > 50).length,
    maxMs: durs.length ? Math.round(Math.max(...durs)) : 0,
    totalBlockingMs: Math.round(durs.reduce((s, d) => s + Math.max(0, d - 50), 0)),
  };
};

const result = {
  generatedAt: new Date().toISOString(),
  environment: { cpuThrottle: 4, network: SLOW_4G, note: 'headless Chromium, synthetic data, fixture SDK, service worker bypassed' },
  dataset: { file: DATASET, scale: SCALE, fullSpecScale: 1, totalBytes: Buffer.byteLength(datasetText), counts: datasetCounts },
  budgets: {
    initialDataBytesRatioMax: 0.2,
    timeToDataVisibleMsFromLocalCacheMax: 800,
    singleTaskMaxMs: 50,
    liveSingleRecordUpdateMsMax: 30,
    customerDomNodesMax: 1500,
    heapRatioMax: 0.5,
    initialJsGzipBytesMax: 80 * 1024,
  },
};

const userDataDir = mkdtempSync(join(tmpdir(), 'omega-perf-'));

// ---- Phase A: cold load (fresh profile) ----
{
  const browser = await launch(userDataDir);
  try {
    const { page, cdp, errors } = await openPage(browser, { withDataset: true });
    const t0 = Date.now();
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForCards(page);
    const timeToCards = Date.now() - t0;
    log(`cold cards visible after ${timeToCards}ms`);
    await new Promise(r => setTimeout(r, 1500));
    // Count only tasks after the fixture finished its synthetic JSON parse; that parse runs before the app boots.
    const fixtureReadyAt = await page.evaluate(() => window.__perfFixtureReadyAt || 0);
    const fixtureParseMs = await page.evaluate(() => Math.round(window.__perfFixtureParseMs || 0));
    const longTasks = (await page.evaluate(() => window.__longTasks)).filter(t => t.start >= fixtureReadyAt);
    const paint = await page.evaluate(() => performance.getEntriesByType('paint').map(p => ({ name: p.name, startMs: Math.round(p.startTime) })));
    const cls = await page.evaluate(() => window.__cls);
    const domNodes = await page.evaluate(() => document.getElementsByTagName('*').length);
    const deliveredPaths = [...new Set(await page.evaluate(() => (window.__firebaseTest ? window.__firebaseTest.deliveredPaths : [])))];
    await cdp.send('HeapProfiler.collectGarbage');
    const heapBytes = (await cdp.send('Runtime.getHeapUsage')).usedSize;
    const initialBytes = deliveredPaths.reduce((s, p) => s + (pathBytes[p] || 0), 0);
    result.startup = {
      requestedPaths: deliveredPaths,
      initialDataBytes: initialBytes,
      initialDataMB: +(initialBytes / 1048576).toFixed(2),
      estimatedTransferSecondsOn4G: +((initialBytes * 8) / (SLOW_4G.downloadKbps * 1000) + SLOW_4G.latencyMs / 1000).toFixed(1),
      timeToDataVisibleMsColdCache: timeToCards,
      paint,
      cls: +cls.toFixed(4),
      jsHeapUsedBytesAfterLoad: heapBytes,
      jsHeapUsedMBAfterLoad: +(heapBytes / 1048576).toFixed(1),
      domNodesAfterLoad: domNodes,
      longTasks: summarizeTasks(longTasks),
      fixtureSyntheticParseMsExcluded: fixtureParseMs,
      pageErrors: errors,
    };
    await page.close();
  } finally {
    await browser.close();
  }
}

// ---- Phase B: warm load (same profile => IndexedDB head-start) ----
{
  const browser = await launch(userDataDir);
  try {
    const { page, errors } = await openPage(browser, { withDataset: true });
    const t0 = Date.now();
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForCards(page);
    result.startup.timeToDataVisibleMsFromLocalCache = Date.now() - t0;
    result.startup.timeToDataVisibleMsFromLocalCacheNote = 'fresh navigation in the same profile (IndexedDB from phase A); includes the fixture 100ms delay';
    result.startup.warmPageErrors = errors;
    await page.close();
  } finally {
    await browser.close();
  }
}

// ---- Phase C: live single-record update and search latency (fresh profile) ----
{
  const browser = await launch(mkdtempSync(join(tmpdir(), 'omega-perf-live-')));
  try {
    const { page } = await openPage(browser, { withDataset: true });
    await page.goto(`${origin}/`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await waitForCards(page);
    await new Promise(r => setTimeout(r, 1500));

    result.live = { singleRecordUpdate: await page.evaluate(() => new Promise(resolveFn => {
      const fx = window.__firebaseTest;
      const grid = document.querySelector('#customersGrid');
      const emitter = fx.listeners['v2/customers'];
      if (!emitter) return resolveFn({ error: 'no v2/customers listener' });
      const rows = fx.fixtures['v2/customers'];
      const cust = Object.values(rows).find(c => grid.textContent.includes(c.name));
      if (!cust) return resolveFn({ error: 'no visible customer found' });
      const newName = 'تحديث حي ' + Date.now();
      const t = performance.now();
      const observer = new MutationObserver(() => {
        if (document.body.textContent.includes(newName)) {
          observer.disconnect();
          resolveFn({ ms: +(performance.now() - t).toFixed(2), customerId: cust.id });
        }
      });
      observer.observe(document.body, { subtree: true, childList: true, characterData: true });
      rows[cust.id] = { ...cust, name: newName, updatedAt: Date.now() };
      emitter(rows);
      setTimeout(() => { observer.disconnect(); resolveFn({ error: 'timeout: DOM did not show the update within 10s' }); }, 10000);
    })) };
    result.live.singleRecordUpdate.budgetMet = result.live.singleRecordUpdate.ms != null && result.live.singleRecordUpdate.ms < 30;

    result.live.search = await page.evaluate(async () => {
      const input = document.getElementById('searchInput');
      if (!input) return { error: 'no #searchInput' };
      const query = 'منتج';
      const perKeystrokeMs = [];
      let value = '';
      for (const ch of query) {
        value += ch;
        const t = performance.now();
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise(r => requestAnimationFrame(() => r()));
        perKeystrokeMs.push(+(performance.now() - t).toFixed(2));
      }
      return { query, perKeystrokeMs, maxMs: Math.max(...perKeystrokeMs) };
    });
    await page.close();
  } finally {
    await browser.close();
  }
}

// Budget checks against the baseline numbers.
const s = result.startup;
result.budgetCheck = {
  timeToDataVisibleFromLocalCache: s.timeToDataVisibleMsFromLocalCache <= 800 ? 'met' : 'not met',
  longestTaskUnder50ms: s.longTasks.maxMs < 50 ? 'met' : 'not met',
  liveUpdateUnder30ms: result.live.singleRecordUpdate.budgetMet ? 'met' : 'not met',
  customerDomNodesUnder1500: s.domNodesAfterLoad < 1500 ? 'met' : 'not met (measured on dashboard, see limitations)',
  initialJsGzipUnder80KB: initialJsGzip < 80 * 1024 ? 'met' : 'not met',
};
result.initialJsGzipBytes = initialJsGzip;
result.initialJsGzipKB = +(initialJsGzip / 1024).toFixed(1);
result.initialJsFiles = initialJs;
result.limitations = [
  'Transfer seconds are an estimate (fixture SDK bypasses the network). Bytes are exact for the synthetic payloads.',
  'Per-section applySectionSnapshot timings are not measured: the function is closed over inside src/main.js and cannot be hooked without changing app code.',
  'Customer DOM nodes are measured on the dashboard (where #customersGrid lives), not on the separate customers screen.',
  'The heap figure is the JS heap after a forced GC, measured in one run.',
  'This is a simulation in headless Chromium, not a measurement of real users on real devices.',
];

await server.httpServer.close();
const json = JSON.stringify(result, null, 2);
if (process.env.PERF_WRITE) writeFileSync(process.env.PERF_WRITE, json + '\n');
console.log(json);
