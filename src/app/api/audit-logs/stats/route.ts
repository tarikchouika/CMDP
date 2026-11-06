// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إحصائيات سجل الأحداث: GET /api/audit-logs/stats
// مؤشرات لوحة السجل: الحجم الكلي، آخر 7 أيام، التوزيع حسب الخطورة،
// أكثر الفاعلين والأحداث — لعرض بياني متسق مع الهوية البصرية.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return Response.json(
      { error: "يلزم تسجيل الدخول للقيام بهذه العملية" },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
  if (!can(user, "view:audit-log")) {
    return denied("سجل الأحداث متاح لمالك المنصة والسوبر أدمين حصراً");
  }

  const since7 = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const [total, last7, critical, warning, bySeverityRaw, topActorsRaw, topActionsRaw] =
    await Promise.all([
      db.auditLog.count(),
      db.auditLog.count({ where: { createdAt: { gte: since7 } } }),
      db.auditLog.count({ where: { severity: "CRITICAL" } }),
      db.auditLog.count({ where: { severity: "WARNING" } }),
      db.auditLog.groupBy({ by: ["severity"], _count: { _all: true } }),
      db.auditLog.groupBy({
        by: ["actorUsername"],
        _count: { _all: true },
        orderBy: { _count: { actorUsername: "desc" } },
        take: 5,
      }),
      db.auditLog.groupBy({
        by: ["action"],
        _count: { _all: true },
        orderBy: { _count: { action: "desc" } },
        take: 6,
      }),
    ]);

  // آخر 7 أيام يوماً بيوم (للرسم البياني)
  const byDay: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = new Date(Date.now() - i * 24 * 3600 * 1000);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start.getTime() + 24 * 3600 * 1000);
    const count = await db.auditLog.count({ where: { createdAt: { gte: start, lt: end } } });
    byDay.push({ day: start.toISOString().slice(0, 10), count });
  }

  return ok({
    total,
    last7,
    critical,
    warning,
    byDay,
    bySeverity: bySeverityRaw.map((s) => ({ severity: s.severity, count: s._count._all })),
    topActors: topActorsRaw.map((a) => ({ actorUsername: a.actorUsername, count: a._count._all })),
    topActions: topActionsRaw.map((a) => ({ action: a.action, count: a._count._all })),
  });
}
