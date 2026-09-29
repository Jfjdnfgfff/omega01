// Credit repayments are cash movements, not sales or caisse closings.
// Keep them in the existing synced caisse collection with a distinct type.
export const isCaisseClosing = log => Boolean(log && log.type !== 'credit_payment' && log.type !== 'cash_movement');

// Which till a repayment went into: today's till ("daily", the default and the value of
// every record saved before this option existed) or the "general" fund. General-fund
// repayments are still recorded and listed, but they never change the daily caisse
// balance or the end-of-day closing (same rule as expenses, payouts and suppliers).
export const normalizeFundSource = value => (value === 'general' ? 'general' : 'daily');
export const isGeneralFund = item => Boolean(item && item.fundSource === 'general');

export function creditPaymentsOnDate(logs, date, dateKey) {
    return (Array.isArray(logs) ? logs : []).filter(log =>
        log && log.type === 'credit_payment' && dateKey(log.date) === date
    );
}

// Split repayments into what entered the daily till and what went to the general fund.
export function creditPaymentTotals(payments) {
    return (Array.isArray(payments) ? payments : []).reduce((totals, payment) => {
        const amount = Math.abs(Number(payment && payment.amount) || 0);
        if (isGeneralFund(payment)) totals.general += amount;
        else totals.daily += amount;
        return totals;
    }, { daily: 0, general: 0 });
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
