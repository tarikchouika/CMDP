import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

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
  // ─── سجل التدقيق: تعديل منتج ──────────────────────────────────────
  await audit(req, {
    actorId: auth.user.id,
    actorName: auth.user.fullName,
    actorRole: auth.user.role,
    action: "PRODUCT_UPDATED",
    targetType: "PRODUCT",
    targetId: row.id,
    targetLabel: row.name,
    details: { cooperativeId: row.cooperativeId, fields: Object.keys(data) },
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
  // ─── سجل التدقيق: حذف منتج من المتجر ──────────────────────────
  await audit(req, {
    actorId: auth.user.id,
    actorName: auth.user.fullName,
    actorRole: auth.user.role,
    action: "PRODUCT_DELETED",
    targetType: "PRODUCT",
    targetId: existing.id,
    targetLabel: existing.name,
    severity: "WARNING",
    details: {
      cooperativeId: existing.cooperativeId,
      category: existing.category,
      price: existing.price,
      status: existing.status,
    },
  });
  return ok({ deleted: true });
}
