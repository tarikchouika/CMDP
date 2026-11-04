// ═══════════════════════════════════════════════════════════════════════════
// CMDP — مساعدات مسارات API (استجابات JSON + ترويسات CORS للباك إند المحلي)
// ═══════════════════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export function ok(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: CORS_HEADERS });
}

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status, headers: CORS_HEADERS });
}

export function preflight() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

/** قراءة جسم الطلب بأمان */
export async function readJson<T = Record<string, unknown>>(req: Request): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

/** تحويل الحقول النصية للتواريخ قبل الحفظ في Prisma */
export function toDate(v: unknown, fallback?: Date): Date {
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return fallback ?? new Date();
}
