// ═══════════════════════════════════════════════════════════════════════════
// CMDP — جرس الإشعارات (الإصدار 1.3.2)
// قناة الإبلاغ الرسمية داخل المنصة: إشعارات ما قبل/بعد التوقيف العادل،
// نقل الملكية، تفعيل الحسابات — بعدد غير المقروء وشريط أنماط الهوية.
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { Bell, Loader2 } from "lucide-react";
import { useMarkNotificationsRead, useNotifications } from "@/hooks/use-cmdp";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { t, tError } from "@/lib/i18n";
import { ZelligeStar } from "@/components/patterns";
import type { UserNotification } from "@/lib/types";

const TYPE_TONES: Record<string, string> = {
  SUSPENSION_NOTICE: "border-saffron/40 bg-saffron/10",
  SUSPENDED: "border-destructive/30 bg-destructive/10",
  REINSTATED: "border-chart-2/40 bg-chart-2/10",
  OWNERSHIP_TRANSFER: "border-terra/40 bg-terra/10",
  ACCOUNT_APPROVED: "border-chart-4/40 bg-chart-4/10",
  SYSTEM: "border-border bg-muted/60",
};

const TYPE_ICONS: Record<string, string> = {
  SUSPENSION_NOTICE: "⚠",
  SUSPENDED: "⛔",
  REINSTATED: "✓",
  OWNERSHIP_TRANSFER: "👑",
  ACCOUNT_APPROVED: "✓",
  SYSTEM: "✦",
};

function fmt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("ar-MA", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso.slice(0, 16);
  }
}

function NotificationItem({ n, onRead }: { n: UserNotification; onRead: (id: number) => void }) {
  return (
    <div
      className={
        "rounded-xl border p-3 text-xs leading-6 transition-opacity " +
        (TYPE_TONES[n.type] ?? TYPE_TONES.SYSTEM) +
        (n.isRead ? " opacity-60" : "")
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-black text-foreground">
          <span className="me-1 text-terra">{TYPE_ICONS[n.type] ?? "✦"}</span>
          {n.title}
        </p>
        {!n.isRead && (
          <button
            className="shrink-0 text-[10px] font-bold text-terra underline-offset-2 hover:underline"
            onClick={() => onRead(n.id)}
          >
            {t("مقروء")}
          </button>
        )}
      </div>
      <p className="mt-1 text-foreground/85">{n.body}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{fmt(n.createdAt)}</p>
    </div>
  );
}

export function NotificationsBell() {
  const { data, isLoading, isError, error, refetch } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  const markOne = async (id: number) => {
    try {
      await markRead.mutateAsync({ id });
    } catch (e) {
      toast({ title: tError(e), variant: "destructive" });
    }
  };

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) refetch(); }}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative size-9 shrink-0" aria-label={t("الإشعارات")}>
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-terra px-1 text-[9px] font-black text-primary-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-3 sm:w-96">
        <div className="mb-2 flex items-center justify-between border-b border-border pb-2">
          <p className="flex items-center gap-1.5 text-sm font-black text-foreground">
            <ZelligeStar className="size-3.5 text-terra" />
            {t("الإشعارات")}
            {unread > 0 && <span className="text-xs font-bold text-terra">({unread})</span>}
          </p>
          {unread > 0 && (
            <button
              className="text-[11px] font-bold text-terra underline-offset-2 hover:underline"
              onClick={async () => {
                try {
                  await markRead.mutateAsync({ all: true });
                } catch (e) {
                  toast({ title: tError(e), variant: "destructive" });
                }
              }}
            >
              {t("تعليم الكل كمقروء")}
            </button>
          )}
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="grid place-items-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : isError ? (
            <p className="py-6 text-center text-xs text-muted-foreground">
              {tError(error)}{" "}
              <button className="font-bold text-terra underline" onClick={() => refetch()}>
                {t("إعادة المحاولة")}
              </button>
            </p>
          ) : items.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              {t("لا إشعارات حالياً — ستبلغكم المنصة هنا بكل ما يهم حسابكم")}
            </p>
          ) : (
            items.map((n) => <NotificationItem key={n.id} n={n} onRead={markOne} />)
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
