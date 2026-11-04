import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { verifyPassword } from "@/lib/seed-run";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const body = await readJson(req);
  const username = String(body.username ?? "").trim();
  const password = String(body.password ?? "");
  if (!username || !password) return fail("أدخل اسم المستخدم وكلمة المرور");

  const user = await db.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return fail("بيانات الدخول غير صحيحة", 401);
  }
  return ok({
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
  });
}
