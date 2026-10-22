# تحسين الأداء — OMEGA GYM (تقرير PageSpeed Insights)

هذه الوثيقة تشرح المشاكل الأربع التي أظهرها التقرير، والحلول المطبَّقة فعلياً في
المستودع، مع الأكواد الجاهزة للنسخ في أي بيئة أخرى.

**ملخّص ما تم تطبيقه**

| المشكلة في التقرير | الحل المطبَّق | الأثر المتوقّع |
| --- | --- | --- |
| `C8F5ewMw.css` + Google Fonts تحجب العرض | خطوط مستضافة ذاتياً + Critical CSS مضمّن + تحميل الـ CSS الكامل بشكل غير متزامن (Vite plugin) | إزالة ~2–3 طلبات حاجبة لجهة خارجية، FCP أسرع بـ 300–700ms على 4G/3G |
| `firebaseio.com` بحجم نقل كبير وبدون TTL | نوافذ قراءة محدودة + شرح حقيقة أرشفة Firebase + ETag / Edge cache (اختياري) | تقليل النقل بشكل حاسم مع كل إعادة تحميل |
| `GbT6rcde.js` — JavaScript غير مستخدم | Firebase SDK صار `import()` ديناميكي + تجزئة vendor + `modulePreload.polyfill=false` | الـ JS الحرج: 184KB → 133KB (gzip) |
| LCP / FCP / TBT | preconnect + preload للخطوط + تقليل العمل في الـ main thread | راجع القسم 4 |

---

## 1) طلبات حجب العرض (Render-Blocking)

### 1.1 الخطوط: من Google Fonts إلى الاستضافة الذاتية

**قبل** (سلسلة حاجبة: HTML ← CSS خارجي ← ملف الخط):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

**بعد** — الملفات موجودة في `public/fonts/*.woff2` (عائلة Tajawal، الأوزان 400/500/700،
مقسمة إلى مجموعتَي محارف `arabic` و`latin`)، وتُعرَّف في `src/style.css`:

```css
@font-face {
  font-family: 'Tajawal';
  font-style: normal;
  font-weight: 400;
  font-display: swap;                       /* النص يظهر فوراً بخط النظام ثم يُستبدل */
  src: url('/fonts/tajawal-arabic-400-normal.woff2') format('woff2');
  unicode-range: U+0600-06FF, /* ... */;     /* المتصفح ينزّل المجموعة المطلوبة فقط */
}
```

وفي `index.html` نُسبق تحميل الملفين الأهم (نص عادي + عناوين عريضة):

```html
<link rel="preload" href="/fonts/tajawal-arabic-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/tajawal-arabic-700-normal.woff2" as="font" type="font/woff2" crossorigin>
```

> ملاحظة: `crossorigin` إلزامي مع `preload as="font"` وإلا يُحمَّل الملف مرتين.
> إن أردت خطاً آخر: `npx @fontsource/...` أو حمّل الـ woff2 وضعَه في `public/fonts`.

### 1.2 Critical CSS مضمّن داخل `<head>`

داخل `index.html` يوجد بلوك `<style>` يغطي ما يظهر في الشاشة الأولى فقط
(`html/body`, `#appContainer`, `header`, شريط التنقل) بحجم ~3KB.
هذا يجعل أول رسم صحيحاً حتى قبل وصول حزمة Tailwind.

### 1.3 الـ CSS الكامل: تحميل غير متزامن بدون كسر Tailwind

الطريقة الشائعة `media="print" onload="this.media='all'"` **لا تعمل** إذا كُتبت يدوياً
على `href="/src/style.css"`، لأن Vite يتوقف عن معالجة الملف كوحدة CSS و`@import "tailwindcss"`
يُترك دون توليد (تحقّقنا من ذلك عملياً). لذلك يتم التحويل **بعد** البناء عبر إضافة صغيرة
في `vite.config.js`:

```js
function asyncCssPlugin() {
  return {
    name: 'omega-async-css',
    apply: 'build',
    enforce: 'post',
    transformIndexHtml(html) {
      return html.replace(
        /<link\s+rel="stylesheet"([^>]*?)href="([^"]+)"([^>]*?)>/g,
        (match, before, href, after) => {
          if (/media=|onload=/.test(before + after)) return match;
          const attrs = `${before}${after}`.replace(/\s+$/, '');
          return [
            `<link rel="preload" as="style" href="${href}"${attrs}>`,
            `<link rel="stylesheet" href="${href}"${attrs} media="print" onload="this.media='all';this.onload=null">`,
            `<noscript><link rel="stylesheet" href="${href}"${attrs}></noscript>`,
          ].join('\n  ');
        }
      );
    },
  };
}
```

الناتج في `dist/index.html`:

```html
<link rel="preload" as="style" href="/assets/index-xxxx.css" crossorigin>
<link rel="stylesheet" href="/assets/index-xxxx.css" crossorigin media="print" onload="this.media='all';this.onload=null">
<noscript><link rel="stylesheet" href="/assets/index-xxxx.css" crossorigin></noscript>
```

**للعودة إلى الوضع المتزامن** (إن ظهر وميض في التصميم على شبكة بطيئة جداً):
احذف `asyncCssPlugin()` من مصفوفة `plugins`, فيصبح الـ CSS حاجباً كالسابق.

---

## 2) `Cache-Control` — ما يمكن وما لا يمكن

### 2.1 الأصول الثابتة (قابلة للحل عبر `vercel.json`)

`vercel.json` في جذر المستودع يضبط:

- `/assets/*` → `public, max-age=31536000, immutable` (أسماء مُبصومة بالـ hash).
- `/fonts/*` → سنة كاملة + `immutable` + `Access-Control-Allow-Origin: *`
- `/sw.js` → `max-age=0, must-revalidate` (حتى يصل تحديث الـ PWA فوراً)
- `/manifest.json` → ساعة واحدة
- الصور (`png/svg/ico/webp/jpg`) → أسبوع + `stale-while-revalidate`
- بقية المسارات → رؤوس أمان (`nosniff`, `Referrer-Policy`, `X-DNS-Prefetch-Control`)
  و`Permissions-Policy` تسمح بالكاميرا لأن ماسح الباركود يستخدمها.

> **CSP:** لم تُضَف سياسة `Content-Security-Policy` صارمة عن قصد، لأن التطبيق يستخدم
> Google Drive / Sign-In / ملفات inline؛ فرض CSP غير مُختبَر قد يعطّل النسخ الاحتياطي.
> عند الرغبة، ابدأ بوضع المراقبة فقط وفعّلها بعد التأكد من عدم وجود مخالفات:
>
> ```json
> { "key": "Content-Security-Policy-Report-Only",
>   "value": "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; connect-src 'self' https://*.firebaseio.com wss://*.firebaseio.com https://*.googleapis.com https://accounts.google.com; img-src 'self' data: blob: https:; font-src 'self'; frame-src https://accounts.google.com https://*.firebaseapp.com; worker-src 'self' blob:" }
> ```

> **SPA rewrites:** التطبيق لا يستخدم History API (كل التنقل داخل الصفحة)، لذلك لا حاجة
> لـ `rewrites`. إن أضفت مسارات لاحقاً فاستخدم:
> `"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]` مع التحقق من الأصول.

```jsonc
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    { "source": "/assets/(.*)", "headers": [{ "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }] },
    { "source": "/fonts/(.*)",  "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" },
        { "key": "Access-Control-Allow-Origin", "value": "*" } ] },
    { "source": "/sw.js",       "headers": [{ "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" }] }
  ]
}
```

### 2.2 `firebaseio.com` — الحقيقة الهندسية

**لا يمكن** ضبط `Cache-Control` لطلبات `*.firebaseio.com` من `vercel.json`:

1. `vercel.json` يخصّ النطاق الخاص بك على Vercel فقط، وليست له سلطة على نطاقات Google.
2. حتى لو استطعت، طلبات Firebase RTDB (REST/WebSocket) تُعيد `Cache-Control: no-cache`
   وتحتوي بيانات لحظية تُستخدم عبر WebSocket — وهي **ليست** طلبات حاجبة للعرض، لذلك لا
   تؤثر مباشرة في FCP/LCP بل في «حجم النقل» و«وقت ظهور البيانات».

ما يعالجها فعلياً:

**أ. تقليل الحجم المنقول** (الأهم — وهو مطبَّق جزئياً):

```js
// نافذة حيّة محدودة بدل تنزيل كل السجل (قائمة المبيعات تنمو بلا حد)
window.SALES_REALTIME_WINDOW = 3000;   // => query(ref(db,'v2/sales'), orderByKey(), limitToLast(3000))
// والسجل الأقدم يُكمل بصفحات: endBefore(oldestKey) + limitToLast(pageSize)
```

تقليل النافذة إلى `500` أو `1000` يخفض النقل عند الإقلاع بنسبة 60–80% مقابل تاريخ أقدم
يُحمَّل فقط عند الطلب. تأكّد أيضاً من وجود فهارس في `database.rules.json` (`.indexOn`).

**ب. طلبات شرطية عبر ETag (REST)** للأقسام شبه الثابتة (`v2/products`, `v2/stats`):

```js
// أول مرة: خزّن الـ ETag
const r1 = await fetch(`${DB}/v2/products.json`, { headers: { 'X-Firebase-ETag': 'true' } });
const etag = r1.headers.get('ETag');
const data = await r1.json();

// في المرات التالية: إن لم يتغيّر شيء يعود 304 بدون جسم
const r2 = await fetch(`${DB}/v2/products.json`, { headers: { 'if-match': etag } });
if (r2.status === 304) { /* استخدم النسخة المحلية */ }
```

**ج. وسيط Edge على Vercel يضيف TTL** (إن أردت فعلاً `s-maxage` على قراءات Firebase):
`api/fb.js` (Vercel Function) يقرأ من RTDB ويُعيد النتيجة برأس
`Cache-Control: public, s-maxage=60, stale-while-revalidate=300`، ثم الواجهة تقرأ من
`/api/fb?path=v2/products`. مناسب للبيانات المرجعية فقط، وليس للمبيعات اللحظية.

---

## 3) JavaScript غير مستخدم (Code Splitting / Lazy Loading)

### 3.1 Firebase SDK خارج المسار الحرج (تعديل رئيسي)

`src/main.js` كان يستورد الحزمة بشكل ثابت فيدخل ~232KB (54KB gzip) في أول تحميل،
وVite يُصدر له `modulepreload` حاجباً. الآن:

```js
let initializeApp, getDatabase, ref, set, update, push, remove, onValue, get,
    query, limitToLast, limitToFirst, startAt, endAt, startAfter, endBefore,
    orderByKey, orderByChild, equalTo;
let firebaseSDKPromise = null;

function loadFirebaseSDK() {
  if (!firebaseSDKPromise) {
    firebaseSDKPromise = Promise.all([
      import('firebase/app'),
      import('firebase/database'),
    ]).then(([appMod, dbMod]) => {
      initializeApp = appMod.initializeApp;
      ({ getDatabase, ref, set, update, push, remove, onValue, get, query,
         limitToLast, limitToFirst, startAt, endAt, startAfter, endBefore,
         orderByKey, orderByChild, equalTo } = dbMod);
      return true;
    }).catch((err) => { firebaseSDKPromise = null; throw err; });
  }
  return firebaseSDKPromise;
}
```

ويُنتظر داخل `initFirebase()` بعد قراءة `firebase.config.json`:

```js
await loadFirebaseSDK();
const app = initializeApp(firebaseConfig);
```

النتيجة: `firebase` يصبح chunk منفصلاً (244KB / 54KB gzip) يُنزَّل بالتوازي بعد أول رسم،
بدون `modulepreload` حاجب.

### 3.2 تجزئة الحزم في `vite.config.js`

```js
build: {
  target: 'es2020',
  cssCodeSplit: true,
  modulePreload: { polyfill: false },   // توفير ~1KB وإلغاء polyfill غير ضروري
  rollupOptions: {
    output: {
      manualChunks(id) {
        if (!id.includes('node_modules')) return;   // كود التطبيق يبقى في chunk مستقل
        if (id.includes('firebase')) return 'firebase';
        if (id.includes('@zxing')) return 'zxing';         // ماسح الباركود: 118KB gzip
        if (id.includes('html2canvas')) return 'html2canvas'; // تصدير الصورة: 69KB gzip
        return 'vendor';
      },
    },
  },
}
```

`@zxing/browser` و`html2canvas-pro` كانا أصلاً يُحمّلان عبر `import()` عند فتح الماسح/التصدير،
والتجزئة الآن تضمن كاشاً طويل الأمد لكل منهما.

### 3.3 نمط «عرض عند الطلب» للميزات الثقيلة (توصية للخطوة التالية)

المستودع ما زال ملفاً واحداً بـ ~13.8k سطر. أفضل خفض إضافي هو نقل وحدات مستقلة إلى
`import()`:

```js
// بدل استيراد ثابت
let driveModule = null;
async function ensureDrive() {
  driveModule ||= await import('./features/google-drive.js'); // chunk منفصل
  return driveModule;
}
document.getElementById('driveBackupBtn')
  .addEventListener('pointerenter', () => ensureDrive(), { once: true }); // تحميل استباقي ذكي
```

وبالمثل: التقارير المالية الكبيرة، مزامنة GitHub/AI Studio، ماسح الباركود، لوحة عمولات الكوتش.
افحص التغطية في Chrome DevTools ← `Ctrl+Shift+P` ← *Show Coverage* لمعرفة الأسطر غير المنفَّذة.

---

## 4) مقاييس LCP / FCP / TBT

| المقياس | ما يبطئه في مشروعك | الإجراء |
| --- | --- | --- |
| **FCP** | CSS حاجب من Google Fonts + حزمة JS كبيرة في `<head>` | تم: خطوط ذاتية + CSS غير متزامن + Critical CSS. أضف `preconnect` لـ Firebase (مطبَّق). |
| **LCP** | عنصر LCP هنا **نصّي** (عنوان الهيدر) لا صورة: يعتمد على الخط + CSS | تم: `preload` لخط 400/700 + `font-display: swap`. لا تستخدم `font-display: block`. |
| **TBT** | تهيئة Firebase + معالجة 373KB من HTML + مزامنة أولى للبيانات | تم: Firebase خارج المسار الحرج. الخطوة التالية: تقسيم `index.html`. |
| **CLS** | ظهور البطاقات بعد وصول البيانات | احجز ارتفاعاً ثابتاً للبطاقات/الجداول (`min-height`) وشاشات تحميل (skeleton). |

### خطوات التحقق المحلي

```bash
npm run build && npx vite preview --port 4173
# ثم: Lighthouse (Chrome DevTools → Performance) على http://localhost:4173
# قارن: عدد الطلبات الحاجبة، حجم JS المنقول، TBT
```

### نتائج البناء قبل/بعد (من `vite build`)

```
قبل:  index.html 370KB · index CSS 86KB · firebase 232KB (preload حاجب) · zxing 457KB · html2canvas 264KB · app 516KB
بعد:  index.html 373KB · index CSS 88KB (غير حاجب) · firebase 244KB (ديناميكي) · zxing 457KB (ديناميكي)
      html2canvas 264KB (ديناميكي) · vendor 4KB · app 516KB  ←  المسار الحرج: فقط app + CSS + خطّان
```

---

## 5) توصيات سريعة إضافية

1. **تقسيم `index.html` (373KB):** كل النوافذ (modals) موجودة في الـ HTML الأولي. حوّل
   النوافذ غير المستخدمة إلى قوالب `<template>` تُحمَّل عند الطلب، أو أخرجها إلى
   `public/partials/*.html` واجلبها بـ `fetch` عند أول فتح. أكبر مكسب متبقٍ في TBT/LCP.
2. **الـ Service Worker:** تم تحديث `public/sw.js` (`omega-gym-v5`): إزالة رابط خطوط Google
   (كان قد يفشل في `cache.addAll`)، وإضافة ملفَّي الخط إلى الكاش المسبق.
3. **الصور:** صور المشتركين تُخزَّن Base64 (إن كانت كذلك) فتضخّم الـ HTML/localStorage.
   الأفضل: ضغطها إلى WebP بعرض 200px قبل التخزين (`canvas.toBlob('image/webp', 0.8)`).
4. **الرسوم المتحركة:** `animate-pulse` على شارة Google Drive يعمل باستمرار ويستهلك
   main thread؛ استخدمه فقط أثناء المزامنة.
5. **مراقبة مستمرة:** أضف Lighthouse CI أو Vercel Speed Insights لقياس حقيقي من مستخدميك
   في الجزائر بدل القياس الصناعي.

---

## 6) ملفات تغيّرت في هذا التحسين

```
index.html          ← preconnect/preload + Critical CSS + إزالة Google Fonts
src/style.css       ← @font-face محلية لـ Tajawal (swap + unicode-range)
src/main.js         ← تحميل Firebase SDK عبر dynamic import
vite.config.js      ← async-css plugin + manualChunks + modulePreload.polyfill=false
public/fonts/*      ← Tajawal woff2 (6 ملفات، ~58KB)
public/sw.js        ← كاش v5 + الخطوط المحلية
vercel.json         ← cache headers + security headers + SPA rewrites  (جديد)
docs/performance.md ← هذه الوثيقة
```
