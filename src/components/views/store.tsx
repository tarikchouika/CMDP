// ═══════════════════════════════════════════════════════════════════════════
// CMDP — المتجر: عرض وبيع منتجات وخدمات التعاونيات (عمومي)
// بطاقات منتجات بهوية مغربية + تفاصيل + طلب شراء — متعدد اللغات
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CheckCircle2,
  MapPin,
  Package,
  Phone,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Tag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { t, getLang, LANGS } from "@/lib/i18n";
import { localizeDemo } from "@/lib/demo-localized";
import { ApiUnavailableError, rawFetch } from "@/lib/api";
import { useUIStore } from "@/store/ui";
import { CmdpLogo, DividerZellige, ZelligeStar } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface StoreProduct {
  id: number;
  name: string;
  description?: string | null;
  category: string;
  unit?: string | null;
  price: number;
  imageUrl?: string | null;
  inStock: boolean;
  featured: boolean;
  cooperative: { id: number; name: string; region: string; sector: string };
}

const CATEGORIES = ["الكل", "منتجات غذائية", "صناعة تقليدية", "نسيج وملابس", "خدمات", "أخرى"];

// ─── بيانات العرض التجريبي (تُستبدل ببيانات الباك إند عند الاتصال) ──────────
const DEMO_PRODUCTS: StoreProduct[] = [
  { id: -1, name: "زيت أركان غذائي معصور على البارد", description: "زيت أركان صافي 100% من تعاونية نسائية بسوس — معصور على البارد للحفاظ على الفيتامينات. زجاجة 250 مل.", category: "منتجات غذائية", unit: "250 مل", price: 180, imageUrl: "/store/argan-oil.png", inStock: true, featured: true, cooperative: { id: 1, name: "تعاونية تافوكت لإنتاج زيت أركان", region: "سوس-ماسة", sector: "الفلاحة والمنتجات المجالية" } },
  { id: -2, name: "بلاط زليج مغربي تقليدي", description: "زليج مقطوع يدوياً بنقوش هندسية أصيلة — مناسب للحمامات والصالونات والفناءات. الطلب بالمتر المربع.", category: "صناعة تقليدية", unit: "م²", price: 450, imageUrl: "/store/zellige-tiles.png", inStock: true, featured: true, cooperative: { id: 2, name: "تعاونية دار الزليج للصناعة التقليدية", region: "فاس-مكناس", sector: "الصناعة التقليدية" } },
  { id: -3, name: "سجادة أمازيغية منسوجة يدوياً", description: "سجادة صوف طبيعي منسوجة على النول التقليدي بنقوش أمازيغية دالة — قطعة فريدة 200×140 سم.", category: "نسيج وملابس", unit: "قطعة", price: 2800, imageUrl: "/store/berber-rug.png", inStock: true, featured: true, cooperative: { id: 3, name: "تعاونية نسج الأطلس للنسيج التقليدي", region: "مراكش-آسفي", sector: "الصناعة التقليدية" } },
  { id: -4, name: "عسل جبلي مغربي متعدد الأزهار", description: "عسل خام غير مصفى من مرتفعات الأطلس — غابة 500 غرام مع شهادة المنشأ التعاونية.", category: "منتجات غذائية", unit: "500 غ", price: 95, imageUrl: "/store/mountain-honey.png", inStock: true, featured: false, cooperative: { id: 1, name: "تعاونية تافوكت لإنتاج زيت أركان", region: "سوس-ماسة", sector: "الفلاحة والمنتجات المجالية" } },
  { id: -5, name: "صابون بلدي بزيت الزيتون", description: "صابون بلدي تقليدي بزيت الزيتون البلدي والأوكاليبتوس — للحمام المغربي والعناية بالبشرة. علبة 300 غ.", category: "منتجات غذائية", unit: "300 غ", price: 45, imageUrl: "/store/beldi-soap.png", inStock: true, featured: false, cooperative: { id: 2, name: "تعاونية دار الزليج للصناعة التقليدية", region: "فاس-مكناس", sector: "الصناعة التقليدية" } },
  { id: -6, name: "شاي أطلس الأخضر المعتق", description: "شاي أخضر معتق بمنتوجات تعاونية جبلية — خليطة بالنعناع والزعتر المجفف طبيعياً. علبة 200 غ.", category: "منتجات غذائية", unit: "200 غ", price: 60, imageUrl: "/store/atlas-tea.png", inStock: true, featured: false, cooperative: { id: 3, name: "تعاونية نسج الأطلس للنسيج التقليدي", region: "مراكش-آسفي", sector: "الفلاحة والمنتجات المجالية" } },
  { id: -7, name: "جلابة مطرزة بخيوط ذهبية", description: "جلابة احتفالية مطرزة يدوياً بخيوط الصقلي الذهبية على قماش فاخر — تفصيل حسب الطلب بالمقاسات.", category: "نسيج وملابس", unit: "قطعة", price: 1900, imageUrl: "/store/embroidered-kaftan.png", inStock: true, featured: true, cooperative: { id: 3, name: "تعاونية نسج الأطلس للنسيج التقليدي", region: "مراكش-آسفي", sector: "الصناعة التقليدية" } },
  { id: -8, name: "زعفران تالوين الأصيل", description: "زعفران مغربي من درجة أولى — خيوط حمراء كاملة ملتقاة يدوياً مع تعبئة محكمة. غرام واحد.", category: "منتجات غذائية", unit: "1 غ", price: 35, imageUrl: "/store/taldaout-saffron.png", inStock: true, featured: false, cooperative: { id: 1, name: "تعاونية تافوكت لإنتاج زيت أركان", region: "سوس-ماسة", sector: "الفلاحة والمنتجات المجالية" } },
];

function fmtMAD(v: number): string {
  const locale = LANGS.find((l) => l.code === getLang())?.locale ?? "ar-MA";
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v) + "\u00A0" + t("د.م.");
}

export function StoreView() {
  const setView = useUIStore((s) => s.setView);
  const { toast } = useToast();
  const [products, setProducts] = React.useState<StoreProduct[] | null>(null);
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState("الكل");
  const [selected, setSelected] = React.useState<StoreProduct | null>(null);
  const [ordering, setOrdering] = React.useState<StoreProduct | null>(null);
  const demoMode = useUIStore((s) => s.demoMode);

  // جلب المنتجات: الباك إند أو بيانات العرض
  React.useEffect(() => {
    let alive = true;
    rawFetch<StoreProduct[]>("/api/products")
      .then((rows) => alive && setProducts(rows))
      .catch((err) => {
        if (err instanceof ApiUnavailableError && alive) setProducts(localizeDemo(DEMO_PRODUCTS));
        else if (alive) setProducts(localizeDemo(DEMO_PRODUCTS));
      });
    return () => {
      alive = false;
    };
  }, []);

  const list = (products ?? []).filter(
    (p) =>
      (cat === "الكل" || p.category === cat) &&
      (!q.trim() || p.name.includes(q.trim()) || p.cooperative.name.includes(q.trim()))
  );
  const isDemo = demoMode || (products ?? []).some((p) => p.id < 0);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* الترويسة */}
      <header className="sticky top-0 z-40 border-b border-cream/10 bg-ink/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
          <button onClick={() => setView("landing")} aria-label="CMDP">
            <CmdpLogo light />
          </button>
          <span className="me-auto hidden items-center gap-1.5 text-sm font-bold text-saffron md:flex">
            <Store className="size-4" />
            {t("متجر التعاونيات")}
          </span>
          <Button
            onClick={() => setView("landing")}
            variant="outline"
            className="gap-1.5 border-cream/25 bg-transparent text-cream hover:bg-cream/10 hover:text-cream"
          >
            <ArrowLeft className="size-4 rtl:rotate-180" />
            {t("الرئيسية")}
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-10 md:px-6">
        {/* مقدمة المتجر */}
        <div className="mb-8 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-saffron/40 bg-saffron/10 px-4 py-1 text-xs font-bold text-saffron-ink">
            <ZelligeStar className="size-3 text-saffron" />
            {t("من المنتج إلى السوق — بثقة التعاونيات")}
          </span>
          <h1 className="mt-4 font-display text-2xl font-black text-foreground md:text-4xl">
            {t("متجر منتجات وخدمات التعاونيات")}
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            {t("منتجات أصيلة من تعاونيات مغربية موثقة: أركان، زليج، نسيج، عسل، زعفران والمزيد — طلبكم يصل مباشرة للتعاونية المنتجة.")}
          </p>
        </div>

        {/* البحث والتصفية */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative min-w-56 flex-1">
            <Search className="absolute top-1/2 size-4 -translate-y-1/2 text-muted-foreground start-3" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("ابحثوا عن منتج أو تعاونية...")}
              className="bg-card ps-9"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors",
                  cat === c
                    ? "border-terra/40 bg-terra/10 text-terra"
                    : "border-border bg-card text-muted-foreground hover:bg-muted/60"
                )}
              >
                {t(c)}
              </button>
            ))}
          </div>
        </div>

        {isDemo && (
          <p className="mb-6 rounded-2xl border border-saffron/30 bg-saffron/10 p-3 text-center text-xs font-bold text-saffron-ink">
            {t("وضع العرض: منتجات توضيحية لعرض المتجر — عند تشغيل الباك إند المحلي تُعرض منتجات التعاونيات الحقيقية.")}
          </p>
        )}

        {/* شبكة المنتجات */}
        {list.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <Package className="mx-auto mb-3 size-10 opacity-30" />
            <p className="text-sm">{t("لا توجد منتجات مطابقة")}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {list.map((p) => (
              <Card
                key={p.id}
                className="group cursor-pointer overflow-hidden border-border/80 bg-card transition-all hover:-translate-y-1 hover:shadow-lg"
                onClick={() => setSelected(p)}
              >
                <div className="relative aspect-square overflow-hidden bg-muted">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid size-full place-items-center bg-gradient-to-br from-terra/15 to-saffron/10">
                      <Package className="size-10 text-terra/40" />
                    </div>
                  )}
                  {p.featured && (
                    <span className="absolute top-2.5 flex items-center gap-1 rounded-full bg-saffron px-2.5 py-0.5 text-[10px] font-black text-ink start-2.5">
                      <Star className="size-2.5 fill-ink" />
                      {t("مميز")}
                    </span>
                  )}
                  {!p.inStock && (
                    <span className="absolute inset-0 grid place-items-center bg-background/70 text-xs font-black text-foreground">
                      {t("غير متوفر حالياً")}
                    </span>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
                    <Tag className="size-3 text-terra/70" />
                    {t(p.category)}
                  </div>
                  <h3 className="mt-1.5 line-clamp-2 min-h-10 font-display text-sm font-extrabold text-foreground">
                    {p.name}
                  </h3>
                  <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-muted-foreground">
                    <Building2 className="size-3 shrink-0" />
                    {p.cooperative.name}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <p className="font-display text-base font-black text-terra">
                      {fmtMAD(p.price)}
                      {p.unit && <span className="ms-1 text-[10px] font-bold text-muted-foreground">/ {t(p.unit)}</span>}
                    </p>
                    <Button size="sm" className="h-8 gap-1.5 bg-terra px-3 text-xs font-bold hover:bg-terra/85">
                      <ShoppingBag className="size-3.5" />
                      {t("طلب")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DividerZellige className="mx-auto mt-12 w-72 opacity-50" />

        {/* دعوة للتعاونيات */}
        <div className="mx-auto mt-8 max-w-2xl rounded-3xl border border-saffron/25 bg-saffron/10 p-6 text-center">
          <h2 className="flex items-center justify-center gap-2 font-display text-base font-extrabold text-saffron-ink">
            <Sparkles className="size-4" />
            {t("تعاونيتكم تنتج؟")}
          </h2>
          <p className="mt-2 text-sm leading-7 text-foreground/75">
            {t("انشروا منتجاتكم وخدماتكم في المتجر ووصلوا إلى زوار المنصة من كل الجهات — النشر متاح للمسيّرين من وحدة الفرص والمتجر.")}
          </p>
          <Button
            className="mt-4 gap-2 bg-terra font-bold hover:bg-terra/85"
            onClick={() => setView(useUIStore.getState().authed ? "opportunities" : "register")}
          >
            <BadgeCheck className="size-4" />
            {t("انشروا منتجاتكم")}
          </Button>
        </div>
      </main>

      <footer className="mt-auto border-t border-border bg-card/60 px-6 py-5 text-center text-xs text-muted-foreground">
        © 2026 CMDP — {t("متجر التعاونيات — منتجات أصيلة بثقة تعاونية")}
      </footer>

      {/* حوار التفاصيل */}
      <Dialog open={!!selected} onOpenChange={(v) => !v && setSelected(null)}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-card p-0">
          {selected && (
            <div className="grid gap-0 md:grid-cols-2">
              <div className="relative aspect-square bg-muted md:aspect-auto md:min-h-80">
                {selected.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={selected.imageUrl} alt={selected.name} className="size-full object-cover md:rounded-s-2xl" />
                ) : (
                  <div className="grid size-full place-items-center bg-gradient-to-br from-terra/15 to-saffron/10">
                    <Package className="size-12 text-terra/40" />
                  </div>
                )}
              </div>
              <div className="p-6">
                <DialogHeader className="space-y-2 p-0 text-start">
                  <DialogTitle className="font-display text-lg font-extrabold leading-8">
                    {selected.name}
                  </DialogTitle>
                  <DialogDescription className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="flex items-center gap-1 rounded-full bg-terra/10 px-2.5 py-1 font-bold text-terra">
                      <Building2 className="size-3" />
                      {selected.cooperative.name}
                    </span>
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <MapPin className="size-3" />
                      {t(selected.cooperative.region)}
                    </span>
                  </DialogDescription>
                </DialogHeader>
                <p className="mt-4 text-sm leading-7 text-muted-foreground">
                  {selected.description ?? t("منتج تعاوني أصيل — للتفاصيل الإضافية تواصلوا مع التعاونية.")}
                </p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="font-display text-2xl font-black text-terra">{fmtMAD(selected.price)}</span>
                  {selected.unit && (
                    <span className="text-xs font-bold text-muted-foreground">/ {t(selected.unit)}</span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-zellij">
                  <CheckCircle2 className="size-3.5" />
                  {t("منتج تعاوني موثق — شهادة المنشأ متاحة عند الطلب")}
                </div>
                <Button
                  className="mt-6 w-full gap-2 bg-terra font-black hover:bg-terra/85"
                  disabled={!selected.inStock}
                  onClick={() => {
                    setOrdering(selected);
                    setSelected(null);
                  }}
                >
                  <ShoppingBag className="size-4" />
                  {selected.inStock ? t("طلب المنتج") : t("غير متوفر حالياً")}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* حوار الطلب */}
      <OrderDialog product={ordering} onClose={() => setOrdering(null)} onToast={toast} isDemo={isDemo} />
    </div>
  );
}

/** حوار طلب الشراء — يُرسل الطلب للتعاونية مباشرة */
function OrderDialog({
  product,
  onClose,
  onToast,
  isDemo,
}: {
  product: StoreProduct | null;
  onClose: () => void;
  onToast: (opts: { title: string; description?: string; variant?: "default" | "destructive" }) => void;
  isDemo: boolean;
}) {
  const [form, setForm] = React.useState({ name: "", phone: "", city: "", quantity: "1", note: "" });
  const [loading, setLoading] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;
    if (!form.name.trim() || form.phone.trim().length < 8) {
      onToast({ variant: "destructive", title: t("الاسم ورقم هاتف صحيح إلزاميان") });
      return;
    }
    setLoading(true);
    try {
      await rawFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          productId: product.id,
          quantity: Number(form.quantity) || 1,
          customerName: form.name,
          phone: form.phone,
          city: form.city || undefined,
          note: form.note || undefined,
        }),
      });
      onToast({
        title: t("تم تسجيل طلبكم"),
        description: t("ستتواصل معكم التعاونية لتأكيد الطلب وترتيب التسليم — شكراً لثقتكم بالمنتجات التعاونية."),
      });
      onClose();
    } catch {
      if (isDemo) {
        onToast({
          title: t("تم تسجيل طلبكم"),
          description: t("وضع العرض: عند تشغيل الباك إند المحلي ستُرسل الطلبات فعلياً للتعاونيات."),
        });
        onClose();
      } else {
        onToast({ variant: "destructive", title: t("تعذر إرسال الطلب") });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={!!product} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <ShoppingBag className="size-4 text-terra" />
            {t("طلب المنتج")}
          </DialogTitle>
          <DialogDescription>
            {product?.name} — {product && fmtMAD(product.price)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("الاسم الكامل *")}</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-background" required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("هاتف التواصل *")}</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                dir="ltr"
                placeholder="06 XX XX XX XX"
                className="bg-background"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("المدينة")}</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("الكمية")}</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="bg-background"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">{t("ملاحظات على الطلب")}</Label>
            <Textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder={t("التسليم، التغليف، تفاصيل إضافية...")}
              className="min-h-16 bg-background"
            />
          </div>
          <p className="flex items-center gap-1.5 rounded-xl bg-muted/50 p-2.5 text-[10px] leading-5 text-muted-foreground">
            <Phone className="size-3 shrink-0" />
            {t("تتواصل معكم التعاونية مباشرة لتأكيد الطلب وترتيب الدفع والتسليم — لا يتم أي دفع عبر المنصة.")}
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("إلغاء")}
            </Button>
            <Button type="submit" disabled={loading} className="gap-2 bg-terra font-bold hover:bg-terra/85">
              {loading ? t("جارٍ إرسال الطلب...") : t("إرسال الطلب")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
