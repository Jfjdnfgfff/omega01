// Synthetic, deterministic performance dataset. NO real data is read or written.
// Usage: node scripts/perf-dataset.js [outFile=.cache/perf/dataset.json]
// Sizes: 5000 customers (WebP base64 ~15-25KB each), 2000 products with images,
// 50000 sales, 20000 caisse movements, 10000 expenses.
import { mkdirSync, writeFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

// PERF_SCALE scales every count (1 = full spec). Use <1 where the browser cannot hold the payload.
const SCALE = Number(process.env.PERF_SCALE || 1);
export const FULL_SIZES = { customers: 5000, products: 2000, sales: 50000, caisse: 20000, expenses: 10000 };
export const SIZES = Object.fromEntries(Object.entries(FULL_SIZES).map(([k, v]) => [k, Math.max(1, Math.round(v * SCALE))]));
const IMAGE_POOL = 40; // unique WebP images reused across records (each record still carries its own copy)

function prng(seed) {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

async function buildImagePool(rand) {
  const pool = [];
  for (let i = 0; i < IMAGE_POOL; i++) {
    const size = 160;
    const raw = Buffer.alloc(size * size * 3);
    for (let p = 0; p < raw.length; p++) raw[p] = (rand() * 255) | 0;
    const webp = await sharp(raw, { raw: { width: size, height: size, channels: 3 } })
      .webp({ quality: 65 }).toBuffer();
    pool.push(`data:image/webp;base64,${webp.toString('base64')}`);
  }
  return pool;
}

const pick = (arr, rand) => arr[(rand() * arr.length) | 0];
const DAY = 86400000;
const BASE = Date.UTC(2026, 0, 1);
const isoDate = t => new Date(t).toISOString().slice(0, 10);

export async function generateDataset() {
  const rand = prng(20261127);
  const images = await buildImagePool(rand);
  const names = ['أحمد', 'محمد', 'يوسف', 'كريم', 'ياسين', 'أمين', 'سمير', 'رياض', 'فاطمة', 'سارة', 'نور', 'ليلى'];
  const fam = ['بوعلام', 'بن علي', 'حاج', 'بلقاسم', 'زيتوني', 'سعيدي', 'مرابط', 'قادري'];
  const packages = { p1: { id: 'p1', name: 'شهري', price: 3000, durationDays: 30 }, p2: { id: 'p2', name: 'ثلاثي', price: 8000, durationDays: 90 }, p3: { id: 'p3', name: 'سنوي', price: 28000, durationDays: 365 } };
  const pkgIds = Object.keys(packages);

  const customers = {};
  for (let i = 0; i < SIZES.customers; i++) {
    const id = `c${i}`;
    const start = BASE + ((rand() * 330) | 0) * DAY;
    const pkg = packages[pick(pkgIds, rand)];
    customers[id] = {
      id, name: `${pick(names, rand)} ${pick(fam, rand)} ${i}`,
      phone: `0555${String(i).padStart(6, '0')}`, barcode: `CU${String(i).padStart(7, '0')}`,
      packageId: pkg.id, price: pkg.price, paymentStatus: rand() < 0.8 ? 'paid' : 'partial',
      startDate: isoDate(start), endDate: isoDate(start + pkg.durationDays * DAY),
      createdAt: start, updatedAt: start + DAY,
      notes: 'ملاحظة طويلة تجريبية '.repeat(8),
      imageUrl: pick(images, rand),
    };
  }

  const products = {};
  const cats = ['مكملات', 'مشروبات', 'ملابس', 'أدوات'];
  for (let i = 0; i < SIZES.products; i++) {
    const id = `p${i}`;
    products[id] = {
      id, name: `منتج تجريبي ${i}`, barcode: `PR${String(i).padStart(6, '0')}`,
      category: pick(cats, rand), stockLocation: rand() < 0.5 ? 'main' : 'store',
      price: 100 + ((rand() * 2000) | 0), cost: 60 + ((rand() * 1000) | 0), stock: (rand() * 50) | 0,
      createdAt: BASE + i * 1000, updatedAt: BASE + i * 1000,
      imageUrl: pick(images, rand),
    };
  }

  const sales = {};
  for (let i = 0; i < SIZES.sales; i++) {
    const t = BASE + ((rand() * 330) | 0) * DAY + ((rand() * DAY) | 0);
    const price = 100 + ((rand() * 2000) | 0);
    sales[`s${i}`] = { id: `s${i}`, customerId: `c${(rand() * SIZES.customers) | 0}`, barcode: `PR${String((rand() * SIZES.products) | 0).padStart(6, '0')}`, prodName: `منتج ${i % 300}`, qty: 1 + ((rand() * 3) | 0), total: price, profit: (price * 0.35) | 0, paymentMethod: rand() < 0.5 ? 'cash' : 'card', date: isoDate(t), dateKey: isoDate(t), createdAt: t };
  }

  const caisse = {};
  for (let i = 0; i < SIZES.caisse; i++) {
    const t = BASE + ((rand() * 330) | 0) * DAY + ((rand() * DAY) | 0);
    caisse[`k${i}`] = { id: `k${i}`, type: rand() < 0.7 ? 'in' : 'out', amount: ((rand() * 5000) | 0), label: `حركة ${i}`, date: isoDate(t), dateKey: isoDate(t), createdAt: t };
  }

  const expenses = {};
  for (let i = 0; i < SIZES.expenses; i++) {
    const t = BASE + ((rand() * 330) | 0) * DAY;
    expenses[`e${i}`] = { id: `e${i}`, category: pick(cats, rand), amount: ((rand() * 9000) | 0), note: `مصروف ${i}`, date: isoDate(t), dateKey: isoDate(t), createdAt: t };
  }

  return {
    'v2/customers': customers,
    'v2/products': products,
    'v2/sales': sales,
    'v2/caisse': caisse,
    'v2/expenses': expenses,
    'v2/packages': packages,
    'v2/credits': {},
    'v2/staffPayouts': {},
    'v2/quickSessions': {},
    'v2/activityLogs': {},
    'v2/stats': { daily: {}, monthly: {}, yearly: {}, allTime: { sales: 0, profit: 0 } },
    'appState/hideFinances': false,
  };
}

const isMain = process.argv[1] && resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  const out = resolve(process.argv[2] || '.cache/perf/dataset.json');
  mkdirSync(dirname(out), { recursive: true });
  const data = await generateDataset();
  writeFileSync(out, JSON.stringify(data));
  console.log(JSON.stringify({ out, bytes: statSync(out).size, sizes: SIZES }, null, 2));
}
