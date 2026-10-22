// Used ONLY by the opt-in production browser check via Vite aliases.
// No real Firebase data is accessed or written.
const state = window.__firebaseTest = { subscriptions: [], gets: [], getQueries: [], writes: [], listeners: {} };
const fixtures = {
  'v2/stats': { daily: {}, monthly: {}, yearly: {}, allTime: { sales: 100, profit: 40 } },
  'appState/hideFinances': true,
  'v2/customers': Object.fromEntries(Array.from({ length: 500 }, (_, i) => [`c${i}`, {
    id: `c${i}`, name: `مشترك تجريبي ${i}`, phone: `0555${String(i).padStart(6, '0')}`,
    price: 1000, paymentStatus: 'paid', packageId: 'p1', startDate: '2026-10-01', endDate: '2026-11-01',
  }])),
  'v2/products': { product1: { id: 'product1', name: 'منتج تجريبي', price: 100, cost: 60, stock: 10 } },
  'v2/packages': { p1: { id: 'p1', name: 'اشتراك', price: 1000, durationDays: 30 } },
  'v2/sales': { s1: { id: 's1', prodName: 'منتج تجريبي', qty: 1, total: 100, profit: 40, date: '2026-10-22' } },
  'v2/activityLogs': { a1: { id: 'a1', type: 'system', title: 'سجل تجريبي', details: 'اختبار', timestamp: 1792627200000 } },
};
if (window.__firebaseTestLargeSales) {
  fixtures['v2/sales'] = Object.fromEntries(Array.from({ length: 3000 }, (_, i) => [String(i + 1), { id: String(i + 1), total: 1, date: '2026-10-22' }]));
}
export const initializeApp = config => {
  if (window.__firebaseTestFail) throw new Error('Simulated SDK failure');
  return { config };
};
export const getDatabase = () => ({});
export const ref = (db, path) => ({ path });
export const query = (target, ...constraints) => ({ ...target, constraints });
export const limitToLast = value => ({ limit: value });
export const limitToFirst = limitToLast;
export const orderByKey = () => ({});
export const orderByChild = orderByKey;
export const startAt = orderByKey, endAt = orderByKey, startAfter = orderByKey, equalTo = orderByKey;
export const endBefore = value => ({ before: value });
const snapshot = value => ({ exists: () => value != null, val: () => value });
export function onValue(target, callback, onError) {
  state.subscriptions.push(target.path);
  state.listeners[target.path] = value => callback(snapshot(value));
  const timer = setTimeout(() => {
    if (target.path === window.__firebaseTestFailSection) onError(new Error('Simulated section permission error'));
    else callback(snapshot(fixtures[target.path] ?? null));
  }, window.__firebaseTestDelay || 100);
  return () => { clearTimeout(timer); delete state.listeners[target.path]; };
}
export async function get(target) {
  state.gets.push(target.path); state.getQueries.push(target);
  if (target.constraints?.some(c => c.before)) return snapshot(null);
  return snapshot(fixtures[target.path] ?? null);
}
export async function set(target, data) { state.writes.push([target.path, data]); }
export const update = set, remove = set, push = set;
