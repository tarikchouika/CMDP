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
  const rows = await db.meeting.findMany({
    where: cooperativeId ? { cooperativeId: Number(cooperativeId) } : undefined,
    orderBy: { date: "desc" },
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "manage:assemblies");
  if ("response" in auth) return auth.response;

  const b = await readJson(req);
  if (!b.cooperativeId || !b.agenda) return fail("التعاونية وجدول الأعمال إلزاميان");
  if (coopAccessDenied(auth.user, Number(b.cooperativeId))) return denied("هذه التعاونية خارج نطاق صلاحياتكم");
  const row = await db.meeting.create({
    data: {
      cooperativeId: Number(b.cooperativeId),
      date: toDate(b.date),
      agenda: String(b.agenda),
      decisions: b.decisions ? String(b.decisions) : null,
      attendeesCount: b.attendeesCount ? Number(b.attendeesCount) : 0,
    },
  });
  await logAudit({
    req,
    actor: auth.user,
    action: "meeting.create",
    entityType: "MEETING",
    entityId: row.id,
    summary: `برمجة اجتماع مجلس الإدارة بتاريخ ${row.date}`,
    details: { cooperativeId: row.cooperativeId },
  });
  return ok(row, 201);
}
