// Pure helpers that group worker payouts (خلاص العمال) by worker name.
// No DOM access here, so the same code runs in the browser and under `node --test`.

// Two payouts belong to the same worker when their names match after trimming,
// collapsing inner whitespace and ignoring letter case: "  Ahmed  Ali " === "ahmed ali".
export function normalizeStaffName(name) {
    return String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

// Display name of a payout. Older records may only have `staffName`.
export function payoutStaffName(payout) {
    const raw = payout ? (payout.name || payout.staffName || '') : '';
    return String(raw).trim().replace(/\s+/g, ' ') || 'عامل';
}

function payoutTime(payout) {
    const t = new Date(payout.date || payout.createdAt || 0).getTime();
    return Number.isNaN(t) ? 0 : t;
}

// Newest first: by payout date, then by when the record was created.
export function comparePayoutsNewestFirst(a, b) {
    const byDate = payoutTime(b) - payoutTime(a);
    if (byDate !== 0) return byDate;
    return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
}

// Groups payouts by worker: one group per worker, most recent worker first.
// Each group: { key, name, payouts (newest first), lastPayout, total }.
// The input array is not modified.
export function groupStaffPayouts(payouts) {
    const byKey = new Map();
    (Array.isArray(payouts) ? payouts : []).forEach((payout) => {
        if (!payout) return;
        const key = normalizeStaffName(payoutStaffName(payout));
        if (!byKey.has(key)) {
            byKey.set(key, { key, name: '', payouts: [], lastPayout: null, total: 0 });
        }
        const group = byKey.get(key);
        group.payouts.push(payout);
        group.total += Number(payout.amount) || 0;
    });

    const groups = [...byKey.values()];
    groups.forEach((group) => {
        group.payouts.sort(comparePayoutsNewestFirst);
        group.lastPayout = group.payouts[0];
        group.name = payoutStaffName(group.lastPayout);
    });
    return groups.sort((a, b) => comparePayoutsNewestFirst(a.lastPayout, b.lastPayout));
}

// Group keys are placed inside inline onclick attributes. The encoded form only holds
// unreserved characters and %XX escapes, so it is safe in an HTML attribute and in a
// JavaScript string literal, apostrophes included.
export function encodeGroupKey(key) {
    return encodeURIComponent(String(key ?? '')).replace(/'/g, '%27');
}

export function decodeGroupKey(encoded) {
    const text = String(encoded ?? '');
    try {
        return decodeURIComponent(text);
    } catch (err) {
        return text;
    }
}
