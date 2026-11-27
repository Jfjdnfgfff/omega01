# Performance work — 2026-11-27

Status: **Step 0 (baseline) complete. Phase 1 implemented at 0.3 scale (partial, see below). Phases 2–9 not started.**

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


---

## Phase 1 — images out of the customer record

### What changed
- **`src/image-store.js`** (new, pure): `splitRecordImage` (write side), `resolveImageSrc` (read side), `LruCache` (size-bounded), `planSectionMigration` (migration), `hashImage` (version tag).
- **Storage shape:** `v2/customerImages/{id} = {data, version, updatedAt}`. The record keeps `imageRef` and `imageVersion` and no longer carries `imageUrl`.
- **Write semantics (explicit, so an unrelated save cannot delete a picture):**
  - `imageUrl` absent → keep the existing image.
  - `imageUrl` null or `''` → remove the image.
  - `imageUrl` string → store it and set a new `imageVersion`.
- **`saveFirebaseSectionItem`** (customers): writes the image node and the stripped record in one multi-path update. The single-PUT fallback also writes the image node. A queued retry re-splits from the original data.
- **`deleteFirebaseSectionItem`** (customers): deletes `v2/customerImages/{id}` with the customer.
- **Read side:** avatars for split records are queued during render. An `IntersectionObserver` (300px margin) loads each image once, when its card is near the viewport, through `firebaseGet`. Loaded images go into an 8 MB LRU cache. A version mismatch is never shown. Legacy inline images still render first.
- **Rendering:** the avatar `<img src="${…}">` interpolation is the same expression as before, with the source resolved from the record or the cache. No `escapeHTML` change, no new insertion method. Placeholder `data-split-index` is a number only.
- **Edit and renewal modals:** an untouched save keeps the stored picture. The "remove" button sets an explicit `cleared` flag. Uploading a new picture replaces it.
- **Flag:** `window.OMEGA_LEGACY_INLINE_IMAGES = true` restores the old inline write.
- **Migration script `scripts/migrate-images.js`:** works only on a local JSON export. Dry-run is the default and prints counts, sizes, and the expected saving. `--apply --output` writes a new file and never overwrites the input. Progress is checkpointed per batch; `--resume` continues from the checkpoint; a single timestamp in the checkpoint makes resumed output identical to a full run (verified). `--verify` checks counts, that no inline images remain, and that each version matches its data.

### Tests
- `tests/image-store.test.js`: 12 unit tests (split keep/remove/replace, version change, dual read, LRU eviction and size limit, migration plan, idempotent re-run, resume).
- `tests/image-split.check.mjs` (opt-in, Chromium): nothing is requested at boot; off-screen images are not requested; after scrolling, each split image is requested once and shows its own customer's picture; legacy inline images still render; the real `saveFirebaseSectionItem` and `deleteFirebaseSectionItem` send the right payloads (new image split out, unrelated save keeps it, removal deletes it, delete removes it).
- Full suite: `npm test` 223 pass (211 existing + 12 new), `npm run lint`, `npm run build`, `npm run test:ui` pass. The six UI suites skip because `jsdom` is not installed (pre-existing).

### Measured (0.3 scale, same machine, same session)

| Metric | Old code, inline | New code, inline | New code, split |
|---|---|---|---|
| Initial data | 45.73 MB | 45.73 MB | **16.33 MB (−64%)** |
| Data visible, cold | 4.94–5.11 s | 5.47–5.56 s | 5.03–5.14 s |
| Live single-record update | 782–793 ms | 722–796 ms | **455–477 ms (−40%)** |
| Worst search keystroke | 19–32 ms | 19–20 ms | 14–17 ms |
| Longest main-thread task | 306–329 ms | 329–383 ms | 235–272 ms |
| JS heap after load | 52.9–55.4 MB | 52.9 MB | 53.1 MB (not comparable, see limits) |

Raw data: `docs/perf-phase1.json`. Machine note: the live-update baseline measured earlier in this session (164–369 ms) was on a different sandbox. On this machine the old code measures 782–793 ms, so all comparisons above are within this session only.

### Budget status after Phase 1
- Initial data < 20% of current: **not met** (35.6% of current). Remaining weight is sales, caisse, and expenses, which is Phase 2.
- Live single-record update < 30 ms: **not met** (455 ms). The remaining cost is the full-section re-process (Phase 3).
- Heap < 50% of current: **not measured reliably** (see limits).

### Limits and gaps (Phase 1)
- **Heap:** the test fixture holds the whole synthetic dataset (including the images) in memory, so the heap figure cannot show the app's own saving. A clean number needs the fixture to release that data.
- **Not split:** products. The product edit form uses the same keep-or-replace logic, which needs the same care before products can move. Product images still inline.
- **Not done:** a separate IndexedDB store for images; the local record cache still holds inline images from memory. Optional ≤1 KB blurred placeholder. Optional idle-time background migration (legacy records move to the new node when they are next saved; a full migration needs the script).
- **Legacy `customers/` node:** the copy written by the app is also stripped when split is on, so an old client that reads the legacy fallback would see no picture.
- **Rollback caveat:** an older app version reading `v2/customers` shows no avatars for split records. Its image node still exists, so turning the flag back on restores the pictures.
- **Production:** nothing has been uploaded. The migration works on an export file you provide. Review `--verify` output before any upload.
- **Security:** `database.rules.json` and `firestore.rules` are unchanged. The root `.read`/`.write` rules already cover `v2/customerImages`, and no index is needed. No authentication, escaping, or financial formula changed.
- **Browser check scope:** the write and read paths are covered by the opt-in Chromium check. The edit modal's UI interactions (open, upload, remove, save) are not covered by an automated test; they were reviewed by reading the code, not run.
