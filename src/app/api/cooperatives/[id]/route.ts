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
  for (const k of [
    "name",
    "registrationNumber",
    "odcCardNumber",
    "sector",
    "region",
    "province",
    "commune",
    "presidentName",
    "phone",
    "email",
    "address",
    "status",
    "notes",
  ]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.foundingDate !== undefined) data.foundingDate = toDate(b.foundingDate);

  try {
    const row = await db.cooperative.update({
      where: { id: Number(id) },
      data: data as unknown as Prisma.CooperativeUpdateInput,
    });
    return ok(row);
  } catch {
    return fail("تعاونية غير موجودة", 404);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.cooperative.delete({ where: { id: Number(id) } });
    return ok({ deleted: true });
  } catch {
    return fail("تعاونية غير موجودة", 404);
  }
}
