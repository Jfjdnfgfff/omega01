# معالجة تقرير Lighthouse: نقل بيانات Firebase، JavaScript غير المستخدم، والمهام الطويلة

الفرع: `arena/692dfb00-omega01` — 29 أكتوبر 2026.

هذا المستند يشرح **ما تم تعديله فعليًا في المشروع** (أكواد موجودة الآن في `src/`) مع المبرر التقني لكل خطوة،
وكذلك النسخ المكافئة بـ React لمن يريد نفس النمط في مكوّنات `.jsx`.

---

## 0) ملخّص تنفيذي

| مشكلة Lighthouse | السبب الحقيقي | ما تم عمله | الملفات |
| --- | --- | --- | --- |
| `lp?id=…` بحجم 1.7 MB بدون Cache | الاشتراك في العقدة كاملة `ref(db,'v2/sales')`، وكل `onValue` يفتح قناة long-poll | استعلامات محدودة `limitToLast/limitToFirst/endBefore/startAfter` + مُنشئ استعلامات موحّد | `src/firebase-query-window.js`، `src/main.js` |
| تكرار/تسرّب المستمعين | لا يوجد مالك واحد للاشتراكات، ولا `off()` عند إخفاء التبويب أو التنقل | سجل مستمعين (Registry) يملك كل اشتراك: dedupe + pause/resume/dispose | `src/listener-registry.js`، `src/main.js` |
| 120 KB JavaScript غير مستخدم | الاستيراد الكامل + كل شيء في حزمة واحدة | Firebase Modular عبر `import()` في حزمة مستقلة، تقسيم `manualChunks`، تأجيل ما لا يلزم الشاشة الأولى | `vite.config.js`، `src/main.js` |
| مهمتان طويلتان على الـ Main Thread | إعادة بناء كل القوائم المرئية داخل نفس المهمة التي تُحدّث الأرقام | جدولة زمنية (Time Slicing) + `requestAnimationFrame` + `requestIdleCallback` + عدّاد مهام طويلة | `src/main-thread-scheduler.js`، `src/main.js` |

نتائج `npm test`: **158 اختبارًا ناجحًا** (منها 24 اختبارًا جديدًا للوحدات الثلاث). `npm run lint` و`npm run build` ناجحان.

---

## 1) Firebase: تقليل حجم النقل + دورة حياة المستمعين

### 1.1 لماذا `lp?id=…`؟ وماذا يعني "بدون Cache"؟

`lp` = **long polling**، وهي قناة النقل التي يستخدمها Realtime Database عندما لا يستطيع المتصفح/الشبكة فتح WebSocket.
كل قناة تبقى مفتوحة وتعيد إرسال اللقطات (snapshots) عند أي تغيير. لذلك:

- لا يمكن تخزينها مؤقتًا: هذه استجابة حيّة متغيّرة، وليست ملفًا ثابتًا. إضافة `Cache-Control` عليها في Vercel **لا تعمل**
  (النطاق `firebaseio.com` لا يمرّ أصلًا عبر Vercel) ولو عملت لأدّت إلى عرض أرصدة قديمة.
- ما يمكن فعله فعليًا هو **تقليل حجم ما يُنقل** و**عدد القنوات المفتوحة**، وهذا بالضبط ما تغيّر:

| قبل | بعد |
| --- | --- |
| `ref(db,'v2/sales')` → كل السجلات | `query(ref(db,'v2/sales'), orderByKey(), limitToLast(3000))` |
| اشتراك كامل لأي قسم عند أول تنقل | نفس الشيء للأقسام المالية (مقصود)، و`limitToLast` للأقسام التراكمية |
| قناة لكل قسم + قناة ثانية عند إعادة المحاولة/التنقل | قناة واحدة لكل اسم قسم (Registry يمنع التكرار) |
| المستمعون يظلون أحياءً في تبويب مخفي | `off()` عند `visibilitychange`/`pagehide` و`onValue` جديد عند العودة |

التخزين المؤقت الحقيقي للبيانات موجود بالفعل في المشروع عبر **IndexedDB** (`src/local-db.js`): يفتح الصفحة فورًا من
القرص، ثم تستبدل السحابة البيانات. هذا هو "الـ TTL" الصحيح لبيانات المعاملات، وليس رأس HTTP.

### 1.2 منشئ الاستعلامات: `src/firebase-query-window.js`

الواجهة تُنتج **وصفًا** للاستعلام (كائن بيانات) ثم يُترجم إلى SDK الحقيقي، ما يجعل المنطق قابلًا للاختبار بدون شبكة:

```js
// وصف: أحدث N عنصر، واختياريًا "قبل مفتاح معيّن" (ترقيم صفحات للخلف)
tailWindow('v2/sales', 3000, { before: '1700000000000' });
// => { kind:'tail', path:'v2/sales', limit:3000, before:'1700000000000' }

// وصف: أقدم N عنصر بعد مؤشر (ترقيم صفحات للأمام)
headWindow('v2/activityLogs', 50, { after: 'k3' });

// وصف: نطاق مفاتيح (مفيد لتقارير "من تاريخ إلى تاريخ")
rangeWindow('v2/sales', { from: '2026-10-01', to: '2026-10-31', limit: 1000 });
```

والترجمة إلى استعلام Firebase الحقيقي:

```js
import { buildWindowQuery, describeSectionWindow, olderPageSpec } from './firebase-query-window.js';

// في src/main.js بعد تحميل SDK (modular):
const spec = describeSectionWindow('sales', { path: 'v2/sales', limit: window.SALES_REALTIME_WINDOW });
const target = buildWindowQuery(
  { ref, query, orderByKey, limitToLast, limitToFirst, startAfter, endBefore, startAt, endAt },
  database, spec,
);
// => query(ref(db,'v2/sales'), orderByKey(), limitToLast(3000))
```

لجلب ما قبل النافذة ( التاريخ القديم ) لا نعيد تنزيل النافذة: نستخدم مؤشرًا:

```js
const page = await window.fetchOlderPage('sales', { pageSize: 500, oldestKey: '1730000000000' });
// => query(ref(db,'v2/sales'), orderByKey(), endBefore('1730000000000'), limitToLast(500))
```

**قاعدة مهمة:** لا تُقيّد عقدة تُبنى عليها أرصدة مالية (مثل `v2/caisse`) لأن صندوق يوم قديم يحتاج كل حركاته.
لذلك `SECTION_WINDOW_LIMITS` في `src/firebase-query-window.js` تحدّد **0 = بلا حد** لهذه الأقسام:

```js
export const SECTION_WINDOW_LIMITS = Object.freeze({
  sales: 3000,        // تراكمي: نافذة حيّة + pager للتاريخ
  activityLogs: 400,  // سجل عرض فقط
  caisseLogs: 0,      // مالي: بلا حد (صندوق اليوم يحتاج كل الحركات)
  expenses: 0, customers: 0, products: 0,
});
```

> يمكن ضبط `window.SALES_REALTIME_WINDOW` (مثلًا 500 على شبكة ضعيفة) لأن `completeSalesHistorySilently()`
> يكمل التاريخ في الخلفية بصفحات، وتُحفظ النتيجة في IndexedDB فلا تُعاد بعد إعادة التحميل.

### 1.3 دورة الحياة: `src/listener-registry.js`

```js
const registry = createListenerRegistry({ idleTimeoutMs: 10 * 60 * 1000 });

// اشتراك واحد فقط لكل اسم — النداء الثاني لا يفتح قناة ثانية
registry.attach('sales', () => onValue(queryForSales(), snap => { registry.touch('sales'); apply(snap); }, onError));

registry.pauseAll();    // يستدعي دالة off() لكل اشتراك (تبويب مخفي)
registry.resumeAll();   // يعيد onValue، وFirebase يرسل أحدث لقطة من الكاش المحلي
registry.release('sales'); // off() نهائي + حذف من السجل
registry.sweepIdle();   // يُحرّر ما بقي موقوفًا أكثر من idleTimeoutMs
```

الربط بدورة حياة الصفحة في `src/main.js`:

```js
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') registry.resumeAll();
  else registry.pauseAll();
});
window.addEventListener('pagehide', () => registry.pauseAll()); // bfcache-safe
window.addEventListener('pageshow', e => { if (e.persisted) registry.resumeAll(); });
```

سببان لاستخدام `pagehide` بدل `unload`: `unload` يمنع bfcache في Chrome، و`pagehide` هو النقطة الصحيحة للإغلاق.
وقد أضفنا `window.disposeFirebaseListeners()` لإغلاق كل شيء يدويًا (اختبارات/تنقل صلب).

### 1.4 النسخة المكافئة في React

```jsx
import { useEffect, useRef } from 'react';
import { getDatabase, ref, query, orderByKey, limitToLast, onValue } from 'firebase/database';

export function useSalesWindow(size = 500) {
  const db = getDatabase();
  useEffect(() => {
    // كل ما يحدث داخل هذا الـ effect يجب أن يُلغى في cleanup
    const q = query(ref(db, 'v2/sales'), orderByKey(), limitToLast(size));
    const unsubscribe = onValue(q, snapshot => setSales(Object.values(snapshot.val() || {})));
    return () => unsubscribe();          // ← هذا هو off() الحقيقي
  }, [db, size]);
}
```

قاعدة عامة: **كل `onValue` يرجع دالة إلغاء، ويجب أن تُستدعى في `return` داخل `useEffect`** — وإلا فكل تنقل بين
الصفحات يفتح قناة إضافية، وهي بالضبط ظاهرة تعدد `lp?id=…` في الصور.

---

## 2) JavaScript غير مستخدم: Tree-shaking وتقسيم الحزم

### 2.1 استيراد Modular بدل Compat

```js
// ❌ القديم (compat): يسحب كل شيء ويحرم Rollup من حذف ما لا يُستخدم
import firebase from 'firebase/compat/app';
import 'firebase/compat/database';

// ✅ الحالي: أسماء محددة فقط، تُحذف البقية أثناء البناء
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, query, orderByKey, limitToLast, get } from 'firebase/database';
```

وفي هذا المشروع لا يُحمّل SDK في المسار الحرج أصلًا، بل عند الحاجة فقط وبالتوازي مع أول رسم:

```js
// src/main.js
let firebaseSDKPromise = null;
function loadFirebaseSDK() {
  firebaseSDKPromise ||= Promise.all([import('firebase/app'), import('firebase/database')])
    .then(([appMod, dbMod]) => {
      initializeApp = appMod.initializeApp;
      ({ getDatabase, ref, onValue, query, orderByKey, limitToLast, get } = dbMod);
      return true;
    })
    .catch(err => { firebaseSDKPromise = null; throw err; }); // إعادة المحاولة ممكنة
  return firebaseSDKPromise;
}
```

كل ما هو "عند الطلب" يُستورد بـ `import()` حتى يُخرجه Rollup في حزمة مستقلة:

| الميزة | الحزمة | تُحمّل عند |
| --- | --- | --- |
| باركود (`@zxing`) | `zxing` ≈ 456 kB | فتح الكاميرا فقط |
| تصدير التقرير صورةً | `html2canvas` ≈ 264 kB | تصدير التقرير فقط |
| التقرير الشامل | `full-report` ≈ 38 kB | فتح التقرير |
| سجل العمليات | `activity-log-view` ≈ 15 kB | فتح السجل |

### 2.2 نفس الفكرة في React

```jsx
const FullReport = React.lazy(() => import('./FullReport.jsx'));

<Suspense fallback={<ReportSkeleton />}>
  {open && <FullReport />}
</Suspense>
```

### 2.3 إعداد `vite.config.js` (المستخدم الآن)

```js
function manualChunks(id) {
  if (!id.includes('node_modules')) return undefined;
  if (id.includes('firebase') || id.includes('@firebase')) return 'firebase';
  if (id.includes('@zxing')) return 'zxing';
  if (id.includes('html2canvas')) return 'html2canvas';
  return 'vendor';
}

export default defineConfig({
  optimizeDeps: { include: ['firebase/app', 'firebase/database'] }, // dev فقط
  esbuild: { drop: ['debugger'] },
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
    rollupOptions: { output: { manualChunks } },
  },
});
```

قياس فعلي بعد التعديل (`npm run build`):

| الحزمة | الحجم | gzip | تُحمّل في البداية؟ |
| --- | ---: | ---: | --- |
| `index-*.js` | 500.87 kB | **133.15 kB** | نعم |
| `firebase-*.js` | 172.33 kB | 51.55 kB | `import()` فور الإقلاع، مستقل وقابل للكاش |
| `zxing-*.js` | 456.56 kB | 118.27 kB | لا (عند المسح) |
| `html2canvas-*.js` | 263.80 kB | 68.78 kB | لا (عند التصدير) |
| `full-report-*.js` | 37.86 kB | 9.25 kB | لا |
| `activity-log-view-*.js` | 14.79 kB | 4.68 kB | لا |

**ملاحظة صادقة:** ما تبقّى من تحذير "Unused JavaScript" سببه أن `src/main.js` ملف واحد كبير (≈855 kB قبل التصغير).
إزالة التحذير بالكامل تتطلب تفكيكه إلى وحدات (شاشة المخزون، شاشة المشتركين، الصندوق...) تُستورد بـ `import()`. هذا تغيير
واسع يحتاج اختبارات واجهة لكل شاشة، ولم يُنفَّذ هنا تجنّبًا لكسر السلوك؛ الأُسس جاهزة (كل شاشة أصبحت دالة مستقلة،
و`window.scheduleListRenders` يستدعيها تلقائيًا).

---

## 3) المهام الطويلة على الـ Main Thread

### 3.1 ما كان يحدث

`performFullRender()` كانت تفعل في **مهمة واحدة**: جمع الإحصاءات من آلاف السجلات، تحديث عشرات النصوص، **ثم**
إعادة بناء HTML لست قوائم مرئية. النتيجة مهمة واحدة طويلة (100–300 ms على هاتف متوسط) تُجمّد التمرير والنقر.

### 3.2 الحل: جدولة تعاونية + تقطيع زمني (`src/main-thread-scheduler.js`)

```js
const runner = createTimeSliceRunner({ budgetMs: 6 });   // 6 ms لكل شريحة
runner.run([renderProductsList, renderSalesList, renderCustomers]);
```

المنفّذ يتحقّق قبل كل خطوة: إن استهلكت الشريحة ميزانيتها، ينتظر `yieldToMain()` (الذي يستخدم
`scheduler.yield()` ثم `MessageChannel` ثم `setTimeout` كخطة أخيرة) ثم يكمل. النتائج:

- المهمة الطويلة الواحدة تتحول إلى عدة مهام < 50 ms، فيختفي تحذير Lighthouse.
- التشغيل **متسلسل** (queue) فلا يمكن أن يتراكب تمريران ويُفسدا الـ DOM.
- أي خطوة تفشل (قائمة واحدة) لا تُسقط الباقي — كما كان في السابق.

وفي `src/main.js` صار آخر `performFullRender()` يجمع أجزاء العرض ثم يسلّمها للمجدول:

```js
const listRenderQueue = [];
if (isVisible('productsView')) listRenderQueue.push(['productsList', renderProductsList]);
if (isVisible('dashboardView')) listRenderQueue.push(['salesList', renderSalesList]);
// ... باقي الأجزاء
scheduleListRenders(listRenderQueue); // تُنفَّذ بعد الرسم التالي، بشرائح 6 ms
```

`scheduleListRenders` تحتفظ فقط بأحدث دفعة (تمرير أقدم يُلغى لصالح الأحدث)، وتعمل حتى في تبويب مخفي عبر
مهلة احتياطية (`afterNextPaint(..., { timeout: 300 })`)، وتُعطَّل بـ `window.OMEGA_DEFER_LIST_RENDER = false`.

### 3.3 تأجيل الأعمال غير الحرجة إلى وقت الخمول

```js
// src/main.js: ترقيم تاريخ المبيعات الطويل يبدأ الآن في وقت خمول، لا أثناء أول رسم
whenIdle(() => window.completeSalesHistorySilently(), { timeout: 2000 });
```

`whenIdle` تستخدم `requestIdleCallback` مع `timeout`، وSafari (بلا `requestIdleCallback`) تحصل على `setTimeout`.

### 3.4 الوحدة العامة `runChunked` (للمجموعات الكبيرة داخل الحلقة نفسها)

```js
import { runChunked } from './main-thread-scheduler.js';

const rows = await runChunked(bigArray, item => computeRow(item), { budgetMs: 8 });
```

### 3.5 قياس المهام الطويلة بعد الإصلاح

أُضيف مراقب `PerformanceObserver('longtask')` يُسجّل كل مهمة > 50 ms:

```js
window.__omegaLongTasks;          // [{ start, duration, attribution }, …] آخر 100 مهمة
window.__omegaListRenderSteps;    // عدد خطوات العرض المنفّذة بالشرائح
window.__omegaDeferredRenderPasses;
```

في Lighthouse: قارن `Total Blocking Time` و`Main thread work` قبل/بعد. إن بقي TBT عاليًا فالسبب في تهيئة التطبيق نفسها
(تحليل/تنفيذ `index-*.js`)، ولذلك الطريق التالي هو تفكيك الملف الرئيسي كما في 2.3.

---

## 4) عن التخزين المؤقت (Cache TTL) بصراحة

1. **ردود Firebase `lp?`/`.json`**: لا تُخزَّن. هي بيانات حيّة، والنطاق خارج تحكّم Vercel. الحل الصحيح هو تقليل الحجم
   وعدد القنوات (تم) + كاش تطبيقي في IndexedDB (موجود).
2. **`/firebase.config.json` و`/assets/*` و`/fonts/*`**: هذه يمكن ويجب كاشها. `vercel.json` يضبط `immutable`
   للأصول ذات البصمة (hash) و`max-age=0, must-revalidate` لـ`sw.js` — وهذا سليم.
3. **`sw.js`**: لا تضع ردود Firebase في كاش الـ Service Worker إطلاقًا؛ اتركها للشبكة، وخزّن الأصول الثابتة فقط.

إن انتقلت لاحقًا إلى REST للقراءة (`fetch(...json)`)، فالأفضل طلب نطاق محدود:
`/v2/sales.json?orderBy="$key"&limitToLast=500&print=silent` (بدل `?print=pretty`)، وعدم طلب العقدة كاملة.

---

## 5) خطوات التحقق

```sh
npm run lint          # فحص صياغة الملفات الجديدة والقديمة
npm test              # 158 اختبارًا (منها 24 للوحدات الجديدة)
npm run build         # أحجام الحزم أعلاه
npm run test:ui       # فحص واجهة jsdom (يتطلب: npm install --no-save jsdom)
npm run dev           # ثم افتح التطبيق وتحقق في الـ console من:
                      # window.__omegaLongTasks / window.__omegaListRenderSteps
                      # window.firebaseListeners.stats()
```

في تبويب المتصفح، بدّل إلى تبويب آخر ثم ارجع: يجب أن ترى `stats().active` ينزل إلى 0 ثم يعود، ورسالة `Firebase: متصل ومزامن`
تظهر عند العودة دون طلب بيانات جديدة كاملة.
