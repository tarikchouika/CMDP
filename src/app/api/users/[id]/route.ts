// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تحديث حساب مستخدم: مصادقة / رفض / إيقاف مسبب / تغيير الدور / تصفير كلمة المرور
// (الإصدار 1.3.2): حماية المالك الكاملة، منع تجاوز المسار العادل للسوبر أدمين،
// إلزام سبب التوقيف مع إشعار المعني وتوثيق كل إجراء في سجل الأحداث.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/seed-run";
import { assignableRoles, canManageUser, isPlatformOwner, manageDenialReason } from "@/lib/permissions";
import { sanitizeFiles, sanitizePhoto } from "@/lib/attachments";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import type { AccountType, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

async function targetGuard(
  req: Request,
  id: number
): Promise<{ target: Awaited<ReturnType<typeof db.user.findUnique>> } | { response: Response }> {
  const auth = await requirePermission(req, "approve:users");
  if ("response" in auth) return auth;
  const { user: actor } = auth;

  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { response: fail("الحساب غير موجود", 404) };

  // حساب المالك محمي بالكامل — لا يُدار إلا عبر نقل الملكية
  if (isPlatformOwner(target)) {
    return { response: denied("حساب مالك المنصة محمي بالكامل — لا يُدار ولا يُوقف ولا يُحذف") };
  }
  // السوبر أدمين: يديرهم المالك حصراً عبر مسارهم العادل في لوحة المالك —
  // لا إيقاف مباشر ولا تغيير دور من الوحدة العامة (منع تجاوز الإشعار المسبق)
  if (target.role === "SUPER_ADMIN" && actor.role === "SUPER_ADMIN") {
    return {
      response: denied(
        "حسابات السوبر أدمين تُدار من لوحة المالك وفق المسار العادل (إشعار ← توقيف ← إزالة) — لا مباشرة من هنا"
      ),
    };
  }
  if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
    return { response: denied("حساب سوبر أدمين لا يمكن تعديله من هذه الوحدة") };
  }
  if (target.role === "ADMIN" && actor.role !== "SUPER_ADMIN") {
    return { response: denied("حسابات الأدمن يديرها مالك المنصة حصراً") };
  }
  // الكوأدمن: داخل تعاونيته فقط
  if (actor.role === "COADMIN" && target.cooperativeId !== actor.cooperativeId) {
    return { response: denied("هذا الحساب خارج نطاق تعاونيتك") };
  }
  // تراتبية الحماية (إصلاح 1.3.0): لا يمكن للمسير إيقاف/تعديل حساب الرئيس
  // أو نظرائه المسيرين أو أي حساب أعلى منه — قاعدة صارمة على الخادم
  if (actor.id === target.id) {
    return { response: denied("لا يمكن تنفيذ إجراء على حسابك الشخصي") };
  }
  if (!canManageUser(actor, target)) {
    return { response: denied(manageDenialReason(actor, target) || "تراتبية الصلاحيات تمنع إدارة هذا الحساب") };
  }
  return { target };
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await targetGuard(req, Number(id));
  if ("response" in guard) return guard.response;
  const target = guard.target;
  if (!target) return fail("الحساب غير موجود", 404);

  const auth = await requirePermission(req, "approve:users");
  if ("response" in auth) return auth.response;
  const { user: actor } = auth;

  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  // توثيق التغييرات قبل/بعد لسجل الأحداث
  const before = { status: target.status, role: target.role, accountType: target.accountType };

  // ─── تغيير الحالة (التوقيف يستوجب سبباً موثقاً وإشعاراً للمعني) ──────────
  if (b.status !== undefined) {
    const status = String(b.status);
    if (!["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"].includes(status)) {
      return fail("حالة غير صحيحة");
    }
    if (status === "SUSPENDED" && target.status !== "SUSPENDED") {
      const reason = String(b.suspensionReason ?? "").trim();
      if (reason.length < 10) {
        return fail("التوقيف يستوجب سبباً موثقاً (10 أحرف على الأقل) — يُبلَّغ للمعني ويوثق في سجل الأحداث");
      }
      data.suspensionReason = reason;
      data.suspendedAt = new Date();
    }
    if (status === "ACTIVE" && target.status === "SUSPENDED") {
      // إعادة التنشيط: تنظيف آثار التوقيف
      data.suspensionReason = null;
      data.suspendedAt = null;
      data.suspensionNotice = null;
    }
    data.status = status;
  }

  // ─── تغيير الدور / نوع الحساب / التعاونية ────────────────────────────────
  const role = (b.role ?? target.role) as Role;
  const accountType = (b.accountType ?? target.accountType) as AccountType | null;
  if (b.role !== undefined || b.accountType !== undefined) {
    if (target.role === "SUPER_ADMIN") return denied("لا يمكن تغيير دور سوبر أدمين من هذه الوحدة");
    const allowed = assignableRoles(actor.role, actor.accountType).some(
      (r) => r.role === role && r.accountType === accountType
    );
    if (!allowed) return denied("لا يمكنك تعيين هذا الدور — تحقق من نطاق صلاحياتك");
    data.role = role;
    data.accountType = accountType ?? null;
  }
  if (b.cooperativeId !== undefined) {
    const coopId = b.cooperativeId == null ? null : Number(b.cooperativeId);
    if (coopId != null && actor.role === "COADMIN" && coopId !== actor.cooperativeId) {
      return denied("خارج نطاق تعاونيتك");
    }
    data.cooperativeId = coopId;
  }

  // ─── معلومات الاتصال ─────────────────────────────────────────────────────
  for (const k of ["fullName", "phone", "email", "cin"] as const) {
    if (b[k] !== undefined) data[k] = b[k] == null || b[k] === "" ? null : String(b[k]);
  }

  // ── مرفقات الهوية (صورة المستخدم / وثائق الهوية) — تحديث اختياري ────────
  if (b.photo !== undefined) data.photo = sanitizePhoto(b.photo);
  if (b.idDocuments !== undefined)
    data.idDocuments = JSON.stringify(sanitizeFiles(b.idDocuments));

  // ─── تصفير كلمة المرور ───────────────────────────────────────────────────
  if (b.password) {
    const pwd = String(b.password);
    if (pwd.length < 6) return fail("كلمة المرور: 6 أحرف على الأقل");
    data.passwordHash = hashPassword(pwd);
  }

  if (Object.keys(data).length === 0) return fail("لا توجد حقول للتحديث");

  const row = await db.user.update({
    where: { id: Number(id) },
    data: data as never,
    select: {
      id: true,
      username: true,
      fullName: true,
      phone: true,
      email: true,
      cin: true,
      photo: true,
      idDocuments: true,
      role: true,
      accountType: true,
      cooperativeId: true,
      status: true,
      isOwner: true,
      createdAt: true,
      cooperative: { select: { id: true, name: true } },
    },
  });

  // ── التوثيق التدقيقي الموحد لكل تعديل ─────────────────────────────────────
  const statusChanged = data.status !== undefined && data.status !== before.status;
  const roleChanged = (data.role !== undefined && data.role !== before.role) ||
    (data.accountType !== undefined && data.accountType !== before.accountType);
  const passwordReset = data.passwordHash !== undefined;

  if (statusChanged) {
    const isSuspension = data.status === "SUSPENDED";
    await logAudit({
      req,
      actor,
      action: isSuspension ? "user.suspend" : data.status === "ACTIVE" ? "user.activate" : `user.status_${String(data.status).toLowerCase()}`,
      entityType: "USER",
      entityId: target.id,
      summary: isSuspension
        ? `توقيف حساب ${target.fullName} (${target.username})`
        : `تحويل حالة ${target.fullName} (${target.username}) من ${before.status} إلى ${String(data.status)}`,
      details: isSuspension
        ? { reason: data.suspensionReason, by: actor.fullName }
        : { before: before.status, after: data.status },
      severity: isSuspension ? "WARNING" : "INFO",
    });
    if (isSuspension) {
      await notifyUser({
        userId: target.id,
        type: "SUSPENDED",
        title: "تم توقيف حسابك",
        body: `وُقف حسابك من طرف ${actor.fullName}. السبب الموثق: «${String(data.suspensionReason)}». للاستفسار تواصلوا مع إدارة المنصة.`,
        meta: { reason: data.suspensionReason, by: actor.fullName },
      });
    } else if (data.status === "ACTIVE" && before.status !== "ACTIVE") {
      await notifyUser({
        userId: target.id,
        type: "REINSTATED",
        title: "أُعيد تنشيط حسابك",
        body: `أعادت إدارة المنصة (${actor.fullName}) تنشيط حسابك. أهلاً بعودتك.`,
      });
    }
  }
  if (roleChanged) {
    await logAudit({
      req,
      actor,
      action: "user.role_change",
      entityType: "USER",
      entityId: target.id,
      summary: `تغيير دور ${target.fullName} (${target.username}) من ${before.role} إلى ${String(data.role)}`,
      details: { before, after: { role: data.role, accountType: data.accountType } },
      severity: "WARNING",
    });
  }
  if (passwordReset) {
    await logAudit({
      req,
      actor,
      action: "user.password_reset",
      entityType: "USER",
      entityId: target.id,
      summary: `تصفير كلمة مرور ${target.fullName} (${target.username})`,
      details: { by: actor.fullName },
      severity: "WARNING",
    });
  }
  if (!statusChanged && !roleChanged && !passwordReset) {
    await logAudit({
      req,
      actor,
      action: "user.update",
      entityType: "USER",
      entityId: target.id,
      summary: `تحديث بيانات حساب ${target.fullName} (${target.username})`,
      details: { fields: Object.keys(data).filter((k) => k !== "passwordHash") },
    });
  }

  return ok(row);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const guard = await targetGuard(req, Number(id));
  if ("response" in guard) return guard.response;
  const target = guard.target;
  if (!target) return fail("الحساب غير موجود", 404);

  const auth = await requirePermission(req, "approve:users");
  if ("response" in auth) return auth.response;
  const { user: actor } = auth;
  if (actor.role === "COADMIN") return denied("الحذف النهائي من اختصاص إدارة المنصة — استعمل الإيقاف");
  if (actor.id === target.id) return denied("لا يمكنك حذف حسابك الشخصي");
  if (target.role === "SUPER_ADMIN") {
    return denied(
      "إزالة سوبر أدمين تتم حصراً من لوحة المالك بعد المسار العادل (إشعار ← توقيف ← إزالة)"
    );
  }
  if (isPlatformOwner(target)) return denied("لا يمكن حذف حساب المالك");

  // معاملة ذرية: الإشعارات تُحذف مع صاحبها — والسجل التدقيقي يبقى شاهداً
  await db.$transaction([
    db.notification.deleteMany({ where: { userId: target.id } }),
    db.user.delete({ where: { id: Number(id) } }),
  ]);

  await logAudit({
    req,
    actor,
    action: "user.delete",
    entityType: "USER",
    entityId: target.id,
    summary: `حذف نهائي لحساب ${target.fullName} (${target.username})`,
    details: { role: target.role, status: target.status, by: actor.fullName },
    severity: "WARNING",
  });

  return ok({ deleted: true });
}
