// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الصفحة الرئيسية (واجهة المنصة التعريفية)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  Building2,
  CalendarClock,
  FileCheck2,
  Gavel,
  Landmark,
  LayoutDashboard,
  Moon,
  Palette,
  Scale,
  ScrollText,
  Sun,
  UserPlus,
  Users,
  Wallet,
  Smartphone,
  Store,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import { SECTOR_STATS, FOUNDATION_STEPS, APP_NAME } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { useUIStore, type View } from "@/store/ui";
import { CmdpLogo, CmdpMark, DividerZellige, SectionHeading, ZelligeStar } from "@/components/patterns";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

const MINI_SERIES = [
  { m: "ينا", v: 142 },
  { m: "فبر", v: 168 },
  { m: "مار", v: 155 },
  { m: "أبر", v: 196 },
  { m: "ماي", v: 210 },
  { m: "يون", v: 188 },
  { m: "يول", v: 232 },
  { m: "غشت", v: 224 },
  { m: "شتن", v: 268 },
  { m: "أكت", v: 312 },
  { m: "نون", v: 356 },
  { m: "دجن", v: 384 },
];

const MODULES: { view: View; title: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: "dashboard", title: "لوحة القيادة", desc: "مؤشرات ورسوم بيانية فورية لسلامة التعاونية", icon: LayoutDashboard },
  { view: "cooperatives", title: "التعاونيات", desc: "بطاقات التعاونيات، التسجيل بالسجل المحلي وبطاقة ODCO", icon: Building2 },
  { view: "members", title: "الأعضاء والحصص", desc: "سجل المنخرطين، مناصب المجلس والاشتراكات", icon: Users },
  { view: "assembly", title: "الجمع العام والمجلس", desc: "الجمعات العامة ومحاضرها واجتماعات المجلس", icon: Gavel },
  { view: "finance", title: "المالية والصندوق", desc: "المداخيل والمصاريف والتقارير المالية الجاهزة", icon: Wallet },
  { view: "documents", title: "سجل الوثائق", desc: "أرشيف مؤرشف زمنياً مع تنبيهات انتهاء الصلاحية", icon: FileCheck2 },
  { view: "entities", title: "الجهات الوصية", desc: "ODCO والضرائب وCNSS وتتبع التفاعلات معها", icon: Landmark },
  { view: "regulations", title: "القوانين واللوائح", desc: "مكتبة قانونية: 112.12 والمراسيم والمبادئ", icon: ScrollText },
];

const FEATURES = [
  { icon: BarChart3, title: "رقمنة شاملة", desc: t("كل وحدات التسيير في منصة واحدة مترابطة — من الأعضاء إلى التقارير.") },
  { icon: Scale, title: "امتثال قانوني", desc: t("تتبع التزامات القانون 112.12 والمرسوم 2.15.617 مع تنبيهات قبل الآجال.") },
  { icon: Wallet, title: "حكامة مالية", desc: t("صندوق شفاف، تصنيف آلي للمداخيل والمصاريف، وتقارير للجمع العام.") },
  { icon: CalendarClock, title: "مواعيد نظامية", desc: t("لا مزيد من الغرامات: المنصة تذكرك بالجمع العام والتصريحات السنوية.") },
  { icon: Landmark, title: "شبكة الجهات الوصية", desc: t("دليل تفاعلي للجهات الحكومية والإدارية مع سجل المراسلات والطلبات.") },
  { icon: Palette, title: "تصميم مغربي عصري", desc: t("واجهة عربية كاملة بروح الزليج والقوس المغربي، متجاوبة مع كل الشاشات.") },
];

function Header() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  const authed = useUIStore((s) => s.authed);
  const setView = useUIStore((s) => s.setView);

  return (
    <header className="sticky top-0 z-40 border-b border-cream/10 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 md:px-6">
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="CMDP">
          <CmdpLogo light />
        </button>
        <nav className="me-auto hidden items-center gap-6 text-sm text-cream/75 md:flex">
          <a href="#features" className="transition-colors hover:text-cream">{t("المزايا")}</a>
          <a href="#modules" className="transition-colors hover:text-cream">{t("الوحدات")}</a>
          <button onClick={() => setView("opportunities")} className="transition-colors hover:text-cream">{t("فرص العمل")}</button>
          <button onClick={() => setView("store")} className="transition-colors hover:text-cream">{t("المتجر")}</button>
          <button onClick={() => setView("legal", { doc: "terms" })} className="transition-colors hover:text-cream">{t("المركز القانوني")}</button>
        </nav>
        <LanguageSwitcher className="border-cream/25 bg-transparent text-cream/85 hover:bg-cream/10 hover:text-cream" />
        <Button
          variant="ghost"
          size="icon"
          className="text-cream/70 hover:bg-cream/10 hover:text-cream"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          aria-label={t("تبديل المظهر")}
        >
          {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="hidden text-cream/80 hover:bg-cream/10 hover:text-cream sm:inline-flex"
          onClick={() => setView("register")}
        >
          <UserPlus className="me-1 size-4" />
          {t("حساب جديد")}
        </Button>
        <Button
          onClick={() => setView(authed ? "dashboard" : "login")}
          className="gap-1.5 bg-terra-soft font-bold text-ink hover:bg-terra-soft/85"
        >
          {authed ? t("المنصة") : t("الدخول")}
          <ArrowLeft className="size-4" />
        </Button>
      </div>
    </header>
  );
}

function Hero() {
  const authed = useUIStore((s) => s.authed);
  const setView = useUIStore((s) => s.setView);
  return (
    <section className="relative overflow-hidden bg-ink text-cream">
      <div className="pattern-zellige-cream absolute inset-0 opacity-70" aria-hidden="true" />
      <div
        className="absolute -bottom-40 -start-32 size-[480px] rounded-full bg-terra/25 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute -top-24 -end-24 size-[380px] rounded-full bg-zellij/15 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-2">
        {/* النص */}
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-saffron/40 bg-saffron/15 px-4 py-1.5 text-xs font-bold text-saffron">
            <ZelligeStar className="size-3.5 text-saffron" />
            {t("السنة الدولية للتعاونيات 2025 — المغرب في قلب الحدث")}
          </span>
          <h1 className="text-shadow-hero mt-6 font-display text-3xl font-black leading-[1.25] md:text-5xl md:leading-[1.2]">
            {t("رقمنة شاملة")}{" "}
            <span className="text-terra-soft">{t("لتعاونيات")}</span>{" "}
            {t("المملكة المغربية")}
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-8 text-cream/75 md:text-base">
            {t("منصة موحدة لإدارة التعاونية وأنشطتها: الأعضاء، الجمع العام، المجلس الإداري، المالية والوثائق — مع تتبع العلاقات مع الجهات الحكومية والإدارية الوصية والامتثال للقانون رقم 112.12 واللوائح التنظيمية الجاري بها العمل.")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              onClick={() => setView(authed ? "dashboard" : "register")}
              className="gap-2 bg-terra-soft px-7 text-sm font-black text-ink hover:bg-terra-soft/85"
            >
              {authed ? t("الدخول إلى المنصة") : t("أنشئ حسابك أو انخرط الآن")}
              <ArrowLeft className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("opportunities")}
              className="gap-2 border-cream/25 bg-transparent px-6 text-sm font-bold text-cream hover:bg-cream/10 hover:text-cream"
            >
              <Briefcase className="size-4" />
              {t("فرص العمل والتعاقد")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("store")}
              className="gap-2 border-cream/25 bg-transparent px-6 text-sm font-bold text-cream hover:bg-cream/10 hover:text-cream"
            >
              <Store className="size-4" />
              {t("المتجر")}
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setView("install")}
              className="gap-2 border-saffron/40 bg-saffron/15 px-6 text-sm font-bold text-cream hover:bg-saffron/25 hover:text-cream"
            >
              <Smartphone className="size-4" />
              {t("تطبيق الأندرويد")}
            </Button>
            <a href="#modules">
              <Button
                size="lg"
                variant="outline"
                className="border-cream/25 bg-transparent px-6 text-sm font-bold text-cream hover:bg-cream/10 hover:text-cream"
              >
                {t("استكشف الوحدات")}
              </Button>
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-xs text-cream/60">
            <span className="flex items-center gap-2">
              <ZelligeStar className="size-3 text-saffron" /> {t("فرونت إند ساكن — Cloudflare Pages")}
            </span>
            <span className="flex items-center gap-2">
              <ZelligeStar className="size-3 text-saffron" /> {t("باك إند محلي — SQLite")}
            </span>
            <span className="flex items-center gap-2">
              <ZelligeStar className="size-3 text-saffron" /> {t("عربية RTL بالكامل")}
            </span>
          </div>
        </div>

        {/* المشهد البصري — لوحة مصغرة داخل قوس مغربي */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="arch-top relative overflow-hidden rounded-b-3xl border border-cream/15 bg-gradient-to-b from-terra/20 via-ink to-ink p-6 pt-14 shadow-2xl">
            <div className="pattern-zellige-saffron absolute inset-0 opacity-40" aria-hidden="true" />
            <div className="relative">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] text-cream/60">{t("مداخيل التعاونية (بالألف درهم)")}</p>
                  <p className="font-display text-2xl font-black text-cream">+{formatNumber(384)} {t("ألف د.م.")}</p>
                </div>
                <span className="rounded-full bg-zellij/20 px-3 py-1 text-[11px] font-bold text-[#7fd4ce]">
                  {t("+26% هذا الموسم")}
                </span>
              </div>
              <div className="h-36" dir="ltr">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={MINI_SERIES} margin={{ top: 4, right: 4, bottom: 0, left: 4 }}>
                    <defs>
                      <linearGradient id="heroGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#d9a03f" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#d9a03f" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <Area
                      type="monotone"
                      dataKey="v"
                      stroke="#e0b056"
                      strokeWidth={2.5}
                      fill="url(#heroGrad)"
                    />
                    <XAxis
                      dataKey="m"
                      tickFormatter={(v: string) => t(v)}
                      tick={{ fontSize: 10, fill: "rgba(250,246,238,0.6)" }}
                      axisLine={false}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* شارات عائمة */}
          <div className="absolute -start-4 top-24 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-xl md:block">
            <p className="text-[10px] font-semibold text-muted-foreground">{t("الجمع العام العادي")}</p>
            <p className="mt-0.5 text-sm font-extrabold text-terra">{t("مبرمج بعد 38 يوماً")}</p>
          </div>
          <div className="absolute -end-3 bottom-10 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-xl md:block">
            <p className="text-[10px] font-semibold text-muted-foreground">{t("بطاقة الاعتراف ODCO")}</p>
            <p className="mt-0.5 text-sm font-extrabold text-zellij">{t("قاربت التجديد")}</p>
          </div>
          <ZelligeStar className="absolute -top-6 end-8 size-10 text-saffron/70" />
          <ZelligeStar className="absolute bottom-16 -start-8 size-6 text-terra-soft/60" />
        </div>
      </div>

      <DividerZellige className="mx-auto max-w-6xl opacity-60" />
    </section>
  );
}

function StatsStrip() {
  const stats = [
    { value: formatNumber(SECTOR_STATS.coops), label: t("تعاونية نشيطة بالمغرب") },
    { value: `+${formatNumber(SECTOR_STATS.members)}`, label: t("منخرط ومنخرطة") },
    { value: `${SECTOR_STATS.womenShare}%`, label: t("نسبة النساء المنخرطات") },
    { value: formatNumber(SECTOR_STATS.agriculture), label: t("تعاونية فلاحية — القطاع الأول") },
  ];
  return (
    <section className="border-b border-border bg-secondary/60">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 md:grid-cols-4 md:px-6">
        {stats.map((s, i) => (
          <div key={i} className="text-center">
            <p className="font-display text-2xl font-black text-terra md:text-3xl">{s.value}</p>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">{s.label}</p>
          </div>
        ))}
      </div>
      <p className="pb-4 text-center text-[10px] text-muted-foreground/70">{SECTOR_STATS.source}</p>
    </section>
  );
}

function ModuleCard({ m }: { m: (typeof MODULES)[number] }) {
  const setView = useUIStore((s) => s.setView);
  const authed = useUIStore((s) => s.authed);
  return (
    <button
      onClick={() => setView(authed ? m.view : "login")}
      className="group relative overflow-hidden rounded-2xl border border-border bg-card p-5 text-start shadow-sm transition-all hover:-translate-y-1 hover:border-terra/40 hover:shadow-lg"
    >
      <div className="pattern-zellige absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      <div className="relative flex items-start gap-4">
        <span className="arch-top grid h-16 w-12 shrink-0 place-items-center bg-gradient-to-b from-terra/15 to-terra/5 text-terra">
          <m.icon className="size-5" />
        </span>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-extrabold text-foreground">{t(m.title)}</h3>
          <p className="mt-1 text-xs leading-6 text-muted-foreground">{t(m.desc)}</p>
        </div>
      </div>
    </button>
  );
}

function LegalSection() {
  const setView = useUIStore((s) => s.setView);
  return (
    <section id="legal" className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
        <SectionHeading
          kicker={t("الإطار القانوني")}
          title={t("تأسيس سليم، وامتثال دائم")}
          desc={t("بُنيت المنصة على المرجعية القانونية المغربية الحديثة للتعاونيات، وتحوّل الالتزامات النظامية إلى مسار واضح.")}
        />
        <div className="grid gap-6 lg:grid-cols-2">
          {/* بطاقة القانون */}
          <div className="relative overflow-hidden rounded-3xl border border-terra/25 bg-ink p-8 text-cream shadow-xl">
            <div className="pattern-zellige-cream absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-terra-soft/20 px-4 py-1 text-xs font-bold text-terra-soft">
                {t("القانون رقم 112.12")}
              </span>
              <h3 className="mt-4 font-display text-xl font-extrabold md:text-2xl">
                {t("المتعلق بالتعاونيات — 2014")}
              </h3>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-cream/80">
                {[
                  "التأسيس من 5 أعضاء على الأقل بدل 7 سابقاً",
                  "رأس مال اجتماعي أدنى: 1000 درهم",
                  "سجل مركزي لدى ODCO وسجلات محلية بالمحاكم",
                  "الجمع العام العادي مرة واحدة على الأقل سنوياً",
                ].map((p) => (
                  <li key={p} className="flex items-start gap-2.5">
                    <ZelligeStar className="mt-1.5 size-3 shrink-0 text-saffron" />
                    {t(p)}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => setView("regulations")}
                variant="outline"
                className="mt-7 gap-2 border-cream/25 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"
              >
                {t("مكتبة القوانين واللوائح")}
                <ArrowLeft className="size-4" />
              </Button>
            </div>
          </div>

          {/* مسار التأسيس */}
          <div className="rounded-3xl border border-border bg-card p-8 shadow-sm">
            <h3 className="font-display text-lg font-extrabold text-foreground">{t("مسار تأسيس تعاونية — 6 خطوات")}</h3>
            <ol className="relative mt-6 space-y-6 border-s-2 border-dashed border-terra/30 ps-6">
              {FOUNDATION_STEPS.map((s, i) => (
                <li key={s.title} className="relative">
                  <span className="absolute -start-[37px] grid size-7 place-items-center rounded-full border border-terra/30 bg-terra/10 text-xs font-black text-terra">
                    {i + 1}
                  </span>
                  <p className="text-sm font-bold text-foreground">{s.title}</p>
                  <p className="mt-1 text-xs leading-6 text-muted-foreground">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}

/** روابط الوحدات في الفوتر — تعمل فعلياً وتوجه للدخول عند الحاجة */
function FooterModuleLinks() {
  const authed = useUIStore((s) => s.authed);
  const setView = useUIStore((s) => s.setView);
  const user = useUIStore((s) => s.user);
  // وحدات متاحة لكل دور
  const visible = MODULES.filter((m) =>
    !user
      ? true
      : user.role === "SUPER_ADMIN" || user.role === "ADMIN"
        ? true
        : user.role === "COADMIN"
          ? m.view !== "cooperatives"
          : false
  );
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
      <li>
        <button
          onClick={() => setView("opportunities")}
          className="text-cream/60 transition-colors hover:text-terra-soft"
        >
          {t("فرص العمل والتعاقد")}
        </button>
      </li>
      {visible.map((m) => (
        <li key={m.view}>
          <button
            onClick={() => setView(authed ? m.view : "login")}
            className="text-cream/60 transition-colors hover:text-terra-soft"
          >
            {t(m.title)}
          </button>
        </li>
      ))}
    </ul>
  );
}

function LandingFooter() {
  const setView = useUIStore((s) => s.setView);
  const authed = useUIStore((s) => s.authed);
  return (
    <footer className="relative overflow-hidden bg-ink text-cream/70">
      <div className="pattern-zellige-cream absolute inset-0 opacity-50" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-14 md:grid-cols-4 md:px-6">
        <div className="md:col-span-1">
          <CmdpLogo light />
          <p className="mt-4 max-w-xs text-xs leading-6">
            {t("منصة مفتوحة لرقمنة التعاونيات المغربية، من فكرة إلى منظومة متكاملة تحترم الخصوصية وتعمل محلياً.")}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => setView("register")}
              className="w-fit rounded-full bg-terra-soft px-4 py-1.5 text-[11px] font-black text-ink transition-opacity hover:opacity-85"
            >
              {authed ? t("تسجيل تعاونية جديدة") : t("إنشاء حساب / انخراط")}
            </button>
            <button
              onClick={() => setView("opportunities")}
              className="w-fit rounded-full border border-cream/25 px-4 py-1.5 text-[11px] font-bold text-cream/85 transition-colors hover:bg-cream/10"
            >
              {t("البحث عن فرصة عمل")}
            </button>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-cream">{t("وحدات المنصة")}</h4>
          <FooterModuleLinks />
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-cream">{t("المراجع الرسمية")}</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={() => setView("regulations")}
                className="text-start text-cream/60 transition-colors hover:text-terra-soft"
              >
                {t("مكتبة القوانين واللوائح — داخل المنصة")}
              </button>
            </li>
            <li>
              <a
                href="https://www.odco.gov.ma"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-terra-soft"
              >
                {t("مكتب تنمية التعاون (ODCO) — الموقع الرسمي")}
              </a>
            </li>
            <li>
              <a
                href="https://mtaess.gov.ma/ar"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-terra-soft"
              >
                {t("وزارة السياحة والصناعة التقليدية والاقتصاد الاجتماعي والتضامني")}
              </a>
            </li>
            <li>
              <a
                href="https://www.tax.gov.ma"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-terra-soft"
              >
                {t("المديرية العامة للضرائب")}
              </a>
            </li>
            <li>
              <a
                href="https://www.cnss.ma"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-terra-soft"
              >
                {t("الصندوق الوطني للضمان الاجتماعي (CNSS)")}
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-bold text-cream">{t("الإطار القانوني للمنصة")}</h4>
          <ul className="space-y-2 text-xs">
            <li>
              <button
                onClick={() => setView("legal", { doc: "terms" })}
                className="text-start text-cream/60 transition-colors hover:text-terra-soft"
              >
                {t("الشروط العامة للاستخدام")}
              </button>
            </li>
            <li>
              <button
                onClick={() => setView("legal", { doc: "privacy" })}
                className="text-start text-cream/60 transition-colors hover:text-terra-soft"
              >
                {t("سياسة الخصوصية وحماية المعطيات (ق.09.08)")}
              </button>
            </li>
            <li>
              <button
                onClick={() => setView("legal", { doc: "notice" })}
                className="text-start text-cream/60 transition-colors hover:text-terra-soft"
              >
                {t("الإشعار القانوني (ق.53.05)")}
              </button>
            </li>
            <li>
              <button
                onClick={() => setView("legal", { doc: "cookies" })}
                className="text-start text-cream/60 transition-colors hover:text-terra-soft"
              >
                {t("سياسة ملفات تعريف الارتباط")}
              </button>
            </li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-cream/10 py-5 text-center text-[11px]">
        © 2026 {APP_NAME} — {t("صُنع بعناية للمتعاونين والمتعاونات في المملكة المغربية")}
      </div>
    </footer>
  );
}

export function LandingView() {
  const authed = useUIStore((s) => s.authed);
  const setView = useUIStore((s) => s.setView);
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Hero />
      <StatsStrip />

      {/* المزايا */}
      <section id="features" className="bg-background">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <SectionHeading
            kicker={t("لماذا CMDP؟")}
            title={t("كل ما تحتاجه التعاونية في فضاء واحد")}
            desc={t("صممنا المنصة لتكون بيت الخبرة الرقمي للتعاونية: تسيير يومي، حوكمة، وامتثال — بلغة عربية وتصميم يحترم هويتكم.")}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={t(f.title)}
                className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md"
              >
                <span className="arch-top grid h-16 w-12 place-items-center bg-gradient-to-b from-terra to-terra-soft text-cream">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-display text-base font-extrabold text-foreground">{t(f.title)}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{t(f.desc)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* الوحدات */}
      <section id="modules" className="border-y border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-20">
          <SectionHeading
            kicker={t("وحدات المنصة")}
            title={t("ثماني وحدات مترابطة")}
            desc={t("اضغط على أي وحدة للدخول إلى المنصة واستكشافها ببيانات عرض واقعية.")}
          />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {MODULES.map((m) => (
              <ModuleCard key={m.view} m={m} />
            ))}
          </div>
        </div>
      </section>

      <LegalSection />

      {/* دعوة أخيرة */}
      <section className="bg-background">
        <div className="mx-auto max-w-6xl px-4 pb-16 md:px-6 md:pb-20">
          <div className="arch-top relative overflow-hidden rounded-b-3xl bg-ink px-6 py-16 text-center text-cream shadow-2xl md:py-20">
            <div className="pattern-zellige-cream absolute inset-0 opacity-60" aria-hidden="true" />
            <div className="relative mx-auto max-w-xl">
              <CmdpMark className="mx-auto size-14 text-terra-soft" />
              <h2 className="mt-5 font-display text-2xl font-black md:text-3xl">
                {t("تعاونيتكم تستحق رقمنة بمستوى طموحها")}
              </h2>
              <p className="mt-4 text-sm leading-8 text-cream/75">
                {t("أنشئوا حسابكم أو قدّموا طلب انخراط اليوم — وابدأوا التسيير الرقمي عبر الباك إند المحلي.")}
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Button
                  size="lg"
                  onClick={() => setView(authed ? "dashboard" : "register")}
                  className="gap-2 bg-terra-soft px-8 font-black text-ink hover:bg-terra-soft/85"
                >
                  {authed ? t("الذهاب إلى لوحة القيادة") : t("إنشاء حساب أو انخراط")}
                  <ArrowLeft className="size-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => setView("opportunities")}
                  className="gap-2 border-cream/25 bg-transparent font-bold text-cream hover:bg-cream/10 hover:text-cream"
                >
                  <Briefcase className="size-4" />
                  {t("فرص العمل والتعاقد")}
                </Button>
              </div>
              <p className="mt-4 text-[11px] text-cream/50">
                {t("للتجربة السريعة: admin / cmdp2026 — أو من حسابات العرض حسب الأدوار")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
