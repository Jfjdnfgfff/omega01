import { subscriptionPaidForCaisse } from './caisse-credit.js';

export const CAISSE_MOVEMENT_TYPE = 'cash_movement';

const SOURCE_LABELS = {
    subscription: 'الاشتراكات',
    quickSession: 'الحصص السريعة',
    sale: 'مبيعات المنتجات',
    creditPayment: 'تسديد الكريدي',
    expense: 'المصاريف',
    staffPayout: 'خلاصات العمال',
    supplier: 'الموردون'
};

function asArray(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') return Object.values(value);
    return [];
}

function asAmount(value) {
    const amount = Number(String(value ?? 0).replace(/,/g, ''));
    return Number.isFinite(amount) ? Math.abs(amount) : 0;
}

function movementTimestamp(value) {
    const timestamp = new Date(value || 0).getTime();
    return Number.isFinite(timestamp) ? timestamp : 0;
}

/**
 * Build the daily caisse ledger from the financial sections.
 * Existing section records remain the source of truth; cash movement logs are
 * used for subscriptions because a renewal overwrites the customer's previous
 * subscription fields. Credit repayments are already stored in caisseLogs.
 */
export function buildCaisseMovements(state = {}, targetDate, dateKey) {
    const targetDateKey = typeof dateKey === 'function' ? dateKey(targetDate) : String(targetDate || '').slice(0, 10);
    if (!targetDateKey) {
        return {
            transactions: [], totalIncome: 0, totalExpenses: 0, netCash: 0,
            subIncome: 0, quickIncome: 0, salesIncome: 0, creditIncome: 0,
            expenses: 0, staffPayouts: 0, supplierPayments: 0
        };
    }

    const logs = asArray(state.caisseLogs);
    const recordedSubscriptionIds = new Set(logs
        .filter(log => log && log.type === CAISSE_MOVEMENT_TYPE && log.source === 'subscription')
        .map(log => String(log.sourceId || ''))
        .filter(Boolean));
    const transactions = [];
    const seenIds = new Set();

    const pushMovement = ({
        id, source, sourceId, direction, amount, date, title, detail, sourceLabel
    }) => {
        const value = asAmount(amount);
        if (!value || typeof dateKey !== 'function' || dateKey(date) !== targetDateKey) return;

        const stableId = String(id || `${source || 'movement'}_${sourceId || date}_${transactions.length}`);
        if (seenIds.has(stableId)) return;
        seenIds.add(stableId);
        const time = movementTimestamp(date);
        transactions.push({
            id: stableId,
            source: source || 'other',
            sourceId: sourceId == null ? '' : String(sourceId),
            sourceLabel: sourceLabel || SOURCE_LABELS[source] || 'حركة أخرى',
            direction: direction === 'out' ? 'out' : 'in',
            amount: value,
            date,
            timestamp: time,
            title: String(title || sourceLabel || SOURCE_LABELS[source] || 'معاملة نقدية'),
            detail: String(detail || '')
        });
    };

    // Durable subscription receipts and credit repayments.
    logs.forEach((log, index) => {
        if (!log) return;
        if (log.type === CAISSE_MOVEMENT_TYPE) {
            pushMovement({
                id: log.id || `cash_movement_${index}`,
                source: log.source || 'other',
                sourceId: log.sourceId,
                sourceLabel: log.sourceLabel,
                direction: log.direction,
                amount: log.amount,
                date: log.date,
                title: log.title,
                detail: log.detail || log.description
            });
        } else if (log.type === 'credit_payment') {
            pushMovement({
                id: log.id || `credit_payment_${log.creditId || index}`,
                source: 'creditPayment',
                sourceId: log.creditId || log.id || index,
                direction: 'in',
                amount: log.amount,
                date: log.date,
                title: `تسديد كريدي: ${log.creditName || 'كريدي'}`,
                detail: log.notes || ''
            });
        }
    });

    // Legacy subscriptions (before caisse movement logging was introduced).
    const packages = asArray(state.packages);
    const packageById = new Map(packages.map(pkg => [String(pkg?.id || ''), pkg]));
    asArray(state.customers).forEach((customer, index) => {
        if (!customer) return;
        const sourceId = String(customer.subscriptionCycleId || customer.id || customer._rtdbKey || index);
        if (recordedSubscriptionIds.has(sourceId)) return;
        const date = customer.paymentDate || customer.startDate;
        if (typeof dateKey !== 'function' || dateKey(date) !== targetDateKey) return;
        const pkg = packageById.get(String(customer.packageId || ''));
        const price = customer.price !== undefined && customer.price !== null && customer.price !== ''
            ? Number(customer.price)
            : Number(pkg?.price || 0);
        const amount = subscriptionPaidForCaisse(customer, price, logs, dateKey);
        pushMovement({
            id: `subscription_${sourceId}`,
            source: 'subscription',
            sourceId,
            direction: 'in',
            amount,
            date,
            title: `اشتراك: ${customer.name || 'مشترك'}`,
            detail: pkg?.name || 'اشتراك'
        });
    });

    // Walk-in / quick sessions.
    asArray(state.quickSessions).forEach((session, index) => {
        if (!session) return;
        const date = session.date || (Number(session.id) ? Number(session.id) : '');
        const sessionId = session.id || session._rtdbKey || index;
        pushMovement({
            id: `quickSession_${sessionId}`,
            source: 'quickSession',
            sourceId: sessionId,
            direction: 'in',
            amount: session.price,
            date,
            title: 'حصة سريعة',
            detail: `${Number(session.clientCount || 0)} زبون · ${Number(session.sessionCount || 0)} حصة`
        });
    });

    // Product sales.
    asArray(state.sales).forEach((sale, index) => {
        if (!sale) return;
        const saleId = sale.id || sale._rtdbKey || index;
        pushMovement({
            id: `sale_${saleId}`,
            source: 'sale',
            sourceId: saleId,
            direction: 'in',
            amount: sale.cashPaid !== undefined && sale.cashPaid !== null
                ? sale.cashPaid
                : (sale.paymentStatus === 'credit' ? 0 : sale.total),
            date: sale.date,
            title: `بيع: ${sale.prodName || sale.productName || 'منتج'}`,
            detail: Number(sale.qty) > 0 ? `الكمية: ${sale.qty}` : ''
        });
    });

    // Movements marked as paid from the general fund never touch the daily till.
    const fromGeneralFund = item => item && item.fundSource === 'general';

    // General expenses.
    asArray(state.expenses).forEach((expense, index) => {
        if (!expense || fromGeneralFund(expense)) return;
        const expenseId = expense.id || expense._rtdbKey || index;
        pushMovement({
            id: `expense_${expenseId}`,
            source: 'expense',
            sourceId: expenseId,
            direction: 'out',
            amount: expense.amount,
            date: expense.date,
            title: `مصروف: ${expense.desc || 'مصروف'}`,
            detail: expense.category || ''
        });
    });

    // Salaries, coach commissions and other staff payouts.
    asArray(state.staffPayouts).forEach((payout, index) => {
        if (!payout || fromGeneralFund(payout)) return;
        const payoutId = payout.id || payout._rtdbKey || index;
        pushMovement({
            id: `staffPayout_${payoutId}`,
            source: 'staffPayout',
            sourceId: payoutId,
            direction: 'out',
            amount: payout.amount,
            date: payout.date || payout.createdAt,
            title: `خلاص: ${payout.name || payout.staffName || 'عامل'}`,
            detail: [payout.type, payout.notes].filter(Boolean).join(' · ')
        });
    });

    // Supplier invoices/settlements affect the till only by the amount actually paid.
    let supplierTransactions = asArray(state.supplierTransactions);
    if (supplierTransactions.length === 0) {
        supplierTransactions = asArray(state.suppliers).map((supplier, index) => ({
            ...supplier,
            id: supplier?.id || `legacy_supplier_${index}`,
            supplierName: supplier?.name,
            paidAmount: supplier?.paid,
            date: supplier?.date
        }));
    }
    supplierTransactions.forEach((transaction, index) => {
        if (!transaction) return;
        const transactionId = transaction.id || transaction._rtdbKey || index;
        pushMovement({
            id: `supplier_${transactionId}`,
            source: 'supplier',
            sourceId: transactionId,
            direction: 'out',
            amount: transaction.paidAmount,
            date: transaction.date || transaction.createdAt,
            title: `المورد: ${transaction.supplierName || 'مورد'}`,
            detail: transaction.items || transaction.notes || (transaction.type === 'payment' ? 'تسديد مورد' : 'مشتريات')
        });
    });

    transactions.sort((a, b) => b.timestamp - a.timestamp || a.id.localeCompare(b.id));
    const totals = {
        totalIncome: 0,
        totalExpenses: 0,
        subIncome: 0,
        quickIncome: 0,
        salesIncome: 0,
        creditIncome: 0,
        expenses: 0,
        staffPayouts: 0,
        supplierPayments: 0
    };

    transactions.forEach(transaction => {
        const amount = transaction.amount;
        if (transaction.direction === 'in') {
            totals.totalIncome += amount;
            if (transaction.source === 'subscription') totals.subIncome += amount;
            else if (transaction.source === 'quickSession') totals.quickIncome += amount;
            else if (transaction.source === 'sale') totals.salesIncome += amount;
            else if (transaction.source === 'creditPayment') totals.creditIncome += amount;
        } else {
            totals.totalExpenses += amount;
            if (transaction.source === 'expense') totals.expenses += amount;
            else if (transaction.source === 'staffPayout') totals.staffPayouts += amount;
            else if (transaction.source === 'supplier') totals.supplierPayments += amount;
        }
    });

    return {
        transactions,
        ...totals,
        netCash: totals.totalIncome - totals.totalExpenses
    };
}
