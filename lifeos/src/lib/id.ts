/**
 * أدوات المعرّفات — معرفات فريدة + معرفات حتمية لمنع التكرار عند إعادة المحاولة.
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

export function uid(prefix = 'id'): string {
  const cryptoObj = typeof globalThis !== 'undefined' ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return `${prefix}_${cryptoObj.randomUUID().replace(/-/g, '').slice(0, 20)}`;
  }
  let out = '';
  for (let i = 0; i < 20; i += 1) out += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `${prefix}_${out}`;
}

/**
 * معرف حتمي من مجموعة مفاتيح — يُستخدم لسجلات يجب ألا تتكرر
 * (مثلاً إنجاز عادة في يوم معيّن). إعادة المحاولة تُنتج نفس المعرف
 * فتُصبح العملية idempotent بدل إنشاء سجل مكرر.
 */
export function deterministicId(...parts: Array<string | number>): string {
  const input = parts.join('::');
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `${parts[0]}_${(hash >>> 0).toString(36)}`;
}

export function nowISO(): string {
  return new Date().toISOString();
}
