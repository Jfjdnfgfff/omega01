// Migration and Legacy Utilities - Isolated from Daily CRUD Operations

export async function updateFirebaseSection(sectionPath, sectionData) {
  if (!sectionData) return false;
  const items = Array.isArray(sectionData) ? sectionData : (typeof sectionData === 'object' ? Object.values(sectionData) : []);
  const v2Sec = sectionPath === 'caisseLogs' ? 'caisse' : sectionPath;
  const v2Updates = {};
  items.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const rawId = item.id || item.barcode;
    if (rawId) {
      const cleanId = String(rawId).replace(/[.#$/[\]]/g, '_');
      v2Updates[`v2/${v2Sec}/${cleanId}`] = item;
    }
  });
  if (Object.keys(v2Updates).length === 0) return true;

  let sdkOk = false;
  if (window.firebaseDB && window.firebaseUpdate && window.firebaseRef) {
    try {
      await window.firebaseUpdate(window.firebaseRef(window.firebaseDB), v2Updates);
      sdkOk = true;
    } catch (e) {
      console.warn(`SDK updateFirebaseSection error on v2/${v2Sec}:`, e);
    }
  }
  if (!sdkOk) {
    try {
      const baseUrl = typeof window.getRTDBUrl === 'function' ? window.getRTDBUrl() : '';
      const v2RelUpdates = {};
      Object.keys(v2Updates).forEach(k => {
        v2RelUpdates[k.replace(/^v2\//, '')] = v2Updates[k];
      });
      const res = await fetch(`${baseUrl}/v2.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(v2RelUpdates)
      });
      return res.ok;
    } catch (e) {
      return false;
    }
  }
  return true;
}
window.updateFirebaseSection = updateFirebaseSection;
