import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { coopAccessDenied, denied, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

type Attachment = { name: string; type: string; size: number; dataUrl: string };

/** تنظيف مرفقات إثبات الحركة (فاتورة/وصل أداء) */
function sanitizeFiles(input: unknown, maxFiles = 8): string | null {
  if (!Array.isArray(input) || input.length === 0) return null;
  const out: Attachment[] = [];
  for (const raw of input.slice(0, maxFiles)) {
    const f = raw as Partial<Attachment>;
    if (typeof f?.dataUrl !== "string") continue;
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(String(f.type))) continue;
    if (f.dataUrl.length > 6_000_000) continue;
    out.push({ name: String(f.name ?? "ملف").slice(0, 160), type: String(f.type), size: Number(f.size) || 0, dataUrl: f.dataUrl });
    if (out.length >= maxFiles) break;
  }
  return out.length > 0 ? JSON.stringify(out) : null;
}

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
  const auth = await requirePermission(req, "manage:finance");
  if ("response" in auth) return auth.response;

  const b = await readJson(req);
  if (!b.cooperativeId || b.amount === undefined || !b.category) {
  if (coopAccessDenied(auth.user, Number(b.cooperativeId))) return denied("هذه التعاونية خارج نطاق صلاحياتكم");
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
      proofFiles: sanitizeFiles(b.proofFiles),
    },
  });
  // ─── سجل التدقيق: تسجيل حركة مالية ────────────────────────────────
  await audit(req, {
    actorId: auth.user.id,
    actorName: auth.user.fullName,
    actorRole: auth.user.role,
    action: "TRANSACTION_CREATED",
    targetType: "TRANSACTION",
    targetId: row.id,
    targetLabel: `${row.type === "INCOME" ? "مدخل" : "مصروف"} — ${row.category}`,
    details: { cooperativeId: row.cooperativeId, type: row.type, category: row.category, amount: row.amount, method: row.method },
  });
  return ok(row, 201);
}
