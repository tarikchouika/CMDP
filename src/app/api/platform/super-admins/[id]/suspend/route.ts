// ═══════════════════════════════════════════════════════════════════════════
// CMDP — توقيف سوبر أدمين بعد انقضاء أجل الإشعار (حوكمة 1.3.0) — المالك حصراً
// لا توقيف إلا بعد إشعار مسبق منتهي الأجل — وإلا فالرفض 422 مع الساعات المتبقية
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getAuthUser(req);
  if (!owner) return fail("يلزم تسجيل الدخول للقيام بهذه العملية", 401);
  if (!owner.isPlatformOwner) return denied("هذه العملية حصرية لمالك المنصة");

  const target = await db.user.findUnique({ where: { id: Number(id) } });
  if (!target) return fail("الحساب غير موجود", 404);
  if (target.role !== "SUPER_ADMIN") return fail("هذا الإجراء يخص حسابات سوبر أدمين حصراً");
  if (target.isPlatformOwner) return fail("لا يمكن توقيف مالك المنصة");
  if (target.status === "SUSPENDED") return fail("هذا الحساب موقوف مسبقاً", 409);

  // ─── شرط الإجراء المنضبط: إشعار مسبق منتهي الأجل ───────────────────────
  if (!target.noticeDeadline || target.noticeDeadline.getTime() > Date.now()) {
    const remainingHours = target.noticeDeadline
      ? Math.max(1, Math.ceil((target.noticeDeadline.getTime() - Date.now()) / 3600000))
      : null;
    return Response.json(
      {
        error: target.noticeDeadline
          ? `لم ينقضِ أجل الإشعار المسبق بعد — يتبقى ${remainingHours} ساعة قبل التوقيف`
          : "لا يمكن التوقيف دون إشعار مسبق — وجّه إشعاراً أولاً واحترم أجلَه",
        remainingHours,
      },
      { status: 422, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }

  const b = await readJson(req);
  const note = b.note ? String(b.note).slice(0, 1000) : null;

  // أسباب التوقيف كما وردت في الإشعار المسبق
  let reasons: string[] = [];
  try {
    const parsed = target.suspensionReasons ? JSON.parse(target.suspensionReasons) : null;
    if (parsed && Array.isArray(parsed.reasons)) reasons = parsed.reasons.map(String);
  } catch {
    reasons = [];
  }

  const now = new Date();
  await db.user.update({
    where: { id: target.id },
    data: { status: "SUSPENDED", suspendedAt: now },
  });

  // ─── إشعار داخل المنصة بتوقيف الحساب ───────────────────────────────────
  await db.notification.create({
    data: {
      userId: target.id,
      type: "ACCOUNT_SUSPENDED",
      title: "تم توقيف حسابك",
      body:
        `تم توقيف حسابكم في منصة CMDP بعد انقضاء أجل الإشعار المسبق الموجَّه إليكم.` +
        (reasons.length > 0 ? `\nالأسباب المعلنة:\n${reasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}` : "") +
        (note ? `\nملاحظة المالك: ${note}` : "") +
        `\nيمكنكم مراسلة مالك المنصة للتوضيح أو طلب إعادة التفعيل.`,
      meta: JSON.stringify({ reasons, note, suspendedAt: now.toISOString() }),
    },
  });

  // ─── سجل التدقيق: توقيف فعلي — حدث جسيم ───────────────────────────────
  await audit(req, {
    actorId: owner.id,
    actorName: owner.fullName,
    actorRole: owner.role,
    action: "SUPER_ADMIN_SUSPENDED",
    targetType: "USER",
    targetId: target.id,
    targetLabel: target.username,
    severity: "CRITICAL",
    details: { reasons, note, noticeDeadline: target.noticeDeadline },
  });

  return ok({ suspended: true, username: target.username, suspendedAt: now });
}
