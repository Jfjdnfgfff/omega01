import { defineConfig } from 'vite';
import { minifyFirebase } from './scripts/vite-minify-firebase.js';
import tailwindcss from '@tailwindcss/vite';

import { inlineSmallStylesheet } from './scripts/vite-inline-styles.js';
import { minifyOmegaHtml } from './scripts/vite-minify-html.js';

// ---------------------------------------------------------------------------
// Chunk strategy (Lighthouse: "Reduce unused JavaScript")
//
// | chunk          | when it loads          | why                                    |
// |----------------|------------------------|----------------------------------------|
// | index          | first paint            | app shell + render engine               |
// | firebase       | dynamic import at boot | modular SDK, terser-compressed, alone   |
// | zxing          | only when scanning     | 456 kB never on the critical path       |
// | html2canvas    | only when exporting    | only for the report screenshot          |
// | full-report    | opening the report     | ~38 kB of report/layout code            |
// | activity-log-* | opening the log modal  | view-only code                          |
//
// The rule of thumb: a dependency that is not needed for the first screen must
// be reachable *only* through `import()`, so Rollup emits it as its own chunk
// and the browser never downloads it at startup. `manualChunks` then pins
// long-lived vendor code in cacheable files that outlive app deploys.
// ---------------------------------------------------------------------------
function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
  if (id.includes('@zxing')) return 'zxing';
  if (id.includes('html2canvas')) return 'html2canvas';
  return 'vendor';
}

export default defineConfig({
  plugins: [
    tailwindcss(),
    inlineSmallStylesheet(),
    minifyFirebase(),
    minifyOmegaHtml(),
  ],
  // Prebundling the dynamically-imported Firebase entry points in dev avoids a
  // second dependency-optimization pass (and a full page reload) on first use.
  optimizeDeps: {
    include: ['firebase/app', 'firebase/database'],
  },
  // `debugger` statements are pure dead weight in production and abort the
  // debugger when a devtools profiler is attached.
  esbuild: {
    drop: ['debugger'],
  },
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
        manualChunks,
      },
    },
  },
});
