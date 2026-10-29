import test from 'node:test';
import assert from 'node:assert/strict';
import { createListenerRegistry } from '../src/listener-registry.js';

function harness({ idleTimeoutMs = 0 } = {}) {
  let clock = 1000;
  const starts = [];
  const stops = [];
  const registry = createListenerRegistry({ now: () => clock, idleTimeoutMs });
  const start = name => () => { starts.push(name); return () => stops.push(name); };
  return { registry, starts, stops, advance: ms => { clock += ms; }, start };
}

test('attach subscribes once per name and returns an idempotent unsubscribe', () => {
  const h = harness();
  const off1 = h.registry.attach('sales', h.start('sales'));
  const off2 = h.registry.attach('sales', h.start('sales'));
  assert.deepEqual(h.starts, ['sales'], 'a second attach must not open a second listener');
  off1(); off1(); off2();
  assert.deepEqual(h.stops, ['sales'], 'off() must run exactly once');
  assert.equal(h.registry.size, 0);
});

test('releasing one listener leaves the others streaming', () => {
  const h = harness();
  h.registry.attach('sales', h.start('sales'));
  h.registry.attach('customers', h.start('customers'));
  h.registry.release('sales');
  assert.deepEqual(h.stops, ['sales']);
  assert.equal(h.registry.isActive('customers'), true);
  assert.deepEqual(h.registry.stats().names, ['customers']);
});

test('pauseAll calls every off() and resumeAll re-subscribes the same listeners', () => {
  const h = harness();
  h.registry.attach('sales', h.start('sales'));
  h.registry.attach('customers', h.start('customers'));
  h.registry.pauseAll();
  assert.deepEqual(h.stops, ['sales', 'customers']);
  assert.deepEqual(h.registry.stats(), { total: 2, active: 0, paused: 2, subscriptions: 2, names: ['sales', 'customers'] });
  h.registry.resumeAll();
  assert.deepEqual(h.starts, ['sales', 'customers', 'sales', 'customers']);
  assert.equal(h.registry.stats().active, 2);
  h.registry.resumeAll();
  assert.equal(h.starts.length, 4, 'resuming an already active listener must be a no-op');
});

test('a paused listener can be released without a second off()', () => {
  const h = harness();
  h.registry.attach('sales', h.start('sales'));
  h.registry.pauseAll();
  h.registry.release('sales');
  assert.deepEqual(h.stops, ['sales']);
  assert.equal(h.registry.size, 0);
});

test('sweepIdle drops listeners that stayed paused beyond the idle timeout', () => {
  const h = harness({ idleTimeoutMs: 5000 });
  h.registry.attach('sales', h.start('sales'));
  h.registry.attach('customers', h.start('customers'));
  h.registry.pauseAll();
  h.advance(1000);
  assert.equal(h.registry.sweepIdle(), 0);
  h.advance(5000);
  assert.equal(h.registry.sweepIdle(), 2);
  assert.equal(h.registry.size, 0);
  assert.deepEqual(h.stops, ['sales', 'customers'], 'sweep must still call off()');
});

test('a subscribe that throws stays retryable instead of poisoning the registry', () => {
  const h = harness();
  const errors = [];
  const registry = createListenerRegistry({ onError: (name, error) => errors.push([name, error.message]) });
  registry.attach('sales', () => { throw new Error('permission denied'); });
  assert.equal(registry.has('sales'), false);
  assert.deepEqual(errors, [['sales', 'permission denied']]);
  registry.attach('sales', () => () => {});
  assert.equal(registry.isActive('sales'), true);
});

test('a subscribe that forgets to return off() is rejected loudly', () => {
  const registry = createListenerRegistry({ onError: () => {} });
  registry.attach('sales', () => undefined);
  assert.equal(registry.has('sales'), false);
});

test('touch records activity for idle accounting', () => {
  const h = harness();
  h.registry.attach('sales', h.start('sales'));
  assert.equal(h.registry.touch('sales'), true);
  assert.equal(h.registry.touch('missing'), false);
});

test('dispose releases everything (hard navigation / tests)', () => {
  const h = harness();
  h.registry.attach('a', h.start('a'));
  h.registry.attach('b', h.start('b'));
  h.registry.dispose();
  assert.deepEqual(h.stops, ['a', 'b']);
  assert.equal(h.registry.size, 0);
});
