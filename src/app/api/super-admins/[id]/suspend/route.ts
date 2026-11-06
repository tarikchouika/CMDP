// ═══════════════════════════════════════════════════════════════════════════
// CMDP — التوقيف الفعلي (خطوة 2 من المسار العادل): POST /api/super-admins/[id]/suspend
// لا يُنفَّذ إلا بعد انقضاء أجل الإشعار المسبق الموثق؛ يوثق السبب النهائي
// (ومعه رد المعني إن وجد) ويُخطر صاحبه — المالك حصراً.
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
  if (target.status === "SUSPENDED") return fail("الحساب موقوف فعلاً");

  const notice = parseNotice(target.suspensionNotice);
  if (!notice) {
    return fail("لا توقيف بلا إشعار مسبق موثق — أصدر إشعار نية التوقيف أولاً (عدالة الإجراء)");
  }
  if (new Date(notice.effectiveAt).getTime() > Date.now()) {
    return fail(
      `أجل الإشعار لم ينقض بعد (${new Date(notice.effectiveAt).toLocaleString("ar-MA")}) — احترم الأجل العادل الممنوح للمعني للرد والتسوية`
    );
  }

  const b = await readJson(req);
  const finalReason = String(b.reason ?? notice.reason).trim();
  if (finalReason.length < 10) return fail("سبب التوقيف النهائي إلزامي (10 أحرف على الأقل)");

  const now = new Date();
  await db.user.update({
    where: { id: target.id },
    data: {
      status: "SUSPENDED",
      suspensionReason: finalReason,
      suspendedAt: now,
      suspensionNotice: null,
    },
  });

  await logAudit({
    req,
    actor,
    action: "super_admin.suspend",
    entityType: "USER",
    entityId: target.id,
    summary: `توقيف سوبر أدمين: ${target.fullName} (${target.username})`,
    details: {
      reason: finalReason,
      noticeReason: notice.reason,
      noticeIssuedAt: notice.issuedAt,
      noticeResponse: notice.response ?? null,
      suspendedAt: now.toISOString(),
    },
    severity: "CRITICAL",
  });
  await notifyUser({
    userId: target.id,
    type: "SUSPENDED",
    title: "تم توقيف حسابك",
    body: `وُقف حسابك في ${now.toLocaleString("ar-MA")}. السبب الموثق: «${finalReason}». للاستفسار أو طلب رفع التوقيف تواصلوا مع مالك المنصة.`,
    meta: { reason: finalReason, suspendedAt: now.toISOString() },
  });

  return ok({ suspended: true });
}
