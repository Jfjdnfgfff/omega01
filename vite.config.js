import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

import { inlineSmallStylesheet } from './scripts/vite-inline-styles.js';

export default defineConfig({
  plugins: [
    tailwindcss(),
    inlineSmallStylesheet(),
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
