import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

/**
 * async-css (build only)
 * ----------------------------------------------------------------------------
 * 1. Turns every render-blocking <link rel="stylesheet"> injected by Vite into
 *      <link rel="preload" as="style" ...>          (high priority fetch, no block)
 *      <link rel="stylesheet" media="print" onload> (applied as soon as it arrives)
 *      <noscript><link rel="stylesheet"></noscript> (graceful no-JS fallback)
 * 2. The critical CSS lives inline in index.html, so the first screen paints
 *    immediately with the right font/layout even before the bundle lands.
 */
function asyncCssPlugin() {
  return {
    name: 'omega-async-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link\s+rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*?)>/g,
        (match, before, href, after) => {
          if (/media=|onload=/.test(before + after)) return match; // already handled
          const attrs = `${before}${after}`.replace(/\s+$/, '');
          return [
            `<link rel="preload" as="style" href="${href}"${attrs}>`,
            `<link rel="stylesheet" href="${href}"${attrs} media="print" onload="this.media='all';this.onload=null">`,
            `<noscript><link rel="stylesheet" href="${href}"${attrs}></noscript>`,
          ].join('\n  ');
        }
      );
    },
  };
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    asyncCssPlugin(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    cssCodeSplit: true,
    // Report chunks over 400 kB so regressions are visible in CI logs
    chunkSizeWarningLimit: 400,
    // The module preload polyfill costs ~1 kB and is unnecessary for modern targets
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        // Long-term cacheable vendor chunks: they change far less often than app code.
        // firebase / zxing / html2canvas are loaded through dynamic import() in
        // src/main.js, so they are NOT part of the initial critical path.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('@zxing')) return 'zxing';
          if (id.includes('html2canvas')) return 'html2canvas';
          return 'vendor';
        },
      },
    },
  },
});
