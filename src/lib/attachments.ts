// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تعقيم المرفقات (صور الهوية، اللوغو، الوثائق القانونية، الفواتير)
// طبقة مشتركة: التسجيل العمومي + إنشاء الحسابات والتعاونيات من الداشبورد
// ═══════════════════════════════════════════════════════════════════════════

export interface Attachment {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // data:...;base64,....
}

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

/** تنظيف قائمة مرفقات: يرفض غير PDF/الصور ويقص عن الحد المسموح */
export function sanitizeFiles(input: unknown, maxFiles = 8): Attachment[] {
  if (!Array.isArray(input)) return [];
  const out: Attachment[] = [];
  for (const raw of input.slice(0, maxFiles)) {
    const f = raw as Partial<Attachment>;
    if (typeof f?.dataUrl !== "string") continue;
    if (!/^(application\/pdf|image\/(jpeg|png|webp))$/.test(String(f.type))) continue;
    if (f.dataUrl.length > 6_000_000) continue; // ~4.4MB
    out.push({
      name: clean(f.name, 160) || "ملف",
      type: String(f.type),
      size: Number(f.size) || 0,
      dataUrl: f.dataUrl,
    });
    if (out.length >= maxFiles) break;
  }
  return out;
}

/** تعقيم صورة وحيدة (صورة المستخدم / لوغو التعاونية) — تُخزَّن JSON مفرداً */
export function sanitizePhoto(input: unknown): string | null {
  const [photo] = sanitizeFiles(input ? [input] : [], 1);
  return photo ? JSON.stringify(photo) : null;
}

/** قراءة صورة مخزّنة (JSON مفرد) — لعرض صورة المستخدم/اللوغو في الواجهة */
export function parsePhoto(stored: string | null | undefined): Attachment | null {
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored) as Partial<Attachment>;
    if (typeof parsed?.dataUrl !== "string") return null;
    return parsed as Attachment;
  } catch {
    return null;
  }
}

/** قراءة قائمة مرفقات مخزّنة (JSON مصفوفة) — لتحميل وثائق الهوية/الوثائق القانونية في التحرير */
export function parseFiles(stored: string | null | undefined): Attachment[] {
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (a): a is Attachment => !!a && typeof (a as Partial<Attachment>)?.dataUrl === "string"
    );
  } catch {
    return [];
  }
}
