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

// How many stock units one kilogram represents for this product.
export function stockUnitsPerKg(product, spec) {
    const weightSpec = spec || parseWeightSpec(product?.weight);
    // Dose stock is grams even when the measurement reads «30 دوزة»: 1 kg = 1000.
    return (weightSpec.isGrams || isDoseProduct(product, weightSpec)) ? GRAMS_PER_KG : 1;
}

// The unit the kilo deduction is shown in (غرام for gram/dose stock, كغ otherwise).
export function kiloStockUnitLabel(product, spec) {
    return (spec || parseWeightSpec(product?.weight)).unitLabel;
}

export function resolveKiloStockDeduction(product, qtyKg, spec) {
    const qty = Number(qtyKg);
    if (!Number.isFinite(qty) || qty <= 0) return 0;
    return roundTo(qty * stockUnitsPerKg(product, spec), 3);
}

// A kilo sale is priced per kilogram with a price chosen at sale time, and it
// deducts the sold weight from stock instead of whole packages/doses.
export function resolveKiloSale({ product, qtyKg, pricePerKg } = {}) {
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
    // Cost follows the same denominator as the stock deduction, so selling a part of
    // a package costs the matching part of the package purchase price.
    const unitCost = Number(product?.cost || 0);
    const isDose = isDoseProduct(product, spec);
    const packSize = Number(spec.value);
    // For a dose product the measurement number counts doses, not stock units, and the
    // recorded cost is the cost of one stock unit — exactly what a normal (per-dose)
    // sale of that product multiplies by. So the kilo cost stays `cost × qty in kg`,
    // which keeps the kilo and normal modes in agreement.
    const costPerStockUnit = (!isDose && Number.isFinite(packSize) && packSize > 0)
        ? unitCost / packSize
        : unitCost;
    const cost = isDose
        ? roundTo(unitCost * qty, 2)
        : roundTo(costPerStockUnit * stockDeduction, 2);

    return {
        valid: true,
        error: '',
        spec,
        isDose,
        qtyKg: roundTo(qty, 3),
        pricePerKg: roundTo(price, 2),
        stockDeduction,
        cost,
        total: roundTo(price * qty, 2),
        qtyUnit: 'kg',
        stockUnitLabel: spec.unitLabel
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
