// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إشعارات المستخدم الحالي (حوكمة 1.3.0)
// GET: إشعارات المستخدم الأحدث أولاً مع عدد غير المقروء
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight } from "@/lib/api-server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return fail("يلزم تسجيل الدخول للقيام بهذه العملية", 401);

  const [notifications, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id },
      orderBy: { id: "desc" }, // الأحدث أولاً
      take: 100,
    }),
    db.notification.count({ where: { userId: user.id, read: false } }),
  ]);

  return ok({ notifications, unread });
}
