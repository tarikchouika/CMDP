// ═══════════════════════════════════════════════════════════════════════════
// CMDP — ترجمة بيانات العرض التجريبي وقت الاستعلام
// تمرّر كل قيمة نصية عربية عبر t(): إن وُجدت ترجمتها في القاموس تُستعمل،
// وإلا تسقط آمناً إلى الأصل — لا أثر إطلاقاً على بيانات الباك إند الحقيقية.
// ═══════════════════════════════════════════════════════════════════════════

import { t } from "@/lib/i18n";

const AR = /[\u0600-\u06FF]/;

function localizeValue<T>(v: T): T {
  if (typeof v === "string") {
    return (AR.test(v) ? t(v) : v) as T;
  }
  if (Array.isArray(v)) {
    return v.map((x) => localizeValue(x)) as T;
  }
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      out[k] = localizeValue(val);
    }
    return out as T;
  }
  return v;
}

/** نسخة مترجَمة من أي بيانات عرض تجريبي (تُستدعى وقت الاستعلام لا وقت الاستيراد) */
export function localizeDemo<T>(data: T): T {
  return localizeValue(structuredClone(data));
}
