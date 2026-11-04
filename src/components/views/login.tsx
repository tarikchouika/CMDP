// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة الدخول
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { ArrowRight, KeyRound, Loader2, Lock, User } from "lucide-react";
import { ApiUnavailableError, rawFetch } from "@/lib/api";
import { useUIStore, type SessionUser } from "@/store/ui";
import { CmdpMark, ZelligeStar, DividerZellige } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

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
      const user = await rawFetch<SessionUser>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      setAuthed(user);
      toast({ title: `مرحباً، ${user.fullName}`, description: "تم تسجيل الدخول بنجاح" });
    } catch (err) {
      if (err instanceof ApiUnavailableError) {
        // نسخة العرض الساكنة: قبول بيانات العرض محلياً
        if (username.trim() === "admin" && password === "cmdp2026") {
          setDemoMode(true);
          setAuthed({ username: "admin", fullName: "مدير المنصة (عرض)", role: "ADMIN" });
          toast({
            title: "دخول في وضع العرض التجريبي",
            description: "الباك إند غير متاح حالياً — البيانات للعرض فقط",
          });
        } else {
          toast({
            variant: "destructive",
            title: "لا يمكن الوصول إلى الخادم",
            description: "في وضع العرض استعمل: admin / cmdp2026",
          });
        }
      } else {
        toast({ variant: "destructive", title: "فشل تسجيل الدخول", description: (err as Error).message });
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
              <p className="mt-1 text-xs text-cream/70">المنصة الرقمية لإدارة التعاونيات</p>
            </div>
            <DividerZellige className="w-40" />
          </div>

          <form onSubmit={onSubmit} className="space-y-4 p-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-1.5 text-xs font-bold">
                <User className="size-3.5 text-terra" /> اسم المستخدم
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
                <Lock className="size-3.5 text-terra" /> كلمة المرور
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
              {loading ? "جارٍ التحقق..." : "الدخول إلى المنصة"}
            </Button>

            <div className="rounded-xl border border-saffron/30 bg-saffron/10 p-3 text-[11px] leading-6 text-[#8a6414]">
              <span className="font-bold">بيانات العرض التجريبي:</span> admin / cmdp2026
              <br />
              تعمل المنصة محلياً بقاعدة SQLite، أو في وضع عرض ساكن دون باك إند.
            </div>
          </form>
        </div>

        <button
          onClick={() => setView("landing")}
          className="mx-auto mt-6 flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 px-5 py-2 text-xs font-semibold text-cream/80 transition-colors hover:bg-cream/10"
        >
          <ArrowRight className="size-3.5" />
          العودة إلى الصفحة الرئيسية
        </button>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-cream/40">
          <ZelligeStar className="size-3" />
          <span>© 2026 CMDP — المملكة المغربية</span>
        </div>
      </div>
    </div>
  );
}
