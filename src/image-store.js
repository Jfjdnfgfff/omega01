// ============================================================================
// IMAGE STORE — pure helpers for moving record images out of the main node.
// ----------------------------------------------------------------------------
// Before: v2/customers/{id}.imageUrl holds a base64 image inline, so every
// customers subscription downloads and caches all images.
// After:  v2/customerImages/{id} = { data, version, updatedAt }
//         v2/customers/{id}      = { ...record, imageRef: id, imageVersion }
//
// Semantics of the incoming `imageUrl` on a write (kept explicit so that an
// unrelated save can never delete an image by accident):
//   undefined  -> keep the existing image untouched (imageRef stays)
//   null / ''  -> remove the image (explicit user action)
//   string     -> store/replace the image (new imageVersion)
//
// Environment-agnostic (no DOM, no Firebase): usable from the app, the
// migration script and `node --test`.
// ============================================================================

// Only customers are split in this phase. Products stay inline until the
// product edit form is wired to the lazy loader (see docs/performance-2026-11-27.md).
export const IMAGE_NODE_BY_SECTION = Object.freeze({ customers: 'customerImages' });

export function imageNodeFor(section) {
  return IMAGE_NODE_BY_SECTION[section] || null;
}

// FNV-1a 32-bit over UTF-16 code units. Deterministic, cheap, and sufficient
// as a version tag (not a security hash). Length is mixed in to reduce
// collisions between images that differ only in length.
export function hashImage(str) {
  const s = String(str);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `${(h >>> 0).toString(16).padStart(8, '0')}${s.length.toString(16)}`;
}

// Returns the record to store on the main node plus the image write to do:
//   imageWrite === undefined -> do not touch the image node
//   imageWrite === null      -> delete the image node
//   imageWrite === {data, version, updatedAt} -> set the image node
export function splitRecordImage(section, record, now = Date.now()) {
  const { imageUrl, imageRef, imageVersion, ...rest } = record || {};
  const out = { ...rest };
  if (!imageNodeFor(section)) {
    // Section not split: behave exactly as before (inline image stays).
    if (imageUrl !== undefined) out.imageUrl = imageUrl;
    return { record: out, imageWrite: undefined };
  }
  if (imageUrl === undefined) {
    // Keep: an unrelated save must not drop an existing split image.
    if (imageRef) { out.imageRef = imageRef; out.imageVersion = imageVersion; }
    return { record: out, imageWrite: undefined };
  }
  if (imageUrl === null || imageUrl === '') {
    return { record: out, imageWrite: null };
  }
  const id = String(record.id ?? record._rtdbKey ?? '');
  const version = hashImage(imageUrl);
  out.imageRef = id;
  out.imageVersion = version;
  return { record: out, imageWrite: { data: String(imageUrl), version, updatedAt: now } };
}

export function imageCacheKey(section, id, version) {
  return `${section}:${String(id)}:${String(version)}`;
}

// Size-bounded LRU (by string length, roughly bytes). Map preserves insertion
// order, so re-inserting on get() gives the usual least-recently-used policy.
export class LruCache {
  constructor(maxBytes) {
    this.maxBytes = maxBytes;
    this.map = new Map();
    this.bytes = 0;
  }
  get(key) {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key);
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }
  has(key) { return this.map.has(key); }
  set(key, value) {
    const size = String(value ?? '').length;
    if (this.map.has(key)) {
      this.bytes -= String(this.map.get(key) ?? '').length;
      this.map.delete(key);
    }
    if (size > this.maxBytes) return false; // never cache an oversized item
    this.map.set(key, value);
    this.bytes += size;
    while (this.bytes > this.maxBytes && this.map.size > 0) {
      const oldestKey = this.map.keys().next().value;
      this.bytes -= String(this.map.get(oldestKey) ?? '').length;
      this.map.delete(oldestKey);
    }
    return true;
  }
  delete(key) {
    if (!this.map.has(key)) return false;
    this.bytes -= String(this.map.get(key) ?? '').length;
    return this.map.delete(key);
  }
  get size() { return this.map.size; }
}

const encoder = new TextEncoder();
const utf8Bytes = str => encoder.encode(String(str)).length;

// Migration planning for an exported v2 node (pure: no I/O).
// records: { [id]: record } for one section.
// existingImages: { [id]: { data, version } } already present in the target node.
// Returns the new records map, the image writes, and the byte accounting.
export function planSectionMigration(section, records, existingImages = {}, now = Date.now()) {
  const node = imageNodeFor(section);
  if (!node) throw new Error(`section not splittable: ${section}`);
  const newRecords = {};
  const images = {};
  const stats = { records: 0, withInlineImage: 0, alreadySplit: 0, imagesWritten: 0, recordBytesBefore: 0, recordBytesAfter: 0, bytesSaved: 0 };
  for (const [key, rec] of Object.entries(records || {})) {
    if (!rec || typeof rec !== 'object') { newRecords[key] = rec; continue; }
    stats.records++;
    const id = String(rec.id ?? key);
    const hasInline = typeof rec.imageUrl === 'string' && rec.imageUrl !== '';
    if (!hasInline) {
      if (rec.imageRef) stats.alreadySplit++;
      newRecords[key] = rec;
      continue;
    }
    stats.withInlineImage++;
    const beforeBytes = utf8Bytes(JSON.stringify(rec));
    const { record, imageWrite } = splitRecordImage(section, { ...rec, id }, now);
    const afterBytes = utf8Bytes(JSON.stringify(record));
    stats.recordBytesBefore += beforeBytes;
    stats.recordBytesAfter += afterBytes;
    newRecords[key] = record;
    const existing = existingImages[id];
    if (!existing || existing.version !== record.imageVersion) {
      images[id] = imageWrite;
      stats.imagesWritten++;
    }
  }
  stats.bytesSaved = stats.recordBytesBefore - stats.recordBytesAfter;
  return { section, node, records: newRecords, images, stats };
}

// Read side: the image to show for a record, or null while it is not loaded.
// Legacy records (inline imageUrl) always win, so old data keeps working.
export function resolveImageSrc(section, record, cache) {
  if (!record) return null;
  if (typeof record.imageUrl === 'string' && record.imageUrl !== '') return record.imageUrl;
  if (!imageNodeFor(section) || !record.imageRef) return null;
  const key = imageCacheKey(section, record.imageRef, record.imageVersion);
  return cache && cache.has(key) ? cache.get(key) : null;
}
