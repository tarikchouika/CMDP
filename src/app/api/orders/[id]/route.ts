// ═══════════════════════════════════════════════════════════════════════════
// CMDP — المتجر: معالجة طلب شراء (تحديث الحالة) — للرئيس/المسير داخل نطاقه
// مسار المعالجة: جديد ← تم التواصل ← مكتمل / ملغى
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

const ORDER_STATUSES = ["NEW", "CONTACTED", "DONE", "CANCELLED"];

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:store");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const existing = await db.order.findUnique({
    where: { id: Number(id) },
    include: { product: { select: { cooperativeId: true } } },
  });
  if (!existing) return fail("الطلب غير موجود", 404);

  // الكوأدمن: طلبات منتجات تعاونيته فقط
  if (user.role === "COADMIN" && existing.product.cooperativeId !== user.cooperativeId) {
    return denied("هذا الطلب خارج نطاق تعاونيتكم");
  }

  const b = await readJson(req);
  const status = String(b.status ?? "");
  if (!ORDER_STATUSES.includes(status)) return fail("حالة طلب غير صحيحة");

  const row = await db.order.update({
    where: { id: Number(id) },
    data: { status },
    include: {
      product: { select: { id: true, name: true, cooperativeId: true, price: true, unit: true } },
    },
  });
  return ok(row);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(req, "manage:store");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const existing = await db.order.findUnique({
    where: { id: Number(id) },
    include: { product: { select: { cooperativeId: true } } },
  });
  if (!existing) return fail("الطلب غير موجود", 404);

  if (user.role === "COADMIN" && existing.product.cooperativeId !== user.cooperativeId) {
    return denied("هذا الطلب خارج نطاق تعاونيتكم");
  }

  await db.order.delete({ where: { id: Number(id) } });
  return ok({ deleted: true });
}
