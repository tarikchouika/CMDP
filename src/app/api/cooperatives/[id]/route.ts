// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تحديث/حذف تعاونية
// الحقول العادية: كوأدمن التعاونية أو أدمن فأعلى
// حالة المصادقة (approvalStatus): أدمن فأعلى حصراً
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { notifyUser } from "@/lib/notify";
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
  // المصادِق (إن كان الطلب يتضمن مصادقة تسجيل) — للتوثيق التدقيقي
  let approver: typeof user | null = null;
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
    approver = auth2.user;
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
    // ── توثيق تدقيقي: تحديث بيانات/مصادقة التعاونية ────────────────────
    if (data.approvalStatus !== undefined) {
      const approved = data.approvalStatus === "APPROVED";
      await logAudit({
        req,
        actor: approver ?? user,
        action: approved ? "cooperative.approve" : data.approvalStatus === "REJECTED" ? "cooperative.reject" : "cooperative.approval_status",
        entityType: "COOPERATIVE",
        entityId: row.id,
        summary: approved
          ? `المصادقة على تسجيل تعاونية: ${existing.name}`
          : data.approvalStatus === "REJECTED"
            ? `رفض تسجيل تعاونية: ${existing.name}`
            : `تحويل حالة مصادقة ${existing.name} إلى ${String(data.approvalStatus)}`,
        details: { note: data.approvalNote ?? null, by: (approver ?? user).fullName },
        severity: "WARNING",
      });
      // إشعار رئيس التعاونية المعني إن وُجد حسابه
      const coopAdmin = await db.user.findFirst({
        where: { cooperativeId: row.id, role: "COADMIN" },
      });
      if (coopAdmin) {
        await notifyUser({
          userId: coopAdmin.id,
          type: approved ? "ACCOUNT_APPROVED" : "SYSTEM",
          title: approved ? "اعتُمد تسجيل تعاونيتكم" : "رفض تسجيل تعاونيتكم",
          body: approved
            ? `صادقت إدارة المنصة على تسجيل «${existing.name}». فُعّل حسابكم ويمكنكم تسيير التعاونية الآن.`
            : `لم تصادق إدارة المنصة على تسجيل «${existing.name}»${data.approvalNote ? ` — الملاحظة: «${String(data.approvalNote)}»` : ""}.`,
        });
      }
    } else {
      await logAudit({
        req,
        actor: user,
        action: "cooperative.update",
        entityType: "COOPERATIVE",
        entityId: row.id,
        summary: `تحديث بيانات تعاونية: ${existing.name}`,
        details: { fields: Object.keys(data).filter((k) => k !== "legalDocuments" && k !== "logo") },
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

  try {
    await db.cooperative.delete({ where: { id: Number(id) } });
    await logAudit({
      req,
      actor: auth.user,
      action: "cooperative.delete",
      entityType: "COOPERATIVE",
      entityId: Number(id),
      summary: `حذف تعاونية رقم #${Number(id)} وكل سجلاتها`,
      severity: "WARNING",
    });
    return ok({ deleted: true });
  } catch {
    return fail("تعاونية غير موجودة", 404);
  }
}
