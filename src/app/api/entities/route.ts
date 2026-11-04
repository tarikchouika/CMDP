import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  const rows = await db.govEntity.findMany({
    orderBy: { id: "asc" },
    include: { _count: { select: { interactions: true } } },
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const b = await readJson(req);
  if (!b.name) return fail("اسم الجهة إلزامي");
  const row = await db.govEntity.create({
    data: {
      name: String(b.name),
      acronym: b.acronym ? String(b.acronym) : null,
      type: String(b.type ?? "AGENCY"),
      supervisor: b.supervisor ? String(b.supervisor) : null,
      missions: String(b.missions ?? ""),
      website: b.website ? String(b.website) : null,
      phone: b.phone ? String(b.phone) : null,
      email: b.email ? String(b.email) : null,
      address: b.address ? String(b.address) : null,
    },
  });
  return ok(row, 201);
}
