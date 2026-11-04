import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const cooperativeId = new URL(req.url).searchParams.get("cooperativeId");
  const rows = await db.meeting.findMany({
    where: cooperativeId ? { cooperativeId: Number(cooperativeId) } : undefined,
    orderBy: { date: "desc" },
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b.cooperativeId || !b.agenda) return fail("التعاونية وجدول الأعمال إلزاميان");
  const row = await db.meeting.create({
    data: {
      cooperativeId: Number(b.cooperativeId),
      date: toDate(b.date),
      agenda: String(b.agenda),
      decisions: b.decisions ? String(b.decisions) : null,
      attendeesCount: b.attendeesCount ? Number(b.attendeesCount) : 0,
    },
  });
  return ok(row, 201);
}
