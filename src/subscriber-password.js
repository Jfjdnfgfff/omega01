// ============================================================================
// كلمات مرور المشتركين — Subscriber Access Passwords
// ----------------------------------------------------------------------------
// كل مشترك يحصل على كلمة مرور مكوّنة من أربعة أرقام تُنشأ تلقائياً، ولا تتكرر
// أبداً بين مشتركين مختلفين (فريدة على مستوى كل المشتركين).
//
// القواعد:
//   • الطول ثابت: 4 أرقام (1000 - 9999) لتجنّب الأكواد التي تبدأ بالأصفار.
//   • التوليد يفضّل العشوائي، وإن تعارض الكود مع كود مستعمل يُعاد التوليد،
//     ثم يتحوّل تلقائياً إلى مسح كامل للمجال لضمان عدم التعارض إطلاقاً.
//   • الأكواد القديمة/التالفة (أقل أو أكثر من 4 أرقام، حروف، فراغات) تُستبدل.
//   • السجلات التي تتشارك نفس الكود: أول سجل يحتفظ به، والبقية تُولَّد لها أكواد
//     جديدة، حتى لا يبقى أي تشابه في قاعدة البيانات.
//
// كل الدوال نقية (لا تعتمد على DOM أو Firebase) لتكون قابلة للاختبار.
// ============================================================================

export const PASSWORD_LENGTH = 4;
export const PASSWORD_MIN = 1000;
export const PASSWORD_MAX = 9999;
export const PASSWORD_SPACE = PASSWORD_MAX - PASSWORD_MIN + 1; // 9000
export const SUBSCRIBER_PASSWORD_REGEX = /^\d{4}$/;

// أرقام عربية (٠-٩) وفارسية (۰-۹) → أرقام لاتينية
function toLatinDigits(value) {
  return String(value)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0));
}

/**
 * يرجّع الكود بأربعة أرقام إن كان صالحاً، وإلا سلسلة فارغة.
 * يقبل الأرقام والسلاسل النصية والأرقام العربية، ويتجاهل الفراغات والشرطات.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeSubscriberPassword(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' && !Number.isFinite(value)) return '';
  const digits = toLatinDigits(value).replace(/\D/g, '');
  return SUBSCRIBER_PASSWORD_REGEX.test(digits) ? digits : '';
}

/** هل القيمة كلمة مرور مشترك صالحة (4 أرقام)؟ */
export function isValidSubscriberPassword(value) {
  return normalizeSubscriberPassword(value) !== '';
}

function clampRandom(random) {
  const raw = Number(random());
  if (!Number.isFinite(raw)) return 0;
  if (raw <= 0) return 0;
  if (raw >= 0.999999999999) return 0.999999999999;
  return raw;
}

function candidateFromRandom(random) {
  return String(PASSWORD_MIN + Math.floor(clampRandom(random) * PASSWORD_SPACE));
}

/**
 * يبني مجموعة الأكواد المستعملة حالياً في قائمة المشتركين.
 * @param {Array<object>|unknown} customers
 * @returns {Set<string>}
 */
export function collectUsedSubscriberPasswords(customers) {
  const used = new Set();
  if (!Array.isArray(customers)) return used;
  for (let i = 0; i < customers.length; i++) {
    const record = customers[i];
    if (!record || typeof record !== 'object') continue;
    const password = normalizeSubscriberPassword(record.password);
    if (password) used.add(password);
  }
  return used;
}

/**
 * باعث أكواد فريد — يوزّع أكواداً لا تتكرر ما بين كل المشتركين الحاليين
 * وكل الأكواد التي وزّعها هو نفسه (مفيد عند إضافة عدة مشتركين/تعبئة دفعة).
 *
 * @param {Array<object>|unknown} customers المشتركون الحاليون
 * @param {{ random?: () => number }} [options]
 */
export function createPasswordAllocator(customers, options = {}) {
  const random = typeof options.random === 'function' ? options.random : Math.random;
  const used = collectUsedSubscriberPasswords(customers);
  let cursor = Math.floor(clampRandom(random) * PASSWORD_SPACE);

  /** هل الكود مستعمل من مشترك آخر؟ */
  function isUsed(password) {
    const normalized = normalizeSubscriberPassword(password);
    return normalized ? used.has(normalized) : false;
  }

  /** يعيد كوداً جديداً فريداً (يرمي خطأً فقط إذا استُنفدت كل الأكواد). */
  function next() {
    for (let attempt = 0; attempt < 32; attempt++) {
      const candidate = candidateFromRandom(random);
      if (!used.has(candidate)) {
        used.add(candidate);
        return candidate;
      }
    }
    // احتياط مضمون: مسح كامل للمجال 1000..9999
    for (let i = 0; i < PASSWORD_SPACE; i++) {
      const candidate = String(PASSWORD_MIN + ((cursor + i) % PASSWORD_SPACE));
      if (!used.has(candidate)) {
        cursor = (cursor + i + 1) % PASSWORD_SPACE;
        used.add(candidate);
        return candidate;
      }
    }
    throw new Error('لا توجد كلمات مرور متاحة: استُنفدت كل الأكواد المكوّنة من أربعة أرقام');
  }

  /** يحتفظ بكلمة مرور السجل إن كانت صالحة وغير مستعملة، وإلا يولّد واحدة جديدة. */
  function ensure(record) {
    if (!record || typeof record !== 'object') return '';
    const existing = normalizeSubscriberPassword(record.password);
    if (existing && !used.has(existing)) {
      used.add(existing);
      record.password = existing;
      return existing;
    }
    const fresh = next();
    record.password = fresh;
    record.passwordIssuedAt = record.passwordIssuedAt || Date.now();
    return fresh;
  }

  return {
    used,
    isUsed,
    next,
    ensure,
    get available() {
      return PASSWORD_SPACE - used.size;
    },
  };
}

/**
 * يولّد كلمة مرور واحدة فريدة مقابل قائمة المشتركين الحالية.
 * @param {Array<object>} customers
 * @param {{ random?: () => number, excludeIds?: Array<string|number> }} [options]
 *        `excludeIds` لتجاهل مشترك معيّن (مثل صاحب النموذج أثناء التعديل).
 * @returns {string}
 */
export function generateSubscriberPassword(customers, options = {}) {
  const exclude = new Set((options.excludeIds || []).filter(v => v !== null && v !== undefined).map(String));
  const others = (Array.isArray(customers) ? customers : []).filter(record => {
    if (!record || typeof record !== 'object') return false;
    const id = String(record.id || record._rtdbKey || '');
    return !id || !exclude.has(id);
  });
  return createPasswordAllocator(others, options).next();
}

/**
 * يعالج قائمة مشتركين بالكامل: يضيف الأكواد الناقصة، يستبدل التالفة،
 * ويزيل أي تشابه بين سجلين. يعدّل السجلات في مكانها.
 *
 * @param {Array<object>} customers
 * @param {{ random?: () => number, hints?: Map<string,string>|Record<string,string> }} [options]
 *        `hints` خريطة (معرف السجل → كود) لإعادة استعمال كود سبق إصداره لهذا
 *        السجل في نفس الجلسة (يمنع تغيير الكود عند إعادة تحميل البيانات).
 * @returns {{ changed: Array<{ record: object, previous: string }>, used: Set<string>, duplicates: number }}
 */
export function assignMissingPasswords(customers, options = {}) {
  const list = Array.isArray(customers) ? customers : [];
  const hints = options.hints instanceof Map ? options.hints : null;
  const recordId = (record) => String(record.id || record._rtdbKey || '');
  const changed = [];
  let duplicates = 0;

  // مرحلة 1: إعادة استعمال الكود المحفوظ لهذا السجل (حتى لا يتغيّر عند إعادة الدمج)
  if (hints) {
    for (const record of list) {
      if (!record || typeof record !== 'object') continue;
      if (normalizeSubscriberPassword(record.password)) continue;
      const id = recordId(record);
      const hinted = id ? normalizeSubscriberPassword(hints.get(id)) : '';
      if (hinted) record.password = hinted;
    }
  }

  // مرحلة 2: تثبيت أول ظهور لكل كود صالح، وحصر المتشابهة في قائمة الانتظار
  const used = new Set();      // الأكواد المثبّتة
  const pending = [];          // سجلات تحتاج كوداً جديداً
  for (const record of list) {
    if (!record || typeof record !== 'object') continue;
    const previous = normalizeSubscriberPassword(record.password);
    if (!previous) {
      pending.push({ record, previous: '' });
      continue;
    }
    if (used.has(previous)) {
      duplicates++;
      pending.push({ record, previous });
      continue;
    }
    used.add(previous);
    if (record.password !== previous) record.password = previous; // توحيد النوع (نص)
  }

  // مرحلة 3: توزيع أكواد جديدة فريدة على الباقي
  const allocator = createPasswordAllocator([], { random: options.random });
  for (const password of used) allocator.used.add(password);
  for (const item of pending) {
    const fresh = allocator.next();
    item.record.password = fresh;
    item.record.passwordIssuedAt = item.record.passwordIssuedAt || Date.now();
    if (hints) {
      const id = recordId(item.record);
      if (id) hints.set(id, fresh);
    }
    changed.push(item);
  }

  // تثبيت خريطة "معرف السجل → كود" لكل السجلات (لا المُولَّدة فقط) حتى لا
  // يتغيّر أي كود عند إعادة تحميل البيانات من Firebase.
  if (hints) {
    for (const record of list) {
      if (!record || typeof record !== 'object') continue;
      const id = recordId(record);
      const password = normalizeSubscriberPassword(record.password);
      if (id && password) hints.set(id, password);
    }
  }

  return { changed, used: allocator.used, duplicates };
}

/**
 * يبحث عن مشترك يملك كلمة المرور المطلوبة (مع إمكانية استثناء سجل واحد).
 * @returns {object|null}
 */
export function findCustomerByPassword(customers, password, options = {}) {
  const target = normalizeSubscriberPassword(password);
  if (!target) return null;
  const exclude = new Set((options.excludeIds || []).filter(v => v !== null && v !== undefined).map(String));
  const list = Array.isArray(customers) ? customers : [];
  for (const record of list) {
    if (!record || typeof record !== 'object') continue;
    const id = String(record.id || record._rtdbKey || '');
    if (id && exclude.has(id)) continue;
    if (normalizeSubscriberPassword(record.password) === target) return record;
  }
  return null;
}

/**
 * هل الكود مستعمل من مشترك آخر غير السجل المحدد؟
 */
export function isPasswordTaken(customers, password, options = {}) {
  return findCustomerByPassword(customers, password, options) !== null;
}
