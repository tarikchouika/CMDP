// ═══════════════════════════════════════════════════════════════════════════
// CMDP — مكونات مشتركة (ترويسات الصفحات، بطاقات المؤشرات، الحالات...)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ZelligeStar } from "@/components/patterns";
import type { LucideIcon } from "lucide-react";
import { t } from "@/lib/i18n";

/** ترويسة صفحة داخلية */
export function PageHeader({
  title,
  desc,
  actions,
  className,
}: {
  title: string;
  desc?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h1 className="font-display text-xl font-extrabold text-foreground md:text-2xl">{title}</h1>
        {desc && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** شارة حالة من خرائط الثوابت */
export function LBadge({
  map,
  value,
  className,
}: {
  map: Record<string, { label: string; className: string }>;
  value: string;
  className?: string;
}) {
  const item = map[value] ?? { label: value, className: "bg-muted text-muted-foreground border-border" };
  return (
    <Badge variant="outline" className={cn(item.className, "font-medium", className)}>
      {item.label}
    </Badge>
  );
}

/** بطاقة مؤشر */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "terra",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: "terra" | "zellij" | "saffron" | "plum" | "olive";
}) {
  const tones: Record<string, string> = {
    terra: "bg-terra/10 text-terra",
    zellij: "bg-zellij/10 text-zellij",
    saffron: "bg-saffron/15 text-[#8a6414]",
    plum: "bg-chart-5/10 text-chart-5",
    olive: "bg-chart-4/10 text-chart-4",
  };
  return (
    <Card className="relative overflow-hidden border-border/80 bg-card">
      <div className="pattern-zellige absolute inset-0 opacity-60" aria-hidden="true" />
      <CardContent className="relative flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-extrabold tabular-nums text-foreground">{value}</p>
          {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {Icon && (
          <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", tones[tone])}>
            <Icon className="size-5" />
          </span>
        )}
      </CardContent>
    </Card>
  );
}

/** حالة فراغ */
export function EmptyState({
  icon: Icon,
  title,
  desc,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center", className)}>
      <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        {Icon ? <Icon className="size-6" /> : <ZelligeStar className="size-6" />}
      </span>
      <div>
        <p className="font-display font-bold text-foreground">{title}</p>
        {desc && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

/** حوار تأكيد الحذف */
export function ConfirmDialog({
  open,
  onOpenChange,
  title = "تأكيد الحذف",
  desc,
  loading,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: string;
  desc: string;
  loading?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("إلغاء")}
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={loading}>
            {loading ? t("جارٍ الحذف...") : t("حذف نهائي")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** هيكل تحميل لجدول */
export function TableSkeleton({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={cn("h-10 flex-1", j === 0 && "max-w-16")} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** شريط تقدم الحضور */
export function AttendanceBar({ attendees, total }: { attendees: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((attendees / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-28 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-l from-terra to-terra-soft"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {attendees}/{total} ({pct}%)
      </span>
    </div>
  );
}
