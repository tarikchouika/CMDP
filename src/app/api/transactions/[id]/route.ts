import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { coopAccessDenied, denied, requirePermission } from "@/lib/auth";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:finance");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.transaction.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of ["type", "category", "description", "method", "reference"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.amount !== undefined) data.amount = Number(b.amount);
  if (b.date !== undefined) data.date = toDate(b.date);
  // تحديث إثبات الحركة عند رفع مرفقات جديدة
  if (Array.isArray(b.proofFiles)) {
    const clean = (b.proofFiles as { name?: string; type?: string; size?: number; dataUrl?: string }[])
      .filter((f) => typeof f.dataUrl === "string" && /^(application\/pdf|image\/)/.test(String(f.type)) && String(f.dataUrl).length < 6_000_000)
      .slice(0, 8)
      .map((f) => ({ name: String(f.name ?? "ملف").slice(0, 160), type: String(f.type), size: Number(f.size) || 0, dataUrl: String(f.dataUrl) }));
    if (clean.length > 0) data.proofFiles = JSON.stringify(clean);
  }

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

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:finance");
  if ("response" in auth) return auth.response;

  const { id } = await params;
  const existing = await db.transaction.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }
  try {
    await db.transaction.delete({ where: { id: Number(id) } });
    return ok({ deleted: true });
  } catch {
    return fail("حركة مالية غير موجودة", 404);
  }
}
