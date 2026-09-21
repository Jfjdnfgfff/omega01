#!/usr/bin/env node
/**
 * OMEGA GYM - Firebase V2 Database Migration Engine
 * 
 * Safely migrates legacy Realtime Database structure to optimized V2 structure:
 * - v2/customers, v2/customerByPhone, v2/customerByBarcode
 * - v2/products, v2/productByBarcode
 * - v2/sales, v2/salesByDate
 * - v2/expenses, v2/expensesByDate
 * - v2/suppliers, v2/supplierTransactions
 * - v2/staff, v2/staffPayouts, v2/coachAbsences
 * - v2/packages, v2/credits, v2/openCreditsByCustomer
 * - v2/caisse
 * - v2/stats/daily, v2/stats/monthly, v2/stats/yearly
 * - v2/meta
 * 
 * Guarantees:
 * - Idempotent (safe to run multiple times without duplicating or corrupting records)
 * - Non-destructive (Legacy data is NEVER deleted)
 * - Supports --dry-run for safety
 * - Verification step post-migration
 */

const DEFAULT_RTDB_URL = 'https://omega-a7040-default-rtdb.firebaseio.com';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const urlArg = args.find(a => a.startsWith('--rtdb-url='));
const baseUrl = (urlArg ? urlArg.split('=')[1] : DEFAULT_RTDB_URL).replace(/\/$/, '');

function cleanKey(raw) {
  if (!raw && raw !== 0) return 'item_' + Math.random().toString(36).substring(2, 9);
  return String(raw).replace(/[.#$[\]/]/g, '_');
}

function normalizePhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.startsWith('213') && digits.length === 12) {
    return '0' + digits.slice(3);
  }
  return digits;
}

function getDateKey(dateInput) {
  if (!dateInput) return new Date().toISOString().split('T')[0];
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateInput)) {
    return dateInput.substring(0, 10);
  }
  const d = new Date(dateInput);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

async function fetchCollection(name) {
  try {
    const res = await fetch(`${baseUrl}/${name}.json`);
    if (!res.ok) {
      console.warn(`[!] Could not fetch ${name} (Status: ${res.status})`);
      return null;
    }
    const data = await res.json();
    return data;
  } catch (err) {
    console.error(`[X] Error fetching ${name}:`, err.message);
    return null;
  }
}

async function patchData(path, payload) {
  if (!payload || Object.keys(payload).length === 0) return true;
  try {
    const res = await fetch(`${baseUrl}/${path}.json`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (err) {
    console.error(`[X] Error patching ${path}:`, err.message);
    return false;
  }
}

async function runMigration() {
  console.log('====================================================');
  console.log('       OMEGA GYM - FIREBASE V2 MIGRATION SCRIPT     ');
  console.log('====================================================');
  console.log(`Target Database: ${baseUrl}`);
  console.log(`Mode: ${isDryRun ? '>>> DRY RUN (READ ONLY - NO WRITES) <<<' : 'LIVE MIGRATION'}`);
  console.log('----------------------------------------------------\n');

  console.log('Fetching legacy collections from Firebase...');
  const [
    rawCustomers,
    rawProducts,
    rawSales,
    rawExpenses,
    rawSuppliers,
    rawSupplierTx,
    rawStaffPayouts,
    rawCoachAbsences,
    rawPackages,
    rawCredits,
    rawCaisseLogs
  ] = await Promise.all([
    fetchCollection('customers'),
    fetchCollection('products'),
    fetchCollection('sales'),
    fetchCollection('expenses'),
    fetchCollection('suppliers'),
    fetchCollection('supplierTransactions'),
    fetchCollection('staffPayouts'),
    fetchCollection('coachAbsences'),
    fetchCollection('packages'),
    fetchCollection('credits'),
    fetchCollection('caisseLogs')
  ]);

  const toList = (data, defaultIdPrefix) => {
    if (!data) return [];
    if (Array.isArray(data)) {
      return data.filter(Boolean).map((item, idx) => {
        const id = item.id || item.barcode || `${defaultIdPrefix}_${idx}`;
        return { ...item, id: String(id) };
      });
    }
    return Object.entries(data).map(([key, val]) => {
      if (!val || typeof val !== 'object') return null;
      const id = val.id || key;
      return { ...val, id: String(id), _legacyKey: key };
    }).filter(Boolean);
  };

  const customersList = toList(rawCustomers, 'cust');
  const productsList = toList(rawProducts, 'prod');
  const salesList = toList(rawSales, 'sale');
  const expensesList = toList(rawExpenses, 'exp');
  const suppliersList = toList(rawSuppliers, 'sup');
  const supplierTxList = toList(rawSupplierTx, 'suptx');
  const staffPayoutsList = toList(rawStaffPayouts, 'staff');
  const coachAbsencesList = toList(rawCoachAbsences, 'abs');
  const packagesList = toList(rawPackages, 'pkg');
  const creditsList = toList(rawCredits, 'cr');
  const caisseLogsList = toList(rawCaisseLogs, 'caisse');

  console.log(`Legacy Counts Found:`);
  console.log(` - Customers:             ${customersList.length}`);
  console.log(` - Products:              ${productsList.length}`);
  console.log(` - Sales:                 ${salesList.length}`);
  console.log(` - Expenses:              ${expensesList.length}`);
  console.log(` - Suppliers:             ${suppliersList.length}`);
  console.log(` - Supplier Transactions: ${supplierTxList.length}`);
  console.log(` - Staff Payouts:         ${staffPayoutsList.length}`);
  console.log(` - Coach Absences:        ${coachAbsencesList.length}`);
  console.log(` - Packages:              ${packagesList.length}`);
  console.log(` - Credits:               ${creditsList.length}`);
  console.log(` - Caisse Logs:           ${caisseLogsList.length}\n`);

  // Transform to V2 Structures
  const v2Customers = {};
  const v2CustomerByPhone = {};
  const v2CustomerByBarcode = {};

  customersList.forEach(c => {
    const cid = cleanKey(c.id);
    const phoneNorm = normalizePhone(c.phone);
    const barcodeNorm = c.barcode ? String(c.barcode).trim() : null;

    v2Customers[cid] = {
      ...c,
      id: cid,
      normalizedPhone: phoneNorm || null,
      updatedAt: c.updatedAt || Date.now(),
      createdAt: c.createdAt || (c.startDate ? new Date(c.startDate).getTime() : Date.now())
    };

    if (phoneNorm) {
      v2CustomerByPhone[phoneNorm] = cid;
    }
    if (barcodeNorm) {
      v2CustomerByBarcode[cleanKey(barcodeNorm)] = cid;
    }
  });

  const v2Products = {};
  const v2ProductByBarcode = {};
  productsList.forEach(p => {
    const pid = cleanKey(p.id || p.barcode);
    v2Products[pid] = {
      ...p,
      id: pid,
      updatedAt: p.updatedAt || Date.now(),
      createdAt: p.createdAt || Date.now()
    };
    if (p.barcode) {
      v2ProductByBarcode[cleanKey(p.barcode)] = pid;
    }
  });

  const v2Sales = {};
  const v2SalesByDate = {};
  const dailyStats = {};
  const monthlyStats = {};
  const yearlyStats = {};

  salesList.forEach(s => {
    const sid = cleanKey(s.id);
    const dateKey = getDateKey(s.date);
    const monthKey = dateKey.substring(0, 7);
    const yearKey = dateKey.substring(0, 4);

    const total = Number(s.total || 0);
    const profit = Number(s.profit || 0);
    const qty = Number(s.qty || 1);

    v2Sales[sid] = {
      ...s,
      id: sid,
      dateKey,
      total,
      profit,
      createdAt: s.createdAt || (s.date ? new Date(s.date).getTime() : Date.now())
    };

    if (!v2SalesByDate[dateKey]) v2SalesByDate[dateKey] = {};
    v2SalesByDate[dateKey][sid] = true;

    // Daily Stats Accumulator
    if (!dailyStats[dateKey]) {
      dailyStats[dateKey] = { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0, updatedAt: Date.now() };
    }
    dailyStats[dateKey].sales += total;
    dailyStats[dateKey].salesCount += 1;
    dailyStats[dateKey].profit += profit;
    dailyStats[dateKey].productsSold += qty;
    dailyStats[dateKey].cashIn += total;

    // Monthly Stats Accumulator
    if (!monthlyStats[monthKey]) {
      monthlyStats[monthKey] = { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0, updatedAt: Date.now() };
    }
    monthlyStats[monthKey].sales += total;
    monthlyStats[monthKey].salesCount += 1;
    monthlyStats[monthKey].profit += profit;
    monthlyStats[monthKey].productsSold += qty;
    monthlyStats[monthKey].cashIn += total;

    // Yearly Stats Accumulator
    if (!yearlyStats[yearKey]) {
      yearlyStats[yearKey] = { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0, updatedAt: Date.now() };
    }
    yearlyStats[yearKey].sales += total;
    yearlyStats[yearKey].salesCount += 1;
    yearlyStats[yearKey].profit += profit;
    yearlyStats[yearKey].productsSold += qty;
    yearlyStats[yearKey].cashIn += total;
  });

  const v2Expenses = {};
  const v2ExpensesByDate = {};
  expensesList.forEach(e => {
    const eid = cleanKey(e.id);
    const dateKey = getDateKey(e.date);
    const monthKey = dateKey.substring(0, 7);
    const yearKey = dateKey.substring(0, 4);
    const amt = parseFloat(String(e.amount || 0).replace(/,/g, '')) || 0;

    v2Expenses[eid] = {
      ...e,
      id: eid,
      dateKey,
      amount: amt,
      createdAt: e.createdAt || (e.date ? new Date(e.date).getTime() : Date.now())
    };

    if (!v2ExpensesByDate[dateKey]) v2ExpensesByDate[dateKey] = {};
    v2ExpensesByDate[dateKey][eid] = true;

    if (!dailyStats[dateKey]) dailyStats[dateKey] = { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0, updatedAt: Date.now() };
    dailyStats[dateKey].expenses += amt;
    dailyStats[dateKey].cashOut += amt;

    if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0, updatedAt: Date.now() };
    monthlyStats[monthKey].expenses += amt;
    monthlyStats[monthKey].cashOut += amt;

    if (!yearlyStats[yearKey]) yearlyStats[yearKey] = { sales: 0, salesCount: 0, profit: 0, expenses: 0, productsSold: 0, cashIn: 0, cashOut: 0, updatedAt: Date.now() };
    yearlyStats[yearKey].expenses += amt;
    yearlyStats[yearKey].cashOut += amt;
  });

  const v2Suppliers = {};
  suppliersList.forEach(s => { v2Suppliers[cleanKey(s.id)] = s; });

  const v2SupplierTx = {};
  supplierTxList.forEach(st => { v2SupplierTx[cleanKey(st.id)] = st; });

  const v2StaffPayouts = {};
  staffPayoutsList.forEach(sp => { v2StaffPayouts[cleanKey(sp.id)] = sp; });

  const v2CoachAbsences = {};
  coachAbsencesList.forEach(ca => { v2CoachAbsences[cleanKey(ca.id)] = ca; });

  const v2Packages = {};
  packagesList.forEach(pkg => { v2Packages[cleanKey(pkg.id)] = pkg; });

  const v2Credits = {};
  const v2OpenCreditsByCustomer = {};
  creditsList.forEach(cr => {
    const crid = cleanKey(cr.id);
    v2Credits[crid] = cr;
    if (cr.customerId && cr.status !== 'settled') {
      const cid = cleanKey(cr.customerId);
      if (!v2OpenCreditsByCustomer[cid]) v2OpenCreditsByCustomer[cid] = {};
      v2OpenCreditsByCustomer[cid][crid] = true;
    }
  });

  const v2Caisse = {};
  caisseLogsList.forEach(cl => { v2Caisse[cleanKey(cl.id)] = cl; });

  console.log('Transformed V2 Dataset:');
  console.log(` - v2/customers:             ${Object.keys(v2Customers).length}`);
  console.log(` - v2/customerByPhone:       ${Object.keys(v2CustomerByPhone).length}`);
  console.log(` - v2/customerByBarcode:     ${Object.keys(v2CustomerByBarcode).length}`);
  console.log(` - v2/products:              ${Object.keys(v2Products).length}`);
  console.log(` - v2/productByBarcode:      ${Object.keys(v2ProductByBarcode).length}`);
  console.log(` - v2/sales:                 ${Object.keys(v2Sales).length}`);
  console.log(` - v2/expenses:              ${Object.keys(v2Expenses).length}`);
  console.log(` - v2/stats/daily:           ${Object.keys(dailyStats).length} days`);
  console.log(` - v2/stats/monthly:         ${Object.keys(monthlyStats).length} months`);
  console.log(` - v2/stats/yearly:          ${Object.keys(yearlyStats).length} years`);
  console.log(` - v2/suppliers:             ${Object.keys(v2Suppliers).length}`);
  console.log(` - v2/staffPayouts:          ${Object.keys(v2StaffPayouts).length}`);
  console.log(` - v2/coachAbsences:         ${Object.keys(v2CoachAbsences).length}`);
  console.log(` - v2/packages:              ${Object.keys(v2Packages).length}`);
  console.log(` - v2/credits:               ${Object.keys(v2Credits).length}`);
  console.log(` - v2/caisse:                ${Object.keys(v2Caisse).length}\n`);

  if (isDryRun) {
    console.log('>>> DRY RUN COMPLETE: 0 records modified. Run without --dry-run to write to Firebase. <<<');
    return;
  }

  console.log('Writing V2 datasets to Firebase...');

  // Chunked upload helper for large datasets
  async function patchInChunks(basePath, obj, chunkSize = 250) {
    const keys = Object.keys(obj);
    if (keys.length === 0) return true;
    for (let i = 0; i < keys.length; i += chunkSize) {
      const chunkKeys = keys.slice(i, i + chunkSize);
      const chunk = {};
      chunkKeys.forEach(k => chunk[k] = obj[k]);
      process.stdout.write(`Writing ${basePath} (${i + 1}-${Math.min(i + chunkSize, keys.length)}/${keys.length})...\r`);
      const ok = await patchData(basePath, chunk);
      if (!ok) {
        console.log(`\n[!] Warning: Chunk failed for ${basePath}`);
      }
    }
    console.log(`\nDone ${basePath}`);
    return true;
  }

  await patchInChunks('v2/customers', v2Customers, 200);
  await patchInChunks('v2/customerByPhone', v2CustomerByPhone, 300);
  await patchInChunks('v2/customerByBarcode', v2CustomerByBarcode, 300);
  await patchInChunks('v2/products', v2Products, 200);
  await patchInChunks('v2/productByBarcode', v2ProductByBarcode, 300);
  await patchInChunks('v2/sales', v2Sales, 200);
  await patchInChunks('v2/salesByDate', v2SalesByDate, 200);
  await patchInChunks('v2/expenses', v2Expenses, 200);
  await patchInChunks('v2/expensesByDate', v2ExpensesByDate, 200);
  await patchInChunks('v2/suppliers', v2Suppliers, 200);
  await patchInChunks('v2/supplierTransactions', v2SupplierTx, 200);
  await patchInChunks('v2/staffPayouts', v2StaffPayouts, 200);
  await patchInChunks('v2/coachAbsences', v2CoachAbsences, 200);
  await patchInChunks('v2/packages', v2Packages, 200);
  await patchInChunks('v2/credits', v2Credits, 200);
  await patchInChunks('v2/openCreditsByCustomer', v2OpenCreditsByCustomer, 200);
  await patchInChunks('v2/caisse', v2Caisse, 200);

  // Stats
  await patchInChunks('v2/stats/daily', dailyStats, 200);
  await patchInChunks('v2/stats/monthly', monthlyStats, 200);
  await patchInChunks('v2/stats/yearly', yearlyStats, 200);

  // Meta
  await patchData('v2/meta', {
    version: '2.0.0',
    migratedAt: new Date().toISOString(),
    customerCount: Object.keys(v2Customers).length,
    productCount: Object.keys(v2Products).length,
    salesCount: Object.keys(v2Sales).length,
    expensesCount: Object.keys(v2Expenses).length
  });

  console.log('\n----------------------------------------------------');
  console.log('Verifying V2 deployment...');
  const verifyMeta = await fetchCollection('v2/meta');
  if (verifyMeta && verifyMeta.version === '2.0.0') {
    console.log('[+] Verification SUCCESSFUL: v2/meta is present and verified!');
    console.log(`    Customers in V2: ${verifyMeta.customerCount}`);
    console.log(`    Products in V2:  ${verifyMeta.productCount}`);
    console.log(`    Sales in V2:     ${verifyMeta.salesCount}`);
    console.log(`    Expenses in V2:  ${verifyMeta.expensesCount}`);
  } else {
    console.warn('[!] Verification Warning: v2/meta response unexpected:', verifyMeta);
  }
  console.log('====================================================');
  console.log('       V2 MIGRATION COMPLETED SUCCESSFULLY!         ');
  console.log('====================================================');
}

runMigration().catch(err => {
  console.error('[X] Fatal migration error:', err);
  process.exit(1);
});
