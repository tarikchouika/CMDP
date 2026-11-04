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
    return ok(row);
  } catch {
    return fail("جمع عام غير موجود", 404);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.assembly.delete({ where: { id: Number(id) } });
    return ok({ deleted: true });
  } catch {
    return fail("جمع عام غير موجود", 404);
  }
}
