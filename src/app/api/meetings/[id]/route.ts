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
  const auth = await requirePermission(req, "manage:assemblies");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.meeting.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of ["agenda", "decisions"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.attendeesCount !== undefined) data.attendeesCount = Number(b.attendeesCount) || 0;
  if (b.date !== undefined) data.date = toDate(b.date);

  try {
    const row = await db.meeting.update({
      where: { id: Number(id) },
      data: data as unknown as Prisma.MeetingUpdateInput,
    });
  await logAudit({
    req,
    actor: auth.user,
    action: "meeting.update",
    entityType: "MEETING",
    entityId: row.id,
    summary: `تحديث اجتماع مجلس #${row.id}`,
    details: { cooperativeId: row.cooperativeId },
  });
    return ok(row);
  } catch {
    return fail("اجتماع غير موجود", 404);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:assemblies");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.meeting.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  try {
    await db.meeting.delete({ where: { id: Number(id) } });
  await logAudit({
    req,
    actor: auth.user,
    action: "meeting.delete",
    entityType: "MEETING",
    entityId: existing.id,
    summary: `حذف اجتماع مجلس #${existing.id}`,
    severity: "WARNING",
  });
    return ok({ deleted: true });
  } catch {
    return fail("اجتماع غير موجود", 404);
  }
}
