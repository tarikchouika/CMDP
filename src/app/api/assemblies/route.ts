import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { getAuthUser, requirePermission, coopAccessDenied, denied } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const cooperativeId = new URL(req.url).searchParams.get("cooperativeId");
  const rows = await db.assembly.findMany({
    where: cooperativeId ? { cooperativeId: Number(cooperativeId) } : undefined,
    orderBy: { date: "desc" },
  });

  // إثراء بصوت المستخدم وحضوره (لأعضاء التعاونية المعنية)
  const user = await getAuthUser(req);
  if (user && user.cooperativeId != null && String(user.cooperativeId) === String(cooperativeId ?? user.cooperativeId)) {
    const votes = await db.assemblyVote.findMany({ where: { userId: user.id } });
    const attends = await db.assemblyAttendee.findMany({ where: { userId: user.id } });
    const voteMap = new Map(votes.map((v) => [v.assemblyId, v.decision]));
    const attendMap = new Set(attends.map((a) => a.assemblyId));
    return ok(
      rows.map((r) => ({
        ...r,
        myVote: voteMap.get(r.id) ?? null,
        myAttendance: attendMap.has(r.id),
      }))
    );
  }
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "manage:assemblies");
  if ("response" in auth) return auth.response;
  const b = await readJson(req);
  if (!b.cooperativeId || !b.agenda) return fail("التعاونية وجدول الأعمال إلزاميان");
  if (coopAccessDenied(auth.user, Number(b.cooperativeId))) return denied("هذه التعاونية خارج نطاق صلاحياتكم");
  const row = await db.assembly.create({
    data: {
      cooperativeId: Number(b.cooperativeId),
      type: String(b.type ?? "ORDINARY"),
      date: toDate(b.date),
      location: b.location ? String(b.location) : null,
      agenda: String(b.agenda),
      decisions: b.decisions ? String(b.decisions) : null,
      attendeesCount: b.attendeesCount ? Number(b.attendeesCount) : 0,
      status: String(b.status ?? "SCHEDULED"),
    },
  });
  // ─── سجل التدقيق: برمجة جمع عام ──────────────────────────────────
  await audit(req, {
    actorId: auth.user.id,
    actorName: auth.user.fullName,
    actorRole: auth.user.role,
    action: "ASSEMBLY_CREATED",
    targetType: "ASSEMBLY",
    targetId: row.id,
    targetLabel: row.agenda.slice(0, 120),
    details: { cooperativeId: row.cooperativeId, type: row.type, date: row.date, status: row.status },
  });
  return ok(row, 201);
}
