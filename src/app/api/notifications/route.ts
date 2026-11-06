// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إشعارات المستخدم الحالي
// GET  /api/notifications  → قائمة إشعارات المعني + عدد غير المقروء
// POST /api/notifications  → وضع علامة مقروء: { id } إشعار واحد | { all: true } الكل
// بلا نطاق إداري: كل مستخدم يرى إشعاراته هو فقط.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

function unauthenticated(): Response {
  return Response.json(
    { error: "يلزم تسجيل الدخول للقيام بهذه العملية" },
    { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
  );
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthenticated();

  const items = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  const unread = await db.notification.count({
    where: { userId: user.id, isRead: false },
  });

  return ok({ items, unread });
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return unauthenticated();

  const b = await readJson(req);
  if (b.all === true) {
    await db.notification.updateMany({
      where: { userId: user.id, isRead: false },
      data: { isRead: true },
    });
    return ok({ updated: "all" });
  }
  const id = Number(b.id ?? 0);
  if (!id) return fail("حدد الإشعار أو اطلب تحديث الكل");
  // تحديث محصور في نطاق المعني: لا يمكن قراءة إشعار غيره
  const row = await db.notification.findFirst({ where: { id, userId: user.id } });
  if (!row) return fail("الإشعار غير موجود", 404);
  await db.notification.update({ where: { id }, data: { isRead: true } });
  return ok({ updated: id });
}
