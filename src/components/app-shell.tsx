// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الهيكل العام: الشريط الجانبي + الشريط العلوي + التنقل السفلي
// التنقل والوحدات مفلترة حسب دور المستخدم وصلاحياته (نظام الأدوار 1.1.0)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Crown,
  FileText,
  Gavel,
  Landmark,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  ScrollText,
  Settings,
  Sun,
  UserRound,
  Users,
  UserSquare2,
  Wallet,
  MoreHorizontal,
  FlaskConical,
  Scale,
  ShoppingBag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACCOUNT_TYPE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { allowedViews, isPlatformOwner } from "@/lib/permissions";
import { useUIStore, VIEWS, type View } from "@/store/ui";
import { useCooperatives } from "@/hooks/use-cmdp";
import { CmdpLogo, CmdpMark, CmdpWatermark, DividerZellige, ZelligeStar } from "@/components/patterns";
import { ChatbotWidget } from "@/components/chatbot";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

import { LandingView } from "@/components/views/landing";
import { LoginView } from "@/components/views/login";
import { RegisterView } from "@/components/views/register";
import { LegalView } from "@/components/views/legal";
import { DashboardView } from "@/components/views/dashboard";
import { CooperativesView } from "@/components/views/cooperatives";
import { MembersView } from "@/components/views/members";
import { AssemblyView } from "@/components/views/assembly";
import { FinanceView } from "@/components/views/finance";
import { DocumentsView } from "@/components/views/documents";
import { EntitiesView } from "@/components/views/entities";
import { RegulationsView } from "@/components/views/regulations";
import { UsersView } from "@/components/views/users";
import { OpportunitiesView } from "@/components/views/opportunities";
import { MySpaceView } from "@/components/views/myspace";
import { SettingsView } from "@/components/views/settings";
import { InstallView } from "@/components/views/install";
import { StoreView } from "@/components/views/store";
import { StoreManageView } from "@/components/views/storemanage";
import { OwnerView } from "@/components/views/owner";
import { AuditLogView } from "@/components/views/auditlog";
import { NotificationsBell } from "@/components/notifications-bell";
import { verifySession } from "@/hooks/use-cmdp";
import { t, useI18n } from "@/lib/i18n";

// ─── عناصر التنقل الكاملة (تُفلتر حسب دور المستخدم) ────────────────────────
const NAV_GROUPS: {
  group: string;
  items: { view: View; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    group: "القيادة",
    items: [{ view: "dashboard", label: "لوحة القيادة", icon: LayoutDashboard }],
  },
  {
    group: "فضائي",
    items: [{ view: "myspace", label: "فضاء العضو/المتعاقد", icon: UserSquare2 }],
  },
  {
    group: "التسيير",
    items: [
      { view: "cooperatives", label: "التعاونيات", icon: Building2 },
      { view: "members", label: "الأعضاء", icon: Users },
      { view: "assembly", label: "الجمع العام والمجلس", icon: Gavel },
      { view: "finance", label: "المالية والصندوق", icon: Wallet },
      { view: "storemanage", label: "إدارة المتجر", icon: ShoppingBag },
    ],
  },
  {
    group: "الفرص",
    items: [{ view: "opportunities", label: "فرص العمل والتعاقد", icon: Briefcase }],
  },
  {
    group: "الحوكمة والامتثال",
    items: [
      { view: "documents", label: "سجل الوثائق", icon: FileText },
      { view: "entities", label: "الجهات الوصية", icon: Landmark },
      { view: "regulations", label: "القوانين واللوائح", icon: ScrollText },
    ],
  },
  {
    group: "الإدارة",
    items: [{ view: "users", label: "المستخدمون والمصادقات", icon: UserRound }],
  },
  {
    group: "الملكية والسجلات",
    items: [
      { view: "owner", label: "لوحة المالك", icon: Crown },
      { view: "auditlog", label: "سجل الأحداث", icon: ScrollText },
    ],
  },
  {
    group: "النظام",
    items: [{ view: "settings", label: "الإعدادات", icon: Settings }],
  },
];

const VIEW_TITLES: Record<View, string> = {
  landing: "الرئيسية",
  login: "الدخول",
  register: "التسجيل",
  opportunities: "فرص العمل والتعاقد",
  legal: "المركز القانوني",
  dashboard: "لوحة القيادة",
  cooperatives: "التعاونيات",
  members: "الأعضاء",
  assembly: "الجمع العام والمجلس",
  finance: "المالية والصندوق",
  documents: "سجل الوثائق",
  entities: "الجهات الوصية",
  regulations: "القوانين واللوائح",
  users: "المستخدمون والمصادقات",
  myspace: "فضائي",
  settings: "الإعدادات",
  install: "تثبيت التطبيق",
  store: "المتجر",
  storemanage: "إدارة المتجر",
  owner: "لوحة المالك",
  auditlog: "سجل الأحداث",
};

/** مجموعات التنقل المتاحة للمستخدم الحالي */
function useNavGroups() {
  const user = useUIStore((s) => s.user);
  const allowed = React.useMemo(() => new Set(allowedViews(user)), [user]);
  return NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => allowed.has(i.view)),
  })).filter((g) => g.items.length > 0);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const groups = useNavGroups();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin" aria-label={t("التنقل الرئيسي")}>
      {groups.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/45">
            {t(g.group)}
          </p>
          <ul className="space-y-1">
            {g.items.map((item) => {
              const active = view === item.view;
              return (
                <li key={item.view}>
                  <button
                    onClick={() => {
                      setView(item.view);
                      onNavigate?.();
                    }}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-primary shadow-inner"
                        : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
                    )}
                  >
                    {active ? (
                      <ZelligeStar className="size-3.5 shrink-0 text-sidebar-primary" />
                    ) : (
                      <item.icon className="size-4 shrink-0 opacity-70 group-hover:opacity-100" />
                    )}
                    <span>{t(item.label)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const user = useUIStore((s) => s.user);
  const setAuthed = useUIStore((s) => s.setAuthed);
  const demoMode = useUIStore((s) => s.demoMode);
  const roleLabel = user ? t(ROLE_LABELS[user.role]?.label ?? user.role) : "";
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-terra-soft/20 font-display text-sm font-bold text-terra-soft">
          {user?.fullName?.[0] ?? t("م")}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{user?.fullName ?? t("المستخدم")}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">
            {user?.accountType ? `${t(ACCOUNT_TYPE_LABELS[user.accountType])} • ` : ""}
            {roleLabel}
          </p>
          {demoMode && (
            <p className="truncate text-[10px] font-bold text-saffron">{t("وضع العرض التجريبي")}</p>
          )}
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => setAuthed(null)}
              aria-label={t("تسجيل الخروج")}
            >
              <LogOut className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">{t("تسجيل الخروج")}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-[calc(var(--cmdp-vh,1vh)*100)] w-64 shrink-0 flex-col bg-sidebar lg:flex">
      <div className="pattern-zellige-cream absolute inset-0 opacity-70" aria-hidden="true" />
      <div className="relative border-b border-sidebar-border p-4">
        <CmdpLogo light />
      </div>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <NavList />
        <SidebarFooter />
      </div>
    </aside>
  );
}

function CoopSelector({ compact = false }: { compact?: boolean }) {
  const user = useUIStore((s) => s.user);
  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const setActiveCoop = useUIStore((s) => s.setActiveCoop);
  const { data: coops } = useCooperatives();
  const current = (coops ?? []).find((c) => c.id === activeCoopId);

  // المستخدم العادي: تعاونيته ثابتة
  if (user?.role === "USER") {
    return (
      <span className="hidden max-w-44 truncate rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground md:inline-block">
        {user.cooperativeName ?? current?.name ?? "—"}
      </span>
    );
  }
  // الكوأدمن: تعاونيته حصراً
  if (user?.role === "COADMIN") {
    return (
      <span className="hidden max-w-44 truncate rounded-xl border border-terra/25 bg-terra/10 px-3 py-2 text-xs font-bold text-terra md:inline-block">
        {user.cooperativeName ?? current?.name ?? t("تعاونيتي")}
      </span>
    );
  }
  // الأدمن والمالك: كل التعاونيات المسجلة (من md فصاعداً — حماية من فيضان الهيدر على الهواتف)
  return (
    <div className="hidden md:block">
      <Select value={String(activeCoopId)} onValueChange={(v) => setActiveCoop(Number(v))}>
        <SelectTrigger
          className={cn(
            "h-9 gap-1 border-border bg-card text-xs font-semibold md:text-sm",
            compact ? "w-40" : "w-56"
          )}
          aria-label={t("التعاونية النشطة")}
        >
          <SelectValue placeholder={t("اختر التعاونية")} />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {(coops ?? [])
            .filter((c) => c.approvalStatus === "APPROVED")
            .map((c) => (
              <SelectItem key={c.id} value={String(c.id)} className="text-xs md:text-sm">
                {c.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  return (
    <Button
      variant="outline"
      size="icon"
      className="size-9 shrink-0"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label={t("تبديل المظهر")}
    >
      {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function DemoBadge() {
  const demoMode = useUIStore((s) => s.demoMode);
  if (!demoMode) return null;
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-saffron/40 bg-saffron/15 px-3 py-1 text-[11px] font-bold text-saffron-ink md:inline-flex">
      <FlaskConical className="size-3" />
      {t("وضع العرض التجريبي — بيانات غير محفوظة")}
    </span>
  );
}

function AppTopBar() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const user = useUIStore((s) => s.user);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
      {/* زر القائمة — الهواتف */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="size-9 shrink-0 lg:hidden" aria-label={t("القائمة")}>
            <Menu className="size-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b border-sidebar-border bg-sidebar px-4 py-3">
            <SheetTitle asChild>
              <div>
                <CmdpLogo light />
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100%-76px)] flex-col bg-sidebar">
            <NavList />
            <SidebarFooter />
          </div>
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 items-center gap-2">
        <CmdpMark className="size-8 text-terra lg:hidden" />
        <h2 className="hidden font-display text-base font-extrabold text-foreground md:block">
          {t(VIEW_TITLES[view])}
        </h2>
      </div>

      <div className="me-auto" />

      <DemoBadge />
      <CoopSelector compact />
      <ThemeToggle />
      <LanguageSwitcher />
      <NotificationsBell />
      {isPlatformOwner(user) && (
        <span className="hidden items-center gap-1 rounded-full border border-terra/30 bg-terra/10 px-2.5 py-1 text-[10px] font-black text-terra lg:inline-flex">
          <Crown className="size-3" />
          {t("المالك")}
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="hidden text-muted-foreground hover:text-foreground md:inline-flex"
        onClick={() => setView("landing")}
      >
        {t("الرئيسية")}
      </Button>
    </header>
  );
}

/** التنقل السفلي حسب الدور */
function useQuickNav() {
  const user = useUIStore((s) => s.user);
  return React.useMemo(() => {
    const all: { view: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
      { view: "dashboard", label: t("اللوحة"), icon: LayoutDashboard },
      { view: "myspace", label: t("فضائي"), icon: UserSquare2 },
      { view: "cooperatives", label: t("تعاونيات"), icon: Building2 },
      { view: "members", label: t("أعضاء"), icon: Users },
      { view: "finance", label: t("مالية"), icon: Wallet },
      { view: "storemanage", label: t("المتجر"), icon: ShoppingBag },
      { view: "opportunities", label: t("الفرص"), icon: Briefcase },
      { view: "settings", label: t("الإعدادات"), icon: Settings },
    ];
    const allowed = new Set(allowedViews(user));
    const priority: View[] =
      user?.role === "USER"
        ? ["myspace", "opportunities", "settings"]
        : user?.role === "COADMIN"
          ? ["dashboard", "storemanage", "members", "opportunities"]
          : ["dashboard", "cooperatives", "opportunities", "settings"];
    const picked = priority.filter((v) => allowed.has(v)).slice(0, 4);
    return picked.map((v) => all.find((a) => a.view === v)!).filter(Boolean);
  }, [user]);
}

function BottomNav({ onMore }: { onMore: () => void }) {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  const quick = useQuickNav();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      style={{ gridTemplateColumns: `repeat(${Math.min(quick.length + 1, 5)}, minmax(0, 1fr))` }}
      aria-label={t("التنقل السريع")}
    >
      {quick.map((q) => {
        const active = view === q.view;
        return (
          <button
            key={q.view}
            onClick={() => setView(q.view)}
            className={cn(
              "flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold",
              active ? "text-terra" : "text-muted-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <q.icon className="size-5 shrink-0" />
            <span className="max-w-full truncate px-0.5">{t(q.label)}</span>
          </button>
        );
      })}
      <button
        onClick={onMore}
        className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold text-muted-foreground"
      >
        <MoreHorizontal className="size-5" />
        {t("المزيد")}
      </button>
    </nav>
  );
}

/** فوتر الهيكل الداخلي — روابط فعلية عاملة */
function AppFooter() {
  const setView = useUIStore((s) => s.setView);
  return (
    <footer className="mt-auto hidden border-t border-border bg-card/60 px-6 py-5 lg:block">
      <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ZelligeStar className="size-3.5 text-terra" />
          <span>{t("© 2026 CMDP — المنصة الرقمية لإدارة التعاونيات بالمغرب")}</span>
        </div>
        <nav className="flex flex-wrap items-center gap-4" aria-label={t("روابط سريعة")}>
          <button onClick={() => setView("landing")} className="font-semibold transition-colors hover:text-terra">
            {t("الصفحة الرئيسية")}
          </button>
          <button onClick={() => setView("opportunities")} className="font-semibold transition-colors hover:text-terra">
            {t("فرص العمل والتعاقد")}
          </button>
          <button onClick={() => setView("regulations")} className="font-semibold transition-colors hover:text-terra">
            {t("القوانين واللوائح")}
          </button>
          <button onClick={() => setView("legal", { doc: "terms" })} className="font-semibold transition-colors hover:text-terra">
            {t("الشروط العامة")}
          </button>
          <button onClick={() => setView("legal", { doc: "privacy" })} className="font-semibold transition-colors hover:text-terra">
            {t("سياسة الخصوصية")}
          </button>
        </nav>
        <span className="text-[11px]">{t("المرجع القانوني: القانون رقم 112.12")}</span>
      </div>
    </footer>
  );
}

// ─── موجه الوحدات ──────────────────────────────────────────────────────────
function ViewRouter() {
  const view = useUIStore((s) => s.view);
  switch (view) {
    case "dashboard":
      return <DashboardView />;
    case "cooperatives":
      return <CooperativesView />;
    case "members":
      return <MembersView />;
    case "assembly":
      return <AssemblyView />;
    case "finance":
      return <FinanceView />;
    case "documents":
      return <DocumentsView />;
    case "entities":
      return <EntitiesView />;
    case "regulations":
      return <RegulationsView />;
    case "users":
      return <UsersView />;
    case "storemanage":
      return <StoreManageView />;
    case "owner":
      return <OwnerView />;
    case "auditlog":
      return <AuditLogView />;
    case "opportunities":
      return <OpportunitiesView />;
    case "myspace":
      return <MySpaceView />;
    case "settings":
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
}

function AppShellInner() {
  const view = useUIStore((s) => s.view);
  const authed = useUIStore((s) => s.authed);
  const [moreOpen, setMoreOpen] = React.useState(false);

  // ── حصانة الإقلاع (الإصدار 1.3.2): التحقق من الجلسة المخزنة مرة واحدة ──
  // جلسة ميتة (بعد ترقية قاعدة أو تغيّر الرموز) → خروج نظيف لصفحة الدخول
  // بدل بقاء واجهة معلقة على بيانات قديمة؛ الباك إند المعطّل لا يفسد الجلسة
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const state = useUIStore.getState();
      if (!state.authed || !state.token) return;
      const res = await verifySession();
      if (cancelled) return;
      if (res === "invalid") {
        useUIStore.getState().setAuthed(null);
      } else if (res !== "unknown") {
        // مزامنة هوية الجلسة من الخادم (تغيير ملكية/دور/حالة خارج هذا الجهاز)
        useUIStore.getState().updateUser(res.user);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // مزامنة عنوان URL (hash) مع الوحدة الحالية
  React.useEffect(() => {
    const applyHash = () => {
      const h = window.location.hash.replace(/^#\/?/, "").split("?")[0] as View;
      if (VIEWS.includes(h)) useUIStore.getState().setView(h);
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  React.useEffect(() => {
    return useUIStore.subscribe((s, prev) => {
      if (s.view !== prev.view) {
        window.history.replaceState(null, "", `#/${s.view}`);
        window.scrollTo({ top: 0 });
      }
    });
  }, []);

  // الوحدات العمومية المستقلة
  if (view === "landing")
    return (
      <>
        <CmdpWatermark />
        <LandingView />
        <ChatbotWidget page="landing" />
      </>
    );
  if (view === "legal")
    return (
      <>
        <CmdpWatermark />
        <LegalView />
        <ChatbotWidget page="legal" />
      </>
    );
  if (view === "install")
    return (
      <>
        <CmdpWatermark />
        <InstallView />
      </>
    );
  if (view === "store")
    return (
      <>
        <CmdpWatermark />
        <StoreView />
      </>
    );
  if (view === "opportunities") {
    // السوق متاح للعموم — بنفس الهيكل إن كان مسجلاً، وإلا فصفحة مستقلة
    if (authed) {
      return (
        <div className="flex min-h-[calc(var(--cmdp-vh,1vh)*100)] bg-background">
          <CmdpWatermark />
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppTopBar />
            <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8 lg:px-8">
              <OpportunitiesView />
            </main>
            <AppFooter />
          </div>
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetContent side="right" className="w-72 p-0">
              <SheetHeader className="border-b border-sidebar-border bg-sidebar px-4 py-3">
                <SheetTitle asChild>
                  <div>
                    <CmdpLogo light />
                  </div>
                </SheetTitle>
              </SheetHeader>
              <div className="flex h-[calc(100%-76px)] flex-col bg-sidebar">
                <NavList onNavigate={() => setMoreOpen(false)} />
                <SidebarFooter />
              </div>
            </SheetContent>
          </Sheet>
          <BottomNav onMore={() => setMoreOpen(true)} />
          <ChatbotWidget page="opportunities" />
        </div>
      );
    }
    return (
      <div className="flex min-h-[calc(var(--cmdp-vh,1vh)*100)] flex-col bg-background">
        <CmdpWatermark />
        <PublicTopBar />
        <main className="flex-1 px-4 pb-24 pt-5 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <OpportunitiesView />
          </div>
        </main>
        <FooterPublic />
        <ChatbotWidget page="opportunities" />
      </div>
    );
  }
  if (view === "register")
    return (
      <>
        <CmdpWatermark />
        <RegisterView />
      </>
    );
  if (view === "login" || !authed)
    return (
      <>
        <CmdpWatermark />
        <LoginView />
      </>
    );

  return (
    <div className="flex min-h-[calc(var(--cmdp-vh,1vh)*100)] bg-background">
      <CmdpWatermark />
      <AppSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopBar />
        <main className="flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8 lg:px-8">
          <ViewRouter />
        </main>
        <AppFooter />
      </div>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="border-b border-sidebar-border bg-sidebar px-4 py-3">
            <SheetTitle asChild>
              <div>
                <CmdpLogo light />
              </div>
            </SheetTitle>
          </SheetHeader>
          <div className="flex h-[calc(100%-76px)] flex-col bg-sidebar">
            <NavList onNavigate={() => setMoreOpen(false)} />
            <SidebarFooter />
          </div>
        </SheetContent>
      </Sheet>
      <BottomNav onMore={() => setMoreOpen(true)} />
      <ChatbotWidget page={view} />
    </div>
  );
}

/** شريط علوي للصفحات العمومية المستقلة */
function PublicTopBar() {
  const setView = useUIStore((s) => s.setView);
  const authed = useUIStore((s) => s.authed);
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 md:px-6">
        <button onClick={() => setView("landing")} aria-label="CMDP">
          <CmdpMark className="size-9 text-terra" />
          <span className="ms-2 hidden font-display text-lg font-black text-foreground sm:inline">CMDP</span>
        </button>
        <div className="me-auto" />
        <Button variant="ghost" size="sm" onClick={() => setView("legal")} className="hidden text-muted-foreground sm:inline-flex">
          <Scale className="me-1.5 size-3.5" />
          {t("المركز القانوني")}
        </Button>
        <Button size="sm" onClick={() => setView(authed ? "dashboard" : "login")} className="gap-1.5 font-bold">
          {authed ? t("المنصة") : t("تسجيل الدخول")}
        </Button>
      </div>
    </header>
  );
}

/** فوتر الصفحات العمومية المستقلة */
function FooterPublic() {
  const setView = useUIStore((s) => s.setView);
  return (
    <footer className="mt-auto border-t border-border bg-card/60 px-6 py-6 pb-24 text-center text-xs text-muted-foreground lg:pb-6">
      <DividerZellige className="mx-auto mb-4 w-56 opacity-60" />
      <div className="flex flex-wrap items-center justify-center gap-4">
        <button onClick={() => setView("landing")} className="font-semibold transition-colors hover:text-terra">
          {t("الرئيسية")}
        </button>
        <button onClick={() => setView("opportunities")} className="font-semibold transition-colors hover:text-terra">
          {t("فرص العمل والتعاقد")}
        </button>
        <button onClick={() => setView("register")} className="font-semibold transition-colors hover:text-terra">
          {t("إنشاء حساب")}
        </button>
        <button onClick={() => setView("install")} className="font-semibold transition-colors hover:text-terra">
          {t("تثبيت التطبيق")}
        </button>
        <button onClick={() => setView("store")} className="font-semibold transition-colors hover:text-terra">
          {t("المتجر")}
        </button>
        <button onClick={() => setView("legal", { doc: "terms" })} className="font-semibold transition-colors hover:text-terra">
          {t("الشروط العامة")}
        </button>
        <button onClick={() => setView("legal", { doc: "privacy" })} className="font-semibold transition-colors hover:text-terra">
          {t("الخصوصية")}
        </button>
      </div>
      <p className="mt-4">{t("© 2026 CMDP — المنصة الرقمية لإدارة التعاونيات بالمغرب")}</p>
    </footer>
  );
}

/** رابط داخلي (للاستعمال من صفحة الهبوط) */
export function ViewLink({
  view,
  children,
  className,
}: {
  view: View;
  children: React.ReactNode;
  className?: string;
}) {
  const setView = useUIStore((s) => s.setView);
  return (
    <Link
      href={`#/${view}`}
      className={className}
      onClick={(e) => {
        e.preventDefault();
        setView(view);
      }}
    >
      {children}
    </Link>
  );
}


/** غلاف إعادة التركيب: تغيير اللغة يعيد بناء الشجرة لترجمة كل النصوص فوراً */
export function AppShell() {
  const { lang } = useI18n();
  return (
    <React.Fragment key={lang}>
      <AppShellInner />
    </React.Fragment>
  );
}
