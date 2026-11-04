import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { verifyPassword } from "@/lib/seed-run";
import { signToken } from "@/lib/auth";
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
    return fail("بيانات الدخول غير صحيحة", 401);
  }
  if (user.status === "PENDING") {
    return fail("حسابك بانتظار المصادقة من طرف الإدارة المختصة — شكراً لصبركم", 403);
  }
  if (user.status !== "ACTIVE") {
    return fail("هذا الحساب موقوف أو مرفوض — تواصلوا مع إدارة المنصة", 403);
  }

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
    },
  });
}
