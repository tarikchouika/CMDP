// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الإشعارات داخل المنصة: الإنشاء بأفضل جهد (لا يفشل الطلب الأصلي)
// قناة الإبلاغ الرسمية للمستخدم: إشعارات الإيقاف العادل، نقل الملكية،
// تفعيل الحسابات — تُعرض بجرس الإشعارات في الواجهة.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";

export interface NotifyInput {
  userId: number;
  type: string; // SUSPENSION_NOTICE | SUSPENDED | REINSTATED | OWNERSHIP_TRANSFER | ACCOUNT_APPROVED | SYSTEM
  title: string;
  body: string;
  meta?: Record<string, unknown> | null;
}

/** إنشاء إشعار — استدعاء غير محجوب: لا يرمي أبداً */
export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    await db.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        meta: input.meta ? JSON.stringify(input.meta) : null,
      },
    });
  } catch (e) {
    console.error("[notify] فشل إنشاء الإشعار:", input.type, e);
  }
}
