// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الدخول: تحقق هوية + عدالة الإيقاف (سبب موثق) + توثيق تدقيقي
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { verifyPassword } from "@/lib/seed-run";
import { signToken } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
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
    // توثيق محاولة الدخول الفاشلة (حدث أمني) دون كشف كلمة المرور إطلاقاً
    await logAudit({
      req,
      action: "auth.login_failed",
      entityType: "USER",
      entityId: user?.id ?? null,
      summary: `محاولة دخول فاشلة باسم «${username}»`,
      severity: "WARNING",
    });
    return fail("بيانات الدخول غير صحيحة", 401);
  }
  if (user.status === "PENDING") {
    return fail("حسابك بانتظار المصادقة من طرف الإدارة المختصة — شكراً لصبركم", 403);
  }
  if (user.status === "SUSPENDED") {
    // عدالة الإيقاف: يظهر السبب الموثق لصاحبه
    const reason = user.suspensionReason?.trim();
    const at = user.suspendedAt ? new Date(user.suspendedAt).toISOString().slice(0, 10) : "";
    return fail(
      `هذا الحساب موقوف${at ? ` منذ ${at}` : ""}.${reason ? ` السبب الموثق: ${reason}` : ""} — للاستفسار تواصلوا مع إدارة المنصة`,
      403
    );
  }
  if (user.status !== "ACTIVE") {
    return fail("هذا الحساب مرفوض — تواصلوا مع إدارة المنصة", 403);
  }

  await logAudit({
    req,
    actor: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      role: user.role as Role,
      accountType: (user.accountType as AccountType | null) ?? null,
      cooperativeId: user.cooperativeId ?? null,
      cooperativeName: user.cooperative?.name ?? null,
      status: user.status as UserStatus,
      isOwner: user.isOwner,
    },
    action: "auth.login",
    entityType: "USER",
    entityId: user.id,
    summary: `دخول ناجح: ${user.fullName} (${user.username})`,
    details: { role: user.role, isOwner: user.isOwner === true },
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
      isOwner: user.role === "SUPER_ADMIN" ? user.isOwner : false,
    },
  });
}
