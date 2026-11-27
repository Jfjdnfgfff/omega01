import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hashImage, splitRecordImage, LruCache, planSectionMigration, resolveImageSrc, imageCacheKey,
} from '../src/image-store.js';

const IMG_A = 'data:image/webp;base64,AAAA';
const IMG_B = 'data:image/webp;base64,BBBB';

test('hashImage is deterministic and changes with content', () => {
  assert.equal(hashImage(IMG_A), hashImage(IMG_A));
  assert.notEqual(hashImage(IMG_A), hashImage(IMG_B));
});

test('split: string imageUrl is stored separately with ref and version', () => {
  const { record, imageWrite } = splitRecordImage('customers', { id: 'c1', name: 'أحمد', imageUrl: IMG_A }, 123);
  assert.equal('imageUrl' in record, false);
  assert.equal(record.imageRef, 'c1');
  assert.equal(record.imageVersion, hashImage(IMG_A));
  assert.deepEqual(imageWrite, { data: IMG_A, version: hashImage(IMG_A), updatedAt: 123 });
});

test('split: undefined imageUrl keeps the existing image (unrelated save never deletes it)', () => {
  const stored = { id: 'c1', name: 'أحمد', imageRef: 'c1', imageVersion: hashImage(IMG_A) };
  const { record, imageWrite } = splitRecordImage('customers', stored);
  assert.equal(imageWrite, undefined);
  assert.equal(record.imageRef, 'c1');
  assert.equal(record.imageVersion, hashImage(IMG_A));
});

test('split: null or empty string removes the image', () => {
  for (const empty of [null, '']) {
    const { record, imageWrite } = splitRecordImage('customers', { id: 'c1', imageUrl: empty, imageRef: 'c1', imageVersion: 'v' });
    assert.equal(imageWrite, null);
    assert.equal('imageRef' in record, false);
    assert.equal('imageVersion' in record, false);
  }
});

test('split: replacing an image changes imageVersion', () => {
  const first = splitRecordImage('customers', { id: 'c1', imageUrl: IMG_A }).record;
  const second = splitRecordImage('customers', { id: 'c1', imageUrl: IMG_B }).record;
  assert.notEqual(first.imageVersion, second.imageVersion);
});

test('split: non-splittable section keeps inline image as before', () => {
  const { record, imageWrite } = splitRecordImage('products', { id: 'p1', imageUrl: IMG_A });
  assert.equal(record.imageUrl, IMG_A);
  assert.equal(imageWrite, undefined);
});

test('dual read: legacy inline image wins; split image comes from cache only when loaded', () => {
  const cache = new LruCache(1e6);
  const legacy = { id: 'c1', imageUrl: IMG_A };
  assert.equal(resolveImageSrc('customers', legacy, cache), IMG_A);

  const split = { id: 'c2', imageRef: 'c2', imageVersion: hashImage(IMG_B) };
  assert.equal(resolveImageSrc('customers', split, cache), null, 'not loaded yet');
  cache.set(imageCacheKey('customers', 'c2', hashImage(IMG_B)), IMG_B);
  assert.equal(resolveImageSrc('customers', split, cache), IMG_B);

  // A stale version must not show the old picture.
  const updated = { ...split, imageVersion: hashImage(IMG_A) };
  assert.equal(resolveImageSrc('customers', updated, cache), null);
});

test('LRU: evicts least-recently-used entries past the byte budget', () => {
  const cache = new LruCache(10);
  cache.set('a', '1234');
  cache.set('b', '1234');
  cache.get('a'); // a is now most recent
  cache.set('c', '1234'); // over budget: b must go
  assert.equal(cache.has('a'), true);
  assert.equal(cache.has('b'), false);
  assert.equal(cache.has('c'), true);
  assert.ok(cache.bytes <= 10);
});

test('LRU: refuses items larger than the whole budget', () => {
  const cache = new LruCache(5);
  assert.equal(cache.set('big', '123456789'), false);
  assert.equal(cache.size, 0);
});

test('migration plan: moves inline images, strips records, reports savings', () => {
  const big = 'data:image/webp;base64,' + 'Q'.repeat(20000); // realistic ~20 KB image
  const records = {
    c1: { id: 'c1', name: 'أحمد', imageUrl: big },
    c2: { id: 'c2', name: 'سارة' },
  };
  const plan = planSectionMigration('customers', records, {}, 1);
  assert.equal(plan.stats.withInlineImage, 1);
  assert.equal(plan.stats.imagesWritten, 1);
  assert.equal(plan.images.c1.data, big);
  assert.equal('imageUrl' in plan.records.c1, false);
  assert.equal(plan.records.c2.name, 'سارة');
  assert.ok(plan.stats.bytesSaved > 0);
});

test('migration is idempotent: a second run writes nothing', () => {
  const records = { c1: { id: 'c1', imageUrl: IMG_A } };
  const first = planSectionMigration('customers', records, {}, 1);
  const existing = { c1: { data: IMG_A, version: first.records.c1.imageVersion } };
  const second = planSectionMigration('customers', first.records, existing, 2);
  assert.equal(second.stats.withInlineImage, 0);
  assert.equal(second.stats.imagesWritten, 0);
  assert.deepEqual(second.records, first.records);
});

test('migration: an interrupted run can resume (images already written are skipped)', () => {
  const records = { c1: { id: 'c1', imageUrl: IMG_A }, c2: { id: 'c2', imageUrl: IMG_B } };
  // c1 finished in a previous run, c2 did not: the record for c1 is already split.
  const done = planSectionMigration('customers', { c1: records.c1 }, {}, 1);
  const existing = { c1: { data: IMG_A, version: done.records.c1.imageVersion } };
  const resumed = planSectionMigration('customers', { ...done.records, c2: records.c2 }, existing, 2);
  assert.equal(resumed.stats.imagesWritten, 1);
  assert.ok(resumed.images.c2);
  assert.equal(resumed.images.c1, undefined);
});
