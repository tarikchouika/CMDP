// ═══════════════════════════════════════════════════════════════════════════
// CMDP — نظام التعدد اللغوي (العربية، الفرنسية، الإنجليزية، الإيطالية، الإسبانية)
// العربية هي اللغة المفتاح واللغة الافتراضية؛ أي نص غير مترجم يسقط آمناً
// إلى العربية الأصلية دون أي خلل — حماية للمكتسبات.
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { FR } from "@/lib/i18n/fr";
import { EN } from "@/lib/i18n/en";
import { IT } from "@/lib/i18n/it";
import { ES } from "@/lib/i18n/es";

export type Lang = "ar" | "fr" | "en" | "it" | "es";

export interface LangMeta {
  code: Lang;
  native: string;
  english: string;
  dir: "rtl" | "ltr";
  locale: string;
  flag: string;
}

export const LANGS: LangMeta[] = [
  { code: "ar", native: "العربية", english: "Arabic", dir: "rtl", locale: "ar-MA", flag: "🇲🇦" },
  { code: "fr", native: "Français", english: "French", dir: "ltr", locale: "fr-FR", flag: "🇫🇷" },
  { code: "en", native: "English", english: "English", dir: "ltr", locale: "en-GB", flag: "🇬🇧" },
  { code: "it", native: "Italiano", english: "Italian", dir: "ltr", locale: "it-IT", flag: "🇮🇹" },
  { code: "es", native: "Español", english: "Spanish", dir: "ltr", locale: "es-ES", flag: "🇪🇸" },
];

const DICTS: Record<Exclude<Lang, "ar">, Record<string, string>> = { fr: FR, en: EN, it: IT, es: ES };

const STORAGE_KEY = "cmdp-lang";

// ─── الحالة العمومية للوحدة (بدون هوك — للاستعمال من أي ملف) ────────────────
let currentLang: Lang = "ar";
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return currentLang;
}

export function setLangGlobal(lang: Lang) {
  if (lang === currentLang) return;
  currentLang = lang;
  if (typeof document !== "undefined") {
    const meta = LANGS.find((l) => l.code === lang)!;
    document.documentElement.lang = lang;
    document.documentElement.dir = meta.dir;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      /* تجاهل */
    }
  }
  listeners.forEach((fn) => fn());
}

/**
 * دالة الترجمة العامة.
 * - العربية: تُرجع المفتاح نفسه (النص الأصلي).
 * - باقي اللغات: تبحث في القاموس، ثم تسقط إلى العربية إن لم تجد الترجمة.
 * تعتمد المتغيرات بصيغة {name}.
 */
export function t(key: string, vars?: Record<string, string | number>): string {
  let out = key;
  if (currentLang !== "ar") {
    const dict = DICTS[currentLang];
    out = dict[key] ?? EN[key] ?? key;
  }
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      out = out.replaceAll(`{${k}}`, String(v));
    }
  }
  return out;
}

// ─── السياق والملهوف ────────────────────────────────────────────────────────
interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: typeof t;
  meta: LangMeta;
}

const Ctx = React.createContext<I18nCtx>({
  lang: "ar",
  setLang: () => undefined,
  t,
  meta: LANGS[0],
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = React.useState<Lang>("ar");

  // استرجاع اللغة المحفوظة بعد الترطيب (لتجنب عدم تطابق SSR)
  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      /* تجاهل */
    }
    const initial: Lang = stored && LANGS.some((l) => l.code === stored) ? (stored as Lang) : "ar";
    if (initial !== "ar") {
      currentLang = initial;
      setLangState(initial);
    }
    // ضبط اتجاه الوثيقة دائماً (حتى للعربية بعد التنقل بين اللغات)
    const meta = LANGS.find((l) => l.code === getLang())!;
    document.documentElement.lang = getLang();
    document.documentElement.dir = meta.dir;
  }, []);

  const setLang = React.useCallback((l: Lang) => {
    setLangGlobal(l);
    setLangState(l);
  }, []);

  const value = React.useMemo<I18nCtx>(
    () => ({
      lang,
      setLang,
      t: (key: string, vars?: Record<string, string | number>) => {
        // دائماً تقرأ اللغة الحالية من الحالة العمومية لضمان الحداثة
        let out = key;
        if (lang !== "ar") {
          const dict = DICTS[lang as Exclude<Lang, "ar">];
          out = dict[key] ?? EN[key] ?? key;
        }
        if (vars) {
          for (const [k, v] of Object.entries(vars)) {
            out = out.replaceAll(`{${k}}`, String(v));
          }
        }
        return out;
      },
      meta: LANGS.find((l) => l.code === lang)!,
    }),
    [lang, setLang]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return React.useContext(Ctx);
}

/** تنسيق التاريخ حسب لغة العرض */
export function formatDateLocalized(date: Date | string, lang: Lang = getLang()): string {
  const meta = LANGS.find((l) => l.code === lang)!;
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(meta.locale, { day: "numeric", month: "long", year: "numeric" }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}

/** تنسيق العملة (الدرهم المغربي) حسب اللغة */
export function formatMADLocalized(amount: number, lang: Lang = getLang()): string {
  const meta = LANGS.find((l) => l.code === lang)!;
  try {
    return new Intl.NumberFormat(meta.locale, { maximumFractionDigits: 2 }).format(amount) + " " + t("د.م.");
  } catch {
    return `${amount} د.م.`;
  }
}
