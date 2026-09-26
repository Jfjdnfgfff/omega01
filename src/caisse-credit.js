// Credit repayments are cash movements, not sales or caisse closings.
// Keep them in the existing synced caisse collection with a distinct type.
export const isCaisseClosing = log => Boolean(log && log.type !== 'credit_payment');

export function creditPaymentsOnDate(logs, date, dateKey) {
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
    const settlement = (Array.isArray(logs) ? logs : []).find(log =>
        log && log.type === 'credit_payment' &&
        String(log.customerId) === String(customer.id) &&
        log.subscriptionDate === startDate &&
        (log.subscriptionCycleId || null) === (customer.subscriptionCycleId || null) &&
        log.subscriptionPaidBeforeSettlement !== undefined
    );
    return settlement ? Number(settlement.subscriptionPaidBeforeSettlement) : paid;
}
