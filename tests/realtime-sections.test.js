import test from 'node:test';
import assert from 'node:assert/strict';
import { createRealtimeSections, readSectionWithLegacy } from '../src/realtime-sections.js';

function harness(overrides = {}) {
  const callbacks = new Map(), subscriptions = [], legacyReads = [], applied = [], errors = [];
  let stops = 0;
  const loader = createRealtimeSections({
    subscribe(name, data, error) { subscriptions.push(name); callbacks.set(name, { data, error }); return () => stops++; },
    readLegacy: async name => { legacyReads.push(name); return null; },
    apply: (name, data) => applied.push([name, data]),
    onError: (name, error) => errors.push([name, error]),
    ...overrides,
  });
  return { loader, subscriptions, legacyReads, applied, errors, callbacks, get stops() { return stops; } };
}

test('startup, early navigation and repeated requests share one first snapshot', async () => {
  const h = harness();
  const first = h.loader.load('customers');
  assert.equal(h.loader.load('customers'), first);
  await h.callbacks.get('customers').data({ c1: { name: 'Test' } });
  await first;
  await h.loader.load('customers');
  assert.deepEqual(h.subscriptions, ['customers']);
  assert.deepEqual(h.legacyReads, []);
  assert.equal(h.applied.length, 1);
});

test('waiting on a slow snapshot does not start a competing read', async () => {
  const h = harness();
  const p = h.loader.load('products');
  await new Promise(resolve => setTimeout(resolve, 25));
  assert.equal(h.loader.load('products'), p);
  assert.deepEqual(h.legacyReads, []);
  assert.deepEqual(h.applied, []);
  await h.callbacks.get('products').data({ p1: { stock: 2 } });
  await p;
});

test('subsequent realtime updates still apply without new subscriptions', async () => {
  const h = harness();
  const p = h.loader.load('sales');
  await h.callbacks.get('sales').data({ s1: { total: 100 } }); await p;
  await h.callbacks.get('sales').data({ s1: { total: 200 } });
  assert.equal(h.applied.at(-1)[1].s1.total, 200);
  assert.equal(h.subscriptions.length, 1);
});

test('absent v2 initial data reads legacy once, including a valid empty database', async () => {
  const h = harness(); const p = h.loader.load('credits');
  await h.callbacks.get('credits').data(null); await p;
  await h.callbacks.get('credits').data(null);
  assert.deepEqual(h.legacyReads, ['credits']);
});

test('a slow legacy response cannot overwrite a newer v2 snapshot', async () => {
  let finish;
  const h = harness({ readLegacy: () => new Promise(resolve => { finish = resolve; }) });
  const p = h.loader.load('customers');
  const old = h.callbacks.get('customers').data(null);
  await Promise.resolve();
  await h.callbacks.get('customers').data({ latest: { name: 'New' } });
  finish({ stale: { name: 'Old' } }); await old; await p;
  assert.deepEqual(h.applied, [['customers', { latest: { name: 'New' } }]]);
});

test('a stale legacy failure cannot cancel a newer successful stream', async () => {
  let reject;
  const h = harness({ readLegacy: () => new Promise((_, no) => { reject = no; }) });
  const p = h.loader.load('customers');
  const old = h.callbacks.get('customers').data(null); await Promise.resolve();
  await h.callbacks.get('customers').data({ fresh: {} });
  reject(new Error('old read failed')); await old; await p;
  assert.equal(h.errors.length, 0); assert.equal(h.loader.has('customers'), true);
});

test('permission/network errors are retryable and do not masquerade as empty data', async () => {
  const h = harness(); const p = h.loader.load('products');
  h.callbacks.get('products').error(new Error('permission_denied'));
  await assert.rejects(p, /permission_denied/);
  assert.equal(h.stops, 1); assert.equal(h.applied.length, 0);
  const retry = h.loader.load('products');
  await h.callbacks.get('products').data({ p1: {} }); await retry;
  assert.equal(h.subscriptions.length, 2);
});

test('one failed section does not stop unrelated sections', async () => {
  const h = harness(); const products = h.loader.load('products'), customers = h.loader.load('customers');
  h.callbacks.get('products').error(new Error('offline'));
  await h.callbacks.get('customers').data({ c1: {} }); await customers;
  await assert.rejects(products, /offline/);
  assert.equal(h.loader.has('customers'), true);
});

test('failed data application does not mark a section ready', async () => {
  const h = harness({ apply() { throw new Error('invalid data'); } });
  const p = h.loader.load('sales'); await h.callbacks.get('sales').data({});
  await assert.rejects(p, /invalid data/); assert.equal(h.loader.has('sales'), false);
});

test('REST fallback only reads legacy after a successful null response', async () => {
  const paths = [];
  const read = async path => { paths.push(path); return path === 'v2/products' ? null : { p1: {} }; };
  assert.deepEqual(await readSectionWithLegacy(read, 'v2/products', 'products'), { p1: {} });
  assert.deepEqual(paths, ['v2/products', 'products']);
  const primary = await readSectionWithLegacy(async () => ({}), 'v2/credits', 'credits');
  assert.deepEqual(primary, {});
});

test('REST permission errors are not swallowed or followed by another bulk download', async () => {
  let reads = 0;
  await assert.rejects(readSectionWithLegacy(async () => { reads++; throw new Error('HTTP 403'); }, 'v2/customers', 'customers'), /403/);
  assert.equal(reads, 1);
});
