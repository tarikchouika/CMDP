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
  const { id } = await params;
  // تأمين المسار (الإصدار 1.3.2): تحديث الجموع العامة للمسيّرين حصراً
  const auth = await requirePermission(req, "manage:assemblies");
  if ("response" in auth) return auth.response;
  const existing = await db.assembly.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("جمع عام غير موجود", 404);
  if (coopAccessDenied(auth.user, existing.cooperativeId)) {
    return denied("هذه التعاونية خارج نطاق صلاحياتكم");
  }

  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of ["type", "location", "agenda", "decisions", "status"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.attendeesCount !== undefined) data.attendeesCount = Number(b.attendeesCount) || 0;
  if (b.date !== undefined) data.date = toDate(b.date);

  try {
    const row = await db.assembly.update({
      where: { id: Number(id) },
      data: data as unknown as Prisma.AssemblyUpdateInput,
    });
    await logAudit({
      req,
      actor: auth.user,
      action: "assembly.update",
      entityType: "ASSEMBLY",
      entityId: row.id,
      summary: `تحديث جمع عام #${row.id} (${row.type})`,
      details: { cooperativeId: row.cooperativeId, status: row.status, fields: Object.keys(data) },
    });
    return ok(row);
  } catch {
    return fail("جمع عام غير موجود", 404);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // تأمين المسار (الإصدار 1.3.2): حذف الجموع للمسيّرين حصراً
  const auth = await requirePermission(req, "manage:assemblies");
  if ("response" in auth) return auth.response;
  const existing = await db.assembly.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("جمع عام غير موجود", 404);
  if (coopAccessDenied(auth.user, existing.cooperativeId)) {
    return denied("هذه التعاونية خارج نطاق صلاحياتكم");
  }

  try {
    await db.assembly.delete({ where: { id: Number(id) } });
    await logAudit({
      req,
      actor: auth.user,
      action: "assembly.delete",
      entityType: "ASSEMBLY",
      entityId: existing.id,
      summary: `حذف جمع عام #${existing.id} (${existing.type}) بتاريخ ${existing.date}`,
      details: { cooperativeId: existing.cooperativeId },
      severity: "WARNING",
    });
    return ok({ deleted: true });
  } catch {
    return fail("جمع عام غير موجود", 404);
  }
}
