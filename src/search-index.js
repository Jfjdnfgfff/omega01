// ============================================================================
// فهرس البحث السريع للمشتركين والمنتجات — Fast Search Index
// ----------------------------------------------------------------------------
// يبني فهارس في الذاكرة (Map) لقسمي المشترken والمنتجات ताकي يكون البحث
// عن اسم / هاتف / باركود / معرف فورياً O(1) للمطابقات الدقيقة وO(عدد النتائج)
// للبحث الجزئي، بدلاً من مسح كامل القائمة (O(n)) في كل ضغطة مفتاح.
//
// الفهارس المدعومة:
//   العملاء: المعرف، الهاتف (أرقام فقط)، الباركود، أسماء الكلمات (اسم، لقب، ملاحظات)
//   المنتجات: المعرف، الباركود، اسم المنتج، العلامة التجارية، التصنيف
//
// التقويم العربي المطبق يتطابق مع normalizeSearchText في main.js (الألف،
// الياء، التاء المربوطة، الأرقام العربية/hindi) بحيث يعطي البحث نتائج متساوية.
// ============================================================================

// تطبيع نص البحث (متطابق مع main.js ليبقى السلوك متسقاً بين الفهرس والواجهة)
function normalizeSearchText(value) {
  return String(value || '')
    .replace(/[\u064B-\u065F\u0670\u0640]/g, '')      // حركات وتش
    .replace(/[أإآٱ]/g, 'ا')                          // توحيد الألف
    .replace(/ى/g, 'ي')                               // אלف منقوصة -> ياء
    .replace(/ة/g, 'ه')                               // تاء مربوطة -> هاء
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)) // أرقام عربية extended
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06F0)) // أرقام فارسية
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text) {
  return normalizeSearchText(text).split(' ').filter(Boolean);
}

// أرقام الهاتف فقط للمطابقة الرقمية
function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

// أوزان نوع المطابقة (كلما ارتفع كانت المطابقة أوضح)
const WEIGHT = { exact: 5, prefix: 4, contains: 2, digits: 3 };

function bestFieldMatch(normalizedField, token) {
  if (!normalizedField || !token) return 0;
  if (normalizedField === token) return WEIGHT.exact;
  if (normalizedField.startsWith(token)) return WEIGHT.prefix;
  if (normalizedField.includes(token)) return WEIGHT.contains;
  return 0;
}

export function createSearchIndex() {
  // ------------------- فهارس العملاء -------------------
  const customersById = new Map();          // id -> customer object
  const customersByPhone = new Map();       // أرقام الهاتف -> مجموعة معرّفات
  const customersByBarcode = new Map();     // الباركود -> مجموعة معرّفات
  const customerNameTokens = new Map();     // كلمة اسم -> مجموعة معرّفات

  // ------------------- فهارس المنتجات -------------------
  const productsById = new Map();           // id -> product object
  const productsByBarcode = new Map();      // الباركود -> مجموعة معرّفات
  const productNameTokens = new Map();      // كلمة اسم -> مجموعة معرّفات
  const productCategoryTokens = new Map();  // كلمة تصنيف -> مجموعة معرّفات
  const productBrandTokens = new Map();     // كلمة ماركة -> مجموعة معرّفات

  let version = 0;
  let lastBuiltAt = null;

  const now = () => Date.now();

  // ----內部 helpers ----
  function addToTokenMap(map, token, id) {
    if (!token) return;
    let set = map.get(token);
    if (!set) { set = new Set(); map.set(token, set); }
    set.add(id);
  }

  function indexCustomer(c) {
    if (!c || typeof c !== 'object') return;
    const id = String(c.id || c._rtdbKey || '');
    if (!id) return;
    customersById.set(id, c);

    const phone = digitsOnly(c.phone);
    if (phone) addToTokenMap(customersByPhone, phone, id);
    if (c.barcode) addToTokenMap(customersByBarcode, String(c.barcode).trim().toLowerCase(), id);

    const nameFields = [
      c.name, c.nickname, c.notes,
      typeof c.fullName === 'string' ? c.fullName : ''
    ];
    for (const field of nameFields) {
      for (const tok of tokenize(field)) addToTokenMap(customerNameTokens, tok, id);
    }
  }

  function indexProduct(p) {
    if (!p || typeof p !== 'object') return;
    const id = String(p.id || p._rtdbKey || p.barcode || '');
    if (!id) return;
    productsById.set(id, p);

    if (p.barcode) addToTokenMap(productsByBarcode, String(p.barcode).trim().toLowerCase(), id);
    for (const tok of tokenize(p.name)) addToTokenMap(productNameTokens, tok, id);
    for (const tok of tokenize(p.category)) addToTokenMap(productCategoryTokens, tok, id);
    for (const tok of tokenize(p.brand)) addToTokenMap(productBrandTokens, tok, id);
  }

  function indexCustomers(list) {
    for (const c of (list || [])) indexCustomer(c);
    version += 1;
    lastBuiltAt = now();
  }

  function indexProducts(list) {
    for (const p of (list || [])) indexProduct(p);
    version += 1;
    lastBuiltAt = now();
  }

  function clear() {
    customersById.clear();
    customersByPhone.clear();
    customersByBarcode.clear();
    customerNameTokens.clear();
    productsById.clear();
    productsByBarcode.clear();
    productNameTokens.clear();
    productCategoryTokens.clear();
    productBrandTokens.clear();
    version += 1;
    lastBuiltAt = now();
  }

  function rebuild({ customers, products } = {}) {
    clear();
    if (Array.isArray(customers)) indexCustomers(customers);
    if (Array.isArray(products)) indexProducts(products);
    return stats();
  }

  // ---- استرجاع معرّفات مطابقة لاستفسار واحد (كل كلمة يجب أن تطابق حقلاً ما) ----
  function intersectSets(sets) {
    if (!sets.length) return new Set();
    // ابدأ بالأصغرsubset لأداء أفضل
    const sorted = [...sets].sort((a, b) => a.size - b.size);
    const result = new Set(sorted[0]);
    for (let i = 1; i < sorted.length; i++) {
      const other = sorted[i];
      for (const id of result) if (!other.has(id)) result.delete(id);
      if (result.size === 0) break;
    }
    return result;
  }

  function candidateIdsForCustomer(query) {
    const tokens = tokenize(query);
    if (!tokens.length) return null; // null = الجميع
    const sets = [];
    for (const tok of tokens) {
      const perToken = new Set();
      // مطابقة مباشرة بالهاتف أو الباركود
      if (/^\d+$/.test(tok) && tok.length >= 4) {
        const byPhone = customersByPhone.get(tok);
        if (byPhone) for (const id of byPhone) perToken.add(id);
      }
      const byBc = customersByBarcode.get(tok);
      if (byBc) for (const id of byBc) perToken.add(id);
      // مطابقة بالكلمات الاسمية
      const byTok = customerNameTokens.get(tok);
      if (byTok) for (const id of byTok) perToken.add(id);
      // مطابقة بالمعرف المباشر
      if (customersById.has(tok)) perToken.add(tok);
      sets.push(perToken);
    }
    return intersectSets(sets);
  }

  function candidateIdsForProduct(query) {
    const tokens = tokenize(query);
    if (!tokens.length) return null;
    const sets = [];
    for (const tok of tokens) {
      const perToken = new Set();
      const byBc = productsByBarcode.get(tok);
      if (byBc) for (const id of byBc) perToken.add(id);
      const byName = productNameTokens.get(tok);
      if (byName) for (const id of byName) perToken.add(id);
      const byCat = productCategoryTokens.get(tok);
      if (byCat) for (const id of byCat) perToken.add(id);
      const byBrand = productBrandTokens.get(tok);
      if (byBrand) for (const id of byBrand) perToken.add(id);
      if (productsById.has(tok)) perToken.add(tok);
      sets.push(perToken);
    }
    return intersectSets(sets);
  }

  // ---- تقييم وترتيب نتيجة واحدة ----
  function scoreCustomer(c, tokens) {
    if (!tokens.length) return 0;
    const nameN = normalizeSearchText(c.name || '');
    const nickN = normalizeSearchText(c.nickname || '');
    const notesN = normalizeSearchText(c.notes || '');
    const phoneD = digitsOnly(c.phone);
    const bcN = normalizeSearchText(String(c.barcode || ''));
    let score = 0;
    let matchedTokens = 0;
    for (const tok of tokens) {
      let best = 0;
      best = Math.max(best, bestFieldMatch(nameN, tok), bestFieldMatch(nickN, tok), bestFieldMatch(notesN, tok));
      best = Math.max(best, bestFieldMatch(bcN, tok));
      if (/^\d+$/.test(tok) && tok.length >= 4) best = Math.max(best, bestFieldMatch(phoneD, tok));
      if (best > 0) { matchedTokens += 1; score += best; }
    }
    if (matchedTokens !== tokens.length) return 0; // كل الكلمات يجب أن توجد (AND)
    return score;
  }

  function scoreProduct(p, tokens) {
    if (!tokens.length) return 0;
    const nameN = normalizeSearchText(p.name || '');
    const catN = normalizeSearchText(p.category || '');
    const brandN = normalizeSearchText(p.brand || '');
    const bcN = normalizeSearchText(String(p.barcode || ''));
    let score = 0;
    let matchedTokens = 0;
    for (const tok of tokens) {
      let best = 0;
      best = Math.max(best, bestFieldMatch(nameN, tok), bestFieldMatch(catN, tok), bestFieldMatch(brandN, tok), bestFieldMatch(bcN, tok));
      if (best > 0) { matchedTokens += 1; score += best; }
    }
    if (matchedTokens !== tokens.length) return 0;
    return score;
  }

  // ---- واجهات البحث العامة ----
  function searchCustomers(query, { limit = 50 } = {}) {
    const list = Array.from(customersById.values());
    const tokens = tokenize(query);
    if (!tokens.length) {
      return list.slice(0, limit);
    }
    const candIds = candidateIdsForCustomer(query);
    const scored = [];
    if (candIds) {
      for (const id of candIds) {
        const c = customersById.get(id);
        if (!c) continue;
        const s = scoreCustomer(c, tokens);
        if (s > 0) scored.push({ item: c, score: s });
      }
    } else {
      // استفسار فارغ → الكل
      for (const c of list) scored.push({ item: c, score: 0 });
    }
    scored.sort((a, b) => b.score - a.score || String(a.item.name || '').localeCompare(String(b.item.name || ''), 'ar'));
    return scored.slice(0, Math.max(0, limit)).map(x => x.item);
  }

  function searchProducts(query, { limit = 50 } = {}) {
    const list = Array.from(productsById.values());
    const tokens = tokenize(query);
    if (!tokens.length) {
      return list.slice(0, limit);
    }
    const candIds = candidateIdsForProduct(query);
    const scored = [];
    if (candIds) {
      for (const id of candIds) {
        const p = productsById.get(id);
        if (!p) continue;
        const s = scoreProduct(p, tokens);
        if (s > 0) scored.push({ item: p, score: s });
      }
    } else {
      for (const p of list) scored.push({ item: p, score: 0 });
    }
    scored.sort((a, b) => b.score - a.score || String(a.item.name || '').localeCompare(String(b.item.name || ''), 'ar'));
    return scored.slice(0, Math.max(0, limit)).map(x => x.item);
  }

  function countCustomers(query) {
    return searchCustomers(query, { limit: Infinity }).length;
  }

  function countProducts(query) {
    return searchProducts(query, { limit: Infinity }).length;
  }

  function getCustomerById(id) {
    if (id == null) return undefined;
    return customersById.get(String(id)) || undefined;
  }

  function getProductById(id) {
    if (id == null) return undefined;
    return productsById.get(String(id)) || undefined;
  }

  function getCustomerByPhone(phone) {
    if (!phone) return undefined;
    const set = customersByPhone.get(digitsOnly(phone));
    if (!set || set.size === 0) return undefined;
    return customersById.get([...set][0]) || undefined;
  }

  function getProductByBarcode(barcode) {
    if (!barcode) return undefined;
    const set = productsByBarcode.get(String(barcode).trim().toLowerCase());
    if (!set || set.size === 0) return undefined;
    return productsById.get([...set][0]) || undefined;
  }

  // تحديث تدريجي عند إضافة / تعديل / حذف عنصر واحد
  function addCustomer(c) { indexCustomer(c); }
  function addProduct(p) { indexProduct(p); }
  function removeCustomer(id) {
    if (id == null) return;
    const c = customersById.get(String(id));
    if (!c) return;
    customersById.delete(id);
    const phone = digitsOnly(c.phone);
    if (phone) { const s = customersByPhone.get(phone); if (s) { s.delete(id); if (!s.size) customersByPhone.delete(phone); } }
    if (c.barcode) { const s = customersByBarcode.get(String(c.barcode).trim().toLowerCase()); if (s) { s.delete(id); if (!s.size) customersByBarcode.delete(String(c.barcode).trim().toLowerCase()); } }
    for (const field of [c.name, c.nickname, c.notes]) {
      for (const tok of tokenize(field)) {
        const s = customerNameTokens.get(tok);
        if (s) { s.delete(id); if (!s.size) customerNameTokens.delete(tok); }
      }
    }
    version += 1;
  }
  function removeProduct(id) {
    if (id == null) return;
    const p = productsById.get(String(id));
    if (!p) return;
    productsById.delete(id);
    if (p.barcode) { const s = productsByBarcode.get(String(p.barcode).trim().toLowerCase()); if (s) { s.delete(id); if (!s.size) productsByBarcode.delete(String(p.barcode).trim().toLowerCase()); } }
    for (const field of [p.name, p.category, p.brand]) {
      for (const tok of tokenize(field)) {
        const s = (field === p.name ? productNameTokens : field === p.category ? productCategoryTokens : productBrandTokens).get(tok);
        if (s) { s.delete(id); if (!s.size) (field === p.name ? productNameTokens : field === p.category ? productCategoryTokens : productBrandTokens).delete(tok); }
      }
    }
    version += 1;
  }

  function stats() {
    return {
      version,
      lastBuiltAt: lastBuiltAt ? new Date(lastBuiltAt).toISOString() : null,
      customers: customersById.size,
      products: productsById.size,
      customerNameTokens: customerNameTokens.size,
      productNameTokens: productNameTokens.size,
    };
  }

  return {
    indexCustomers,
    indexProducts,
    rebuild,
    clear,
    searchCustomers,
    searchProducts,
    countCustomers,
    countProducts,
    getCustomerById,
    getProductById,
    getCustomerByPhone,
    getProductByBarcode,
    addCustomer,
    addProduct,
    removeCustomer,
    removeProduct,
    stats,
  };
}
