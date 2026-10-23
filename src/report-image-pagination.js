// Break tall report canvases into individual portrait-oriented PNG pages.
// The source canvas is rendered at 1050 CSS pixels wide, so this keeps each
// exported image close to an A4 portrait page without making one giant PNG.
export const REPORT_IMAGE_PAGE_HEIGHT_CSS = 1485;

/**
 * Return non-overlapping canvas slices, preferring nearby DOM element boundaries
 * so table rows and report sections are less likely to be cut between images.
 */
export function createReportPageRanges(totalHeight, pageHeight, breakpoints = []) {
    const height = Math.max(0, Math.floor(Number(totalHeight) || 0));
    if (!height) return [];
    const requestedPageHeight = Number(pageHeight);
    const maxPageHeight = Number.isFinite(requestedPageHeight) && requestedPageHeight > 0
        ? Math.max(1, Math.floor(requestedPageHeight))
        : height;

    const boundaries = [...new Set((Array.isArray(breakpoints) ? breakpoints : [])
        .map(value => Math.floor(Number(value)))
        .filter(value => Number.isFinite(value) && value > 0 && value < height))]
        .sort((a, b) => a - b);

    const pages = [];
    let top = 0;
    while (top < height) {
        const targetEnd = Math.min(height, top + maxPageHeight);
        let end = targetEnd;

        if (targetEnd < height && boundaries.length) {
            // Prefer a break close to the bottom of the page. If no suitable
            // boundary is before the target, allow a small overflow to the next
            // row/section boundary rather than cutting through it.
            const minPreferredEnd = top + Math.floor(maxPageHeight * 0.72);
            const maxPreferredEnd = Math.min(height - 1, top + Math.floor(maxPageHeight * 1.08));
            const beforeTarget = boundaries.filter(value => value >= minPreferredEnd && value <= targetEnd);
            if (beforeTarget.length) {
                end = beforeTarget[beforeTarget.length - 1];
            } else {
                const afterTarget = boundaries.find(value => value > targetEnd && value <= maxPreferredEnd);
                if (afterTarget) end = afterTarget;
            }
        }

        if (end <= top) end = targetEnd;
        pages.push({ top, height: end - top });
        top = end;
    }
    return pages;
}
