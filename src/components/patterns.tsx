// ═══════════════════════════════════════════════════════════════════════════
// CMDP — العناصر الزخرفية المغربية (نجمة الزليج، القوس، الفواصل)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

/** نجمة الزليج الثمانية (الخطّام) */
export function ZelligeStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" fill="currentColor">
      <polygon points="32,2 36.98,19.99 53.21,10.79 44.02,27.04 62,32 44.02,36.96 53.21,53.21 36.98,44.01 32,62 27.02,44.01 10.79,53.21 19.98,36.96 2,32 19.98,27.04 10.79,10.79 27.02,19.99" />
    </svg>
  );
}

/** شعار المنصة الرسمي الجديد (الشعار الذهبي المزخرف) */
export function CmdpMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-96.png"
      alt="CMDP"
      className={cn("object-contain", className)}
      draggable={false}
    />
  );
}

/** العلامة المائية الرسمية — شعار باهت فوق كل الصفحات */
export function CmdpWatermark({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-[1] select-none bg-center bg-no-repeat",
        "bg-[length:min(88vw,620px)]",
        className
      )}
      style={{ backgroundImage: "url(/watermark.webp)" }}
    />
  );
}

/** أيقونة المساعد الألي الرسمية */
export function CmdpAssistantIcon({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/chatbot-icon.webp"
      alt=""
      className={cn("rounded-full object-cover", className)}
      draggable={false}
    />
  );
}

/** كتلة الشعار مع الاسم */
export function CmdpLogo({ compact = false, light = false }: { compact?: boolean; light?: boolean }) {
  return (
    <div className="flex items-center gap-3 select-none">
      <CmdpMark className={cn("shrink-0 text-terra", compact ? "size-9" : "size-11")} />
      <div className="leading-tight">
        <div className={cn("font-display font-extrabold tracking-wide", compact ? "text-lg" : "text-xl", light ? "text-sidebar-foreground" : "text-foreground")}>
          CMDP
        </div>
        {!compact && (
          <div className={cn("max-w-52 text-[11px] leading-4", light ? "text-sidebar-foreground/70" : "text-muted-foreground")}>
            {t("المنصة الرقمية لإدارة التعاونيات")}
          </div>
        )}
      </div>
    </div>
  );
}

/** فاصل زخرفي */
export function DividerZellige({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-border to-transparent" />
      <ZelligeStar className="size-3.5 text-saffron" />
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>
  );
}

/** إطار بقوس مغربي */
export function ArchFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("arch-top overflow-hidden", className)}>{children}</div>;
}

/** عنوان قسم لصفحة الهبوط */
export function SectionHeading({
  kicker,
  title,
  desc,
  align = "center",
  className,
}: {
  kicker: string;
  title: string;
  desc?: string;
  align?: "center" | "start";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mb-10 flex flex-col gap-3",
        align === "center" ? "items-center text-center" : "items-start text-start",
        className
      )}
    >
      <span className="inline-flex items-center gap-2 rounded-full border border-saffron/40 bg-saffron/10 px-4 py-1 text-xs font-bold text-saffron-ink">
        <ZelligeStar className="size-3 text-saffron" />
        {kicker}
      </span>
      <h2 className="font-display text-2xl font-extrabold text-foreground md:text-3xl">{title}</h2>
      {desc && <p className="max-w-2xl text-sm leading-7 text-muted-foreground md:text-base">{desc}</p>}
    </div>
  );
}
