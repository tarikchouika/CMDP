import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { coopAccessDenied, denied, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const cooperativeId = new URL(req.url).searchParams.get("cooperativeId");
  const rows = await db.document.findMany({
    where: cooperativeId ? { cooperativeId: Number(cooperativeId) } : undefined,
    orderBy: { issueDate: "desc" },
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "manage:documents");
  if ("response" in auth) return auth.response;

  const b = await readJson(req);
  if (!b.cooperativeId || !b.title) return fail("التعاونية والعنوان إلزاميان");
  if (coopAccessDenied(auth.user, Number(b.cooperativeId))) return denied("هذه التعاونية خارج نطاق صلاحياتكم");
  const row = await db.document.create({
    data: {
      cooperativeId: Number(b.cooperativeId),
      title: String(b.title),
      type: String(b.type ?? "OTHER"),
      reference: b.reference ? String(b.reference) : null,
      issueDate: toDate(b.issueDate),
      expiryDate: b.expiryDate ? toDate(b.expiryDate) : null,
      status: String(b.status ?? "VALID"),
      isShared: b.isShared === true, // مشاركة مع المتعاقدين والمصرح لهم
      notes: b.notes ? String(b.notes) : null,
    },
  });
  // ─── سجل التدقيق: إضافة وثيقة للسجل ────────────────────────────────
  await audit(req, {
    actorId: auth.user.id,
    actorName: auth.user.fullName,
    actorRole: auth.user.role,
    action: "DOCUMENT_CREATED",
    targetType: "DOCUMENT",
    targetId: row.id,
    targetLabel: row.title,
    details: { cooperativeId: row.cooperativeId, type: row.type, status: row.status, isShared: row.isShared },
  });
  return ok(row, 201);
}
