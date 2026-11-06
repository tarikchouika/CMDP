// ═══════════════════════════════════════════════════════════════════════════
// CMDP — نقل ملكية المنصة: POST /api/ownership/transfer
// المالك حصراً؛ إجراء أحادي الاتجاه موثق بمعاملة ذرية:
// • الهدف يصبح سوبر أدمين مالكاً (isOwner=true) — ويُخطر رسمياً
// • المالك السابق يبقى سوبر أدمين عادياً تحت سلطة المالك الجديد
// • الهدف المحتمل: حساب نشط موثوق (أدمن أو سوبر أدمين) — لا تعاونيات ولا أعضاء
// • تأكيد صريح: كتابة اسم حساب المالك الحالي نصاً
// • توثيق تدقيقي بدرجة حرجة + إشعار للطرفين
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { isPlatformOwner } from "@/lib/permissions";
import { logAudit, logDenied } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const actor = await getAuthUser(req);
  if (!actor) {
    return Response.json(
      { error: "يلزم تسجيل الدخول للقيام بهذه العملية" },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
  if (!isPlatformOwner(actor)) {
    await logDenied(req, actor, "ownership.transfer", "PLATFORM", null, "نقل الملكية: المالك حصراً");
    return denied("نقل ملكية المنصة من اختصاص المالك الحالي حصراً");
  }

  const b = await readJson(req);
  const targetId = Number(b.targetUserId ?? 0);
  const confirm = String(b.confirmUsername ?? "").trim().toLowerCase();
  const reason = String(b.reason ?? "").trim();

  if (!targetId || targetId === actor.id) {
    return fail("حدد حساباً هدف مختلفاً عن حسابك الحالي");
  }
  // تأكيد صريح واعٍ: كتابة اسم حساب المالك نصاً
  if (confirm !== actor.username.toLowerCase()) {
    return fail("لتأكيد النقل اكتب اسم حسابك الحالي كما هو نصاً");
  }
  if (reason.length < 10) {
    return fail("اذكر سبب نقل الملكية (10 أحرف على الأقل) — يوثق في سجل الأحداث");
  }

  const target = await db.user.findUnique({ where: { id: targetId } });
  if (!target) return fail("الحساب الهدف غير موجود", 404);
  if (target.status !== "ACTIVE") {
    return fail("لا يمكن نقل الملكية إلى حساب غير نشط — فعّل الحساب أولاً");
  }
  if (target.role !== "ADMIN" && target.role !== "SUPER_ADMIN") {
    return fail("لا يمكن نقل الملكية إلا إلى أدمن أو سوبر أدمين موثوق — ترقية الحساب أولاً");
  }

  // ── معاملة ذرية: نقل الملكية في خطوة واحدة لا تنكسر في منتصفها ──
  const [oldOwner, newOwner] = await db.$transaction([
    db.user.update({
      where: { id: actor.id },
      data: { isOwner: false },
    }),
    db.user.update({
      where: { id: target.id },
      data: { isOwner: true, role: "SUPER_ADMIN", status: "ACTIVE" },
    }),
  ]);

  await logAudit({
    req,
    actor,
    action: "ownership.transfer",
    entityType: "PLATFORM",
    entityId: String(target.id),
    summary: `نقل ملكية المنصة من ${oldOwner.fullName} إلى ${newOwner.fullName}`,
    details: {
      from: { id: oldOwner.id, username: oldOwner.username },
      to: { id: newOwner.id, username: newOwner.username },
      reason,
    },
    severity: "CRITICAL",
  });

  // إشعار رسمي للطرفين — قناة الإبلاغ المعتمدة داخل المنصة
  await notifyUser({
    userId: newOwner.id,
    type: "OWNERSHIP_TRANSFER",
    title: "أصبحت مالكاً لمنصة CMDP",
    body: `نُقلت إليك ملكية المنصة الرقمية لإدارة التعاونيات من ${oldOwner.fullName}. تملك منذ الآن كامل الصلاحيات المالكية: إدارة السوبر أدمين ونقل الملكية والاطلاع على سجل الأحداث.`,
    meta: { previousOwnerId: oldOwner.id, reason },
  });
  await notifyUser({
    userId: oldOwner.id,
    type: "OWNERSHIP_TRANSFER",
    title: "تم نقل ملكية المنصة",
    body: `نُقلت ملكية المنصة إلى ${newOwner.fullName} (${newOwner.username}). صرت سوبر أدمين تحت إدارة المالك الجديد — شكراً لتأسيسك المنصة.`,
    meta: { newOwnerId: newOwner.id, reason },
  });

  return ok({ transferred: true, newOwner: { id: newOwner.id, username: newOwner.username, fullName: newOwner.fullName } });
}
