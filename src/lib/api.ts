// ═══════════════════════════════════════════════════════════════════════════
// CMDP — عميل البيانات (نفس الأصل افتراضياً، مع عنوان قابل للضبط + وضع تجريبي)
// v1.3.0: حلّ عنوان الباك إند وقت التشغيل (resolveApiBase) — النسخة الساكنة
// تُنشر بلا معرفة مسبقة بعنوان بوابة الـ API، فيُقرأ من /api-config.json.
// ═══════════════════════════════════════════════════════════════════════════

export class ApiUnavailableError extends Error {
  constructor(message = "تعذر الوصول إلى الخادم") {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

const API_BASE_KEY = "cmdp_api_base";
const TOKEN_KEY = "cmdp_token";

export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const stored = window.localStorage.getItem(API_BASE_KEY);
    if (stored !== null) return stored;
  }
  return process.env.NEXT_PUBLIC_API_BASE || "";
}

export function setApiBase(v: string) {
  if (typeof window !== "undefined") {
    if (v.trim()) window.localStorage.setItem(API_BASE_KEY, v.trim());
    else window.localStorage.removeItem(API_BASE_KEY);
    // إبطال المذكرة: العنوان اليدوي يتقدم على كل مصادر الحل الأخرى
    resolvedBasePromise = null;
  }
}

// ─── حلّ عنوان الـ API وقت التشغيل (v1.3.0) ────────────────────────────────
// مذكرة على مستوى الوحدة — يُحلّ مرة واحدة لكل تحميل ثم يُعاد استعماله:
//   1) تجاوز يدوي من الإعدادات (localStorage) — يحافظ على ميزة الإعدادات القائمة
//   2) التطوير المحلي (localhost / 127.0.0.1) → نفس الأصل (خادم Next الكامل)
//   3) ملف /api-config.json الساكن (نفس الأصل) → بوابة الـ API الإنتاجية
//   4) متغير البناء NEXT_PUBLIC_API_BASE (سقوط أخير)
let resolvedBasePromise: Promise<string> | null = null;

export function resolveApiBase(): Promise<string> {
  // SSR / التصدير الساكن: لا نافذة → متغير البيئة فوراً
  if (typeof window === "undefined") {
    return Promise.resolve(process.env.NEXT_PUBLIC_API_BASE || "");
  }
  if (!resolvedBasePromise) {
    resolvedBasePromise = (async () => {
      try {
        const stored = window.localStorage.getItem(API_BASE_KEY);
        if (stored) return stored;
        const host = window.location.hostname;
        if (host === "localhost" || host === "127.0.0.1") return "";
        const res = await fetch("/api-config.json", { cache: "no-store" });
        if (res.ok) {
          const cfg = (await res.json()) as { apiBase?: unknown };
          if (typeof cfg.apiBase === "string" && cfg.apiBase.trim()) {
            return cfg.apiBase.trim();
          }
        }
      } catch {
        /* تجاهل — السقوط إلى متغير البناء */
      }
      return process.env.NEXT_PUBLIC_API_BASE || "";
    })();
  }
  return resolvedBasePromise;
}

/** حفظ/قراءة رمز المصادقة (يُلحق تلقائياً بكل طلب) */
export function setAuthToken(token: string | null) {
  if (typeof window !== "undefined") {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  }
}

export function getAuthToken(): string | null {
  if (typeof window !== "undefined") return window.localStorage.getItem(TOKEN_KEY);
  return null;
}

export async function rawFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = await resolveApiBase();
  const token = getAuthToken();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...((init?.headers as Record<string, string>) ?? {}),
      },
    });
  } catch {
    throw new ApiUnavailableError();
  }
  // استضافة ساكنة بلا باك إند → اعتبار الخدمة غير متاحة
  // (404: المسار غير موجود — 405/501: الاستضافة الساكنة لا تدعم الطريقة)
  if (res.status === 404 || res.status === 405 || res.status === 501) {
    throw new ApiUnavailableError();
  }
  if (!res.ok) {
    let msg = `خطأ ${res.status}`;
    try {
      const j = (await res.json()) as { error?: string };
      if (j?.error) msg = j.error;
    } catch {
      /* تجاهل */
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

/** اختبار قابلية الوصول إلى الباك إند (عبر العنوان المحلول وقت التشغيل) */
export async function pingApi(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${await resolveApiBase()}/api/cooperatives`, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return { ok: true, message: "الاتصال بالباك إند المحلي ناجح" };
    return { ok: false, message: `استجابة غير متوقعة: ${res.status}` };
  } catch {
    return { ok: false, message: "تعذر الوصول إلى العنوان المحدد" };
  }
}
