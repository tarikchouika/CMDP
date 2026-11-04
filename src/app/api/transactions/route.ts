import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const cooperativeId = new URL(req.url).searchParams.get("cooperativeId");
  const rows = await db.transaction.findMany({
    where: cooperativeId ? { cooperativeId: Number(cooperativeId) } : undefined,
    orderBy: { date: "desc" },
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b.cooperativeId || b.amount === undefined || !b.category) {
    return fail("التعاونية والمبلغ والفئة إلزاميون");
  }
  const row = await db.transaction.create({
    data: {
      cooperativeId: Number(b.cooperativeId),
      type: String(b.type ?? "EXPENSE"),
      category: String(b.category),
      amount: Number(b.amount),
      date: toDate(b.date),
      description: b.description ? String(b.description) : null,
      method: String(b.method ?? "CASH"),
      reference: b.reference ? String(b.reference) : null,
    },
  });
  return ok(row, 201);
}
