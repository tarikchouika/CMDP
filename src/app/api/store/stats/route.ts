// ═══════════════════════════════════════════════════════════════════════════
// CMDP — المتجر: الإحصائيات والتقارير (للرئيس/المسير داخل تعاونيته)
// مؤشرات الطلبات والإيرادات وتطورها الزمني وأعلى المنتجات — قابلة للطباعة
// النطاق: الكوأدمن = تعاونيته حصراً؛ الإدارة = كل التعاونيات أو تعاونية محددة
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

/** تجميع الطلبات على مستوى الأسبوع (آخر 12 أسبوعاً) */
function weekKey(d: Date): string {
  const dt = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = dt.getUTCDay() || 7; // الاثنين = 1
  dt.setUTCDate(dt.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(dt.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${dt.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export async function GET(req: Request) {
  const auth = await requirePermission(req, "manage:store");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  // النطاق: كوأدمن = تعاونيته؛ إدارة = الكل أو ?cooperativeId=
  const sp = new URL(req.url).searchParams;
  const days = Math.min(365, Math.max(7, Number(sp.get("days") ?? 90)));
  let cooperativeId: number | null = null;
  if (user.role === "COADMIN") {
    cooperativeId = user.cooperativeId ?? -1;
  } else if (sp.get("cooperativeId")) {
    cooperativeId = Number(sp.get("cooperativeId"));
  }
  if (cooperativeId === -1) return denied("لا توجد تعاونية مرتبطة بحسابكم");

  const productWhere: Record<string, unknown> = cooperativeId
    ? { cooperativeId }
    : {};

  // المنتجات والطلبات في النطاق
  const [products, allOrders] = await Promise.all([
    db.product.findMany({
      where: productWhere,
      select: { id: true, name: true, price: true, status: true, inStock: true, featured: true, createdAt: true },
    }),
    db.order.findMany({
      where: { product: productWhere },
      include: { product: { select: { id: true, name: true, price: true } } },
      orderBy: { createdAt: "asc" },
      take: 2000,
    }),
  ]);

  const since = new Date(Date.now() - days * 86400000);
  const orders = allOrders.filter((o) => new Date(o.createdAt) >= since);

  // ─── المؤشرات ─────────────────────────────────────────────────────────────
  const byStatus = { NEW: 0, CONTACTED: 0, DONE: 0, CANCELLED: 0 } as Record<string, number>;
  let doneRevenue = 0; // الإيرادات المحققة (الطلبات المكتملة)
  let pipelineValue = 0; // القيمة قيد المعالجة (جديد + تم التواصل)
  let doneCount = 0;
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    const value = (o.product?.price ?? 0) * o.quantity;
    if (o.status === "DONE") {
      doneRevenue += value;
      doneCount++;
    } else if (o.status === "NEW" || o.status === "CONTACTED") {
      pipelineValue += value;
    }
  }
  const totalOrders = orders.length;
  const avgOrderValue = doneCount > 0 ? Math.round(doneRevenue / doneCount) : 0;
  const completionRate = totalOrders > 0 ? Math.round((byStatus.DONE / totalOrders) * 100) : 0;

  // ─── السلاسل الزمنية (أسبوعياً) ──────────────────────────────────────────
  const weeklyMap = new Map<string, { week: string; orders: number; done: number; revenue: number }>();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(Date.now() - i * 7 * 86400000);
    const wk = weekKey(d);
    weeklyMap.set(wk, { week: wk, orders: 0, done: 0, revenue: 0 });
  }
  for (const o of orders) {
    const wk = weekKey(new Date(o.createdAt));
    const bucket = weeklyMap.get(wk);
    if (!bucket) continue;
    bucket.orders++;
    if (o.status === "DONE") {
      bucket.done++;
      bucket.revenue += (o.product?.price ?? 0) * o.quantity;
    }
  }
  const weeklySeries = [...weeklyMap.values()];

  // ─── أعلى المنتجات (بالكمية والإيراد) ─────────────────────────────────────
  const productAgg = new Map<number, { id: number; name: string; quantity: number; orders: number; revenue: number }>();
  for (const o of orders) {
    if (!o.product) continue;
    const cur = productAgg.get(o.product.id) ?? {
      id: o.product.id,
      name: o.product.name,
      quantity: 0,
      orders: 0,
      revenue: 0,
    };
    cur.quantity += o.quantity;
    cur.orders++;
    if (o.status === "DONE") cur.revenue += o.product.price * o.quantity;
    productAgg.set(o.product.id, cur);
  }
  const topProducts = [...productAgg.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8);

  // ─── حالة الكتالوج ────────────────────────────────────────────────────────
  const catalog = {
    total: products.length,
    active: products.filter((p) => p.status === "ACTIVE").length,
    hidden: products.filter((p) => p.status === "HIDDEN").length,
    outOfStock: products.filter((p) => !p.inStock).length,
    featured: products.filter((p) => p.featured).length,
  };

  return ok({
    scope: { cooperativeId, days },
    totals: { totalOrders, byStatus, doneRevenue, pipelineValue, avgOrderValue, completionRate },
    weeklySeries,
    topProducts,
    catalog,
    generatedAt: new Date().toISOString(),
  });
}
