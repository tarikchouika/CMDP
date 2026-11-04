// ═══════════════════════════════════════════════════════════════════════════
// CMDP — ترشيحات فرص التعاونية (دراسة الترشيحات لصاحب الصلاحية)
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const auth = await requirePermission(req, "review:applications");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const status = new URL(req.url).searchParams.get("status");
  const where: Record<string, unknown> = {
    opportunity: {
      ...(user.role === "COADMIN" ? { cooperativeId: user.cooperativeId ?? -1 } : {}),
      cooperative: { approvalStatus: "APPROVED" },
    },
    ...(status ? { status } : {}),
  };

  const rows = await db.opportunityApplication.findMany({
    where,
    include: { opportunity: { select: { id: true, title: true, type: true } } },
    orderBy: { createdAt: "desc" },
  });
  return ok(rows);
}
