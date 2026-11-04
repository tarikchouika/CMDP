// ═══════════════════════════════════════════════════════════════════════════
// CMDP — المتجر: المنتجات (عمومي للقراءة، إداري للنشر)
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
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
  const auth = await requirePermission(req, "post:opportunities");
  if ("response" in auth) return auth.response;

  const b = await readJson(req);
  if (!b.name || !b.category || b.price === undefined || !b.cooperativeId) {
    return fail("اسم المنتج والفئة والسعر والتعاونية إلزاميون");
  }
  if (auth.user.role === "COADMIN" && Number(b.cooperativeId) !== auth.user.cooperativeId) {
    return denied("هذه التعاونية خارج نطاق صلاحياتكم");
  }
  const row = await db.product.create({
    data: {
      cooperativeId: Number(b.cooperativeId),
      name: String(b.name).slice(0, 160),
      description: b.description ? String(b.description).slice(0, 1500) : null,
      category: String(b.category),
      unit: b.unit ? String(b.unit) : null,
      price: Number(b.price),
      imageUrl: b.imageUrl ? String(b.imageUrl) : null,
      featured: Boolean(b.featured),
      inStock: b.inStock === undefined ? true : Boolean(b.inStock),
    },
  });
  return ok(row, 201);
}
