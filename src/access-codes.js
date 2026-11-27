// ============================================================================
// أكواد دخول العمال والموردين — Staff & Supplier Access Codes
// ----------------------------------------------------------------------------
// كل عامل (من يُسجَّل له خلاص) وكل مورد يحصل على كلمة مرور مكوّنة من أربعة أرقام
// تُنشأ تلقائياً، ولا تتكرر بين أي مشترك أو مورد أو عامل في النظام.
//
// • الفريدية عالمية: التوليد يتخطى أكواد المشتركين والموردين والعمال معاً.
// • الهوية: العامل يُعرَّف باسمه الموحّد (normalizeStaffName)، والمورد باسمه
//   الموحّد (supplierKey) — نفس المفاتيح المستعملة في شاشات الخلاص والموردين،
//   فتبقى الكلمة ثابتة عبر كل معاملات العامل/المورد.
// • التوليد والتحقق هنا دوال نقية (بدون DOM) لتكون قابلة للاختبار.
// ============================================================================

import {
  normalizeSubscriberPassword,
  generateSubscriberPassword,
  isPasswordTaken,
} from './subscriber-password.js';

export const ACCESS_CODE_LENGTH = 4;

// أرقام عربية/فارسية → لاتينية، مع الإبقاء على أول 4 أرقام فقط
function toLatinDigits(value) {
  return String(value ?? '')
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/** يرجّع كوداً من 4 أرقام إن كان صالحاً، وإلا سلسلة فارغة. */
export function normalizeAccessCode(value) {
  return normalizeSubscriberPassword(value);
}

/** هل النص أربعة أرقام صالحة ككود دخول؟ */
export function isValidAccessCode(value) {
  return normalizeAccessCode(value) !== '';
}

/** توحيد اسم المورد كما تفعل شاشة الموردين (حروف صغيرة، بلا فراغات زائدة). */
export function normalizeSupplierName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/** توحيد اسم العامل كما تفعل شاشة خلاص العمال. */
export function normalizeWorkerName(name) {
  return String(name ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

/**
 * يجمع كل الأكواد المستعملة حالياً في النظام (مشتركون + موردون + عمال).
 * @param {{ customers?: unknown, suppliers?: unknown, staff?: unknown }} state
 *   staff عناصرها { name, password } أو سجل عامل واحد.
 * @returns {Set<string>}
 */
export function collectAccessCodes(state = {}) {
  const used = new Set();
  const add = (value) => {
    const code = normalizeAccessCode(value);
    if (code) used.add(code);
  };
  const each = (list, pick) => {
    if (Array.isArray(list)) list.forEach(item => { if (item && typeof item === 'object') add(pick(item)); });
    else if (list && typeof list === 'object') Object.values(list).forEach(item => { if (item && typeof item === 'object') add(pick(item)); });
  };
  each(state.customers, item => item.password);
  each(state.suppliers, item => item.password);
  each(state.staff, item => item.password);
  return used;
}

/**
 * يولّد كوداً فريداً (4 أرقام) لا يتعارض مع أي مشترك/مورد/عامل، بما في ذلك
 * الكود المستثنى (صاحب السجل عند إعادة التوليد).
 * @param {{ customers?: unknown, suppliers?: unknown, staff?: unknown }} state
 * @param {{ exclude?: string[], random?: () => number }} [options]
 */
export function generateAccessCode(state = {}, options = {}) {
  const exclude = new Set((options.exclude || []).filter(v => v !== null && v !== undefined).map(String));
  const blocked = collectAccessCodes(state);
  exclude.forEach(code => {
    const normalized = normalizeAccessCode(code);
    if (normalized) blocked.add(normalized);
  });
  // الكود السابق لصاحب السجل محجوب أيضاً: إعادة التوليد يجب أن تعطي كوداً مختلفاً
  const previous = options.previous ? normalizeAccessCode(options.previous) : '';
  if (previous) blocked.add(previous);
  // نبني قائمة وهمية تحمل الأكواد المحجوبة ثم نطلب كوداً جديداً لا يتعارض معها
  const fakeCustomers = Array.from(blocked, password => ({ password }));
  return generateSubscriberPassword(fakeCustomers, { random: options.random });
}

/** هل الكود مستعمل من مورد آخر (غير السجل المستثنى)؟ */
export function isSupplierCodeTaken(suppliers, password, options = {}) {
  const target = normalizeAccessCode(password);
  if (!target) return false;
  const exclude = new Set((options.excludeNames || []).filter(Boolean).map(normalizeSupplierName));
  return (Array.isArray(suppliers) ? suppliers : []).some(supplier => {
    if (!supplier || typeof supplier !== 'object') return false;
    if (normalizeSupplierName(supplier.name) && exclude.has(normalizeSupplierName(supplier.name))) return false;
    return normalizeAccessCode(supplier.password) === target;
  });
}

/** هل الكود مستعمل من عامل آخر (غير الاسم المستثنى)؟ */
export function isWorkerCodeTaken(staff, password, options = {}) {
  const target = normalizeAccessCode(password);
  if (!target) return false;
  const exclude = new Set((options.excludeNames || []).filter(Boolean).map(normalizeWorkerName));
  return (Array.isArray(staff) ? staff : []).some(worker => {
    if (!worker || typeof worker !== 'object') return false;
    if (normalizeWorkerName(worker.name) && exclude.has(normalizeWorkerName(worker.name))) return false;
    return normalizeAccessCode(worker.password) === target;
  });
}

/**
 * يضمن أن لكل مورد كوداً فريداً: يحتفظ بالكود الصالح، ويولّد لغيره.
 * يعدّل السجلات في مكانها.
 * @param {Array<object>} suppliers
 * @param {{ state?: object, random?: () => number, now?: number }} [options]
 */
export function assignSupplierPasswords(suppliers, options = {}) {
  const list = Array.isArray(suppliers) ? suppliers : [];
  const state = options.state || {};
  const changed = [];
  const seen = new Set(collectAccessCodes({ customers: state.customers, staff: state.staff }));
  const pending = [];
  for (const supplier of list) {
    if (!supplier || typeof supplier !== 'object') continue;
    const existing = normalizeAccessCode(supplier.password);
    if (existing && !seen.has(existing)) {
      seen.add(existing);
      if (supplier.password !== existing) supplier.password = existing;
      continue;
    }
    pending.push({ record: supplier, previous: existing || '' });
  }
  for (const item of pending) {
    const code = generateAccessCode({ ...state, suppliers: list }, { random: options.random });
    item.record.password = code;
    item.record.passwordIssuedAt = item.record.passwordIssuedAt || options.now || Date.now();
    changed.push(item);
  }
  return { changed, used: collectAccessCodes({ ...state, suppliers: list }) };
}

/**
 * يضمن أن لكل عامل كوداً فريداً. العمال يُشتقّون من سجل الخلاصات (الاسم)، أو
 * يأتون كسجلات { id/name, password }.
 * @param {Array<object>} staff
 * @param {{ state?: object, random?: () => number, now?: number }} [options]
 */
export function assignWorkerPasswords(staff, options = {}) {
  const list = Array.isArray(staff) ? staff : [];
  const state = options.state || {};
  const changed = [];
  const seen = new Set(collectAccessCodes({ customers: state.customers, suppliers: state.suppliers }));
  const pending = [];
  for (const worker of list) {
    if (!worker || typeof worker !== 'object') continue;
    const existing = normalizeAccessCode(worker.password);
    if (existing && !seen.has(existing)) {
      seen.add(existing);
      if (worker.password !== existing) worker.password = existing;
      continue;
    }
    pending.push({ record: worker, previous: existing || '' });
  }
  for (const item of pending) {
    const code = generateAccessCode({ ...state, staff: list }, { random: options.random });
    item.record.password = code;
    item.record.passwordIssuedAt = item.record.passwordIssuedAt || options.now || Date.now();
    changed.push(item);
  }
  return { changed, used: collectAccessCodes({ ...state, staff: list }) };
}

/**
 * يجد المورد صاحب الكود (مع إمكانية استثناء اسم).
 * @returns {object|null}
 */
export function findSupplierByCode(suppliers, password, options = {}) {
  const target = normalizeAccessCode(password);
  if (!target) return null;
  const exclude = new Set((options.excludeNames || []).filter(Boolean).map(normalizeSupplierName));
  for (const supplier of (Array.isArray(suppliers) ? suppliers : [])) {
    if (!supplier || typeof supplier !== 'object') continue;
    if (exclude.has(normalizeSupplierName(supplier.name))) continue;
    if (normalizeAccessCode(supplier.password) === target) return supplier;
  }
  return null;
}

/**
 * يجد العامل صاحب الكود (مع إمكانية استثناء اسم).
 * @returns {object|null}
 */
export function findWorkerByCode(staff, password, options = {}) {
  const target = normalizeAccessCode(password);
  if (!target) return null;
  const exclude = new Set((options.excludeNames || []).filter(Boolean).map(normalizeWorkerName));
  for (const worker of (Array.isArray(staff) ? staff : [])) {
    if (!worker || typeof worker !== 'object') continue;
    if (exclude.has(normalizeWorkerName(worker.name))) continue;
    if (normalizeAccessCode(worker.password) === target) return worker;
  }
  return null;
}

// يُعاد التصدير للاستخدام المباشر في الواجهة
export { isPasswordTaken, toLatinDigits };
