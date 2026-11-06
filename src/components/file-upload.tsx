// ═══════════════════════════════════════════════════════════════════════════
// CMDP — حقل رفع الملفات: صور الهوية، الوثائق القانونية، الفواتير والوصول
// ضغط الصور آلياً + معاينة + تحقق من النوع والحجم + تخزين محلي/إرسال للخادم
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { FileText, ImagePlus, Loader2, Paperclip, Trash2, UploadCloud } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

export interface StoredFile {
  name: string;
  type: string;
  size: number;
  dataUrl: string; // data:...;base64,....
}

const MAX_BYTES = 4 * 1024 * 1024; // 4MB بعد الضغط
const ACCEPTED = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
];

/** ضغط الصور إلى حد أقصى 1280px بجودة 82% */
async function compressImage(file: File): Promise<string> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = bitmapUrl;
    });
    const max = 1280;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no ctx");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.82);
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export function FileUploadField({
  label,
  hint,
  accept = ".pdf,image/*",
  multiple = true,
  required = false,
  files,
  onChange,
  compact = false,
  id,
}: {
  label: string;
  hint?: string;
  accept?: string;
  multiple?: boolean;
  required?: boolean;
  files: StoredFile[];
  onChange: (files: StoredFile[]) => void;
  compact?: boolean;
  id?: string;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleFiles(list: FileList | null) {
    if (!list || list.length === 0) return;
    setError(null);
    setBusy(true);
    try {
      const incoming: StoredFile[] = [];
      for (const f of Array.from(list)) {
        const isPdf = f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf");
        const isImage = f.type.startsWith("image/");
        if (!isPdf && !isImage) {
          setError(t("النوع غير مدعوم: PDF أو صور فقط"));
          continue;
        }
        let dataUrl: string;
        if (isImage && f.size > 300 * 1024 && f.type !== "image/gif") {
          dataUrl = await compressImage(f);
        } else {
          dataUrl = await fileToDataUrl(f);
        }
        // حد الحجم بعد المعالجة
        if (dataUrl.length > MAX_BYTES * 1.37) {
          setError(t("الملف كبير جداً (الحد 4 ميغابايت)"));
          continue;
        }
        incoming.push({
          name: f.name,
          type: isPdf ? "application/pdf" : "image/jpeg",
          size: Math.round((dataUrl.length * 3) / 4),
          dataUrl,
        });
        if (!multiple) break;
      }
      if (incoming.length > 0) {
        onChange(multiple ? [...files, ...incoming] : incoming.slice(0, 1));
      }
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-bold text-foreground">
        <Paperclip className="size-3.5 text-terra" />
        {label}
        {required && <span className="text-destructive">*</span>}
      </label>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 px-4 text-center transition-colors hover:border-terra/40 hover:bg-terra/5",
          compact ? "py-4" : "py-6"
        )}
      >
        {busy ? (
          <Loader2 className="size-6 animate-spin text-terra" />
        ) : (
          <UploadCloud className="size-6 text-terra/70" />
        )}
        <p className="text-xs font-semibold text-foreground/80">
          {busy ? t("جارٍ تجهيز الملفات...") : t("اسحبوا الملفات هنا أو اضغطوا للاختيار")}
        </p>
        <p className="text-[10px] text-muted-foreground">
          PDF · JPG · PNG · WEBP — {t("حتى 4 ميغابايت للملف")}
        </p>
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {hint && <p className="text-[10px] leading-5 text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] font-bold text-destructive">{error}</p>}

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${i}`}
              className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2"
            >
              {f.type === "application/pdf" ? (
                <FileText className="size-4 shrink-0 text-terra" />
              ) : (
                <img src={f.dataUrl} alt="" className="size-8 shrink-0 rounded-lg object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-foreground">{f.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {(f.size / 1024).toFixed(0)} KB · {f.type === "application/pdf" ? "PDF" : "IMG"}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-7 shrink-0 text-destructive hover:bg-destructive/10"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                aria-label={t("إزالة الملف")}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
