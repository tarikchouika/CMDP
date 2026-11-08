// ═══════════════════════════════════════════════════════════════════════════
// CMDP — المتجر: طلبات الشراء (عمومية للإرسال، إدارية للقراءة/التحديث)
// النطاق: الكوأدمن يرى طلبات منتجات تعاونيته حصراً؛ الإدارة ترى الكل
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const auth = await requirePermission(req, "manage:store");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  // الكوأدمن: طلبات منتجات تعاونيته فقط (عبر علاقة المنتج)
  const where =
    user.role === "COADMIN"
      ? { product: { cooperativeId: user.cooperativeId ?? -1 } }
      : {};

  const rows = await db.order.findMany({
    where,
    include: {
      product: {
        select: { id: true, name: true, cooperativeId: true, price: true, unit: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const b = await readJson(req);
  const productId = Number(b.productId ?? 0);
  if (!productId || !b.customerName || !b.phone) {
    return fail("المنتج والاسم ورقم الهاتف إلزاميون");
  }
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product || product.status !== "ACTIVE") return fail("المنتج غير متاح حالياً", 404);
  const row = await db.order.create({
    data: {
      productId,
      quantity: Math.max(1, Number(b.quantity ?? 1)),
      customerName: String(b.customerName).slice(0, 120),
      phone: String(b.phone).slice(0, 30),
      city: b.city ? String(b.city).slice(0, 80) : null,
      note: b.note ? String(b.note).slice(0, 800) : null,
    },
  });
  // ─── سجل التدقيق: طلب شراء من الزوار (متجر عمومي) ───────────────
  await audit(req, {
    actorName: "زائر",
    actorRole: "PUBLIC",
    action: "ORDER_CREATED",
    targetType: "ORDER",
    targetId: row.id,
    targetLabel: `${product.name} × ${row.quantity}`,
    details: {
      productId,
      productName: product.name,
      quantity: row.quantity,
      customerName: row.customerName,
      city: row.city,
    },
  });
  return ok(row, 201);
}
