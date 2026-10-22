#!/usr/bin/env node
/**
 * embed-fonts.js
 * ---------------------------------------------------------------------------
 * يحوّل ملفات الخطوط المحلية في public/fonts/*.woff2 إلى Base64 ويكتبها داخل
 * index.html بين العلامتين:
 *
 *      <!-- OMEGA_FONTS_START -->  ...  <!-- OMEGA_FONTS_END -->
 *
 * النتيجة: خط Tajawal أصبح جزءاً من الصفحة نفسها (data:font/woff2)، بلا أي طلب
 * شبكة، بلا Google Fonts، ويعمل حتى بدون اتصال بالإنترنت.
 *
 * الاستخدام:  npm run fonts:embed
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HTML_FILE = path.join(ROOT, 'index.html');
const FONTS_DIR = path.join(ROOT, 'public', 'fonts');

const UNICODE_RANGE = {
  arabic:
    'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,' +
    'U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC',
  latin:
    'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,' +
    'U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD',
};

// وزن ملف الخط  →  مدى الأوزان الذي يخدمه في CSS
// (Tajawal لا يوفّر وزناً 600، لذا الملف 700 يخدم 600–900)
const WEIGHTS = [
  { file: 400, css: '400' },
  { file: 500, css: '500' },
  { file: 700, css: '600 900' },
];

const subsets = ['arabic', 'latin'];

async function buildFontFaceCss() {
  const blocks = [];
  let totalBytes = 0;

  for (const subset of subsets) {
    for (const { file, css } of WEIGHTS) {
      const name = `tajawal-${subset}-${file}-normal.woff2`;
      const bin = await readFile(path.join(FONTS_DIR, name));
      totalBytes += bin.length;
      const base64 = bin.toString('base64');
      blocks.push(
        `@font-face{font-family:'Tajawal';font-style:normal;font-weight:${css};` +
          `font-display:swap;src:url(data:font/woff2;base64,${base64}) format('woff2');` +
          `unicode-range:${UNICODE_RANGE[subset]}}`
      );
    }
  }
  return { css: blocks.join('\n'), totalBytes };
}

const START = '<!-- OMEGA_FONTS_START -->';
const END = '<!-- OMEGA_FONTS_END -->';

async function main() {
  const { css, totalBytes } = await buildFontFaceCss();
  const html = await readFile(HTML_FILE, 'utf8');

  const startIdx = html.indexOf(START);
  const endIdx = html.indexOf(END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error('لم يتم العثور على علامات OMEGA_FONTS_START / OMEGA_FONTS_END في index.html');
  }

  const block =
    `${START}\n  <style id="omega-fonts">\n/* Tajawal — مضمّن Base64 (${(totalBytes / 1024).toFixed(1)} KB خام). ` +
    `مُولَّد آلياً بـ npm run fonts:embed */\n${css}\n  </style>\n  `;

  const next = html.slice(0, startIdx) + block + html.slice(endIdx);
  await writeFile(HTML_FILE, next, 'utf8');

  console.log(
    `✓ تم تضمين ${subsets.length * WEIGHTS.length} ملف خط (${(totalBytes / 1024).toFixed(1)} KB) داخل index.html`
  );
}

main().catch((err) => {
  console.error('✗ فشل تضمين الخطوط:', err.message);
  process.exit(1);
});
