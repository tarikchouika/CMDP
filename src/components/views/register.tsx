// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة التسجيل العمومية
// ثلاثة مسارات: حساب مجرد | انخراط في تعاونية قائمة | تسجيل تعاونية جديدة
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Handshake,
  Loader2,
  LogIn,
  UserPlus,
  UserRound,
} from "lucide-react";
import { ApiUnavailableError, rawFetch } from "@/lib/api";
import { REGIONS, SECTORS } from "@/lib/constants";
import { useUIStore } from "@/store/ui";
import { useCooperatives } from "@/hooks/use-cmdp";
import { CmdpMark, DividerZellige, ZelligeStar } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Intent = "ACCOUNT" | "JOIN" | "NEW_COOP";

const INTENTS: { key: Intent; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "ACCOUNT", label: "حساب جديد", icon: UserRound },
  { key: "JOIN", label: "الانخراط في تعاونية", icon: Handshake },
  { key: "NEW_COOP", label: "تسجيل تعاونية", icon: Building2 },
];

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-bold">{label}</Label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function RegisterView() {
  const setView = useUIStore((s) => s.setView);
  const { toast } = useToast();
  const { data: coops } = useCooperatives();
  const approvedCoops = (coops ?? []).filter((c) => c.approvalStatus === "APPROVED" && c.status === "ACTIVE");

  const [intent, setIntent] = React.useState<Intent>("JOIN");
  const [loading, setLoading] = React.useState(false);
  const [done, setDone] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    username: "",
    password: "",
    confirm: "",
    fullName: "",
    phone: "",
    email: "",
    cin: "",
    cooperativeId: "",
    requestType: "MEMBERSHIP",
    shares: "1",
    motivation: "",
    coopName: "",
    sector: SECTORS[0] as string,
    region: REGIONS[0] as string,
    province: "",
    commune: "",
    address: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (form.password.length < 6) {
      toast({ variant: "destructive", title: "كلمة المرور قصيرة", description: "6 أحرف على الأقل" });
      return;
    }
    if (form.password !== form.confirm) {
      toast({ variant: "destructive", title: "كلمتا المرور غير متطابقتين" });
      return;
    }
    if (intent === "JOIN" && !form.cooperativeId) {
      toast({ variant: "destructive", title: "اختر التعاونية التي ترغب في الانخراط بها" });
      return;
    }
    if (intent === "NEW_COOP" && (!form.coopName || !form.province)) {
      toast({ variant: "destructive", title: "أكمل بيانات التعاونية", description: "الاسم والإقليم إلزاميان" });
      return;
    }

    setLoading(true);
    const body: Record<string, unknown> = {
      intent,
      username: form.username,
      password: form.password,
      fullName: form.fullName,
      phone: form.phone || undefined,
      email: form.email || undefined,
      cin: form.cin || undefined,
    };
    if (intent === "JOIN") {
      body.cooperativeId = Number(form.cooperativeId);
      body.requestType = form.requestType;
      body.motivation = form.motivation || undefined;
      body.shares = Number(form.shares) || 1;
    }
    if (intent === "NEW_COOP") {
      body.cooperative = {
        name: form.coopName,
        sector: form.sector,
        region: form.region,
        province: form.province,
        commune: form.commune || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        address: form.address || undefined,
      };
    }

    try {
      const res = await rawFetch<{ message: string }>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(body),
      });
      setDone(res.message);
    } catch (err) {
      if (err instanceof ApiUnavailableError) {
        // النسخة الساكنة: محاكاة استلام الطلب بوضوح
        setDone(
          "تم استلام طلبكم في وضع العرض التجريبي. عند تشغيل الباك إند المحلي ستُحفظ الطلبات فعلياً وتُدرس من طرف الأطراف المختصة."
        );
      } else {
        toast({ variant: "destructive", title: "تعذر إرسال الطلب", description: (err as Error).message });
      }
    } finally {
      setLoading(false);
    }
  }

  // ─── شاشة النجاح ─────────────────────────────────────────────────────────
  if (done) {
    return (
      <div className="relative grid min-h-screen place-items-center overflow-hidden bg-ink px-4 py-10">
        <div className="pattern-zellige-cream absolute inset-0 opacity-80" aria-hidden="true" />
        <div className="relative w-full max-w-md text-center">
          <div className="arch-top overflow-hidden rounded-b-3xl border border-saffron/25 bg-card p-8 shadow-2xl">
            <CheckCircle2 className="mx-auto size-14 text-zellij" />
            <h1 className="mt-4 font-display text-xl font-extrabold text-foreground">تم استلام طلبكم</h1>
            <DividerZellige className="mx-auto mt-4 w-40" />
            <p className="mt-4 text-sm leading-8 text-muted-foreground">{done}</p>
            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={() => setView("login")} className="gap-2 font-bold">
                <LogIn className="size-4" />
                الانتقال إلى صفحة الدخول
              </Button>
              <Button variant="outline" onClick={() => setView("opportunities")} className="gap-2">
                استكشاف فرص العمل والتعاقد
              </Button>
            </div>
          </div>
          <button
            onClick={() => setView("landing")}
            className="mx-auto mt-6 flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 px-5 py-2 text-xs font-semibold text-cream/80 transition-colors hover:bg-cream/10"
          >
            <ArrowRight className="size-3.5" />
            العودة إلى الرئيسية
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink px-4 py-10">
      <div className="pattern-zellige-cream absolute inset-0 opacity-80" aria-hidden="true" />
      <div className="absolute -top-32 start-1/2 size-[560px] -translate-x-1/2 rounded-full bg-terra/25 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-2xl">
        {/* الترويسة */}
        <div className="text-center">
          <CmdpMark className="mx-auto size-14 text-terra-soft" />
          <h1 className="mt-3 font-display text-2xl font-extrabold text-cream">الانضمام إلى CMDP</h1>
          <p className="mt-2 text-sm text-cream/70">
            أنشئ حسابك، أو انخرط في إحدى التعاونيات المسجلة، أو قدّم طلب تسجيل تعاونيتك
          </p>
        </div>

        {/* اختيار المسار */}
        <div className="mt-6 grid grid-cols-3 gap-2" role="tablist" aria-label="نوع الطلب">
          {INTENTS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={intent === t.key}
              onClick={() => setIntent(t.key)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3.5 text-[11px] font-bold transition-all md:text-xs",
                intent === t.key
                  ? "border-saffron/50 bg-saffron/15 text-saffron shadow-lg"
                  : "border-cream/15 bg-cream/5 text-cream/70 hover:bg-cream/10"
              )}
            >
              <t.icon className="size-5" />
              {t.label}
            </button>
          ))}
        </div>

        {/* البطاقة */}
        <form
          onSubmit={onSubmit}
          className="mt-4 space-y-5 rounded-3xl border border-saffron/25 bg-card p-5 shadow-2xl md:p-7"
        >
          {/* بيانات الحساب */}
          <section className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
              <UserRound className="size-4 text-terra" />
              بيانات الحساب {intent === "ACCOUNT" ? "" : "والتقديم"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="اسم المستخدم *" hint="حروف لاتينية صغيرة وأرقام، 3 أحرف على الأقل">
                <Input
                  value={form.username}
                  onChange={(e) => set("username", e.target.value)}
                  placeholder="mohamed.ahammou"
                  dir="ltr"
                  className="bg-background"
                  required
                  minLength={3}
                  pattern="[a-z0-9_.\-]+"
                />
              </Field>
              <Field label="الاسم الكامل *">
                <Input
                  value={form.fullName}
                  onChange={(e) => set("fullName", e.target.value)}
                  placeholder="محمد أحمو"
                  className="bg-background"
                  required
                />
              </Field>
              <Field label="كلمة المرور *" hint="6 أحرف على الأقل">
                <Input
                  type="password"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  placeholder="••••••••"
                  className="bg-background"
                  required
                  minLength={6}
                />
              </Field>
              <Field label="تأكيد كلمة المرور *">
                <Input
                  type="password"
                  value={form.confirm}
                  onChange={(e) => set("confirm", e.target.value)}
                  placeholder="••••••••"
                  className="bg-background"
                  required
                  minLength={6}
                />
              </Field>
              <Field label="الهاتف">
                <Input
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="06 61 23 45 67"
                  dir="ltr"
                  className="bg-background"
                />
              </Field>
              <Field label="البريد الإلكتروني">
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="name@mail.ma"
                  dir="ltr"
                  className="bg-background"
                />
              </Field>
              {intent !== "NEW_COOP" && (
                <Field label="رقم البطاقة الوطنية (اختياري)">
                  <Input
                    value={form.cin}
                    onChange={(e) => set("cin", e.target.value)}
                    placeholder="AB123456"
                    dir="ltr"
                    className="bg-background"
                  />
                </Field>
              )}
            </div>
          </section>

          <DividerZellige className="opacity-60" />

          {/* الانخراط في تعاونية */}
          {intent === "JOIN" && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                <Handshake className="size-4 text-terra" />
                التعاونية المرغوبة
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="التعاونية *">
                  <Select value={form.cooperativeId} onValueChange={(v) => set("cooperativeId", v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="اختر تعاونية من السجل" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {approvedCoops.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="نوع الطلب *">
                  <Select value={form.requestType} onValueChange={(v) => set("requestType", v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBERSHIP">انخراط كعضو (بحصص وحق التصويت)</SelectItem>
                      <SelectItem value="CONTRACT">تعاقد/شراكة مع التعاونية</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {form.requestType === "MEMBERSHIP" && (
                  <Field label="عدد الحصص" hint="الحد الأدنى حصة واحدة حسب القانون الأساسي">
                    <Input
                      type="number"
                      min={1}
                      value={form.shares}
                      onChange={(e) => set("shares", e.target.value)}
                      dir="ltr"
                      className="bg-background"
                    />
                  </Field>
                )}
              </div>
              <Field label="رسالة التقديم" hint="مهاراتك ودوافع الانخراط — تُدرس من طرف رئيس التعاونية أو المسييرين">
                <Textarea
                  value={form.motivation}
                  onChange={(e) => set("motivation", e.target.value)}
                  rows={3}
                  className="bg-background"
                  placeholder="أملك خبرة في..."
                />
              </Field>
            </section>
          )}

          {/* تسجيل تعاونية جديدة */}
          {intent === "NEW_COOP" && (
            <section className="space-y-4">
              <h2 className="flex items-center gap-2 text-sm font-extrabold text-foreground">
                <Building2 className="size-4 text-terra" />
                بيانات التعاونية
              </h2>
              <p className="rounded-xl border border-saffron/30 bg-saffron/10 p-3 text-[11px] leading-6 text-[#8a6414]">
                بعد المصادقة من طرف إدارة المنصة يُفعَّل حسابكم كرئيس(ة) للتعاونية. يبقى التسجيل الرسمي
                لدى السلطات المختصة (السجل المحلي + ODCO) وفق القانون رقم 112.12 مسؤولية التعاونية.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="اسم التعاونية *">
                  <Input
                    value={form.coopName}
                    onChange={(e) => set("coopName", e.target.value)}
                    placeholder="تعاونية..."
                    className="bg-background"
                    required
                  />
                </Field>
                <Field label="القطاع *">
                  <Select value={form.sector} onValueChange={(v) => set("sector", v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SECTORS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="الجهة *">
                  <Select value={form.region} onValueChange={(v) => set("region", v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      {REGIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="الإقليم / العمالة *">
                  <Input
                    value={form.province}
                    onChange={(e) => set("province", e.target.value)}
                    placeholder="تارودانت"
                    className="bg-background"
                    required
                  />
                </Field>
                <Field label="الجماعة">
                  <Input
                    value={form.commune}
                    onChange={(e) => set("commune", e.target.value)}
                    placeholder="أولاد برحيل"
                    className="bg-background"
                  />
                </Field>
                <Field label="العنوان">
                  <Input
                    value={form.address}
                    onChange={(e) => set("address", e.target.value)}
                    placeholder="دوار..."
                    className="bg-background"
                  />
                </Field>
              </div>
            </section>
          )}

          <Button type="submit" size="lg" className="w-full gap-2 font-bold" disabled={loading}>
            {loading ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
            {loading ? "جارٍ إرسال الطلب..." : "إرسال الطلب"}
          </Button>

          <p className="text-center text-[10px] leading-5 text-muted-foreground">
            بالإرسال أنتم توافقون على الشروط العامة للاستخدام وسياسة الخصوصية الخاصة بالمنصة.
          </p>
        </form>

        {/* روابط سفلية */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => setView("login")}
            className="flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 px-5 py-2 text-xs font-semibold text-cream/80 transition-colors hover:bg-cream/10"
          >
            <LogIn className="size-3.5" />
            لديكم حساب؟ سجّلوا الدخول
          </button>
          <button
            onClick={() => setView("landing")}
            className="flex items-center gap-2 rounded-full border border-cream/20 bg-cream/5 px-5 py-2 text-xs font-semibold text-cream/80 transition-colors hover:bg-cream/10"
          >
            <ArrowRight className="size-3.5" />
            الرئيسية
          </button>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 pb-6 text-[10px] text-cream/40">
          <ZelligeStar className="size-3" />
          <span>© 2026 CMDP — المملكة المغربية</span>
        </div>
      </div>
    </div>
  );
}
