// ═══════════════════════════════════════════════════════════════════════════
// CMDP — صفحة تثبيت تطبيق الأندرويد: التحميل + تجاوز Play Protect + الشهادة
// عمومية — تُعرض بخمس لغات وتُترجم آنياً
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  Download,
  Fingerprint,
  Globe2,
  Phone,
  QrCode,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Tablet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { useUIStore } from "@/store/ui";
import { CmdpLogo, DividerZellige, ZelligeStar } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/** الرابط الدائم لآخر إصدار موقَّع */
const APK_URL = "https://github.com/tarikchouika/CMDP/releases/download/android-latest/CMDP.apk";
const RELEASES_URL = "https://github.com/tarikchouika/CMDP/releases";
const CERT_SHA256 = "85:51:0A:9D:10:8F:EE:D5:62:2D:D8:C1:61:60:F7:52:E2:31:8A:06:29:88:92:4F:A7:82:FD:A4:A9:E1:53:FD";

/** خطوة مرقّمة */
function Step({ n, icon: Icon, title, children }: {
  n: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-4 ps-1">
      <div className="flex flex-col items-center">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl border border-saffron/40 bg-saffron/15 font-display text-sm font-black text-[#8a6414]">
          {n}
        </span>
        <span className="mt-2 w-px flex-1 bg-gradient-to-b from-saffron/40 to-transparent" aria-hidden="true" />
      </div>
      <div className="pb-8">
        <h3 className="flex items-center gap-2 font-display text-sm font-extrabold text-foreground md:text-base">
          <Icon className="size-4 text-terra" />
          {title}
        </h3>
        <div className="mt-2 space-y-2 text-sm leading-7 text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/** زر إعداد مُلوَّن داخل التعليمات */
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-0.5 inline-block rounded-lg border border-terra/30 bg-terra/10 px-2 py-0.5 text-xs font-bold text-terra">
      {children}
    </span>
  );
}

export function InstallView() {
  const setView = useUIStore((s) => s.setView);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* الترويسة */}
      <header className="sticky top-0 z-40 border-b border-cream/10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-4 md:px-6">
          <button onClick={() => setView("landing")} aria-label="CMDP">
            <CmdpLogo light />
          </button>
          <span className="me-auto hidden text-sm text-cream/75 md:block">
            {t("تثبيت تطبيق الأندرويد")}
          </span>
          <Button
            onClick={() => setView("landing")}
            variant="outline"
            className="gap-1.5 border-cream/25 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"
          >
            <ArrowLeft className="size-4 rtl:rotate-180 ltr:rotate-0" />
            {t("الرئيسية")}
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 md:px-6">
        {/* البطاقة الرئيسية: التحميل */}
        <Card className="relative overflow-hidden border-saffron/25 bg-gradient-to-br from-ink via-ink to-terra-soft/20 text-cream shadow-xl">
          <div className="pattern-zellige-cream absolute inset-0 opacity-40" aria-hidden="true" />
          <CardContent className="relative grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:p-12">
            <div>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/chatbot-icon.webp" alt="CMDP" className="size-16 rounded-3xl shadow-lg" />
                <div>
                  <h1 className="font-display text-2xl font-black text-cream md:text-3xl">
                    {t("تطبيق CMDP لأندرويد")}
                  </h1>
                  <p className="mt-1 text-xs text-cream/70">
                    {t("المنصة الرقمية لإدارة التعاونيات — في جيبكم")}
                  </p>
                </div>
              </div>

              <ul className="mt-6 grid gap-2.5 text-sm text-cream/85 sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <Smartphone className="size-4 text-saffron" />
                  {t("هواتف ولوحيات — ملء الشاشة 100%")}
                </li>
                <li className="flex items-center gap-2">
                  <Globe2 className="size-4 text-saffron" />
                  {t("خمس لغات: العربية والفرنسية والإنجليزية والإيطالية والإسبانية")}
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-saffron" />
                  {t("موقَّع بشهادة ملكية رقمية لمدة 30 سنة")}
                </li>
                <li className="flex items-center gap-2">
                  <Sparkles className="size-4 text-saffron" />
                  {t("يُحدَّث تلقائياً مع كل تحديث للمنصة")}
                </li>
              </ul>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="gap-2 bg-saffron px-8 text-sm font-black text-ink hover:bg-saffron/85"
                  onClick={() => window.open(APK_URL, "_blank", "noopener")}
                >
                  <Download className="size-4" />
                  {t("تحميل آخر إصدار (APK)")}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 border-cream/25 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"
                  onClick={() => window.open(RELEASES_URL, "_blank", "noopener")}
                >
                  <BadgeCheck className="size-4" />
                  {t("سجل الإصدارات")}
                </Button>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-cream/55">
                {t("الرابط دائم ويشير دائماً إلى آخر إصدار موقَّع — أضيفوه للمفضلة وشاركوه مع أعضاء التعاونية.")}
              </p>
            </div>

            {/* رمز الاستجابة */}
            <div className="mx-auto flex flex-col items-center gap-2 rounded-3xl border border-cream/15 bg-cream/95 p-5 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/qr-apk-download.png" alt="QR — CMDP APK" className="size-40 rounded-2xl" />
              <p className="flex items-center gap-1.5 text-[11px] font-bold text-ink">
                <QrCode className="size-3.5" />
                {t("امسحوا الرمز بالكاميرا للتحميل")}
              </p>
            </div>
          </CardContent>
        </Card>

        <DividerZellige className="my-10 opacity-60" />

        {/* خطوات التثبيت */}
        <div className="grid gap-10 lg:grid-cols-2">
          <section>
            <h2 className="flex items-center gap-2 font-display text-lg font-extrabold text-foreground">
              <ZelligeStar className="size-4 text-terra" />
              {t("خطوات التحميل والتثبيت")}
            </h2>
            <p className="mt-2 text-sm leading-7 text-muted-foreground">
              {t("خمس خطوات بسيطة تفصلكم عن المنصة على أجهزتكم:")}
            </p>
            <div className="mt-6">
              <Step n={1} icon={Download} title={t("تحميل ملف التطبيق")}>
                <p>
                  {t("اضغطوا زر «تحميل آخر إصدار» أعلاه، أو امسحوا رمز الاستجابة بالكاميرا. سيُحمَّل ملف")}{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-bold">CMDP.apk</code>{" "}
                  {t("إلى مجلد التنزيلات (يستغرق ثوانٍ).")}
                </p>
              </Step>

              <Step n={2} icon={ShieldCheck} title={t("السماح بالتثبيت من هذا المصدر")}>
                <p>
                  {t("عند أول تثبيت من خارج متجر Play، سيطلب أندرويد السماح للمتصفح بتثبيت التطبيقات:")}
                </p>
                <p className="rounded-2xl border border-border bg-muted/50 p-3 text-xs leading-6">
                  {t("إعدادات أندرويد")} ← <Kbd>{t("التطبيقات")}</Kbd> ← <Kbd>Chrome</Kbd> ←{" "}
                  <Kbd>{t("تثبيت تطبيقات غير معروفة")}</Kbd> ← {t("اسمح")}
                </p>
                <p className="text-xs text-muted-foreground/80">
                  {t("قد تختلف التسمية حسب نسخة أندرويد: «مصادر غير معروفة» أو «تثبيت من مصادر خارجية». المس الموثوق هو المتصفح الذي حمّلتم منه الملف.")}
                </p>
              </Step>

              <Step n={3} icon={Fingerprint} title={t("تجاوز تنبيه Play Protect")}>
                <p>
                  {t("قد يظهر تنبيه من حماية Play لأن التطبيق مثبَّت خارج المتجر — هذا طبيعي لكل تطبيق موقَّع ذاتياً. للتابع:")}
                </p>
                <ol className="space-y-2">
                  <li>
                    <Kbd>1</Kbd> {t("في نافذة «تم حظر التطبيق» اضغطوا")}{" "}
                    <Kbd>{t("تفاصيل إضافية")}</Kbd>
                  </li>
                  <li>
                    <Kbd>2</Kbd> {t("ثم اضغطوا")}{" "}
                    <Kbd>{t("تثبيت التطبيق على أي حال")}</Kbd>
                  </li>
                  <li>
                    <Kbd>3</Kbd> {t("تابعوا التثبيت العادي حتى النهاية")}
                  </li>
                </ol>
                <p className="rounded-2xl border border-zellij/25 bg-zellij/10 p-3 text-xs leading-6 text-foreground/80">
                  <ShieldCheck className="me-1 inline size-3.5 text-zellij" />
                  {t("لماذا يظهر التنبيه؟")}{" "}
                  {t("لأن الملف لا يُوزَّع عبر متجر Google. تطبيقنا موقَّع بشهادة CN=TARIK CHOUIKA بصلاحية 30 سنة، ويمكنكم التحقق من بصمة الشهادة أدناه بعد التثبيت.")}
                </p>
              </Step>

              <Step n={4} icon={CheckCircle2} title={t("إتمام التثبيت")}>
                <p>
                  {t("اضغطوا «تثبيت» في نافذة المثبِّت، ثم «فتح» عند انتهائه. ستجدون أيقونة CMDP الذهبية على الشاشة الرئيسية.")}
                </p>
              </Step>

              <Step n={5} icon={Phone} title={t("الوضع المغمّس — ملء الشاشة")}>
                <p>
                  {t("يفتح التطبيق ملء الشاشة 100% مع إخفاء شريطي الحالة والتنقل العلوي والسفلي.")}
                </p>
                <p>
                  {t("لإظهار الشريطين مؤقتاً: اسحبوا من الحافة العلوية أو السفلية للشاشة — يظهران بلمسة أنيقة ثم يختفيان تلقائياً بعد ثوانٍ، كما في التطبيقات الاحترافية.")}
                </p>
                <p className="flex items-center gap-2 text-xs text-muted-foreground/80">
                  <Tablet className="size-3.5" />
                  {t("يعمل التطبيق بانسجام تام على الهواتف واللوحيات بكل أحجام الشاشات والاتجاهات.")}
                </p>
              </Step>
            </div>
          </section>

          {/* العمود الثاني: الشهادة والتحقق */}
          <section className="space-y-6">
            <Card className="border-terra/25 bg-card">
              <CardContent className="p-6">
                <h2 className="flex items-center gap-2 font-display text-base font-extrabold text-foreground">
                  <BadgeCheck className="size-4 text-terra" />
                  {t("شهادة الملكية الرقمية")}
                </h2>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">{t("المالك (الموقِّع)")}</dt>
                    <dd className="font-mono font-bold text-foreground">CN=TARIK CHOUIKA</dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">{t("صلاحية الشهادة")}</dt>
                    <dd className="font-bold text-foreground">
                      30 {t("سنة")} — 2026 → 2056
                    </dd>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2">
                    <dt className="text-muted-foreground">{t("خوارزمية التوقيع")}</dt>
                    <dd className="font-mono text-xs font-bold text-foreground">RSA 4096 · SHA-384</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t("بصمة SHA-256")}</dt>
                    <dd className="mt-1 break-all rounded-xl bg-muted/60 p-2.5 font-mono text-[10px] leading-5 text-foreground/80" dir="ltr">
                      {CERT_SHA256}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-xs leading-6 text-muted-foreground">
                  {t("كل إصدار يُبنى ويُوقَّع آلياً بسير عمل GitHub موثَّق، ويمكن مقارنة البصمة أعلاه مع شهادة التطبيق المثبَّت عبر: الإعدادات ← بصمات التطبيق، أو بأمر apksigner.")}
                </p>
              </CardContent>
            </Card>

            <Card className="border-saffron/25 bg-saffron/10">
              <CardContent className="p-6">
                <h2 className="flex items-center gap-2 font-display text-base font-extrabold text-[#8a6414]">
                  <Download className="size-4" />
                  {t("التحديث إلى إصدار أحدث")}
                </h2>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-foreground/80">
                  <li>
                    • {t("حمّلوا الملف الجديد من نفس الرابط الدائم وثبّتوه فوق القديم — تُحفظ بياناتكم وجلساتكم.")}
                  </li>
                  <li>
                    • {t("لا حاجة لإزالة الإصدار السابق: التوقيع نفسه فيضمن التحديث السلس.")}
                  </li>
                  <li>
                    • {t("محتوى المنصة نفسه يتحدث تلقائياً داخل التطبيق دون أي تثبيت جديد.")}
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-border bg-card">
              <CardContent className="p-6">
                <h2 className="font-display text-base font-extrabold text-foreground">
                  {t("المتطلبات")}
                </h2>
                <ul className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                  <li>• {t("أندرويد 7.0 (API 24) أو أحدث")}</li>
                  <li>• {t("اتصال بالإنترنت")}</li>
                  <li>• {t("~20 ميغابايت من المساحة")}</li>
                  <li>• {t("أذونات التثبيت من مصدر غير معروف")}</li>
                </ul>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      <footer className="mt-auto border-t border-border bg-card/60 px-6 py-5 text-center text-xs text-muted-foreground">
        © 2026 CMDP — {t("المنصة الرقمية لإدارة التعاونيات")}
      </footer>
    </div>
  );
}
