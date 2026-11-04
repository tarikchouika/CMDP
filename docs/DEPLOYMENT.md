<div dir="rtl">

# دليل النشر والبيئة المحلية
### CMDP — المنصة الرقمية لإدارة التعاونيات

---

## 1) نظرة عامة على طوبولوجيا النشر

```
                        ┌──────────────────────────┐
   المستخدم ──────────▶ │  Cloudflare Pages (ساكن) │  cmdp.pages.dev
                        │  واجهة كاملة + بيانات عرض │
                        └───────────┬──────────────┘
                                    │ (اختياري — من الإعدادات)
                                    ▼
                        ┌──────────────────────────┐
   مساعد البيئة المحلية │  الباك إند المحلي         │  http://<IP-المحلي>:3000
   يشرف على هذه الطبقة  │  Next.js API + SQLite     │  قاعدة: db/custom.db
                        └──────────────────────────┘
```

- **النسخة الساكنة** تعمل فوراً ببيانات نموذجية مدمجة (وضع العرض التجريبي).
- عند تشغيل الباك إند المحلي، أدخل عنوانه في **الإعدادات ← الاتصال بالباك إند المحلي**
  داخل النسخة المنشورة، فتتحول فوراً إلى بيانات حقيقية من SQLite المحلية
  (CORS مفعَّل افتراضياً في كل مسارات `/api/*`).

## 2) تشغيل الباك إند محلياً (مسؤولية مساعد البيئة المحلية)

```bash
git clone https://github.com/tarikchouika/CMDP.git
cd CMDP
npm install
cp .env.example .env        # DATABASE_URL=file:./db/custom.db
npm run db:push             # إنشاء جداول SQLite
npm run seed                # البيانات النموذجية (اختياري)
npm run dev                 # الباك إند + الواجهة على http://localhost:3000
```

**بيانات الدخول:** `admin` / `cmdp2026` — *(يُنصح بتغييرها في أي استخدام فعلي).*

### إتاحة الباك إند للشبكة المحلية

للوصول من الهواتف/التابلت على نفس الشبكة:

```bash
npm run dev -- -H 0.0.0.0
# ثم استعمل عنوان الجهاز، مثال: http://192.168.1.10:3000
```

### الفحص والنسخ الاحتياطي (روتين مساعد البيئة)

| العملية | الأمر / الخطوة |
| --- | --- |
| صحة API | `curl http://localhost:3000/api/cooperatives` → 200 |
| نسخ احتياطي | نسخ `db/custom.db` إلى `backups/custom-YYYY-MM-DD.db` |
| استرجاع نسخة | إيقاف الخادم ثم استبدال `db/custom.db` بالنسخة |
| إعادة ضبط تجريبية | `curl -X POST http://localhost:3000/api/seed` أو زر الإعدادات |

## 3) بناء النسخة الساكنة

```bash
npm run build:static
# المخرجات في out/ — يعمل السكريبت على:
#   ① إزالة مؤقتة لـ src/app/api (غير متوافق مع export)
#   ② next build بوضع CMDP_STATIC=1 (output: export)
#   ③ إعادة مجلد API تلقائياً
```

للنسخة الساكنة الموجهة لباك إند محدد وقت البناء (بديل عن الضبط من الواجهة):

```bash
NEXT_PUBLIC_API_BASE=http://192.168.1.10:3000 npm run build:static
```

## 4) النشر على Cloudflare Pages

### الطريقة الأولى — Wrangler CLI (مباشرة)

```bash
npm install -g wrangler
# ضبط المتغيرات (مرة واحدة)
export CLOUDFLARE_API_TOKEN=<رمز-API-من-لوحة-Cloudflare>
export CLOUDFLARE_ACCOUNT_ID=<معرف-الحساب>

npm run build:static
npx wrangler pages deploy out --project-name cmdp
# النتيجة: https://cmdp.pages.dev
```

### الطريقة الثانية — ربط مستودع Git (تكامل مستمر)

1. من لوحة Cloudflare: **Workers & Pages ← Create ← Pages ← Connect to Git**
2. اختر مستودع `tarikchouika/CMDP` والفرع `main`
3. إعدادات البناء:
   - **Build command:** `npm run build:static`
   - **Build output directory:** `out`
   - **Node version** (متغير بيئة): `NODE_VERSION = 20`
4. احفظ — كل دفع إلى `main` ينشر نسخة محدثة تلقائياً.

### ملاحظات

- لا حاجة لأي متغيرات بيئة على Cloudflare (وضع العرض يكفي)، و`NEXT_PUBLIC_API_BASE`
  اختياري لتوجيه ثابت.
- النطاق البديل `cmdp.vercel.app`: نفس الخطأ والمنطق على Vercel
  (Build: `npm run build:static`، Output: `out`) — الأولوية الحالية لـ Cloudflare.

## 5) استكشاف الأخطاء

| المشكلة | السبب المحتمل | الحل |
| --- | --- | --- |
| النسخة المنشورة تعرض «وضع العرض التجريبي» | الباك إند غير شغال أو العنوان غير مضبوط | شغّل الباك إند محلياً وأدخل عنوانه من الإعدادات |
| «تعذر الوصول إلى العنوان المحدد» | خادم متوقف / IP خاطئ / جدار حماية | تحقق من `curl` من نفس الجهاز ثم من المتصفح |
| 405 عند تعديل البيانات | أنت في وضع العرض | هذا طبيعي — شغّل الباك إند المحلي |
| خطأ Prisma بعد سحب تحديث للمخطط | تغير schema.prisma | `npm run db:push` (تحفظ البيانات) أو `db:reset` (تصفير) |

</div>
