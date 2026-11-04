// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الهيكل العام: الشريط الجانبي + الشريط العلوي + التنقل السفلي
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Building2,
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
  Users,
  Wallet,
  MoreHorizontal,
  FlaskConical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useUIStore, VIEWS, type View } from "@/store/ui";
import { useCooperatives } from "@/hooks/use-cmdp";
import { CmdpLogo, CmdpMark, DividerZellige, ZelligeStar } from "@/components/patterns";
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
import { DashboardView } from "@/components/views/dashboard";
import { CooperativesView } from "@/components/views/cooperatives";
import { MembersView } from "@/components/views/members";
import { AssemblyView } from "@/components/views/assembly";
import { FinanceView } from "@/components/views/finance";
import { DocumentsView } from "@/components/views/documents";
import { EntitiesView } from "@/components/views/entities";
import { RegulationsView } from "@/components/views/regulations";
import { SettingsView } from "@/components/views/settings";

// ─── عناصر التنقل ──────────────────────────────────────────────────────────
const NAV_GROUPS: {
  group: string;
  items: { view: View; label: string; icon: React.ComponentType<{ className?: string }> }[];
}[] = [
  {
    group: "القيادة",
    items: [{ view: "dashboard", label: "لوحة القيادة", icon: LayoutDashboard }],
  },
  {
    group: "التسيير",
    items: [
      { view: "cooperatives", label: "التعاونيات", icon: Building2 },
      { view: "members", label: "الأعضاء", icon: Users },
      { view: "assembly", label: "الجمع العام والمجلس", icon: Gavel },
      { view: "finance", label: "المالية والصندوق", icon: Wallet },
    ],
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
    group: "النظام",
    items: [{ view: "settings", label: "الإعدادات", icon: Settings }],
  },
];

const VIEW_TITLES: Record<View, string> = {
  landing: "الرئيسية",
  login: "الدخول",
  dashboard: "لوحة القيادة",
  cooperatives: "التعاونيات",
  members: "الأعضاء",
  assembly: "الجمع العام والمجلس",
  finance: "المالية والصندوق",
  documents: "سجل الوثائق",
  entities: "الجهات الوصية",
  regulations: "القوانين واللوائح",
  settings: "الإعدادات",
};

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4 scrollbar-thin">
      {NAV_GROUPS.map((g) => (
        <div key={g.group}>
          <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-sidebar-foreground/45">
            {g.group}
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
                    <span>{item.label}</span>
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
  return (
    <div className="border-t border-sidebar-border p-3">
      <div className="flex items-center gap-3 rounded-xl px-2 py-2">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-terra-soft/20 font-display text-sm font-bold text-terra-soft">
          {user?.fullName?.[0] ?? "م"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{user?.fullName ?? "المستخدم"}</p>
          <p className="truncate text-[11px] text-sidebar-foreground/60">{demoMode ? "وضع العرض التجريبي" : "متصل بالباك إند المحلي"}</p>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={() => setAuthed(null)}
              aria-label="تسجيل الخروج"
            >
              <LogOut className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">تسجيل الخروج</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col bg-sidebar lg:flex">
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
  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const setActiveCoop = useUIStore((s) => s.setActiveCoop);
  const { data: coops } = useCooperatives();
  const current = coops?.find((c) => c.id === activeCoopId);
  return (
    <Select value={String(activeCoopId)} onValueChange={(v) => setActiveCoop(Number(v))}>
      <SelectTrigger
        className={cn(
          "h-9 gap-1 border-border bg-card text-xs font-semibold md:text-sm",
          compact ? "w-40" : "w-56"
        )}
        aria-label="التعاونية النشطة"
      >
        <SelectValue placeholder="اختر التعاونية" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {(coops ?? []).map((c) => (
          <SelectItem key={c.id} value={String(c.id)} className="text-xs md:text-sm">
            {c.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
      aria-label="تبديل المظهر"
    >
      {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function DemoBadge() {
  const demoMode = useUIStore((s) => s.demoMode);
  if (!demoMode) return null;
  return (
    <span className="hidden items-center gap-1.5 rounded-full border border-saffron/40 bg-saffron/15 px-3 py-1 text-[11px] font-bold text-[#8a6414] md:inline-flex">
      <FlaskConical className="size-3" />
      وضع العرض التجريبي — بيانات غير محفوظة
    </span>
  );
}

function AppTopBar() {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur md:px-6">
      {/* زر القائمة — الهواتف */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="size-9 shrink-0 lg:hidden" aria-label="القائمة">
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
          {VIEW_TITLES[view]}
        </h2>
      </div>

      <div className="me-auto" />

      <DemoBadge />
      <CoopSelector compact />
      <ThemeToggle />
      <Button
        variant="ghost"
        size="sm"
        className="hidden text-muted-foreground hover:text-foreground md:inline-flex"
        onClick={() => setView("landing")}
      >
        الرئيسية
      </Button>
    </header>
  );
}

const QUICK_NAV: { view: View; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { view: "dashboard", label: "اللوحة", icon: LayoutDashboard },
  { view: "cooperatives", label: "تعاونيات", icon: Building2 },
  { view: "members", label: "أعضاء", icon: Users },
  { view: "finance", label: "مالية", icon: Wallet },
];

function BottomNav({ onMore }: { onMore: () => void }) {
  const view = useUIStore((s) => s.view);
  const setView = useUIStore((s) => s.setView);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 backdrop-blur lg:hidden"
      aria-label="التنقل السريع"
    >
      {QUICK_NAV.map((q) => {
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
            <q.icon className="size-5" />
            {q.label}
          </button>
        );
      })}
      <button
        onClick={onMore}
        className="flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold text-muted-foreground"
      >
        <MoreHorizontal className="size-5" />
        المزيد
      </button>
    </nav>
  );
}

function AppFooter() {
  return (
    <footer className="mt-auto hidden border-t border-border bg-card/60 px-6 py-5 lg:block">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <ZelligeStar className="size-3.5 text-terra" />
          <span>© 2026 CMDP — المنصة الرقمية لإدارة التعاونيات بالمغرب</span>
        </div>
        <span>بيانات العرض لأغراض التوضيح — المرجع القانوني: القانون رقم 112.12</span>
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
    case "settings":
      return <SettingsView />;
    default:
      return <DashboardView />;
  }
}

export function AppShell() {
  const view = useUIStore((s) => s.view);
  const authed = useUIStore((s) => s.authed);
  const [moreOpen, setMoreOpen] = React.useState(false);

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

  if (view === "landing") return <LandingView />;
  if (view === "login" || !authed) return <LoginView />;

  return (
    <div className="flex min-h-screen bg-background">
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
    </div>
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
