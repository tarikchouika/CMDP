import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:store");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const existing = await db.product.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("المنتج غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا المنتج خارج نطاق تعاونيتكم");
  }
  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of ["name", "description", "category", "unit", "imageUrl"]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.price !== undefined) {
    const price = Number(b.price);
    if (!Number.isFinite(price) || price < 0) return fail("السعر غير صالح");
    data.price = price;
  }
  if (b.inStock !== undefined) data.inStock = Boolean(b.inStock);
  if (b.featured !== undefined) data.featured = Boolean(b.featured);
  if (b.status !== undefined) data.status = String(b.status);
  const row = await db.product.update({ where: { id: Number(id) }, data: data as never });
  await logAudit({
    req,
    actor: auth.user,
    action: "product.update",
    entityType: "PRODUCT",
    entityId: row.id,
    summary: `تحديث منتج: ${row.name}`,
    details: { cooperativeId: row.cooperativeId, status: row.status, inStock: row.inStock },
  });
  return ok(row);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:store");
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const existing = await db.product.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("المنتج غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {
    return denied("هذا المنتج خارج نطاق تعاونيتكم");
  }
  await db.product.delete({ where: { id: Number(id) } });
  await logAudit({
    req,
    actor: auth.user,
    action: "product.delete",
    entityType: "PRODUCT",
    entityId: existing.id,
    summary: `حذف منتج: ${existing.name}`,
    details: { cooperativeId: existing.cooperativeId },
    severity: "WARNING",
  });
  return ok({ deleted: true });
}
