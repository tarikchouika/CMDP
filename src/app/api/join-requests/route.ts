// ═══════════════════════════════════════════════════════════════════════════
// CMDP — طلبات الانخراط والتعاقد (عرض حسب النطاق)
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const auth = await requirePermission(req, "approve:users");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (user.role === "COADMIN") where.cooperativeId = user.cooperativeId;

  const rows = await db.joinRequest.findMany({
    where,
    include: { cooperative: { select: { id: true, name: true, sector: true, region: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
  return ok(rows);
}
