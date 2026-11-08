// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تحديث حالة ترشيح (دراسة / قبول / رفض)
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, "review:applications");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const application = await db.opportunityApplication.findUnique({
    where: { id: Number(id) },
    include: { opportunity: true },
  });
  if (!application) return fail("الترشيح غير موجود", 404);
  if (user.role === "COADMIN" && application.opportunity.cooperativeId !== user.cooperativeId) {
    return denied("هذا الترشيح خارج نطاق تعاونيتك");
  }

  const b = await readJson(req);
  const status = String(b.status ?? "");
  if (!["PENDING", "REVIEWED", "ACCEPTED", "REJECTED"].includes(status)) {
    return fail("حالة غير صحيحة");
  }

  const row = await db.opportunityApplication.update({
    where: { id: Number(id) },
    data: { status },
    include: { opportunity: { select: { id: true, title: true, type: true } } },
  });
  // ─── سجل التدقيق: قرار دراسة ترشيح ──────────────────────────────────
  await audit(req, {
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: "APPLICATION_DECIDED",
    targetType: "APPLICATION",
    targetId: row.id,
    targetLabel: row.fullName,
    severity: "WARNING",
    details: {
      decision: status,
      opportunityId: row.opportunity.id,
      opportunityTitle: row.opportunity.title,
      linkedUserId: row.userId,
    },
  });
  return ok(row);
}
