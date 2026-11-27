// Integration regression: subscriber passwords (4 digits, unique) in the real UI.
// Run with: npm install --no-save jsdom && node tests/subscriber-password.check.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { webcrypto } from 'node:crypto';

let jsdom;
try {
    jsdom = await import('jsdom');
} catch {
    console.log('SKIP  tests/subscriber-password.check.mjs — jsdom is not installed (npm install --no-save jsdom)');
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

// In the browser these are global bindings; in Node only window.* is populated.
for (const name of ['toggleEditCustTypeFields', 'toggleEditDebtField', 'renderCustomers', 'openEditModal',
    'openModal', 'closeModal', 'generateEditCustomerPassword', 'handleEditCustomerPasswordInput']) {
    if (typeof window[name] === 'function') globalThis[name] = window[name];
}

const $ = id => window.document.getElementById(id);
const savedCustomers = [];
window.lazyLoadSection = () => {};
window.saveFirebaseSectionItem = (section, item) => {
    if (section === 'customers') savedCustomers.push(JSON.parse(JSON.stringify(item)));
    return Promise.resolve(true);
};
window.appState.customers = [];
window.appState.packages = [{ id: 'test-pkg', name: 'Test', type: 'time', durationDays: 30, price: 1000 }];
window.appState.caisseLogs = [];
window.appState.credits = [];
window.appState.searchQuery = '';
window.appState.filter = 'all';

const today = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
})();

// ---------- 1) adding a subscriber issues a unique 4-digit password ----------
function addSubscriber(index) {
    window.openModal('addCustomerModal');
    $('custNameView').value = `مشترك تجريبي ${index}`;
    $('custPhoneView').value = `05500000${String(index).padStart(2, '0')}`;
    $('custDobView').value = '1995-03-10';
    $('custWeightView').value = '70';
    $('packageIdView').value = 'test-pkg';
    $('custPriceView').value = '1000';
    $('addCustStartDate').value = today;
    $('addCustEndDate').value = '2030-01-30';
    $('addCustPaymentDate').value = today;
    $('paymentStatusView').value = 'paid';
    window.handleAddCustomerSubmit({ preventDefault() {}, stopPropagation() {} });
}

addSubscriber(1);
addSubscriber(2);
addSubscriber(3);
assert.equal(window.appState.customers.length, 3, 'three subscribers must be created');

const passwords = window.appState.customers.map(c => c.password);
for (const password of passwords) {
    assert.match(String(password), /^\d{4}$/, `password must be 4 digits: ${password}`);
    assert.ok(Number(password) >= 1000 && Number(password) <= 9999);
}
assert.equal(new Set(passwords).size, 3, 'passwords must never repeat');

// ---------- 2) the card in the subscriber view shows the password ----------
window.appState.filter = 'all';
window.toggleView && window.toggleView('customersView');
window.renderCustomers();
const grid = $('customersGrid') || $('customersGridView');
const cardsText = window.document.getElementById('customersGridView').textContent
    + window.document.getElementById('customersGrid').textContent;
assert.match(cardsText, /كلمة المرور/);
for (const password of passwords) {
    assert.ok(cardsText.includes(password), `card must show password ${password}`);
}

// ---------- 3) legacy subscribers get backfilled without collisions ----------
window.appState.customers = [
    { id: 'legacy-1', name: 'قديم 1', phone: '0551111111', packageId: 'test-pkg', subscriptionType: 'time', endDate: '2030-01-01T00:00:00.000Z' },
    { id: 'legacy-2', name: 'قديم 2', phone: '0552222222', packageId: 'test-pkg', subscriptionType: 'time', endDate: '2030-01-01T00:00:00.000Z' },
    { id: 'legacy-3', name: 'قديم 3', phone: '0553333333', packageId: 'test-pkg', subscriptionType: 'time', endDate: '2030-01-01T00:00:00.000Z', password: '1234' },
    { id: 'legacy-4', name: 'قديم 4', phone: '0554444444', packageId: 'test-pkg', subscriptionType: 'time', endDate: '2030-01-01T00:00:00.000Z', password: '1234' },
];
window.ensureSubscriberPasswords({ force: true });
const legacyPasswords = window.appState.customers.map(c => c.password);
for (const password of legacyPasswords) assert.match(String(password), /^\d{4}$/);
assert.equal(new Set(legacyPasswords).size, 4, 'backfill must remove duplicates');
assert.equal(window.appState.customers[2].password, '1234', 'first holder keeps their code');

// ---------- 4) the password modal reveals / regenerates a unique code ----------
window.openSubscriberPasswordModal('legacy-1');
// openModal needs the document helpers that only exist on window in Node
globalThis.openModal = window.openModal;
assert.equal($('subscriberPasswordModal').classList.contains('active'), true);
assert.equal($('subPasswordCode').textContent, window.appState.customers[0].password);
assert.match($('subPasswordCustName').textContent, /قديم 1/);
const before = $('subPasswordCode').textContent;
window.regeneratePasswordFromModal();
const after = $('subPasswordCode').textContent;
assert.match(after, /^\d{4}$/);
assert.notEqual(after, before, 'regenerate must issue a different code');
assert.equal(new Set(window.appState.customers.map(c => c.password)).size, 4, 'still unique after regenerating');

// ---------- 5) editing rejects a password that another subscriber already uses ----------
const otherPassword = window.appState.customers[1].password;
window.openEditModal('legacy-1');
assert.equal($('editCustPassword').value, window.appState.customers[0].password, 'edit modal prefills the code');
$('editCustPassword').value = otherPassword;
window.handleEditCustomerPasswordInput($('editCustPassword'));
assert.equal($('editCustPasswordError').classList.contains('hidden'), false, 'duplicate must be flagged');

// ---------- 6) search finds a subscriber by their password ----------
window.appState.searchQuery = window.appState.customers[0].password;
window.renderCustomers();
assert.match(window.document.getElementById('customersGrid').textContent, /قديم 1/);

console.log('PASS subscriber passwords are auto-generated, unique, shown on cards and editable');
window.close();
process.exit(0);
