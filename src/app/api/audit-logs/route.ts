// ═══════════════════════════════════════════════════════════════════════════
// CMDP — سجل الأحداث التدقيقي: GET /api/audit-logs
// المالك والسوبر أدمين (صلاحية view:audit-log) — قراءة فقط، لا حذف ولا
// تعديل من أي طرف (حوكمة: التاريخ لا يُمحى).
// فلاتر: ?action= &actor= &severity= &entity= &entityId= &from= &to= &q=
// ترقيم: ?limit= (50 افتراضياً، حد 200) &offset=
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { can } from "@/lib/permissions";
import { logAudit, logDenied } from "@/lib/audit";
import type { Prisma } from "@prisma/client";

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
    await logDenied(req, user, "audit_logs.view", "PLATFORM", null, "سجل الأحداث: المالك والسوبر أدمين");
    return denied("سجل الأحداث متاح لمالك المنصة والسوبر أدمين حصراً");
  }

  const url = new URL(req.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);
  const action = url.searchParams.get("action")?.trim() || undefined;
  const severity = url.searchParams.get("severity")?.trim() || undefined;
  const entityType = url.searchParams.get("entity")?.trim() || undefined;
  const entityId = url.searchParams.get("entityId")?.trim() || undefined;
  const actor = url.searchParams.get("actor")?.trim() || undefined;
  const from = url.searchParams.get("from")?.trim() || undefined;
  const to = url.searchParams.get("to")?.trim() || undefined;
  const q = url.searchParams.get("q")?.trim() || undefined;

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(severity ? { severity } : {}),
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
    ...(actor ? { actorUsername: { contains: actor } } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
    ...(q ? { summary: { contains: q } } : {}),
  };

  const [items, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({ where }),
  ]);

  // توثيق الاطلاع على السجل (شفافية كاملة — حتى على السجل نفسه) بلا إزعاج
  await logAudit({
    req,
    actor: user,
    action: "audit_logs.view",
    entityType: "PLATFORM",
    summary: `اطلاع على سجل الأحداث (${total} نتيجة بالفلاتر الحالية)`,
    details: { filters: { action, severity, entityType, entityId, actor, from, to, q }, limit, offset },
  });

  return ok({ items, total, offset, limit });
}
