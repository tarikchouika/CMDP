// ═══════════════════════════════════════════════════════════════════════════
// CMDP — رفع التوقيف / إلغاء الإشعار (خطوة العدالة القابلة للرجوع):
// POST /api/super-admins/[id]/reinstate — المالك حصراً، بتوثيق وإشعار.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { loadTarget, ownerOnly, parseNotice } from "@/lib/super-admins";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actorOrRes = await ownerOnly(req);
  if (actorOrRes instanceof Response) return actorOrRes;
  const actor = actorOrRes;

  const targetId = Number(id);
  const guard = await loadTarget(targetId);
  if ("error" in guard) return guard.error;
  const target = guard.target;
  if (target.id === actor.id) return denied("لا يمكن تنفيذ الإجراء على حسابك الشخصي");

  const b = await readJson(req);
  const note = String(b.note ?? "").trim();
  if (note.length < 10) return fail("اذكر سبب رفع التوقيف/إلغاء الإشعار (10 أحرف على الأقل)");

  const notice = parseNotice(target.suspensionNotice);
  const wasSuspended = target.status === "SUSPENDED";
  if (!wasSuspended && !notice) return fail("لا يوجد توقيف ولا إشعار نافذ بحق هذا الحساب");

  await db.user.update({
    where: { id: target.id },
    data: {
      status: "ACTIVE",
      suspensionNotice: null,
      suspensionReason: null,
      suspendedAt: null,
    },
  });

  await logAudit({
    req,
    actor,
    action: "super_admin.reinstate",
    entityType: "USER",
    entityId: target.id,
    summary: notice && !wasSuspended
      ? `إلغاء إشعار التوقيف: ${target.fullName} (${target.username})`
      : `رفع التوقيف وإعادة التنشيط: ${target.fullName} (${target.username})`,
    details: { note, wasSuspended, originalNoticeReason: notice?.reason ?? null },
    severity: "WARNING",
  });
  await notifyUser({
    userId: target.id,
    type: "REINSTATED",
    title: notice && !wasSuspended ? "أُلغي إشعار التوقيف" : "رُفع التوقيف عن حسابك",
    body: notice && !wasSuspended
      ? `ألغى مالك المنصة إشعار نية التوقيف بحق حسابك. الملاحظة الموثقة: «${note}». يبقى حسابك نشطاً بكامل صلاحياته.`
      : `أعاد مالك المنصة تنشيط حسابك. الملاحظة الموثقة: «${note}». أهلاً بعودتك.`,
    meta: { note },
  });

  return ok({ reinstated: true });
}
