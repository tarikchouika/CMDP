// ═══════════════════════════════════════════════════════════════════════════
// CMDP — سجل الأحداث التدقيقي: توثيق كل حدث مهم في المنصة
// تصميم «أفضل جهد»: لا يفشل الطلب الأصلي أبداً بسبب السجل؛ يُسجَّل الخطأ
// في الكونسول فقط. السجل غير قابل للحذف أو التعديل من أي طرف.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/types";

export type AuditSeverity = "INFO" | "WARNING" | "CRITICAL";

export interface AuditInput {
  /** الطلب الأصلي (لاستخراج IP/وكيل المستخدم) — اختياري */
  req?: Request;
  /** الفاعل — يُترك anonymous للأحداث غير المصادقة (محاولات دخول فاشلة…) */
  actor?: SessionUser | null;
  /** رمز الحدث: auth.login | user.suspend | super_admin.add | ownership.transfer … */
  action: string;
  /** نوع الكيان: USER | COOPERATIVE | PLATFORM | TRANSACTION | … */
  entityType: string;
  entityId?: string | number | null;
  /** وصف عربي مقروء يظهر في السجل */
  summary: string;
  /** سياق إضافي (أسباب، قيم قبل/بعد) — يخزن JSON */
  details?: Record<string, unknown> | null;
  severity?: AuditSeverity;
}

/** استخراج عنوان IP من الترويسات (خلف النفق: CF-Connecting-IP) */
function clientIp(req?: Request): string | null {
  if (!req) return null;
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

/**
 * توثيق حدث في سجل الأحداث — استدعاء غير محجوب:
 * يُستدعى بعد نجاح العملية (أو عند محاولة غير مصرح بها) ولا يرمي أبداً.
 */
export async function logAudit(input: AuditInput): Promise<void> {
  const { req, actor, action, entityType, entityId, summary, details, severity } = input;
  try {
    await db.auditLog.create({
      data: {
        actorId: actor?.id ?? null,
        actorUsername: actor?.username ?? "anonymous",
        actorRole: actor?.role ?? "anonymous",
        action,
        entityType,
        entityId: entityId != null ? String(entityId) : null,
        summary,
        details: details ? JSON.stringify(details) : null,
        severity: severity ?? "INFO",
        ip: clientIp(req),
        userAgent: req?.headers.get("user-agent")?.slice(0, 250) ?? null,
      },
    });
  } catch (e) {
    // السجل لا يعطل المنصة أبداً — خطأ التسجيل يظهر في الكونسول فقط
    console.error("[audit] فشل توثيق الحدث:", action, e);
  }
}

/** توثيق محاولة وصول مرفوضة (403) — حدث أمني بدرجة تحذير */
export async function logDenied(
  req: Request,
  actor: SessionUser | null,
  action: string,
  entityType: string,
  entityId?: string | number | null,
  summary?: string
): Promise<void> {
  await logAudit({
    req,
    actor,
    action: `${action}.denied`,
    entityType,
    entityId,
    summary: summary ?? "محاولة وصول مرفوضة",
    severity: "WARNING",
  });
}
