// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تحديث/حذف تعاونية
// الحقول العادية: كوأدمن التعاونية أو أدمن فأعلى
// حالة المصادقة (approvalStatus): أدمن فأعلى حصراً
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sanitizeFiles, sanitizePhoto } from "@/lib/attachments";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, "manage:cooperative");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const existing = await db.cooperative.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("تعاونية غير موجودة", 404);
  if (user.role === "COADMIN" && existing.id !== user.cooperativeId) {
    return denied("هذه التعاونية خارج نطاق صلاحياتكم");
  }

  const b = await readJson(req);
  const data: Record<string, unknown> = {};
  for (const k of [
    "name",
    "registrationNumber",
    "odcCardNumber",
    "sector",
    "region",
    "province",
    "commune",
    "presidentName",
    "phone",
    "email",
    "address",
    "status",
    "notes",
  ]) {
    if (k in b) data[k] = b[k] === null ? null : String(b[k]);
  }
  if (b.foundingDate !== undefined) data.foundingDate = toDate(b.foundingDate);

  // ── لوغو + وثائق قانونية (JSON مفرد/مصفوفة) — تحديث اختياري عند الإرسال فقط ─
  if (b.logo !== undefined) data.logo = sanitizePhoto(b.logo);
  if (b.legalDocuments !== undefined)
    data.legalDocuments = JSON.stringify(sanitizeFiles(b.legalDocuments, 12)) || null;

  // ─── المصادقة على التسجيل: أدمن فأعلى ────────────────────────────────────
  if (b.approvalStatus !== undefined) {
    const auth2 = await requirePermission(req, "approve:cooperatives");
    if ("response" in auth2) return auth2.response;
    const status = String(b.approvalStatus);
    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) return fail("حالة مصادقة غير صحيحة");
    data.approvalStatus = status;
    data.approvalNote = b.approvalNote ? String(b.approvalNote) : null;

    // المصادقة تفعّل حساب رئيس التعاونية المرتبط بالطلب
    if (status === "APPROVED" && existing.approvalStatus === "PENDING") {
      await db.user.updateMany({
        where: { cooperativeId: existing.id, status: "PENDING", role: "COADMIN" },
        data: { status: "ACTIVE" },
      });
    }
    if (status === "REJECTED") {
      await db.user.updateMany({
        where: { cooperativeId: existing.id, status: "PENDING" },
        data: { status: "REJECTED" },
      });
    }
  }

  try {
    const row = await db.cooperative.update({
      where: { id: Number(id) },
      data: data as unknown as Prisma.CooperativeUpdateInput,
    });
    // ─── سجل التدقيق: تغيير حالة المصادقة إنذار، وما دونه معلومة ──────
    if (data.approvalStatus !== undefined && data.approvalStatus !== existing.approvalStatus) {
      await audit(req, {
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        action: "COOPERATIVE_STATUS_CHANGED",
        targetType: "COOPERATIVE",
        targetId: row.id,
        targetLabel: row.name,
        severity: "WARNING",
        details: {
          from: existing.approvalStatus,
          to: data.approvalStatus,
          approvalNote: data.approvalNote ?? null,
          fields: Object.keys(data),
        },
      });
    } else {
      await audit(req, {
        actorId: user.id,
        actorName: user.fullName,
        actorRole: user.role,
        action: "COOPERATIVE_UPDATED",
        targetType: "COOPERATIVE",
        targetId: row.id,
        targetLabel: row.name,
        details: { fields: Object.keys(data) },
      });
    }
    return ok(row);
  } catch {
    return fail("تعذر التحديث — تحقق من القيم", 409);
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, "approve:cooperatives");
  if ("response" in auth) return auth.response;

  const existing = await db.cooperative.findUnique({ where: { id: Number(id) } });
  if (!existing) return fail("تعاونية غير موجودة", 404);

  try {
    await db.cooperative.delete({ where: { id: Number(id) } });
    // ─── سجل التدقيق: حذف نهائي لملف تعاونية ──────────────────────
    await audit(req, {
      actorId: auth.user.id,
      actorName: auth.user.fullName,
      actorRole: auth.user.role,
      action: "COOPERATIVE_DELETED",
      targetType: "COOPERATIVE",
      targetId: existing.id,
      targetLabel: existing.name,
      severity: "WARNING",
      details: {
        name: existing.name,
        registrationNumber: existing.registrationNumber,
        sector: existing.sector,
        region: existing.region,
        approvalStatus: existing.approvalStatus,
      },
    });
    return ok({ deleted: true });
  } catch {
    return fail("تعاونية غير موجودة", 404);
  }
}
