// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إزالة حساب سوبر أدمين (حوكمة 1.3.0) — المالك حصراً
// لا إزالة إلا لتوقيف منتهٍ: إشعار ← توقيف ← إزالة (التسلسل النظامي العادل)
// يُسجَّل snapshot الحساب (بلا كلمة مرور) في سجل التدقيق قبل الحذف النهائي
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getAuthUser(req);
  if (!owner) return fail("يلزم تسجيل الدخول للقيام بهذه العملية", 401);
  if (!owner.isPlatformOwner) return denied("هذه العملية حصرية لمالك المنصة");

  const target = await db.user.findUnique({ where: { id: Number(id) } });
  if (!target) return fail("الحساب غير موجود", 404);
  if (target.role !== "SUPER_ADMIN") return fail("هذا الإجراء يخص حسابات سوبر أدمين حصراً");
  if (target.isPlatformOwner) {
    return fail("لا يمكن حذف حساب مالك المنصة — انقل الملكية أولاً إن أردت المغادرة", 400);
  }
  if (target.status !== "SUSPENDED") {
    return fail(
      "لا يمكن حذف الحساب مباشرة — التسلسل النظامي العادل: إشعار مسبق ← توقيف ← إزالة. وجّه إشعاراً أولاً ثم وقّف الحساب بعد انقضاء أجله",
      409
    );
  }

  // ─── snapshot الحساب قبل الحذف (بدون كلمة المرور إطلاقاً) ───────────────
  const snapshot = {
    id: target.id,
    username: target.username,
    fullName: target.fullName,
    phone: target.phone,
    email: target.email,
    role: target.role,
    status: target.status,
    noticedAt: target.noticedAt,
    noticeDeadline: target.noticeDeadline,
    suspendedAt: target.suspendedAt,
    suspensionReasons: target.suspensionReasons,
    createdAt: target.createdAt,
  };

  // ─── سجل التدقيق أولاً: حدث جسيم يوثَّق قبل التنفيذ ────────────────────
  await audit(req, {
    actorId: owner.id,
    actorName: owner.fullName,
    actorRole: owner.role,
    action: "SUPER_ADMIN_REMOVED",
    targetType: "USER",
    targetId: target.id,
    targetLabel: target.username,
    severity: "CRITICAL",
    details: { snapshot },
  });

  // الإشعارات تُحذف تلقائياً مع الحساب (onDelete: Cascade)
  await db.user.delete({ where: { id: target.id } });

  return ok({ deleted: true, username: target.username });
}
