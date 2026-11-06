// ═══════════════════════════════════════════════════════════════════════════
// CMDP — لوحة المالك (الإصدار 1.3.2) — المالك حصراً
//   ① نقل ملكية المنصة: إجراء موثق بتأكيد كتابة اسم الحساب + سبب إلزامي
//   ② إدارة السوبر أدمين: إضافة/ترقية + مسار الإجراء العادل:
//      إشعار مسبب ← أجل للرد والتسوية ← توقيف موثق ← (اختيارياً) إزالة
//   حساب المالك محمي بالكامل — لا يظهر في القوائم القابلة للإجراء.
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  BadgeCheck,
  Crown,
  Gavel,
  History,
  KeyRound,
  Loader2,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  Trash2,
  UserPlus,
} from "lucide-react";
import { isPlatformOwner } from "@/lib/permissions";
import { useUIStore } from "@/store/ui";
import {
  useAuditStats,
  useOwnerAction,
  useNotifications,
  useRespondToNotice,
  useSuperAdmins,
  useTransferOwnership,
  useUsers,
  type SuperAdminView,
} from "@/hooks/use-cmdp";
import { EmptyState, PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { t, tError, formatDateLocalized } from "@/lib/i18n";
import { ZelligeStar } from "@/components/patterns";

/** شارة حالة محلية بألوان الهوية */
function StateBadge({ tone, label }: { tone: "success" | "warning" | "danger"; label: string }) {
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

/** فك إشعار التوقيف المخزن JSON */
function parseNotice(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      reason: string;
      effectiveAt: string;
      issuedAt: string;
      issuedBy: string;
      response?: string;
      respondedAt?: string;
    };
  } catch {
    return null;
  }
}

export function OwnerView() {
  const user = useUIStore((s) => s.user);
  const setView = useUIStore((s) => s.setView);
  const { toast } = useToast();
  const { data: supers = [], isLoading } = useSuperAdmins();
  const { data: usersAll } = useUsers();
  const { data: auditStats } = useAuditStats();
  const { data: notifData } = useNotifications();
  const ownerAction = useOwnerAction();
  const transfer = useTransferOwnership();

  const admins = (usersAll ?? []).filter((u: { role: string; status: string; id: number }) => u.role === "ADMIN" && u.status === "ACTIVE");
  const owner = supers.find((s: SuperAdminView) => s.isOwner);
  const others = supers.filter((s: SuperAdminView) => !s.isOwner);

  // ── حالات الحوارات ──────────────────────────────────────────────────────
  const [transferOpen, setTransferOpen] = React.useState(false);
  const [addOpen, setAddOpen] = React.useState(false);
  const [noticeTarget, setNoticeTarget] = React.useState<SuperAdminView | null>(null);
  const [suspendTarget, setSuspendTarget] = React.useState<SuperAdminView | null>(null);
  const [reinstateTarget, setReinstateTarget] = React.useState<SuperAdminView | null>(null);
  const [removeTarget, setRemoveTarget] = React.useState<SuperAdminView | null>(null);

  // نموذج نقل الملكية
  const [transferTarget, setTransferTarget] = React.useState("");
  const [transferReason, setTransferReason] = React.useState("");
  const [transferConfirm, setTransferConfirm] = React.useState("");

  // نموذج الإضافة/الترقية
  const [addMode, setAddMode] = React.useState<"new" | "promote">("new");
  const [newUsername, setNewUsername] = React.useState("");
  const [newFullName, setNewFullName] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [newPhone, setNewPhone] = React.useState("");
  const [newEmail, setNewEmail] = React.useState("");
  const [addReason, setAddReason] = React.useState("");
  const [promoteId, setPromoteId] = React.useState("");

  // نموذج الإشعار
  const [noticeReason, setNoticeReason] = React.useState("");
  const [graceHours, setGraceHours] = React.useState("48");

  // نموذج التوقيف النهائي
  const [suspendReason, setSuspendReason] = React.useState("");

  // نموذج إعادة التنشيط
  const [reinstateNote, setReinstateNote] = React.useState("");

  // تأكيد الإزالة
  const [removeConfirm, setRemoveConfirm] = React.useState("");

  const pending = ownerAction.isPending || transfer.isPending;
  const myNotice = notifData?.items.find((n) => n.type === "SUSPENSION_NOTICE");

  const handleAction = async (
    fn: () => Promise<unknown>,
    done: () => void,
    successMsg: string
  ) => {
    try {
      await fn();
      toast({ title: successMsg });
      done();
    } catch (e) {
      toast({ title: tError(e), variant: "destructive" });
    }
  };

  if (!isPlatformOwner(user)) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title={t("هذه اللوحة من اختصاص مالك المنصة حصراً")}
        desc={t("إن كنت المالك فسجّل الدخول بحساب المالك، وإلا فتواصل معه لمنحك الصلاحية المناسبة")}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title={t("لوحة المالك")}
        desc={t("نقل ملكية المنصة وإدارة السوبر أدمين وفق ميثاق عادل موثق — كل إجراء يسجل في سجل الأحداث")}
      />

      {/* إحصاءات سريعة */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatMini icon={ShieldCheck} label={t("السوبر أدمين")} value={String(supers.length)} />
        <StatMini icon={History} label={t("أحداث السجل")} value={String(auditStats?.total ?? "—")} />
        <StatMini icon={Gavel} label={t("أحداث حرجة")} value={String(auditStats?.critical ?? "—")} danger={!!auditStats?.critical} />
        <StatMini icon={BadgeCheck} label={t("إشعارات غير مقروءة")} value={String(notifData?.unread ?? "0")} />
      </div>

      {/* تنبيه إشعار التوقيف (إن كان بحق المالك الحالي — إطار عادل للجميع) */}
      {myNotice && (
        <div className="rounded-2xl border border-saffron/40 bg-saffron/10 p-4">
          <div className="flex items-start gap-3">
            <ShieldAlert className="mt-0.5 size-5 shrink-0 text-saffron-ink" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-saffron-ink">{t("إشعار بنية توقيف حسابك")}</p>
              <p className="mt-1 text-xs leading-6 text-saffron-ink/80">{myNotice.body}</p>
              <RespondNotice userId={user!.id} />
            </div>
          </div>
        </div>
      )}

      {/* ══ ① الملكية ════════════════════════════════════════════════════ */}
      <section className="rounded-2xl border border-terra/25 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-terra/10 text-terra">
              <Crown className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-extrabold text-foreground">
                {t("ملكية المنصة")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("المالك الحالي")}: <strong className="text-foreground">{owner?.fullName ?? user?.fullName}</strong>
                {owner ? ` (${owner.username})` : ""}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2 border-terra/30 text-terra"
            onClick={() => {
              setTransferOpen(true);
              setTransferTarget("");
              setTransferReason("");
              setTransferConfirm("");
            }}
          >
            <KeyRound className="size-4" />
            {t("نقل الملكية")}
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
          <ZelligeStar className="size-3.5 text-terra" />
          <span>
            {t("نقل الملكية إجراء جذري موثق: يتطلب سبباً مكتوباً وتأكيداً بكتابة اسم حسابك — ولا يحتكر الملكيةَ الجديدة سواه بعد النقل")}
          </span>
        </div>
      </section>

      {/* ══ ② إدارة السوبر أدمين ═════════════════════════════════════════ */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-2xl bg-terra/10 text-terra">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-extrabold text-foreground">
                {t("السوبر أدمين")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("المسار العادل: إشعار مسبب ← أجل للرد ← توقيف موثق ← إزالة — بلا استثناءات")}
              </p>
            </div>
          </div>
          <Button
            className="gap-2"
            onClick={() => {
              setAddOpen(true);
              setAddMode("new");
              setNewUsername("");
              setNewFullName("");
              setNewPassword("");
              setNewPhone("");
              setNewEmail("");
              setAddReason("");
              setPromoteId("");
            }}
          >
            <ShieldPlus className="size-4" />
            {t("سوبر أدمين جديد")}
          </Button>
        </div>

        {isLoading ? (
          <div className="grid place-items-center py-16 text-muted-foreground">
            <Loader2 className="size-6 animate-spin" />
          </div>
        ) : others.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title={t("لا يوجد سوبر أدمين غير المالك")}
            desc={t("أنشئ سوبر أدمين جدداً أو رقِّ أدمناً موثوقاً — تُدار هذه الحسابات وفق الميثاق العادل")}
          />
        ) : (
          <div className="space-y-3">
            {others.map((s) => {
              const notice = parseNotice(s.suspensionNotice);
              const deadlinePassed = notice
                ? new Date(notice.effectiveAt).getTime() <= Date.now()
                : false;
              return (
                <div key={s.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-bold text-foreground">{s.fullName}</p>
                        <span className="text-xs text-muted-foreground">({s.username})</span>
                        {s.status === "ACTIVE" && !notice && (
                          <StateBadge tone="success" label={t("نشط")} />
                        )}
                        {s.status === "SUSPENDED" && <StateBadge tone="danger" label={t("موقوف")} />}
                        {notice && s.status === "ACTIVE" && (
                          <StateBadge tone="warning" label={t("تحت إشعار توقيف")} />
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t("أُنشئ في")} {formatDateLocalized(s.createdAt)}
                        {s.phone ? ` • ${s.phone}` : ""}
                        {s.email ? ` • ${s.email}` : ""}
                      </p>

                      {/* ملف الإشعار النافذ */}
                      {notice && (
                        <div className="mt-2 rounded-xl border border-saffron/30 bg-saffron/10 p-3 text-xs leading-6 text-saffron-ink">
                          <p className="font-bold">{t("إشعار نية التوقيف نافذ")}</p>
                          <p>
                            {t("السبب")}: «{notice.reason}»
                          </p>
                          <p>
                            {t("يسري من")}: {formatDateLocalized(notice.effectiveAt)} —{" "}
                            {deadlinePassed
                              ? t("انقضى الأجل — يمكن تنفيذ التوقيف")
                              : t("الأجل قائم — للمعني حق الرد والتسوية")}
                          </p>
                          <p>
                            {t("أصدره")}: {notice.issuedBy}
                          </p>
                          {notice.response && (
                            <p className="mt-1 rounded-lg bg-ink/10 p-2">
                              {t("رد المعني")}: «{notice.response}»
                            </p>
                          )}
                        </div>
                      )}
                      {s.status === "SUSPENDED" && s.suspensionReason && (
                        <p className="mt-2 rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-xs leading-6 text-destructive">
                          {t("سبب التوقيف الموثق")}: «{s.suspensionReason}» — {t("منذ")}{" "}
                          {s.suspendedAt ? formatDateLocalized(s.suspendedAt) : "—"}
                        </p>
                      )}
                    </div>

                    {/* الإجراءات حسب الحالة */}
                    <div className="flex flex-wrap items-center gap-2">
                      {s.status === "ACTIVE" && !notice && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-saffron/50 text-saffron-ink"
                            onClick={() => {
                              setNoticeTarget(s);
                              setNoticeReason("");
                              setGraceHours("48");
                            }}
                          >
                            <Gavel className="me-1 size-3.5" />
                            {t("إشعار توقيف")}
                          </Button>
                        </>
                      )}
                      {notice && s.status === "ACTIVE" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive"
                            disabled={!deadlinePassed}
                            title={deadlinePassed ? undefined : t("احترام الأجل العادل — انقضاؤه شرط التنفيذ")}
                            onClick={() => {
                              setSuspendTarget(s);
                              setSuspendReason(notice.response ? "" : notice.reason);
                            }}
                          >
                            <Gavel className="me-1 size-3.5" />
                            {t("تنفيذ التوقيف")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReinstateTarget(s);
                              setReinstateNote("");
                            }}
                          >
                            {t("إلغاء الإشعار")}
                          </Button>
                        </>
                      )}
                      {s.status === "SUSPENDED" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setReinstateTarget(s);
                              setReinstateNote("");
                            }}
                          >
                            {t("رفع التوقيف")}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-destructive/40 text-destructive"
                            onClick={() => {
                              setRemoveTarget(s);
                              setRemoveConfirm("");
                            }}
                          >
                            <Trash2 className="me-1 size-3.5" />
                            {t("إزالة نهائية")}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <Button
          variant="ghost"
          className="gap-2 text-muted-foreground"
          onClick={() => setView("auditlog")}
        >
          <ScrollText className="size-4" />
          {t("استعرض سجل الأحداث الكامل — كل إجراء موثق فيه")}
        </Button>
      </section>

      {/* ═════════ حوار نقل الملكية ═════════════════════════════════════ */}
      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("نقل ملكية المنصة")}</DialogTitle>
            <DialogDescription>
              {t("إجراء جذري أحادي الاتجاه: يصبح الهدف مالكاً بكامل الصلاحيات، وتصبح أنت سوبر أدمين تحت إدارته — يوثق في سجل الأحداث بدرجة حرجة")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("الحساب الهدف (أدمن أو سوبر أدمين نشط)")}</Label>
              <Select value={transferTarget} onValueChange={setTransferTarget}>
                <SelectTrigger>
                  <SelectValue placeholder={t("اختر الحساب")} />
                </SelectTrigger>
                <SelectContent>
                  {(admins ?? []).map((a: { id: number; fullName: string; username: string; role: string }) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.fullName} ({a.username})
                    </SelectItem>
                  ))}
                  {others
                    .filter((s: SuperAdminView) => s.status === "ACTIVE")
                    .map((s: SuperAdminView) => (
                      <SelectItem key={`s-${s.id}`} value={String(s.id)}>
                        {s.fullName} ({s.username}) — {t("سوبر أدمين")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{t("سبب النقل (وثائقي)")}</Label>
              <Textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder={t("مثال: نقل الملكية إلى الشركة المشغلة للمنصة بعد اتفاق رسمي…")}
                className="min-h-20"
              />
            </div>
            <div>
              <Label>{t("تأكيد نهائي: اكتب اسم حسابك")} ({user?.username})</Label>
              <Input
                value={transferConfirm}
                onChange={(e) => setTransferConfirm(e.target.value)}
                placeholder={user?.username}
                dir="ltr"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)} disabled={pending}>
              {t("إلغاء")}
            </Button>
            <Button
              disabled={
                pending ||
                !transferTarget ||
                transferReason.trim().length < 10 ||
                transferConfirm !== user?.username
              }
              onClick={() =>
                handleAction(
                  () =>
                    transfer.mutateAsync({
                      targetUserId: Number(transferTarget),
                      confirmUsername: transferConfirm,
                      reason: transferReason.trim(),
                    }),
                  () => {
                    setTransferOpen(false);
                    // المالك السابق: تحديث هوية الجلسة فوراً — صار سوبر أدمين غير مالك
                    useUIStore.getState().updateUser({ isOwner: false });
                  },
                  t("نُقلت الملكية — أُخطر الطرفان ووثق الحدث في السجل")
                )
              }
            >
              {pending && <Loader2 className="me-1 size-4 animate-spin" />}
              {t("تنفيذ النقل النهائي")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════ حوار سوبر أدمين جديد / ترقية أدمن ═════════════════════ */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("سوبر أدمين جديد")}</DialogTitle>
            <DialogDescription>
              {t("السبب إلزامي ويوثق في سجل الأحداث، ويُبلَّغ المعني بمنحه الصلاحية وميثاقها العادل")}
            </DialogDescription>
          </DialogHeader>
          <Tabs value={addMode} onValueChange={(v) => setAddMode(v as "new" | "promote")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">{t("حساب جديد")}</TabsTrigger>
              <TabsTrigger value="promote">{t("ترقية أدمن")}</TabsTrigger>
            </TabsList>
            <TabsContent value="new" className="space-y-3 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("اسم المستخدم")}</Label>
                  <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} dir="ltr" />
                </div>
                <div>
                  <Label>{t("كلمة المرور")}</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
              <div>
                <Label>{t("الاسم الكامل")}</Label>
                <Input value={newFullName} onChange={(e) => setNewFullName(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("الهاتف (اختياري)")}</Label>
                  <Input value={newPhone} onChange={(e) => setNewPhone(e.target.value)} dir="ltr" />
                </div>
                <div>
                  <Label>{t("البريد (اختياري)")}</Label>
                  <Input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} dir="ltr" />
                </div>
              </div>
            </TabsContent>
            <TabsContent value="promote" className="space-y-3 pt-2">
              <div>
                <Label>{t("اختر أدمن نشطاً")}</Label>
                <Select value={promoteId} onValueChange={setPromoteId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("اختر الأدمن")} />
                  </SelectTrigger>
                  <SelectContent>
                    {(admins ?? []).map((a: { id: number; fullName: string; username: string }) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.fullName} ({a.username})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {t("لا تعاونيات ولا أعضاء — الترقية متاحة لحسابات الأدمن النشطة حصراً")}
                </p>
              </div>
            </TabsContent>
            <div className="pt-1">
              <Label>{t("سبب منح الصلاحية (إلزامي)")}</Label>
              <Textarea
                value={addReason}
                onChange={(e) => setAddReason(e.target.value)}
                className="min-h-16"
              />
            </div>
          </Tabs>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={pending}>
              {t("إلغاء")}
            </Button>
            <Button
              disabled={
                pending ||
                addReason.trim().length < 10 ||
                (addMode === "new"
                  ? !/^[a-zA-Z0-9_.-]{3,32}$/.test(newUsername) ||
                    newFullName.trim().length < 3 ||
                    newPassword.length < 10
                  : !promoteId)
              }
              onClick={() =>
                handleAction(
                  () =>
                    ownerAction.mutateAsync({
                      step: addMode === "new" ? "create" : "promote",
                      body:
                        addMode === "new"
                          ? {
                              mode: "new",
                              username: newUsername.trim(),
                              fullName: newFullName.trim(),
                              password: newPassword,
                              phone: newPhone.trim() || undefined,
                              email: newEmail.trim() || undefined,
                              reason: addReason.trim(),
                            }
                          : {
                              mode: "promote",
                              targetUserId: Number(promoteId),
                              reason: addReason.trim(),
                            },
                    }),
                  () => setAddOpen(false),
                  addMode === "new"
                    ? t("أُنشئ الحساب سوبر أدمين وأُبلغ برسالة رسمية")
                    : t("رُقّي الأدمن إلى سوبر أدمين وأُبلغ بذلك")
                )
              }
            >
              {pending && <Loader2 className="me-1 size-4 animate-spin" />}
              {addMode === "new" ? t("إنشاء السوبر أدمين") : t("تنفيذ الترقية")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════ حوار إشعار نية التوقيف ═══════════════════════════════ */}
      <Dialog open={!!noticeTarget} onOpenChange={(v) => !v && setNoticeTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("إشعار نية توقيف")}: {noticeTarget?.fullName}
            </DialogTitle>
            <DialogDescription>
              {t("يُبلَّغ المعني فوراً بالسبب والأجل ويبقى حسابه نشطاً خلاله — لا توقيف بلا إشعار مسبق")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("سبب التوقيف (موثق — يقرأه المعني)")}</Label>
              <Textarea
                value={noticeReason}
                onChange={(e) => setNoticeReason(e.target.value)}
                className="min-h-20"
                placeholder={t("مثال: خرق موثق لقواعد الاستخدام بتاريخ… رغم تنبيهين سابقين…")}
              />
            </div>
            <div>
              <Label>{t("أجل التسوية قبل التنفيذ (ساعة)")}</Label>
              <Select value={graceHours} onValueChange={setGraceHours}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["24", "48", "72", "168", "336", "720"].map((h) => (
                    <SelectItem key={h} value={h}>
                      {Number(h) >= 24
                        ? t("{n} ساعة", { n: h })
                        : h}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {t("الحد الأدنى 24 ساعة (يوم كامل) — أجل عادل للرد والتسوية")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoticeTarget(null)} disabled={pending}>
              {t("إلغاء")}
            </Button>
            <Button
              disabled={pending || noticeReason.trim().length < 10}
              onClick={() =>
                noticeTarget &&
                handleAction(
                  () =>
                    ownerAction.mutateAsync({
                      step: "suspend-notice",
                      targetId: noticeTarget.id,
                      body: {
                        reason: noticeReason.trim(),
                        graceHours: Number(graceHours),
                      },
                    }),
                  () => setNoticeTarget(null),
                  t("أُصدر الإشعار وأُبلغ المعني — بدأ أجل التسوية")
                )
              }
            >
              {pending && <Loader2 className="me-1 size-4 animate-spin" />}
              {t("إصدار الإشعار")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════ حوار التوقيف الفعلي ═══════════════════════════════════ */}
      <Dialog open={!!suspendTarget} onOpenChange={(v) => !v && setSuspendTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("تنفيذ توقيف")}: {suspendTarget?.fullName}
            </DialogTitle>
            <DialogDescription>
              {t("انقضى أجل الإشعار — السبب النهائي يوثق ويُخطر به المعني، ويبقى رفع التوقيف ممكناً")}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>{t("سبب التوقيف النهائي (موثق)")}</Label>
            <Textarea
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
              className="min-h-20"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSuspendTarget(null)} disabled={pending}>
              {t("إلغاء")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending || suspendReason.trim().length < 10}
              onClick={() =>
                suspendTarget &&
                handleAction(
                  () =>
                    ownerAction.mutateAsync({
                      step: "suspend",
                      targetId: suspendTarget.id,
                      body: { reason: suspendReason.trim() },
                    }),
                  () => setSuspendTarget(null),
                  t("وُقف الحساب وأُبلغ صاحبه بالسبب — الإزالة النهائية باتت ممكنة")
                )
              }
            >
              {pending && <Loader2 className="me-1 size-4 animate-spin" />}
              {t("تنفيذ التوقيف")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════ حوار رفع التوقيف/إلغاء الإشعار ═══════════════════════ */}
      <Dialog open={!!reinstateTarget} onOpenChange={(v) => !v && setReinstateTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {reinstateTarget?.status === "SUSPENDED"
                ? t("رفع التوقيف عن") + " " + reinstateTarget?.fullName
                : t("إلغاء إشعار التوقيف") + " — " + reinstateTarget?.fullName}
            </DialogTitle>
            <DialogDescription>
              {t("العدالة قابلة للرجوع: يوثق القرار ويعود الحساب نشطاً بكامل صلاحياته")}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>{t("ملاحظة القرار (موثقة)")}</Label>
            <Textarea
              value={reinstateNote}
              onChange={(e) => setReinstateNote(e.target.value)}
              className="min-h-20"
              placeholder={t("مثال: تسوية الالتزامات المالية ورفع المخالفة بعد المراجعة…")}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReinstateTarget(null)} disabled={pending}>
              {t("إلغاء")}
            </Button>
            <Button
              disabled={pending || reinstateNote.trim().length < 10}
              onClick={() =>
                reinstateTarget &&
                handleAction(
                  () =>
                    ownerAction.mutateAsync({
                      step: "reinstate",
                      targetId: reinstateTarget.id,
                      body: { note: reinstateNote.trim() },
                    }),
                  () => setReinstateTarget(null),
                  t("عاد الحساب نشطاً — وُثق القرار وأُبلغ المعني")
                )
              }
            >
              {pending && <Loader2 className="me-1 size-4 animate-spin" />}
              {t("تأكيد إعادة التنشيط")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═════════ حوار الإزالة النهائية ════════════════════════════════ */}
      <Dialog open={!!removeTarget} onOpenChange={(v) => !v && setRemoveTarget(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {t("إزالة نهائية")}: {removeTarget?.fullName} ({removeTarget?.username})
            </DialogTitle>
            <DialogDescription>
              {t("لا تتم إلا بعد توقيف موثق — تُحذف بيانات الحساب ويبقى سجل الأحداث شاهداً كاملاً على المسار")}
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label>
              {t("تأكيد: اكتب اسم المستخدم")} ({removeTarget?.username})
            </Label>
            <Input
              value={removeConfirm}
              onChange={(e) => setRemoveConfirm(e.target.value)}
              placeholder={removeTarget?.username}
              dir="ltr"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={pending}>
              {t("إلغاء")}
            </Button>
            <Button
              variant="destructive"
              disabled={pending || removeConfirm !== removeTarget?.username}
              onClick={() =>
                removeTarget &&
                handleAction(
                  () =>
                    ownerAction.mutateAsync({
                      step: "remove",
                      targetId: removeTarget.id,
                    }),
                  () => setRemoveTarget(null),
                  t("أُزيل الحساب نهائياً — بقي السجل التدقيقي شاهداً")
                )
              }
            >
              {pending && <Loader2 className="me-1 size-4 animate-spin" />}
              {t("إزالة نهائية")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** مؤشر مصغر للإحصاءات */
function StatMini({
  icon: Icon,
  label,
  value,
  danger,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div
      className={
        "rounded-2xl border p-4 " +
        (danger ? "border-destructive/30 bg-destructive/5" : "border-border bg-card")
      }
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className={"size-4 " + (danger ? "text-destructive" : "text-terra")} />
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="mt-1 font-display text-xl font-black text-foreground">{value}</p>
    </div>
  );
}

/** رد المعني على إشعار التوقيف (حق الدفاع) */
function RespondNotice({ userId }: { userId: number }) {
  const [text, setText] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const { toast } = useToast();
  const respond = useRespondToNotice();
  return (
    <div className="mt-2">
      {sent ? (
        <p className="text-xs font-bold text-saffron-ink">{t("سُلّم ردكم — يوثق للمالك قبل أي قرار")}</p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("اكتب ردك المكتوب — حقك في الدفاع قبل انقضاء الأجل")}
            className="min-h-16 text-xs"
          />
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 border-saffron/50 text-saffron-ink"
            disabled={text.trim().length < 5 || respond.isPending}
            onClick={async () => {
              try {
                await respond.mutateAsync({ userId, response: text.trim() });
                setSent(true);
                toast({ title: t("سُلّم ردكم ووثق للمالك") });
              } catch (e) {
                toast({ title: tError(e), variant: "destructive" });
              }
            }}
          >
            <UserPlus className="me-1 size-3.5" />
            {t("تسليم الرد")}
          </Button>
        </div>
      )}
    </div>
  );
}
