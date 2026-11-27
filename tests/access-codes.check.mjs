// Integration regression: staff & supplier passwords (4 digits, unique across the
// whole system) in the real UI. Run with:
//   npm install --no-save jsdom && node tests/access-codes.check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';

let jsdom;
try {
    jsdom = await import('jsdom');
} catch {
    console.log('SKIP  tests/access-codes.check.mjs — jsdom is not installed (npm install --no-save jsdom)');
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
Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
globalThis.fetch = window.fetch = async () => { throw new Error('Network disabled in test'); };
window.XMLHttpRequest = globalThis.XMLHttpRequest = class { open() {} send() { throw new Error('Network disabled in test'); } };
window.WebSocket = globalThis.WebSocket = class { constructor() { throw new Error('Network disabled in test'); } };

await import('../src/main.js');

for (const name of ['renderStaffPayouts', 'renderSuppliersList', 'openModal', 'closeModal',
    'openAccessCodeModal', 'regenerateAccessCode', 'ensureAccessCodes', 'workerAccessCode',
    'supplierAccessCode', 'switchStaffModalTab', 'getAllSupplierTransactions',
    'displaySupplierName', 'supplierKey', 'logActivity', 'escapeHTML']) {
    if (typeof window[name] === 'function') globalThis[name] = window[name];
}

const $ = id => window.document.getElementById(id);
const saved = [];
window.lazyLoadSection = () => Promise.resolve([]);
window.saveFirebaseSectionItem = (section, item) => {
    saved.push({ section, item: JSON.parse(JSON.stringify(item)) });
    return Promise.resolve(true);
};

const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

// ---------- fixtures: customers already hold codes, plus staff payouts & suppliers ----------
window.appState.customers = [
    { id: 'c1', name: 'زبون', password: '1111' },
    { id: 'c2', name: 'زبونة', password: '2222' },
];
window.appState.packages = [];
window.appState.caisseLogs = [];
window.appState.credits = [];
window.appState.supplierTransactions = [];
window.appState.staffPayouts = [
    { id: 'p1', name: 'أحمد', staffName: 'أحمد', type: 'راتب شهري', amount: 30000, date: today, fundSource: 'daily' },
    { id: 'p2', name: 'بلال', staffName: 'بلال', type: 'راتب شهري', amount: 25000, date: today, fundSource: 'daily' },
    { id: 'p3', name: 'Karim', staffName: 'Karim', type: 'مكافأة / بونوس', amount: 5000, date: today, fundSource: 'general' },
];
window.appState.suppliers = [
    { id: 's1', name: 'مورد أوميغا', info: 'مكملات', paid: 10000, debt: 5000, date: new Date().toISOString() },
    { id: 's2', name: 'Optimum Store', info: 'بروتين', paid: 20000, debt: 0, date: new Date().toISOString() },
];

// ---------- 1) staff cards show a unique 4-digit code ----------
window.switchStaffModalTab('payouts');
window.renderStaffPayouts();
const staffText = $('staffPayoutsList').textContent;
const workerCodes = window.appState.staffPayouts.map(p => window.workerAccessCode(p.name));
for (const code of workerCodes) {
    assert.match(String(code), /^\d{4}$/, `worker code must be 4 digits: ${code}`);
    assert.ok(staffText.includes(code), `staff card must show code ${code}`);
}
assert.equal(new Set(workerCodes).size, 3, 'each worker gets a different code');

// ---------- 2) supplier cards show a unique 4-digit code ----------
window.renderSuppliersList();
const supplierText = $('suppliersList').textContent;
const supplierCodes = window.appState.suppliers.map(s => window.supplierAccessCode(s.name));
for (const code of supplierCodes) {
    assert.match(String(code), /^\d{4}$/, `supplier code must be 4 digits: ${code}`);
    assert.ok(supplierText.includes(code), `supplier card must show code ${code}`);
}
assert.equal(new Set(supplierCodes).size, 2, 'each supplier gets a different code');

// ---------- 3) every code in the system is unique (customers + staff + suppliers) ----------
const allCodes = [
    ...window.appState.customers.map(c => c.password),
    ...workerCodes,
    ...supplierCodes,
];
assert.equal(new Set(allCodes).size, allCodes.length, `codes must never repeat: ${allCodes.join(',')}`);

// ---------- 4) the modal opens with the right code and can regenerate a new unique one ----------
window.openAccessCodeModal('staff', 'أحمد');
assert.equal($('accessCodeModal').classList.contains('active'), true);
assert.equal($('accessCodeValue').textContent, workerCodes[0]);
assert.match($('accessCodeName').textContent, /أحمد/);
assert.match($('accessCodeModalTitle').textContent, /العامل/);
const beforeRegen = $('accessCodeValue').textContent;
window.regenerateAccessCode();
const afterRegen = $('accessCodeValue').textContent;
assert.match(afterRegen, /^\d{4}$/);
assert.notEqual(afterRegen, beforeRegen, 'regenerate must issue a different code');
assert.equal(window.appState.customers.some(c => c.password === afterRegen), false, 'never collides with a customer');
const codesAfterRegen = [
    ...window.appState.customers.map(c => c.password),
    ...window.appState.staffPayouts.map(p => window.workerAccessCode(p.name)),
    ...window.appState.suppliers.map(s => window.supplierAccessCode(s.name)),
];
assert.equal(new Set(codesAfterRegen).size, codesAfterRegen.length, 'unique after regenerating');

// ---------- 5) a supplier modal uses the supplier label ----------
window.openAccessCodeModal('suppliers', 'Optimum Store');
assert.match($('accessCodeModalTitle').textContent, /المورد/);
assert.equal($('accessCodeValue').textContent, supplierCodes[1]);

await new Promise(resolve => setTimeout(resolve, 120));

// ---------- 6) codes are persisted to their own Firebase sections ----------
assert.ok(saved.some(entry => entry.section === 'staffPasswords'), 'staff codes are saved');
// المفتاح يجب أن يكون الاسم الموحّد (لا طابعاً زمنياً) حتى يبقى السجل واحداً لكل عامل
const staffRecord = saved.find(entry => entry.section === 'staffPasswords' && entry.item.name === 'أحمد');
assert.ok(staffRecord, 'the worker record keeps its name');
// الاسم الموحّد = نفس مفتاح تجميع الخلاصات (trim + حروف صغيرة)، لا طابع زمني
assert.equal(staffRecord.item.id, 'أحمد');
assert.equal(staffRecord.item.key, 'أحمد');
assert.ok(saved.some(entry => entry.section === 'supplierPasswords'), `supplier codes are saved: ${saved.map(e => e.section).join(',')}`);

// ---------- 7) a newly recorded worker gets a code automatically ----------
window.appState.staffPayouts.unshift({
    id: 'p9', name: 'عامل جديد', staffName: 'عامل جديد', type: 'أجر يومي', amount: 4000, date: today, fundSource: 'daily',
});
window.renderStaffPayouts();
const newWorkerCode = window.workerAccessCode('عامل جديد');
assert.match(String(newWorkerCode), /^\d{4}$/);
assert.equal(new Set([...codesAfterRegen, newWorkerCode]).size, codesAfterRegen.length + 1);

console.log('PASS staff and supplier passwords are auto-generated, unique and shown on their cards');
window.close();
process.exit(0);
