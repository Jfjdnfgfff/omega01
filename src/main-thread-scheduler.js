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

/**
 * Classic trailing-edge debounce for search boxes and free-text filters.
 * Coalesces rapid keystrokes so heavy filtering/DOM work runs once after the
 * user pauses typing, cutting main-thread input blocking (INP Input Delay).
 */
export function debounce(fn, waitMs = 140) {
  let timer = null;
  let lastArgs = null;
  let lastThis = undefined;
  const delay = Math.max(0, Number(waitMs) || 0);

  function invoke() {
    timer = null;
    const args = lastArgs;
    const ctx = lastThis;
    lastArgs = null;
    lastThis = undefined;
    return fn.apply(ctx, args || []);
  }

  function debounced(...args) {
    lastArgs = args;
    lastThis = this;
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(invoke, delay);
  }

  debounced.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    lastArgs = null;
    lastThis = undefined;
  };

  debounced.flush = () => {
    if (timer === null) return undefined;
    clearTimeout(timer);
    return invoke();
  };

  debounced.pending = () => timer !== null;
  return debounced;
}

/**
 * Leading + trailing throttle for live numeric calculators, quantity inputs,
 * and continuous UI updates. Gives immediate feedback on the first event, then
 * caps execution to at most once every `intervalMs` while guaranteeing the
 * final value is always processed on the trailing edge.
 */
export function throttle(fn, intervalMs = 60, { leading = true, trailing = true, now = defaultNow } = {}) {
  const wait = Math.max(0, Number(intervalMs) || 0);
  let lastInvokeTime = -Infinity;
  let timer = null;
  let pendingArgs = null;
  let pendingThis = undefined;

  function invoke(time, ctx, args) {
    lastInvokeTime = time;
    pendingArgs = null;
    pendingThis = undefined;
    return fn.apply(ctx, args || []);
  }

  function trailingEdge() {
    timer = null;
    if (trailing && pendingArgs !== null) {
      invoke(now(), pendingThis, pendingArgs);
    } else {
      pendingArgs = null;
      pendingThis = undefined;
    }
  }

  function throttled(...args) {
    const current = now();
    if (lastInvokeTime === -Infinity && !leading) {
      lastInvokeTime = current;
    }
    const remaining = wait - (current - lastInvokeTime);
    pendingArgs = args;
    pendingThis = this;

    if (remaining <= 0 || remaining > wait) {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      return invoke(current, pendingThis, pendingArgs);
    }
    if (timer === null && trailing) {
      timer = setTimeout(trailingEdge, remaining);
    }
    return undefined;
  }

  throttled.cancel = () => {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    pendingArgs = null;
    pendingThis = undefined;
    lastInvokeTime = -Infinity;
  };

  throttled.flush = () => {
    if (timer === null) return undefined;
    clearTimeout(timer);
    timer = null;
    if (pendingArgs !== null) {
      return invoke(now(), pendingThis, pendingArgs);
    }
    return undefined;
  };

  return throttled;
}

/**
 * Frame-aligned throttle (`requestAnimationFrame`) for scroll, pointer-drag,
 * and resize handlers that read/write layout properties.
 */
export function rafThrottle(fn) {
  let frameId = null;
  let timerId = null;
  let latestArgs = null;
  let latestThis = undefined;

  function run() {
    frameId = null;
    timerId = null;
    const args = latestArgs;
    const ctx = latestThis;
    latestArgs = null;
    latestThis = undefined;
    fn.apply(ctx, args || []);
  }

  function wrapped(...args) {
    latestArgs = args;
    latestThis = this;
    if (frameId !== null || timerId !== null) return;
    const raf = globalScope.requestAnimationFrame;
    if (typeof raf === 'function') {
      frameId = raf(run);
    } else {
      timerId = setTimeout(run, 16);
    }
  }

  wrapped.cancel = () => {
    if (frameId !== null && typeof globalScope.cancelAnimationFrame === 'function') {
      globalScope.cancelAnimationFrame(frameId);
    }
    if (timerId !== null) clearTimeout(timerId);
    frameId = null;
    timerId = null;
    latestArgs = null;
    latestThis = undefined;
  };

  wrapped.pending = () => frameId !== null || timerId !== null;

  return wrapped;
}

/**
 * Schedule heavy post-click work (table/list rendering) right AFTER the
 * browser paints the immediate visual state change (active tab, modal shell,
 * view switch), keeping INP well under 100 ms. Keyed slots ensure rapid clicks
 * supersede stale pending work rather than piling up tasks.
 */
export function createInteractiveDeferrer({ timeout = 120 } = {}) {
  const pendingByKey = new Map();

  function schedule(key, callback) {
    const slot = String(key || 'default');
    const prevCancel = pendingByKey.get(slot);
    if (typeof prevCancel === 'function') prevCancel();

    let done = false;
    let rafId = 0;
    let taskTimer = null;
    let safetyTimer = null;

    const finish = () => {
      if (done) return;
      done = true;
      if (taskTimer !== null) clearTimeout(taskTimer);
      if (safetyTimer !== null) clearTimeout(safetyTimer);
      if (pendingByKey.get(slot) === cancel) pendingByKey.delete(slot);
      callback();
    };

    const cancel = () => {
      done = true;
      if (rafId && typeof globalScope.cancelAnimationFrame === 'function') {
        globalScope.cancelAnimationFrame(rafId);
      }
      if (taskTimer !== null) clearTimeout(taskTimer);
      if (safetyTimer !== null) clearTimeout(safetyTimer);
      if (pendingByKey.get(slot) === cancel) pendingByKey.delete(slot);
    };

    pendingByKey.set(slot, cancel);
    const raf = globalScope.requestAnimationFrame;
    if (typeof raf === 'function') {
      // rAF runs right before paint; setTimeout(0) inside rAF runs right AFTER
      // paint — the standard browser pattern to minimize INP presentation delay.
      rafId = raf(() => {
        taskTimer = setTimeout(finish, 0);
      });
      if (timeout > 0) safetyTimer = setTimeout(finish, timeout);
    } else {
      taskTimer = setTimeout(finish, 0);
    }
    return cancel;
  }

  function cancelAll() {
    for (const cancel of pendingByKey.values()) cancel();
    pendingByKey.clear();
  }

  return { schedule, cancelAll, get size() { return pendingByKey.size; } };
}

