// ═══════════════════════════════════════════════════════════════════════════
// CMDP — نظرة عامة على حوكمة المنصة (حوكمة 1.3.0)
// سوبر أدمين فأعلى: المالك الحالي، حسابات سوبر أدمين وحالتها،
// إحصائيات مجمَّعة، وآخر أحداث سجل التدقيق
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const auth = await requirePermission(req, "manage:platform");
  if ("response" in auth) return auth.response;

  const dayAgo = new Date(Date.now() - 24 * 3600 * 1000);

  const [owner, superAdmins, usersTotal, usersActive, usersSuspended, usersPending, coopTotal, coopApproved, coopPending, ordersTotal, ordersNew, ordersDone, auditTotal, auditCritical, auditWarning, auditLast24h, recentAudit] =
    await Promise.all([
      db.user.findFirst({
        where: { isPlatformOwner: true },
        select: { id: true, username: true, fullName: true },
      }),
      db.user.findMany({
        where: { role: "SUPER_ADMIN" },
        select: {
          id: true,
          username: true,
          fullName: true,
          status: true,
          isPlatformOwner: true,
          phone: true,
          email: true,
          noticedAt: true,
          noticeDeadline: true,
          suspendedAt: true,
          createdAt: true,
        },
        orderBy: [{ isPlatformOwner: "desc" }, { id: "asc" }],
      }),
      db.user.count(),
      db.user.count({ where: { status: "ACTIVE" } }),
      db.user.count({ where: { status: "SUSPENDED" } }),
      db.user.count({ where: { status: "PENDING" } }),
      db.cooperative.count(),
      db.cooperative.count({ where: { approvalStatus: "APPROVED" } }),
      db.cooperative.count({ where: { approvalStatus: "PENDING" } }),
      db.order.count(),
      db.order.count({ where: { status: "NEW" } }),
      db.order.count({ where: { status: "DONE" } }),
      db.auditLog.count(),
      db.auditLog.count({ where: { severity: "CRITICAL" } }),
      db.auditLog.count({ where: { severity: "WARNING" } }),
      db.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
      db.auditLog.findMany({ orderBy: { id: "desc" }, take: 10 }),
    ]);

  return ok({
    owner,
    superAdmins,
    stats: {
      users: { total: usersTotal, active: usersActive, suspended: usersSuspended, pending: usersPending },
      cooperatives: { total: coopTotal, approved: coopApproved, pending: coopPending },
      orders: { total: ordersTotal, new: ordersNew, done: ordersDone },
      audit: { total: auditTotal, critical: auditCritical, warning: auditWarning, last24h: auditLast24h },
    },
    recentAudit,
  });
}
