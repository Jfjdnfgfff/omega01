// ============================================================
// DOM & MAIN-THREAD PERFORMANCE HELPERS
// ============================================================
// Three problems this file solves for the mobile PageSpeed report:
//
//  1. "Long tasks in the main thread"
//     Big lists (products / sales / customers / credits) used to be rebuilt
//     as ONE giant HTML string and written with a single `innerHTML =`
//     inside one synchronous task — hundreds of milliseconds on a phone.
//     `renderListChunked()` paints the first rows immediately and streams
//     the rest in animation-frame slices, so every task stays short.
//
//  2. Wasted work for hidden views
//     The dashboard render pass also rebuilt lists that live inside hidden
//     views. `isRenderVisible()` skips that work without ever reading
//     layout (no offsetParent / getBoundingClientRect => no forced reflow).
//
//  3. Redundant DOM writes
//     Writing the exact same HTML again still invalidates style + layout.
//     `setHTMLIfChanged()` / `setTextIfChanged()` drop those writes.
// ============================================================

/**
 * Visibility check based purely on the class/style tree (no layout read).
 * Returns false when the element itself, or any ancestor, is hidden.
 *
 * @param {Element|null} el
 * @returns {boolean}
 */
export function isRenderVisible(el) {
    if (!el || typeof el.classList === 'undefined') return false;
    let node = el;
    // Walk up at most 12 levels: every view/modal in this app is shallow.
    for (let depth = 0; node && depth < 12; depth++) {
        if (node.classList && node.classList.contains('hidden')) return false;
        const display = node.style && node.style.display;
        if (display === 'none') return false;
        node = node.parentElement;
    }
    return true;
}

/**
 * Write HTML only when it actually differs from what is already rendered.
 * @returns {boolean} true when the DOM was touched
 */
export function setHTMLIfChanged(el, html) {
    if (!el) return false;
    const next = (html === undefined || html === null) ? '' : String(html);
    if (el.__omegaLastHTML === next) return false;
    el.__omegaLastHTML = next;
    el.innerHTML = next;
    return true;
}

/**
 * Write text only when it actually differs from what is already rendered.
 * @returns {boolean} true when the DOM was touched
 */
export function setTextIfChanged(el, text) {
    if (!el) return false;
    const next = (text === undefined || text === null) ? '' : String(text);
    if (el.__omegaLastText === next) return false;
    el.__omegaLastText = next;
    el.textContent = next;
    return true;
}

/**
 * Render a potentially long list without creating one long main-thread task.
 *
 * - 0 items            -> the empty-state markup (single cheap write)
 * - <= chunkSize items -> one synchronous write (small lists stay instant)
 * - more items         -> first chunk synchronous, remaining chunks appended
 *                         one animation frame at a time. A newer render, or
 *                         the view being hidden, cancels the pending chunks.
 *
 * @param {Element|null} container
 * @param {Array} items
 * @param {(item:any, index:number) => string} buildItem
 * @param {string} [emptyHtml]
 * @param {{chunkSize?: number}} [options]
 */
export function renderListChunked(container, items, buildItem, emptyHtml = '', options = {}) {
    if (!container || typeof buildItem !== 'function') return;
    const list = Array.isArray(items) ? items : [];
    const chunkSize = Math.max(5, options.chunkSize || 30);

    // Invalidate any stream still running from a previous render pass.
    container.__omegaChunkToken = (container.__omegaChunkToken || 0) + 1;
    const token = container.__omegaChunkToken;

    if (list.length === 0) {
        setHTMLIfChanged(container, emptyHtml);
        return;
    }

    if (list.length <= chunkSize) {
        let html = '';
        for (let i = 0; i < list.length; i++) html += buildItem(list[i], i);
        setHTMLIfChanged(container, html);
        return;
    }

    // Nothing to gain from building rows nobody can see.
    if (!isRenderVisible(container)) {
        container.__omegaLastHTML = null; // force a real write when it becomes visible
        return;
    }

    let html = '';
    let index = Math.min(chunkSize, list.length);
    for (let i = 0; i < index; i++) html += buildItem(list[i], i);
    container.__omegaLastHTML = html;
    container.innerHTML = html;

    const step = () => {
        if (container.__omegaChunkToken !== token) return; // superseded
        if (!isRenderVisible(container)) return;           // view hidden meanwhile
        const end = Math.min(index + chunkSize, list.length);
        let part = '';
        for (; index < end; index++) part += buildItem(list[index], index);
        container.insertAdjacentHTML('beforeend', part);
        container.__omegaLastHTML = null; // streamed content != cached snapshot
        if (index < list.length) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
}

/**
 * Give the main thread back to the browser (input, paint, compositing).
 * Uses the native scheduler when available, otherwise a macrotask hop.
 */
export function yieldToMain() {
    if (typeof scheduler !== 'undefined' && scheduler && typeof scheduler.yield === 'function') {
        return scheduler.yield();
    }
    return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Run `cb` when the browser is idle, with a hard deadline so the work can
 * never be starved on a busy page.
 *
 * @param {Function} cb
 * @param {number} [timeout=1500]
 * @returns {number|undefined} idle-callback handle (when supported)
 */
export function onIdle(cb, timeout = 1500) {
    if (typeof cb !== 'function') return undefined;
    if (typeof requestIdleCallback === 'function') {
        return requestIdleCallback(() => {
            try { cb(); } catch (err) { console.warn('[onIdle] deferred task contained an error:', err); }
        }, { timeout });
    }
    return setTimeout(() => {
        try { cb(); } catch (err) { console.warn('[onIdle] deferred task contained an error:', err); }
    }, Math.min(timeout, 200));
}

/**
 * Run a list of tasks one per frame/idle slice instead of all at once.
 * @param {Array<Function>} tasks
 */
export function runSliced(tasks) {
    const queue = Array.isArray(tasks) ? tasks.filter(t => typeof t === 'function') : [];
    const next = () => {
        const task = queue.shift();
        if (!task) return;
        try { task(); } catch (err) { console.warn('[runSliced] task contained an error:', err); }
        if (queue.length) onIdle(next, 800);
    };
    if (queue.length) onIdle(next, 800);
}
