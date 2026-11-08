// ═══════════════════════════════════════════════════════════════════════════
// CMDP — جرس الإشعارات (v1.3.0) — لكل المستخدمين المصادَق عليهم
// جلب دوري صامت كل 60 ثانية من /api/notifications + تعليم المقروء فردياً
// أو جملةً عبر POST /api/notifications/read — لا يُظهر أي خطأ أبداً (ميزة
// غير حرجة: الفشل يعني ببساطة بقاء العدّاد كما هو).
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { Bell, CheckCheck } from "lucide-react";
import { rawFetch } from "@/lib/api";
import { t, timeAgoLocalized, useI18n } from "@/lib/i18n";
import { useUIStore } from "@/store/ui";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface AppNotification {
  id: number;
  title: string;
  body?: string | null;
  createdAt: string;
  read?: boolean;
  readAt?: string | null;
}

const POLL_MS = 60_000;
const MAX_SHOWN = 20;

function isUnread(n: AppNotification): boolean {
  return !n.read && !n.readAt;
}

/** استخراج القائمة من استجابة الباك إند أياً كانت هيئتها (مصفوفة أو غلاف) */
function toList(res: unknown): AppNotification[] {
  if (Array.isArray(res)) return res as AppNotification[];
  const wrapped = res as { notifications?: AppNotification[]; items?: AppNotification[] } | null;
  return wrapped?.notifications ?? wrapped?.items ?? [];
}

export function NotificationsBell() {
  const { meta } = useI18n();
  const authed = useUIStore((s) => s.authed);
  const [items, setItems] = React.useState<AppNotification[]>([]);
  const [open, setOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await rawFetch<unknown>("/api/notifications");
      setItems(toList(res).slice(0, MAX_SHOWN));
    } catch {
      /* صمت تام — الإشعارات ميزة غير حرجة */
    }
  }, []);

  React.useEffect(() => {
    if (!authed) return;
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [authed, load]);

  if (!authed) return null;

  const unread = items.filter(isUnread).length;

  function markReadLocally(id: number) {
    setItems((list) => list.map((n) => (n.id === id ? { ...n, read: true, readAt: new Date().toISOString() } : n)));
  }

  async function markOne(id: number) {
    markReadLocally(id);
    try {
      await rawFetch<unknown>("/api/notifications/read", {
        method: "POST",
        body: JSON.stringify({ id }),
      });
    } catch {
      /* صمت */
    }
  }

  async function markAll() {
    setItems((list) => list.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() })));
    try {
      await rawFetch<unknown>("/api/notifications/read", {
        method: "POST",
        body: JSON.stringify({ all: true }),
      });
    } catch {
      /* صمت */
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="relative size-9 shrink-0"
          aria-label={t("الإشعارات")}
        >
          <Bell className="size-4" />
          {unread > 0 && (
            <span className="absolute -end-1 -top-1 grid min-w-4 place-items-center rounded-full bg-terra px-1 text-[9px] font-black leading-4 text-cream">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-sm font-extrabold text-foreground">{t("الإشعارات")}</p>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2 text-[11px] font-bold text-terra hover:text-terra"
              onClick={markAll}
            >
              <CheckCheck className="size-3.5" />
              {t("تعليم الكل كمقروء")}
            </Button>
          )}
        </div>
        <div className="scrollbar-thin max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <Bell className="size-4" />
              </span>
              <p className="text-xs text-muted-foreground">{t("لا توجد إشعارات")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map((n) => {
                const unreadOne = isUnread(n);
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => markOne(n.id)}
                      className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-start transition-colors hover:bg-muted/50 ${
                        unreadOne ? "bg-saffron/5" : ""
                      }`}
                    >
                      <span
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          unreadOne ? "bg-saffron" : "bg-transparent"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-xs ${
                          unreadOne ? "font-bold text-foreground" : "font-medium text-foreground/80"
                        }`}>
                          {n.title}
                        </span>
                        {n.body && (
                          <span className="mt-0.5 line-clamp-2 block text-[11px] leading-5 text-muted-foreground">
                            {n.body}
                          </span>
                        )}
                        <span className="mt-1 block text-[10px] text-muted-foreground/70">
                          {timeAgoLocalized(n.createdAt, meta.code)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
