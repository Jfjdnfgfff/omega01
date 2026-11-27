# Performance work — 2026-11-27

Status: **Step 0 (baseline) complete. Phases 1–9 not started.**

## What was measured

Harness: `tests/perf-baseline.check.mjs` (run with `npm run perf:baseline`, requires `puppeteer-core` and a Chrome binary, see the file header).
Data: `scripts/perf-dataset.js`, synthetic and deterministic (seeded). No real Firebase is read or written; the Firebase SDK is the test fixture.

**Scale used: 0.3 of the full spec** (1500 customers, 600 products with WebP images, 15,000 sales, 6,000 caisse rows, 3,000 expenses; 48.8 MB JSON).

The full spec (5000 customers, 2000 products, 50k sales, 20k caisse, 10k expenses, 163 MB) cannot run in this sandbox: headless Chromium here dies while parsing a single JSON payload of about 120 MB (verified: 60 MB works, 120 MB crashes). The full-spec numbers therefore need a machine with more memory or a streamed/paged fixture, which is a follow-up.

Environment: headless Chromium 158, CPU ×4 throttling, service worker bypassed (`src/main.js` reloads the page after SW install, which breaks single-navigation measurement; this reload is itself a startup cost for Phase 9).

## Baseline (before any change)

Three runs of the same code and dataset. Ranges are min–max.

| Metric | Baseline (3 runs) | Budget | Status |
|---|---|---|---|
| Initial data bytes (paths requested at boot) | 45.73 MB (exact, synthetic) | < 20% of current | to be measured after Phase 2 |
| Data visible, cold cache | 5.11–5.33 s | — | — |
| Data visible, local-cache (IndexedDB) warm start | 6.05–6.26 s | < 800 ms | **not met** (warm is slower than cold) |
| Longest main-thread task (after fixture parse) | 334–420 ms | < 50 ms | **not met** |
| Tasks > 50 ms during load | 8–9 | 0 | **not met** |
| JS heap after load (forced GC) | 52.9 MB | < 50% of this | to be measured after Phase 1 |
| DOM nodes after load (dashboard) | 3,741 | < 1,500 (customers screen) | **not met** (measured on dashboard, not the customers screen) |
| Live update, single customer record | 164–369 ms | < 30 ms | **not met** |
| Search, worst keystroke (4 chars) | 353–502 ms | debounce + index | **not met** |
| Initial JS (entry chunk, gzip) | 136.3 KB | < 80 KB | **not met** |
| CLS | 0.0166 | — | — |
| First contentful paint | 264 ms | — | — |

Raw data: `docs/perf-baseline.json` (`repeatRuns` holds all three runs).

Observations from the baseline:
- The warm (IndexedDB) start is no faster than cold. The local cache is not providing the head-start the design intends. This is a direct target for Phase 6.
- A single customer update takes ~170–370 ms because the whole section is re-processed. This matches the Phase 3 diagnosis.
- Search has a large first-keystroke cost and a 350–500 ms spike, with no debounce.
- Entry JS is 136 KB gzip, far above the 80 KB budget. Phase 7 is the lever.

## Not measured, and why

- **Per-section `applySectionSnapshot` timings.** The function is closed over inside `src/main.js`. Hooking it would mean changing app code during the baseline. The long-task list identifies the slow sections indirectly.
- **Real network transfer time.** The fixture SDK never touches the network, so network throttling does not apply. The byte counts are exact; a transfer-time estimate at 4G (1.6 Mbps) for the baseline is about 240 s for 45.7 MB.
- **Full-spec scale (163 MB).** Blocked by this sandbox's renderer memory (see above).
- **Customers-screen DOM count.** Measured on the dashboard, where `#customersGrid` lives. The customers screen is a separate view.

## Existing checks, unchanged by this work

- `npm test`: 211 pass, 0 fail.
- `npm run lint`, `npm run build`, `npm run test:ui`: pass. Three UI checks are skipped because `jsdom` is not installed (existing behavior).
- `tests/startup-browser.check.mjs` (opt-in browser check) **already fails at HEAD** before this work: assertion on `#fullReportContent` containing a fixture product name. Not investigated in this step; left as-is.

## Changes in this step

- `scripts/perf-dataset.js` (new): synthetic dataset generator (`PERF_SCALE` for smaller runs).
- `tests/perf-baseline.check.mjs` (new): the baseline harness.
- `tests/fixtures/firebase-sdk.js`: test-only additions. When `window.__perfDatasetUrl` is set, it loads a synthetic dataset. It also records requested paths and the fixture's parse time. Default behavior is unchanged.
- `package.json`: `perf:dataset` and `perf:baseline` scripts.
- `docs/perf-baseline.json`, this file.

No security rules, authentication, escaping, or financial formula was touched.

## Next

Phase 1 (move images out of customer/product records) is the first behavior-changing step. It needs a reviewed plan and a migration script before code changes, because it changes stored data shape. Proceed when you confirm.
