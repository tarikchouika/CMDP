// ═══════════════════════════════════════════════════════════════════════════
// CMDP — عميل البيانات (نفس الأصل افتراضياً، مع عنوان قابل للضبط + وضع تجريبي)
// ═══════════════════════════════════════════════════════════════════════════

export class ApiUnavailableError extends Error {
  constructor(message = "تعذر الوصول إلى الخادم") {
    super(message);
    this.name = "ApiUnavailableError";
  }
}

const API_BASE_KEY = "cmdp_api_base";

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
  }
}

export async function rawFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
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

/** اختبار قابلية الوصول إلى الباك إند */
export async function pingApi(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${getApiBase()}/api/cooperatives`, {
      headers: { "Content-Type": "application/json" },
    });
    if (res.ok) return { ok: true, message: "الاتصال بالباك إند المحلي ناجح" };
    return { ok: false, message: `استجابة غير متوقعة: ${res.status}` };
  } catch {
    return { ok: false, message: "تعذر الوصول إلى العنوان المحدد" };
  }
}
