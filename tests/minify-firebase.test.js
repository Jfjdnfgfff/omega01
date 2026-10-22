import test from 'node:test';
import assert from 'node:assert/strict';
import { minifyFirebase } from '../scripts/vite-minify-firebase.js';

test('vendor minification preserves ESM exports and ships license notices separately', async () => {
  const assets = [];
  const plugin = minifyFirebase();
  const output = await plugin.renderChunk.call({ emitFile: asset => assets.push(asset) },
    '/*! @license Example license */\nexport function add(a, b) { const unused = 4; return a + b; }', { name: 'firebase' });
  const module = await import(`data:text/javascript;base64,${Buffer.from(output.code).toString('base64')}`);
  assert.equal(module.add(3, 4), 7);
  assert.equal(assets.length, 1);
  assert.equal(assets[0].fileName, 'assets/firebase.LICENSE.txt');
  assert.match(assets[0].source, /Example license/);
  assert.match(output.code, /firebase\.LICENSE\.txt/);
});

test('application handlers are not touched by the vendor-only minifier', async () => {
  assert.equal(await minifyFirebase().renderChunk('function handleClick() {}', { name: 'index' }), null);
});
