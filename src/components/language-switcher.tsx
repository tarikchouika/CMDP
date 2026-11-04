// ═══════════════════════════════════════════════════════════════════════════
// CMDP — مبدّل اللغة (العربية / الفرنسية / الإنجليزية / الإيطالية / الإسبانية)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { Check, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGS, useI18n, type Lang } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** زر مبدّل اللغة — يوضع في الأشرطة العلوية */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang, meta } = useI18n();
  return (
    <DropdownMenu dir="ltr">
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn("h-9 shrink-0 gap-1.5 px-2.5 font-bold", className)}
          aria-label={meta.english}
        >
          <Globe className="size-4" />
          <span className="text-xs font-extrabold uppercase tracking-wide">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code as Lang)}
            className={cn("gap-2 font-semibold", l.code === lang && "bg-terra/10 text-terra")}
            dir={l.dir}
          >
            <span aria-hidden="true" className="text-base leading-none">{l.flag}</span>
            <span className="flex-1">{l.native}</span>
            {l.code === lang && <Check className="size-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
