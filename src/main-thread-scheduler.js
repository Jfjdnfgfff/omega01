// Cooperative main-thread scheduling.
//
// Lighthouse reports "Long main-thread tasks" whenever a single task blocks the
// thread for more than ~50 ms. The fix is never "make the loop faster" alone:
// it is to *split* the loop into slices that each finish under the frame budget,
// and to hand control back to the browser between slices so it can paint and
// respond to input.
//
// Everything here degrades gracefully:
//   scheduler.postTask({priority:'user-visible'})  -> newest Chrome
//   MessageChannel                                 -> everywhere, ~0 ms, no clamping
//   setTimeout(0)                                  -> last resort (4 ms clamp)
//
// The module is deliberately DOM-free (except guarded feature detection) so it
// can be unit tested with plain node --test.

const globalScope = typeof globalThis !== 'undefined' ? globalThis : {};

function defaultNow() {
  const perf = globalScope.performance;
  if (perf && typeof perf.now === 'function') return perf.now();
  return Date.now();
}

/**
 * Yield to the event loop so the browser can paint / run input handlers.
 * Resolves on the next task, after a real scheduling boundary.
 */
export function yieldToMain() {
  const scheduler = globalScope.scheduler;
  if (scheduler && typeof scheduler.yield === 'function') {
    // Continuation priority: we keep our place in the queue, the browser still
    // gets a chance to paint (documented "yield to user input" behaviour).
    try { return scheduler.yield(); } catch (e) { /* fall through */ }
  }
  if (typeof MessageChannel === 'function') {
    return new Promise(resolve => {
      const channel = new MessageChannel();
      channel.port1.onmessage = () => { channel.port1.close(); resolve(); };
      channel.port2.postMessage(null);
    });
  }
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Run `callback` after the browser has painted the current frame.
 * Double requestAnimationFrame = "the paint for this frame already happened".
 *
 * A hidden/background tab gets no frames at all, so a `timeout` fallback fires
 * the callback anyway: deferred work must never be lost, only postponed.
 * The callback runs at most once.
 */
export function afterNextPaint(callback, { timeout = 300, fallbackDelay = 16 } = {}) {
  let done = false;
  let outer = 0;
  let inner = 0;
  let timer = null;
  const run = () => {
    if (done) return;
    done = true;
    if (timer !== null) clearTimeout(timer);
    callback();
  };
  const raf = globalScope.requestAnimationFrame;
  if (typeof raf !== 'function') {
    timer = setTimeout(run, fallbackDelay);
    return () => { if (timer !== null) clearTimeout(timer); };
  }
  outer = raf(() => { inner = raf(run); });
  if (timeout > 0) timer = setTimeout(run, timeout);
  return () => {
    done = true;
    if (timer !== null) clearTimeout(timer);
    if (typeof globalScope.cancelAnimationFrame === 'function') {
      globalScope.cancelAnimationFrame(outer);
      globalScope.cancelAnimationFrame(inner);
    }
  };
}

/**
 * Run `callback` when the browser is idle (requestIdleCallback with a sane
 * timeout so it still happens on Safari, which has no rIC).
 */
export function whenIdle(callback, { timeout = 2000, fallbackDelay = 200 } = {}) {
  const ric = globalScope.requestIdleCallback;
  if (typeof ric === 'function') {
    const handle = ric(deadline => callback(deadline), { timeout });
    return () => {
      if (typeof globalScope.cancelIdleCallback === 'function') globalScope.cancelIdleCallback(handle);
    };
  }
  const timer = setTimeout(() => callback({ didTimeout: true, timeRemaining: () => 0 }), fallbackDelay);
  return () => clearTimeout(timer);
}

/**
 * Time-sliced serial runner.
 *
 *   const runner = createTimeSliceRunner({ budgetMs: 8 });
 *   runner.run([() => renderProducts(), () => renderSales(), ...]);
 *
 * Each step runs synchronously; before starting a step the runner checks how
 * much time the current slice already used. Over budget => await a yield.
 * Calls are serialized: a second `run()` waits for the first one to finish, so
 * two render passes can never interleave and corrupt the DOM.
 */
export function createTimeSliceRunner({ budgetMs = 8, now = defaultNow, yieldToMain: yieldFn = yieldToMain, onError } = {}) {
  let tail = Promise.resolve();
  let queued = 0;
  let slices = 0;

  function run(steps = []) {
    const list = Array.isArray(steps) ? steps.slice() : [];
    queued += 1;
    const task = tail.then(async () => {
      let sliceStart = now();
      for (let i = 0; i < list.length; i++) {
        const step = list[i];
        try {
          step();
        } catch (error) {
          if (typeof onError === 'function') onError(error);
          else if (globalScope.console) console.warn('Time-sliced step isolated error:', error);
        }
        // No point yielding after the very last step: nothing is left to run.
        if (i < list.length - 1 && now() - sliceStart >= budgetMs) {
          slices += 1;
          await yieldFn();
          sliceStart = now();
        }
      }
    }).finally(() => { queued -= 1; });
    // Keep the internal chain alive even if a caller ignores a rejection.
    tail = task.catch(() => {});
    return task;
  }

  return {
    run,
    get queued() { return queued; },
    get slices() { return slices; },
  };
}

/**
 * Chunk any large array synchronously-produced list into slices, running
 * `worker(item, index)` and yielding whenever the budget is spent. Useful for
 * "map over 3000 sales records" style work that must still finish in order.
 */
export async function runChunked(items, worker, { budgetMs = 8, now = defaultNow, yieldToMain: yieldFn = yieldToMain } = {}) {
  const list = Array.isArray(items) ? items : [];
  let sliceStart = now();
  const results = new Array(list.length);
  for (let i = 0; i < list.length; i++) {
    results[i] = worker(list[i], i);
    if (now() - sliceStart >= budgetMs) {
      await yieldFn();
      sliceStart = now();
    }
  }
  return results;
}
