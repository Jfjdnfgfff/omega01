// ============================================================================
// فهرس منتجات تحويل المخزون — Stock Transfer Product Index
// ----------------------------------------------------------------------------
// نافذة «تحويل بضاعة بين المخازن» كانت تعرض قائمة منسدلة تُعاد كتابتها بمسح
// كامل مصفوفة المنتجات في كل تفاعل (فتح النافذة / تبديل اتجاه التحويل)،
// وبلا أي بحث: المستخدم يمرّر القائمة يدوياً ليجد المنتج.
//
// يبني هذا الوحدة فهرساً في الذاكرة للمنتجات القابلة للتحويل فقط (الموجودة
// في المخزن المصدر وفيها كمية > 0) مرة واحدة لكل تغيّر في البيانات:
//
//   entries   : قائمة بترتيب المصدر، كل عنصر { id, product, barcodeN, text }
//   byId      : id → entry                       (وصول فوري O(1))
//   byBarcode : كودبار مُطبَّع → entry            (مطابقة الكودبار بدقة O(1))
//   text      : نص بحث مُطبَّع مسبقاً (الاسم، الوزن، الماركة، التصنيف، الكودبار)
//
// البحث يستخدم AND للكلمات (كل كلمة يجب أن توجد في نص المنتج)، ومطابقة
// الكودبار الدقيقة تُعاد وحدها فوراً O(1) لتسهيل المسح بالكاميرا أو بقارئ
// الكودبار. الفهرس مخزّن مؤقتاً (memoised) عبر `createTransferProductIndexer`
// ولا يُعاد بناؤه إلا عندما تغيّر `transferProductsSignature()` (أي تغيّر أي
// منتج أو اتجاه التحويل)، فيبقى البحث أثناء الكتابة «قراءة من الفهرس».
//
// كل الدوال هنا نقية (بلا DOM وبلا مؤقتات) لكي تبقى قابلة للاختبار بـ
// `node --test`.
// ============================================================================

const EMPTY_PRODUCTS = Object.freeze([]);

// الحركات والتشكيل والتطويل: لا تحمل معنى في البحث.
const ARABIC_MARKS = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u0640]/g;

/**
 * تطبيع نص البحث. يُطبَّق على سجلات الفهرس وعلى ما يكتبه المستخدم معاً،
 * فلا يكسر أي مطابقة دقيقة:
 *   - حذف التشكيل والتطويل؛
 *   - توحيد آ أ إ ٱ → ا و ى → ي و ة → ه؛
 *   - توحيد الأرقام العربية/الفارسية إلى ASCII (الكودبارات أرقام)؛
 *   - تحويل الأحرف اللاتينية إلى صغيرة وضغط المسافات.
 */
export function normalizeSearchText(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(ARABIC_MARKS, '')
    .replace(/[\u0622\u0623\u0625\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064A')
    .replace(/\u0629/g, '\u0647')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06F0))
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * موقع المنتج: أي قيمة غير stock2 تعني صالة البيع (stock1) — نفس منطق
 * `p.stockLocation || 'stock1'` المعتمد في بقية التطبيق.
 */
export function transferProductLocation(product) {
  const loc = product && product.stockLocation ? String(product.stockLocation) : 'stock1';
  return loc === 'stock2' ? 'stock2' : 'stock1';
}

/**
 * بصمة رخيصة `العدد:الموقع:هاش` فوق معرّف وكمية وموقع وباركود واسم كل
 * منتج. أي إضافة/حذف/تعديل (حتى تغيّر كمية بعد بيع أو تحويل) يغيّرها،
 * ولهذا لا يخدم الفهرس المخزّن صفوفاً قديمة أبداً.
 */
export function transferProductsSignature(products, fromLoc) {
  const list = Array.isArray(products) ? products : EMPTY_PRODUCTS;
  const loc = fromLoc === 'stock2' ? 'stock2' : 'stock1';
  let hash = ((list.length | 0) * 31 + (loc === 'stock2' ? 2 : 1)) | 0;
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    if (!p || typeof p !== 'object') {
      hash = (hash * 31 + 7) | 0;
      continue;
    }
    const id = String(p.id ?? '');
    for (let j = 0; j < id.length; j += 1) hash = (hash * 31 + id.charCodeAt(j)) | 0;
    // الكمية قد تكون كسوراً (منتجات بالغرام/الكيلو) → ثابت 100 للمقارنة.
    hash = (hash * 31 + (Math.round(Number(p.stock || 0) * 100) | 0)) | 0;
    const rest = `${p.stockLocation || ''}|${p.barcode || ''}|${p.name || ''}`;
    for (let j = 0; j < rest.length; j += 1) hash = (hash * 31 + rest.charCodeAt(j)) | 0;
  }
  return `${list.length}:${loc}:${hash}`;
}

/**
 * بناء الفهرس: يبقي فقط المنتجات القابلة للتحويل من `fromLoc` (بنفس الموقع
 * وفيها كمية موجبة). يتجاوز الصفوف غير الصالحة بدل أن يسمح لها بتسميم
 * المقارنات.
 */
export function buildTransferProductIndex(products, fromLoc) {
  const list = Array.isArray(products) ? products : EMPTY_PRODUCTS;
  const loc = fromLoc === 'stock2' ? 'stock2' : 'stock1';
  const entries = [];
  const byId = new Map();
  const byBarcode = new Map();

  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    if (!p || typeof p !== 'object') continue;
    if (transferProductLocation(p) !== loc) continue;
    if (!(Number(p.stock || 0) > 0)) continue;
    const id = String(p.id ?? '');
    if (!id) continue;

    const barcodeN = normalizeSearchText(p.barcode || '');
    const text = normalizeSearchText(
      [p.name, p.weight, p.brand, p.category, p.barcode].filter(Boolean).join(' ')
    );
    const entry = { id, product: p, barcodeN, text };

    // المعرّف المكرر: الأخير يفوز في الخرائط، والقديم يُستبدل في القائمة.
    const prev = byId.get(id);
    if (prev) {
      const idx = entries.indexOf(prev);
      if (idx >= 0) entries[idx] = entry;
    } else {
      entries.push(entry);
    }
    byId.set(id, entry);
    if (barcodeN && (!byBarcode.has(barcodeN) || byBarcode.get(barcodeN) === prev)) {
      byBarcode.set(barcodeN, entry);
    }
  }

  return { fromLoc: loc, entries, byId, byBarcode, size: entries.length };
}

/**
 * استعلام الفهرس:
 *   - استعلام فارغ → كل المنتجات القابلة للتحويل (حتى `limit`)؛
 *   - كودبار مطابق بدقة → نتيجة واحدة فورية O(1)؛
 *   - غير ذلك → مطابقة جزئية بمنطق AND: كل كلمات الاستعلام يجب أن توجد في
 *     نص المنتج المُطبَّع مسبقاً (بلا إعادة تطبيع ولا فرز: ترتيب المصدر
 *     مستقر ويُظهر ما يطابق كما تُدخل).
 */
export function searchTransferProducts(index, query, { limit = 50 } = {}) {
  const max = (typeof limit === 'number' && limit >= 0) ? limit : 50;
  const entries = (index && Array.isArray(index.entries)) ? index.entries : EMPTY_PRODUCTS;
  const q = normalizeSearchText(query);
  if (!q) return entries.slice(0, max).map((e) => e.product);

  const exact = index && index.byBarcode ? index.byBarcode.get(q) : undefined;
  if (exact) return [exact.product];

  const tokens = q.split(' ').filter(Boolean);
  const out = [];
  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    if (!entry.text) continue;
    let ok = true;
    for (let j = 0; j < tokens.length; j += 1) {
      if (!entry.text.includes(tokens[j])) { ok = false; break; }
    }
    if (ok) {
      out.push(entry.product);
      if (out.length >= max) break;
    }
  }
  return out;
}

/**
 * فهرس مخزّن مؤقتاً: `get(products, fromLoc)` يعيد نفس الكائن ما دامت
 * البصمة (`transferProductsSignature`) لم تتغيّر، وإلا أعاد البناء. هذا هو
 * الحال المستقر لبحث «أثناء الكتابة»: قراءة من الفهرس بلا إعادة بناء.
 */
export function createTransferProductIndexer() {
  let cachedIndex = null;
  let cachedSig = null;

  function get(products, fromLoc) {
    const list = Array.isArray(products) ? products : EMPTY_PRODUCTS;
    const loc = fromLoc === 'stock2' ? 'stock2' : 'stock1';
    const sig = transferProductsSignature(list, loc);
    if (!cachedIndex || sig !== cachedSig || cachedIndex.fromLoc !== loc) {
      cachedIndex = buildTransferProductIndex(list, loc);
      cachedSig = sig;
    }
    return cachedIndex;
  }

  function invalidate() {
    cachedIndex = null;
    cachedSig = null;
  }

  return { get, invalidate };
}
