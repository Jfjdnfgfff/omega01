// Keep only subscription fields: rolling back a renewal must not erase edits to
// the member's identity/contact details or attendance history.
const SUBSCRIPTION_FIELDS = [
    'subscriptionCycleId', 'packageId', 'price', 'subscriptionType',
    'status', 'paymentStatus', 'debtAmount', 'startDate', 'endDate',
    'totalSessions', 'remainingSessions'
];

export function snapshotSubscription(customer) {
    const snapshot = {};
    for (const field of SUBSCRIPTION_FIELDS) {
        if (Object.hasOwn(customer, field)) snapshot[field] = customer[field];
    }
    return snapshot;
}

export function restoreSubscription(customer, snapshot) {
    for (const field of SUBSCRIPTION_FIELDS) {
        if (Object.hasOwn(snapshot, field)) customer[field] = snapshot[field];
        else delete customer[field];
    }
    customer.updatedAt = Date.now();
    return customer;
}

// Only the current renewal can be undone: earlier cycles may already have been
// used as the basis for later renewals. Old entries have no saved pre-renewal state.
export function renewalRollbackCheck(customer, movement, credits = [], logs = []) {
    if (!customer || !movement || movement.type !== 'cash_movement' ||
        movement.source !== 'subscription' || !movement.previousSubscription ||
        String(movement.customerId) !== String(customer.id) ||
        String(movement.sourceId) !== String(customer.subscriptionCycleId)) return { ok: false, reason: 'not-latest' };

    if (movement.renewalCreditId) {
        const creditId = String(movement.renewalCreditId);
        const credit = credits.find(c => c && String(c.id) === creditId);
        if (logs.some(log => log && log.type === 'credit_payment' && String(log.creditId) === creditId) ||
            (credit && (Number(credit.amount) !== Number(movement.renewalDebtAmount) ||
                credit.status === 'paid' || credit.status === 'settled'))) {
            return { ok: false, reason: 'repaid' };
        }
    }
    return { ok: true };
}
