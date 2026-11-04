// ═══════════════════════════════════════════════════════════════════════════
// CMDP — فرصة واحدة: تفاصيل (عمومي) / تحديث وحذف (صاحب الصلاحية)
// GET التفاصيل تتضمن الترشيحات لمن يملك صلاحية الدراسة فقط
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { denied, getAuthUser, requirePermission } from "@/lib/auth";
import { can } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

const COOP_SELECT = { select: { id: true, name: true, sector: true, region: true, phone: true, email: true, approvalStatus: true } } as const;

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = await db.opportunity.findUnique({
    where: { id: Number(id) },
    include: { cooperative: COOP_SELECT, _count: { select: { applications: true } } },
  });
  if (!row) return fail("الفرصة غير موجودة", 404);
  if (row.cooperative.approvalStatus !== "APPROVED") return fail("الفرصة غير متاحة", 403);

  const user = await getAuthUser(req);
  const canReview =
    user &&
    can(user, "review:applications") &&
    (user.role !== "COADMIN" || user.cooperativeId === row.cooperativeId);

  const { _count, ...rest } = row;
  if (canReview) {
    const applications = await db.opportunityApplication.findMany({
      where: { opportunityId: row.id },
      orderBy: { createdAt: "desc" },
    });
    return ok({ ...rest, applicationsCount: _count.applications, applications });
  }
  return ok({ ...rest, applicationsCount: _count.applications });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, "post:opportunities");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const row = await db.opportunity.findUnique({ where: { id: Number(id) } });
  if (!row) return fail("الفرصة غير موجودة", 404);
  if (user.role === "COADMIN" && row.cooperativeId !== user.cooperativeId) {
    return denied("هذه الفرصة خارج نطاق تعاونيتك");
  }

  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of ["title", "description", "sector", "region", "city", "requirements", "contactEmail", "contactPhone", "status", "type", "contractType"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.positions !== undefined) data.positions = Math.max(1, Number(b.positions));
  if (b.deadline !== undefined) data.deadline = b.deadline ? toDate(b.deadline) : null;
  if (Object.keys(data).length === 0) return fail("لا توجد حقول للتحديث");

  const updated = await db.opportunity.update({
    where: { id: Number(id) },
    data: data as never,
    include: { cooperative: COOP_SELECT, _count: { select: { applications: true } } },
  });
  const { _count, ...rest } = updated;
  return ok({ ...rest, applicationsCount: _count.applications });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, "post:opportunities");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const row = await db.opportunity.findUnique({ where: { id: Number(id) } });
  if (!row) return fail("الفرصة غير موجودة", 404);
  if (user.role === "COADMIN" && row.cooperativeId !== user.cooperativeId) {
    return denied("هذه الفرصة خارج نطاق تعاونيتك");
  }

  await db.opportunity.delete({ where: { id: Number(id) } });
  return ok({ deleted: true });
}
