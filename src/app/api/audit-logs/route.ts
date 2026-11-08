// ═══════════════════════════════════════════════════════════════════════════
// CMDP — سجل التدقيق (حوكمة 1.3.0)
// سوبر أدمين فأعلى: استعراض الأحداث بفلترة وبحث وترقيم صفحات
// ?search=&severity=&action=&targetType=&actorId=&from=&to=&page=1&limit=25
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { requirePermission } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const auth = await requirePermission(req, "manage:platform");
  if ("response" in auth) return auth.response;

  const sp = new URL(req.url).searchParams;
  const search = (sp.get("search") ?? "").trim();
  const severity = (sp.get("severity") ?? "").trim();
  const action = (sp.get("action") ?? "").trim();
  const targetType = (sp.get("targetType") ?? "").trim();
  const actorId = Number(sp.get("actorId") ?? 0);
  const from = sp.get("from");
  const to = sp.get("to");
  const page = Math.max(1, Number(sp.get("page") ?? 1) || 1);
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit") ?? 25) || 25));

  // ─── بناء المرشحات ─────────────────────────────────────────────────────
  const where: Prisma.AuditLogWhereInput = {};
  if (severity) where.severity = severity;
  if (action) where.action = { contains: action };
  if (targetType) where.targetType = targetType;
  if (actorId) where.actorId = actorId;
  if (from || to) {
    where.createdAt = {};
    if (from) {
      const d = new Date(from);
      if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
    }
    if (to) {
      const d = new Date(to);
      if (!Number.isNaN(d.getTime())) where.createdAt.lte = d;
    }
  }
  if (search) {
    // البحث النصي: اسم الفاعل أو تسمية الهدف أو نوع الإجراء
    where.OR = [
      { actorName: { contains: search } },
      { targetLabel: { contains: search } },
      { action: { contains: search } },
    ];
  }

  const [total, logs] = await Promise.all([
    db.auditLog.count({ where }),
    db.auditLog.findMany({
      where,
      orderBy: { id: "desc" }, // الأحدث أولاً
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return ok({ logs, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) });
}
