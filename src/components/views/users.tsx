// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة المستخدمين والمصادقات
// تبويبات: الطلبات المعلقة (حسابات/انخراط/تعاونيات) | إدارة الحسابات | إنشاء
// الصلاحيات: أدمن فأعلى يرى الجميع (بلا المالك)، كوأدمن داخل تعاونيته
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  BadgeCheck,
  Building2,
  Ban,
  KeyRound,
  Loader2,
  Search,
  ShieldCheck,
  UserPlus,
  UsersRound,
  XCircle,
} from "lucide-react";
import { ACCOUNT_TYPE_LABELS, APPROVAL_STATUS, ROLE_LABELS, USER_STATUS } from "@/lib/constants";
import { assignableRoles, canManageUser, manageDenialReason } from "@/lib/permissions";
import { useUIStore } from "@/store/ui";
import {
  useCooperatives,
  useDecideJoinRequest,
  useJoinRequests,
  useSaveCooperative,
  useSaveUser,
  useUsers,
  type UserInput,
} from "@/hooks/use-cmdp";
import type { AppUser, JoinRequest } from "@/lib/types";
import { ConfirmDialog, EmptyState, LBadge, PageHeader, TableSkeleton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { t, tError } from "@/lib/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { FileUploadField, type StoredFile } from "@/components/file-upload";
import { parseFiles, parsePhoto } from "@/lib/attachments";

// ─── بطاقة طلب انخراط ──────────────────────────────────────────────────────
/** صورة المستخدم إن وُجدت، وإلا فالأحرف الأولى من الاسم */
function UserAvatar({ u, className = "size-9 text-sm" }: { u: AppUser; className?: string }) {
  const photo = parsePhoto(u.photo);
  if (photo) {
     
    return (<img
        src={photo.dataUrl}
        alt={u.fullName}
        className={`${className} shrink-0 rounded-full border border-terra/30 object-cover`}
      />
    );
  }
  return (
    <span
      className={`${className} grid shrink-0 place-items-center rounded-full bg-terra/10 font-display font-black text-terra`}
      aria-hidden="true"
    >
      {u.fullName.trim().charAt(0) || "؟"}
    </span>
  );
}

function JoinRequestCard({ req, onDecide }: { req: JoinRequest; onDecide: (action: "APPROVED" | "REJECTED") => void }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{req.fullName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {req.requestType === "MEMBERSHIP" ? t("طلب انخراط كعضو") : t("طلب تعاقد/شراكة")} —{" "}
            {req.cooperative?.name ?? t("تعاونية رقم {id}", { id: req.cooperativeId })}
            {req.requestType === "MEMBERSHIP" && ` ${t("• {n} حصة", { n: req.shares })}`}
          </p>
          {req.motivation && (
            <p className="mt-2 line-clamp-2 rounded-lg bg-muted/60 p-2.5 text-xs leading-6 text-muted-foreground">
              {req.motivation}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            {req.phone && <span dir="ltr">{req.phone}</span>}
            {req.email && <span dir="ltr">{req.email}</span>}
            {req.cin && <span dir="ltr">CIN: {req.cin}</span>}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button size="sm" className="gap-1.5 font-bold" onClick={() => onDecide("APPROVED")}>
            <BadgeCheck className="size-3.5" /> {t("المصادقة")}
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-destructive hover:text-destructive" onClick={() => onDecide("REJECTED")}>
            <XCircle className="size-3.5" /> {t("رفض")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── حوار إنشاء/تعديل مستخدم ───────────────────────────────────────────────
function UserDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: AppUser | null;
}) {
  const user = useUIStore((s) => s.user);
  const { data: coops } = useCooperatives();
  const save = useSaveUser();
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    username: "",
    password: "",
    fullName: "",
    phone: "",
    email: "",
    cin: "",
    role: "USER",
    accountType: "MEMBER",
    cooperativeId: "",
  });
  // ── مرفقات الهوية: صورة المستخدم + وثائق الهوية (اختيارية للإدارة) ──
  const [photo, setPhoto] = React.useState<StoredFile[]>([]);
  const [idDocs, setIdDocs] = React.useState<StoredFile[]>([]);
  // تتبّع الحالة الابتدائية لتحميل المرفقات في الحِمل فقط عند التغيير (تجنّب إعادة إرسال ميغابايتات)
  const initialAttachments = React.useRef({ photo: "null", docs: "[]" });

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          username: editing.username,
          password: "",
          fullName: editing.fullName,
          phone: editing.phone ?? "",
          email: editing.email ?? "",
          cin: editing.cin ?? "",
          role: editing.role,
          accountType: editing.accountType ?? "",
          cooperativeId: editing.cooperativeId ? String(editing.cooperativeId) : "",
        });
        const existingPhoto = parsePhoto(editing.photo);
        const existingDocs = parseFiles(editing.idDocuments);
        setPhoto(existingPhoto ? [existingPhoto] : []);
        setIdDocs(existingDocs);
        initialAttachments.current = {
          photo: JSON.stringify(existingPhoto),
          docs: JSON.stringify(existingDocs),
        };
      } else {
        setForm({
          username: "",
          password: "",
          fullName: "",
          phone: "",
          email: "",
          cin: "",
          role: "USER",
          accountType: "MEMBER",
          cooperativeId: user?.cooperativeId ? String(user.cooperativeId) : "",
        });
        setPhoto([]);
        setIdDocs([]);
        initialAttachments.current = { photo: "null", docs: "[]" };
      }
    }
  }, [open, editing, user?.cooperativeId]);

  const roles = assignableRoles(user?.role, user?.accountType);
  // كوأدمن: إنشاء/تعيين داخل تعاونيته فقط
  const availableCoops =
    user?.role === "COADMIN"
      ? (coops ?? []).filter((c) => c.id === user.cooperativeId)
      : (coops ?? []).filter((c) => c.approvalStatus === "APPROVED");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: UserInput = {
      id: editing?.id ?? null,
      fullName: form.fullName,
      phone: form.phone || null,
      email: form.email || null,
      cin: form.cin || null,
      role: form.role,
      accountType: form.role === "ADMIN" ? null : form.accountType || null,
      cooperativeId: form.role === "ADMIN" ? null : form.cooperativeId ? Number(form.cooperativeId) : null,
    };
    if (!editing) {
      payload.username = form.username;
      payload.password = form.password;
    } else if (form.password) {
      payload.password = form.password;
    }
    // المرفقات: تُرسل فقط عند إنشاء حساب أو عند تغييرها في التحرير (وإلا تُترك كما هي)
    const photoJson = JSON.stringify(photo[0] ?? null);
    const docsJson = JSON.stringify(idDocs);
    if (!editing || photoJson !== initialAttachments.current.photo) {
      payload.photo = photo[0] ?? null;
    }
    if (!editing || docsJson !== initialAttachments.current.docs) {
      payload.idDocuments = idDocs;
    }
    try {
      await save.mutateAsync(payload);
      toast({
        title: editing ? t("تم تحديث الحساب") : "تم إنشاء الحساب",
        description: editing ? undefined : "الحساب مفعَّل وجاهز للاستعمال",
      });
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر الحفظ"), description: tError(err) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("تعديل حساب: {name}", { name: editing.fullName }) : t("إنشاء حساب جديد")}</DialogTitle>
          <DialogDescription>
            {editing
              ? t("تغيير الدور أو نوع الحساب أو تصفير كلمة المرور. الحسابات التي ينشئها المسيرون تُفعَّل مباشرة.")
              : t("أنشئ حساباً مفعَّلاً مباشرة: كوأدمن، أو عضو، أو متعاقد مع تعاونية.")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          {!editing && (
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
          )}
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
              <Label className="text-xs font-bold">{t("الدور والصلاحيات *")}</Label>
              <Select
                value={`${form.role}|${form.accountType}`}
                onValueChange={(v) => {
                  const [role, accountType] = v.split("|");
                  setForm((f) => ({ ...f, role, accountType }));
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((r) => (
                    <SelectItem key={`${r.role}|${r.accountType ?? ""}`} value={`${r.role}|${r.accountType ?? ""}`}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {form.role !== "ADMIN" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">{t("التعاونية *")}</Label>
                <Select
                  value={form.cooperativeId}
                  onValueChange={(v) => setForm((f) => ({ ...f, cooperativeId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("اختر التعاونية")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    {availableCoops.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("الهاتف")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("البريد الإلكتروني")}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                dir="ltr"
              />
            </div>
          </div>
          {/* ─── مرفقات الهوية (اختيارية): صورة المستخدم + وثائق إثبات الهوية ─── */}
          <div className="grid gap-4 sm:grid-cols-2">
            <FileUploadField
              id="user-photo"
              label={t("صورة المستخدم")}
              hint={t("صورة حديثة واضحة للوجه — تُستعمل للتحقق من الهوية")}
              accept="image/*"
              multiple={false}
              files={photo}
              onChange={setPhoto}
              compact
            />
            <FileUploadField
              id="user-id-docs"
              label={t("وثائق الهوية")}
              hint={t("البطاقة الوطنية أو جواز السفر أو رخصة السياقة — نسخة واضحة (صورة أو PDF)")}
              files={idDocs}
              onChange={setIdDocs}
              compact
            />
          </div>
          {editing && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">{t("تصفير كلمة المرور (اختياري)")}</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={t("اتركه فارغاً للإبقاء على الحالية")}
                minLength={6}
              />
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("إلغاء")}
            </Button>
            <Button type="submit" disabled={save.isPending} className="gap-2 font-bold">
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? t("حفظ التعديلات") : t("إنشاء الحساب")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── الوحدة الرئيسية ───────────────────────────────────────────────────────
export function UsersView() {
  const user = useUIStore((s) => s.user);
  const { data: users, isLoading } = useUsers();
  const { data: joinRequests } = useJoinRequests();
  const { data: coops } = useCooperatives();
  const decideRequest = useDecideJoinRequest();
  const saveUser = useSaveUser();
  const saveCoop = useSaveCooperative();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<AppUser | null>(null);
  const [query, setQuery] = React.useState("");
  // توقيف مسبب (الإصدار 1.3.2): سبب موثق إلزامي قبل الإيقاف + إشعار المعني
  const [suspendTarget, setSuspendTarget] = React.useState<AppUser | null>(null);
  const [suspendReason, setSuspendReason] = React.useState("");
  const [suspendBusy, setSuspendBusy] = React.useState(false);

  const canApproveCoops = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const pendingUsers = (users ?? []).filter((u) => u.status === "PENDING");
  const pendingRequests = (joinRequests ?? []).filter((r) => r.status === "PENDING");
  const pendingCoops = canApproveCoops
    ? (coops ?? []).filter((c) => c.approvalStatus === "PENDING")
    : [];
  const totalPending = pendingUsers.length + pendingRequests.length + pendingCoops.length;

  const filtered = (users ?? []).filter(
    (u) =>
      !query ||
      u.fullName.includes(query) ||
      u.username.includes(query) ||
      (u.cooperativeName ?? "").includes(query)
  );

  async function decideJoin(req: JoinRequest, action: "APPROVED" | "REJECTED") {
    try {
      await decideRequest.mutateAsync({ id: req.id, action });
      toast({
        title: action === "APPROVED" ? t("تمت المصادقة على الطلب") : "تم رفض الطلب",
        description:
          action === "APPROVED"
            ? t("{name}: {detail}", { name: req.fullName, detail: req.requestType === "MEMBERSHIP" ? t("أُضيف إلى سجل الأعضاء وفُعِّل حسابه") : t("فُعِّل حساب المتعاقد") })
            : undefined,
      });
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر تنفيذ الإجراء"), description: tError(err) });
    }
  }

  async function setUserStatus(u: AppUser, status: string) {
    // العدالة الإجرائية: لا إيقاف مباشر — سبب مكتوب إلزامي يُخطر به المعني
    if (status === "SUSPENDED" && u.status !== "SUSPENDED") {
      setSuspendTarget(u);
      setSuspendReason("");
      return;
    }
    try {
      await saveUser.mutateAsync({
        id: u.id,
        fullName: u.fullName,
        role: u.role,
        accountType: u.accountType,
        cooperativeId: u.cooperativeId,
        status,
      });
      toast({
        title:
          status === "ACTIVE"
            ? t("تم تفعيل الحساب")
            : status === "SUSPENDED"
              ? t("تم إيقاف الحساب")
              : "تم رفض الحساب",
      });
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر التنفيذ"), description: tError(err) });
    }
  }

  /** تنفيذ التوقيف الموثق من الحوار المخصص */
  async function confirmSuspend() {
    if (!suspendTarget) return;
    setSuspendBusy(true);
    try {
      await saveUser.mutateAsync({
        id: suspendTarget.id,
        fullName: suspendTarget.fullName,
        role: suspendTarget.role,
        accountType: suspendTarget.accountType,
        cooperativeId: suspendTarget.cooperativeId,
        status: "SUSPENDED",
        suspensionReason: suspendReason.trim(),
      });
      toast({ title: t("وُقف الحساب وأُبلغ صاحبه بالسبب الموثق") });
      setSuspendTarget(null);
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر التنفيذ"), description: tError(err) });
    } finally {
      setSuspendBusy(false);
    }
  }

  async function decideCoop(id: number, approvalStatus: "APPROVED" | "REJECTED") {
    const coop = (coops ?? []).find((c) => c.id === id);
    if (!coop) return;
    // المصادقة فقط: يُسقط اللوغو/الوثائق (JSON حسب نوع العرض) كي لا تُعاد كتابة ملايين المحارف بلا حاجة
    const { logo: _logo, legalDocuments: _docs, ...rest } = coop;
    try {
      await saveCoop.mutateAsync({ ...rest, approvalStatus });
      toast({
        title: approvalStatus === "APPROVED" ? t("تمت المصادقة على تسجيل التعاونية") : "تم رفض التسجيل",
        description:
          approvalStatus === "APPROVED"
            ? t("فُعِّل حساب الرئيس المرتبط بالطلب")
            : undefined,
      });
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر التنفيذ"), description: tError(err) });
    }
  }

  return (
    <div>
      <PageHeader
        title={t("المستخدمون والمصادقات")}
        desc={
          user?.role === "COADMIN"
            ? t("إدارة حسابات وحسابات تعاونيتكم: المصادقة على الانخراطات وإنشاء الحسابات.")
            : t("إدارة الحسابات والأدوار: المصادقة على التسجيلات، تعيين الكوأدمن، وإنشاء الحسابات.")
        }
        actions={
          <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2 font-bold">
            <UserPlus className="size-4" />
            {t("حساب جديد")}
          </Button>
        }
      />

      <Tabs defaultValue="pending">
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-1.5">
            {t("الطلبات المعلقة")}
            {totalPending > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-saffron px-1.5 text-[10px] font-black text-ink">
                {totalPending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="accounts" className="gap-1.5">
            {t("الحسابات")}
            <span className="text-[10px] text-muted-foreground">({(users ?? []).length})</span>
          </TabsTrigger>
        </TabsList>

        {/* ─── الطلبات المعلقة ─────────────────────────────────────────── */}
        <TabsContent value="pending" className="space-y-6">
          {totalPending === 0 && (
            <EmptyState
              icon={ShieldCheck}
              title={t("لا توجد طلبات معلقة")}
              desc={t("ستظهر هنا طلبات التسجيل والانخراط وتسجيل التعاونيات فور استلامها.")}
            />
          )}

          {pendingUsers.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-extrabold text-foreground">
                {t("حسابات بانتظار المصادقة")} ({pendingUsers.length})
              </h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {pendingUsers.map((u) => (
                  <div key={u.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{u.fullName}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground" dir="ltr">
                          @{u.username}
                          {u.email ? ` • ${u.email}` : ""}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <LBadge map={ROLE_LABELS} value={u.role} />
                          {u.accountType && (
                            <span className="text-[11px] font-semibold text-muted-foreground">
                              {t(ACCOUNT_TYPE_LABELS[u.accountType])}
                            </span>
                          )}
                          {u.cooperativeName && (
                            <span className="text-[11px] text-muted-foreground">— {u.cooperativeName}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" className="gap-1.5 font-bold" onClick={() => setUserStatus(u, "ACTIVE")}>
                          <BadgeCheck className="size-3.5" /> {t("تفعيل")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={() => setUserStatus(u, "REJECTED")}
                        >
                          <XCircle className="size-3.5" /> {t("رفض")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {pendingRequests.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-extrabold text-foreground">
                {t("طلبات الانخراط والتعاقد")} ({pendingRequests.length})
              </h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {pendingRequests.map((r) => (
                  <JoinRequestCard key={r.id} req={r} onDecide={(a) => decideJoin(r, a)} />
                ))}
              </div>
            </section>
          )}

          {pendingCoops.length > 0 && (
            <section>
              <h3 className="mb-3 text-sm font-extrabold text-foreground">
                {t("طلبات تسجيل تعاونيات")} ({pendingCoops.length})
              </h3>
              <div className="grid gap-3 lg:grid-cols-2">
                {pendingCoops.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-foreground">{c.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {c.sector} • {c.region} — {c.province}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {t("الرئيس المقرر:")} {c.presidentName}
                          {c.phone ? " — " : ""}
                          {c.phone && <span dir="ltr">{c.phone}</span>}
                        </p>
                        {c.notes && (
                          <p className="mt-2 rounded-lg bg-muted/60 p-2 text-[11px] leading-5 text-muted-foreground">
                            {c.notes}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" className="gap-1.5 font-bold" onClick={() => decideCoop(c.id, "APPROVED")}>
                          <BadgeCheck className="size-3.5" /> {t("المصادقة")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-destructive hover:text-destructive"
                          onClick={() => decideCoop(c.id, "REJECTED")}
                        >
                          <XCircle className="size-3.5" /> {t("رفض")}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </TabsContent>

        {/* ─── الحسابات ───────────────────────────────────────────────── */}
        <TabsContent value="accounts">
          <div className="mb-4 flex items-center gap-2">
            <div className="relative max-w-sm flex-1">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("بحث بالاسم أو اسم المستخدم أو التعاونية...")}
                className="ps-9"
              />
            </div>
          </div>

          {isLoading ? (
            <TableSkeleton rows={6} cols={5} />
          ) : filtered.length === 0 ? (
            <EmptyState icon={UsersRound} title={t("لا توجد حسابات")} desc={t("أنشئ أول حساب بالزر أعلاه.")} />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {/* جدول الشاشات الكبيرة */}
              <div className="hidden lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                      <th className="px-4 py-3 text-start font-bold">{t("المستخدم")}</th>
                      <th className="px-4 py-3 text-start font-bold">{t("الدور")}</th>
                      <th className="px-4 py-3 text-start font-bold">{t("التعاونية")}</th>
                      <th className="px-4 py-3 text-start font-bold">{t("الحالة")}</th>
                      <th className="px-4 py-3 text-start font-bold">{t("إجراءات")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((u) => (
                      <tr key={u.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar u={u} />
                            <div className="min-w-0">
                              <p className="font-bold text-foreground">{u.fullName}</p>
                              <p className="text-[11px] text-muted-foreground" dir="ltr">@{u.username}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <LBadge map={ROLE_LABELS} value={u.role} />
                            {u.accountType && (
                              <p className="text-[10px] text-muted-foreground">{t(ACCOUNT_TYPE_LABELS[u.accountType])}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{u.cooperativeName ?? "—"}</td>
                        <td className="px-4 py-3">
                          <LBadge map={USER_STATUS} value={u.status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            {canManageUser(user, u) ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 gap-1 px-2 text-xs"
                                  onClick={() => { setEditing(u); setDialogOpen(true); }}
                                >
                                  <KeyRound className="size-3.5" /> {t("تعديل")}
                                </Button>
                                {u.status === "ACTIVE" ? (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 gap-1 px-2 text-xs text-saffron hover:text-saffron"
                                    onClick={() => setUserStatus(u, "SUSPENDED")}
                                  >
                                    <Ban className="size-3.5" /> {t("إيقاف")}
                                  </Button>
                                ) : (
                                  u.status !== "REJECTED" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-8 gap-1 px-2 text-xs text-zellij hover:text-zellij"
                                      onClick={() => setUserStatus(u, "ACTIVE")}
                                    >
                                      <BadgeCheck className="size-3.5" /> {t("تفعيل")}
                                    </Button>
                                  )
                                )}
                              </>
                            ) : (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 py-1 text-[10px] font-bold text-muted-foreground">
                                    <ShieldCheck className="size-3.5 text-zellij" />
                                    {t("حساب محمي")}
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-56 text-center">
                                  {t(manageDenialReason(user, u))}
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* بطاقات الهواتف */}
              <div className="divide-y divide-border lg:hidden">
                {filtered.map((u) => (
                  <div key={u.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserAvatar u={u} />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">{u.fullName}</p>
                        <p className="text-[11px] text-muted-foreground" dir="ltr">@{u.username}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <LBadge map={ROLE_LABELS} value={u.role} />
                          <LBadge map={USER_STATUS} value={u.status} />
                        </div>
                        {u.cooperativeName && (
                          <p className="mt-1 text-[11px] text-muted-foreground">{u.cooperativeName}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      {canManageUser(user, u) ? (
                        <>
                          <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs" onClick={() => { setEditing(u); setDialogOpen(true); }}>
                            <KeyRound className="size-3.5" /> {t("تعديل")}
                          </Button>
                          {u.status === "ACTIVE" ? (
                            <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs text-saffron" onClick={() => setUserStatus(u, "SUSPENDED")}>
                              <Ban className="size-3.5" /> {t("إيقاف")}
                            </Button>
                          ) : (
                            u.status !== "REJECTED" && (
                              <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs text-zellij" onClick={() => setUserStatus(u, "ACTIVE")}>
                                <BadgeCheck className="size-3.5" /> {t("تفعيل")}
                              </Button>
                            )
                          )}
                        </>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-lg border border-border bg-muted/50 px-2 py-1 text-[10px] font-bold text-muted-foreground"
                          title={t(manageDenialReason(user, u))}
                        >
                          <ShieldCheck className="size-3.5 text-zellij" />
                          {t("حساب محمي")}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <UserDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />

      {/* حوار التوقيف الموثق (الإصدار 1.3.2) — سبب إلزامي يُخطر به المعني */}
      <Dialog open={!!suspendTarget} onOpenChange={(v) => { if (!v) setSuspendTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {t("إيقاف حساب")}: {suspendTarget?.fullName} ({suspendTarget?.username})
            </DialogTitle>
            <DialogDescription>
              {t("السبب الموثق إلزامي — يُخطر به المعني عبر الإشعارات ويظهر له عند محاولة الدخول، ويوثق في سجل الأحداث")}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>{t("سبب التوقيف")}</Label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="mt-1.5 min-h-20"
              placeholder={t("مثال: خرق موثق لقواعد الاستخدام بتاريخ… بعد تنبيهين سابقين…")}
            />
            {suspendReason.trim().length > 0 && suspendReason.trim().length < 10 && (
              <p className="mt-1 text-[11px] font-bold text-destructive">{t("10 أحرف على الأقل")}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSuspendTarget(null)} disabled={suspendBusy}>
              {t("إلغاء")}
            </Button>
            <Button
              variant="destructive"
              disabled={suspendBusy || suspendReason.trim().length < 10}
              onClick={() => confirmSuspend()}
            >
              {suspendBusy && <Loader2 className="me-1 size-4 animate-spin" />}
              {t("تنفيذ التوقيف الموثق")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
