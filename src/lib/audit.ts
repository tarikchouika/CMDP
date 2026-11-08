// ═══════════════════════════════════════════════════════════════════════════
// CMDP — سجل التدقيق (حوكمة 1.3.0)
// كتابة أحداث المنصة في AuditLog بشكل «أطلق وانسَ»: لا ترمي استثناءات أبداً
// حتى لا يعطّل فشل التدقيقُ المسارَ الأصلي للطلب.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

/** مدخلات حدث التدقيق */
export interface AuditEntry {
  actorId?: number | null; // معرّف الفاعل (null للعموم/الزوار)
  actorName: string; // اسم الفاعل المعروض
  actorRole: string; // SUPER_ADMIN | ADMIN | COADMIN | USER | PUBLIC
  action: string; // USER_LOGIN | SUPER_ADMIN_CREATED | COOPERATIVE_UPDATED ...
  targetType?: string | null; // USER | COOPERATIVE | MEMBER | ORDER | PRODUCT ...
  targetId?: number | null;
  targetLabel?: string | null; // تسمية توضيحية للهدف
  severity?: "INFO" | "WARNING" | "CRITICAL"; // الافتراضي INFO
  ip?: string; // يُستخرج تلقائياً من الطلب إن لم يُمرَّر
  details?: unknown; // سياق إضافي — يُسلسل JSON
}

/** استخراج عنوان IP من ترويسة x-forwarded-for */
function extractIp(req: Request | null): string | null {
  if (!req) return null;
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim() || null;
  return null;
}

/**
 * كتابة حدث في سجل التدقيق — آمنة ضد الفشل:
 * أي خطأ يُبتلع بصمت (مع تسجيل في وحدة التحكم) ولا يؤثر على الطلب الأصلي.
 */
export async function audit(req: Request | null, entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorId: entry.actorId ?? null,
        actorName: entry.actorName,
        actorRole: entry.actorRole,
        action: entry.action,
        targetType: entry.targetType ?? null,
        targetId: entry.targetId ?? null,
        targetLabel: entry.targetLabel ?? null,
        severity: entry.severity ?? "INFO",
        ip: entry.ip ?? extractIp(req),
        details:
          entry.details === undefined
            ? null
            : JSON.stringify(entry.details, (_k, v) => (typeof v === "bigint" ? Number(v) : v)),
      },
    });
  } catch (e) {
    // لا نرمي أبداً — التدقيق لا يجب أن يكسر المسار الأصلي
    console.error("[audit] تعذر تسجيل الحدث:", entry.action, e);
  }
}
