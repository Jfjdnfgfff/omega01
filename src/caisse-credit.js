// Credit repayments are cash movements, not sales or caisse closings.
// Keep them in the existing synced caisse collection with a distinct type.
export const isCaisseClosing = log => Boolean(log && log.type !== 'credit_payment' && log.type !== 'cash_movement');

export function creditPaymentsOnDate(logs, date, dateKey) {
    return (Array.isArray(logs) ? logs : []).filter(log =>
        log && log.type === 'credit_payment' && dateKey(log.date) === date && log.fundSource !== 'general'
    );
}

export function allCreditPaymentsOnDate(logs, date, dateKey) {
    return (Array.isArray(logs) ? logs : []).filter(log =>
        log && log.type === 'credit_payment' && dateKey(log.date) === date
    );
}

export function subscriptionPaidForCaisse(customer, price, logs, dateKey) {
    let paid = 0;
    if (customer.paymentStatus === 'paid') paid = price;
    else if (customer.paymentStatus === 'credit') paid = Math.max(0, price - Number(customer.debtAmount || 0));

    // Clearing a subscriber's debt changes their live paymentStatus to paid.
    // Preserve what actually entered the till on the original subscription date;
    // the remainder belongs only to the day the credit was settled.
    const startDate = dateKey(customer.startDate);
    // With partial repayments there can be several receipts; the smallest
    // "paid before" value is what entered the till on the subscription day.
    const settlements = (Array.isArray(logs) ? logs : []).filter(log =>
        log && log.type === 'credit_payment' &&
        String(log.customerId) === String(customer.id) &&
        log.subscriptionDate === startDate &&
        (log.subscriptionCycleId || null) === (customer.subscriptionCycleId || null) &&
        log.subscriptionPaidBeforeSettlement !== undefined
    );
    if (!settlements.length) return paid;
    return Math.min(...settlements.map(log => Number(log.subscriptionPaidBeforeSettlement) || 0));
}

// Recalculate the cash taken on the subscription date after an admin edits the
// price/debt. Later credit receipts stay separate caisse movements, so subtract
// them here to avoid counting those repayments twice.
export function subscriptionCashPaidAtStart(customer, price, logs, dateKey) {
    const totalPrice = Math.max(0, Number(price) || 0);
    const outstandingDebt = customer?.paymentStatus === 'credit'
        ? Math.max(0, Number(customer.debtAmount) || 0)
        : 0;
    const customerId = String(customer?.id ?? customer?._rtdbKey ?? '');
    const cycleId = String(customer?.subscriptionCycleId || '');
    const getDateKey = typeof dateKey === 'function'
        ? dateKey
        : value => String(value || '').slice(0, 10);
    const startDate = getDateKey(customer?.startDate);
    const repayments = (Array.isArray(logs) ? logs : []).filter(log => {
        if (!log || log.type !== 'credit_payment' || log.subscriptionPaidBeforeSettlement === undefined) return false;
        if (String(log.customerId ?? '') !== customerId) return false;
        const logCycleId = String(log.subscriptionCycleId || '');
        if (cycleId && logCycleId) return logCycleId === cycleId;
        return Boolean(startDate && String(log.subscriptionDate || '') === startDate);
    }).reduce((sum, log) => sum + Math.max(0, Number(log.amount) || 0), 0);

    return Math.max(0, totalPrice - outstandingDebt - repayments);
}

export function linkedCustomerForCredit(credit, customers, creditId, normalizePhone) {
    if (!credit || credit.source === 'product_sale' || credit.saleId) return null;
    const list = Array.isArray(customers) ? customers : [];
    const targetId = String(creditId || credit.id || '').trim();
    const linkedById = list.find(customer => customer && (
        (credit.customerId && String(customer.id) === String(credit.customerId)) ||
        targetId === `cr_auto_${customer.id}` || targetId.startsWith(`cr_auto_${customer.id}_`)
    ));
    if (linkedById || !credit.phone) return linkedById || null;
    const normalize = typeof normalizePhone === 'function'
        ? normalizePhone
        : value => String(value || '').trim();
    return list.find(customer => customer && customer.paymentStatus === 'credit' &&
        normalize(customer.phone) === normalize(credit.phone)) || null;
}
