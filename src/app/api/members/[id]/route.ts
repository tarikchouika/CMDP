import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { coopAccessDenied, denied, requirePermission } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:members");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.member.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of ["fullName", "cin", "gender", "phone", "email", "city", "boardRole", "status"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.shares !== undefined) data.shares = Number(b.shares) || 1;
  if (b.joinDate !== undefined) data.joinDate = toDate(b.joinDate);

  try {
    const row = await db.member.update({
      where: { id: Number(id) },
      data: data as unknown as Prisma.MemberUpdateInput,
    });
  await logAudit({
    req,
    actor: auth.user,
    action: "member.update",
    entityType: "MEMBER",
    entityId: row.id,
    summary: `تحديث بيانات عضو: ${row.fullName}`,
    details: { cooperativeId: row.cooperativeId, status: row.status },
  });
    return ok(row);
  } catch {
    return fail("عضو غير موجود", 404);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:members");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.member.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  try {
    await db.member.delete({ where: { id: Number(id) } });
  await logAudit({
    req,
    actor: auth.user,
    action: "member.delete",
    entityType: "MEMBER",
    entityId: existing.id,
    summary: `حذف عضو: ${existing.fullName}`,
    details: { cooperativeId: existing.cooperativeId },
    severity: "WARNING",
  });
    return ok({ deleted: true });
  } catch {
    return fail("عضو غير موجود", 404);
  }
}
