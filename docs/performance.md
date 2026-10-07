# تحسين الأداء — OMEGA GYM (Mobile PageSpeed)

ملخّص التعديلات المطبَّقة لمعالجة ملاحظات Google PageSpeed Insights لنسخة الهاتف:

1. طلبات حجب العرض (Render-blocking requests) — كانت 1410ms.
2. جافاسكريبت غير مستخدم (Unused JavaScript) — كانت 91 Kio.
3. مهام طويلة في الخيط الرئيسي (Long tasks) — تجميد الواجهة.

---

## 1) طلبات حجب العرض

| الملف | التعديل |
|---|---|
| `index.html` | خط Google (Tajawal) أصبح **غير حاجب**: `rel="preload" as="style"` + `onload="this.rel='stylesheet'"` مع بديل `<noscript>`، و`preconnect` لكل من `fonts.googleapis.com` و`fonts.gstatic.com`. هذا كان أكبر طلب خارجي حاجب للرسم. |
| `index.html` | **CSS حرج مضمّن** (Critical CSS ≈ 1.2 Kio) يكفي لرسم الهيكل الأول: أساسيات `body`، `.hidden`، قواعد `.modal-overlay`/`.modal-content`، حقول الإدخال، `.no-scrollbar`، مناطق الأمان. |
| `index.html` | `preconnect`/`dns-prefetch` مبكر لطبقة البيانات (`omega-a7040-default-rtdb.firebaseio.com`, `firebaseinstallations.googleapis.com`, `www.googleapis.com`) — لا يحجب الرسم ويسرّع أول مزامنة. |
| `index.html` | CSS التطبيق (`/src/style.css`) بقي **حاجباً عمداً**: ملف واحد من نفس النطاق (13.6 Kio مضغوط) وتحويله إلى غير حاجب يكسر خط أنابيب Tailwind في Vite (يُصدَّر `@import "tailwindcss"` خاماً فتضيع كل التنسيقات) ويسبب وميض واجهة غير منسقة. |
| `public/sw.js` | `CACHE_NAME` → `omega-gym-v5` (إجبار الزبائن على التقاط النسخة الجديدة بدل الكاش القديم)، وتحميل أصول `install` عبر `Promise.allSettled` لكل أصل على حدة (فشل أصل — مثل خطوط Google دون اتصال — لم يعد يُسقط التخزين المؤقت كاملاً كما كان يفعل `cache.addAll`)، و**Cache-First بلا إعادة تحقق** للأصول المبصومة `/assets/*-<hash>.js|css` (immutable). |
| `vercel.json` | رؤوس كاش: `immutable` سنة كاملة لـ`/assets/*`، `no-cache` لـ`index.html` و`sw.js` و`firebase.config.json`. |

**النتيجة:** عدد ملفات الـ CSS الحاجبة من 2 → 1، ولا يوجد أي `modulepreload` لحزمة ضخمة غير مستخدمة عند الإقلاع.

## 2) تقسيم الكود (Code Splitting) والجافاسكريبت غير المستخدم

| الحزمة | قبل | بعد |
|---|---|---|
| `firebase` (app + database) | مستوردة **ثابتة** في `main.js` → ضمن مسار الإقلاع (`modulepreload`)، ‏51.5 Kio مضغوط | `src/firebase-sdk.js` يستوردها **ديناميكياً** داخل `initFirebase()` فقط → تُجلب بعد أول رسم |
| `@zxing` (كاميرا الباركود) | ديناميكي مسبقاً ✓ | بقي ديناميكياً (117.6 Kio مضغوط) ولا يُحمَّل إلا عند فتح الكاميرا |
| `html2canvas-pro` (تصدير PDF) | ديناميكي مسبقاً ✓ | بقي ديناميكياً (67.5 Kio مضغوط) |
| `perfWorker.js` | يُنشأ Worker عند الإقلاع دائماً | **كسول**: `ensurePerfWorker()` ينشئه عند أول `runWorkerTask()` فقط (مولّد البيانات التجريبية) |
| شارات الترخيص | مضمّنة في كل الحزم | `esbuild.legalComments: 'none'` → حزمة firebase وحدها نزلت من 247.6 Kio إلى 178.1 Kio خام |

**مسار الإقلاع (مضغوط):** ‏239.5 Kio ← **191.7 Kio** (−47.7 Kio، ‏−20%)، وحجم JS الذي يُحلَّل عند الإقلاع من 171.5 Kio ← **121.0 Kio** (−29%).

> ملاحظة: كل استدعاءات Firebase المباشرة خارج `initFirebase()` (في `completeSalesHistorySilently`) حُوّلت إلى `window.firebaseQuery / firebaseRef / firebaseGet / ...` لأنها كانت تعتمد على المستوردات الثابتة المحذوفة.

## 3) المهام الطويلة (Long tasks)

الوحدة الجديدة `src/dom-perf.js` توفر:

- `isRenderVisible(el)` — فحص ظهور بالاعتماد على شجرة `class`/`style` فقط (**بدون** `offsetParent` أو `getBoundingClientRect`) فلا يسبب Forced Reflow.
- `setHTMLIfChanged(el, html)` / `setTextIfChanged(el, txt)` — تجاهل الكتابة عندما يكون الناتج مطابقاً للموجود (الكتابة المتطابقة كانت تُبطل التنسيق والتخطيط مجاناً).
- `renderListChunked(container, items, buildItem, emptyHtml, {chunkSize})` — رسم أول شريحة فوراً ثم بقية الصفوف شريحةً لكل إطار (rAF)، مع إلغاء تلقائي عند بدء رسم أحدث أو إخفاء الشاشة.
- `yieldToMain()` / `onIdle(cb, timeout)` / `runSliced(tasks)` — جدولة الأعمال غير الحرجة.

التعديلات في `src/main.js`:

| المكان | المشكلة | الحل |
|---|---|---|
| `renderProductsList` | بناء **كل** بطاقات المنتجات (≈2–3 Kio HTML لكل بطاقة مع SVG) في مهمة واحدة، حتى والشاشة مخفية | `renderListChunked` بشرائح من 24 + تخطي البناء عندما تكون القائمة غير ظاهرة |
| `renderSalesList` | `sort((a,b)=>new Date(b.date)-new Date(a.date))` ينشئ كائني `Date` لكل مقارنة (≈70 ألف كائن لـ3000 سجل)، وإعادة بناء `datalist`/قوائم التصفية كل مرة | `saleSortKey()` بمفتاح رقمي مخزّن (خاصية **غير قابلة للتعداد** حتى لا تتسرب إلى Firebase/النسخ الاحتياطي) + `setHTMLIfChanged` + تخطي عند الإخفاء |
| `renderCustomers` | بناء البطاقات وكتابتها في حاويتين (لوحة التحكم + شاشة المشتركين) حتى لو كانتا مخفيتين | بناء وكتابة فقط عند ظهور إحدى الحاويتين |
| `renderFilterTabs` | `getFilterCount()` يمسح قائمة المشتركين **8 مرات** (مع `calculateStatus` لكل مشترك في كل مرة) | `getFilterCounts()` بمسح واحد مع `now` ثابت |
| `performFullRender` | كتابة قائمة الباقات وسجل الغيابات في كل دورة رسم | بوابات `isRenderVisible` |
| `renderCreditsList` | كتابة الملخص والقائمة دون تحقق | `setTextIfChanged` / `setHTMLIfChanged` |
| الإقلاع | `setupGlobalInputSecurity()` يعمل ضمن مهمة الإقلاع | `render()` أولاً ثم ربط حراسات الإدخال في وقت الفراغ (`onIdle`, ‏1200ms) |

### إصلاح خلل مكتشف أثناء القياس (كان موجوداً قبل التعديلات)

حلقة تصدير الدوال إلى `window` في نهاية `main.js` كانت:

```js
[getCleanSyncPayload, ..., openFemaleCoachModal, ...].forEach(fn => { window[fn.name] = fn; });
```

- المصفوفة كانت ترمي `ReferenceError: openFemaleCoachModal is not defined` (الاسم معرَّف عبر `window.openFemaleCoachModal = function…` وليس كتصريح دالة) → **الحلقة كلها كانت تفشل ولا تُصدَّر أي دالة**.
- حتى لو نجحت، `fn.name` في بناء الإنتاج هو الاسم **المصغَّر** (minified) فالتصدير يكون بأسماء غير صحيحة.

الأثر العملي: ‏`handleBarcodeScan` لم تكن معرَّفة عالمياً، أي أن `onkeypress="handleBarcodeScan(event)"` في حقل باركود البيع الفوري كان يفشل (قراءة الباركود بجهاز USB أو بلصق الكود + Enter).

الحل المطبَّق: خريطة بأسماء نصية صريحة مع حارس `typeof` لكل مدخل:

```js
const __omegaWindowExports = {
  handleBarcodeScan: typeof handleBarcodeScan === "function" ? handleBarcodeScan : null,
  /* ...113 اسماً... */
};
Object.keys(__omegaWindowExports).forEach(name => {
  const fn = __omegaWindowExports[name];
  if (typeof fn === "function") window[name] = fn;
});
```

---

## القياس (قابل لإعادة التشغيل)

```bash
npm run build
npm run test:smoke   # يقلع بناء الإنتاج داخل jsdom ويمرّر بيانات حقيقية عبر مسار الرسم والبيع
npm run test:perf    # يقيس مسار الإقلاع وأطول مهمة في الخيط الرئيسي
node tests/perf-harness.mjs /path/to/other-dist   # لمقارنة نسختين
```

بيانات القياس: ‏220 منتجاً، 900 عملية بيع، 260 مشتركاً، 120 ديناً، 60 مصروفاً، 40 حصة.
(أرقام jsdom أعلى من المتصفح الحقيقي؛ **النِسَب** هي المعتمدة.)

| المقياس | قبل | بعد | التحسّن |
|---|---|---|---|
| CSS حاجب للعرض | 2 | 1 | الخطوط الخارجية صارت غير حاجبة |
| JS في مسار الإقلاع (مضغوط) | 171.5 Kio | 121.0 Kio | **−29%** |
| إجمالي مسار الإقلاع (مضغوط) | 239.5 Kio | 191.7 Kio | **−20%** |
| `modulepreload` لحزمة firebase | نعم | لا | تحميل عند الحاجة |
| أول رسم — أطول مهمة | 709 ms | 278 ms | **−61%** |
| أول رسم — مجموع عمل الخيط الرئيسي | 1783 ms | 334 ms | **−81%** |
| أول رسم — مهام فوق 50ms | 3 | 1 | |
| شاشة المنتجات — أطول مهمة | 419 ms | 108 ms | **−74%** |
| شاشة المشتركين — أطول مهمة | 444 ms | 19 ms | **−96%** |
| لوحة التحكم (إعادة رسم) — أطول مهمة | 459 ms | 25 ms | **−95%** |
| 10 × `render()` — أطول مهمة | 632 ms | 27 ms | **−96%** |
| 10 × `render()` — المجموع | 5138 ms | 217 ms | **−96%** |
| تقييم الوحدة (module eval) | 41.7 ms | 22.1 ms | −47% |

---

## الخطوة الكبيرة المتبقية (لم تُنفَّذ — تحتاج قراراً)

`index.html` وزنه **360 Kio** (‏54 Kio مضغوط) و≈54% منه (≈193 Kio) نوافذ منبثقة (Modals)
مخفية دائماً عند الإقلاع: ‏40 نافذة من `messageModal` إلى `githubAiSyncModal`.

نقلها إلى ملف `public/partials/modals.html` يُحمَّل بعد أول رسم ويحقن عند الطلب سيخفض المستند
إلى ≈164 Kio ويسرّع FCP وLCP وتحليل HTML. **السبب في عدم تنفيذه الآن:** مئات الأسطر في
`main.js` تنفّذ `document.getElementById('...')` أثناء تقييم الوحدة لربط المستمعات
(`?.addEventListener`) على عناصر داخل تلك النوافذ، فلابد من إعادة هيكلة إقلاع `main.js`
داخل دالة `bootstrap()` تنتظر حقن النوافذ أولاً — تعديل بنيوي كبير يحتاج اختباراً يدوياً
على كل شاشة قبل النشر.
