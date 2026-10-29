// UI check: a woman paying per session (اشتراك بالحصة) must appear in the
// female section's receipts income, count and coach commission — not only in
// the dashboard's "إناث (حصص هذا الشهر)" counter.
//
// It loads the real index.html + src/main.js in jsdom, records a quick session
// with two female clients and one male, opens "قسم الإناث (33%)" and reads the
// rendered cards and table.
//
// Run it with:  npm run test:female-ui
// Requires jsdom (dev only):  npm install --no-save jsdom
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';

let jsdom;
try {
    jsdom = await import('jsdom');
} catch {
    console.log('SKIP  tests/female-income.check.mjs — jsdom is not installed (npm install --no-save jsdom)');
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
const text = id => ($(id) ? $(id).textContent : '');
const results = [];
function check(label, fn) {
    try {
        fn();
        results.push({ ok: true, label });
    } catch (e) {
        results.push({ ok: false, label, error: e.message });
    }
}

const today = new Date();
const localToday = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

// A 1500 DZD session: two female clients and one male, 500 each.
function recordSession() {
    window.quickSessClientsData = [
        { activity: 'musculation', price: '500', gender: 'female' },
        { activity: 'cardio', price: '500', gender: 'male' },
        { activity: 'musculation', price: '500', gender: 'female' }
    ];
    $('quickSessCount').value = '1';
    $('quickSessPrice').value = '1500';
    $('quickSessPaymentDate').value = localToday;
    window.playBeep = () => {};
    window.handleQuickSessionSubmit({ preventDefault() {}, stopPropagation() {} });
}

function openFemaleSection() {
    $('femaleCommPeriod').value = 'all';
    $('femaleCommPaymentFilter').value = 'all';
    $('femaleCommPercent').value = '33';
    $('femaleCommSearchInput').value = '';
    window.openFemaleCoachModal();
}

check('a quick session with female clients is recorded', () => {
    recordSession();
    const session = (window.appState.quickSessions || [])[0];
    assert.ok(session, 'the session was not recorded');
    assert.equal(session.price, 1500);
    assert.deepEqual(session.clients.map(c => c.gender), ['female', 'male', 'female']);
});

check('female session income enters "المداخيل المقبوضة (الإناث)"', () => {
    openFemaleSection();
    const cards = text('femaleCommStatsCards');
    // 2 of 3 equal clients => 1000 DZD of the 1500 DZD session.
    assert.match(cards, /المداخيل المقبوضة \(الإناث\)/);
    assert.match(cards, /1,000\s*دج/, `female receipts should include the session share:\n${cards}`);
    assert.match(cards, /حصص: 1,000 دج/, 'the receipts card must show the sessions breakdown');
    assert.match(cards, /اشتراكات: 0 دج/, 'there are no female subscriptions in this scenario');
});

check('the coach commission (33%) is computed on session income too', () => {
    const cards = text('femaleCommStatsCards');
    // 33% of 1000 = 330 DZD.
    assert.match(cards, /330\s*دج/, `commission should include the session share:\n${cards}`);
    assert.match($('femalePayoutAmountInput').value, /^330$/, 'the payout field should pre-fill with the remaining balance');
});

check('the female count includes session clients', () => {
    assert.equal(text('femaleCommSubCountBadge'), '2');
    const cards = text('femaleCommStatsCards');
    assert.match(cards, /0 مشتركة · 2 زبونة حصص \(1 حصة\)/);
});

check('the table lists the session with its female share of the money', () => {
    const table = $('femaleCommSubscribersTable').innerHTML;
    assert.match(table, /زبونات حصص — 2 أنثى/);
    assert.match(table, /اشتراك بالحصة/);
    assert.match(table, /1,000 دج/);
    assert.match(table, /من أصل حصة 1,500 دج/);
    assert.match(table, /330 دج/);
});

check('a male-only session adds nothing to the female section', () => {
    window.quickSessClientsData = [{ activity: 'cardio', price: '800', gender: 'male' }];
    $('quickSessCount').value = '1';
    $('quickSessPrice').value = '800';
    $('quickSessPaymentDate').value = localToday;
    window.handleQuickSessionSubmit({ preventDefault() {}, stopPropagation() {} });
    openFemaleSection();
    const cards = text('femaleCommStatsCards');
    assert.match(cards, /حصص: 1,000 دج/, 'the male session must not change the female total');
    assert.equal(text('femaleCommSubCountBadge'), '2');
});

check('the credit filter hides cash sessions, the paid filter keeps them', () => {
    $('femaleCommPaymentFilter').value = 'credit';
    window.renderFemaleCoachModal();
    assert.match(text('femaleCommStatsCards'), /حصص: 0 دج/);
    assert.match($('femaleCommSubscribersTable').innerHTML, /لا توجد مشتركات إناث أو حصص إناث/);

    $('femaleCommPaymentFilter').value = 'paid';
    window.renderFemaleCoachModal();
    assert.match(text('femaleCommStatsCards'), /حصص: 1,000 دج/);
});

for (const r of results) {
    console.log(`${r.ok ? 'ok  ' : 'FAIL'}  ${r.label}${r.ok ? '' : `\n      ${r.error}`}`);
}
const failed = results.filter(r => !r.ok).length;
console.log(`\n# female income ui checks ${results.length}, passed ${results.length - failed}, failed ${failed}`);
process.exit(failed ? 1 : 0);
