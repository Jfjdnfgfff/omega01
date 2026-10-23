import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { minifyHtmlString, minifyOmegaHtml } from '../scripts/vite-minify-html.js';

test('comments are removed, important comments kept', () => {
  const out = minifyHtmlString('<div><!-- drop me --><span>x</span><!--! keep me --></div>');
  assert.equal(out, '<div><span>x</span><!--! keep me --></div>');
});

test('indentation between tags collapses to exactly one space (rendering-neutral)', () => {
  const input = '<div>\n        <span>أ</span>\n        <span>ب</span>\n    </div>';
  assert.equal(minifyHtmlString(input), '<div> <span>أ</span> <span>ب</span> </div>');
});

test('same-line spacing and text content are never touched', () => {
  const input = '<p>مرحبا   بالعالم <b>نص</b>  آخر</p><span>a</span> <span>b</span>';
  assert.equal(minifyHtmlString(input), input);
});

test('script, style, pre, textarea and svg contents pass through byte-identical', () => {
  const script = '<script>\n  const s = "<!-- not a comment -->";\n  if (a >\n      b) run();\n</script>';
  const style = '<style>\n  .a > .b {\n    color: red;\n  }\n</style>';
  const pre = '<pre>\n  line 1\n    line 2\n</pre>';
  const textarea = '<textarea rows="3">\n  قيمة افتراضية\n</textarea>';
  const svg = '<svg viewBox="0 0 24 24">\n  <path d="M1 2"/>\n  <path d="M3 4"/>\n</svg>';
  const input = `<div>\n${script}\n${style}\n${pre}\n${textarea}\n${svg}\n</div>`;
  const out = minifyHtmlString(input);
  for (const block of [script, style, pre, textarea, svg]) {
    assert.ok(out.includes(block), `protected block preserved: ${block.slice(0, 24)}...`);
  }
  assert.ok(!out.includes('OMEGA_PROTECTED'), 'no placeholder residue');
});

test('attributes are preserved verbatim, including Arabic text and inline handlers', () => {
  const input = '<button\n  class="a  b"\n  onclick="doThing(1,  2)" title="حفظ  البيانات">حفظ</button>';
  assert.equal(minifyHtmlString(input), input);
});

test('minification is idempotent', () => {
  const input = '<div>\n  <!-- x -->\n  <p>نص</p>\n  <script>let a = 1;\n</script>\n</div>';
  const once = minifyHtmlString(input);
  assert.equal(minifyHtmlString(once), once);
});

test('plugin shape matches the other Omega Vite plugins', () => {
  const plugin = minifyOmegaHtml();
  assert.equal(plugin.name, 'omega-minify-html');
  assert.equal(plugin.apply, 'build');
  assert.equal(plugin.transformIndexHtml.order, 'post');
  assert.equal(plugin.transformIndexHtml.handler('<div>\n</div>'), '<div> </div>');
});

test('the real index.html minifies substantially without losing critical shell parts', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const out = minifyHtmlString(html);
  assert.ok(out.length < html.length * 0.85, `expected >15% smaller, got ${html.length} -> ${out.length}`);
  assert.ok(out.includes('<title>OMEGA GYM'));
  assert.ok(out.includes('<script type="module" src="/src/main.js?v=4"></script>'));
  assert.equal((out.match(/@font-face/g) || []).length, 6, 'font faces intact');
  assert.ok(!out.includes('OMEGA_PROTECTED'), 'no placeholder residue');
  assert.ok(!out.includes('<!-- PWA & Mobile Web App Meta Tags -->'), 'comments stripped');
  // The pre-bundle inline script must survive untouched (it reads as code).
  assert.ok(out.includes('window.handleNavButtonClick = function(event, callback)'));
});
