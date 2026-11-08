// ═══════════════════════════════════════════════════════════════════════════
// CMDP — المتجر: المنتجات
// • عمومي (بدون mine): المنتجات النشطة المعروضة في المتجر
// • إداري (mine=1): كل منتجات التعاونية (نشطة ومخفية) لإدارتها
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;

  // ─── قائمة الإدارة: كل منتجات التعاونية (نشطة + مخفية) ───────────────────
  if (sp.get("mine") === "1") {
    const auth = await requirePermission(req, "manage:store");
    if ("response" in auth) return auth.response;
    const { user } = auth;
    const where: Record<string, unknown> =
      user.role === "COADMIN"
        ? { cooperativeId: user.cooperativeId ?? -1 }
        : sp.get("cooperativeId")
          ? { cooperativeId: Number(sp.get("cooperativeId")) }
          : {};
    const rows = await db.product.findMany({
      where,
      include: {
        cooperative: { select: { id: true, name: true, region: true, sector: true } },
        _count: { select: { orders: true } },
      },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 500,
    });
    return ok(rows);
  }

  // ─── القائمة العمومية: المنتجات النشطة فقط ───────────────────────────────
  const category = sp.get("category");
  const q = sp.get("q");
  const where: Record<string, unknown> = { status: "ACTIVE" };
  if (category && category !== "ALL") where.category = category;
  if (q) where.name = { contains: q };
  const rows = await db.product.findMany({
    where,
    include: { cooperative: { select: { id: true, name: true, region: true, sector: true } } },
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: 200,
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "manage:store");
  if ("response" in auth) return auth.response;

  const b = await readJson(req);
  if (!b.name || !b.category || b.price === undefined || !b.cooperativeId) {
    return fail("اسم المنتج والفئة والسعر والتعاونية إلزاميون");
  }
  if (auth.user.role === "COADMIN" && Number(b.cooperativeId) !== auth.user.cooperativeId) {
    return denied("هذه التعاونية خارج نطاق صلاحياتكم");
  }
  const price = Number(b.price);
  if (!Number.isFinite(price) || price < 0) return fail("السعر غير صالح");
  const row = await db.product.create({
    data: {
      cooperativeId: Number(b.cooperativeId),
      name: String(b.name).slice(0, 160),
      description: b.description ? String(b.description).slice(0, 1500) : null,
      category: String(b.category),
      unit: b.unit ? String(b.unit) : null,
      price,
      imageUrl: b.imageUrl ? String(b.imageUrl) : null,
      featured: Boolean(b.featured),
      inStock: b.inStock === undefined ? true : Boolean(b.inStock),
      status: b.status === "HIDDEN" ? "HIDDEN" : "ACTIVE",
    },
  });
  // ─── سجل التدقيق: إضافة منتج للمتجر ──────────────────────────────
  await audit(req, {
    actorId: auth.user.id,
    actorName: auth.user.fullName,
    actorRole: auth.user.role,
    action: "PRODUCT_CREATED",
    targetType: "PRODUCT",
    targetId: row.id,
    targetLabel: row.name,
    details: { cooperativeId: row.cooperativeId, category: row.category, price: row.price },
  });
  return ok(row, 201);
}
