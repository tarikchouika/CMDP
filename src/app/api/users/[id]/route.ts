// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تحديث حساب مستخدم: مصادقة / رفض / إيقاف / تغيير الدور / تصفير كلمة المرور
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/seed-run";
import { assignableRoles, canManageUser, manageDenialReason } from "@/lib/permissions";
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

  // سوبر أدمين حسابات الإدارة لا يديرها إلا المالك
  if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
    return { response: denied("حساب مالك المنصة لا يمكن تعديله") };
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

  // ─── تغيير الحالة ────────────────────────────────────────────────────────
  if (b.status !== undefined) {
    const status = String(b.status);
    if (!["PENDING", "ACTIVE", "SUSPENDED", "REJECTED"].includes(status)) {
      return fail("حالة غير صحيحة");
    }
    data.status = status;
    if (status === "REJECTED" || status === "SUSPENDED") data.cooperativeId = target.cooperativeId;
  }

  // ─── تغيير الدور / نوع الحساب / التعاونية ────────────────────────────────
  const role = (b.role ?? target.role) as Role;
  const accountType = (b.accountType ?? target.accountType) as AccountType | null;
  if (b.role !== undefined || b.accountType !== undefined) {
    if (target.role === "SUPER_ADMIN") return denied("لا يمكن تغيير دور مالك المنصة");
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
      role: true,
      accountType: true,
      cooperativeId: true,
      status: true,
      createdAt: true,
      cooperative: { select: { id: true, name: true } },
    },
  });
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
  if (target.role === "SUPER_ADMIN") return denied("لا يمكن حذف حساب المالك");

  await db.user.delete({ where: { id: Number(id) } });
  return ok({ deleted: true });
}
