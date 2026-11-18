// Integration regression: real renewal form and subscriber filters (requires jsdom).
// Run with: npm install --no-save jsdom && node tests/renewal-status.check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';

let jsdom;
try {
    jsdom = await import('jsdom');
} catch {
    console.log('SKIP  tests/renewal-status.check.mjs — jsdom is not installed (npm install --no-save jsdom)');
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
// Prevent this test from contacting the configured production database.
Object.defineProperty(window.navigator, 'onLine', { value: false, configurable: true });
globalThis.fetch = window.fetch = async () => { throw new Error('Network disabled in test'); };
window.XMLHttpRequest = globalThis.XMLHttpRequest = class { open() {} send() { throw new Error('Network disabled in test'); } };
window.WebSocket = globalThis.WebSocket = class { constructor() { throw new Error('Network disabled in test'); } };

await import('../src/main.js');

const $ = id => window.document.getElementById(id);
// Browser global object properties are also global bindings; mirror that in Node.
for (const name of ['toggleRenewCustTypeFields', 'setRenewStartDateMode', 'updateRenewEndDate', 'toggleRenewDebtField']) globalThis[name] = window[name];
// Avoid any writes or reads against the real backend.
window.lazyLoadSection = () => {};
const savedCustomers = [];
window.saveFirebaseSectionItem = (section, item) => {
  if (section === 'customers') savedCustomers.push(JSON.parse(JSON.stringify(item)));
  return Promise.resolve(true);
};
const key = offset => {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const customer = { id: 'test-renewal', name: 'Renewal Test Member', phone: '0555123456',
  packageId: 'test-pkg', subscriptionType: 'time', status: 'active',
  startDate: key(-60) + 'T00:00:00.000Z', endDate: key(-30) + 'T00:00:00.000Z',
  _endMs: Date.parse(key(-30)), paymentStatus: 'paid' };
window.appState.customers = [customer];
window.appState.packages = [{ id: 'test-pkg', name: 'Test', type: 'time', durationDays: 30, price: 1000 }];
window.appState.caisseLogs = [];
window.appState.credits = [];
window.appState.searchQuery = '';
window.appState.filter = 'expired';
window.renderCustomers();
assert.match($('customersGrid').textContent, /Renewal Test Member/);
window.openRenewModal(customer.id);
assert.equal($('renewEndDate').value, key(30));
window.handleRenewCustomerSubmit({ preventDefault() {}, stopPropagation() {} });
// Rendering is scheduled through requestAnimationFrame and the list queue.
await new Promise(resolve => setTimeout(resolve, 300));
assert.equal(window.calculateStatus(customer), 'active');
assert.doesNotMatch($('customersGrid').textContent, /Renewal Test Member/);
window.appState.filter = 'active';
window.renderCustomers();
assert.match($('customersGrid').textContent, /Renewal Test Member/);
assert.equal(savedCustomers.length, 1);
assert.equal(savedCustomers[0].endDate.slice(0, 10), key(30));
assert.equal(savedCustomers[0]._endMs, undefined);
const cleaned = window.getCleanSyncPayload({ customers: [{ ...customer, _endMs: 1, _endMsFor: 'old' }] });
assert.equal(cleaned.customers[0]._endMs, undefined);
assert.equal(cleaned.appState.customers[0]._endMsFor, undefined);
assert.equal(window.appState.caisseLogs.filter(log => log.source === 'subscription').length, 1);
console.log('PASS renewal removes the member from expired and shows them in active');

customer.subscriptionType = 'session';
customer.remainingSessions = 10;
customer.endDate = null;
window.toggleFreeze(customer.id);
assert.equal(customer.status, 'frozen');
window.toggleFreeze(customer.id);
assert.equal(customer.endDate, null);
assert.equal(window.calculateStatus(customer), 'active');
console.log('PASS freezing and unfreezing an undated session does not add an expiry');
window.close();
process.exit(0);
