// ═══════════════════════════════════════════════════════════════════════════
// CMDP — سجل الأحداث التدقيقي (الإصدار 1.3.2) — المالك والسوبر أدمين
// قراءة فقط، بلا حذف ولا تعديل (حوكمة: التاريخ لا يُمحى):
//   • شريط إحصاءات + رسم آخر 7 أيام + أهم الأحداث والفاعلين
//   • خط زمني بهوية مغربية (نجمة الزليج) ودرجات خطورة مميزة
//   • فلاتر: نوع الحدث/الخطورة/الفاعل/بحث نصي + ترقيم
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  History,
  Loader2,
  Search,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { can } from "@/lib/permissions";
import { useUIStore } from "@/store/ui";
import { useAuditLogs, useAuditStats } from "@/hooks/use-cmdp";
import { EmptyState, PageHeader, TableSkeleton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { t, tError } from "@/lib/i18n";
import { ZelligeStar } from "@/components/patterns";
import type { AuditLogEntry } from "@/lib/types";

const SEVERITY_TONES: Record<string, "success" | "warning" | "danger"> = {
  INFO: "success",
  WARNING: "warning",
  CRITICAL: "danger",
};

const SEVERITY_LABELS: Record<string, string> = {
  INFO: "معلومة",
  WARNING: "تحذير",
  CRITICAL: "حرج",
};

/** ترجمة رموز الأحداث إلى عربية مقروءة */
function actionLabel(action: string): string {
  const map: Record<string, string> = {
    "auth.login": "دخول ناجح",
    "auth.login_failed": "محاولة دخول فاشلة",
    "auth.register_account": "تسجيل حساب عمومي",
    "auth.register_join": "طلب انخراط/تعاقد عمومي",
    "auth.register_new_coop": "تسجيل تعاونية جديدة",
    "user.create": "إنشاء حساب",
    "user.update": "تحديث حساب",
    "user.suspend": "توقيف حساب",
    "user.activate": "تنشيط حساب",
    "user.role_change": "تغيير دور",
    "user.password_reset": "تصفير كلمة مرور",
    "user.delete": "حذف حساب",
    "user.status_rejected": "رفض حساب",
    "super_admin.add": "إضافة سوبر أدمين",
    "super_admin.promote": "ترقية سوبر أدمين",
    "super_admin.suspension_notice": "إشعار نية توقيف",
    "super_admin.suspend": "توقيف سوبر أدمين",
    "super_admin.reinstate": "إعادة تنشيط سوبر أدمين",
    "super_admin.notice_response": "رد على إشعار التوقيف",
    "super_admin.remove": "إزالة سوبر أدمين",
    "ownership.transfer": "نقل ملكية المنصة",
    "cooperative.create": "إنشاء تعاونية",
    "cooperative.update": "تحديث تعاونية",
    "cooperative.approve": "مصادقة تعاونية",
    "cooperative.reject": "رفض تسجيل تعاونية",
    "cooperative.delete": "حذف تعاونية",
    "join_request.approve": "مصادقة طلب انخراط",
    "join_request.reject": "رفض طلب انخراط",
    "member.create": "تسجيل عضو",
    "member.update": "تحديث عضو",
    "member.delete": "حذف عضو",
    "transaction.create": "تسجيل حركة مالية",
    "transaction.update": "تحديث حركة مالية",
    "transaction.delete": "حذف حركة مالية",
    "document.create": "إضافة وثيقة",
    "document.update": "تحديث وثيقة",
    "document.delete": "حذف وثيقة",
    "assembly.create": "برمجة جمع عام",
    "assembly.update": "تحديث جمع عام",
    "assembly.delete": "حذف جمع عام",
    "assembly.vote": "تصويت في جمع عام",
    "assembly.attend": "تأكيد حضور",
    "meeting.create": "برمجة اجتماع مجلس",
    "meeting.update": "تحديث اجتماع مجلس",
    "meeting.delete": "حذف اجتماع مجلس",
    "opportunity.create": "نشر فرصة",
    "opportunity.update": "تحديث فرصة",
    "opportunity.delete": "حذف فرصة",
    "opportunity.apply": "ترشح لفرصة",
    "application.review": "دراسة ترشيح",
    "product.create": "إضافة منتج",
    "product.update": "تحديث منتج",
    "product.delete": "حذف منتج",
    "order.place_public": "طلب شراء عمومي",
    "order.status_change": "تحديث طلب متجر",
    "order.delete": "حذف طلب متجر",
    "compliance_task.create": "إضافة التزام نظامي",
    "compliance_task.update": "تحديث التزام",
    "compliance_task.delete": "حذف التزام",
    "interaction.create": "تسجيل تفاعل مع جهة",
    "interaction.update": "تحديث تفاعل",
    "interaction.delete": "حذف تفاعل",
    "audit_logs.view": "اطلاع على سجل الأحداث",
  };
  if (map[action]) return t(map[action]);
  if (action.endsWith(".denied")) return t("محاولة وصول مرفوضة") + " — " + t(actionLabel(action.replace(".denied", "")));
  return t(action);
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "سوبر أدمين",
  ADMIN: "أدمن",
  COADMIN: "كوأدمن",
  USER: "مستخدم",
  anonymous: "زائر",
};

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("ar-MA", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return iso.slice(0, 16);
  }
}

/** شارة خطورة محلية (نجمة زليج بألوان الهوية) */
function SevBadge({ tone, label }: { tone: "success" | "warning" | "danger"; label: string }) {
  return (
    <span
      className={
        "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-bold " +
        (tone === "danger"
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : tone === "warning"
            ? "border-saffron/40 bg-saffron/15 text-saffron-ink"
            : "border-terra/30 bg-terra/10 text-terra")
      }
    >
      {label}
    </span>
  );
}

/** بطاقة حدث في الخط الزمني */
function EventCard({ entry }: { entry: AuditLogEntry }) {
  const tone = SEVERITY_TONES[entry.severity] ?? "success";
  const [expanded, setExpanded] = React.useState(false);
  const details = React.useMemo(() => {
    if (!entry.details) return null;
    try {
      return JSON.parse(entry.details) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [entry.details]);

  return (
    <div className="relative flex gap-3 rounded-2xl border border-border bg-card p-4">
      <span
        className={
          "mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl " +
          (tone === "danger"
            ? "bg-destructive/10 text-destructive"
            : tone === "warning"
              ? "bg-saffron/15 text-saffron-ink"
              : "bg-terra/10 text-terra")
        }
      >
        {tone === "danger" ? (
          <AlertTriangle className="size-4" />
        ) : tone === "warning" ? (
          <ShieldAlert className="size-4" />
        ) : (
          <ZelligeStar className="size-4" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <SevBadge tone={tone} label={t(SEVERITY_LABELS[entry.severity] ?? entry.severity)} />
          <p className="text-sm font-bold text-foreground">{entry.summary}</p>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="font-semibold text-terra">{actionLabel(entry.action)}</span>
          <span>
            {t("الفاعل")}: {entry.actorUsername}
            {entry.actorRole && entry.actorRole !== "anonymous"
              ? ` (${t(ROLE_LABELS[entry.actorRole] ?? entry.actorRole)})`
              : ""}
          </span>
          <span>{formatDateTime(entry.createdAt)}</span>
          {entry.ip && <span dir="ltr">{entry.ip}</span>}
        </div>
        {details && (
          <>
            <button
              className="mt-1 text-[11px] font-semibold text-terra underline-offset-2 hover:underline"
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? t("إخفاء التفاصيل") : t("عرض التفاصيل")}
            </button>
            {expanded && (
              <pre
                dir="ltr"
                className="mt-2 max-h-40 overflow-auto rounded-xl bg-muted/70 p-3 text-[10px] leading-5 text-muted-foreground"
              >
                {JSON.stringify(details, null, 2)}
              </pre>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function AuditLogView() {
  const user = useUIStore((s) => s.user);
  const { toast } = useToast();
  const allowed = can(user, "view:audit-log");

  const [severity, setSeverity] = React.useState("all");
  const [actor, setActor] = React.useState("");
  const [q, setQ] = React.useState("");
  const [applied, setApplied] = React.useState({ severity: "all", actor: "", q: "" });
  const [offset, setOffset] = React.useState(0);
  const limit = 50;

  const { data, isLoading, isError, error, refetch, isRefetching } = useAuditLogs({
    severity: applied.severity === "all" ? undefined : applied.severity,
    actor: applied.actor || undefined,
    q: applied.q || undefined,
    limit,
    offset,
  });
  const { data: stats } = useAuditStats();

  if (!allowed) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t("سجل الأحداث متاح لمالك المنصة والسوبر أدمين حصراً")}
        desc={t("تواصلوا مع مالك المنصة إن كنتم ترون حاجة لصلاحية الاطلاع")}
      />
    );
  }

  const total = data?.total ?? 0;
  const items = data?.items ?? [];
  const hasPrev = offset > 0;
  const hasNext = offset + limit < total;

  const applyFilters = () => {
    setOffset(0);
    setApplied({ severity, actor, q });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("سجل الأحداث")}
        desc={t("توثيق تدقيقي شامل لكل ما يجري في المنصة — قراءة فقط، بلا حذف ولا تعديل، بدرجات خطورة مميزة")}
      />

      {/* شريط الإحصاءات */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <History className="size-4 text-terra" />
            <span className="text-[11px] font-semibold">{t("كل الأحداث")}</span>
          </div>
          <p className="mt-1 font-display text-xl font-black">{stats?.total ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ZelligeStar className="size-4 text-terra" />
            <span className="text-[11px] font-semibold">{t("آخر 7 أيام")}</span>
          </div>
          <p className="mt-1 font-display text-xl font-black">{stats?.last7 ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-saffron/40 bg-saffron/10 p-4">
          <div className="flex items-center gap-2 text-saffron-ink">
            <ShieldAlert className="size-4" />
            <span className="text-[11px] font-semibold">{t("تحذيرات")}</span>
          </div>
          <p className="mt-1 font-display text-xl font-black text-saffron-ink">{stats?.warning ?? "—"}</p>
        </div>
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="size-4" />
            <span className="text-[11px] font-semibold">{t("أحداث حرجة")}</span>
          </div>
          <p className="mt-1 font-display text-xl font-black text-destructive">{stats?.critical ?? "—"}</p>
        </div>
      </div>

      {/* رسم آخر 7 أيام */}
      {(stats?.byDay?.length ?? 0) > 0 && (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="mb-3 text-sm font-bold text-foreground">{t("نشاط المنصة — آخر 7 أيام")}</p>
          <div className="h-40 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats!.byDay} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(156,69,38,.12)" vertical={false} />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(5)}
                  stroke="#7a6a57"
                />
                <YAxis tick={{ fontSize: 10 }} stroke="#7a6a57" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#241c14",
                    border: "1px solid rgba(156,69,38,.4)",
                    borderRadius: 12,
                    color: "#faf6ee",
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#d9a03f" }}
                />
                <Bar dataKey="count" name={t("أحداث")} fill="#9c4526" radius={[6, 6, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* الفلاتر */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-[160px_180px_1fr_auto]">
          <div>
            <p className="mb-1 text-[11px] font-bold text-muted-foreground">{t("الخطورة")}</p>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("الكل")}</SelectItem>
                <SelectItem value="INFO">{t("معلومة")}</SelectItem>
                <SelectItem value="WARNING">{t("تحذير")}</SelectItem>
                <SelectItem value="CRITICAL">{t("حرج")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold text-muted-foreground">{t("الفاعل")}</p>
            <Input
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder={t("اسم المستخدم")}
              dir="ltr"
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] font-bold text-muted-foreground">{t("بحث في الوصف")}</p>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("كلمة مفتاحية…")} />
          </div>
          <div className="flex items-end gap-2">
            <Button
              size="sm"
              className="gap-1.5"
              onClick={applyFilters}
              disabled={isRefetching}
            >
              {isRefetching ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Search className="size-4" />
              )}
              {t("تطبيق")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={() => refetch()}
              title={t("تحديث")}
            >
              <History className="size-4" />
            </Button>
          </div>
        </div>
        {isError && (
          <p className="mt-3 text-xs font-bold text-destructive" role="alert">
            {tError(error)}{" "}
            <button className="underline" onClick={() => refetch()}>
              {t("إعادة المحاولة")}
            </button>
          </p>
        )}
      </div>

      {/* الخط الزمني */}
      {isLoading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={t("لا أحداث بهذه الفلاتر")}
          desc={t("عدّل الفلاتر أو حدّث السجل — كل إجراء في المنصة يظهر هنا فور حدوثه")}
        />
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("يعرض {n} من {total} حدثاً", {
              n: `${offset + 1}–${Math.min(offset + items.length, total)}`,
              total,
            })}
          </p>
          {items.map((e) => (
            <EventCard key={e.id} entry={e} />
          ))}

          {/* ترقيم */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              size="sm"
              variant="outline"
              disabled={!hasPrev || isRefetching}
              onClick={() => setOffset(Math.max(0, offset - limit))}
            >
              <ChevronRight className="size-4 rtl:rotate-0 ltr:rotate-180" />
              {t("السابق")}
            </Button>
            <span className="text-xs font-semibold text-muted-foreground">
              {Math.floor(offset / limit) + 1} / {Math.max(1, Math.ceil(total / limit))}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={!hasNext || isRefetching}
              onClick={() => setOffset(offset + limit)}
            >
              {t("التالي")}
              <ChevronLeft className="size-4 rtl:rotate-0 ltr:rotate-180" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
