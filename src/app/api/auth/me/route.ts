// ═══════════════════════════════════════════════════════════════════════════
// CMDP — التحقق من الجلسة الحالية: GET /api/auth/me
// تعيده الواجهة عند الإقلاع للتأكد من صلاحية الرمز المخزَّن (توافق الجلسات
// القديمة بعد ترقية قاعدة البيانات) — بديل نظيف عن البقاء على جلسة ميتة.
// ═══════════════════════════════════════════════════════════════════════════

import { ok, preflight } from "@/lib/api-server";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const user = await getAuthUser(req);
  if (!user) {
    return Response.json(
      { error: "الجلسة غير صالحة أو منتهية الصلاحية" },
      { status: 401, headers: { "Access-Control-Allow-Origin": "*" } }
    );
  }
  return ok({ user });
}
