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

   المساعد الألي ─────▶ ┌──────────────────────────┐
   (شاتبوت)             │  Cloudflare Workers AI   │  cmdp-assistant.
                        │  حساب مستقل عن الاستضافة  │  tkchouika-cmdp.workers.dev
                        └──────────────────────────┘
```

- **النسخة الساكنة** تعمل فوراً ببيانات نموذجية مدمجة (وضع العرض التجريبي).
- عند تشغيل الباك إند المحلي، أدخل عنوانه في **الإعدادات ← الاتصال بالباك إند المحلي**
  داخل النسخة المنشورة، فتتحول فوراً إلى بيانات حقيقية من SQLite المحلية
  (CORS مفعَّل افتراضياً في كل مسارات `/api/*`).
- **المساعد الألي** يعمل على حساب Cloudflare مستقل (مخصص له) ويُستدعى من الواجهة
  مباشرة؛ عند تعذره يتحول تلقائياً لقاعدة أسئلة محلية داخل المتصفح.

## 2) تشغيل الباك إند محلياً (مسؤولية مساعد البيئة المحلية)

```bash
git clone https://github.com/tarikchouika/CMDP.git
cd CMDP
npm install
cp .env.example .env        # DATABASE_URL=file:./db/custom.db
npm run db:push             # إنشاء جداول SQLite (يشمل جداول 1.1.0)
npm run seed                # البيانات النموذجية (اختياري)
npm run dev                 # الباك إند + الواجهة على http://localhost:3000
```

**حسابات الدخول النموذجية** (كلمة المرور الموحدة: `cmdp2026`):

| الحساب | الدور | النطاق |
| --- | --- | --- |
| `superadmin` | سوبر أدمين — مالك المنصة | كل الصلاحيات |
| `admin` | أدمن منصة | التعاونيات والحسابات والكوأدمن |
| `president` | كوأدمن — رئيسة تعاونية تافوكت | التعاونية 1 |
| `manager` | كوأدمن — عضو مسير (نسج الأطلس) | التعاونية 2 |
| `member` | مستخدم — عضو غير مسير | التعاونية 1 (فضائي) |
| `contractor` | مستخدم — متعاقد | التعاونية 3 (فضائي) |

> عند سحب تحديث يغير `schema.prisma`: `npm run db:push` ثم `npm run seed` لإعادة
> البيانات النموذجية بحسابات الأدوار.

## 3) المساعد الألي (شاتبوت) — حساب Cloudflare المستقل

العامل منشور في مجلد `chatbot-worker/` داخل المستودع:

```
chatbot-worker/
├── worker.js         # منطق العامل: CORS + تحديد معدل + تعليمات صارمة + تنقية المخرجات
└── wrangler.toml     # اسم العامل + ربط Workers AI (env.AI)
```

- **العنوان الحي:** `https://cmdp-assistant.tkchouika-cmdp.workers.dev`
- **النموذج:** `@cf/openai/gpt-oss-120b` (لاحظ: `llama-3.1-8b-instruct` أُوقف
  بتاريخ 2026-05-30 — لا تستعمله)
- **ضمانات عدم الهلوسة:** قائمة روابط بيضاء حصرية في التعليمات، ونطاق محدد
  (المنصة والتعاونيات)، واعتذار صريح عند عدم اليقين، وتنقية رموز harmony الخام.
- **الحد:** 15 طلباً/دقيقة لكل عنوان IP.

### نشر العامل أو تحديثه

**آلياً (المُعتمدة):** تبويب **Actions** في المستودع ← سير
«Chatbot Worker — CMDP» ← **Run workflow** — ينشر `chatbot-worker/`
بالأسرار `CHATBOT_CLOUDFLARE_API_TOKEN` و`CHATBOT_CLOUDFLARE_ACCOUNT_ID`
ثم يتحقق من العنوان الحي. تشغيل يدوي عمداً حفاظاً على استقرار الخدمة.

**يدوياً (احتياطية):**

```bash
cd chatbot-worker
export CLOUDFLARE_API_TOKEN=<رمز-حساب-الشاتبوت>
export CLOUDFLARE_ACCOUNT_ID=16e5367232096a5912f4ebf5ee62acf2
npx wrangler deploy
# فحص الصحة:
curl https://cmdp-assistant.tkchouika-cmdp.workers.dev/
```

> الرموز الخاصة بحساب الشاتبوت تُدار خارج المستودع (لا تُرفع أبداً إلى Git).
> عنوان العامل قابل للتغيير من الواجهة عبر متغير البناء `NEXT_PUBLIC_CHATBOT_URL`.

## 4) الفحص والنسخ الاحتياطي (روتين مساعد البيئة)

| العملية | الأمر / الخطوة |
| --- | --- |
| صحة API | `curl http://localhost:3000/api/cooperatives` → 200 |
| صحة الشاتبوت | `curl https://cmdp-assistant.tkchouika-cmdp.workers.dev/` → `{"ok":true}` |
| نسخ احتياطي | نسخ `db/custom.db` إلى `backups/custom-YYYY-MM-DD.db` |
| استرجاع نسخة | إيقاف الخادم ثم استبدال `db/custom.db` بالنسخة |
| إعادة ضبط تجريبية | `curl -X POST http://localhost:3000/api/seed` أو زر الإعدادات |

## 5) بناء النسخة الساكنة

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

ولتوجيه الشاتبوت إلى عنوان آخر (نموذج مختلف مثلاً):

```bash
NEXT_PUBLIC_CHATBOT_URL=https://<عامل-بديل>.workers.dev npm run build:static
```

## 6) النشر على Cloudflare Pages

### الطريقة الأولى — سير GitHub Actions (تلقائية — المُعتمدة)

كل دفع إلى `main` يتضمن تغييرات خارج التوثيق ينشر النسخة الساكنة تلقائياً
عبر سير العمل `.github/workflows/deploy-pages.yml`:

```
الدفع إلى main ← GitHub Actions:
  ① استنساخ المستودع
  ② Bun (تثبيت حتمي عبر bun.lock) + Node.js 24
  ③ بناء الساكن npm run build:static
  ④ npx wrangler pages deploy out --project-name=cmdp --branch=main
  ⑤ تحقق الموقع الحي HTTP 200 — يفشل السير تلقائياً عند تعذّره
```

- **الأسرار المطلوبة** (مضبوطة في إعدادات المستودع ←
  Settings ← Secrets and variables ← Actions):
  - `CLOUDFLARE_API_TOKEN` — رمز حساب الاستضافة (صلاحيات Pages: Edit)
  - `CLOUDFLARE_ACCOUNT_ID` — معرّف حساب الاستضافة
- **تشغيل يدوي:** تبويب Actions ← «Cloudflare Pages — CMDP» ← Run workflow.
- تغييرات التوثيق وحدها (`docs/**` و`**.md`) لا تُطلق نشراً — لا انتظار
  لسير النشر عند تحرير المستندات فقط.

### الطريقة الثانية — Wrangler CLI يدوياً (احتياطية)

تُستعمل للنشر من بيئة محلية دون المرور بـ GitHub:

```bash
# ضبط المتغيرات (مرة واحدة) — حساب الاستضافة الرئيسي
export CLOUDFLARE_API_TOKEN=<رمز-API-من-لوحة-Cloudflare>
export CLOUDFLARE_ACCOUNT_ID=f52dfb7ec8fc9a148c30f567a8f50332

npm run build:static
npx wrangler pages deploy out --project-name cmdp --branch main
# النتيجة: https://cmdp.pages.dev
```

> **ملاحظة معمارية:** مشروع Pages «cmdp» بنمط **الرفع المباشر** (Direct Upload)
> ولا يُربط بمستودع Git من لوحة Cloudflare — التكامل المستمر يمر حصرياً عبر
> GitHub Actions بالأسرار أعلاه، ما يعزل الرموز عن المستودع ويضمن حتمية
> التثبيت عبر `bun.lock`.

### ملاحظات

- لا حاجة لأي متغيرات بيئة على Cloudflare (وضع العرض يكفي)، و`NEXT_PUBLIC_API_BASE`
  و`NEXT_PUBLIC_CHATBOT_URL` اختياريان لتوجيه ثابت.
- النطاق البديل `cmdp.vercel.app`: نفس المنطق على Vercel
  (Build: `npm run build:static`، Output: `out`) — الأولوية الحالية لـ Cloudflare.

## 7) استكشاف الأخطاء

| المشكلة | السبب المحتمل | الحل |
| --- | --- | --- |
| النسخة المنشورة تعرض «وضع العرض التجريبي» | الباك إند غير شغال أو العنوان غير مضبوط | شغّل الباك إند محلياً وأدخل عنوانه من الإعدادات |
| «تعذر الوصول إلى العنوان المحدد» | خادم متوقف / IP خاطئ / جدار حماية | تحقق من `curl` من نفس الجهاز ثم من المتصفح |
| 401 عند تعديل البيانات | انتهت صلاحية رمز الدخول (7 أيام) أو الحساب موقوف | أعد تسجيل الدخول |
| 403 عند عملية ما | الدور لا يملك الصلاحية أو خارج نطاق التعاونية | سلوك مقصود — راجع مصفوفة الأدوار في AGENT-PROTOCOL |
| «خطأ Prisma بعد سحب تحديث» | تغير schema.prisma | `npm run db:push` ثم `npm run seed` |
| المساعد الألي يرد برد عام | العامل غير متاح مؤقتاً (يعمل البديل المحلي) | افحص العنوان الحي أعلاه ثم أعد المحاولة |
| المساعد الألي يرد برموز غريبة | تسرب مخرجات harmony | التنقية مدمجة في worker.js — تأكد من آخر نسخة منشورة |

</div>
