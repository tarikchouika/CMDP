// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تأكيد حضور العضو للجمع العام المبرمج
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { logAudit } from "@/lib/audit";
import { fail, ok, preflight } from "@/lib/api-server";
import { getAuthUser } from "@/lib/auth";

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
  await logAudit({
    req,
    actor: user,
    action: "assembly.attend",
    entityType: "ASSEMBLY",
    entityId: assembly.id,
    summary: `تأكيد حضور ${user.fullName} لجمع عام #${assembly.id}`,
    details: { cooperativeId: assembly.cooperativeId },
  });
  return ok({ confirmed: true, message: "تم تأكيد حضوركم — شكراً لمشاركتكم" }, 201);
}
