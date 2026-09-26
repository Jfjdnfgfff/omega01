# تنظيم قاعدة البيانات — OMEGA GYM

وثيقة مرجعية لتنظيم قاعدة بيانات Firebase Realtime Database المستخدمة في النظام،
وهيكلية القراءة/الكتابة، وسياسة التزامن عند انقطاع الخدمة.

---

## 1. الهيكل العام (Source of Truth = `v2/`)

المسار `v2/` هو المصدر الأساسي لجميع البيانات. المسار الجذري (Legacy) يُستخدم كمرآة
توافقية للرجوع إلى الإصدارات القديمة، وكشبكة أمان للبيانات غير المهاجرة بعد.

```
/
├── v2/                          ← المصدر الأساسي (Realtime Listeners + REST)
│   ├── customers/               ← المشتركون
│   ├── customerByPhone/         ← فهرس: phone  → customerId
│   ├── customerByBarcode/       ← فهرس: barcode → customerId
│   ├── products/                ← المنتجات والمخزون
│   ├── productByBarcode/        ← فهرس: barcode → productId
│   ├── sales/                   ← المبيعات (نافذة زمنية محدودة آخر 3000 سجل مباشرة)
│   ├── salesByDate/             ← فهرس: dateKey → { saleId: true }
│   ├── expenses/                ← المصاريف
│   ├── expensesByDate/          ← فهرس: dateKey → { expenseId: true }
│   ├── credits/                 ← الديون والكروت
│   ├── openCreditsByCustomer/   ← فهرس: customerId → { creditId: true }
│   ├── suppliers/               ← الموردون
│   ├── supplierTransactions/    ← حركات الموردين
│   ├── staffPayouts/            ← صرف الموظفين
│   ├── coachAbsences/           ← غيابات المدربين
│   ├── packages/                ← الباقات
│   ├── quickSessions/           ← الحصص السريعة
│   ├── caisse/                  ← الصندوق: type=closing للإقفال، type=credit_payment لتسديد الديون (يُقرأ باسم caisseLogs)
│   ├── activityLogs/            ← سجل العمليات
│   ├── staff/                   ← بيانات الطاقم
│   ├── stats/                   ← تجميعات محسّنة O(1)
│   │   ├── daily/   (YYYY-MM-DD → { sales, salesCount, subIncome, profit... })
│   │   ├── monthly/ (YYYY-MM   → {...})
│   │   └── yearly/  (YYYY      → {...})
│   └── meta/
│       └── health.json          ← فحص اتصال خفيف (بطاقة حالة Firebase)
│
├── customers/ ... sales/ ...    ← مرآة Legacy (نفس الباقات السباقية أعلاه)
├── appState/                    ← إعدادات عامة (hideFinances, lastUpdated)
└── appState/{section}/{id}      ← مسارات حذف توافقية
```

## 2. فهارس الاستعلام (`.indexOn` في `database.rules.json`)

كل قسم له فهرس على الحقول المستخدمة في التصفية/الترتيب، على المستويين `v2/` والجذري،
مثال:

| القسم | الفهارس |
|---|---|
| `v2/customers` | phone, barcode, status, paymentStatus, startDate, endDate, createdAt, updatedAt |
| `v2/sales` | createdAt, dateKey, customerId, barcode, category, stockLocation, paymentMethod |
| `v2/expenses` | createdAt, dateKey, category |
| `v2/credits` | customerId, createdAt, dateKey, status |
| `v2/caisse` | dateKey, type, createdAt |
| `v2/quickSessions` | date, dateKey, createdAt |
| ... | (القائمة كاملة في `database.rules.json`) |

> ملاحظة: استعلامات العميل الحالية تعتمد `orderByKey()` مع مؤشرات مفاتيح جاهزة
> (فهارس `...ByPhone` / `...ByBarcode` / `...ByDate`)، لذلك تُحمّل البيانات بلا فرز
> في الذاكرة وبأقل كلفة ممكنة.

## 3. مسارات القراءة (سرعة التشغيل)

1. **التحميل الأولي (Startup)** — يُحمَّل فقط `v2/*` أولاً (Phase 1)، ولا يُحمَّل
   المسار الجذري إلا للأقسام التي تكون فيها بيانات `v2` فارغة (بيانات لم تُهاجر بعد)
   — هذا يقلّل حجم تنزيل الإقلاع إلى النصف تقريباً.
2. **المستمع المباشر (Realtime)** — مستمع مستقل لكل قسم؛ فشل مستمع لا يمنع
   بقية الأقسام. المبيعات محمّلة بنافذة محدودة `limitToLast(3000)` بدل تنزيل
   التاريخية كاملة عند كل تغيير.
3. **التصفّح بالمؤشر (Cursor Pagination)** — السجلات الأقدم تُجلب لاحقاً بصمت عبر
   `orderByKey() + endBefore()` دون مسح الذاكرة.
4. **التحميل الكسول (Lazy Load)** — كل قسم يُحمَّل عند فتح شاشته فقط، مع سلوك
   احتياطي: إن كان `v2` فارغاً يرجع للمسار الجذري تلقائياً.

## 4. مسارات الكتابة وسياسة المزامنة المزدوجة

عند حفظ أي عنصر (`saveFirebaseSectionItem`) تُكتب النسخة معاً في:

```
v2/{section}/{id}          ← المصدر الأساسي
{section}/{id}             ← مرآة Legacy
+ الفهارس المشتقة (salesByDate, customerByPhone, ...)
```

- **`window.pendingWrites`** — خريطة تمنع تكرار نفس العملية (dedup) أثناء تنفيذها.
- **التطابق (Dedup) عند الدمج** — `applyFirebaseSectionUpdate` تدمج بـ Map مبني
  على المفتاح، وآخر بيانات Firebase تتغلب، مع كتم IDs محذوفة (tombstones)
  حتى لا ي resurrect أي عنصر محذوف.

## 5. التحمّل عند توقف الخدمة (Offline Queue)

لو فشلت الكتابة (الخدمة متوقفة/الإنترنت مقطوع) —

1. تدخل العملية في **طابور مؤجّل** `window.firebaseWriteQueue` عبر
   `queueFirebaseWrite()` ويُحفظ فوراً في `localStorage`
   (`sm_firebaseWriteQueue`) — أي يصمد حتى بعد إعادة تحميل الصفحة.
2. **`drainFirebaseWriteQueue()`** يعيد الإرسال تلقائياً عند:
   - عودة الاتصال (`window.addEventListener('online')`)
   - مؤقّت إعادة محاولة كل 20 ثانية (فقط لو هناك عمليات معلّقة)
   - بعد الإقلاع بـ 8 ثوانٍ (لرفع عمليات محفوظة من جلسة سابقة)
3. كل عملية تُعالج بالترتيب (FIFO)، وعند أول فشل واضح تتوقف الجولة وتُحاول لاحقاً
   دون فقدان أي عنصر.
4. بطاقة الحالة أعلى الشاشة تعرض `بانتظار المزامنة (N)` أثناء التصحيح، و`وضع عدم
   الاتصال` عند قطع الشبكة.

كما يعمل مسار الكتابة على ثلاث طبقات: **SDK → REST → الطابور المؤجّل**.

## 6. عزل الأجزاء (Fault Isolation)

| الطبقة | الحماية |
|---|---|
| خطأ عام في أي جزء | حدود خطأ عامة (`error` / `unhandledrejection`) تسجّل وتُظهر تنبيهاً دون إيقاف البقية |
| دورة العرض `render()` | try/catch حول كل دورة + try/catch مستقل لكل قائمة (منتجات/مبيعات/عملاء/صندوق...) |
| دمج البيانات | try/catch داخل `applyFirebaseSectionUpdate` لكل قسم |
| المستمعات | تسجيل واستقبال مستقل لكل قسم |
| الإقلاع | فشل قسم واحد أثناء المزامنة الأولية لا يمنع بقية الأقسام (ومحاولة تحميل كسلية احتياطية) |
| `saveState()` | معزول بالكامل — فشل التخزين/المزامنة لا يمنع استمرار التطبيق |

## 7. أدوات الترحيل والمزامنة

| الأداة | الوظيفة |
|---|---|
| `scripts/migrate-to-v2.js` | ترحيل آمن من Legacy إلى `v2/` (idempotent، لا يحذف القديم، يدعم `--dry-run`) |
| `scripts/sync-all-to-both.js` | مزامنة كاملة بين الهيكرين (Legacy ↔ v2) |
| `database.rules.json` | الفهارس وقواعد القراءة/الكتابة |

```bash
# معاينة الترحيل دون كتابة:
node scripts/migrate-to-v2.js --dry-run
```
