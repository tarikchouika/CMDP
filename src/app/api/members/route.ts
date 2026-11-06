import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { coopAccessDenied, denied, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const cooperativeId = new URL(req.url).searchParams.get("cooperativeId");
  const rows = await db.member.findMany({
    where: cooperativeId ? { cooperativeId: Number(cooperativeId) } : undefined,
    orderBy: [{ boardRole: "asc" }, { id: "asc" }],
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "manage:members");
  if ("response" in auth) return auth.response;

  const b = await readJson(req);
  if (!b.fullName || !b.cooperativeId) return fail("الاسم والتعاونية إلزاميان");
  const row = await db.member.create({
    data: {
      cooperativeId: Number(b.cooperativeId),
      fullName: String(b.fullName),
      cin: b.cin ? String(b.cin) : null,
      gender: b.gender ? String(b.gender) : null,
      phone: b.phone ? String(b.phone) : null,
      email: b.email ? String(b.email) : null,
      city: b.city ? String(b.city) : null,
      joinDate: toDate(b.joinDate),
      shares: b.shares ? Number(b.shares) : 1,
      boardRole: b.boardRole ? String(b.boardRole) : null,
      status: String(b.status ?? "ACTIVE"),
    },
  });
  await logAudit({
    req,
    actor: auth.user,
    action: "member.create",
    entityType: "MEMBER",
    entityId: row.id,
    summary: `تسجيل عضو جديد: ${row.fullName} (حصص: ${row.shares})`,
    details: { cooperativeId: row.cooperativeId, boardRole: row.boardRole },
  });
  return ok(row, 201);
}
