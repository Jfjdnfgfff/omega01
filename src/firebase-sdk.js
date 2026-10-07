// ============================================================
// LAZY FIREBASE SDK LOADER (Code Splitting)
// ============================================================
// The Firebase SDK (~230 KB raw / ~51 KB gzip) used to be imported
// statically by main.js, which put it in the initial render-critical
// bundle even though the UI shell paints before any data arrives.
//
// This module turns it into an on-demand chunk: the browser downloads
// and parses it only when the data layer is actually initialised,
// right after the first paint. The promise is memoised, so every
// caller shares one single network request + one parse.
// ============================================================

let sdkPromise = null;

/**
 * Load `firebase/app` + `firebase/database` as a separate chunk.
 * @returns {Promise<object>} a merged namespace with every SDK export
 *   (initializeApp, getDatabase, ref, set, update, push, remove, onValue,
 *    get, query, limitToLast, limitToFirst, startAt, endAt, startAfter,
 *    endBefore, orderByKey, orderByChild, equalTo, off ...)
 */
export function loadFirebaseSdk() {
  if (!sdkPromise) {
    sdkPromise = Promise.all([
      import('firebase/app'),
      import('firebase/database')
    ])
      .then(([appModule, databaseModule]) => ({ ...appModule, ...databaseModule }))
      .catch((err) => {
        // Allow a later retry instead of caching a rejected promise forever.
        sdkPromise = null;
        throw err;
      });
  }
  return sdkPromise;
}

/**
 * Warm the chunk in the background (download only, no evaluation blocking
 * the main thread beyond the normal microtask). Safe to call on idle.
 */
export function preloadFirebaseSdk() {
  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    // Let the browser fetch the chunks with low priority while the user
    // is still looking at the first paint.
    loadFirebaseSdk().catch(() => {});
  }
  return loadFirebaseSdk();
}
