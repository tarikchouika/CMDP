// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تصويت العضو على قرارات الجمع العام (من حقوق المنخرط حسب القانون 112.12)
// صوت واحد لكل عضو في كل جمع — FOR | AGAINST | ABSTAIN
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return fail("يلزم تسجيل الدخول للتصويت", 401);
  if (user.role !== "USER" && user.role !== "COADMIN") {
    return fail("التصويت مخصص لأعضاء التعاونية", 403);
  }

  const assembly = await db.assembly.findUnique({ where: { id: Number(id) } });
  if (!assembly) return fail("الجمع العام غير موجود", 404);
  if (user.cooperativeId !== assembly.cooperativeId) {
    return fail("التصويت متاح لأعضاء هذه التعاونية حصراً", 403);
  }
  if (assembly.status === "CANCELLED") return fail("هذا الجمع ملغى", 409);

  const b = await readJson(req);
  const decision = String(b.decision ?? "");
  if (!["FOR", "AGAINST", "ABSTAIN"].includes(decision)) {
    return fail("الصوت يجب أن يكون: موافقة أو معارضة أو امتناع");
  }

  const existing = await db.assemblyVote.findUnique({
    where: { assemblyId_userId: { assemblyId: assembly.id, userId: user.id } },
  });
  if (existing) return fail("سبق أن صوّتم في هذا الجمع — لا يمكن تغيير الصوت", 409);

  await db.assemblyVote.create({
    data: { assemblyId: assembly.id, userId: user.id, decision },
  });
  return ok({ decision, message: "تم تسجيل صوتكم بنجاح" }, 201);
}
