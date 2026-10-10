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

    const upload = env.xhrCalls.find((c) => c.url.includes('/upload/drive/v3/files'));
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

test('auto-sync filenames are found by the backups-list filter', async () => {
    const env = await booted();
    env.signIn();
    env.windowStub.appState.gdriveSettings = { autoSync: true };

    env.windowStub.triggerGoogleDriveAutoSync();
    // The shipped implementation debounces the upload by 30 s.
    await new Promise((r) => setTimeout(r, 30_200));

    const upload = env.fetchCalls.find((c) => c.url.includes('/upload/drive/v3/files'));
    assert.ok(upload, 'auto-sync never uploaded anything');
    const autoName = (await bodyText(upload.init.body)).match(/"name"\s*:\s*"(OmegaGym_[^"]+)"/)[1];
    assert.match(autoName, /^OmegaGym_AutoBackup_/, 'unexpected auto-sync filename');

    env.fetchCalls.length = 0;
    await env.windowStub.listGoogleDriveBackups();
    const needles = listQueryNeedles(env.fetchCalls);

    assert.ok(isListed(autoName, needles),
        `auto-sync file "${autoName}" matches none of the list filters ` +
        `${JSON.stringify(needles)} — it uploads to Drive but never appears in the restore list`);
});
