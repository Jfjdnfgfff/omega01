import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fullReport = readFileSync(new URL('../src/full-report.js', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

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

test('gallery previews whole PNG pages and its download-all action is one ZIP with separate images', () => {
    assert.match(fullReport, /imageFrame\.className = 'rounded-lg border border-slate-200 bg-slate-50'/);
    assert.match(fullReport, /downloadAllBtn\.onclick = \(\) => downloadReportPagesArchive\(pages, downloadAllBtn\)/);
    assert.match(fullReport, /const archiveDownloaded = await downloadReportPagesArchive\(pages\)/);
    assert.match(html, /تنزيل كل الصفحات في ملف ZIP \(صور PNG منفصلة\)/);
});
