// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إشعار نية التوقيف (خطوة 1 من المسار العادل): POST /api/super-admins/[id]/suspend-notice
// سبب موثق إلزامي + أجل عادل للرد والتسوية (24-720 ساعة)؛ يُبلَّغ المعني
// فوراً عبر الإشعارات ويبقى حسابه نشطاً خلال الأجل — المالك حصراً.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
import { loadTarget, ownerOnly } from "@/lib/super-admins";

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
  if (target.status === "SUSPENDED") return fail("الحساب موقوف فعلاً — يمكن رفع التوقيف أو الإزالة");

  const b = await readJson(req);
  const reason = String(b.reason ?? "").trim();
  const graceHours = Math.min(Math.max(Number(b.graceHours ?? 48), 24), 720);
  if (reason.length < 10) {
    return fail("سبب التوقيف إلزامي (10 أحرف على الأقل) — يُبلَّغ للمعني ويوثق في سجل الأحداث");
  }

  const now = new Date();
  const effectiveAt = new Date(now.getTime() + graceHours * 3600 * 1000);
  const notice = {
    reason,
    effectiveAt: effectiveAt.toISOString(),
    issuedAt: now.toISOString(),
    issuedBy: actor.fullName,
  };

  await db.user.update({
    where: { id: target.id },
    data: { suspensionNotice: JSON.stringify(notice) },
  });

  await logAudit({
    req,
    actor,
    action: "super_admin.suspension_notice",
    entityType: "USER",
    entityId: target.id,
    summary: `إشعار نية توقيف سوبر أدمين: ${target.fullName} (${target.username})`,
    details: { reason, effectiveAt: notice.effectiveAt, graceHours },
    severity: "WARNING",
  });
  await notifyUser({
    userId: target.id,
    type: "SUSPENSION_NOTICE",
    title: "إشعار بنية توقيف حسابك",
    body: `يعلمك مالك المنصة بنيته توقيف حسابك اعتباراً من ${effectiveAt.toLocaleString("ar-MA")}. السبب الموثق: «${reason}». لك حق تقديم رد مكتوب من هذه الإشعارات قبل الأجل، ويبقى حسابك نشطاً خلاله.`,
    meta: { reason, effectiveAt: notice.effectiveAt },
  });

  return ok({ noticed: true, effectiveAt: notice.effectiveAt, graceHours });
}
