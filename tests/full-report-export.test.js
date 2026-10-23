import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fullReport = readFileSync(new URL('../src/full-report.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');

test('PNG export expands the report modal so all report sections are captured, not only the viewport', () => {
    assert.match(fullReport, /windowHeight:\s*Math\.max\(1280, estH \+ 128\)/);
    assert.match(fullReport, /clonedModalContent[\s\S]*?overflowY:\s*'visible'[\s\S]*?maxHeight:\s*'none'/);
    assert.match(fullReport, /clonedReport\.style\.overflow\s*=\s*'visible'/);
});

test('opening the comprehensive report waits for its data sections and complete sales history', () => {
    assert.match(main, /fullReportDataSections\s*=\s*\['customers', 'sales', 'expenses', 'suppliers', 'staffPayouts', 'packages'\]/);
    assert.match(main, /await Promise\.all\(fullReportDataSections\.map\(section => window\.lazyLoadSection\(section\)\)\)/);
    assert.match(main, /await window\.completeSalesHistorySilently\(\)/);
});

test('concurrent callers can await the active sales-history background load', () => {
    assert.match(main, /if \(salesHistoryCompletionPromise\) return salesHistoryCompletionPromise/);
    assert.match(main, /salesHistoryCompletionPromise = \(async \(\) =>/);
});
