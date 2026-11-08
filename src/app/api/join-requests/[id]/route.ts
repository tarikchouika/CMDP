// ═══════════════════════════════════════════════════════════════════════════
// CMDP — معالجة طلب الانخراط: مصادقة (إنشاء العضوية) أو رفض
// المصادقة تفعّل الحساب المرتبط وتضيف العضو إلى سجل أعضاء التعاونية
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";
import { audit } from "@/lib/audit";

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
    // ─── سجل التدقيق: قرار رفض طلب انخراط ──────────────────────────
    await audit(req, {
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      action: "JOIN_REQUEST_DECIDED",
      targetType: "JOIN_REQUEST",
      targetId: request.id,
      targetLabel: request.fullName,
      severity: "WARNING",
      details: {
        decision: "REJECTED",
        cooperativeId: request.cooperativeId,
        requestType: request.requestType,
        note: b.note ? String(b.note) : null,
        linkedUserId: request.userId,
      },
    });
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
  // ─── سجل التدقيق: قرار قبول طلب انخراط ──────────────────────────
  await audit(req, {
    actorId: actor.id,
    actorName: actor.fullName,
    actorRole: actor.role,
    action: "JOIN_REQUEST_DECIDED",
    targetType: "JOIN_REQUEST",
    targetId: request.id,
    targetLabel: request.fullName,
    severity: "WARNING",
    details: {
      decision: "APPROVED",
      cooperativeId: request.cooperativeId,
      requestType: request.requestType,
      note: b.note ? String(b.note) : null,
      linkedUserId: request.userId,
      memberCreated: request.requestType === "MEMBERSHIP",
    },
  });
  return ok({ status: "APPROVED" });
}
