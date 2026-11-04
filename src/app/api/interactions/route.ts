import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  const rows = await db.entityInteraction.findMany({
    orderBy: { date: "desc" },
    include: { entity: true },
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b.entityId || !b.subject) return fail("الجهة والموضوع إلزاميان");
  const row = await db.entityInteraction.create({
    data: {
      entityId: Number(b.entityId),
      cooperativeId: b.cooperativeId ? Number(b.cooperativeId) : null,
      date: toDate(b.date),
      type: String(b.type ?? "REQUEST"),
      subject: String(b.subject),
      status: String(b.status ?? "PENDING"),
      notes: b.notes ? String(b.notes) : null,
    },
  });
  return ok(row, 201);
}
