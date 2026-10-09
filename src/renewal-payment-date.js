// Date rules for the payment date of a subscription renewal (تجديد الاشتراك).
// The cash received is booked in the caisse of the chosen payment day, not in the
// day the renewal is typed in. No DOM access here, so this also runs under `node --test`.

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

// Local calendar day as YYYY-MM-DD. Date-only strings are returned unchanged, the same
// way the app's getLocalDateString() treats them, so they never shift to another day.
export function localDateKey(value) {
    if (typeof value === 'string' && DATE_ONLY.test(value.trim())) return value.trim();
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// True only for a real calendar day written as YYYY-MM-DD (2026-02-30 is rejected).
export function isValidDateKey(value) {
    const text = String(value ?? '').trim();
    if (!DATE_ONLY.test(text)) return false;
    const [year, month, day] = text.split('-').map(Number);
    const check = new Date(Date.UTC(year, month - 1, day));
    return check.getUTCFullYear() === year
        && check.getUTCMonth() === month - 1
        && check.getUTCDate() === day;
}

// Validates the payment date typed in the renewal form. Today and past days are
// allowed; future days are not.
export function resolveRenewalPaymentDate(value, now = new Date()) {
    const text = String(value ?? '').trim();
    if (!text) return { ok: false, error: 'missing' };
    if (!isValidDateKey(text)) return { ok: false, error: 'invalid' };
    if (text > localDateKey(now)) return { ok: false, error: 'future' };
    return { ok: true, dateKey: text };
}

// Timestamp stored on the caisse movement for a payment day: that local day, at the
// current local time of day. For today this is simply `now`, so the order of
// same-day movements is unchanged.
export function renewalPaymentTimestamp(dateKey, now = new Date()) {
    if (!isValidDateKey(dateKey)) throw new RangeError(`invalid payment date: ${dateKey}`);
    if (dateKey === localDateKey(now)) return now.toISOString();
    const [year, month, day] = dateKey.split('-').map(Number);
    const stamped = new Date(
        year,
        month - 1,
        day,
        now.getHours(),
        now.getMinutes(),
        now.getSeconds(),
        now.getMilliseconds()
    );
    return stamped.toISOString();
}
