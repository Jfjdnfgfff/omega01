// Realtime listener lifecycle registry.
//
// Firebase's `onValue()` keeps a WebSocket (or long-poll `lp?` request when
// sockets are blocked) open for every subscribed node, and re-fires the full
// snapshot on every reconnect. Three classic leaks follow:
//
//   1. a second `onValue()` for the same path (navigation, retry, HMR) — the
//      old listener is never removed, so every byte is downloaded twice;
//   2. listeners that live forever because nobody ever calls the returned
//      unsubscribe function ("off()");
//   3. listeners that keep streaming while the tab is hidden in the background.
//
// This registry owns every subscription: it de-duplicates by name, remembers
// how to stop *and* how to restart each one, and exposes pause/resume/dispose
// so the page lifecycle can be honoured. It is DOM-free and unit tested.

/**
 * @param {object} options
 * @param {() => number} [options.now]           clock, injectable for tests
 * @param {number} [options.idleTimeoutMs]       release paused entries after this delay (0 = never)
 * @param {(name: string, error: unknown) => void} [options.onError]
 */
export function createListenerRegistry({ now = () => Date.now(), idleTimeoutMs = 0, onError } = {}) {
  /** @type {Map<string, {name:string, start:()=>()=>void, stop:null|(()=>void), active:boolean, subscribeCount:number, lastActivityAt:number, pausedAt:null|number}>} */
  const entries = new Map();

  function fail(name, error) {
    if (typeof onError === 'function') onError(name, error);
    else if (typeof console !== 'undefined') console.warn(`Listener registry (${name}):`, error);
  }

  function startEntry(entry) {
    if (entry.active) return;
    try {
      const stop = entry.start();
      if (typeof stop !== 'function') throw new Error(`subscribe() must return an unsubscribe function (${entry.name})`);
      entry.stop = stop;
      entry.active = true;
      entry.pausedAt = null;
      entry.subscribeCount += 1;
      entry.lastActivityAt = now();
    } catch (error) {
      entry.active = false;
      entry.stop = null;
      fail(entry.name, error);
    }
  }

  function stopEntry(entry, { paused }) {
    if (!entry.active) {
      entry.stop = null;
      return;
    }
    const stop = entry.stop;
    entry.stop = null;
    entry.active = false;
    if (paused) entry.pausedAt = now();
    try {
      if (typeof stop === 'function') stop(); // === onValue(...) unsubscribe / off(ref)
    } catch (error) {
      fail(entry.name, error);
    }
  }

  /**
   * Subscribe once per name. `start` must return the unsubscribe function
   * (what `onValue()` returns). Calling attach twice for the same name returns
   * the existing stop handle instead of creating a second listener.
   */
  function attach(name, start) {
    if (!name) throw new Error('attach() needs a listener name');
    if (typeof start !== 'function') throw new Error('attach() needs a start function');
    const existing = entries.get(name);
    if (existing) {
      existing.start = start; // newest closure (e.g. new query window)
      if (!existing.active) startEntry(existing);
      existing.lastActivityAt = now();
      return () => release(name);
    }
    const entry = { name, start, stop: null, active: false, subscribeCount: 0, lastActivityAt: now(), pausedAt: null };
    entries.set(name, entry);
    startEntry(entry);
    if (!entry.active) entries.delete(name); // failed to subscribe: stay retryable
    return () => release(name);
  }

  /** Mark a listener as alive (called on every snapshot). */
  function touch(name) {
    const entry = entries.get(name);
    if (entry) entry.lastActivityAt = now();
    return Boolean(entry);
  }

  /** Permanently stop and forget one listener. Idempotent. */
  function release(name) {
    const entry = entries.get(name);
    if (!entry) return false;
    stopEntry(entry, { paused: false });
    entries.delete(name);
    return true;
  }

  function releaseAll() {
    for (const name of Array.from(entries.keys())) release(name);
  }

  /** Stop every listener but remember how to restart them (tab hidden). */
  function pauseAll() {
    for (const entry of entries.values()) stopEntry(entry, { paused: true });
  }

  /** Restart everything paused. Firebase re-delivers the latest snapshot. */
  function resumeAll() {
    for (const entry of entries.values()) {
      if (!entry.active) startEntry(entry);
    }
  }

  /** Release listeners that have been paused longer than idleTimeoutMs. */
  function sweepIdle() {
    if (!idleTimeoutMs) return 0;
    const limit = now();
    let released = 0;
    for (const entry of Array.from(entries.values())) {
      if (entry.active) continue;
      if (entry.pausedAt !== null && limit - entry.pausedAt >= idleTimeoutMs) {
        release(entry.name);
        released += 1;
      }
    }
    return released;
  }

  /** Full teardown, e.g. before a hard navigation or in tests. */
  function dispose() {
    releaseAll();
  }

  function stats() {
    let active = 0;
    let paused = 0;
    let subscriptions = 0;
    for (const entry of entries.values()) {
      if (entry.active) active += 1; else paused += 1;
      subscriptions += entry.subscribeCount;
    }
    return { total: entries.size, active, paused, subscriptions, names: Array.from(entries.keys()) };
  }

  return {
    attach,
    touch,
    release,
    releaseAll,
    pauseAll,
    resumeAll,
    sweepIdle,
    dispose,
    stats,
    has: name => entries.has(name),
    isActive: name => Boolean(entries.get(name)?.active),
    get size() { return entries.size; },
  };
}
