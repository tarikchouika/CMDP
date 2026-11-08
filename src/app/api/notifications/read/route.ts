// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تعليم الإشعارات كمقروءة (حوكمة 1.3.0)
// POST {id} لإشعار واحد | POST {all:true} لكل إشعارات المستخدم الحالي
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return fail("يلزم تسجيل الدخول للقيام بهذه العملية", 401);

  const b = await readJson(req);

  // ─── تعليم كل الإشعارات كمقروءة ────────────────────────────────────────
  if (b.all === true) {
    const r = await db.notification.updateMany({
      where: { userId: user.id, read: false },
      data: { read: true },
    });
    return ok({ ok: true, updated: r.count });
  }

  // ─── تعليم إشعار واحد (ضمن إشعارات المستخدم حصراً) ─────────────────────
  const id = Number(b.id ?? 0);
  if (!id) return fail("حدد معرّف الإشعار أو مرّر all:true");
  const r = await db.notification.updateMany({
    where: { id, userId: user.id },
    data: { read: true },
  });
  if (r.count === 0) return fail("الإشعار غير موجود", 404);
  return ok({ ok: true, updated: r.count });
}
