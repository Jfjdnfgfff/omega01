// Harness that loads the REAL src/main.js as an ES module inside a stubbed
// browser environment, so tests can call the shipped Google Drive functions
// (window.backupToGoogleDriveNow, window.listGoogleDriveBackups, ...) instead
// of a re-implementation of their logic.
//
// Note: this file is a test helper, matched by neither `tests/*.test.js` nor
// `tests/gram-pricing-ui.check.mjs`, so `npm test` ignores it.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(HERE, '..');
export const MAIN_JS = path.join(REPO_ROOT, 'src', 'main.js');

class FakeClassList {
    constructor() { this.s = new Set(); }
    add(...c) { c.forEach(x => this.s.add(x)); }
    remove(...c) { c.forEach(x => this.s.delete(x)); }
    toggle(c, on) { on ? this.s.add(c) : this.s.delete(c); }
    contains(c) { return this.s.has(c); }
}

class FakeElement {
    constructor(id) {
        this.id = id;
        this.classList = new FakeClassList();
        this.style = {};
        this.dataset = {};
        this.innerHTML = '';
        this.textContent = '';
        this.value = '';
        this.checked = false;
        this.disabled = false;
        this.files = [];
        this._listeners = {};
    }
    addEventListener(type, fn) { (this._listeners[type] ||= []).push(fn); }
    removeEventListener() {}
    appendChild(c) { return c; }
    removeChild(c) { return c; }
    querySelector() { return null; }
    querySelectorAll() { return []; }
    getContext() { return null; }
    scrollBy() {}
    focus() {}
    click() {}
    setAttribute() {}
    getAttribute() { return null; }
}

class FakeStorage {
    constructor() { this.m = new Map(); }
    getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
    setItem(k, v) { this.m.set(k, String(v)); }
    removeItem(k) { this.m.delete(k); }
    clear() { this.m.clear(); }
    key(i) { return [...this.m.keys()][i] ?? null; }
    get length() { return this.m.size; }
}

// `net` lets a test force the Drive endpoints to fail: net.uploadStatus = 403.
function makeFakeXHR(sink, net) {
    return class FakeXHR {
        constructor() {
            this.method = null; this.url = null;
            this._headers = {};
            this.onload = null; this.onerror = null;
            this._respHeaders = {};
            this.status = 0; this.responseText = '';
        }
        open(method, url) { this.method = method; this.url = url; }
        setRequestHeader(k, v) { this._headers[k.toLowerCase()] = v; }
        getResponseHeader(name) { return this._respHeaders[String(name).toLowerCase()] ?? null; }
        send(body) {
            sink.push({
                kind: 'xhr', method: this.method, url: this.url,
                headers: this._headers, body, xhr: this,
            });
            this.status = net.uploadStatus;
            this.responseText = net.uploadStatus >= 200 && net.uploadStatus < 300
                ? JSON.stringify(net.uploadBody)
                : JSON.stringify({ error: { message: 'forced failure' } });
            this._respHeaders = {};
            if (typeof this.onload === 'function') this.onload();
        }
    };
}

// Real-enough Firebase stubs. main.js runs its own init shortly after load and
// assigns window.firebaseDB / firebaseRef / firebaseGet from these, so they must
// return usable objects — otherwise `buildFullBackupState()` sees no database and
// silently falls back to whatever is in memory. Tests drive `firebase.data`.
function makeFirebaseStubs(firebase) {
    const snap = (value) => ({
        exists: () => value !== null && value !== undefined,
        val: () => value,
    });
    return {
        'firebase/app': {
            initializeApp: () => ({ name: 'stub-app' }),
        },
        'firebase/database': {
            getDatabase: () => firebase.db,
            ref: (_db, path) => ({ path: String(path) }),
            get: async (r) => {
                const path = String(r?.path ?? '');
                if (typeof firebase.onGet === 'function') return firebase.onGet(path);
                return snap(Object.hasOwn(firebase.data, path) ? firebase.data[path] : null);
            },
            set: async () => undefined,
            update: async () => undefined,
            push: () => ({ key: 'stub-key', set: async () => undefined }),
            remove: async () => undefined,
            onValue: () => () => {},
            off: () => {},
            query: (q) => q,
            limitToLast: (q) => q, limitToFirst: (q) => q,
            startAt: (q) => q, endAt: (q) => q,
            startAfter: (q) => q, endBefore: (q) => q,
            orderByKey: (q) => q, orderByChild: (q) => q, equalTo: (q) => q,
        },
    };
}

export function createEnv(options = {}) {
    const xhrCalls = [];
    const fetchCalls = [];
    const elements = new Map();

    // Test-controlled Drive endpoint behaviour.
    const net = {
        uploadStatus: 201,
        uploadBody: { id: 'fake-file-id', name: 'uploaded.json' },
    };

    // Test-controlled Realtime Database contents, keyed by path (e.g. 'v2/products').
    const firebase = {
        db: { name: 'stub-database' },
        data: {},
        onGet: null,
    };

    // The auto-sync debounce is a real 30 s timer in the app. Tests may shrink it
    // so the suite does not have to sleep, without changing what is exercised.
    const debounceMs = options.autoSyncDebounceMs;

    // The sandbox object IS the global object, and `window` is an alias for it,
    // exactly like a browser. Anything main.js assigns to `window.x` therefore
    // also becomes a bare global `x`.
    const sandbox = {};
    const win = sandbox;

    const documentStub = {
        readyState: 'complete',
        head: new FakeElement('head'),
        body: new FakeElement('body'),
        documentElement: new FakeElement('html'),
        getElementById: (id) => {
            if (!elements.has(id)) elements.set(id, new FakeElement(id));
            return elements.get(id);
        },
        createElement: (tag) => new FakeElement('created:' + tag),
        querySelector: () => null,
        querySelectorAll: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        execCommand: () => true,
    };

    const navigatorStub = {
        onLine: true,
        language: 'ar-DZ',
        userAgent: 'node-harness',
        clipboard: { writeText: async () => {} },
    };

    const fetchStub = async (input, init = {}) => {
        const url = typeof input === 'string' ? input : String(input?.url);
        fetchCalls.push({ kind: 'fetch', url, init, method: init.method || 'GET' });
        const body = init.body;
        const text = typeof body === 'string' ? body : '';
        if (url.includes('/oauth2/v3/tokeninfo')) {
            return { ok: true, status: 200, json: async () => ({ expires_in: '3599', scope: 'https://www.googleapis.com/auth/drive.file' }) };
        }
        if (url.includes('/oauth2/v3/userinfo')) {
            return { ok: true, status: 200, json: async () => ({ email: 'tester@example.com' }) };
        }
        if (url.includes('/drive/v3/files') && !url.includes('/upload/')) {
            return { ok: true, status: 200, json: async () => ({ files: [] }) };
        }
        return { ok: true, status: 200, json: async () => ({ id: 'fake-file-id', name: 'uploaded.json' }), text: async () => text };
    };

    Object.assign(sandbox, {
        window: win,
        self: win,
        globalThis: win,
        top: win,
        parent: win,
        document: documentStub,
        navigator: navigatorStub,
        localStorage: new FakeStorage(),
        sessionStorage: new FakeStorage(),
        location: {
            protocol: 'http:', hostname: 'localhost', port: '3000',
            href: 'http://localhost:3000/', search: '', hash: '', origin: 'http://localhost:3000',
        },
        history: { pushState() {}, replaceState() {} },
        console,
        setTimeout: (fn, ms, ...args) =>
            setTimeout(fn, debounceMs !== undefined ? Math.min(Number(ms) || 0, debounceMs) : ms, ...args),
        clearTimeout,
        // src/main.js:868 starts a perpetual setInterval(); unref it so the Node
        // test process can still exit once the tests are done.
        setInterval: (fn, ms, ...args) => {
            const t = setInterval(fn, ms, ...args);
            if (t && typeof t.unref === 'function') t.unref();
            return t;
        },
        clearInterval,
        requestAnimationFrame: (fn) => setTimeout(() => fn(Date.now()), 0),
        cancelAnimationFrame: (t) => clearTimeout(t),
        getComputedStyle: () => ({ getPropertyValue: () => '' }),
        matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
        addEventListener: () => {},
        removeEventListener: () => {},
        fetch: fetchStub,
        XMLHttpRequest: makeFakeXHR(xhrCalls, net),
        Blob: globalThis.Blob,
        TextEncoder: globalThis.TextEncoder,
        TextDecoder: globalThis.TextDecoder,
        FileReader: class { readAsText() {} },
        URL: globalThis.URL,
        URLSearchParams: globalThis.URLSearchParams,
        alert: () => {},
        confirm: () => true,
        prompt: () => null,
        print: () => {},
        btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
        atob: (s) => Buffer.from(s, 'base64').toString('binary'),
        performance: globalThis.performance,
        crypto: globalThis.crypto,
        structuredClone: globalThis.structuredClone,
        queueMicrotask: globalThis.queueMicrotask,
        AbortController: globalThis.AbortController,
        CustomEvent: class CustomEvent { constructor(type, opts = {}) { this.type = type; this.detail = opts.detail; } },
        Event: class Event { constructor(type) { this.type = type; } },
        Image: class { constructor() { this.width = 0; this.height = 0; } },
        Audio: class { play() { return Promise.resolve(); } },
    });

    const context = vm.createContext(sandbox);

    return {
        context, sandbox, windowStub: win, documentStub,
        elements, xhrCalls, fetchCalls, net, firebase,
        el: (id) => documentStub.getElementById(id),
        // Sign in as a Google Drive account for the duration of a test.
        signIn() {
            sandbox.sessionStorage.setItem('sm_gdrive_token', 'ya29.fake-token');
            sandbox.sessionStorage.setItem('sm_gdrive_expires_at', String(Date.now() + 3600_000));
        },
        // Wait for the debounced auto-sync callback to have run.
        async flushAutoSync(extra = 40) {
            await new Promise((r) => setTimeout(r, (debounceMs ?? 0) + extra));
        },
    };
}

export async function loadMain(env) {
    const source = fs.readFileSync(MAIN_JS, 'utf8');

    // Build stub modules for the bare specifiers (firebase/app, firebase/database)
    // exporting every name main.js imports from them.
    const stubCache = new Map();
    const importRe = /import\s*\{([^}]*)\}\s*from\s*["']([^"'.][^"']*)["']/g;
    for (const m of source.matchAll(importRe)) {
        const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/).pop().trim()).filter(Boolean);
        const spec = m[2];
        stubCache.set(spec, [...new Set([...(stubCache.get(spec) || []), ...names])]);
    }

    const module = new vm.SourceTextModule(source, {
        identifier: MAIN_JS,
        context: env.context,
        importModuleDynamically: async (spec) => import(spec),
    });

    const stubs = makeFirebaseStubs(env.firebase);

    await module.link(async (specifier) => {
        if (specifier.startsWith('.')) {
            const target = path.resolve(path.dirname(MAIN_JS), specifier);
            return new vm.SourceTextModule(fs.readFileSync(target, 'utf8'), {
                identifier: target, context: env.context,
            });
        }
        const names = stubCache.get(specifier) || [];
        const impl = stubs[specifier] || {};
        return new vm.SyntheticModule(names, function () {
            for (const n of names) this.setExport(n, impl[n] || (() => undefined));
        }, { identifier: specifier, context: env.context });
    });

    const result = { evaluationError: null };
    try {
        await module.evaluate();
    } catch (e) {
        result.evaluationError = e;
    }
    return result;
}
