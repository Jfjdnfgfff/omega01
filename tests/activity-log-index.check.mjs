// UI check: the activity log ("سجل العمليات") must render from the in-memory
// index — newest-first, filtered, paginated — and stay correct after the
// underlying array is replaced or mutated.
//
// Run it with:  npm run test:activity-log-ui
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
    console.log('SKIP  tests/activity-log-index.check.mjs — jsdom is not installed (npm install --no-save jsdom)');
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
const cards = () => (($('activityLogList') || {}).innerHTML || '').split('deleteActivityLog(').length - 1;
const results = [];
async function check(label, fn) {
    try {
        await fn();
        results.push({ ok: true, label });
    } catch (e) {
        results.push({ ok: false, label, error: e.message });
    }
}

const start = Date.UTC(2026, 9, 1, 8, 0, 0);
const logs = Array.from({ length: 250 }, (_, i) => ({
    id: `act_${i}`,
    // Newest first in state, exactly how logActivity() unshifts them.
    timestamp: new Date(start - i * 60_000).toISOString(),
    type: ['customer', 'sale', 'expense', 'system'][i % 4],
    title: i % 5 === 0 ? 'إضافة مشترك: أحمد' : `عملية رقم ${i}`,
    details: i % 3 === 0 ? 'الهاتف: 0550000000 | المخزون: من 10 إلى 8' : 'بيان تجريبي',
    amount: (i % 7) * 100,
    dateStr: '2026-10-01'
}));
window.appState.activityLogs = logs.map(l => ({ ...l }));

await check('the log renders one page of cards and the full match count', async () => {
    await window.renderActivityLogModal();
    assert.equal(cards(), 100, 'first page should hold exactly 100 cards');
    assert.equal($('activityLogTotalCount').textContent, '250 عملية');
    assert.match($('activityLogList').innerHTML, /عرض المزيد/);
});

await check('the newest record is rendered first', async () => {
    const html = $('activityLogList').innerHTML;
    assert.ok(html.indexOf('act_0') === -1 || html.indexOf('عملية رقم 0') < html.indexOf('عملية رقم 9'),
        'records must be ordered newest-first');
});

await check('"عرض المزيد" grows the page without changing the total', async () => {
    window.showMoreActivityLogs();
    await window.renderActivityLogModal();
    assert.equal(cards(), 200);
    assert.equal($('activityLogTotalCount').textContent, '250 عملية');
    window.showMoreActivityLogs();
    await window.renderActivityLogModal();
    assert.equal(cards(), 250);
    assert.doesNotMatch($('activityLogList').innerHTML, /عرض المزيد/);
});

await check('search filters the index and ignores Arabic diacritics', async () => {
    const input = $('activityLogSearchInput');
    input.value = 'احمد';
    await window.renderActivityLogModal();
    assert.equal($('activityLogTotalCount').textContent, '50 عملية');
    assert.equal(cards(), 50);

    input.value = 'أحمد';
    await window.renderActivityLogModal();
    assert.equal($('activityLogTotalCount').textContent, '50 عملية');

    input.value = '';
    await window.renderActivityLogModal();
    assert.equal($('activityLogTotalCount').textContent, '250 عملية');
});

await check('the type filter and a search combine', async () => {
    const select = $('activityLogCategoryFilter');
    select.value = 'expense';
    await window.renderActivityLogModal();
    assert.equal(cards(), 62, 'rows 3, 7, … 247 of 250 are expenses');

    $('activityLogSearchInput').value = 'بيان تجريبي';
    await window.renderActivityLogModal();
    const expected = window.appState.activityLogs.filter(l => l.type === 'expense' && l.details.includes('بيان تجريبي')).length;
    assert.equal(cards(), Math.min(expected, 100));
    assert.equal($('activityLogTotalCount').textContent, `${expected} عملية`);

    $('activityLogSearchInput').value = '';
    select.value = 'all';
    await window.renderActivityLogModal();
    assert.equal($('activityLogTotalCount').textContent, '250 عملية');
});

await check('a mutated array (delete path) re-indexes immediately', async () => {
    window.appState.activityLogs = window.appState.activityLogs.filter(l => l.id !== 'act_0');
    await window.renderActivityLogModal();
    assert.equal($('activityLogTotalCount').textContent, '249 عملية');
    assert.ok(!$('activityLogList').innerHTML.includes('act_0'));
});

await check('a new row prepended by logActivity() shows up first', async () => {
    window.logActivity('system', 'فحص الفهرس', 'سجل جديد');
    await window.renderActivityLogModal();
    assert.equal($('activityLogTotalCount').textContent, '250 عملية');
    const firstCard = $('activityLogList').innerHTML.indexOf('فحص الفهرس');
    assert.ok(firstCard > 0 && firstCard < $('activityLogList').innerHTML.indexOf('عملية رقم 1'),
        'the freshly logged row must be the first card');
});

// ---------------------------------------------------------------------------
// Cloud paging: the realtime listener only carries the newest window, so the
// log must be able to pull older rows one page at a time.
// ---------------------------------------------------------------------------
window.appState.activityLogs = Array.from({ length: 20 }, (_, i) => ({
    id: `act_${i}`,
    _rtdbKey: `act_${i}`,
    timestamp: new Date(Date.UTC(2026, 9, 1, 8, 0, 0) - i * 60_000).toISOString(),
    type: 'system',
    title: `سجل ${i}`,
    details: '',
    dateStr: '2026-10-01'
}));
window.firebaseCursors = window.firebaseCursors || {};
window.firebaseCursors.activityLogs = { oldestKey: null, hasMore: true };

const fetchCalls = [];
const olderPage = [
    { id: 'old_1', _rtdbKey: 'old_1', timestamp: new Date(Date.UTC(2026, 8, 30)).toISOString(), type: 'system', title: 'سجل قديم 1', details: '' },
    { id: 'old_2', _rtdbKey: 'old_2', timestamp: new Date(Date.UTC(2026, 8, 29)).toISOString(), type: 'system', title: 'سجل قديم 2', details: '' },
    { id: 'old_3', _rtdbKey: 'old_3', timestamp: new Date(Date.UTC(2026, 8, 28)).toISOString(), type: 'system', title: 'سجل قديم 3', details: '' },
];
let olderPagesLeft = [olderPage];
window.fetchOlderPage = async (section, options) => {
    fetchCalls.push({ section, options });
    return olderPagesLeft.shift() || [];
};

await check('the log offers a cloud page when the in-memory window is exhausted', async () => {
    $('activityLogSearchInput').value = '';
    $('activityLogCategoryFilter').value = 'all';
    await window.renderActivityLogModal();
    const html = $('activityLogList').innerHTML;
    assert.equal(cards(), 20);
    assert.match(html, /تحميل المزيد من السجل/);
    assert.match(html, /تحميل كامل السجل/);
    assert.doesNotMatch(html, /عرض المزيد \(/);
});

await check('"تحميل كامل السجل" fetches only the next older page and then stops', async () => {
    await window.loadFullActivityLog();
    assert.equal(fetchCalls.length, 1, 'a short page must end the paging loop');
    assert.equal(fetchCalls[0].section, 'activityLogs');
    assert.equal(fetchCalls[0].options.pageSize, 100);
    assert.equal(fetchCalls[0].options.oldestKey, 'act_0', 'cursor must be the oldest key in memory');
    assert.equal($('activityLogTotalCount').textContent, '23 عملية');
    assert.equal(cards(), 23, 'the older rows are merged into the visible list');
    assert.match($('activityLogList').innerHTML, /سجل قديم 3/);
});

await check('once the whole history is loaded the footer says so and offers nothing else', async () => {
    const html = $('activityLogList').innerHTML;
    assert.match(html, /تم تحميل كل السجل/);
    assert.doesNotMatch(html, /تحميل المزيد من السجل/);
    assert.equal(window.firebaseCursors.activityLogs.hasMore, false);
});

await check('opening the log shows a loading note, then refreshes itself when the snapshot lands', async () => {
    // Pretend Firebase is configured but its first snapshot is not in yet.
    window.firebaseDB = window.firebaseDB || {};
    window.firebaseLoadedSections = window.firebaseLoadedSections || {};
    delete window.firebaseLoadedSections.activityLogs;
    window.lazyLoadSection = async () => [];

    const opening = window.openActivityLogModal();
    assert.match($('activityLogList').innerHTML, /جاري تحميل السجل/,
        'the cached rows must be labelled as still loading, not presented as the whole log');
    await opening;
    assert.doesNotMatch($('activityLogList').innerHTML, /جاري تحميل السجل/);

    const before = cards();
    window.applyFirebaseSectionUpdate('activityLogs', [{
        id: 'act_live', _rtdbKey: 'act_live', timestamp: new Date().toISOString(),
        type: 'system', title: 'سجل وصل من السحابة', details: ''
    }], 'test');
    assert.equal(cards(), before + 1, 'an open log must show rows that arrive without a click');
    assert.match($('activityLogList').innerHTML, /سجل وصل من السحابة/);
});

await check('an empty log shows the empty state, not a broken index', async () => {
    window.appState.activityLogs = [];
    await window.renderActivityLogModal();
    assert.equal(cards(), 0);
    assert.equal($('activityLogTotalCount').textContent, '0 عملية');
    assert.match($('activityLogList').innerHTML, /لا توجد عمليات مسجلة/);
});

let failed = 0;
for (const r of results) {
    if (r.ok) console.log(`PASS  ${r.label}`);
    else { failed++; console.error(`FAIL  ${r.label}\n      ${r.error}`); }
}
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed === 0 ? 0 : 1);
