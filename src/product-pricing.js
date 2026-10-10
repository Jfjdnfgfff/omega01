const KG_TOKENS = ['kg', 'kgs', 'kilo', 'kilos', 'كغ', 'كلغ', 'كجم', 'كيلو'];
const GRAM_TOKENS = ['g', 'gr', 'gram', 'grams', 'غرام', 'جرام', 'غم'];
const WEIGHT_TYPES = ['الوزن', 'weight'];
const GRAMS_PER_KG = 1000;
// «الدوزة» (protein/supplement doses) is measured per dose but the tub itself is
// bought by weight, so its stock is kept in grams: selling 1 kg moves 1000 units.
const DOSE_CATEGORY = 'doses';
const DOSE_TYPE_TOKENS = ['doza', 'dose', 'دوز', 'جرع'];

function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function containsToken(text, tokens) {
    return tokens.some(token => text.includes(token));
}

// "الوزن - 2.5kg" -> { type: 'الوزن', value: 2.5, isGrams: false }
// "الكمية (Doza) - 30 دوزة" -> { type: 'الكمية (Doza)', value: 30, isGrams: true, isDose: true }
// The stored measurement is `{weightType} - {weightValue}`, and the numeric part is
// what the legacy stock deduction multiplies by, so the stock of a weighed product
// is denominated in the same unit that is written in its measurement (kg or g).
export function parseWeightSpec(weightStr) {
    const raw = String(weightStr ?? '').trim();
    const empty = { raw, type: '', value: null, unitText: '', isGrams: false, hasWeightUnit: false, unitLabel: 'كغ' };
    if (!raw) return empty;

    const parts = raw.split(' - ');
    const type = parts.length > 1 ? parts[0].trim() : '';
    const valuePart = parts.length > 1 ? parts.slice(1).join(' - ').trim() : raw;
    const match = valuePart.match(/(\d+(\.\d+)?)/);
    const value = match ? parseFloat(match[1]) : null;
    const unitText = (match ? valuePart.slice(match.index + match[0].length) : valuePart).trim().toLowerCase();

    const isKg = containsToken(unitText, KG_TOKENS);
    const isGramsRaw = !isKg && containsToken(unitText, GRAM_TOKENS);
    // «الكمية (Doza)» counts doses, but the tub behind them is bought by weight:
    // its stock is denominated in grams, so a dose product is a gram-denominated one.
    const isDoseType = containsToken(type.toLowerCase(), DOSE_TYPE_TOKENS);
    const isGrams = isGramsRaw || isDoseType;
    return {
        raw,
        type,
        value,
        unitText,
        isGrams,
        isDose: isDoseType,
        hasWeightUnit: isKg || isGrams,
        unitLabel: isGrams ? 'غرام' : 'كغ'
    };
}

// Only products measured by weight (kg / g) are "weight" products.
export function isWeightSaleProduct(product, spec) {
    if (!product) return false;
    const weightSpec = spec || parseWeightSpec(product.weight);
    const type = String(weightSpec.type || '').trim();
    if (type) return WEIGHT_TYPES.includes(type) || WEIGHT_TYPES.includes(type.toLowerCase());
    // Legacy/imported rows may carry no measurement type: trust the unit itself,
    // but only when there is an actual number to weigh.
    return weightSpec.hasWeightUnit && Number.isFinite(weightSpec.value);
}

// A "dose" product (بروتين بالجرعة) is sold per dose normally, and by the kilo when the
// customer wants a part of the tub. It is recognised by its category, or — when the
// category was never set — by a «الكمية (Doza)» measurement.
export function isDoseProduct(product, spec) {
    if (!product) return false;
    const category = String(product.category || '').toLowerCase().trim();
    if (category === DOSE_CATEGORY) return true;
    if (category === 'boxes' || category === 'frigo') return false;
    return (spec || parseWeightSpec(product.weight)).isDose;
}

// Who gets the ⚖️ sell-by-kilo switch: weighed products and dose products.
export function isKiloSaleProduct(product, spec) {
    if (!product) return false;
    const weightSpec = spec || parseWeightSpec(product.weight);
    return isWeightSaleProduct(product, weightSpec) || isDoseProduct(product, weightSpec);
}

// Every product that is priced by the gram keeps its stock in grams — a dose product
// and a weighed one alike — so one kilogram is always 1000 stock units.
export function stockUnitsPerKg(product, spec) {
    const weightSpec = spec || parseWeightSpec(product?.weight);
    return isKiloSaleProduct(product, weightSpec) ? GRAMS_PER_KG : 1;
}

// The unit a stock quantity is counted in: grams for gram-priced products, pieces
// for everything else.
export function stockUnitWord(product, spec) {
    return isKiloSaleProduct(product, spec) ? 'غ' : 'قطعة';
}

// The unit the kilo deduction is shown in — grams, since that is what the stock holds.
export function kiloStockUnitLabel(product, spec) {
    return isKiloSaleProduct(product, spec) ? 'غرام' : (spec || parseWeightSpec(product?.weight)).unitLabel;
}

export function resolveKiloStockDeduction(product, qtyKg, spec) {
    const qty = Number(qtyKg);
    if (!Number.isFinite(qty) || qty <= 0) return 0;
    return roundTo(qty * stockUnitsPerKg(product, spec), 3);
}

// What a whole-unit sale (dose / package) removes from stock: for gram-priced products
// it is the grams of that unit, so it matches the kilo and the per-gram modes.
export function resolveUnitStockDeduction(product, qty, spec) {
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) return 0;
    const weightSpec = spec || parseWeightSpec(product?.weight);
    if (isGramPricedProduct(product, weightSpec)) {
        return roundTo(q * gramsPerUnit(product, weightSpec), 3);
    }
    const value = Number(weightSpec.value);
    return roundTo(q * ((Number.isFinite(value) && value > 0) ? value : 1), 3);
}

// A kilo sale is priced per kilogram with a price chosen at sale time, and it
// deducts the sold weight from stock instead of whole packages/doses.
// `costPerGram` is the purchase price of one gram (سعر الغرام الواحد للشراء): when it
// is set, the cost of the sale is the grams sold × that price, which is what makes
// the net profit of a weighed sale exact. Without it the cost falls back to the
// package purchase price saved on the product.
export function resolveKiloSale({ product, qtyKg, pricePerKg, costPerGram } = {}) {
    const spec = parseWeightSpec(product?.weight);
    if (!isKiloSaleProduct(product, spec)) {
        return { valid: false, error: 'not_a_kilo_product', spec };
    }

    const qty = Number(qtyKg);
    const price = Number(pricePerKg);
    if (!Number.isFinite(qty) || qty <= 0) {
        return { valid: false, error: 'invalid_quantity', spec };
    }
    if (!Number.isFinite(price) || price <= 0) {
        return { valid: false, error: 'invalid_price', spec };
    }

    const stockDeduction = resolveKiloStockDeduction(product, qty, spec);
    const gramsSold = roundTo(qty * GRAMS_PER_KG, 3);
    const unitCost = Number(product?.cost || 0);
    const isDose = isDoseProduct(product, spec);
    const gramCost = normalizeGramPrice(costPerGram);
    // With a purchase price per gram the cost is the exact weight sold × that price.
    // Otherwise fall back to the package purchase price: the sold fraction of the
    // package (stock is grams, so `stockDeduction / gramsPerUnit`). For a dose product
    // whose dose weight was never recorded, `cost × kg sold` is the previous rule.
    const packGrams = gramsPerUnit(product, spec);
    const cost = gramCost > 0
        ? roundTo(gramCost * gramsSold, 2)
        : (isDose
            ? roundTo(unitCost * qty, 2)
            : (packGrams > 0
                ? roundTo(unitCost * (stockDeduction / packGrams), 2)
                : roundTo(unitCost * stockDeduction, 2)));
    const total = roundTo(price * qty, 2);

    return {
        valid: true,
        error: '',
        spec,
        isDose,
        qtyKg: roundTo(qty, 3),
        pricePerKg: roundTo(price, 2),
        stockDeduction,
        gramsSold,
        costPerGram: gramCost,
        cost,
        total,
        profit: roundTo(total - cost, 2),
        qtyUnit: 'kg',
        stockUnitLabel: kiloStockUnitLabel(product, spec)
    };
}

// Optional per-gram pricing for a dose (e.g. 50 g) or a weighed kilo sale.
// The entered gram price is the SELLING price of one gram; `costPerGram` is its
// purchase price, and the difference between the two is the net profit.
// The entered gram price is never saved as the product's catalog price.
export function resolveGramSale({ product, mode, qty, pricePerGram, gramsPerDose, costPerGram } = {}) {
    const quantity = Number(qty);
    const gramPrice = Number(pricePerGram);
    if (mode !== 'kilo' && (mode !== 'dose' || !isDoseProduct(product))) {
        return { valid: false, error: 'invalid_mode' };
    }
    if (mode === 'kilo' && !isKiloSaleProduct(product)) {
        return { valid: false, error: 'invalid_mode' };
    }
    if (!Number.isFinite(quantity) || quantity <= 0) return { valid: false, error: 'invalid_quantity' };
    if (pricePerGram === '' || pricePerGram === null || pricePerGram === undefined ||
        !Number.isFinite(gramPrice) || gramPrice <= 0) return { valid: false, error: 'invalid_price' };
    if (mode === 'kilo') {
        const kiloSale = resolveKiloSale({
            product, qtyKg: quantity, pricePerKg: gramPrice * GRAMS_PER_KG, costPerGram
        });
        if (!kiloSale.valid) return kiloSale;
        return { ...kiloSale, pricePerGram: gramPrice, priceBasis: 'gram', gramsSold: roundTo(quantity * GRAMS_PER_KG, 3) };
    }
    const grams = Number(gramsPerDose);
    if (gramsPerDose === '' || gramsPerDose === null || gramsPerDose === undefined ||
        !Number.isFinite(grams) || grams <= 0) return { valid: false, error: 'invalid_grams' };
    const gramsSold = roundTo(grams * quantity, 3);
    const gramCost = normalizeGramPrice(costPerGram);
    const total = roundTo(gramsSold * gramPrice, 2);
    // With a purchase price per gram the cost is the exact weight sold × that price;
    // otherwise fall back to the package cost saved on the product.
    const cost = gramCost > 0
        ? roundTo(gramCost * gramsSold, 2)
        : roundTo(Number(product?.cost || 0) * quantity, 2);
    return {
        valid: true, error: '', priceBasis: 'gram', pricePerGram: gramPrice,
        gramsPerDose: grams, gramsSold,
        stockDeduction: gramsSold, stockUnitLabel: 'غرام',
        pricePerUnit: roundTo(grams * gramPrice, 2),
        total,
        costPerGram: gramCost,
        cost,
        profit: roundTo(total - cost, 2),
        qtyUnit: 'dose'
    };
}

export function resolveSaleUnitPrice(product, { allowCustom = false, customPrice } = {}) {
    const defaultPrice = Number(product?.price ?? 0);
    if (!allowCustom || customPrice === '' || customPrice === null || customPrice === undefined) {
        return {
            unitPrice: defaultPrice,
            isCustom: false,
            valid: Number.isFinite(defaultPrice) && defaultPrice >= 0
        };
    }

    const unitPrice = Number(customPrice);
    return {
        unitPrice,
        isCustom: true,
        valid: Number.isFinite(unitPrice) && unitPrice > 0
    };
}

// Preserve fractional dinars for low gram prices (e.g. 0.025 دج/g).
export function normalizeGramPrice(value) {
    if (value === '' || value === null || value === undefined) return 0;
    const price = Number(value);
    return Number.isFinite(price) && price > 0 ? price : 0;
}

// Prefill of the SELLING gram price (سعر الغرام الواحد عند البيع) for this product.
// The purchase gram price is no longer used as a selling price, so a product saved
// before this field existed simply has no prefill.
export function defaultGramSalePrice(product) {
    const price = normalizeGramPrice(product?.gramSalePrice);
    return price > 0 ? String(price) : '';
}

// Prefill of the PURCHASE gram price (سعر الغرام الواحد للشراء) for this product.
export function defaultGramCostPrice(product) {
    const price = normalizeGramPrice(product?.gramPrice);
    return price > 0 ? String(price) : '';
}

// Purchase / selling price of one gram saved on the product (0 = not set).
export function gramCostPriceOf(product) { return normalizeGramPrice(product?.gramPrice); }
export function gramSalePriceOf(product) { return normalizeGramPrice(product?.gramSalePrice); }

// How many grams one sale unit of the product holds: one dose for a dose product,
// the measured package for a weighed product (kg converted to grams). 0 when the
// product is not priced by the gram.
export function gramsPerUnit(product, spec) {
    const weightSpec = spec || parseWeightSpec(product?.weight);
    if (isDoseProduct(product, weightSpec)) {
        const grams = Number(product?.doseGrams);
        return (Number.isFinite(grams) && grams > 0) ? roundTo(grams, 3) : 0;
    }
    if (isWeightSaleProduct(product, weightSpec)) {
        const pack = Number(weightSpec.value);
        if (!Number.isFinite(pack) || pack <= 0) return 0;
        return roundTo(weightSpec.isGrams ? pack : pack * GRAMS_PER_KG, 3);
    }
    return 0;
}

// Dose and weighed products are the ones priced by the gram, as long as the weight
// of one sale unit is known.
export function isGramPricedProduct(product, spec) {
    return isKiloSaleProduct(product, spec) && gramsPerUnit(product, spec) > 0;
}

// Both per-unit prices of a gram-priced product, derived from the two gram prices:
//   التكلفة للدوزة/العلبة = سعر غرام الشراء × غرامات الوحدة
//   سعر البيع للدوزة/العلبة = سعر غرام البيع × غرامات الوحدة
// and the net profit is the difference between them.
export function deriveUnitPricesFromGrams({ product, costPerGram, salePerGram, spec } = {}) {
    const perUnit = gramsPerUnit(product, spec);
    const cost = normalizeGramPrice(costPerGram);
    const sale = normalizeGramPrice(salePerGram);
    if (perUnit <= 0) {
        return { valid: false, error: 'no_unit_grams', gramsPerUnit: 0, cost: 0, price: 0, profit: 0 };
    }
    if (cost <= 0) {
        return { valid: false, error: 'invalid_cost_gram', gramsPerUnit: perUnit, cost: 0, price: 0, profit: 0 };
    }
    if (sale <= 0) {
        return { valid: false, error: 'invalid_sale_gram', gramsPerUnit: perUnit, cost: roundTo(cost * perUnit, 2), price: 0, profit: 0 };
    }
    return {
        valid: true,
        error: '',
        gramsPerUnit: perUnit,
        cost: roundTo(cost * perUnit, 2),
        price: roundTo(sale * perUnit, 2),
        profit: roundTo((sale - cost) * perUnit, 2)
    };
}

export function defaultDoseGrams(product) {
    const grams = Number(product?.doseGrams);
    return Number.isFinite(grams) && grams > 0 ? String(grams) : '50';
}

// The per-kilo price saved on a product when it is added (سعر الكيلو). Returns 0 when
// there is none, so callers can treat "not set" and "invalid" the same way.
export function normalizeKiloPrice(value) {
    const price = Number(value);
    return (Number.isFinite(price) && price > 0) ? roundTo(price, 2) : 0;
}

// Value to prefill the per-kilo sale price with: the price saved on the product, or ''.
export function defaultKiloSalePrice(product) {
    const price = normalizeKiloPrice(product?.kiloPrice);
    return price > 0 ? String(price) : '';
}
