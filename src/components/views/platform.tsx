// ═══════════════════════════════════════════════════════════════════════════
// CMDP — لوحة المنصة (v1.3.0) — للسوبر أدمين حصراً (المالك + المشرفون)
// تبويبات: نظرة عامة | سجل التدقيق | السوبر أدمين والملكية (المالك حصراً)
// كل الإجراءات النوعية (إشعار/توقيف/إزالة/نقل الملكية) تمر بمسارات
// /api/platform/* مع حوارات تأكيد صارمة تحمي التراتبية الإدارية.
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeftRight,
  BadgeCheck,
  Ban,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Crown,
  Hourglass,
  KeyRound,
  LayoutDashboard,
  Loader2,
  Lock,
  ScrollText,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { rawFetch } from "@/lib/api";
import { t, tError, formatDateTimeLocalized, timeAgoLocalized, useI18n } from "@/lib/i18n";
import { useUIStore } from "@/store/ui";
import { EmptyState, LBadge, PageHeader, StatCard, TableSkeleton } from "@/components/shared";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

// ─── الأنواع (عقود الـ API) ────────────────────────────────────────────────
export interface AuditLog {
  id: number;
  createdAt: string;
  actorId?: number | null;
  actorName: string;
  actorRole: string;
  action: string;
  targetType?: string | null;
  targetId?: number | null;
  targetLabel?: string | null;
  severity: string; // INFO | WARNING | CRITICAL
  details?: string | null;
}

export interface SuperAdmin {
  id: number;
  username: string;
  fullName: string;
  status: string; // ACTIVE | SUSPENDED
  isPlatformOwner: boolean;
  phone?: string | null;
  email?: string | null;
  noticedAt?: string | null;
  noticeDeadline?: string | null;
  suspendedAt?: string | null;
  createdAt: string;
  noticeReasons?: string[] | null;
  noticeDetails?: string | null;
  suspensionReasons?: string[] | null;
  suspensionDetails?: string | null;
}

interface PlatformOverview {
  users?: { total?: number; active?: number; suspended?: number; pending?: number };
  cooperatives?: { total?: number; pending?: number };
  orders?: { new?: number; newCount?: number };
  audit?: { critical?: number; warning?: number };
  recentAudit?: AuditLog[];
  auditLogs?: AuditLog[];
}

interface AuditPage {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

const AUDIT_PAGE_SIZE = 25;

// ─── خرائط التسميات (رمز ← عربية، ثم t() للترجمة) ──────────────────────────
const ACTION_LABELS: Record<string, string> = {
  USER_LOGIN: "تسجيل الدخول",
  USER_LOGIN_FAILED: "محاولة دخول فاشلة",
  USER_REGISTER: "تسجيل جديد",
  USER_CREATED: "إنشاء مستخدم",
  USER_UPDATED: "تعديل مستخدم",
  USER_DELETED: "حذف مستخدم",
  USER_STATUS_CHANGED: "تغيير حالة مستخدم",
  COOPERATIVE_CREATED: "إنشاء تعاونية",
  COOPERATIVE_UPDATED: "تعديل تعاونية",
  COOPERATIVE_DELETED: "حذف تعاونية",
  COOPERATIVE_STATUS_CHANGED: "تغيير حالة تعاونية",
  MEMBER_CREATED: "إنشاء عضو",
  MEMBER_UPDATED: "تعديل عضو",
  MEMBER_DELETED: "حذف عضو",
  MEMBER_STATUS_CHANGED: "تغيير حالة عضو",
  ORDER_CREATED: "إنشاء طلب",
  ORDER_STATUS_CHANGED: "تغيير حالة طلب",
  ORDER_DELETED: "حذف طلب",
  PRODUCT_CREATED: "إنشاء منتج",
  PRODUCT_UPDATED: "تعديل منتج",
  PRODUCT_DELETED: "حذف منتج",
  TRANSACTION_CREATED: "إنشاء حركة مالية",
  TRANSACTION_UPDATED: "تعديل حركة مالية",
  TRANSACTION_DELETED: "حذف حركة مالية",
  DOCUMENT_CREATED: "إضافة وثيقة",
  DOCUMENT_UPDATED: "تعديل وثيقة",
  DOCUMENT_DELETED: "حذف وثيقة",
  JOIN_REQUEST_DECIDED: "قرار طلب انخراط",
  APPLICATION_DECIDED: "قرار ترشيح",
  ASSEMBLY_CREATED: "إنشاء جمع عام",
  ASSEMBLY_VOTE: "تصويت في جمع عام",
  ASSEMBLY_ATTEND: "تأكيد حضور في جمع عام",
  OPPORTUNITY_CREATED: "نشر فرصة",
  OPPORTUNITY_UPDATED: "تعديل فرصة",
  OPPORTUNITY_DELETED: "حذف فرصة",
  SUPER_ADMIN_CREATED: "إضافة سوبر أدمين",
  SUPER_ADMIN_SUSPENSION_NOTICE: "إشعار توقيف",
  SUPER_ADMIN_SUSPENDED: "توقيف سوبر أدمين",
  SUPER_ADMIN_REINSTATED: "إعادة تنشيط سوبر أدمين",
  SUPER_ADMIN_REMOVED: "إزالة سوبر أدمين",
  PLATFORM_OWNERSHIP_TRANSFERRED: "نقل ملكية المنصة",
  HIERARCHY_VIOLATION_BLOCKED: "منع تجاوز صلاحيات",
};

/** تسمية الإجراء مترجَمة مع سقوط آمن إلى الرمز الخام */
function actionLabel(code: string): string {
  return t(ACTION_LABELS[code] ?? code);
}

const SEVERITY: Record<string, { label: string; className: string; dot: string }> = {
  INFO: {
    label: "معلومة",
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/60",
  },
  WARNING: {
    label: "تحذير",
    className: "bg-saffron/15 text-saffron-ink border-saffron/40",
    dot: "bg-saffron",
  },
  CRITICAL: {
    label: "حرج",
    className: "bg-destructive/10 text-destructive border-destructive/30",
    dot: "bg-destructive",
  },
};

function severityMeta(sev: string) {
  return SEVERITY[sev] ?? SEVERITY.INFO;
}

const SA_STATUS: Record<string, { label: string; className: string }> = {
  ACTIVE: { label: "نشط", className: "bg-zellij/10 text-zellij border-zellij/25" },
  SUSPENDED: { label: "موقوف", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

const NOTICE_HOURS = [24, 48, 72, 168];

// ─── الاستعلامات ───────────────────────────────────────────────────────────
function usePlatformOverview() {
  return useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => rawFetch<PlatformOverview>("/api/platform/overview"),
    retry: false,
  });
}

function useAuditLogs(filters: { search: string; severity: string; action: string; from: string; to: string }, page: number) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.action) params.set("action", filters.action);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  params.set("page", String(page));
  params.set("limit", String(AUDIT_PAGE_SIZE));
  const qs = params.toString();
  return useQuery({
    queryKey: ["platform-audit", qs],
    queryFn: () => rawFetch<AuditPage>(`/api/audit-logs?${qs}`),
    retry: false,
  });
}

function useSuperAdmins() {
  return useQuery({
    queryKey: ["platform-super-admins"],
    queryFn: () => rawFetch<SuperAdmin[] | { superAdmins?: SuperAdmin[] }>("/api/platform/super-admins"),
    retry: false,
    select: (res) => (Array.isArray(res) ? res : res?.superAdmins ?? []),
  });
}

// ─── تبويب: نظرة عامة ──────────────────────────────────────────────────────
function OverviewTab({ onOpenAudit }: { onOpenAudit: () => void }) {
  const { data, isLoading, isError } = usePlatformOverview();
  const { meta } = useI18n();

  if (isLoading) return <TableSkeleton rows={6} cols={3} />;

  if (isError || !data) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t("تعذر تحميل نظرة المنصة")}
        desc={t("تعذر الوصول إلى إحصائيات المنصة من الخادم — أعد المحاولة لاحقاً.")}
      />
    );
  }

  const users = data.users ?? {};
  const coops = data.cooperatives ?? {};
  const orders = data.orders ?? {};
  const audit = data.audit ?? {};
  const recent = data.recentAudit ?? data.auditLogs ?? [];

  return (
    <div className="space-y-6">
      {/* بطاقات المؤشرات */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label={t("إجمالي المستخدمين")} value={users.total ?? 0} icon={Users} tone="terra" />
        <StatCard label={t("مستخدمون نشطون")} value={users.active ?? 0} icon={BadgeCheck} tone="zellij" />
        <StatCard label={t("حسابات موقوفة")} value={users.suspended ?? 0} icon={Ban} tone="plum" />
        <StatCard label={t("حسابات بانتظار المصادقة")} value={users.pending ?? 0} icon={Hourglass} tone="saffron" />
        <StatCard label={t("التعاونيات المسجلة")} value={coops.total ?? 0} icon={Building2} tone="terra" />
        <StatCard label={t("تعاونيات بانتظار المصادقة")} value={coops.pending ?? 0} icon={Hourglass} tone="saffron" />
        <StatCard label={t("طلبات متجر جديدة")} value={orders.new ?? orders.newCount ?? 0} icon={ShoppingBag} tone="olive" />
        <StatCard
          label={t("أحداث حرجة")}
          value={<span className="text-destructive">{audit.critical ?? 0}</span>}
          icon={ShieldAlert}
          tone="plum"
        />
        <StatCard
          label={t("تحذيرات التدقيق")}
          value={<span className="text-saffron-ink">{audit.warning ?? 0}</span>}
          icon={AlertTriangle}
          tone="saffron"
        />
      </div>

      {/* أحدث الأحداث */}
      <Card className="border-border/80">
        <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
            <ScrollText className="size-4 text-terra" />
            {t("أحدث الأحداث")}
          </CardTitle>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-bold" onClick={onOpenAudit}>
            {t("عرض السجل الكامل")}
            <ChevronLeft className="size-3.5" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {recent.length === 0 ? (
            <p className="py-6 text-center text-xs text-muted-foreground">{t("لا توجد أحداث مسجلة بعد.")}</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {recent.slice(0, 10).map((log) => {
                const sev = severityMeta(log.severity);
                return (
                  <li key={log.id} className="flex items-start gap-3 py-2.5">
                    <span className={`mt-1.5 size-2 shrink-0 rounded-full ${sev.dot}`} aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-foreground">{actionLabel(log.action)}</p>
                      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                        {log.actorName}
                        {log.targetLabel ? ` ← ${log.targetLabel}` : ""}
                        {" • "}
                        {timeAgoLocalized(log.createdAt, meta.code)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`shrink-0 text-[10px] ${sev.className}`}>
                      {t(sev.label)}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── تبويب: سجل التدقيق ────────────────────────────────────────────────────
function AuditTab() {
  const { meta } = useI18n();
  const [search, setSearch] = React.useState("");
  const [applied, setApplied] = React.useState("");
  const [severity, setSeverity] = React.useState("ALL");
  const [action, setAction] = React.useState("ALL");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [expanded, setExpanded] = React.useState<number | null>(null);

  // بحث مؤجَّل (400 مللي ثانية) كي لا يُغرق الخادم بكل ضغطة
  React.useEffect(() => {
    const id = setTimeout(() => {
      setApplied(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(id);
  }, [search]);

  const filters = React.useMemo(
    () => ({
      search: applied,
      severity: severity === "ALL" ? "" : severity,
      action: action === "ALL" ? "" : action,
      from,
      to,
    }),
    [applied, severity, action, from, to]
  );

  const { data, isLoading, isError } = useAuditLogs(filters, page);
  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const pages = data?.pages ?? 1;

  function prettyDetails(raw: string): string {
    try {
      const parsed = JSON.parse(raw) as unknown;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return raw;
    }
  }

  return (
    <div className="space-y-4">
      {/* شريط الفلاتر */}
      <div className="grid gap-2.5 rounded-2xl border border-border bg-card p-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="relative lg:col-span-2">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("بحث في السجل...")}
            className="ps-9"
          />
        </div>
        <Select value={severity} onValueChange={(v) => { setSeverity(v); setPage(1); }}>
          <SelectTrigger aria-label={t("الخطورة")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("كل الخطورة")}</SelectItem>
            <SelectItem value="INFO">{t("معلومة")}</SelectItem>
            <SelectItem value="WARNING">{t("تحذير")}</SelectItem>
            <SelectItem value="CRITICAL">{t("حرج")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={action} onValueChange={(v) => { setAction(v); setPage(1); }}>
          <SelectTrigger aria-label={t("الإجراء")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            <SelectItem value="ALL">{t("كل الإجراءات")}</SelectItem>
            {Object.keys(ACTION_LABELS).map((code) => (
              <SelectItem key={code} value={code}>
                {actionLabel(code)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} aria-label={t("من تاريخ")} />
        <Input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} aria-label={t("إلى تاريخ")} />
      </div>

      {isLoading ? (
        <TableSkeleton rows={8} cols={6} />
      ) : isError ? (
        <EmptyState
          icon={ShieldAlert}
          title={t("تعذر تحميل السجل")}
          desc={t("تعذر الوصول إلى سجل التدقيق من الخادم — أعد المحاولة لاحقاً.")}
        />
      ) : logs.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title={t("لا توجد سجلات مطابقة")}
          desc={t("جرّب توسيع نطاق البحث أو تغيير الفلاتر الزمنية.")}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {/* جدول الشاشات الكبيرة */}
          <div className="hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-start font-bold">{t("الوقت")}</th>
                  <th className="px-4 py-3 text-start font-bold">{t("الخطورة")}</th>
                  <th className="px-4 py-3 text-start font-bold">{t("الإجراء")}</th>
                  <th className="px-4 py-3 text-start font-bold">{t("المنفِّذ")}</th>
                  <th className="px-4 py-3 text-start font-bold">{t("الهدف")}</th>
                  <th className="w-12 px-2 py-3" />
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const sev = severityMeta(log.severity);
                  const open = expanded === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className={`border-b border-border/60 last:border-0 hover:bg-muted/30 ${open ? "bg-muted/30" : ""}`}>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                          {formatDateTimeLocalized(log.createdAt, meta.code)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={`text-[10px] ${sev.className}`}>
                            {t(sev.label)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-xs font-bold text-foreground">{actionLabel(log.action)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{log.actorName}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {log.targetLabel ?? (log.targetType ? t(log.targetType) : "—")}
                        </td>
                        <td className="px-2 py-3">
                          {log.details ? (
                            <button
                              type="button"
                              onClick={() => setExpanded(open ? null : log.id)}
                              aria-label={t("التفاصيل")}
                              className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                            >
                              <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                            </button>
                          ) : (
                            <span className="block text-center text-[10px] text-muted-foreground/50">—</span>
                          )}
                        </td>
                      </tr>
                      {open && log.details && (
                        <tr className="border-b border-border/60 bg-muted/20">
                          <td colSpan={6} className="px-4 py-3">
                            <p className="mb-1 text-[10px] font-bold text-muted-foreground">{t("التفاصيل")}</p>
                            <pre dir="auto" className="scrollbar-thin max-h-48 overflow-auto rounded-xl bg-muted/60 p-3 text-[11px] leading-5 text-foreground/85">
                              {prettyDetails(log.details)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* بطاقات الهواتف */}
          <div className="divide-y divide-border lg:hidden">
            {logs.map((log) => {
              const sev = severityMeta(log.severity);
              return (
                <div key={log.id} className="space-y-1.5 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className={`text-[10px] ${sev.className}`}>
                      {t(sev.label)}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDateTimeLocalized(log.createdAt, meta.code)}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-foreground">{actionLabel(log.action)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {log.actorName}
                    {log.targetLabel ? ` ← ${log.targetLabel}` : ""}
                  </p>
                  {log.details && (
                    <p className="rounded-lg bg-muted/60 p-2 text-[11px] leading-5 text-muted-foreground">
                      {log.details}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ترقيم الصفحات */}
      {!isLoading && !isError && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{t("إجمالي السجلات: {total}", { total })}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronRight className="size-3.5" />
              {t("السابق")}
            </Button>
            <span className="text-xs font-semibold text-muted-foreground">
              {t("الصفحة {page} من {pages}", { page, pages: Math.max(1, pages) })}
            </span>
            <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
              {t("التالي")}
              <ChevronLeft className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── حوار: إضافة سوبر أدمين ────────────────────────────────────────────────
function AddSuperAdminDialog({ open, onOpenChange, onDone }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({ username: "", password: "", fullName: "", phone: "", email: "" });

  React.useEffect(() => {
    if (open) setForm({ username: "", password: "", fullName: "", phone: "", email: "" });
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await rawFetch<unknown>("/api/platform/super-admins", {
        method: "POST",
        body: JSON.stringify({
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          phone: form.phone || null,
          email: form.email || null,
        }),
      });
      toast({ title: t("تم إنشاء حساب سوبر أدمين"), description: t("للمشرف الجديد صلاحيات إدارية كاملة على المنصة.") });
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر إنشاء الحساب"), description: tError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("إضافة سوبر أدمين")}</DialogTitle>
          <DialogDescription>
            {t("ينشئ حساباً إشرافياً بصلاحيات إدارية كاملة — دون حقوق المالك (الملكية والنقل محجوزتان للمالك حصراً).")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("اسم المستخدم *")}</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                dir="ltr"
                placeholder="user.name"
                required
                pattern="[a-z0-9_.\-]{3,40}"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("كلمة المرور *")}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                required
                minLength={6}
                placeholder={t("6 أحرف على الأقل")}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">{t("الاسم الكامل *")}</Label>
            <Input
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("الهاتف")}</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("البريد الإلكتروني")}</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} dir="ltr" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("إلغاء")}
            </Button>
            <Button type="submit" disabled={busy} className="gap-2 font-bold">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("إنشاء الحساب")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── حوار: إشعار توقيف (المسار العادل) ─────────────────────────────────────
function NoticeDialog({ sa, open, onOpenChange, onDone }: {
  sa: SuperAdmin | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [reasons, setReasons] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [hours, setHours] = React.useState("48");

  React.useEffect(() => {
    if (open) {
      setReasons("");
      setDetails("");
      setHours("48");
    }
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sa) return;
    const list = reasons.split("\n").map((r) => r.trim()).filter(Boolean);
    if (list.length === 0) return;
    setBusy(true);
    try {
      await rawFetch<unknown>(`/api/platform/super-admins/${sa.id}/notice`, {
        method: "POST",
        body: JSON.stringify({ reasons: list, details: details || undefined, hours: Number(hours) }),
      });
      toast({
        title: t("تم إرسال إشعار التوقيف"),
        description: t("أُبلغ المشرف بالأسباب والمهلة — لا يمكن التوقيف قبل انقضائها."),
      });
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر إرسال الإشعار"), description: tError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("إشعار توقيف: {name}", { name: sa?.fullName ?? "" })}</DialogTitle>
          <DialogDescription>
            {t("المسار العادل: يُبلغ المشرف كتابياً بالأسباب ويُمنح مهلة للاطلاع والرد أو تصحيح الوضع قبل أي إجراء.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Alert>
            <ShieldCheck className="size-4 text-zellij" />
            <AlertTitle className="text-xs font-bold">{t("ضمانات المسار العادل")}</AlertTitle>
            <AlertDescription className="text-[11px] leading-5">
              {t("لا يمكن توقيف المشرف إلا بعد انقضاء المهلة المحددة أدناه، وتُسجَّل الأسباب في سجل التدقيق وتبقى ظاهرة في ملفه.")}
            </AlertDescription>
          </Alert>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">{t("أسباب الإيقاف (سطر لكل سبب) *")}</Label>
            <Textarea
              value={reasons}
              onChange={(e) => setReasons(e.target.value)}
              rows={4}
              required
              placeholder={t("اكتب سبباً واضحاً في كل سطر...")}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">{t("تفاصيل إضافية")}</Label>
            <Input value={details} onChange={(e) => setDetails(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">{t("مهلة الإخطار قبل التوقيف")}</Label>
            <Select value={hours} onValueChange={setHours}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {NOTICE_HOURS.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {t("{n} ساعة", { n: h })}
                    {h === 168 ? ` — ${t("أسبوع")}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("إلغاء")}
            </Button>
            <Button type="submit" disabled={busy} className="gap-2 font-bold">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("إرسال الإشعار")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── حوار: تأكيد التوقيف (يكتب اسم المستخدم) ───────────────────────────────
function SuspendDialog({ sa, open, onOpenChange, onDone }: {
  sa: SuperAdmin | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);
  const [confirmText, setConfirmText] = React.useState("");
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setConfirmText("");
      setNote("");
    }
  }, [open]);

  const valid = !!sa && confirmText.trim() === sa.username;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!sa || !valid) return;
    setBusy(true);
    try {
      await rawFetch<unknown>(`/api/platform/super-admins/${sa.id}/suspend`, {
        method: "POST",
        body: JSON.stringify({ note: note || undefined }),
      });
      toast({ title: t("تم إيقاف الحساب"), description: t("{name}: أُوقف حسابه بعد انقضاء مهلة الإخطار.", { name: sa.fullName }) });
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر تنفيذ الإجراء"), description: tError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("تأكيد توقيف: {name}", { name: sa?.fullName ?? "" })}</DialogTitle>
          <DialogDescription>
            {t("سيُوقف حساب المشرف فوراً ولن يتمكن من الدخول. يسجَّل الإجراء في سجل التدقيق ويمكن التراجع بـ«إعادة التنشيط».")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">{t("ملاحظة الإيقاف (اختياري)")}</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">
              {t("اكتب اسم المستخدم «{username}» للتأكيد", { username: sa?.username ?? "" })}
            </Label>
            <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} dir="ltr" placeholder={sa?.username} />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("إلغاء")}
            </Button>
            <Button type="submit" variant="destructive" disabled={!valid || busy} className="gap-2 font-bold">
              {busy && <Loader2 className="size-4 animate-spin" />}
              {t("تأكيد التوقيف")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── حوار: تأكيد الإزالة النهائية ──────────────────────────────────────────
function RemoveDialog({ sa, open, onOpenChange, onDone }: {
  sa: SuperAdmin | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function onConfirm() {
    if (!sa) return;
    setBusy(true);
    try {
      await rawFetch<unknown>(`/api/platform/super-admins/${sa.id}`, { method: "DELETE" });
      toast({ title: t("تمت إزالة الحساب"), description: t("{name}: حُذف حسابه نهائياً من المنصة.", { name: sa.fullName }) });
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر تنفيذ الإجراء"), description: tError(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-destructive">{t("تأكيد الإزالة النهائية")}</DialogTitle>
          <DialogDescription>
            {t("سيُحذف حساب «{name}» نهائياً مع كل صلاحياته — لا يمكن التراجع عن هذا الإجراء.", { name: sa?.fullName ?? "" })}
          </DialogDescription>
        </DialogHeader>
        <Alert variant="destructive">
          <AlertTriangle className="size-4" />
          <AlertDescription className="text-xs leading-5">
            {t("الإزالة متاحة فقط للحسابات الموقوفة بعد مسار الإخطار العادل. تأكد من مراجعة أسباب الإيقاف المسجلة قبل التأكيد.")}
          </AlertDescription>
        </Alert>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("إلغاء")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy} className="gap-2 font-bold">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {t("إزالة نهائية")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── تبويب: السوبر أدمين (المالك حصراً) ─────────────────────────────────────
function SuperAdminsTab({ list, loading }: {
  list: SuperAdmin[];
  loading: boolean;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { meta } = useI18n();
  const [addOpen, setAddOpen] = React.useState(false);
  const [noticeTarget, setNoticeTarget] = React.useState<SuperAdmin | null>(null);
  const [suspendTarget, setSuspendTarget] = React.useState<SuperAdmin | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<SuperAdmin | null>(null);
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const [busyId, setBusyId] = React.useState<number | null>(null);
  // نبضة زمنية لتحديث العدّ التنازلي لمهلات الإخطار
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const sorted = React.useMemo(() => {
    const owners = list.filter((sa) => sa.isPlatformOwner);
    const rest = [...list.filter((sa) => !sa.isPlatformOwner)].sort((a, b) =>
      (a.username > b.username ? 1 : a.username < b.username ? -1 : 0)
    );
    return [...owners, ...rest];
  }, [list]);

  /** حالة مهلة الإخطار: هل يجوز التوقيف؟ وكم بقي من الساعات؟ */
  function noticeState(sa: SuperAdmin): { canSuspend: boolean; hint: string } {
    if (!sa.noticeDeadline) return { canSuspend: false, hint: t("أرسل إشعار توقيف أولاً") };
    const msLeft = new Date(sa.noticeDeadline).getTime() - now;
    if (Number.isNaN(msLeft)) return { canSuspend: false, hint: t("أرسل إشعار توقيف أولاً") };
    if (msLeft <= 0) return { canSuspend: true, hint: t("انقضت مهلة الإخطار — يمكن التوقيف") };
    const h = Math.ceil(msLeft / 3_600_000);
    return { canSuspend: false, hint: t("تبقى {n} ساعة", { n: h }) };
  }

  async function reinstate(sa: SuperAdmin) {
    setBusyId(sa.id);
    try {
      await rawFetch<unknown>(`/api/platform/super-admins/${sa.id}/reinstate`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast({ title: t("تمت إعادة تنشيط الحساب"), description: t("{name}: استعاد صلاحياته كاملة.", { name: sa.fullName }) });
      refresh();
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر تنفيذ الإجراء"), description: tError(err) });
    } finally {
      setBusyId(null);
    }
  }

  function refresh() {
    qc.invalidateQueries({ queryKey: ["platform-super-admins"] });
    qc.invalidateQueries({ queryKey: ["platform-overview"] });
    qc.invalidateQueries({ queryKey: ["platform-audit"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {t("إدارة المشرفين على المنصة: الإنشاء، الإخطار العادل، التوقيف، وإعادة التنشيط.")}
        </p>
        <Button onClick={() => setAddOpen(true)} className="gap-2 font-bold">
          <UserPlus className="size-4" />
          {t("إضافة سوبر أدمين")}
        </Button>
      </div>

      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : sorted.length === 0 ? (
        <EmptyState icon={Shield} title={t("لا توجد حسابات إشرافية")} desc={t("أضف أول سوبر أدمين بالزر أعلاه.")} />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          {/* جدول الشاشات الكبيرة */}
          <div className="hidden lg:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                  <th className="px-4 py-3 text-start font-bold">{t("المشرف")}</th>
                  <th className="px-4 py-3 text-start font-bold">{t("التواصل")}</th>
                  <th className="px-4 py-3 text-start font-bold">{t("الحالة")}</th>
                  <th className="px-4 py-3 text-start font-bold">{t("مهلة الإخطار")}</th>
                  <th className="px-4 py-3 text-start font-bold">{t("إجراءات")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((sa) => {
                  const ns = noticeState(sa);
                  const open = expanded === sa.id;
                  const suspended = sa.status === "SUSPENDED";
                  return (
                    <React.Fragment key={sa.id}>
                      <tr className={`border-b border-border/60 last:border-0 hover:bg-muted/30 ${open ? "bg-muted/30" : ""}`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <span className={`grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold ${sa.isPlatformOwner ? "bg-saffron/20 text-saffron-ink" : "bg-terra/10 text-terra"}`}>
                              {sa.isPlatformOwner ? <Crown className="size-4" /> : sa.fullName.trim().charAt(0) || "؟"}
                            </span>
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 font-bold text-foreground">
                                {sa.fullName}
                                {sa.isPlatformOwner && (
                                  <>
                                    <Badge variant="outline" className="gap-1 border-saffron/40 bg-saffron/15 text-[10px] text-saffron-ink">
                                      <Crown className="size-3" />
                                      {t("المالك")}
                                    </Badge>
                                    <Lock className="size-3.5 text-muted-foreground" />
                                  </>
                                )}
                              </p>
                              <p className="text-[11px] text-muted-foreground" dir="ltr">@{sa.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          <p dir="ltr">{sa.phone ?? "—"}</p>
                          <p dir="ltr">{sa.email ?? ""}</p>
                        </td>
                        <td className="px-4 py-3">
                          <LBadge map={SA_STATUS} value={sa.status} />
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {sa.isPlatformOwner ? (
                            <span className="text-muted-foreground/60">—</span>
                          ) : ns.canSuspend ? (
                            <span className="font-bold text-destructive">{ns.hint}</span>
                          ) : (
                            <span className="text-muted-foreground">{ns.hint}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {sa.isPlatformOwner ? (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 py-1 text-[10px] font-bold text-muted-foreground">
                              <Lock className="size-3" />
                              {t("حساب محمي")}
                            </span>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {!suspended && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs text-saffron-ink hover:text-saffron-ink" onClick={() => setNoticeTarget(sa)}>
                                    <AlertTriangle className="size-3.5" />
                                    {t("إشعار توقيف")}
                                  </Button>
                                  {ns.canSuspend ? (
                                    <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setSuspendTarget(sa)}>
                                      <Ban className="size-3.5" />
                                      {t("توقيف")}
                                    </Button>
                                  ) : (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground/50">
                                          <Ban className="size-3.5" />
                                          {t("توقيف")}
                                        </span>
                                      </TooltipTrigger>
                                      <TooltipContent side="top" className="max-w-56 text-center">
                                        {ns.hint}
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="inline-flex h-8 cursor-not-allowed items-center gap-1 rounded-lg px-2 text-xs font-medium text-muted-foreground/50">
                                        <Trash2 className="size-3.5" />
                                        {t("إزالة")}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-56 text-center">
                                      {t("الإزالة متاحة فقط بعد توقيف الحساب.")}
                                    </TooltipContent>
                                  </Tooltip>
                                </>
                              )}
                              {suspended && (
                                <>
                                  <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs text-zellij hover:text-zellij" disabled={busyId === sa.id} onClick={() => reinstate(sa)}>
                                    {busyId === sa.id ? <Loader2 className="size-3.5 animate-spin" /> : <BadgeCheck className="size-3.5" />}
                                    {t("إعادة التنشيط")}
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setRemoveTarget(sa)}>
                                    <Trash2 className="size-3.5" />
                                    {t("إزالة")}
                                  </Button>
                                  <button
                                    type="button"
                                    onClick={() => setExpanded(open ? null : sa.id)}
                                    aria-label={t("أسباب الإيقاف")}
                                    className="grid size-7 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                  >
                                    <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                      {open && suspended && (
                        <tr className="border-b border-border/60 bg-muted/20">
                          <td colSpan={5} className="px-4 py-3">
                            <p className="mb-1.5 text-[10px] font-bold text-muted-foreground">{t("أسباب الإيقاف المسجلة")}</p>
                            <ul className="list-inside list-disc space-y-1 rounded-xl bg-muted/60 p-3 text-xs leading-6 text-foreground/85">
                              {(sa.suspensionReasons ?? sa.noticeReasons ?? []).map((r, i) => (
                                <li key={i}>{r}</li>
                              ))}
                              {(sa.suspensionReasons ?? sa.noticeReasons ?? []).length === 0 && (
                                <li className="text-muted-foreground">{t("لا توجد أسباب مسجلة.")}</li>
                              )}
                            </ul>
                            {(sa.suspensionDetails ?? sa.noticeDetails) && (
                              <p className="mt-2 text-[11px] text-muted-foreground">
                                {sa.suspensionDetails ?? sa.noticeDetails}
                              </p>
                            )}
                            {sa.suspendedAt && (
                              <p className="mt-1.5 text-[10px] text-muted-foreground">
                                {t("تاريخ الإيقاف")}: {formatDateTimeLocalized(sa.suspendedAt, meta.code)}
                              </p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* بطاقات الهواتف */}
          <div className="divide-y divide-border lg:hidden">
            {sorted.map((sa) => {
              const ns = noticeState(sa);
              const suspended = sa.status === "SUSPENDED";
              return (
                <div key={sa.id} className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`grid size-10 shrink-0 place-items-center rounded-full font-display font-bold ${sa.isPlatformOwner ? "bg-saffron/20 text-saffron-ink" : "bg-terra/10 text-terra"}`}>
                        {sa.isPlatformOwner ? <Crown className="size-4" /> : sa.fullName.trim().charAt(0) || "؟"}
                      </span>
                      <div>
                        <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                          {sa.fullName}
                          {sa.isPlatformOwner && (
                            <Badge variant="outline" className="gap-1 border-saffron/40 bg-saffron/15 text-[10px] text-saffron-ink">
                              <Crown className="size-3" />
                              {t("المالك")}
                            </Badge>
                          )}
                        </p>
                        <p className="text-[11px] text-muted-foreground" dir="ltr">@{sa.username}</p>
                      </div>
                    </div>
                    <LBadge map={SA_STATUS} value={sa.status} />
                  </div>
                  <p className="text-[11px] text-muted-foreground" dir="ltr">
                    {[sa.phone, sa.email].filter(Boolean).join(" • ") || "—"}
                  </p>
                  {!sa.isPlatformOwner && (
                    <>
                      <p className={`text-[11px] ${ns.canSuspend ? "font-bold text-destructive" : "text-muted-foreground"}`}>{ns.hint}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {!suspended ? (
                          <>
                            <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs" onClick={() => setNoticeTarget(sa)}>
                              <AlertTriangle className="size-3.5" />
                              {t("إشعار توقيف")}
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs" disabled={!ns.canSuspend} title={ns.hint} onClick={() => setSuspendTarget(sa)}>
                              <Ban className="size-3.5" />
                              {t("توقيف")}
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs text-zellij" disabled={busyId === sa.id} onClick={() => reinstate(sa)}>
                              <BadgeCheck className="size-3.5" />
                              {t("إعادة التنشيط")}
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs text-destructive" onClick={() => setRemoveTarget(sa)}>
                              <Trash2 className="size-3.5" />
                              {t("إزالة")}
                            </Button>
                          </>
                        )}
                      </div>
                      {suspended && (sa.suspensionReasons ?? sa.noticeReasons ?? []).length > 0 && (
                        <div className="rounded-xl bg-muted/60 p-3">
                          <p className="mb-1 text-[10px] font-bold text-muted-foreground">{t("أسباب الإيقاف المسجلة")}</p>
                          <ul className="list-inside list-disc space-y-0.5 text-[11px] leading-5 text-foreground/85">
                            {(sa.suspensionReasons ?? sa.noticeReasons ?? []).map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <AddSuperAdminDialog open={addOpen} onOpenChange={setAddOpen} onDone={refresh} />
      <NoticeDialog sa={noticeTarget} open={!!noticeTarget} onOpenChange={(v) => !v && setNoticeTarget(null)} onDone={refresh} />
      <SuspendDialog sa={suspendTarget} open={!!suspendTarget} onOpenChange={(v) => !v && setSuspendTarget(null)} onDone={refresh} />
      <RemoveDialog sa={removeTarget} open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)} onDone={refresh} />
    </div>
  );
}

// ─── تبويب: الملكية (المالك حصراً) ─────────────────────────────────────────
function OwnershipTab({ owner, list }: { owner: SuperAdmin | null; list: SuperAdmin[] }) {
  const { toast } = useToast();
  const { meta } = useI18n();
  const [target, setTarget] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [phrase, setPhrase] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  const candidates = list.filter((sa) => !sa.isPlatformOwner && sa.status === "ACTIVE");
  const valid = !!target && password.length >= 6 && phrase === "TRANSFER";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      await rawFetch<unknown>("/api/platform/transfer-ownership", {
        method: "POST",
        body: JSON.stringify({ targetUsername: target, password, confirmPhrase: "TRANSFER" }),
      });
      toast({ title: t("تم نقل ملكية المنصة بنجاح"), description: t("تُحدَّث الجلسة تلقائياً خلال لحظات...") });
      setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر نقل الملكية"), description: tError(err) });
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* بطاقة المالك الحالي */}
      <Card className="border-border/80">
        <CardContent className="flex flex-wrap items-center gap-4 p-5">
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-saffron/20 text-saffron-ink">
            <Crown className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-display text-lg font-extrabold text-foreground">{owner?.fullName ?? "—"}</p>
              <Badge variant="outline" className="gap-1 border-saffron/40 bg-saffron/15 text-[10px] text-saffron-ink">
                <Crown className="size-3" />
                {t("مالك المنصة")}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">@{owner?.username ?? "—"}</p>
            {owner?.createdAt && (
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("مالك منذ")}: {formatDateTimeLocalized(owner.createdAt, meta.code)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* قسم نقل الملكية */}
      <Card className="border-destructive/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-extrabold text-destructive">
            <ArrowLeftRight className="size-4" />
            {t("نقل الملكية")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle className="text-xs font-bold">{t("إجراء نهائي لا رجعة فيه")}</AlertTitle>
            <AlertDescription className="text-[11px] leading-5">
              {t("نقل الملكية يمنح المالك الجديد التحكم الكامل في المنصة (بما في ذلك نقل الملكية لغيرك)، وتفقد أنت هذه الصلاحية فوراً. تأكد جيداً قبل التأكيد.")}
            </AlertDescription>
          </Alert>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("المالك الجديد")}</Label>
                <Select value={target || undefined} onValueChange={setTarget}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("اختر مشرفاً")} />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((sa) => (
                      <SelectItem key={sa.id} value={sa.username}>
                        {sa.fullName} (@{sa.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {candidates.length === 0 && (
                  <p className="text-[10px] text-muted-foreground">{t("لا توجد مرشحون — أضف سوبر أدمين نشطاً أولاً.")}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("كلمة مرورك الحالية *")}</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("عبارة التأكيد")}</Label>
                <Input
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  dir="ltr"
                  placeholder="TRANSFER"
                />
                <p className="text-[10px] text-muted-foreground">{t("اكتب \"TRANSFER\" للتأكيد")}</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" variant="destructive" disabled={!valid || busy} className="gap-2 font-bold">
                {busy && <Loader2 className="size-4 animate-spin" />}
                <KeyRound className="size-4" />
                {t("نقل الملكية الآن")}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── الوحدة الرئيسية ───────────────────────────────────────────────────────
export function PlatformView() {
  const user = useUIStore((s) => s.user);
  const [tab, setTab] = React.useState("overview");
  const { data: superAdmins, isLoading: loadingSAs } = useSuperAdmins();

  // بوابة الدور: سوبر أدمين حصراً (التنقل مفلتر أصلاً — حماية إضافية للرابط المباشر)
  if (user?.role !== "SUPER_ADMIN") {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t("وحدة محمية")}
        desc={t("لوحة المنصة متاحة للسوبر أدمين حصراً — تواصل مع مالك المنصة إن كنت تعتقد أن هذا خطأ.")}
      />
    );
  }

  const owner = (superAdmins ?? []).find((sa) => sa.isPlatformOwner) ?? null;
  const isOwner = !!user && !!owner && (user.id === owner.id || user.username === owner.username);

  return (
    <div>
      <PageHeader
        title={t("لوحة المنصة")}
        desc={t("مركز قيادة المنصة: الإحصائيات العامة، سجل التدقيق الكامل، وإدارة المشرفين والملكية.")}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-terra/30 bg-terra/10 px-3 py-1 text-[11px] font-bold text-terra">
            <Shield className="size-3.5" />
            {t("صلاحيات عليا")}
          </span>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="overview" className="gap-1.5">
            <LayoutDashboard className="size-3.5" />
            {t("نظرة عامة")}
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <ScrollText className="size-3.5" />
            {t("سجل التدقيق")}
          </TabsTrigger>
          {isOwner && (
            <>
              <TabsTrigger value="admins" className="gap-1.5">
                <ShieldCheck className="size-3.5" />
                {t("السوبر أدمين")}
              </TabsTrigger>
              <TabsTrigger value="ownership" className="gap-1.5">
                <Crown className="size-3.5" />
                {t("الملكية")}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab onOpenAudit={() => setTab("audit")} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditTab />
        </TabsContent>
        {isOwner && (
          <>
            <TabsContent value="admins">
              <SuperAdminsTab list={superAdmins ?? []} loading={loadingSAs} />
            </TabsContent>
            <TabsContent value="ownership">
              <OwnershipTab owner={owner} list={superAdmins ?? []} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
