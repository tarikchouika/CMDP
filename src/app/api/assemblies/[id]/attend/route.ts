// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تأكيد حضور العضو للجمع العام المبرمج
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight } from "@/lib/api-server";
import { getAuthUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return fail("يلزم تسجيل الدخول لتأكيد الحضور", 401);
  if (user.role !== "USER" && user.role !== "COADMIN") {
    return fail("تأكيد الحضور مخصص لأعضاء التعاونية", 403);
  }

  const assembly = await db.assembly.findUnique({ where: { id: Number(id) } });
  if (!assembly) return fail("الجمع العام غير موجود", 404);
  if (user.cooperativeId !== assembly.cooperativeId) {
    return fail("الحضور متاح لأعضاء هذه التعاونية حصراً", 403);
  }
  if (assembly.status !== "SCHEDULED") return fail("تأكيد الحضور متاح للجموع المبرمجة فقط", 409);

  await db.assemblyAttendee.upsert({
    where: { assemblyId_userId: { assemblyId: assembly.id, userId: user.id } },
    create: { assemblyId: assembly.id, userId: user.id, confirmed: true },
    update: { confirmed: true },
  });
  // ─── سجل التدقيق: تأكيد حضور عضو ──────────────────────────────────
  await audit(req, {
    actorId: user.id,
    actorName: user.fullName,
    actorRole: user.role,
    action: "ASSEMBLY_ATTEND",
    targetType: "ASSEMBLY",
    targetId: assembly.id,
    targetLabel: assembly.agenda.slice(0, 120),
    details: { cooperativeId: assembly.cooperativeId, date: assembly.date },
  });
  return ok({ confirmed: true, message: "تم تأكيد حضوركم — شكراً لمشاركتكم" }, 201);
}
