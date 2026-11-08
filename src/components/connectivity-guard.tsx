// ═══════════════════════════════════════════════════════════════════════════
// CMDP — حارس الاتصال (v1.3.0): القاتل الرسمي للشاشة البيضاء
// • فحص /api/ping عند الإقلاع (8 ثوانٍ مهلة) → شاشة انتظار حبرية معتمة
//   من أول رسم — بلا أي وميض أبيض، والمحتوى يُرسم تحتها فلا يُعطَّل الترطيب.
// • فشل الفحص الأول → شاشة «غير متصل» مع إعادة محاولة يدوية وتلقائية (15 ث).
// • بعد أول نجاح → أي انقطاع لاحق يُظهر شريطاً رفيعاً أعلى الشاشة فقط
//   (لا حبس للمستخدم) مع إعادة فحص دورية كل 60 ثانية.
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, WifiOff } from "lucide-react";
import { resolveApiBase } from "@/lib/api";
import { t, useI18n } from "@/lib/i18n";
import { useUIStore } from "@/store/ui";
import { Button } from "@/components/ui/button";

type ConnStatus = "checking" | "online" | "offline" | "degraded";

const PING_TIMEOUT_MS = 8_000;
const RETRY_MS = 15_000;
const RECHECK_MS = 60_000;

/**
 * فحص بوابة الـ API — أي استجابة HTTP (ولو 404 أثناء تركيب المسار) تعني
 * أن البوابة حيّة وقابلة للوصول؛ الرفض/المهلة فقط يعنيان انقطاعاً فعلياً.
 */
async function pingGateway(): Promise<boolean> {
  try {
    const base = await resolveApiBase();
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), PING_TIMEOUT_MS);
    try {
      await fetch(`${base}/api/ping`, { signal: ctrl.signal, cache: "no-store" });
      return true;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return false;
  }
}

/** تنسيق ساعة الدقائق حسب لغة العرض */
function formatClock(d: Date, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(d);
  } catch {
    return d.toTimeString().slice(0, 5);
  }
}

// ─── شاشة الانتظار الأولى (حبرية، معتمة، من أول رسم) ────────────────────────
function CheckingScreen() {
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-ink" role="status" aria-live="polite">
      {/* تدرّج حبري عميق + زخرفة الزليج — اللون من أول إطار، بلا وميض أبيض */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#241c14] via-[#2b2115] to-[#160f09]" />
      <div className="pattern-zellige-cream absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <span className="grid place-items-center rounded-3xl border border-cream/15 bg-cream/95 p-3 shadow-2xl shadow-black/50">
          <img src="/logo.png" alt="CMDP" className="h-16 w-auto" />
        </span>
        <div>
          <p className="font-display text-2xl font-black tracking-wide text-cream">CMDP</p>
          <p className="mt-1 text-xs text-cream/70">{t("المنصة الرقمية لإدارة التعاونيات")}</p>
        </div>
        {/* دوّار CSS خالص — بلا أي اعتماد على مكتبات حركة */}
        <span
          className="mt-1 block size-9 animate-spin rounded-full border-[3px] border-cream/15 border-t-saffron"
          aria-hidden="true"
        />
        <p className="text-[11px] font-medium text-cream/50">{t("جارٍ تشغيل المنصة...")}</p>
      </div>
    </div>
  );
}

// ─── شاشة عدم الاتصال (بعد فشل الفحص الأول حصراً) ───────────────────────────
function OfflineScreen({ lastCheck, onRetry, retrying }: {
  lastCheck: Date | null;
  onRetry: () => void;
  retrying: boolean;
}) {
  const { meta } = useI18n();
  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-ink" role="alert" aria-live="assertive">
      <div className="absolute inset-0 bg-gradient-to-b from-[#241c14] via-[#2b2115] to-[#160f09]" />
      <div className="pattern-zellige-cream absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative flex h-full flex-col items-center justify-center gap-5 px-6 text-center">
        <span className="grid place-items-center rounded-3xl border border-cream/15 bg-cream/95 p-3 shadow-2xl shadow-black/50">
          <img src="/logo.png" alt="CMDP" className="h-16 w-auto" />
        </span>
        <div>
          <p className="font-display text-2xl font-black tracking-wide text-cream">CMDP</p>
          <p className="mt-1 text-xs text-cream/70">{t("المنصة الرقمية لإدارة التعاونيات")}</p>
        </div>
        <div className="flex flex-col items-center gap-2">
          <span className="grid size-12 place-items-center rounded-full border border-saffron/30 bg-saffron/10">
            <WifiOff className="size-6 text-saffron" />
          </span>
          <h1 className="mt-2 font-display text-lg font-extrabold text-cream">
            {t("تعذر الوصول إلى خادم المنصة")}
          </h1>
          <p className="max-w-sm text-sm leading-6 text-cream/70">
            {t("تفقد اتصالك بالإنترنت — نُعيد المحاولة تلقائياً كل 15 ثانية.")}
          </p>
        </div>
        <Button
          onClick={onRetry}
          disabled={retrying}
          className="gap-2 bg-saffron px-6 font-bold text-ink hover:bg-saffron/90"
        >
          {retrying ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {t("إعادة المحاولة")}
        </Button>
        <p className="text-[11px] text-cream/45">
          {lastCheck ? t("آخر فحص: {time}", { time: formatClock(lastCheck, meta.locale) }) : ""}
        </p>
      </div>
    </div>
  );
}

// ─── شريط إعادة الاتصال الرفيع (انقطاع لاحق — لا يحبس المستخدم) ─────────────
function ReconnectingBanner() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[90] flex h-9 items-center justify-center gap-2 bg-terra text-cream shadow-lg shadow-black/20"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-3.5 shrink-0 animate-spin" />
      <p className="truncate px-2 text-xs font-bold">{t("انقطع الاتصال بالخادم — جارٍ إعادة الاتصال...")}</p>
    </div>
  );
}

// ─── الحارس ────────────────────────────────────────────────────────────────
export function ConnectivityGuard({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  const [status, setStatus] = React.useState<ConnStatus>("checking");
  const [busy, setBusy] = React.useState(false);
  const [lastCheck, setLastCheck] = React.useState<Date | null>(null);
  const everOnline = React.useRef(false);
  const pinging = React.useRef(false);
  const prevStatus = React.useRef<ConnStatus>("checking");

  React.useEffect(() => {
    prevStatus.current = status;
  }, [status]);

  const runPing = React.useCallback(async () => {
    if (pinging.current) return;
    pinging.current = true;
    setBusy(true);
    const ok = await pingGateway();
    pinging.current = false;
    setBusy(false);
    setLastCheck(new Date());
    if (ok) {
      const recovering = prevStatus.current === "offline" || prevStatus.current === "degraded";
      everOnline.current = true;
      setStatus("online");
      if (recovering) {
        // استعادة الاتصال: إلغاء الوضع التجريبي وإعادة جلب البيانات الحقيقية
        setDemoMode(false);
        qc.invalidateQueries();
      }
    } else {
      setStatus(everOnline.current ? "degraded" : "offline");
    }
  }, [qc, setDemoMode]);

  // الفحص الأول + تفاعل أحداث الاتصال بالمتصفح
  React.useEffect(() => {
    runPing();
    const onOnline = () => runPing();
    const onOffline = () => {
      setStatus((s) => (s === "online" ? "degraded" : s));
      runPing();
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [runPing]);

  // إعادة الفحص الدورية: كل 15 ث عند الانقطاع، وكل 60 ث في الحالة السليمة
  React.useEffect(() => {
    if (status === "checking") return;
    const id = setInterval(() => runPing(), status === "online" ? RECHECK_MS : RETRY_MS);
    return () => clearInterval(id);
  }, [status, runPing]);

  // أثناء الفحص الأول: المحتوى يُرسم في الشجرة نفسها (الترطيب لا يُعطَّل
  // أبداً، ولا يُعاد تركيبه بعد النجاح) وتغطيه شاشة حبرية معتمة من أول رسم.
  if (status === "checking") {
    return (
      <>
        {children}
        <CheckingScreen />
      </>
    );
  }

  if (status === "offline") {
    return (
      <>
        <div className="hidden" aria-hidden="true">
          {children}
        </div>
        <OfflineScreen lastCheck={lastCheck} retrying={busy} onRetry={() => runPing()} />
      </>
    );
  }

  return (
    <>
      {status === "degraded" && <ReconnectingBanner />}
      {children}
    </>
  );
}
