const KG_TOKENS = ['kg', 'kgs', 'kilo', 'kilos', 'كغ', 'كلغ', 'كجم', 'كيلو'];
const GRAM_TOKENS = ['g', 'gr', 'gram', 'grams', 'غرام', 'جرام', 'غم'];
const WEIGHT_TYPES = ['الوزن', 'weight'];
const GRAMS_PER_KG = 1000;

function roundTo(value, decimals) {
    const factor = 10 ** decimals;
    return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function containsToken(text, tokens) {
    return tokens.some(token => text.includes(token));
}

// "الوزن - 2.5kg" -> { type: 'الوزن', value: 2.5, isGrams: false }
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
    const isGrams = !isKg && containsToken(unitText, GRAM_TOKENS);
    return {
        raw,
        type,
        value,
        unitText,
        isGrams,
        hasWeightUnit: isKg || isGrams,
        unitLabel: isGrams ? 'غرام' : 'كغ'
    };
}

// Only products measured by weight (kg / g) can be sold by the kilo.
export function isWeightSaleProduct(product, spec) {
    if (!product) return false;
    const weightSpec = spec || parseWeightSpec(product.weight);
    const type = String(weightSpec.type || '').trim();
    if (type) return WEIGHT_TYPES.includes(type) || WEIGHT_TYPES.includes(type.toLowerCase());
    // Legacy/imported rows may carry no measurement type: trust the unit itself,
    // but only when there is an actual number to weigh.
    return weightSpec.hasWeightUnit && Number.isFinite(weightSpec.value);
}

// How many stock units one kilogram represents for this product.
export function stockUnitsPerKg(product, spec) {
    const weightSpec = spec || parseWeightSpec(product?.weight);
    return weightSpec.isGrams ? GRAMS_PER_KG : 1;
}

export function resolveKiloStockDeduction(product, qtyKg, spec) {
    const qty = Number(qtyKg);
    if (!Number.isFinite(qty) || qty <= 0) return 0;
    return roundTo(qty * stockUnitsPerKg(product, spec), 3);
}

// A kilo sale is priced per kilogram with a price chosen at sale time, and it
// deducts the sold weight from stock instead of whole packages.
export function resolveKiloSale({ product, qtyKg, pricePerKg } = {}) {
    const spec = parseWeightSpec(product?.weight);
    if (!isWeightSaleProduct(product, spec)) {
        return { valid: false, error: 'not_a_weight_product', spec };
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
    const packSize = Number(spec.value);
    const costPerStockUnit = (Number.isFinite(packSize) && packSize > 0) ? unitCost / packSize : unitCost;

    return {
        valid: true,
        error: '',
        spec,
        qtyKg: roundTo(qty, 3),
        pricePerKg: roundTo(price, 2),
        stockDeduction,
        cost: roundTo(costPerStockUnit * stockDeduction, 2),
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
