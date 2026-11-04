// ═══════════════════════════════════════════════════════════════════════════
// CMDP — لوحة القيادة
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  FileWarning,
  Gavel,
  PieChart as PieIcon,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMAD, formatNumber, formatShortDate } from "@/lib/format";
import { TASK_TYPES } from "@/lib/constants";
import { useUIStore } from "@/store/ui";
import { useCooperatives, useDashboard, useSaveTask } from "@/hooks/use-cmdp";
import { PageHeader, StatCard, LBadge, TableSkeleton } from "@/components/shared";
import { ZelligeStar } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { t as i18n } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const tooltipStyle = {
  direction: "rtl" as const,
  borderRadius: 12,
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  fontSize: 12,
  fontFamily: "inherit",
};

function ChartCard({ title, children, hint }: { title: string; children: React.ReactNode; hint?: string }) {
  return (
    <Card className="border-border/80">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
          <ZelligeStar className="size-3 text-saffron" />
          {title}
        </CardTitle>
        {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      </CardHeader>
      <CardContent className="h-64">{children}</CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-80 lg:col-span-2" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

export function DashboardView() {
  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const setView = useUIStore((s) => s.setView);
  const { data, isLoading } = useDashboard(activeCoopId);
  const { data: coops } = useCooperatives();
  const saveTask = useSaveTask(activeCoopId);
  const { toast } = useToast();

  const coop = coops?.find((c) => c.id === activeCoopId);

  if (isLoading || !data) return <DashboardSkeleton />;

  const done = data.tasksUpcoming.filter((t) => t.status === "DONE").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={i18n("لوحة القيادة")}
        desc={`${coop?.name ?? i18n("التعاونية")} — ${coop?.province ?? ""}، ${coop?.region ?? ""}`}
        actions={
          <Button variant="outline" className="gap-1.5" onClick={() => setView("cooperatives")}>
            {i18n("بطاقة التعاونية")}
            <ArrowLeft className="size-4" />
          </Button>
        }
      />

      {/* المؤشرات */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={i18n("الأعضاء النشطون")}
          value={formatNumber(data.memberCount)}
          hint={i18n("{p}% نساء — {n} منخرطة", { p: data.womenShare, n: formatNumber(data.womenCount) })}
          icon={Users}
          tone="terra"
        />
        <StatCard
          label={i18n("إجمالي الحصص الاجتماعية")}
          value={formatNumber(data.sharesTotal)}
          hint={i18n("حصة واحدة على الأقل لكل عضو")}
          icon={PieIcon}
          tone="zellij"
        />
        <StatCard
          label={i18n("إيرادات سنة {year}", { year: new Date().getFullYear() })}
          value={formatMAD(data.incomeYTD)}
          hint={i18n("مصاريف: {amount}", { amount: formatMAD(data.expenseYTD) })}
          icon={TrendingUp}
          tone="olive"
        />
        <StatCard
          label={i18n("الرصيد الصافي (سيولة)")}
          value={formatMAD(data.balance)}
          hint={i18n("مداخيل ناقص مصاريف — كل الفترات")}
          icon={Wallet}
          tone={data.balance >= 0 ? "zellij" : "plum"}
        />
      </div>

      {/* الرسوم */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard title={i18n("الإيرادات والمصاريف — آخر 12 شهراً")} hint={i18n("بالدرهم المغربي")}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.monthlySeries} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="gIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="gExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                <YAxis
                  orientation="right"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                />
                <ReTooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string) => [
                    formatMAD(value),
                    name === "income" ? i18n("الإيرادات") : "المصاريف",
                  ]}
                />
                <Area type="monotone" dataKey="income" stroke="var(--chart-1)" strokeWidth={2.5} fill="url(#gIncome)" />
                <Area type="monotone" dataKey="expense" stroke="var(--chart-2)" strokeWidth={2} fill="url(#gExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        <ChartCard title={i18n("توزيع التعاونيات حسب القطاع")} hint={`${formatNumber(data.coopCount)} تعاونية مسجلة بالمنصة`}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.sectorDistribution}
                dataKey="count"
                nameKey="sector"
                innerRadius="52%"
                outerRadius="80%"
                paddingAngle={3}
                stroke="var(--card)"
                strokeWidth={2}
              >
                {data.sectorDistribution.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <ReTooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [i18n("{n} تعاونية", { n: formatNumber(v) }), n]} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-1 flex flex-wrap justify-center gap-x-3 gap-y-1">
            {data.sectorDistribution.slice(0, 5).map((s, i) => (
              <span key={s.sector} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="size-2 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                {s.sector}
              </span>
            ))}
          </div>
        </ChartCard>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* المواعيد النظامية */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center justify-between text-sm font-extrabold">
              <span className="flex items-center gap-2">
                <ZelligeStar className="size-3 text-saffron" />
                {i18n("المواعيد النظامية القادمة")}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">
                {done} {i18n("منجز")} / {data.tasksUpcoming.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="max-h-72 space-y-2.5 overflow-y-auto scrollbar-thin">
            {data.tasksUpcoming.length === 0 && (
              <p className="py-8 text-center text-xs text-muted-foreground">{i18n("لا توجد مواعيد قادمة")}</p>
            )}
            {data.tasksUpcoming.map((t) => {
              const overdue = t.daysLeft < 0;
              const soon = t.daysLeft <= 30 && !overdue;
              return (
                <div
                  key={t.id}
                  className="flex items-start gap-3 rounded-xl border border-border/70 bg-background p-3"
                >
                  <button
                    aria-label={t.status === "DONE" ? i18n("إلغاء الإنجاز") : i18n("تحديد كمنجز")}
                    onClick={() =>
                      saveTask.mutate(
                        { ...t, status: t.status === "DONE" ? "PENDING" : "DONE" },
                        {
                          onSuccess: () =>
                            toast({ title: t.status === "DONE" ? i18n("أُعيد فتح الالتزام") : i18n("أُنجز الالتزام — أحسنت") }),
                          onError: (e) => toast({ variant: "destructive", title: i18n("تعذر الحفظ"), description: e.message }),
                        }
                      )
                    }
                    className="mt-0.5 shrink-0"
                  >
                    {t.status === "DONE" ? (
                      <CheckCircle2 className="size-5 text-zellij" />
                    ) : (
                      <Circle className="size-5 text-muted-foreground/50 transition-colors hover:text-terra" />
                    )}
                  </button>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-bold leading-5 ${t.status === "DONE" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                      {t.title}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <LBadge map={TASK_TYPES} value={t.type} className="px-1.5 py-0 text-[9px]" />
                      <span className="text-[10px] text-muted-foreground">{formatShortDate(t.dueDate)}</span>
                      <span
                        className={`text-[10px] font-bold ${
                          overdue ? "text-destructive" : soon ? "text-[#8a6414]" : "text-zellij"
                        }`}
                      >
                        {overdue ? i18n("متأخر بـ {n} يوم", { n: Math.abs(t.daysLeft) }) : i18n("بعد {n} يوم", { n: t.daysLeft })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* تطور الأعضاء */}
        <ChartCard title={i18n("تطور عدد الأعضاء")} hint={i18n("تراكمي منذ التأسيس")}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data.membersByYear} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis orientation="right" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <ReTooltip contentStyle={tooltipStyle} formatter={(v: number) => [i18n("{n} عضو", { n: formatNumber(v) }), "العدد الإجمالي"]} />
              <Line type="monotone" dataKey="count" stroke="var(--chart-3)" strokeWidth={3} dot={{ r: 4, fill: "var(--chart-3)", strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* صحة الوثائق + آخر الجمعات */}
        <div className="space-y-4">
          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                <FileWarning className="size-4 text-terra" />
                {i18n("صحة الوثائق")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: i18n("سارية"), value: data.documentsHealth.valid, cls: "bg-zellij" },
                { label: i18n("قاربت الانتهاء"), value: data.documentsHealth.expiring, cls: "bg-saffron" },
                { label: i18n("منتهية"), value: data.documentsHealth.expired, cls: "bg-destructive" },
              ].map((r) => {
                const total = Math.max(1, data.documentsHealth.valid + data.documentsHealth.expiring + data.documentsHealth.expired);
                return (
                  <div key={r.label}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{r.label}</span>
                      <span className="font-bold tabular-nums">{r.value}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className={`h-full rounded-full ${r.cls}`} style={{ width: `${(r.value / total) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" size="sm" className="w-full gap-1.5" onClick={() => setView("documents")}>
                {i18n("فتح سجل الوثائق")}
                <ArrowLeft className="size-3.5" />
              </Button>
            </CardContent>
          </Card>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                <Gavel className="size-4 text-terra" />
                {i18n("آخر الجمعات العامة")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.assembliesRecent.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setView("assembly")}
                  className="flex w-full items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2 text-start text-xs transition-colors hover:border-terra/40"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-bold text-foreground">
                      {a.type === "ORDINARY" ? i18n("جمع عام عادي") : a.type === "EXTRAORDINARY" ? i18n("جمع عام استثنائي") : i18n("جمع تأسيسي")}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{formatShortDate(a.date)}</span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold text-zellij">{a.attendeesCount} {i18n("حاضر")}</span>
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* آخر الحركات */}
      <Card className="border-border/80">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between text-sm font-extrabold">
            <span className="flex items-center gap-2">
              <ZelligeStar className="size-3 text-saffron" />
              {i18n("آخر الحركات المالية")}
            </span>
            <Button variant="ghost" size="sm" className="h-7 gap-1 text-[11px] text-terra" onClick={() => setView("finance")}>
              {i18n("عرض الكل")}
              <ArrowLeft className="size-3" />
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.recentTransactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-foreground">{t.description ?? t.category}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {t.category} — {formatShortDate(t.date)}
                  </p>
                </div>
                <span className={`shrink-0 text-sm font-extrabold tabular-nums ${t.type === "INCOME" ? "text-zellij" : "text-terra"}`}>
                  {t.type === "INCOME" ? "+" : "−"}
                  {formatMAD(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
