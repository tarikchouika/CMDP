// ═══════════════════════════════════════════════════════════════════════════
// CMDP — منطق مشترك لمسار السوبر أدمين العادل (يستهلكه كل من ملفات المسار)
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { isPlatformOwner } from "@/lib/permissions";
import { logDenied } from "@/lib/audit";
import type { SessionUser } from "@/lib/types";

export type TargetUser = NonNullable<Awaited<ReturnType<typeof db.user.findUnique>>>;

/** فك إشعار التوقيف المخزن JSON */
export function parseNotice(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as {
      reason: string;
      effectiveAt: string;
      issuedAt: string;
      issuedBy: string;
      response?: string;
      respondedAt?: string;
    };
  } catch {
    return null;
  }
}

/** رد 401 موحد */
export function unauthenticated(): Response {
  return Response.json(
    { error: "يلزم تسجيل الدخول للقيام بهذه العملية" },
    { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
  );
}

/** حارس المالك: كل إجراءات السوبر أدمين للمالك حصراً */
export async function ownerOnly(req: Request): Promise<SessionUser | Response> {
  const actor = await getAuthUser(req);
  if (!actor) return unauthenticated();
  if (!isPlatformOwner(actor)) {
    await logDenied(req, actor, "super_admins.access", "PLATFORM", null, "إدارة السوبر أدمين: المالك حصراً");
    return denied("إجراءات السوبر أدمين من اختصاص مالك المنصة حصراً");
  }
  return actor;
}

/** حارس الهدف: سوبر أدمين غير المالك (حساب المالك محمي تماماً) */
export async function loadTarget(id: number): Promise<{ target: TargetUser } | { error: Response }> {
  const target = await db.user.findUnique({ where: { id } });
  if (!target) return { error: fail("الحساب الهدف غير موجود", 404) as Response };
  if (target.role !== "SUPER_ADMIN") {
    return { error: denied("هذه الوحدة تدير حسابات السوبر أدمين حصراً") as Response };
  }
  if (target.isOwner) {
    return { error: denied("حساب مالك المنصة محمي بالكامل — لا يُوقف ولا يُحذف ولا يُدار") as Response };
  }
  return { target };
}

/** تمثيل آمن لسوبر أدمين في القوائم (بلا عناصر حساسة) */
export function toView(u: TargetUser) {
  return {
    id: u.id,
    username: u.username,
    fullName: u.fullName,
    phone: u.phone,
    email: u.email,
    role: u.role,
    status: u.status,
    isOwner: u.isOwner,
    suspensionNotice: u.suspensionNotice,
    suspensionReason: u.suspensionReason,
    suspendedAt: u.suspendedAt,
    createdAt: u.createdAt,
  };
}
