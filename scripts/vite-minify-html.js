// Conservative production HTML minification for the single-page shell.
//
// index.html is ~375 kB of hand-written markup (every view and modal), of
// which roughly a quarter is indentation whitespace and comments. The rules
// here are deliberately rendering-neutral — this is a transfer/parse saving,
// never a layout change:
//
//   1. HTML comments are removed (except `<!--! ... -->` "important" ones).
//      Markers such as OMEGA_FONTS_START only matter for the SOURCE file
//      (scripts/embed-fonts.js), never for the built output.
//   2. Whitespace-only runs that contain a newline between two tags (source
//      indentation) collapse to ONE space. A newline between tags already
//      renders as a single space in inline contexts and is ignored between
//      block/flex/grid boxes, so collapsing to one space — not zero — keeps
//      today's rendering pixel-identical in both cases.
//
// Contents of <script>, <style>, <pre>, <textarea> and <svg> are protected
// wholesale: code, embedded CSS, preformatted text, textarea defaults and
// SVG internals pass through byte-identical. Text nodes, attributes and
// same-line spacing are never touched.

const PROTECTED_RE = /<(script|style|pre|textarea|svg)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;
const PLACEHOLDER_RE = /\uE000OMEGA_PROTECTED_(\d+)\uE000/g;

export function minifyHtmlString(html) {
  const blocks = [];
  const staged = String(html).replace(PROTECTED_RE, (block) => {
    blocks.push(block);
    return `\uE000OMEGA_PROTECTED_${blocks.length - 1}\uE000`;
  });
  const minified = staged
    .replace(/<!--(?!!)[\s\S]*?-->/g, '')
    .replace(/>\s*\n\s*</g, '> <');
  return minified.replace(PLACEHOLDER_RE, (match, i) => blocks[Number(i)] ?? match);
}

export function minifyOmegaHtml() {
  return {
    name: 'omega-minify-html',
    apply: 'build',
    transformIndexHtml: {
      // Run after the stylesheet inliner so the final document is what
      // gets minified (the inlined <style> itself stays protected).
      order: 'post',
      handler(html) {
        return minifyHtmlString(html);
      },
    },
  };
}
