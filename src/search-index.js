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
  const customerNormById = new Map();       // id -> { nameN, nickN, notesN, phoneD, bcN }
  const customersByPhone = new Map();       // أرقام الهاتف -> مجموعة معرّفات
  const customersByBarcode = new Map();     // الباركود -> مجموعة معرّفات
  const customersByPassword = new Map();    // كلمة مرور المشترك (4 أرقام) -> مجموعة معرّفات
  const customerNameTokens = new Map();     // كلمة اسم -> مجموعة معرّفات

  // ------------------- فهارس المنتجات -------------------
  const productsById = new Map();           // id -> product object
  const productNormById = new Map();        // id -> { nameN, catN, brandN, bcN }
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
    const nameN = normalizeSearchText(c.name || '');
    const nickN = normalizeSearchText(c.nickname || '');
    const notesN = normalizeSearchText(c.notes || '');
    const fullNameN = typeof c.fullName === 'string' ? normalizeSearchText(c.fullName) : '';
    const bcN = normalizeSearchText(String(c.barcode || ''));
    const passwordD = digitsOnly(c.password);
    customerNormById.set(id, { nameN, nickN, notesN, phoneD: phone, bcN, passwordD });

    if (phone) addToTokenMap(customersByPhone, phone, id);
    if (c.barcode) addToTokenMap(customersByBarcode, String(c.barcode).trim().toLowerCase(), id);
    if (passwordD) addToTokenMap(customersByPassword, passwordD, id);

    for (const norm of [nameN, nickN, notesN, fullNameN]) {
      if (!norm) continue;
      for (const tok of norm.split(' ')) {
        if (tok) addToTokenMap(customerNameTokens, tok, id);
      }
    }
  }

  function indexProduct(p) {
    if (!p || typeof p !== 'object') return;
    const id = String(p.id || p._rtdbKey || p.barcode || '');
    if (!id) return;
    productsById.set(id, p);

    const nameN = normalizeSearchText(p.name || '');
    const catN = normalizeSearchText(p.category || '');
    const brandN = normalizeSearchText(p.brand || '');
    const bcN = normalizeSearchText(String(p.barcode || ''));
    productNormById.set(id, { nameN, catN, brandN, bcN });

    if (p.barcode) addToTokenMap(productsByBarcode, String(p.barcode).trim().toLowerCase(), id);
    if (nameN) for (const tok of nameN.split(' ')) if (tok) addToTokenMap(productNameTokens, tok, id);
    if (catN) for (const tok of catN.split(' ')) if (tok) addToTokenMap(productCategoryTokens, tok, id);
    if (brandN) for (const tok of brandN.split(' ')) if (tok) addToTokenMap(productBrandTokens, tok, id);
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
    customerNormById.clear();
    customersByPhone.clear();
    customersByBarcode.clear();
    customersByPassword.clear();
    customerNameTokens.clear();
    productsById.clear();
    productNormById.clear();
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

  function addPrefixOrSubstringMatches(tokenMap, needle, targetSet) {
    for (const [indexedTok, ids] of tokenMap) {
      if (indexedTok.includes(needle)) {
        for (const id of ids) targetSet.add(id);
      }
    }
  }

  function candidateIdsForCustomer(query) {
    const tokens = tokenize(query);
    if (!tokens.length) return null; // null = الجميع
    const sets = [];
    for (const tok of tokens) {
      const perToken = new Set();
      const isDigits = /^\d+$/.test(tok);
      // مطابقة مباشرة وجزئية بالهاتف أو الباركود
      if (isDigits && tok.length >= 2) {
        const byPhone = customersByPhone.get(tok);
        if (byPhone) {
          for (const id of byPhone) perToken.add(id);
        }
        addPrefixOrSubstringMatches(customersByPhone, tok, perToken);
      }
      const byBc = customersByBarcode.get(tok);
      if (byBc) for (const id of byBc) perToken.add(id);
      if (tok.length >= 2) addPrefixOrSubstringMatches(customersByBarcode, tok, perToken);
      // مطابقة كلمة مرور المشترك (4 أرقام)
      const byPassword = customersByPassword.get(tok);
      if (byPassword) for (const id of byPassword) perToken.add(id);
      // مطابقة بالكلمات الاسمية (تامة + بادئة/جزئية للكتابة الحية السريعة)
      const byTok = customerNameTokens.get(tok);
      if (byTok) for (const id of byTok) perToken.add(id);
      addPrefixOrSubstringMatches(customerNameTokens, tok, perToken);
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
      if (tok.length >= 2) addPrefixOrSubstringMatches(productsByBarcode, tok, perToken);
      const byName = productNameTokens.get(tok);
      if (byName) for (const id of byName) perToken.add(id);
      addPrefixOrSubstringMatches(productNameTokens, tok, perToken);
      const byCat = productCategoryTokens.get(tok);
      if (byCat) for (const id of byCat) perToken.add(id);
      addPrefixOrSubstringMatches(productCategoryTokens, tok, perToken);
      const byBrand = productBrandTokens.get(tok);
      if (byBrand) for (const id of byBrand) perToken.add(id);
      addPrefixOrSubstringMatches(productBrandTokens, tok, perToken);
      if (productsById.has(tok)) perToken.add(tok);
      sets.push(perToken);
    }
    return intersectSets(sets);
  }

  // ---- تقييم وترتيب نتيجة واحدة (باستخدام الحقول المطبّعة المخزنة مسبقاً) ----
  function scoreCustomer(c, tokens, idKey) {
    if (!tokens.length) return 0;
    const cached = idKey ? customerNormById.get(idKey) : null;
    const nameN = cached ? cached.nameN : normalizeSearchText(c.name || '');
    const nickN = cached ? cached.nickN : normalizeSearchText(c.nickname || '');
    const notesN = cached ? cached.notesN : normalizeSearchText(c.notes || '');
    const phoneD = cached ? cached.phoneD : digitsOnly(c.phone);
    const bcN = cached ? cached.bcN : normalizeSearchText(String(c.barcode || ''));
    const passwordD = cached ? (cached.passwordD || '') : digitsOnly(c.password);
    let score = 0;
    let matchedTokens = 0;
    for (const tok of tokens) {
      let best = 0;
      best = Math.max(best, bestFieldMatch(nameN, tok), bestFieldMatch(nickN, tok), bestFieldMatch(notesN, tok));
      best = Math.max(best, bestFieldMatch(bcN, tok));
      if (/^\d+$/.test(tok) && passwordD) best = Math.max(best, passwordD === tok ? WEIGHT.exact : 0);
      if (/^\d+$/.test(tok) && tok.length >= 2) best = Math.max(best, bestFieldMatch(phoneD, tok));
      if (best > 0) { matchedTokens += 1; score += best; }
    }
    if (matchedTokens !== tokens.length) return 0; // كل الكلمات يجب أن توجد (AND)
    return score;
  }

  function scoreProduct(p, tokens, idKey) {
    if (!tokens.length) return 0;
    const cached = idKey ? productNormById.get(idKey) : null;
    const nameN = cached ? cached.nameN : normalizeSearchText(p.name || '');
    const catN = cached ? cached.catN : normalizeSearchText(p.category || '');
    const brandN = cached ? cached.brandN : normalizeSearchText(p.brand || '');
    const bcN = cached ? cached.bcN : normalizeSearchText(String(p.barcode || ''));
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
    const tokens = tokenize(query);
    if (!tokens.length) {
      const out = [];
      for (const c of customersById.values()) {
        if (out.length >= limit) break;
        out.push(c);
      }
      return out;
    }
    const candIds = candidateIdsForCustomer(query);
    const scored = [];
    if (candIds) {
      for (const id of candIds) {
        const c = customersById.get(id);
        if (!c) continue;
        const s = scoreCustomer(c, tokens, id);
        if (s > 0) scored.push({ item: c, score: s });
      }
    }
    scored.sort((a, b) => b.score - a.score || String(a.item.name || '').localeCompare(String(b.item.name || ''), 'ar'));
    return scored.slice(0, Math.max(0, limit)).map(x => x.item);
  }

  function searchProducts(query, { limit = 50 } = {}) {
    const tokens = tokenize(query);
    if (!tokens.length) {
      const out = [];
      for (const p of productsById.values()) {
        if (out.length >= limit) break;
        out.push(p);
      }
      return out;
    }
    const candIds = candidateIdsForProduct(query);
    const scored = [];
    if (candIds) {
      for (const id of candIds) {
        const p = productsById.get(id);
        if (!p) continue;
        const s = scoreProduct(p, tokens, id);
        if (s > 0) scored.push({ item: p, score: s });
      }
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
    const key = String(id);
    const c = customersById.get(key);
    if (!c) return;
    customersById.delete(key);
    customerNormById.delete(key);
    const phone = digitsOnly(c.phone);
    if (phone) { const s = customersByPhone.get(phone); if (s) { s.delete(key); if (!s.size) customersByPhone.delete(phone); } }
    if (c.barcode) { const s = customersByBarcode.get(String(c.barcode).trim().toLowerCase()); if (s) { s.delete(key); if (!s.size) customersByBarcode.delete(String(c.barcode).trim().toLowerCase()); } }
    const passwordD = digitsOnly(c.password);
    if (passwordD) { const s = customersByPassword.get(passwordD); if (s) { s.delete(key); if (!s.size) customersByPassword.delete(passwordD); } }
    for (const field of [c.name, c.nickname, c.notes]) {
      for (const tok of tokenize(field)) {
        const s = customerNameTokens.get(tok);
        if (s) { s.delete(key); if (!s.size) customerNameTokens.delete(tok); }
      }
    }
    version += 1;
  }
  function removeProduct(id) {
    if (id == null) return;
    const key = String(id);
    const p = productsById.get(key);
    if (!p) return;
    productsById.delete(key);
    productNormById.delete(key);
    if (p.barcode) { const s = productsByBarcode.get(String(p.barcode).trim().toLowerCase()); if (s) { s.delete(key); if (!s.size) productsByBarcode.delete(String(p.barcode).trim().toLowerCase()); } }
    for (const field of [p.name, p.category, p.brand]) {
      for (const tok of tokenize(field)) {
        const s = (field === p.name ? productNameTokens : field === p.category ? productCategoryTokens : productBrandTokens).get(tok);
        if (s) { s.delete(key); if (!s.size) (field === p.name ? productNameTokens : field === p.category ? productCategoryTokens : productBrandTokens).delete(tok); }
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
      customerPasswords: customersByPassword.size,
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
