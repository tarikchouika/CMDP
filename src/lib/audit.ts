// ═══════════════════════════════════════════════════════════════════════════
// CMDP — سجل التدقيق (حوكمة 1.3.0)
// كتابة أحداث المنصة في AuditLog بشكل «أطلق وانسَ»: لا ترمي استثناءات أبداً
// حتى لا يعطّل فشل التدقيقُ المسارَ الأصلي للطلب.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import type { SessionUser } from "@/lib/types";

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

// ═══════════════════════════════════════════════════════════════════════════
// توافق توحيد 1.3.4 (CMDP-059/MERGE): محوّل من واجهة logAudit التي تستعملها
// مسارات الخط البعيد المستخلصة (assemblies/[id], meetings, tasks, interactions,
// opportunities/apply) إلى مدوّنة التدقيق المحلية أعلاه — نفس الجدول والقاعدة،
// بلا أي ازدواجية. الرموز المنقّطة (assembly.update) تُطبَّع إلى عرفنا
// الأعلى (ASSEMBLY_UPDATED) لتظهر بمسمياتها في لوحة المنصة.
// ═══════════════════════════════════════════════════════════════════════════

export interface AuditInputCompat {
  req?: Request;
  actor?: SessionUser | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  summary: string;
  details?: Record<string, unknown> | null;
  severity?: "INFO" | "WARNING" | "CRITICAL";
}

/** تطبيع رمز الفعل المنقّط إلى عرف UPPER_SNAKE المحلي */
function compatAction(action: string): string {
  if (!action.includes(".")) return action;
  let base = action;
  let suffix = "";
  if (base.endsWith(".denied")) {
    suffix = "_DENIED";
    base = base.slice(0, -".denied".length);
  }
  const [entity, verb = ""] = base.split(".");
  const VERBS: Record<string, string> = {
    CREATE: "CREATED",
    UPDATE: "UPDATED",
    DELETE: "DELETED",
    APPLY: "APPLICATION",
  };
  const v = verb.toUpperCase();
  return `${entity.toUpperCase()}_${VERBS[v] ?? v}${suffix}`;
}

/** توثيق حدث بواجهة الخط البعيد — يكتب في AuditLog المحلي نفسه */
export async function logAudit(input: AuditInputCompat): Promise<void> {
  const entityId =
    input.entityId == null || Number.isNaN(Number(input.entityId)) ? null : Number(input.entityId);
  await audit(input.req ?? null, {
    actorId: input.actor?.id ?? null,
    actorName: input.actor?.fullName ?? "anonymous",
    actorRole: input.actor?.role ?? "anonymous",
    action: compatAction(input.action),
    targetType: input.entityType,
    targetId: entityId,
    targetLabel: input.summary,
    severity: input.severity,
    details: input.details ?? undefined,
  });
}
