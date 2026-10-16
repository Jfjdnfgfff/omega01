// Exercises the REAL Google Drive backup code from src/main.js.
// Run with: node --experimental-vm-modules --test tests/gdrive-backup.test.js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnv, loadMain } from './gdrive-harness.mjs';

async function booted() {
    const env = createEnv();
    const { evaluationError } = await loadMain(env);
    assert.equal(evaluationError, null,
        evaluationError ? `src/main.js failed to evaluate: ${evaluationError.message}` : '');
    return env;
}

// Multipart bodies reach XHR.send()/fetch() as a Blob; read it back as text.
async function bodyText(body) {
    if (typeof body === 'string') return body;
    if (body && typeof body.text === 'function') return await body.text();
    if (Buffer.isBuffer(body)) return body.toString('utf8');
    return String(body);
}

function parseMultipart(text, boundary) {
    return text.split('--' + boundary).slice(1, -1).map((p) => {
        const sep = p.indexOf('\r\n\r\n');
        return {
            headers: sep === -1 ? '' : p.slice(0, sep).replace(/^\r\n/, ''),
            content: sep === -1 ? '' : p.slice(sep + 4).replace(/\r\n$/, ''),
        };
    });
}

// Every `name contains '...'` fragment the backups list will accept.
// Finds the Drive upload request whether the app used XHR or fetch, and normalises
// the record so the assertions test behaviour rather than the transport chosen.
function findUpload(env) {
    const xhr = env.xhrCalls.find((c) => c.url.includes('/upload/drive/v3/files'));
    if (xhr) {
        return { kind: 'xhr', url: xhr.url, method: xhr.method, headers: xhr.headers, body: xhr.body };
    }
    const f = env.fetchCalls.find((c) => c.url.includes('/upload/drive/v3/files'));
    if (!f) return null;
    const headers = {};
    for (const [k, v] of Object.entries(f.init?.headers || {})) headers[k.toLowerCase()] = v;
    return { kind: 'fetch', url: f.url, method: f.method, headers, body: f.init?.body };
}

function listQueryNeedles(fetchCalls) {
    const list = fetchCalls.find((c) => c.url.includes('/drive/v3/files?q='));
    assert.ok(list, 'the Drive list request was never made');
    const q = decodeURIComponent(list.url.split('q=')[1].split('&')[0]);
    assert.match(q, /trashed = false/, 'the list query must exclude trashed files');
    const needles = [...q.matchAll(/name contains '([^']+)'/g)].map((m) => m[1]);
    assert.ok(needles.length, 'the list query filters on no file name at all');
    return needles;
}

function isListed(fileName, needles) {
    return needles.some((n) => fileName.includes(n));
}

test('src/main.js evaluates cleanly and registers the Drive globals', async () => {
    const env = await booted();
    const win = env.windowStub;
    for (const fn of ['quickGoogleDriveBackup', 'backupToGoogleDriveNow', 'listGoogleDriveBackups',
        'restoreDirectFromGoogleDrive', 'triggerGoogleDriveAutoSync', 'buildFullBackupState',
        'getValidGDriveToken']) {
        assert.equal(typeof win[fn], 'function', `${fn} was not registered on window`);
    }
});

test('manual backup sends a well-formed multipart upload to Drive v3', async () => {
    const env = await booted();
    env.signIn();

    await env.windowStub.backupToGoogleDriveNow();

    const upload = findUpload(env);
    assert.ok(upload, 'no Drive upload request was made');
    assert.equal(upload.method, 'POST');
    assert.match(upload.url, /uploadType=multipart/);
    assert.match(upload.url, /fields=id,name/);
    assert.equal(upload.headers.authorization, 'Bearer ya29.fake-token');

    const boundary = upload.headers['content-type'].split('boundary=')[1];
    const parts = parseMultipart(await bodyText(upload.body), boundary);
    assert.equal(parts.length, 2, 'expected exactly 2 parts (metadata + content)');

    const metadata = JSON.parse(parts[0].content);
    assert.match(metadata.name, /^OmegaGym_Backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/);
    assert.equal(metadata.mimeType, 'application/json');

    const payload = JSON.parse(parts[1].content);
    assert.equal(payload.version, '3.0');
    assert.ok(payload.exportedAt, 'payload has no exportedAt');
    assert.ok(payload.state && typeof payload.state === 'object', 'payload has no state object');
});

test('manual backup records the uploaded file in gdriveSettings', async () => {
    const env = await booted();
    env.signIn();

    await env.windowStub.backupToGoogleDriveNow();

    const settings = env.windowStub.appState?.gdriveSettings;
    assert.ok(settings, 'gdriveSettings was not initialised');
    assert.equal(settings.lastFileId, 'fake-file-id');
    assert.ok(settings.lastSyncTime, 'lastSyncTime was not recorded');
});

test('manual backup filenames are found by the backups-list filter', async () => {
    const env = await booted();
    env.signIn();

    await env.windowStub.listGoogleDriveBackups();
    const needles = listQueryNeedles(env.fetchCalls);

    const manualName = 'OmegaGym_Backup_2026-10-10_14-05.json';
    assert.ok(isListed(manualName, needles),
        `"${manualName}" matches none of the list filters ${JSON.stringify(needles)}`);
});

// Boots with a short auto-sync debounce so the suite does not sleep 30 s.
async function bootedFast() {
    const env = createEnv({ autoSyncDebounceMs: 5 });
    const { evaluationError } = await loadMain(env);
    assert.equal(evaluationError, null, evaluationError ? evaluationError.message : '');
    return env;
}

async function runAutoSync(env) {
    env.signIn();
    env.windowStub.appState.gdriveSettings = { autoSync: true };
    env.windowStub.triggerGoogleDriveAutoSync();
    await env.flushAutoSync();
    return findUpload(env);
}

async function autoBackupPayload(upload) {
    const boundary = upload.headers['content-type'].split('boundary=')[1];
    const parts = parseMultipart(await bodyText(upload.body), boundary);
    return { metadata: JSON.parse(parts[0].content), payload: JSON.parse(parts[1].content) };
}

test('auto-sync filenames are found by the backups-list filter', async () => {
    const env = await bootedFast();
    const upload = await runAutoSync(env);

    assert.ok(upload, 'auto-sync never uploaded anything');
    assert.match(upload.url, /uploadType=multipart/, 'auto-sync should reuse the Drive v3 uploader');
    const { metadata } = await autoBackupPayload(upload);
    assert.match(metadata.name, /^OmegaGym_AutoBackup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.json$/);

    env.fetchCalls.length = 0;
    await env.windowStub.listGoogleDriveBackups();
    const needles = listQueryNeedles(env.fetchCalls);

    assert.ok(isListed(metadata.name, needles),
        `auto-sync file "${metadata.name}" matches none of the list filters ` +
        `${JSON.stringify(needles)} — it uploads to Drive but never appears in the restore list`);
});

test('auto-sync uploads the COMPLETE state read from Firebase, not the in-memory window', async () => {
    const env = await bootedFast();
    const win = env.windowStub;

    // Only Firebase holds these rows; the in-memory appState has not loaded them.
    env.firebase.data['v2/products'] = { abc123: { name: 'منتج من فايربيس', cost: 10, price: 20 } };
    win.appState.products = [];

    const upload = await runAutoSync(env);
    assert.ok(upload, 'auto-sync never uploaded anything');

    const { payload } = await autoBackupPayload(upload);
    assert.equal(payload.autoBackup, true, 'auto backups should be marked');
    assert.deepEqual(payload.state.products,
        [{ name: 'منتج من فايربيس', cost: 10, price: 20, id: 'abc123', _rtdbKey: 'abc123' }],
        'the auto backup must contain the Firebase rows, not just what is loaded in memory');
});

test('auto-sync reports a failed upload in the UI instead of failing silently', async () => {
    const env = await bootedFast();
    env.net.uploadStatus = 403; // out of Drive space / no permission

    const upload = await runAutoSync(env);
    assert.ok(upload, 'the upload was never attempted');

    const status = env.windowStub.appState.gdriveSettings.lastSyncStatus;
    assert.match(String(status), /فشل الحفظ التلقائي/,
        `a failed auto backup must be surfaced to the user, got: ${status}`);
    assert.ok(!env.windowStub.appState.gdriveSettings.lastSyncTime,
        'a failed auto backup must not record a successful sync time');
});

test('auto-sync never calls saveState, which would reschedule it forever', async () => {
    const env = await bootedFast();
    const win = env.windowStub;

    // saveState() calls triggerGoogleDriveAutoSync(); if the sync callback ever
    // persisted state it would re-arm its own 30 s timer in a loop.
    const original = win.triggerGoogleDriveAutoSync;
    let reschedules = 0;
    win.triggerGoogleDriveAutoSync = () => { reschedules += 1; };

    try {
        env.signIn();
        win.appState.gdriveSettings = { autoSync: true };
        original();
        await env.flushAutoSync();
    } finally {
        win.triggerGoogleDriveAutoSync = original;
    }

    assert.ok(findUpload(env), 'the auto backup did not run, so this test proves nothing');
    assert.equal(reschedules, 0, 'auto-sync re-armed itself — it would loop forever');
});
