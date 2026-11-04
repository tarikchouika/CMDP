import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { coopAccessDenied, denied, requirePermission } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:entities");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.entityInteraction.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of ["type", "subject", "status", "notes"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.entityId !== undefined) data.entityId = Number(b.entityId);
  if (b.date !== undefined) data.date = toDate(b.date);

  try {
    const row = await db.entityInteraction.update({
      where: { id: Number(id) },
      data: data as unknown as Prisma.EntityInteractionUpdateInput,
    });
    return ok(row);
  } catch {
    return fail("تفاعل غير موجود", 404);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:entities");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.entityInteraction.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  try {
    await db.entityInteraction.delete({ where: { id: Number(id) } });
    return ok({ deleted: true });
  } catch {
    return fail("تفاعل غير موجود", 404);
  }
}
