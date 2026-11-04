import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of ["title", "type", "reference", "status", "notes"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.issueDate !== undefined) data.issueDate = toDate(b.issueDate);
  if (b.expiryDate !== undefined) data.expiryDate = b.expiryDate ? toDate(b.expiryDate) : null;

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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.document.delete({ where: { id: Number(id) } });
    return ok({ deleted: true });
  } catch {
    return fail("وثيقة غير موجودة", 404);
  }
}
