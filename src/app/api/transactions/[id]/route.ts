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
  for (const k of ["type", "category", "description", "method", "reference"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.amount !== undefined) data.amount = Number(b.amount);
  if (b.date !== undefined) data.date = toDate(b.date);

  try {
    const row = await db.transaction.update({
      where: { id: Number(id) },
      data: data as unknown as Prisma.TransactionUpdateInput,
    });
    return ok(row);
  } catch {
    return fail("حركة مالية غير موجودة", 404);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.transaction.delete({ where: { id: Number(id) } });
    return ok({ deleted: true });
  } catch {
    return fail("حركة مالية غير موجودة", 404);
  }
}
