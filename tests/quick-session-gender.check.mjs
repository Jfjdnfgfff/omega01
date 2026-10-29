// UI check for the gender (male / female) choice inside the quick session
// subscription modal: loads the real index.html and the real src/main.js in
// jsdom, drives the modal, submits a session and reads what was stored.
//
// Run it with:  npm run test:session-ui
//
// It is a standalone script (not part of `npm test`) because loading the app pulls
// in Firebase, which keeps retry timers alive and would stop `node --test` from
// exiting. jsdom is dev-only and deliberately not pinned in package.json. Install
// it to run this check:
//     npm install --no-save jsdom
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';

let jsdom;
try {
    jsdom = await import('jsdom');
} catch {
    console.log('SKIP  tests/quick-session-gender.check.mjs — jsdom is not installed (npm install --no-save jsdom)');
    process.exit(0);
}

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const { JSDOM, VirtualConsole } = jsdom;

const virtualConsole = new VirtualConsole();
virtualConsole.on('jsdomError', () => {});
virtualConsole.on('error', () => {});
const dom = new JSDOM(readFileSync(join(root, 'index.html'), 'utf8'), {
    url: 'http://localhost:3000/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole
});
const { window } = dom;

// Minimal browser surface main.js touches while loading.
window.Worker = class { postMessage() {} terminate() {} addEventListener() {} };
window.matchMedia = window.matchMedia || (() => ({
    matches: false, media: '', addEventListener() {}, removeEventListener() {},
    addListener() {}, removeListener() {}, onchange: null
}));
window.scrollTo = () => {};
if (!window.crypto) Object.defineProperty(window, 'crypto', { value: webcrypto, configurable: true });
Object.defineProperty(window.HTMLCanvasElement.prototype, 'getContext', { value: () => null, configurable: true });
Object.defineProperty(window.HTMLElement.prototype, 'innerText', {
    get() { return this.textContent; },
    set(v) { this.textContent = (v === undefined || v === null) ? '' : String(v); },
    configurable: true
});
for (const key of ['window', 'document', 'navigator', 'localStorage', 'HTMLElement', 'Node', 'Event',
    'CustomEvent', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
    'DOMParser', 'FormData', 'Blob', 'File', 'FileReader', 'URL', 'crypto', 'Worker', 'matchMedia',
    'Image', 'XMLHttpRequest', 'fetch']) {
    if (window[key] !== undefined && globalThis[key] === undefined) globalThis[key] = window[key];
}
globalThis.window = window;
globalThis.document = window.document;

await import('../src/main.js');

const $ = id => window.document.getElementById(id);
const results = [];
function check(label, fn) {
    try {
        fn();
        results.push({ ok: true, label });
    } catch (e) {
        results.push({ ok: false, label, error: e.message });
    }
}

const localToday = () => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

check('the quick session modal offers a male / female choice for every client', () => {
    window.openQuickSessionModal();
    const html = $('quickSessClientsListContainer').innerHTML;
    assert.match(html, /الجنس\*/, 'the gender label is missing');
    assert.ok(html.includes("setQuickSessClientGender(0, 'male')"), 'the male button is missing');
    assert.ok(html.includes("setQuickSessClientGender(0, 'female')"), 'the female button is missing');
    // A fresh client defaults to male, matching the subscriber default.
    assert.equal(window.quickSessClientsData[0].gender, 'male');
    assert.match(html, /badge|bg-blue-50 text-blue-700/, 'the male state is not the active one');
});

check('choosing “أنثى” switches that client to female and re-renders', () => {
    window.setQuickSessClientGender(0, 'female');
    assert.equal(window.quickSessClientsData[0].gender, 'female');
    assert.ok($('quickSessClientsListContainer').innerHTML.includes('bg-pink-500'), 'the female state is not active');
    window.setQuickSessClientGender(0, 'male');
    assert.equal(window.quickSessClientsData[0].gender, 'male');
});

check('adding clients copies the gender of the previous client', () => {
    window.setQuickSessClientGender(0, 'female');
    $('quickSessClientCount').value = '3';
    window.onQuickSessClientCountChange('3');
    assert.equal(window.quickSessClientsData.length, 3);
    assert.deepEqual(window.quickSessClientsData.map(c => c.gender), ['female', 'female', 'female']);
    window.setQuickSessClientGender(1, 'male');
    assert.deepEqual(window.quickSessClientsData.map(c => c.gender), ['female', 'male', 'female']);
});

check('the submitted session stores each client gender and the history shows the split', () => {
    window.quickSessClientsData.forEach((c, i) => window.updateQuickSessClientPrice(i, '500'));
    $('quickSessCount').value = '1';
    $('quickSessPaymentDate').value = localToday();
    window.playBeep = () => {};
    // Inline onsubmit handlers do not run under runScripts: 'outside-only',
    // so drive the submit handler the same way the form would.
    window.handleQuickSessionSubmit({ preventDefault() {}, stopPropagation() {} });

    const session = (window.appState.quickSessions || [])[0];
    assert.ok(session, 'the session was not recorded');
    assert.deepEqual(session.clients.map(c => c.gender), ['female', 'male', 'female']);
    assert.equal(session.price, 1500);

    const history = $('quickSessionHistory').innerHTML;
    assert.match(history, /أنثى: 2/, 'the female count is missing from the history row');
    assert.match(history, /ذكر: 1/, 'the male count is missing from the history row');

    const totals = $('quickSessionActivityTotals').innerHTML;
    assert.match(totals, /إناث: 2 شخص/, 'the female total is missing');
    assert.match(totals, /ذكور: 1 شخص/, 'the male total is missing');
});

check('sessions saved before this change still count as male clients', () => {
    window.appState.quickSessions.unshift({
        id: 'legacy_session',
        date: Date.now(),
        clientCount: 2,
        sessionCount: 1,
        price: 1000,
        clients: [{ activity: 'musculation', price: 500 }, { activity: 'cardio', price: 500 }]
    });
    window.renderQuickSessionHistory();
    const totals = $('quickSessionActivityTotals').innerHTML;
    assert.match(totals, /ذكور: 3 شخص/, 'legacy clients are not counted as male');
    assert.match(totals, /إناث: 2 شخص/, 'the female total changed');
});

for (const r of results) {
    console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.label}${r.ok ? '' : `\n      ${r.error}`}`);
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n# ui checks ${results.length}, passed ${results.length - failed}, failed ${failed}`);
// Firebase keeps retry timers alive, so the loop never drains on its own.
process.exit(failed ? 1 : 0);
