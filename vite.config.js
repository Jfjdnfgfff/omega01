import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

// Chunk layout (all verified against the production build):
//   index-*.js              -> application entry (the only JS on the boot path)
//   firebase-*.js           -> loaded on demand by src/firebase-sdk.js after first paint
//   index-*.js (zxing)      -> loaded on demand when the barcode camera is opened
//   html2canvas-pro.esm-*.js-> loaded on demand for the PDF/image report export
//   perfWorker-*.js         -> loaded on demand by the first runWorkerTask() call
export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  preview: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
  },
  esbuild: {
    // Drop licence banners from the shipped bundles.
    legalComments: 'none',
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Keep the Firebase SDK in its own stable chunk so it stays a separate,
        // lazily-fetched file (and caches independently between deploys).
        manualChunks: {
          firebase: ['firebase/app', 'firebase/database'],
        },
      },
    },
  },
});
