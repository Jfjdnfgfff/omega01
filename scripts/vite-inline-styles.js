// The complete dashboard stylesheet is only ~14 kB gzip. Inline it in the
// production HTML to avoid a blocking CSS round trip without painting a partial
// layout. Keep larger future stylesheets external rather than growing HTML
// without a bound; emitted CSS remains available for other entry points.
export function inlineSmallStylesheet() {
  return {
    name: 'omega-inline-small-stylesheet',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, context) {
        return html.replace(/<link\b[^>]*rel="stylesheet"[^>]*>/g, (tag) => {
          const href = tag.match(/href="([^"]+)"/)?.[1];
          const asset = context.bundle?.[href?.replace(/^\//, '')];
          if (!asset || asset.type !== 'asset' || typeof asset.source !== 'string' ||
              Buffer.byteLength(asset.source) > 100_000) return tag;
          return `<style data-omega-bundle>${asset.source.replace(/<\/style/gi, '<\\/style')}</style>`;
        });
      },
    },
  };
}

