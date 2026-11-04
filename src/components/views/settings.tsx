// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة الإعدادات
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { CheckCircle2, Database, FlaskConical, Link2, Loader2, LogOut, Moon, Plug, RotateCcw, Server, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { getApiBase, pingApi, setApiBase } from "@/lib/api";
import { ACCOUNT_TYPE_LABELS, ROLE_LABELS } from "@/lib/constants";
import { useUIStore } from "@/store/ui";
import { useResetSeed } from "@/hooks/use-cmdp";
import { LBadge, PageHeader } from "@/components/shared";
import { CmdpLogo, DividerZellige } from "@/components/patterns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

export function SettingsView() {
  const { resolvedTheme, setTheme } = useTheme();
  const user = useUIStore((s) => s.user);
  const demoMode = useUIStore((s) => s.demoMode);
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  const setAuthed = useUIStore((s) => s.setAuthed);
  const resetSeed = useResetSeed();
  const { toast } = useToast();

  const [apiBase, setApiBaseState] = React.useState("");
  const [testing, setTesting] = React.useState(false);
  const [testResult, setTestResult] = React.useState<{ ok: boolean; message: string } | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    setApiBaseState(getApiBase());
  }, []);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    setApiBase(apiBase);
    const res = await pingApi();
    setTestResult(res);
    setTesting(false);
    setDemoMode(!res.ok);
    toast({
      title: res.ok ? t("الاتصال ناجح") : "تعذر الاتصال",
      description: res.ok ? t("ستعمل المنصة الآن بالباك إند المحلي") : "تحقق من تشغيل الباك إند ومن العنوان",
      variant: res.ok ? undefined : "destructive",
    });
  }

  function clearApiBase() {
    setApiBase("");
    setApiBaseState("");
    setTestResult(null);
    setDemoMode(false);
    toast({ title: t("أُعيد العنوان إلى الوضع الافتراضي (نفس الأصل)") });
  }

  return (
    <div className="space-y-6">
      <PageHeader title={t("الإعدادات")} desc={t("الحساب، المظهر، الاتصال بالباك إند المحلي، وإدارة البيانات التجريبية")} />

      <div className="grid gap-4 lg:grid-cols-2">
        {/* الحساب */}
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-sm font-extrabold">{t("الحساب")}</CardTitle>
            <CardDescription>{t("هوية المستخدم الحالي على المنصة")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-border bg-background p-4">
              <span className="grid size-12 place-items-center rounded-full bg-terra/10 font-display text-lg font-black text-terra">
                {user?.fullName?.[0] ?? t("م")}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-extrabold text-foreground">{user?.fullName ?? t("المستخدم")}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">
                  @{user?.username}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  <LBadge map={ROLE_LABELS} value={user?.role ?? "USER"} />
                  {user?.accountType && (
                    <Badge variant="outline" className="border-saffron/30 bg-saffron/10 text-[10px] font-bold text-[#8a6414]">
                      {t(ACCOUNT_TYPE_LABELS[user.accountType])}
                    </Badge>
                  )}
                </div>
                {user?.cooperativeName && (
                  <p className="mt-1 text-[11px] text-muted-foreground">{user.cooperativeName}</p>
                )}
              </div>
            </div>
            <Button variant="outline" className="w-full gap-2 text-destructive hover:bg-destructive/10" onClick={() => setAuthed(null)}>
              <LogOut className="size-4" />
              {t("تسجيل الخروج")}
            </Button>
          </CardContent>
        </Card>

        {/* المظهر */}
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="text-sm font-extrabold">{t("المظهر")}</CardTitle>
            <CardDescription>{t("وضع فاتح بألوان الرمل والطين، أو داكن بروح الليالي المغربية")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme("light")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${mounted && resolvedTheme === "light" ? "border-terra bg-terra/5" : "border-border hover:border-terra/40"}`}
              >
                <Sun className="size-6 text-terra" />
                <span className="text-xs font-bold">{t("فاتح")}</span>
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${mounted && resolvedTheme === "dark" ? "border-terra bg-terra/5" : "border-border hover:border-terra/40"}`}
              >
                <Moon className="size-6 text-terra" />
                <span className="text-xs font-bold">{t("داكن")}</span>
              </button>
            </div>
          </CardContent>
        </Card>

        {/* الاتصال بالباك إند المحلي */}
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
              <Server className="size-4 text-terra" />
              {t("الاتصال بالباك إند المحلي")}
            </CardTitle>
            <CardDescription>
              {t("عند نشر الواجهة على Cloudflare Pages، اضبط هنا عنوان الخادم المحلي الذي يشغّل SQLite (مثال: http://192.168.1.10:3000)")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("عنوان الباك إند (API Base URL)")}</Label>
              <div className="flex gap-2">
                <Input
                  dir="ltr"
                  value={apiBase}
                  onChange={(e) => setApiBaseState(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="bg-background text-left"
                />
                <Button onClick={testConnection} disabled={testing} className="shrink-0 gap-1.5 font-bold">
                  {testing ? <Loader2 className="size-4 animate-spin" /> : <Plug className="size-4" />}
                  {testing ? t("جارٍ الاختبار...") : t("اختبار وحفظ")}
                </Button>
              </div>
            </div>
            {testResult && (
              <p className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${testResult.ok ? "bg-zellij/10 text-zellij" : "bg-destructive/10 text-destructive"}`}>
                <CheckCircle2 className="size-3.5" />
                {testResult.message}
              </p>
            )}
            <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3 text-xs">
              <span className="flex items-center gap-2 text-muted-foreground">
                <Link2 className="size-3.5" />
                {t("الحالة الحالية")}
              </span>
              <span className={`font-bold ${demoMode ? "text-[#8a6414]" : "text-zellij"}`}>
                {demoMode ? t("وضع العرض التجريبي (بدون حفظ)") : t("متصل بنفس الأصل")}
              </span>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={clearApiBase}>
              <RotateCcw className="size-3.5" />
              {t("إعادة التعيين إلى نفس الأصل")}
            </Button>
          </CardContent>
        </Card>

        {/* البيانات التجريبية */}
        <Card className="border-border/80">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
              <Database className="size-4 text-terra" />
              {t("البيانات التجريبية")}
            </CardTitle>
            <CardDescription>
              إعادة ضبط كاملة لقاعدة SQLite المحلية بالبيانات النموذجية (9 تعاونيات، 90 عضواً، 146 حركة مالية...)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full gap-2"
              disabled={resetSeed.isPending || demoMode}
              onClick={() =>
                resetSeed.mutate(undefined, {
                  onSuccess: () => toast({ title: t("أُعيدت البيانات التجريبية بنجاح") }),
                  onError: (e) => toast({ variant: "destructive", title: t("تعذر إعادة الضبط"), description: e.message }),
                })
              }
            >
              {resetSeed.isPending ? <Loader2 className="size-4 animate-spin" /> : <FlaskConical className="size-4" />}
              {resetSeed.isPending ? t("جارٍ إعادة الضبط...") : t("إعادة ضبط البيانات")}
            </Button>
            {demoMode && (
              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                {t("غير متاح في وضع العرض — يحتاج باك إند نشطاً")}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <DividerZellige />

      {/* حول المنصة */}
      <Card className="border-border/80">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CmdpLogo />
            <div className="text-left text-[11px] leading-6 text-muted-foreground">
              <p>{t("الإصدار 1.0.0 — نسخة أولى للتجربة والتقييم")}</p>
              <p>Next.js 16 + TypeScript + Tailwind CSS 4 + shadcn/ui + Prisma (SQLite)</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-7 text-muted-foreground">
            CMDP منصة رقمية لإدارة التعاونيات بالمغرب: رقمنة الأنشطة، تتبع الالتزامات القانونية وفق
            القانون رقم 112.12، وتوثيق العلاقة مع الجهات الوصية. الفرونت إند تُنشر ساكنة على
            Cloudflare Pages، والباك إند يعمل محلياً بقاعدة بيانات SQLite يديرها المساعد الألي
            المسؤول عن البيئة المحلية وفق بروتوكول العمل المشترك (docs/AGENT-PROTOCOL.md).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
