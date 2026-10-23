import test from 'node:test';
import assert from 'node:assert/strict';
import { createReportPageRanges, REPORT_IMAGE_PAGE_HEIGHT_CSS } from '../src/report-image-pagination.js';

const coveredRows = ranges => ranges.map(({ top, height }) => [top, top + height]);

test('a tall report is split into non-overlapping page-sized image ranges', () => {
    const ranges = createReportPageRanges(4200, 1500);
    assert.deepEqual(coveredRows(ranges), [[0, 1500], [1500, 3000], [3000, 4200]]);
    assert.equal(ranges.reduce((total, range) => total + range.height, 0), 4200);
});

test('page boundaries snap to nearby row or section edges', () => {
    const ranges = createReportPageRanges(4500, 1500, [1450, 1600, 2950, 3100, 4100]);
    assert.deepEqual(coveredRows(ranges), [[0, 1450], [1450, 2950], [2950, 4100], [4100, 4500]]);
});

test('a single-page report produces one image and a tiny section does not cause a short page', () => {
    assert.deepEqual(createReportPageRanges(900, 1500), [{ top: 0, height: 900 }]);
    assert.deepEqual(createReportPageRanges(3200, 1500, [200]), [
        { top: 0, height: 1500 },
        { top: 1500, height: 1500 },
        { top: 3000, height: 200 }
    ]);
});

test('page ranges handle invalid dimensions and retain an A4-like portrait default', () => {
    assert.deepEqual(createReportPageRanges(0, 100), []);
    assert.deepEqual(createReportPageRanges(-10, 100), []);
    assert.equal(REPORT_IMAGE_PAGE_HEIGHT_CSS, 1485);
    const ranges = createReportPageRanges(100, 0);
    assert.deepEqual(ranges, [{ top: 0, height: 100 }]);
});
