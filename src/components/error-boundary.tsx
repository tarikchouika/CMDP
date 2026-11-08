// ═══════════════════════════════════════════════════════════════════════════
// CMDP — حاجز الأخطاء الشامل (Error Boundary)
// آخر خط دفاع ضد «الشاشة البيضاء»: أي خلل في العرض (React 19 يفكك الشجرة
// كلها عند خطأ غير معالَج) يلتقط هنا فتظهر صفحة خطأ بالهوية البصرية
// بدل صفحة فارغة — مع زر إعادة المحاولة وزر إعادة ضبط الجلسة الآمن.
// يعتمد أنماطاً مضمّنة (inline styles) ليصمد حتى لو فشل تحميل CSS.
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";

interface State {
  hasError: boolean;
  message: string;
}

const RESET_KEYS = ["cmdp-ui", "cmdp-token"];

/** تفريغ الجلسة المخزنة والعودة لصفحة الدخول (لا يمس عنوان الباك إند المضبوط) */
export function resetSession() {
  try {
    for (const k of RESET_KEYS) window.localStorage.removeItem(k);
  } catch {
    /* تجاهل */
  }
  window.location.hash = "";
  window.location.reload();
}

/** ترجمة ثابتة بلا سياق (قد يكون مزوّد اللغة نفسه متعطلاً) */
const STRINGS: Record<string, { title: string; body: string; retry: string; reset: string }> = {
  ar: {
    title: "حدث خلل غير متوقع",
    body: "نعتذر — واجهت المنصة خطأً تقنياً أثناء عرض هذه الصفحة. بياناتكم محفوظة وسليمة، ويمكنكم المتابعة بعد إعادة المحاولة.",
    retry: "إعادة المحاولة",
    reset: "إعادة ضبط الجلسة",
  },
  fr: {
    title: "Une erreur inattendue s'est produite",
    body: "Veuillez nous excuser — la plateforme a rencontré une erreur technique. Vos données sont saines ; vous pouvez réessayer.",
    retry: "Réessayer",
    reset: "Réinitialiser la session",
  },
  en: {
    title: "An unexpected error occurred",
    body: "Sorry — the platform hit a technical error while rendering this page. Your data is safe; you can retry.",
    retry: "Retry",
    reset: "Reset session",
  },
  it: {
    title: "Si è verificato un errore imprevisto",
    body: "Spiacenti — la piattaforma ha riscontrato un errore tecnico. I vostri dati sono al sicuro; potete riprovare.",
    retry: "Riprova",
    reset: "Reimposta la sessione",
  },
  es: {
    title: "Ocurrió un error inesperado",
    body: "Lo sentimos — la plataforma encontró un error técnico. Sus datos están a salvo; puede reintentarlo.",
    retry: "Reintentar",
    reset: "Restablecer la sesión",
  },
};

function strings() {
  if (typeof document === "undefined") return STRINGS.ar;
  return STRINGS[document.documentElement.lang] ?? STRINGS.ar;
}

export class CmdpErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // تسجيل للتحليل دون كشف أي بيانات حساسة
    console.error("[CMDP] خطأ عرض غير معالَج:", error, info?.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const s = strings();
    return (
      <div
        dir="rtl"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
          background: "#1a0e08",
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Tahoma, sans-serif",
        }}
      >
        <div style={{ maxWidth: 460, textAlign: "center", color: "#faf6ee" }}>
          <div
            style={{
              width: 88,
              height: 88,
              margin: "0 auto 18px",
              borderRadius: 22,
              background: "linear-gradient(180deg,#6e331c,#3a1a0c)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 40,
              color: "#d9a03f",
            }}
          >
            ✦
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 10 }}>{s.title}</h1>
          <p style={{ fontSize: 14, lineHeight: 1.9, opacity: 0.78, marginBottom: 22 }}>{s.body}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={() => window.location.reload()}
              style={{
                background: "#d9a03f",
                color: "#1a0e08",
                border: 0,
                borderRadius: 12,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {s.retry}
            </button>
            <button
              onClick={resetSession}
              style={{
                background: "transparent",
                color: "#faf6ee",
                border: "1px solid rgba(250,246,238,.35)",
                borderRadius: 12,
                padding: "12px 28px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {s.reset}
            </button>
          </div>
          <p style={{ marginTop: 18, fontSize: 11, opacity: 0.45, direction: "ltr" }} dir="ltr">
            {this.state.message.slice(0, 160)}
          </p>
        </div>
      </div>
    );
  }
}

/**
 * شبكة أمان أخيرة على مستوى النافذة: أخطاء/رفوضات خارج شجرة React
 * تُعرض كشريط سفلي قابل للنقر بدل بقاء الصفحة صامتة.
 */
export function GlobalErrorHandler() {
  React.useEffect(() => {
    let shown = false;
    const show = (msg: string) => {
      if (shown) return;
      shown = true;
      const bar = document.createElement("div");
      bar.dir = "rtl";
      bar.style.cssText =
        "position:fixed;bottom:0;left:0;right:0;z-index:9998;background:#3a1a0c;color:#faf6ee;padding:12px 16px;font-size:13px;display:flex;gap:12px;align-items:center;justify-content:center;font-family:system-ui,sans-serif;";
      const span = document.createElement("span");
      span.textContent = "حدث خطأ غير متوقع — انقر لإعادة تحميل الصفحة";
      span.style.cssText = "flex:1;text-align:center";
      const btn = document.createElement("button");
      btn.textContent = "إعادة التحميل";
      btn.style.cssText =
        "background:#d9a03f;color:#1a0e08;border:0;border-radius:8px;padding:8px 18px;font-weight:800;font-size:13px;cursor:pointer;";
      btn.onclick = () => window.location.reload();
      bar.append(span, btn);
      document.body.append(bar);
      console.error("[CMDP] خطأ غير معالَج:", msg);
    };
    const onError = (e: ErrorEvent) => show(e.message || "خطأ");
    const onRejection = (e: PromiseRejectionEvent) => show(String(e.reason ?? "رفض وعد"));
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
