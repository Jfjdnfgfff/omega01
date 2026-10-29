// Female income attribution for the "قسم الإناث (33%)" section.
//
// The section used to read subscriptions only (`appState.customers` with
// `gender === 'female'`), so a woman paying for single sessions
// (اشتراك بالحصة / quickSessions) never reached "المداخيل المقبوضة (الإناث)"
// nor the female coach commission — even though the dashboard already counts
// her in "إناث (حصص هذا الشهر)".
//
// A quick session stores one total (`price`) plus a per-client list:
//
//   { id, date, price: 1500, clientCount: 3,
//     clients: [{ activity: 'cardio', price: 500, gender: 'female' }, …] }
//
// `price` is authoritative (the cashier may override the auto-total), so the
// money is attributed per client as a *share of the session total*:
//   - proportional to the typed client prices when they exist;
//   - equal split otherwise.
// Rounding is settled on the last client, so female + male shares always add
// back up to exactly the session total (no dinar invented or lost).
//
// Everything here is pure and DOM-free so it can be unit tested.

/** Normalize a session total: prefer `price`, fall back to the sum of clients. */
export function sessionTotal(session) {
  if (!session || typeof session !== 'object') return 0;
  const clients = Array.isArray(session.clients) ? session.clients.filter(Boolean) : [];
  const sum = clients.reduce((total, client) => total + (Number(client.price) || 0), 0);
  const declared = Number(session.price);
  if (Number.isFinite(declared) && declared >= 0 && session.price !== '' && session.price !== null) {
    return Math.round(declared);
  }
  return Math.round(sum);
}

/** A client counts as female only when explicitly marked so (legacy = male). */
export function isFemaleClient(client) {
  return Boolean(client) && client.gender === 'female';
}

/**
 * Split a session total across its clients.
 * Returns [{ activity, gender, female, amount }] whose amounts sum to the total.
 */
export function splitSessionMoney(session) {
  const clients = Array.isArray(session?.clients) ? session.clients.filter(Boolean) : [];
  if (!clients.length) return [];
  const total = sessionTotal(session);
  const weights = clients.map(client => Math.max(0, Number(client.price) || 0));
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const amounts = [];
  if (total <= 0) {
    return clients.map(client => ({ activity: client.activity, gender: isFemaleClient(client) ? 'female' : 'male', female: isFemaleClient(client), amount: 0 }));
  }
  if (weightSum > 0) {
    let allocated = 0;
    weights.forEach((weight, index) => {
      if (index === clients.length - 1) {
        amounts.push(total - allocated); // settle rounding on the last client
        return;
      }
      const share = Math.round((total * weight) / weightSum);
      amounts.push(share);
      allocated += share;
    });
  } else {
    const each = Math.floor(total / clients.length);
    clients.forEach((_, index) => {
      amounts.push(index === clients.length - 1 ? total - each * (clients.length - 1) : each);
    });
  }
  return clients.map((client, index) => ({
    activity: client.activity,
    gender: isFemaleClient(client) ? 'female' : 'male',
    female: isFemaleClient(client),
    amount: amounts[index],
  }));
}

/**
 * Female part of one quick session.
 * @returns {{ id, date, total, femaleRevenue, femaleClients, maleClients, activities }}
 */
export function femaleSessionShare(session) {
  const parts = splitSessionMoney(session);
  if (!parts.length) return null;
  const femaleParts = parts.filter(part => part.female);
  return {
    id: session.id != null ? String(session.id) : '',
    date: session.date,
    total: parts.reduce((sum, part) => sum + part.amount, 0),
    femaleRevenue: femaleParts.reduce((sum, part) => sum + part.amount, 0),
    femaleClients: femaleParts.length,
    maleClients: parts.length - femaleParts.length,
    activities: Array.from(new Set(parts.map(part => part.activity).filter(Boolean))),
  };
}

const PERIOD_KEYS = new Set(['today', 'month', 'year', 'all']);

/** Does a local "YYYY-MM-DD" key fall inside the selected period? */
export function isInPeriod(dateKey, period, todayKey) {
  if (!dateKey) return true; // undated rows stay visible rather than vanishing
  if (!PERIOD_KEYS.has(period) || period === 'all') return true;
  if (!todayKey) return true;
  if (period === 'today') return dateKey === todayKey;
  if (period === 'month') return dateKey.slice(0, 7) === todayKey.slice(0, 7);
  return dateKey.slice(0, 4) === todayKey.slice(0, 4); // year
}

/**
 * Female income coming from quick sessions in the selected period.
 * Sessions are always settled in cash when recorded (they enter the daily
 * caisse immediately), so they are "paid" by definition.
 *
 * @param {Array} sessions            appState.quickSessions
 * @param {object} options
 * @param {'today'|'month'|'year'|'all'} options.period
 * @param {string} options.todayKey   local YYYY-MM-DD for "today"
 * @param {(date:any)=>string} options.dateKeyOf  date -> local YYYY-MM-DD
 * @param {'all'|'paid'|'credit'} [options.paymentFilter]
 * @param {string} [options.search]   lower-cased search text
 */
export function collectFemaleSessionIncome(sessions, { period = 'all', todayKey = '', dateKeyOf, paymentFilter = 'all', search = '' } = {}) {
  const result = {
    rows: [],
    femaleRevenue: 0,
    femaleClients: 0,
    sessionCount: 0,
    totalRevenue: 0,
  };
  if (paymentFilter === 'credit') return result; // sessions are cash, never credit
  const toKey = typeof dateKeyOf === 'function' ? dateKeyOf : () => '';
  for (const session of Array.isArray(sessions) ? sessions : []) {
    if (!session || typeof session !== 'object') continue;
    const share = femaleSessionShare(session);
    if (!share || share.femaleClients === 0) continue;
    const dateKey = toKey(session.date) || '';
    if (!isInPeriod(dateKey, period, todayKey)) continue;
    if (search) {
      const haystack = `حصة حصص ${share.activities.join(' ')} ${dateKey}`.toLowerCase();
      if (!haystack.includes(search)) continue;
    }
    result.rows.push({
      id: share.id,
      kind: 'quickSession',
      dateKey,
      activities: share.activities,
      femaleClients: share.femaleClients,
      maleClients: share.maleClients,
      femaleRevenue: share.femaleRevenue,
      totalRevenue: share.total,
      paid: share.femaleRevenue,
      credit: 0,
    });
    result.femaleRevenue += share.femaleRevenue;
    result.femaleClients += share.femaleClients;
    result.totalRevenue += share.total;
    result.sessionCount += 1;
  }
  return result;
}

/** Human label for the session activity mix, e.g. "Musculation · Cardio". */
export function sessionActivityLabel(activities = []) {
  const label = { musculation: 'Musculation', cardio: 'Cardio' };
  const parts = activities.map(activity => label[activity] || String(activity));
  return parts.length ? parts.join(' · ') : 'حصة سريعة';
}
