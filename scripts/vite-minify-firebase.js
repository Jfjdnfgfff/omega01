import { minify } from 'terser';

// Firebase's distributed bundle retains sizeable comments/expressions after the
// fast esbuild pass. Optimize this vendor chunk only; keep application handler
// names and its existing minification behavior unchanged.
export function minifyFirebase() {
  return {
    name: 'omega-minify-firebase',
    apply: 'build',
    enforce: 'post',
    async renderChunk(code, chunk) {
      if (chunk.name !== 'firebase') return null;
      const notices = new Set();
      const result = await minify(code, {
        module: true,
        compress: { passes: 2 },
        format: { comments(node, comment) {
          if (/@license|@preserve|^!/.test(comment.value)) notices.add(comment.value);
          return false;
        } },
      });
      if (notices.size) {
        this.emitFile({ type: 'asset', fileName: 'assets/firebase.LICENSE.txt', source: [...notices].join('\n\n') });
      }
      return { code: (notices.size ? '/*! Firebase licenses: ./firebase.LICENSE.txt */\n' : '') + result.code, map: null };
    },
  };
}
