import test from 'node:test';
import assert from 'node:assert/strict';
import { unzipSync } from 'fflate';
import { createReportPagesArchive } from '../src/report-image-archive.js';

test('bulk download archive contains each PNG as a separate unchanged file', async () => {
    const pageOne = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
    const pageTwo = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 4, 5, 6]);
    const archive = await createReportPagesArchive([
        { filename: 'report_page_01.png', blob: new Blob([pageOne], { type: 'image/png' }) },
        { filename: 'report_page_02.png', blob: new Blob([pageTwo], { type: 'image/png' }) }
    ]);

    assert.equal(archive.type, 'application/zip');
    const files = unzipSync(new Uint8Array(await archive.arrayBuffer()));
    assert.deepEqual(Object.keys(files).sort(), ['report_page_01.png', 'report_page_02.png']);
    assert.deepEqual(files['report_page_01.png'], pageOne);
    assert.deepEqual(files['report_page_02.png'], pageTwo);
});

test('bulk archive can include a PNG resource represented by a URL', async () => {
    const imageBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 7, 8, 9]);
    const url = `data:image/png;base64,${Buffer.from(imageBytes).toString('base64')}`;
    const archive = await createReportPagesArchive([{ filename: 'from-url.png', url }]);
    const files = unzipSync(new Uint8Array(await archive.arrayBuffer()));
    assert.deepEqual(files['from-url.png'], imageBytes);
});

test('an empty bulk archive is rejected instead of creating a misleading download', async () => {
    await assert.rejects(createReportPagesArchive([]), /No report pages to archive/);
});
