import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { inlineSmallStylesheet } from '../scripts/vite-inline-styles.js';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const sw = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8');

function worker({ match = async () => undefined, fetch = async () => new Response('network') } = {}) {
  const listeners = {};
  let precached = [];
  const removed = [];
  vm.runInNewContext(sw, {
    self: {
      location: { origin: 'https://omega.example' },
      addEventListener: (type, callback) => { listeners[type] = callback; },
      skipWaiting() {}, clients: { claim() {} },
    },
    caches: {
      match,
      open: async () => ({ addAll: async (paths) => { precached = paths; }, put: async () => {} }),
      keys: async () => ['omega-gym-v6', 'omega-gym-v7', 'another-app'],
      delete: async (key) => { removed.push(key); },
    },
    URL, Response, fetch,
  });
  return { listeners, removed, get precached() { return precached; } };
}

async function dispatch(lh, event = {}) {
  let result;
  lh({ ...event, respondWith(promise) { result = promise; }, waitUntil(promise) { result = promise; } });
  return await result;
}

test('fonts are local cacheable files, not repeated Base64 HTML payloads', () => {
  assert.doesNotMatch(html, /data:font\/woff2;base64/);
  const paths = [...html.matchAll(/src:url\('(\/fonts\/[^']+)'\)/g)].map(m => m[1]);
  assert.equal(paths.length, 6);
  for (const path of paths) assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)));
  assert.equal((html.match(/font-display:optional/g) || []).length, 6);
  assert.match(html, /<link rel="stylesheet" href="\/src\/style.css">/);
});

test('default Firebase runtime config is valid JSON, not an HTML SPA fallback', () => {
  assert.deepEqual(JSON.parse(readFileSync(new URL('../public/firebase.config.json', import.meta.url))), {});
});

test('service worker precaches all six fonts for offline use', async () => {
  const w = worker();
  await dispatch(w.listeners.install);
  assert.equal(w.precached.filter(p => p.startsWith('/fonts/')).length, 6);
});

test('cache cleanup preserves other apps on the origin', async () => {
  const w = worker();
  await dispatch(w.listeners.activate);
  assert.deepEqual(w.removed, ['omega-gym-v6']);
});

test('cached content-hashed bundles do not trigger another network download', async () => {
  let calls = 0;
  const w = worker({ match: async () => new Response('cached'), fetch: async () => { calls++; return new Response('network'); } });
  const response = await dispatch(w.listeners.fetch, { request: { url: 'https://omega.example/assets/index-abcdefgh.js', method: 'GET', mode: 'cors' } });
  assert.equal(await response.text(), 'cached');
  assert.equal(calls, 0);
});

test('uncached content-hashed bundles are still fetched', async () => {
  const w = worker();
  const response = await dispatch(w.listeners.fetch, { request: { url: 'https://omega.example/assets/index-abcdefgh.js', method: 'GET', mode: 'cors' } });
  assert.equal(await response.text(), 'network');
});

test('offline navigation awaits index.html before falling back to /', async () => {
  const w = worker({ match: async path => path === '/' ? new Response('offline shell') : undefined, fetch: async () => { throw new Error('offline'); } });
  const response = await dispatch(w.listeners.fetch, { request: { url: 'https://omega.example/', method: 'GET', mode: 'navigate' } });
  assert.equal(await response.text(), 'offline shell');
});

test('preview requests are not intercepted by the production cache', () => {
  const w = worker();
  w.listeners.fetch({ request: { url: 'https://4173-test.e2b.app/', method: 'GET', mode: 'navigate' }, respondWith() { assert.fail('preview must bypass cache'); } });
});

const inlineCss = inlineSmallStylesheet().transformIndexHtml.handler;
const cssLink = '<link rel="stylesheet" crossorigin href="/assets/app-abcdefgh.css">';
test('small production CSS is present at first paint, without an async stylesheet race', () => {
  const result = inlineCss(cssLink, { bundle: { 'assets/app-abcdefgh.css': { type: 'asset', source: '.hidden{display:none}' } } });
  assert.equal(result, '<style data-omega-bundle>.hidden{display:none}</style>');
});

test('large or missing stylesheets retain their normal blocking link', () => {
  assert.equal(inlineCss(cssLink, { bundle: {} }), cssLink);
  assert.equal(inlineCss(cssLink, { bundle: { 'assets/app-abcdefgh.css': { type: 'asset', source: 'a'.repeat(100_001) } } }), cssLink);
});

test('inline CSS cannot close its HTML style element early', () => {
  const result = inlineCss(cssLink, { bundle: { 'assets/app-abcdefgh.css': { type: 'asset', source: 'a{content:"</style>"}' } } });
  assert.equal((result.match(/<\/style>/g) || []).length, 1);
});
