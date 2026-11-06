"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";

/**
 * وحدات عرض حية (‑-cmdp-vh / ‑-cmdp-vw) تُحدَّث من visualViewport:
 * تحصين ضد تجمّد وحدات CSS (vh/vw) في WebView أندرويد بعد تغيّر حجم العرض
 * (خلل موثّق في كروميوم: تُحسب vh على ارتفاع قديم صغير فتنهار النوافذ واللوحات).
 * كل الاستعمالات الحرجة تعتمد هذه المتغيرات مع سقوط آمن إلى 1vh/1vw.
 */
function useLiveViewportUnits() {
  React.useEffect(() => {
    const root = document.documentElement;
    const update = () => {
      const vv = window.visualViewport;
      const h = Math.round(vv?.height ?? window.innerHeight);
      const w = Math.round(vv?.width ?? window.innerWidth);
      if (h > 0) root.style.setProperty("--cmdp-vh", `${h / 100}px`);
      if (w > 0) root.style.setProperty("--cmdp-vw", `${w / 100}px`);
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);
}

export function Providers({ children }: { children: React.ReactNode }) {
  useLiveViewportUnits();
  const [client] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 1,
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}
