// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إشعار مسبق بتوقيف سوبر أدمين (حوكمة 1.3.0) — المالك حصراً
// تسلسل الإجراء المنضبط: إشعار (24..720 ساعة) ← توقيف ← إزالة
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

/** تنسيق التاريخ المحلي للعرض داخل نصوص الإشعار */
function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getAuthUser(req);
  if (!owner) return fail("يلزم تسجيل الدخول للقيام بهذه العملية", 401);
  if (!owner.isPlatformOwner) return denied("هذه العملية حصرية لمالك المنصة");

  const target = await db.user.findUnique({ where: { id: Number(id) } });
  if (!target) return fail("الحساب غير موجود", 404);
  if (target.role !== "SUPER_ADMIN") return fail("هذا الإجراء يخص حسابات سوبر أدمين حصراً");
  if (target.isPlatformOwner) return fail("لا يمكن توجيه إشعار توقيف لمالك المنصة");
  if (target.status === "SUSPENDED") return fail("هذا الحساب موقوف مسبقاً", 409);

  const b = await readJson(req);
  // ─── الأسباب: 1 إلى 6 أسباب، كل سبب 5 أحرف على الأقل بعد التقليم ────────
  const reasons = Array.isArray(b.reasons)
    ? b.reasons.map((r: unknown) => String(r ?? "").trim()).filter(Boolean)
    : [];
  if (reasons.length < 1 || reasons.length > 6) {
    return fail("قدم من سبب واحد إلى 6 أسباب للتوقيف");
  }
  if (reasons.some((r: string) => r.length < 5)) {
    return fail("كل سبب يجب أن يتكون من 5 أحرف على الأقل");
  }
  // ─── الأجل: 48 ساعة افتراضياً — مؤطَّر بين 24 و720 ساعة ─────────────────
  const hours = Math.min(720, Math.max(24, Number(b.hours ?? 48) || 48));
  const note = b.details ? String(b.details).slice(0, 1000) : null;

  const now = new Date();
  const deadline = new Date(now.getTime() + hours * 3600 * 1000);

  await db.user.update({
    where: { id: target.id },
    data: {
      noticedAt: now,
      noticeDeadline: deadline,
      suspensionReasons: JSON.stringify({ reasons, details: note }),
    },
  });

  // ─── إشعار داخل المنصة للحساب المعني ───────────────────────────────────
  const body =
    `تم توجيه إشعار مسبق بتوقيف حسابكم في منصة CMDP للأسباب التالية:\n` +
    reasons.map((r: string, i: number) => `${i + 1}. ${r}`).join("\n") +
    (note ? `\nتفاصيل إضافية: ${note}` : "") +
    `\nسيُوقَف الحساب عند انقضاء الأجل المحدد في ${fmtDate(deadline)} (${hours} ساعة).` +
    `\nلكم حق الرد والتوضيح لدى مالك المنصة قبل انقضاء الأجل.`;
  await db.notification.create({
    data: {
      userId: target.id,
      type: "SUSPENSION_NOTICE",
      title: "إشعار مسبق بتوقيف حسابك",
      body,
      meta: JSON.stringify({ reasons, details: note, deadline: deadline.toISOString(), hours }),
    },
  });

  // ─── سجل التدقيق: إنذار مسبق ───────────────────────────────────────────
  await audit(req, {
    actorId: owner.id,
    actorName: owner.fullName,
    actorRole: owner.role,
    action: "SUPER_ADMIN_SUSPENSION_NOTICE",
    targetType: "USER",
    targetId: target.id,
    targetLabel: target.username,
    severity: "WARNING",
    details: { reasons, details: note, hours, deadline: deadline.toISOString() },
  });

  return ok({
    noticed: true,
    username: target.username,
    noticedAt: now,
    noticeDeadline: deadline,
    hours,
    reasons,
  });
}
