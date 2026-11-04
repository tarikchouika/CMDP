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
    return ok(row);
  } catch {
    return fail("عضو غير موجود", 404);
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await db.member.delete({ where: { id: Number(id) } });
    return ok({ deleted: true });
  } catch {
    return fail("عضو غير موجود", 404);
  }
}
