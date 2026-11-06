// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الإزالة النهائية لحساب سوبر أدمين: DELETE /api/super-admins/[id]
// المالك حصراً؛ لا تتم إلا على حساب موقوف موثق (الإشعار ← التوقيف ← الإزالة)
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { denied } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { loadTarget, ownerOnly, toView } from "@/lib/super-admins";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actorOrRes = await ownerOnly(req);
  if (actorOrRes instanceof Response) return actorOrRes;
  const actor = actorOrRes;

  const targetId = Number(id);
  const guard = await loadTarget(targetId);
  if ("error" in guard) return guard.error;
  const target = guard.target;
  if (target.id === actor.id) return denied("لا يمكن تنفيذ الإجراء على حسابك الشخصي");
  if (target.status !== "SUSPENDED") {
    return denied("الإزالة النهائية لا تتم إلا بعد التوقيف الموثق — دفعة واحدة بلا مسار عادل ممنوعة");
  }

  // معاملة ذرية: تُحذف إشعارات الحساب معه — ويبقى السجل التدقيقي شاهداً
  await db.$transaction([
    db.notification.deleteMany({ where: { userId: target.id } }),
    db.user.delete({ where: { id: target.id } }),
  ]);

  await logAudit({
    req,
    actor,
    action: "super_admin.remove",
    entityType: "USER",
    entityId: target.id,
    summary: `إزالة حساب سوبر أدمين موقوف: ${target.fullName} (${target.username})`,
    details: {
      suspensionReason: target.suspensionReason,
      suspendedAt: target.suspendedAt?.toISOString() ?? null,
    },
    severity: "CRITICAL",
  });

  return ok({ removed: true, removedUser: { id: target.id, username: target.username, fullName: target.fullName } });
}

// تمثيل واحد (GET /api/super-admins/[id]) — يرثه مسار التفاصيل إن لزم
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actorOrRes = await ownerOnly(req);
  if (actorOrRes instanceof Response) return actorOrRes;
  const targetId = Number(id);
  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target || target.role !== "SUPER_ADMIN") return denied("لا يوجد سوبر أدمين بهذا المعرف");
  return ok({ user: toView(target) });
}
