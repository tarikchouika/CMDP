// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة الدخول (مع حسابات العرض حسب الأدوار ورابط التسجيل)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { ArrowRight, KeyRound, Loader2, Lock, User, UserPlus, Users2 } from "lucide-react";
import { ApiUnavailableError, rawFetch, setAuthToken } from "@/lib/api";
import type { SessionUser } from "@/lib/types";
import { useUIStore } from "@/store/ui";
import { CmdpMark, ZelligeStar, DividerZellige } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

/** حسابات العرض التجريبي — كلمة المرور الموحدة cmdp2026 */
const DEMO_ACCOUNTS: { username: string; label: string }[] = [
  { username: "superadmin", label: t("مالك المنصة") },
  { username: "admin", label: t("أدمن المنصة") },
  { username: "president", label: t("رئيسة تعاونية") },
  { username: "manager", label: t("عضو مسير") },
  { username: "member", label: t("عضو غير مسير") },
  { username: "contractor", label: t("متعاقد") },
];

export function LoginView() {
  const setAuthed = useUIStore((s) => s.setAuthed);
  const setView = useUIStore((s) => s.setView);
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  const { toast } = useToast();

  const [username, setUsername] = React.useState("admin");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await rawFetch<{ token: string; user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setAuthToken(res.token);
      setAuthed(res.user);
      toast({
        title: t("مرحباً، {name}", { name: res.user.fullName }),
        description: t("تم تسجيل الدخول بنجاح"),
      });
    } catch (err) {
      if (err instanceof ApiUnavailableError) {
        // نسخة العرض الساكنة: قبول بيانات العرض محلياً حسب الدور
        const account = DEMO_ACCOUNTS.find((a) => a.username === username.trim());
        if (account && password === "cmdp2026") {
          setDemoMode(true);
          setAuthToken(null);
          setAuthed({
            id: 0,
            username: account.username,
            fullName: t("{name} (عرض)", { name: account.label }),
            role:
              account.username === "superadmin"
                ? "SUPER_ADMIN"
                : account.username === "admin"
                  ? "ADMIN"
                  : account.username === "president" || account.username === "manager"
                    ? "COADMIN"
                    : "USER",
            accountType:
              account.username === "president"
                ? "PRESIDENT"
                : account.username === "manager"
                  ? "MANAGER"
                  : account.username === "member"
                    ? "MEMBER"
                    : account.username === "contractor"
                      ? "CONTRACTOR"
                      : null,
            cooperativeId:
              account.username === "president" || account.username === "member"
                ? 1
                : account.username === "manager"
                  ? 2
                  : account.username === "contractor"
                    ? 3
                    : null,
            cooperativeName:
              account.username === "president" || account.username === "member"
                ? t("تعاونية تافوكت لإنتاج زيت أركان")
                : account.username === "manager"
                  ? t("تعاونية نسج الأطلس للنسيج التقليدي")
                  : account.username === "contractor"
                    ? t("تعاونية دار الزليج للصناعة التقليدية")
                    : null,
            status: "ACTIVE",
          });
          toast({
            title: t("دخول في وضع العرض التجريبي"),
            description: t("الباك إند غير متاح حالياً — البيانات للعرض فقط"),
          });
        } else {
          toast({
            variant: "destructive",
            title: t("لا يمكن الوصول إلى الخادم"),
            description: t("في وضع العرض: اختر حساباً من القائمة وكلمة المرور cmdp2026"),
          });
        }
      } else {
        toast({ variant: "destructive", title: t("فشل تسجيل الدخول"), description: (err as Error).message });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-4 py-10">
      {/* خلفية زليجية */}
      <div className="pattern-zellige-cream absolute inset-0 opacity-80" aria-hidden="true" />
      <div
        className="absolute -top-32 start-1/2 size-[560px] -translate-x-1/2 rounded-full bg-terra/25 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-sm">
        {/* بطاقة بقوس مغربي */}
        <div className="arch-top overflow-hidden rounded-b-3xl border border-saffron/25 bg-card shadow-2xl">
          <div className="pattern-zellige-saffron flex flex-col items-center gap-3 bg-ink px-6 pb-8 pt-12 text-center">
            <CmdpMark className="size-16 text-terra-soft" />
            <div>
              <h1 className="font-display text-2xl font-extrabold text-cream">CMDP</h1>
              <p className="mt-1 text-xs text-cream/70">{t("المنصة الرقمية لإدارة التعاونيات")}</p>
            </div>
            <DividerZellige className="w-40" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-1.5 text-xs font-bold">
                <User className="size-3.5 text-terra" /> {t("اسم المستخدم")}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="admin"
                autoComplete="username"
                className="h-11 bg-background"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-1.5 text-xs font-bold">
                <Lock className="size-3.5 text-terra" /> {t("كلمة المرور")}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className="h-11 bg-background"
                required
              />
            </div>

            <Button type="submit" className="h-11 w-full gap-2 text-sm font-bold" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
              {loading ? t("جارٍ التحقق...") : t("الدخول إلى المنصة")}
            </Button>

            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              {t("أو")}
              <span className="h-px flex-1 bg-border" />
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11 w-full gap-2 text-sm font-bold"
              onClick={() => setView("register")}
            >
              <UserPlus className="size-4 text-terra" />
              {t("حساب جديد أو انخراط في تعاونية")}
            </Button>

            {/* حسابات العرض حسب الأدوار */}
            <div className="rounded-xl border border-saffron/30 bg-saffron/10 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-[#8a6414]">
                <Users2 className="size-3.5" />
                {t("حسابات العرض حسب الأدوار (كلمة المرور: cmdp2026)")}
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {DEMO_ACCOUNTS.map((a) => (
                  <button
                    key={a.username}
                    type="button"
                    onClick={() => {
                      setUsername(a.username);
                      setPassword("cmdp2026");
                    }}
                    className={cn(
                      "rounded-lg border px-2 py-1.5 text-[10px] font-bold transition-colors",
                      username === a.username
                        ? "border-saffron/60 bg-saffron/25 text-[#6b4e0e]"
                        : "border-saffron/25 bg-card text-[#8a6414] hover:bg-saffron/20"
                    )}
                  >
                    {t(a.label)}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[10px] leading-4 text-[#8a6414]/80">
                {t("تعمل المنصة محلياً بقاعدة SQLite، أو في وضع عرض ساكن دون باك إند.")}
              </p>
            </div>
          </form>
        </div>

        <button
          onClick={() => setView("landing")}
          className="mx-auto mt-6 flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 px-5 py-2 text-xs font-semibold text-cream/80 transition-colors hover:bg-cream/10"
        >
          <ArrowRight className="size-3.5" />
          {t("العودة إلى الصفحة الرئيسية")}
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-cream/40">
          <ZelligeStar className="size-3" />
          <span>{t("© 2026 CMDP — المملكة المغربية")}</span>
        </div>
      </div>
    </div>
  );
}
