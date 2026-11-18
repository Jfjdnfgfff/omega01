// Subscription status rules shared by the subscriber list, filters, reports and
// renewal flows. No DOM access here, so this also runs under `node --test`.
//
// A member's status ('active' | 'near_expiry' | 'expired' | 'frozen') is derived
// from `subscriptionType`, `remainingSessions` and `endDate`. The parsed endDate
// is cached privately and keyed by the endDate it was computed from. Changes
// from renewal, edit, freeze or rollback are therefore picked up immediately,
// and old persisted `_endMs` values are never trusted.

// Difference in whole calendar days between a target date and "now", both
// normalised to their LOCAL midnight. This avoids off-by-one errors caused by
// timezone offsets (the stored endDate is a UTC-midnight ISO string, while
// Date.now() carries the current wall-clock time which can shift the result
// by up to ±1 day).
export function localDayDiff(targetMs, nowMs) {
  const target = new Date(targetMs);
  const now = new Date(nowMs);
  const tNorm = Date.UTC(target.getFullYear(), target.getMonth(), target.getDate());
  const nNorm = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((tNorm - nNorm) / 86400000);
}

// A member is a session member when the subscription type says so, or — for
// legacy records without a type — when session counters are present. An
// explicit 'time' type always wins, so leftover counters from a previous
// session subscription can never keep a time member classified as expired.
export function isSessionCustomer(customer) {
  if (!customer || typeof customer !== 'object') return false;
  if (customer.subscriptionType === 'session') return true;
  if (customer.subscriptionType === 'time') return false;
  return customer.remainingSessions !== undefined && customer.remainingSessions !== null;
}

// Keep derived values out of customer records and Firebase. Old records may
// contain a stale _endMs, so never use it to calculate the current status.
const endDateCache = new WeakMap();
function endMsFor(customer) {
  const cached = endDateCache.get(customer);
  if (cached && cached.date === customer.endDate) return cached.ms;
  const ms = Date.parse(customer.endDate);
  endDateCache.set(customer, { date: customer.endDate, ms });
  return ms;
}

export function clearStatusCache(customer) {
  if (!customer || typeof customer !== 'object') return customer;
  endDateCache.delete(customer);
  delete customer._endMs;
  delete customer._endMsFor;
  return customer;
}

// Return a copy without legacy, derived cache fields for persistence.
export function cleanCustomerForStorage(customer) {
  const { _endMs, _endMsFor, ...clean } = customer;
  return clean;
}

export function calculateStatus(customer, cachedNowMs) {
  if (!customer) return 'active';
  if (customer.status === 'frozen') return 'frozen';
  const nowMs = cachedNowMs || Date.now();
  if (isSessionCustomer(customer)) {
    const remaining = parseInt(customer.remainingSessions) || 0;
    if (remaining <= 0) return 'expired';
    if (customer.endDate) {
      const endMs = endMsFor(customer);
      if (!isNaN(endMs)) {
        const diffDays = localDayDiff(endMs, nowMs);
        if (diffDays < 0) return 'expired';
        if (diffDays <= 5 || remaining <= 2) return 'near_expiry';
      }
    } else if (remaining <= 2) {
      return 'near_expiry';
    }
    return 'active';
  }
  if (!customer.endDate) return 'active';
  const endMs = endMsFor(customer);
  if (isNaN(endMs)) return 'active';
  const diffDays = localDayDiff(endMs, nowMs);
  if (diffDays < 0) return 'expired';
  if (diffDays <= 5) return 'near_expiry';
  return 'active';
}

export function getRemainingDays(customer, cachedNowMs) {
  if (!customer) return 0;
  if (customer.status === 'frozen') return (customer.frozenRemainingDays || 0);
  if (!customer.endDate) return 0;
  const nowMs = cachedNowMs || Date.now();
  const endMs = endMsFor(customer);
  if (isNaN(endMs)) return 0;
  return Math.max(0, localDayDiff(endMs, nowMs));
}

// Convert a Date to an ISO string at UTC-midnight of its LOCAL calendar date.
// This prevents timezone shifts: e.g. Dec 1 00:30 local (UTC+1) = Nov 30 23:30
// UTC, so toISOString() would return "2024-11-30T..." — off by one day.
export function toLocalMidnightISO(date) {
  if (!date || isNaN(date.getTime())) return new Date().toISOString();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}T00:00:00.000Z`;
}

// Apply a renewal to the customer record. `renewal` carries the values read
// from the renewal form: packageId, price, subscriptionType, paymentStatus,
// debtAmount, cycleId, paymentDateKey, totalSessions, remainingSessions,
// startDateVal, endDateVal (date-input strings) and `now`.
//
// A session renewal has no expiry date input. Clear a past expiry or a date
// from a previous time subscription rather than inventing a new expiry date.
// Time renewals clear leftover session counters.
export function applyRenewalToCustomer(customer, renewal = {}) {
  if (!customer || typeof customer !== 'object') return customer;
  const {
    packageId, price, subscriptionType, paymentStatus, debtAmount,
    cycleId, paymentDateKey, totalSessions, remainingSessions,
    startDateVal, endDateVal, now = new Date()
  } = renewal;

  const wasSession = isSessionCustomer(customer);
  if (packageId) customer.packageId = packageId;
  customer.price = price;
  customer.subscriptionType = subscriptionType;
  customer.status = 'active';
  customer.paymentStatus = paymentStatus;
  customer.debtAmount = debtAmount;
  customer.subscriptionCycleId = cycleId;
  customer.paymentDate = paymentDateKey;
  customer.updatedAt = Date.now();

  if (subscriptionType === 'session') {
    customer.totalSessions = totalSessions;
    customer.remainingSessions = remainingSessions;
    const existingEnd = customer.endDate ? Date.parse(customer.endDate) : NaN;
    if (!wasSession || (!isNaN(existingEnd) && localDayDiff(existingEnd, now.getTime()) < 0)) {
      customer.endDate = null;
    }
  } else {
    customer.totalSessions = null;
    customer.remainingSessions = null;
    if (startDateVal) customer.startDate = toLocalMidnightISO(new Date(startDateVal));
    if (endDateVal) customer.endDate = toLocalMidnightISO(new Date(endDateVal));
  }

  clearStatusCache(customer);
  return customer;
}
