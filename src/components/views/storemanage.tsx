// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة إدارة المتجر (الرئيس / الكوأدمين — الإصدار 1.3.0)
// تبويبات: الطلبات (إضافة ومعالجة) | المنتجات | الإحصائيات والتقارير
// النطاق: كوأدمن = متجر تعاونيته؛ الإدارة = الكل — مطابق لحراسة الباك إند
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  BarChart3,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  Inbox,
  Loader2,
  Package,
  PackagePlus,
  Pencil,
  PhoneCall,
  PlusCircle,
  Printer,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ORDER_STATUS, PRODUCT_CATEGORIES, PRODUCT_STATUS } from "@/lib/constants";
import { formatMAD, formatNumber, formatShortDate } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import {
  useCreateOrder,
  useDeleteOrder,
  useDeleteProduct,
  useSaveProduct,
  useStoreOrders,
  useStoreProducts,
  useStoreStats,
  useUpdateOrderStatus,
  type ProductInput,
} from "@/hooks/use-cmdp";
import type { Order, Product } from "@/lib/types";
import { ConfirmDialog, EmptyState, LBadge, PageHeader, StatCard, TableSkeleton } from "@/components/shared";
import { FileUploadField, type StoredFile } from "@/components/file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { t, tError } from "@/lib/i18n";

const CHART_COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)"];

// ─── بطاقة طلب ─────────────────────────────────────────────────────────────
function OrderCard({
  order,
  onStatus,
  onDelete,
}: {
  order: Order;
  onStatus: (o: Order, status: string) => void;
  onDelete: (o: Order) => void;
}) {
  const total = (order.product?.price ?? 0) * order.quantity;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-foreground">{order.customerName}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {order.product?.name ?? "—"}
            {order.product?.unit ? ` • ${t(order.product.unit)}` : ""}
            {` • ${t("الكمية: {n}", { n: formatNumber(order.quantity) })}`}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
            <span dir="ltr" className="font-semibold text-terra">☎ {order.phone}</span>
            {order.city && <span>{t(order.city)}</span>}
            <span>{formatShortDate(order.createdAt)}</span>
          </div>
          {order.note && (
            <p className="mt-2 rounded-lg bg-muted/60 p-2 text-[11px] leading-5 text-muted-foreground">
              {t(order.note)}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <LBadge map={ORDER_STATUS} value={order.status} />
          <p className="font-display text-sm font-extrabold tabular-nums text-foreground">
            {formatMAD(total)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap justify-end gap-1.5 border-t border-border/60 pt-3">
        {order.status === "NEW" && (
          <Button size="sm" variant="outline" className="h-8 gap-1 px-2.5 text-xs" onClick={() => onStatus(order, "CONTACTED")}>
            <PhoneCall className="size-3.5" /> {t("تم التواصل")}
          </Button>
        )}
        {(order.status === "NEW" || order.status === "CONTACTED") && (
          <>
            <Button size="sm" className="h-8 gap-1 px-2.5 text-xs font-bold" onClick={() => onStatus(order, "DONE")}>
              <CheckCircle2 className="size-3.5" /> {t("إتمام الطلب")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 px-2.5 text-xs text-destructive hover:text-destructive"
              onClick={() => onStatus(order, "CANCELLED")}
            >
              <XCircle className="size-3.5" /> {t("إلغاء")}
            </Button>
          </>
        )}
        {order.status !== "NEW" && order.status !== "CANCELLED" && order.status !== "DONE" && null}
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive"
          onClick={() => onDelete(order)}
        >
          <Trash2 className="size-3.5" /> {t("حذف")}
        </Button>
      </div>
    </div>
  );
}

// ─── حوار طلب يدوي ─────────────────────────────────────────────────────────
function ManualOrderDialog({
  open,
  onOpenChange,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: Product[];
}) {
  const create = useCreateOrder();
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    productId: "",
    quantity: "1",
    customerName: "",
    phone: "",
    city: "",
    note: "",
  });
  const active = products.filter((p) => p.status === "ACTIVE");

  React.useEffect(() => {
    if (open) setForm({ productId: "", quantity: "1", customerName: "", phone: "", city: "", note: "" });
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await create.mutateAsync({
        productId: Number(form.productId),
        quantity: Math.max(1, Number(form.quantity) || 1),
        customerName: form.customerName,
        phone: form.phone,
        city: form.city || null,
        note: form.note || null,
      });
      toast({ title: t("تم تسجيل الطلب"), description: t("ظهر الطلب في قائمة المعالجة بحالة جديد") });
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر التسجيل"), description: tError(err) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlusCircle className="size-5 text-terra" /> {t("تسجيل طلب يدوي")}
          </DialogTitle>
          <DialogDescription>
            {t("لطلب وصل هاتفياً أو حضورياً — يُسجَّل بحالة «طلب جديد» لمعالجته كغيره")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold">{t("المنتج")}</Label>
            <Select value={form.productId} onValueChange={(v) => setForm((f) => ({ ...f, productId: v }))} required>
              <SelectTrigger className="h-11">
                <SelectValue placeholder={t("اختر منتج التعاونية")} />
              </SelectTrigger>
              <SelectContent>
                {active.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {t(p.name)} — {formatMAD(p.price)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {active.length === 0 && (
              <p className="text-[11px] text-muted-foreground">{t("لا توجد منتجات معروضة — أضف منتجاً أولاً من تبويب المنتجات")}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold">{t("الكمية")}</Label>
              <Input
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                className="h-11"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">{t("المدينة (اختياري)")}</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} className="h-11" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold">{t("اسم الزبون")}</Label>
              <Input value={form.customerName} onChange={(e) => setForm((f) => ({ ...f, customerName: e.target.value }))} className="h-11" required />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">{t("الهاتف")}</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" className="h-11" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold">{t("ملاحظة (اختياري)")}</Label>
            <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} rows={2} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("إلغاء")}</Button>
            <Button type="submit" className="gap-2 font-bold" disabled={create.isPending || !form.productId}>
              {create.isPending ? <Loader2 className="size-4 animate-spin" /> : <PlusCircle className="size-4" />}
              {t("تسجيل الطلب")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── حوار منتج (إنشاء/تعديل) ───────────────────────────────────────────────
function ProductDialog({
  open,
  onOpenChange,
  editing,
  cooperativeId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Product | null;
  cooperativeId: number;
}) {
  const save = useSaveProduct();
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    name: "",
    category: "منتجات غذائية",
    price: "",
    unit: "",
    description: "",
    featured: false,
    inStock: true,
    status: "ACTIVE",
  });
  const [image, setImage] = React.useState<StoredFile[]>([]);

  React.useEffect(() => {
    if (open) {
      setForm({
        name: editing?.name ?? "",
        category: editing?.category ?? "منتجات غذائية",
        price: editing ? String(editing.price) : "",
        unit: editing?.unit ?? "",
        description: editing?.description ?? "",
        featured: editing?.featured ?? false,
        inStock: editing?.inStock ?? true,
        status: editing?.status ?? "ACTIVE",
      });
      setImage([]);
    }
  }, [open, editing]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: ProductInput = {
      id: editing?.id ?? null,
      cooperativeId,
      name: form.name,
      category: form.category,
      price: Number(form.price),
      unit: form.unit || null,
      description: form.description || null,
      featured: form.featured,
      inStock: form.inStock,
      status: form.status,
      imageUrl: image[0]?.dataUrl ?? editing?.imageUrl ?? null,
    };
    try {
      await save.mutateAsync(payload);
      toast({
        title: editing ? t("تم تحديث المنتج") : t("تمت إضافة المنتج"),
        description:
          form.status === "ACTIVE"
            ? t("معروض الآن في متجر المنصة")
            : t("محفوظ كمسودة مخفية — اعرضه عند الجاهزية"),
      });
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر الحفظ"), description: tError(err) });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-terra" />
            {editing ? t("تعديل منتج") : t("منتج جديد")}
          </DialogTitle>
          <DialogDescription>
            {t("منتجات التعاونية المعروضة في متجر المنصة العمومي")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold">{t("اسم المنتج")}</Label>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="h-11" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold">{t("الفئة")}</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{t(c)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">{t("السعر (د.م.)")}</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                className="h-11"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-xs font-bold">{t("وحدة البيع (اختياري)")}</Label>
              <Input value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} className="h-11" placeholder={t("كغ، لتر، قطعة...")} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold">{t("حالة العرض")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{t("معروض في المتجر")}</SelectItem>
                  <SelectItem value="HIDDEN">{t("مخفي (مسودة)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-bold">{t("الوصف")}</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
          </div>
          <div className="flex flex-wrap gap-6 rounded-xl border border-border bg-muted/30 p-3">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <Switch checked={form.inStock} onCheckedChange={(v) => setForm((f) => ({ ...f, inStock: v }))} />
              {t("متوفر في المخزون")}
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold">
              <Switch checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v }))} />
              {t("منتج مميز")} <Star className="size-3.5 text-saffron" />
            </label>
          </div>
          <FileUploadField
            label={t("صورة المنتج")}
            hint={t("تُضغط تلقائياً — اختيارية")}
            accept="image/*"
            multiple={false}
            files={image}
            onChange={setImage}
            id="product-image"
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("إلغاء")}</Button>
            <Button type="submit" className="gap-2 font-bold" disabled={save.isPending}>
              {save.isPending ? <Loader2 className="size-4 animate-spin" /> : <Package className="size-4" />}
              {editing ? t("حفظ التعديلات") : t("إضافة المنتج")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── تبويب الإحصائيات والتقارير ─────────────────────────────────────────────
function StatsTab({ coopName }: { coopName: string | null }) {
  const [days, setDays] = React.useState(30);
  const { data, isLoading } = useStoreStats(days);
  const totals = data?.totals;
  const byStatus = totals?.byStatus ?? {};
  const pieData = [
    { name: t("طلب جديد"), value: byStatus.NEW ?? 0 },
    { name: t("تم التواصل"), value: byStatus.CONTACTED ?? 0 },
    { name: t("مكتمل"), value: byStatus.DONE ?? 0 },
    { name: t("ملغى"), value: byStatus.CANCELLED ?? 0 },
  ].filter((d) => d.value > 0);

  if (isLoading) return <TableSkeleton rows={6} cols={4} />;
  if (!data) return <EmptyState icon={BarChart3} title={t("لا توجد إحصائيات")} desc={t("ستظهر الإحصائيات فور توفر الطلبات")} />;

  return (
    <div className="space-y-6">
      {/* الفترة + الطباعة */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-xl border border-border bg-card p-1">
          {[
            { d: 7, label: t("آخر 7 أيام") },
            { d: 30, label: t("آخر 30 يوماً") },
            { d: 90, label: t("آخر 90 يوماً") },
          ].map((opt) => (
            <button
              key={opt.d}
              type="button"
              onClick={() => setDays(opt.d)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                days === opt.d ? "bg-terra text-white" : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <Button variant="outline" className="gap-2" onClick={() => window.print()}>
          <Printer className="size-4" /> {t("طباعة التقرير")}
        </Button>
      </div>

      {/* المؤشرات */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("إجمالي الطلبات")} value={formatNumber(totals?.totalOrders ?? 0)} icon={ShoppingBag} tone="terra" hint={`${t("خلال")} ${days} ${t("يوماً")}`} />
        <StatCard label={t("الإيرادات المحققة")} value={formatMAD(totals?.doneRevenue ?? 0)} icon={TrendingUp} tone="zellij" hint={t("الطلبات المكتملة")} />
        <StatCard label={t("قيد المعالجة")} value={formatMAD(totals?.pipelineValue ?? 0)} icon={PhoneCall} tone="saffron" hint={t("جديد + تم التواصل")} />
        <StatCard label={t("متوسط قيمة الطلب")} value={formatMAD(totals?.avgOrderValue ?? 0)} icon={BarChart3} tone="plum" hint={`${t("نسبة الإتمام")} ${totals?.completionRate ?? 0}%`} />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label={t("طلبات جديدة")} value={formatNumber(byStatus.NEW ?? 0)} icon={Inbox} tone="saffron" />
        <StatCard label={t("تم التواصل")} value={formatNumber(byStatus.CONTACTED ?? 0)} icon={PhoneCall} tone="terra" />
        <StatCard label={t("مكتملة")} value={formatNumber(byStatus.DONE ?? 0)} icon={CheckCircle2} tone="zellij" />
        <StatCard label={t("ملغاة")} value={formatNumber(byStatus.CANCELLED ?? 0)} icon={XCircle} tone="plum" />
      </div>

      {/* الرسوم */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-3">
          <h3 className="mb-1 text-sm font-extrabold text-foreground">{t("تطور الطلبات أسبوعياً")}</h3>
          <p className="mb-3 text-[11px] text-muted-foreground">{t("عدد الطلبات الواردة والمكتملة والإيرادات المحققة")}</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklySeries} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gOrders" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-1)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-chart-3)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--color-chart-3)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} width={32} />
                <Tooltip
                  contentStyle={{
                    background: "var(--color-popover)",
                    color: "var(--color-popover-foreground)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="orders" name={t("الطلبات")} stroke="var(--color-chart-1)" fill="url(#gOrders)" strokeWidth={2} />
                <Area type="monotone" dataKey="revenue" name={t("الإيراد (د.م.)")} stroke="var(--color-chart-3)" fill="url(#gRevenue)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-2">
          <h3 className="mb-1 text-sm font-extrabold text-foreground">{t("توزيع حالات الطلبات")}</h3>
          <p className="mb-3 text-[11px] text-muted-foreground">{t("نسبة كل حالة خلال الفترة المحددة")}</p>
          <div className="h-64">
            {pieData.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">{t("لا توجد طلبات خلال الفترة")}</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      color: "var(--color-popover-foreground)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* أعلى المنتجات + حالة الكتالوج */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-3">
          <h3 className="mb-1 text-sm font-extrabold text-foreground">{t("أعلى المنتجات طلباً")}</h3>
          <p className="mb-3 text-[11px] text-muted-foreground">{t("بالكمية المطلوبة والإيراد المحقق")}</p>
          {data.topProducts.length === 0 ? (
            <EmptyState icon={Package} title={t("لا توجد طلبات بعد")} desc={t("ستظهر هنا ترتيب المنتجات فور وصول الطلبات")} />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topProducts} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10 }} stroke="var(--color-muted-foreground)" tickLine={false} axisLine={false} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    stroke="var(--color-muted-foreground)"
                    tickLine={false}
                    axisLine={false}
                    width={140}
                    orientation={typeof window !== "undefined" && document.documentElement.dir === "rtl" ? "right" : "left"}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-popover)",
                      color: "var(--color-popover-foreground)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="quantity" name={t("الكمية")} fill="var(--color-chart-2)" radius={[0, 6, 6, 0]} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4 lg:col-span-2">
          <h3 className="text-sm font-extrabold text-foreground">{t("حالة الكتالوج")}</h3>
          {coopName && (
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Building2 className="size-3.5" /> {coopName}
            </p>
          )}
          <dl className="space-y-2 text-xs">
            {[
              { k: t("إجمالي المنتجات"), v: data.catalog.total, tone: "text-foreground" },
              { k: t("معروضة في المتجر"), v: data.catalog.active, tone: "text-zellij" },
              { k: t("مخفية (مسودات)"), v: data.catalog.hidden, tone: "text-muted-foreground" },
              { k: t("غير متوفرة في المخزون"), v: data.catalog.outOfStock, tone: "text-destructive" },
              { k: t("منتجات مميزة"), v: data.catalog.featured, tone: "text-saffron-ink" },
            ].map((row) => (
              <div key={row.k} className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2">
                <dt className="text-muted-foreground">{row.k}</dt>
                <dd className={`font-display font-extrabold tabular-nums ${row.tone}`}>{formatNumber(row.v)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}

// ─── الوحدة الرئيسية ───────────────────────────────────────────────────────
export function StoreManageView() {
  const user = useUIStore((s) => s.user);
  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const { toast } = useToast();

  // النطاق: كوأدمن = تعاونيته؛ إدارة = التعاونية النشطة في المحدد
  const scopeCoopId = user?.role === "COADMIN" ? user.cooperativeId : activeCoopId;
  const { data: products, isLoading: productsLoading } = useStoreProducts(scopeCoopId);
  const { data: orders, isLoading: ordersLoading } = useStoreOrders();
  const updateStatus = useUpdateOrderStatus();
  const deleteOrder = useDeleteOrder();
  const saveProduct = useSaveProduct();
  const deleteProduct = useDeleteProduct();

  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [manualOpen, setManualOpen] = React.useState(false);
  const [productOpen, setProductOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Product | null>(null);
  const [confirmOrder, setConfirmOrder] = React.useState<Order | null>(null);
  const [confirmProduct, setConfirmProduct] = React.useState<Product | null>(null);

  const coopName =
    user?.role === "COADMIN"
      ? user.cooperativeName
      : products?.[0]?.cooperative?.name ?? null;

  const filteredOrders = (orders ?? []).filter((o) => statusFilter === "ALL" || o.status === statusFilter);
  const statusCount = (s: string) => (orders ?? []).filter((o) => o.status === s).length;

  async function onStatus(o: Order, status: string) {
    try {
      await updateStatus.mutateAsync({ id: o.id, status });
      toast({
        title: t("تم تحديث حالة الطلب"),
        description: `${o.customerName} — ${t(ORDER_STATUS[status]?.label ?? status)}`,
      });
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر التنفيذ"), description: tError(err) });
    }
  }

  async function onDeleteOrder(o: Order) {
    try {
      await deleteOrder.mutateAsync(o.id);
      toast({ title: t("تم حذف الطلب") });
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر الحذف"), description: tError(err) });
    } finally {
      setConfirmOrder(null);
    }
  }

  async function onToggleProductStatus(p: Product) {
    const next = p.status === "ACTIVE" ? "HIDDEN" : "ACTIVE";
    try {
      await saveProduct.mutateAsync({ ...p, status: next });
      toast({
        title: next === "ACTIVE" ? t("المنتج معروض الآن في المتجر") : t("أُخفي المنتج من المتجر"),
        description: t(p.name),
      });
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر التنفيذ"), description: tError(err) });
    }
  }

  async function onDeleteProduct(p: Product) {
    try {
      await deleteProduct.mutateAsync(p.id);
      toast({ title: t("تم حذف المنتج"), description: t(p.name) });
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر الحذف"), description: tError(err) });
    } finally {
      setConfirmProduct(null);
    }
  }

  return (
    <div>
      <PageHeader
        title={t("إدارة المتجر")}
        desc={
          coopName
            ? t("منتجات وطلبات {coop} في متجر المنصة: المعالجة والإحصائيات والتقارير", { coop: coopName })
            : t("منتجات التعاونية في متجر المنصة: إضافة الطلبات ومعالجتها ومراقبة الإحصائيات والتقارير")
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="gap-2 font-bold" onClick={() => { setEditing(null); setProductOpen(true); }}>
              <PackagePlus className="size-4" /> {t("منتج جديد")}
            </Button>
            <Button className="gap-2 font-bold" onClick={() => setManualOpen(true)}>
              <PlusCircle className="size-4" /> {t("تسجيل طلب")}
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="orders">
        <TabsList className="mb-4">
          <TabsTrigger value="orders" className="gap-1.5">
            <ShoppingBag className="size-3.5" />
            {t("الطلبات")}
            {statusCount("NEW") > 0 && (
              <span className="grid min-w-5 place-items-center rounded-full bg-saffron px-1.5 text-[10px] font-black text-ink">
                {statusCount("NEW")}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-1.5">
            <Package className="size-3.5" />
            {t("المنتجات")}
            <span className="text-[10px] text-muted-foreground">({(products ?? []).length})</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="size-3.5" />
            {t("الإحصائيات والتقارير")}
          </TabsTrigger>
        </TabsList>

        {/* ─── الطلبات ─────────────────────────────────────────────────── */}
        <TabsContent value="orders" className="space-y-4">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card p-1">
            {[
              { v: "ALL", label: t("الكل"), n: (orders ?? []).length },
              { v: "NEW", label: t("طلب جديد"), n: statusCount("NEW") },
              { v: "CONTACTED", label: t("تم التواصل"), n: statusCount("CONTACTED") },
              { v: "DONE", label: t("مكتمل"), n: statusCount("DONE") },
              { v: "CANCELLED", label: t("ملغى"), n: statusCount("CANCELLED") },
            ].map((f) => (
              <button
                key={f.v}
                type="button"
                onClick={() => setStatusFilter(f.v)}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  statusFilter === f.v ? "bg-terra text-white" : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {f.label} <span className="opacity-70">({f.n})</span>
              </button>
            ))}
          </div>

          {ordersLoading ? (
            <TableSkeleton rows={5} cols={4} />
          ) : filteredOrders.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title={t("لا توجد طلبات")}
              desc={t("ستظهر هنا طلبات الشراء الواردة من متجر المنصة — أو سجّل طلباً يدوياً بالزر أعلاه")}
            />
          ) : (
            <div className="grid gap-3 lg:grid-cols-2">
              {filteredOrders.map((o) => (
                <OrderCard key={o.id} order={o} onStatus={onStatus} onDelete={(x) => setConfirmOrder(x)} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── المنتجات ────────────────────────────────────────────────── */}
        <TabsContent value="products" className="space-y-4">
          {productsLoading ? (
            <TableSkeleton rows={4} cols={4} />
          ) : (products ?? []).length === 0 ? (
            <EmptyState
              icon={Package}
              title={t("لا توجد منتجات بعد")}
              desc={t("أضف أول منتج لتعاونيتكم ليظهر في متجر المنصة العمومي")}
            />
          ) : (
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {/* جدول الشاشات الكبيرة */}
              <div className="hidden lg:block">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
                      <th className="px-4 py-3 text-start font-bold">{t("المنتج")}</th>
                      <th className="px-4 py-3 text-start font-bold">{t("الفئة")}</th>
                      <th className="px-4 py-3 text-start font-bold">{t("السعر")}</th>
                      <th className="px-4 py-3 text-start font-bold">{t("الحالة")}</th>
                      <th className="px-4 py-3 text-start font-bold">{t("إجراءات")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(products ?? []).map((p) => (
                      <tr key={p.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {p.featured && <Star className="size-3.5 shrink-0 text-saffron" aria-label={t("منتج مميز")} />}
                            <div className="min-w-0">
                              <p className="font-bold text-foreground">{t(p.name)}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {t(p.category)}
                                {p.unit ? ` • ${t(p.unit)}` : ""}
                                {` • ${t("طلبات: {n}", { n: p._count?.orders ?? 0 })}`}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{t(p.category)}</td>
                        <td className="px-4 py-3 font-display font-bold tabular-nums text-foreground">{formatMAD(p.price)}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col items-start gap-1">
                            <LBadge map={PRODUCT_STATUS} value={p.status} />
                            {!p.inStock && (
                              <span className="text-[10px] font-bold text-destructive">{t("نفد المخزون")}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 px-2 text-xs"
                              onClick={() => { setEditing(p); setProductOpen(true); }}
                            >
                              <Pencil className="size-3.5" /> {t("تعديل")}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 px-2 text-xs"
                              onClick={() => onToggleProductStatus(p)}
                            >
                              {p.status === "ACTIVE" ? (
                                <><EyeOff className="size-3.5" /> {t("إخفاء")}</>
                              ) : (
                                <><Eye className="size-3.5" /> {t("عرض")}</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive"
                              onClick={() => setConfirmProduct(p)}
                            >
                              <Trash2 className="size-3.5" /> {t("حذف")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* بطاقات الهواتف */}
              <div className="divide-y divide-border lg:hidden">
                {(products ?? []).map((p) => (
                  <div key={p.id} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                        {p.featured && <Star className="size-3.5 shrink-0 text-saffron" />}
                        {t(p.name)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {t(p.category)}
                        {p.unit ? ` • ${t(p.unit)}` : ""} • {formatMAD(p.price)}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <LBadge map={PRODUCT_STATUS} value={p.status} />
                        {!p.inStock && (
                          <span className="text-[10px] font-bold text-destructive">{t("نفد المخزون")}</span>
                        )}
                        <span className="text-[10px] text-muted-foreground">{t("طلبات: {n}", { n: p._count?.orders ?? 0 })}</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs" onClick={() => { setEditing(p); setProductOpen(true); }}>
                        <Pencil className="size-3.5" /> {t("تعديل")}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs" onClick={() => onToggleProductStatus(p)}>
                        {p.status === "ACTIVE" ? <><EyeOff className="size-3.5" /> {t("إخفاء")}</> : <><Eye className="size-3.5" /> {t("عرض")}</>}
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setConfirmProduct(p)}>
                        <Trash2 className="size-3.5" /> {t("حذف")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── الإحصائيات والتقارير ──────────────────────────────────────── */}
        <TabsContent value="stats">
          <StatsTab coopName={coopName ?? null} />
        </TabsContent>
      </Tabs>

      {/* الحوارات */}
      <ManualOrderDialog open={manualOpen} onOpenChange={setManualOpen} products={products ?? []} />
      <ProductDialog
        open={productOpen}
        onOpenChange={setProductOpen}
        editing={editing}
        cooperativeId={scopeCoopId ?? 1}
      />
      <ConfirmDialog
        open={confirmOrder != null}
        onOpenChange={(v) => !v && setConfirmOrder(null)}
        title={t("حذف الطلب نهائياً؟")}
        desc={t("طلب {name} — لا يمكن التراجع عن الحذف", { name: confirmOrder?.customerName ?? "" })}
        onConfirm={() => confirmOrder && onDeleteOrder(confirmOrder)}
      />
      <ConfirmDialog
        open={confirmProduct != null}
        onOpenChange={(v) => !v && setConfirmProduct(null)}
        title={t("حذف المنتج نهائياً؟")}
        desc={t("سيُحذف {name} وكل طلباته المرتبطة — لا يمكن التراجع", { name: confirmProduct ? t(confirmProduct.name) : "" })}
        onConfirm={() => confirmProduct && onDeleteProduct(confirmProduct)}
      />
    </div>
  );
}
