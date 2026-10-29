import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimeSliceRunner, runChunked, yieldToMain } from '../src/main-thread-scheduler.js';

test('the slice runner yields once the time budget is spent, not once per step', async () => {
  // Fake clock: every step costs 3 ms. Budget 6 ms => a yield after every
  // second step (3 + 3 >= 6), never inside a step.
  let clock = 0;
  let yields = 0;
  const runner = createTimeSliceRunner({
    budgetMs: 6,
    now: () => clock,
    yieldToMain: async () => { yields += 1; },
  });
  const executed = [];
  await runner.run(Array.from({ length: 6 }, (_, i) => () => { executed.push(i); clock += 3; }));
  assert.deepEqual(executed, [0, 1, 2, 3, 4, 5]);
  // Six 3 ms steps under a 6 ms budget: a yield after steps 1 and 3; the
  // final step never yields because nothing is left to run.
  assert.equal(yields, 2);
});

test('a fast step batch runs without any yield at all', async () => {
  let yields = 0;
  const runner = createTimeSliceRunner({ budgetMs: 8, now: () => 0, yieldToMain: async () => { yields += 1; } });
  await runner.run([() => {}, () => {}]);
  assert.equal(yields, 0);
});

test('one failing render step never blocks the remaining steps', async () => {
  const seen = [];
  const runner = createTimeSliceRunner({
    budgetMs: 1000,
    now: () => 0,
    yieldToMain: async () => {},
    onError: error => seen.push(error.message),
  });
  const executed = [];
  await runner.run([
    () => { throw new Error('customers list exploded'); },
    () => executed.push('sales'),
  ]);
  assert.deepEqual(seen, ['customers list exploded']);
  assert.deepEqual(executed, ['sales']);
});

test('runs are serialized so two render passes never interleave', async () => {
  const order = [];
  let clock = 0;
  const runner = createTimeSliceRunner({
    budgetMs: 8,
    now: () => clock,
    // Every yield costs fake time so each step ends its own slice.
    yieldToMain: async () => { clock += 16; order.push('yield'); },
  });
  const first = runner.run([
    () => { order.push('a1'); clock += 9; },
    () => { order.push('a2'); clock += 9; },
  ]);
  const second = runner.run([() => order.push('b1')]);
  await Promise.all([first, second]);
  assert.deepEqual(order, ['a1', 'yield', 'a2', 'b1'], 'the second pass must start only after the first one finished');
});

test('a rejected caller promise does not break the internal chain', async () => {
  const runner = createTimeSliceRunner({ budgetMs: 1000, now: () => 0, yieldToMain: async () => {} });
  const bad = runner.run([() => { throw new Error('x'); }]);
  await bad;
  const executed = [];
  await runner.run([() => executed.push('after')]);
  assert.deepEqual(executed, ['after']);
});

test('runChunked processes every item in order and yields over budget', async () => {
  let clock = 0;
  let yields = 0;
  const seen = [];
  const result = await runChunked(
    [1, 2, 3, 4, 5, 6],
    (item, index) => { clock += 4; seen.push([item, index]); return item * 2; },
    { budgetMs: 8, now: () => clock, yieldToMain: async () => { yields += 1; } },
  );
  assert.deepEqual(result, [2, 4, 6, 8, 10, 12]);
  assert.deepEqual(seen, [[1, 0], [2, 1], [3, 2], [4, 3], [5, 4], [6, 5]]);
  assert.ok(yields >= 2, `expected several yields, got ${yields}`);
});

test('yieldToMain resolves without requestAnimationFrame or scheduler', async () => {
  const before = Date.now();
  await yieldToMain();
  assert.ok(Date.now() - before < 1000);
});

test('afterNextPaint falls back to a timer when frames never arrive (hidden tab)', async () => {
  const { afterNextPaint } = await import('../src/main-thread-scheduler.js');
  let ran = 0;
  afterNextPaint(() => { ran += 1; }, { timeout: 10 });
  await new Promise(resolve => setTimeout(resolve, 40));
  assert.equal(ran, 1, 'deferred work must not be lost in a background tab');
});

test('afterNextPaint never runs the callback twice', async () => {
  const { afterNextPaint } = await import('../src/main-thread-scheduler.js');
  let ran = 0;
  afterNextPaint(() => { ran += 1; }, { timeout: 5 });
  await new Promise(resolve => setTimeout(resolve, 60));
  assert.equal(ran, 1);
});
