// ═══════════════════════════════════════════════════════════════════════════
// CMDP — أدوات التنسيق (الدرهم، التواريخ، الأرقام) — متوافقة مع لغة العرض
// ═══════════════════════════════════════════════════════════════════════════

import { getLang, LANGS } from "@/lib/i18n";

/** رمز العملة حسب اللغة (ar: د.م. — غير ذلك: MAD) */
function currencySuffix(): string {
  return getLang() === "ar" ? "د.م." : "MAD";
}

function locale(): string {
  return LANGS.find((l) => l.code === getLang())?.locale ?? "ar-MA";
}

function numFmt(): Intl.NumberFormat {
  return new Intl.NumberFormat(locale());
}

export function formatMAD(v: number | null | undefined): string {
  if (v == null) return "—";
  return `${numFmt().format(v)}\u00A0${currencySuffix()}`;
}

export function formatNumber(v: number | null | undefined): string {
  if (v == null) return "—";
  return numFmt().format(v);
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale(), { dateStyle: "long" }).format(new Date(iso));
}

export function formatShortDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat(locale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatMonthYear(iso: string | Date): string {
  return new Intl.DateTimeFormat(locale(), { month: "short", year: "numeric" }).format(
    new Date(iso)
  );
}

export function daysUntil(iso: string | Date): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000);
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0] ?? "")
    .join("");
}

export function toInputDate(iso: string | Date | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toISOString().slice(0, 10);
}

/** حساب حالة الوثيقة آلياً انطلاقاً من تاريخ الانتهاء */
export function computeDocStatus(
  status: string,
  expiryDate: string | null
): "VALID" | "EXPIRING" | "EXPIRED" | "ARCHIVED" {
  if (status === "ARCHIVED") return "ARCHIVED";
  if (!expiryDate) return status === "VALID" ? "VALID" : (status as "EXPIRED");
  const d = daysUntil(expiryDate);
  if (d < 0) return "EXPIRED";
  if (d <= 90) return "EXPIRING";
  return "VALID";
}
