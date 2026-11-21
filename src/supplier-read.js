export const supplierName = value => String(value ?? '').trim() || 'مورد عام';
export const supplierKey = value => supplierName(value).toLowerCase();
export const isSupplierPurchase = tx => tx.type === 'purchase' || (!tx.type && Boolean(String(tx.items ?? '').trim()) && tx.items !== 'تسديد / تخفيض دين سابق');

// Legacy rows are a display fallback, not records to sync back to Firebase.
export function readSupplierTransactions(suppliers, transactions) {
  const rows = (Array.isArray(transactions) ? transactions : []).filter(tx => tx && typeof tx === 'object');
  const names = new Set(rows.map(tx => supplierKey(tx.supplierName)));
  for (const supplier of Array.isArray(suppliers) ? suppliers : []) {
    if (!supplier?.name || names.has(supplierKey(supplier.name))) continue;
    const paidAmount = Number(supplier.paid) || 0;
    const remainingDebt = Number(supplier.debt) || 0;
    rows.push({
      supplierName: supplier.name, supplierInfo: supplier.info,
      type: 'purchase', items: supplier.items || 'مشتريات سلع ومكملات',
      paidAmount, remainingDebt, totalAmount: paidAmount + remainingDebt,
      date: supplier.date || '', notes: supplier.notes,
    });
  }
  return rows;
}

export const supplierSections = ['suppliers', 'supplierTransactions'];

// Older builds stored these collections both at the root and in state nodes.
export async function readSupplierLegacy(read, section) {
  for (const path of [section, `appState/${section}`, `gym_app_state/${section}`]) {
    const data = await read(path);
    if (data != null) return data;
  }
  return null;
}
