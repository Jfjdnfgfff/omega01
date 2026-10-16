import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const mainJs = readFileSync(join(root, 'src/main.js'), 'utf8');

// Regression: picking a custom day in "سجل المبيعات" showed every day's sales.
// The date input had no id and no change handler, while renderSalesList() /
// setPosFilterToday() / clearPosFilterDate() all look up #posFilterDate — so
// the lookup returned null, the selected date was always '' and the
// `if (selDate)` filter in renderSalesList() never ran.
test('sales log date filter is wired to renderSalesList via #posFilterDate', () => {
    const dateInputs = [...html.matchAll(/<input[^>]*type="date"[^>]*>/g)].map(m => m[0]);
    const posFilter = dateInputs.filter(tag => tag.includes('id="posFilterDate"'));

    assert.equal(posFilter.length, 1, 'exactly one date input must carry id="posFilterDate"');
    assert.match(posFilter[0], /onchange="renderSalesList\(\)"/,
        '#posFilterDate must re-render the sales list when a day is picked');
});

test('no date input is left without an id for JS to read', () => {
    const dateInputs = [...html.matchAll(/<input[^>]*type="date"[^>]*>/g)].map(m => m[0]);
    const withoutId = dateInputs.filter(tag => !/\sid="/.test(tag));
    assert.deepEqual(withoutId, []);
});

test('renderSalesList and the اليوم/الكل buttons all use the same #posFilterDate', () => {
    // The اليوم (today) and الكل (clear) buttons set/clear the same input the list reads.
    assert.match(mainJs, /window\.setPosFilterToday = function\(\) \{\s*const input = document\.getElementById\('posFilterDate'\)/);
    assert.match(mainJs, /window\.clearPosFilterDate = function\(\) \{\s*const input = document\.getElementById\('posFilterDate'\)/);
    assert.match(mainJs, /const posFilterDateElem = document\.getElementById\('posFilterDate'\)/);
    // …and a non-empty selection actually narrows the list to that calendar day.
    assert.match(mainJs, /if \(selDate\) \{ filtered = filtered\.filter\(s => getLocalDateString\(s\.date\) === selDate\);\s*\}/);
});
