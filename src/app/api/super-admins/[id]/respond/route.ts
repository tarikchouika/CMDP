// ═══════════════════════════════════════════════════════════════════════════
// CMDP — حق الدفاع: رد المعني على إشعار التوقيف
// POST /api/super-admins/[id]/respond — المعني نفسه حصراً؛ يوثق رده للمالك
// في ملف الإشعار وسجل الأحداث (يظهر له في لوحة المالك قبل التوقيف).
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { logAudit, logDenied } from "@/lib/audit";
import { parseNotice } from "@/lib/super-admins";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actor = await getAuthUser(req);
  if (!actor) {
    return Response.json(
      { error: "يلزم تسجيل الدخول للقيام بهذه العملية" },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const targetId = Number(id);
  if (actor.id !== targetId) {
    await logDenied(req, actor, "super_admins.respond", "USER", targetId, "محاولة الرد على إشعار باسم غيره");
    return denied("الرد على الإشعار حق المعني به حصراً");
  }

  const self = await db.user.findUnique({ where: { id: targetId } });
  if (!self) return fail("الحساب غير موجود", 404);
  const notice = parseNotice(self.suspensionNotice);
  if (!notice) return fail("لا يوجد إشعار توقيف نافذ بحق حسابك");

  const b = await readJson(req);
  const response = String(b.response ?? "").trim();
  if (response.length < 5) return fail("اكتب ردك (5 أحرف على الأقل)");

  const updatedNotice = { ...notice, response, respondedAt: new Date().toISOString() };
  await db.user.update({
    where: { id: targetId },
    data: { suspensionNotice: JSON.stringify(updatedNotice) },
  });

  await logAudit({
    req,
    actor,
    action: "super_admin.notice_response",
    entityType: "USER",
    entityId: targetId,
    summary: `${self.fullName} قدّم رداً على إشعار التوقيف`,
    details: { response, originalReason: notice.reason },
    severity: "WARNING",
  });

  return ok({ responded: true });
}
