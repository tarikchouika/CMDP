// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تسجيل الدخول بالرمز الموقّع
// الحوكمة 1.3.0: الحسابات الموقوفة تُرفض مع عرض أسباب التوقيف،
// وكل محاولة دخول (نجاحاً أو فشلاً) تُوثَّق في سجل التدقيق
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { verifyPassword } from "@/lib/seed-run";
import { signToken } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { AccountType, Role, UserStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const body = await readJson(req);
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username || !password) return fail("أدخل اسم المستخدم وكلمة المرور");

  const user = await db.user.findUnique({ where: { username }, include: { cooperative: true } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    // ─── سجل التدقيق: محاولة دخول فاشلة ────────────────────────────────
    await audit(req, {
      actorId: user?.id ?? null,
      actorName: username || "مجهول",
      actorRole: "PUBLIC",
      action: "USER_LOGIN_FAILED",
      targetType: "USER",
      targetId: user?.id ?? null,
      targetLabel: username || null,
      severity: "WARNING",
      details: { reason: user ? "INVALID_PASSWORD" : "UNKNOWN_USERNAME" },
    });
    return fail("بيانات الدخول غير صحيحة", 401);
  }
  if (user.status === "PENDING") {
    return fail("حسابك بانتظار المصادقة من طرف الإدارة المختصة — شكراً لصبركم", 403);
  }
  if (user.status === "SUSPENDED") {
    // ─── الحساب الموقوف: عرض أسباب التوقيف إن وُجدت ────────────────────
    let reasons: string[] = [];
    try {
      const parsed = user.suspensionReasons ? JSON.parse(user.suspensionReasons) : null;
      if (parsed && Array.isArray(parsed.reasons)) reasons = parsed.reasons.map(String);
    } catch {
      reasons = [];
    }
    await audit(req, {
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: "USER_LOGIN_FAILED",
      targetType: "USER",
      targetId: user.id,
      targetLabel: user.username,
      severity: "WARNING",
      details: { reason: "ACCOUNT_SUSPENDED", suspendedAt: user.suspendedAt, reasons },
    });
    return fail(
      "حسابكم موقوف من طرف مالك المنصة" +
        (reasons.length > 0
          ? ` — الأسباب المعلنة:\n${reasons.map((r, i) => `${i + 1}. ${r}`).join("\n")}`
          : "") +
        "\nتواصلوا مع إدارة المنصة للتوضيح أو طلب إعادة التفعيل",
      403
    );
  }
  if (user.status !== "ACTIVE") {
    await audit(req, {
      actorId: user.id,
      actorName: user.fullName,
      actorRole: user.role,
      action: "USER_LOGIN_FAILED",
      targetType: "USER",
      targetId: user.id,
      targetLabel: user.username,
      severity: "WARNING",
      details: { reason: "ACCOUNT_" + user.status },
    });
    return fail("هذا الحساب موقوف أو مرفوض — تواصلوا مع إدارة المنصة", 403);
  }

  // ─── سجل التدقيق: دخول ناجح ───────────────────────────────────────────
  await audit(req, {
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: "USER_LOGIN",
    targetType: "USER",
    targetId: user.id,
    targetLabel: user.username,
  });

  return ok({
    token: signToken(user.id),
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as Role,
      accountType: (user.accountType as AccountType | null) ?? null,
      cooperativeId: user.cooperativeId ?? null,
      cooperativeName: user.cooperative?.name ?? null,
      status: user.status as UserStatus,
      isPlatformOwner: user.isPlatformOwner === true, // مالك المنصة (حوكمة 1.3.0)
    },
  });
}
