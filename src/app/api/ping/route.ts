// ═══════════════════════════════════════════════════════════════════════════
// CMDP — فحص حيوية الباك إند (حوكمة 1.3.0)
// مسار عمومي بلا مصادقة: يرجع 200 دائماً مع طابع زمني — للتطبيقات والمراقبة
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { CORS_HEADERS } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  return NextResponse.json(
    { ok: true, ts: Date.now() },
    { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } }
  );
}
