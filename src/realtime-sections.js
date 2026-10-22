// Share the first realtime snapshot with startup and navigation. A slow snapshot
// is not a reason to download the same collection again over REST.
export function createRealtimeSections({ subscribe, readLegacy, apply, onReady = () => {}, onError = () => {} }) {
  const entries = new Map();
  function load(name) {
    if (entries.has(name)) return entries.get(name).promise;
    let resolve, reject;
    const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
    const entry = { promise, unsubscribe: null, revision: 0, settled: false, legacy: null, closed: false };
    entries.set(name, entry);
    // A listener can fail before a screen starts awaiting its first snapshot.
    promise.catch(() => {});
    const fail = (error) => {
      if (entry.closed) return;
      entry.closed = true;
      entry.unsubscribe?.();
      entries.delete(name);
      if (!entry.settled) reject(error);
      onError(name, error);
    };
    try {
      entry.unsubscribe = subscribe(name, async (data) => {
        const revision = ++entry.revision;
        try {
          // Only the initial absent v2 snapshot may consult legacy storage.
          // Never overlay a newer v2 event with a slower legacy response.
          if (!entry.settled && data == null && readLegacy) {
            entry.legacy ||= Promise.resolve().then(() => readLegacy(name));
            data = await entry.legacy;
          }
          if (entry.closed || revision !== entry.revision) return;
          await apply(name, data);
          if (entry.closed) return;
          onReady(name);
          if (!entry.settled) {
            entry.settled = true;
            resolve();
          }
        } catch (error) {
          if (revision === entry.revision) fail(error);
        }
      }, fail);
      // Also handle test/adaptor subscriptions which fail synchronously.
      if (entry.closed) entry.unsubscribe?.();
    } catch (error) { fail(error); }
    return promise;
  }
  return { load, has: name => entries.has(name) };
}

// Successful empty reads are different from network errors. Legacy is read
// only for a genuinely absent v2 node, never to mask a failed request.
export async function readSectionWithLegacy(read, primary, legacy) {
  const data = await read(primary);
  return data == null && legacy ? read(legacy) : data;
}
