// ═══════════════════════════════════════════════════════════════════════════
// CMDP — سجل التعاونيات
// GET: فلترة حسب حالة المصادقة (تُستعمل عمومياً لقائمة الانخراط)
// POST: إنشاء مباشر — حصري للأدمن فأعلى (تصادق عليه المنصة تلقائياً)
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sanitizeFiles, sanitizePhoto } from "@/lib/attachments";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const approvalStatus = url.searchParams.get("approvalStatus");
  const rows = await db.cooperative.findMany({
    where: approvalStatus ? { approvalStatus } : undefined,
    orderBy: { id: "asc" },
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "create:cooperatives");
  if ("response" in auth) return auth.response;

  const b = await readJson(req);
  if (!b.name || !b.registrationNumber) return fail("الاسم ورقم التسجيل إلزاميان");
  try {
    const row = await db.cooperative.create({
      data: {
        name: String(b.name),
        registrationNumber: String(b.registrationNumber),
        odcCardNumber: b.odcCardNumber ? String(b.odcCardNumber) : null,
        sector: String(b.sector ?? "الخدمات"),
        region: String(b.region ?? ""),
        province: String(b.province ?? ""),
        commune: b.commune ? String(b.commune) : null,
        presidentName: String(b.presidentName ?? ""),
        phone: b.phone ? String(b.phone) : null,
        email: b.email ? String(b.email) : null,
        address: b.address ? String(b.address) : null,
        foundingDate: toDate(b.foundingDate),
        status: String(b.status ?? "ACTIVE"),
        approvalStatus: "APPROVED", // الإنشاء من الإدارة = مسجلة
        notes: b.notes ? String(b.notes) : null,
        // لوغو التعاونية + الوثائق القانونية — نفس تعقيم التسجيل العمومي
        logo: sanitizePhoto(b.logo),
        legalDocuments: JSON.stringify(sanitizeFiles(b.legalDocuments, 12)) || null,
      },
    });
    // ─── سجل التدقيق: إنشاء تعاونية مباشرة من الإدارة ──────────────
    await audit(req, {
      actorId: auth.user.id,
      actorName: auth.user.fullName,
      actorRole: auth.user.role,
      action: "COOPERATIVE_CREATED",
      targetType: "COOPERATIVE",
      targetId: row.id,
      targetLabel: row.name,
      details: { registrationNumber: row.registrationNumber, region: row.region, sector: row.sector },
    });
    return ok(row, 201);
  } catch {
    return fail("تعذر إنشاء التعاونية — تحقق من عدم تكرار رقم التسجيل", 409);
  }
}
