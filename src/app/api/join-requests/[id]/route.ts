// ═══════════════════════════════════════════════════════════════════════════
// CMDP — معالجة طلب الانخراط: مصادقة (إنشاء العضوية) أو رفض
// المصادقة تفعّل الحساب المرتبط وتضيف العضو إلى سجل أعضاء التعاونية
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requirePermission(req, "approve:users");
  if ("response" in auth) return auth.response;
  const { user: actor } = auth;

  const request = await db.joinRequest.findUnique({ where: { id: Number(id) } });
  if (!request) return fail("الطلب غير موجود", 404);
  if (actor.role === "COADMIN" && request.cooperativeId !== actor.cooperativeId) {
    return denied("هذا الطلب خارج نطاق تعاونيتك");
  }
  if (request.status !== "PENDING") return fail("تمت معالجة هذا الطلب مسبقاً", 409);

  const b = await readJson(req);
  const action = String(b.action ?? "");
  if (!["APPROVED", "REJECTED"].includes(action)) return fail("الإجراء يجب أن يكون قبولاً أو رفضاً");

  if (action === "REJECTED") {
    await db.joinRequest.update({
      where: { id: request.id },
      data: {
        status: "REJECTED",
        decidedBy: actor.fullName,
        decisionNote: b.note ? String(b.note) : null,
      },
    });
    if (request.userId) {
      await db.user.update({ where: { id: request.userId }, data: { status: "REJECTED" } });
    }
    return ok({ status: "REJECTED" });
  }

  // ─── المصادقة: تفعيل الحساب + إحداث العضوية ──────────────────────────────
  await db.joinRequest.update({
    where: { id: request.id },
    data: {
      status: "APPROVED",
      decidedBy: actor.fullName,
      decisionNote: b.note ? String(b.note) : null,
    },
  });
  if (request.userId) {
    await db.user.update({ where: { id: request.userId }, data: { status: "ACTIVE" } });
  }
  if (request.requestType === "MEMBERSHIP") {
    const already = await db.member.findFirst({
      where: { cooperativeId: request.cooperativeId, fullName: request.fullName },
    });
    if (!already) {
      await db.member.create({
        data: {
          cooperativeId: request.cooperativeId,
          fullName: request.fullName,
          cin: request.cin,
          phone: request.phone,
          email: request.email,
          shares: request.shares || 1,
          status: "ACTIVE",
        },
      });
    }
  }
  return ok({ status: "APPROVED" });
}
