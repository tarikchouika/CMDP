import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const cooperativeId = new URL(req.url).searchParams.get("cooperativeId");
  const rows = await db.complianceTask.findMany({
    where: cooperativeId ? { cooperativeId: Number(cooperativeId) } : undefined,
    orderBy: { dueDate: "asc" },
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b.cooperativeId || !b.title) return fail("التعاونية والعنوان إلزاميان");
  const row = await db.complianceTask.create({
    data: {
      cooperativeId: Number(b.cooperativeId),
      title: String(b.title),
      description: b.description ? String(b.description) : null,
      type: String(b.type ?? "OTHER"),
      dueDate: toDate(b.dueDate),
      status: String(b.status ?? "PENDING"),
    },
  });
  return ok(row, 201);
}
