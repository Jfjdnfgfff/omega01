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
