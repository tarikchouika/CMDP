// ═══════════════════════════════════════════════════════════════════════════
// CMDP — نقل ملكية المنصة (حوكمة 1.3.0) — المالك الحالي حصراً
// إجراء جسيم بثلاثة أقفال: كلمة مرور المالك + عبارة تأكيد TRANSFER + هدف مفعَّل
// يتم داخل معاملة واحدة: المالك القديم يبقى سوبر أدمين، والجديد يصبح المالك
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { verifyPassword } from "@/lib/seed-run";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const owner = await getAuthUser(req);
  if (!owner) return fail("يلزم تسجيل الدخول للقيام بهذه العملية", 401);
  if (!owner.isPlatformOwner) return denied("نقل الملكية حصري بمالك المنصة الحالي");

  const b = await readJson(req);
  const targetUsername = String(b.targetUsername ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const confirmPhrase = String(b.confirmPhrase ?? "").trim();

  if (!targetUsername || !password) return fail("حدد اسم المستخدم الهدف وأدخل كلمة مرورك");

  // ─── القفل 1: تأكيد عبارة النقل حرفياً ─────────────────────────────────
  if (confirmPhrase !== "TRANSFER") {
    return fail("عبارة التأكيد غير صحيحة — اكتب TRANSFER حرفياً لتأكيد نقل الملكية");
  }

  // ─── القفل 2: كلمة مرور المالك الحالي (نفس تحقق تسجيل الدخول) ──────────
  const ownerRow = await db.user.findUnique({ where: { id: owner.id } });
  if (!ownerRow || !verifyPassword(password, ownerRow.passwordHash)) {
    return fail("كلمة المرور غير صحيحة — لا يمكن نقل الملكية دون تأكيد هوية المالك", 401);
  }

  // ─── القفل 3: الهدف موجود ومفعَّل وليس المالك نفسه ──────────────────────
  const target = await db.user.findUnique({ where: { username: targetUsername } });
  if (!target) return fail("الحساب الهدف غير موجود", 404);
  if (target.id === owner.id) return fail("لا يمكن نقل الملكية إلى حسابك الحالي", 400);
  if (target.status !== "ACTIVE") return fail("لا يمكن نقل الملكية إلى حساب غير مفعَّل", 409);

  // ─── المعاملة الذرية: سحب الملكية + منحها للهدف ────────────────────────
  await db.$transaction([
    db.user.update({
      // المالك القديم يبقى سوبر أدمين بكامل صلاحياته الإدارية
      where: { id: owner.id },
      data: { isPlatformOwner: false },
    }),
    db.user.update({
      where: { id: target.id },
      data: { role: "SUPER_ADMIN", isPlatformOwner: true, status: "ACTIVE" },
    }),
  ]);

  // ─── إشعار المالك الجديد داخل المنصة ───────────────────────────────────
  await db.notification.create({
    data: {
      userId: target.id,
      type: "OWNER_TRANSFERRED_TO_YOU",
      title: "تم نقل ملكية المنصة إليك",
      body:
        `تم نقل ملكية منصة CMDP إليكم بناءً على قرار المالك السابق (${owner.fullName}).` +
        `\nأصبحتم الآن المالك الوحيد للمنصة بكامل صلاحيات الحوكمة: إنشاء سوبر أدمين، الإيقاف المنضبط، ونقل الملكية.`,
      meta: JSON.stringify({
        previousOwnerId: owner.id,
        previousOwnerUsername: owner.username,
        transferredAt: new Date().toISOString(),
      }),
    },
  });

  // ─── سجل التدقيق: حدث جسيم يوثَّق بالكامل ─────────────────────────────
  await audit(req, {
    actorId: owner.id,
    actorName: owner.fullName,
    actorRole: owner.role,
    action: "PLATFORM_OWNERSHIP_TRANSFERRED",
    targetType: "USER",
    targetId: target.id,
    targetLabel: target.username,
    severity: "CRITICAL",
    details: {
      from: { id: owner.id, username: owner.username, fullName: owner.fullName },
      to: { id: target.id, username: target.username, fullName: target.fullName },
    },
  });

  return ok({
    transferred: true,
    previousOwner: { id: owner.id, username: owner.username, remainsRole: "SUPER_ADMIN" },
    newOwner: { id: target.id, username: target.username, fullName: target.fullName },
  });
}
