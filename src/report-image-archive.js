import { zipSync } from 'fflate';

/**
 * Bundle separately named PNG pages into one download so browsers do not block
 * the remaining files in a bulk download. The archive keeps every image as an
 * individual PNG; it never stitches the report pages together.
 */
export async function createReportPagesArchive(pages) {
    const validPages = (Array.isArray(pages) ? pages : [])
        .filter(page => page && (page.blob || page.url));
    if (!validPages.length) throw new Error('No report pages to archive');

    const files = Object.create(null);
    await Promise.all(validPages.map(async (page, index) => {
        const filename = String(page.filename || `report_page_${index + 1}.png`)
            .replace(/[\\/]/g, '_')
            .replace(/^\.+/, '') || `report_page_${index + 1}.png`;
        const blob = page.blob || await fetch(page.url).then(response => {
            if (!response.ok) throw new Error(`Unable to read ${filename}`);
            return response.blob();
        });
        files[filename] = new Uint8Array(await blob.arrayBuffer());
    }));

    return new Blob([zipSync(files, { level: 0 })], { type: 'application/zip' });
}
