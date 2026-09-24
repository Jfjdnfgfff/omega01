import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyATQdkTAABcNa5PDSG2KUHlqJ2iJcMFpe8",
  authDomain: "omega-a7040.firebaseapp.com",
  databaseURL: "https://omega-a7040-default-rtdb.firebaseio.com",
  projectId: "omega-a7040"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

function cleanKey(raw) {
  if (!raw && raw !== 0) return 'item_' + Math.random().toString(36).substring(2, 9);
  return String(raw).replace(/[.#$[\]/]/g, '_');
}

function sanitizeObject(obj) {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeObject);
  const clean = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = sanitizeObject(v);
    }
  }
  return clean;
}

const sectionMappings = [
  { root: 'products', v2: 'products', idField: 'id', altId: 'barcode' },
  { root: 'customers', v2: 'customers', idField: 'id', altId: 'phone' },
  { root: 'sales', v2: 'sales', idField: 'id' },
  { root: 'expenses', v2: 'expenses', idField: 'id' },
  { root: 'credits', v2: 'credits', idField: 'id' },
  { root: 'caisseLogs', v2: 'caisse', idField: 'id' },
  { root: 'coachAbsences', v2: 'coachAbsences', idField: 'id' },
  { root: 'packages', v2: 'packages', idField: 'id' },
  { root: 'suppliers', v2: 'suppliers', idField: 'id' },
  { root: 'staffPayouts', v2: 'staffPayouts', idField: 'id' },
  { root: 'supplierTransactions', v2: 'supplierTransactions', idField: 'id' }
];

async function syncAll() {
  console.log('Starting full bi-directional sync for omega-a7040-default-rtdb...');
  const baseUrl = firebaseConfig.databaseURL;

  for (const { root, v2, idField, altId } of sectionMappings) {
    console.log(`Syncing ${root} <-> v2/${v2}...`);
    const [rootSnap, v2Snap] = await Promise.all([
      fetch(`${baseUrl}/${root}.json`).then(r => r.json()).catch(() => null),
      fetch(`${baseUrl}/v2/${v2}.json`).then(r => r.json()).catch(() => null)
    ]);

    const rootMap = new Map();
    const v2Map = new Map();

    const addItemsToMap = (data, map) => {
      if (!data) return;
      if (Array.isArray(data)) {
        data.forEach((item, idx) => {
          if (item && typeof item === 'object') {
            const key = cleanKey(item[idField] || (altId ? item[altId] : null) || idx);
            map.set(key, item);
          }
        });
      } else if (typeof data === 'object') {
        Object.entries(data).forEach(([k, item]) => {
          if (item && typeof item === 'object') {
            const key = cleanKey(item[idField] || (altId ? item[altId] : null) || k);
            map.set(key, item);
          }
        });
      }
    };

    addItemsToMap(rootSnap, rootMap);
    addItemsToMap(v2Snap, v2Map);

    const merged = new Map();
    // Root items first
    for (const [k, v] of rootMap.entries()) merged.set(k, v);
    // Overlay V2 items (which may have newer modifications)
    for (const [k, v] of v2Map.entries()) merged.set(k, v);

    console.log(`  Combined total items for ${root}: ${merged.size}`);

    // Batch update into both root and v2
    const batchUpdates = {};
    for (const [k, v] of merged.entries()) {
      const cleanItem = sanitizeObject(v);
      batchUpdates[`${root}/${k}`] = cleanItem;
      batchUpdates[`v2/${v2}/${k}`] = cleanItem;
      if (root === 'products' && cleanItem && cleanItem.barcode) {
        batchUpdates[`v2/productByBarcode/${cleanKey(cleanItem.barcode)}`] = k;
      }
      if (root === 'customers' && cleanItem) {
        if (cleanItem.phone) {
          const norm = String(cleanItem.phone).replace(/\D/g, '');
          if (norm) batchUpdates[`v2/customerByPhone/${norm}`] = k;
        }
        if (cleanItem.barcode) {
          batchUpdates[`v2/customerByBarcode/${cleanKey(cleanItem.barcode)}`] = k;
        }
      }
    }

    if (Object.keys(batchUpdates).length > 0) {
      // Chunk updates in batches of 200 to prevent payload limits
      const entries = Object.entries(batchUpdates);
      for (let i = 0; i < entries.length; i += 200) {
        const chunk = Object.fromEntries(entries.slice(i, i + 200));
        await update(ref(db), chunk);
      }
      console.log(`  Synced ${entries.length / 2} items to both ${root} and v2/${v2}`);
    }
  }

  // Health ping
  await update(ref(db), {
    'lastUpdated': new Date().toISOString(),
    'v2/meta/health': {
      status: 'healthy',
      lastSync: new Date().toISOString(),
      rtdb: 'omega-a7040-default-rtdb'
    }
  });

  console.log('Bi-directional synchronization complete!');
  process.exit(0);
}

syncAll().catch(err => {
  console.error('Sync failed:', err);
  process.exit(1);
});
