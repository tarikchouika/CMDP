// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إعادة تفعيل سوبر أدمين موقوف (حوكمة 1.3.0) — المالك حصراً
// يعيد الحساب إلى ACTIVE ويمحو آثار الإجراء المنضبط (الإشعار والأجل والتوقيف)
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await getAuthUser(req);
  if (!owner) return fail("يلزم تسجيل الدخول للقيام بهذه العملية", 401);
  if (!owner.isPlatformOwner) return denied("هذه العملية حصرية لمالك المنصة");

  const target = await db.user.findUnique({ where: { id: Number(id) } });
  if (!target) return fail("الحساب غير موجود", 404);
  if (target.role !== "SUPER_ADMIN") return fail("هذا الإجراء يخص حسابات سوبر أدمين حصراً");
  if (target.isPlatformOwner) return fail("مالك المنصة مفعَّل دائماً");
  if (target.status !== "SUSPENDED") return fail("هذا الحساب ليس موقوفاً", 409);

  const b = await readJson(req);
  const note = b.note ? String(b.note).slice(0, 1000) : null;

  await db.user.update({
    where: { id: target.id },
    data: {
      status: "ACTIVE",
      suspendedAt: null,
      noticeDeadline: null,
      noticedAt: null,
    },
  });

  // ─── إشعار داخل المنصة بإعادة التفعيل ─────────────────────────────────
  await db.notification.create({
    data: {
      userId: target.id,
      type: "ACCOUNT_REINSTATED",
      title: "تمت إعادة تفعيل حسابك",
      body:
        `قرّر مالك المنصة إعادة تفعيل حسابكم في منصة CMDP.` +
        (note ? `\nملاحظة المالك: ${note}` : "") +
        `\nيمكنكم الآن تسجيل الدخول ومباشرة مهامكم من جديد.`,
      meta: JSON.stringify({ note, reinstatedAt: new Date().toISOString() }),
    },
  });

  // ─── سجل التدقيق: إعادة تفعيل ─────────────────────────────────────────
  await audit(req, {
    actorId: owner.id,
    actorName: owner.fullName,
    actorRole: owner.role,
    action: "SUPER_ADMIN_REINSTATED",
    targetType: "USER",
    targetId: target.id,
    targetLabel: target.username,
    details: { note },
  });

  return ok({ reinstated: true, username: target.username });
}
