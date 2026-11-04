import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { coopAccessDenied, denied, requirePermission } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:documents");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.document.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of ["title", "type", "reference", "status", "notes"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.issueDate !== undefined) data.issueDate = toDate(b.issueDate);
  if (b.expiryDate !== undefined) data.expiryDate = b.expiryDate ? toDate(b.expiryDate) : null;
  if (b.isShared !== undefined) data.isShared = b.isShared === true; // مشاركة مع المتعاقدين

  try {
    const row = await db.document.update({
      where: { id: Number(id) },
      data: data as unknown as Prisma.DocumentUpdateInput,
    });
    return ok(row);
  } catch {
    return fail("وثيقة غير موجودة", 404);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:documents");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.document.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  try {
    await db.document.delete({ where: { id: Number(id) } });
    return ok({ deleted: true });
  } catch {
    return fail("وثيقة غير موجودة", 404);
  }
}
