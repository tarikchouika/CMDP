// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة المالية والصندوق
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  FileBarChart,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Transaction } from "@/lib/types";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, TX_METHODS } from "@/lib/constants";
import { formatMAD, formatNumber, formatShortDate, toInputDate } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import {
  useCooperatives,
  useDashboard,
  useDeleteTransaction,
  useSaveTransaction,
  useTransactions,
} from "@/hooks/use-cmdp";
import { ConfirmDialog, EmptyState, LBadge, PageHeader, StatCard } from "@/components/shared";
import { ZelligeStar } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type TxForm = Omit<Transaction, "id" | "createdAt"> & { id?: number | null };

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const tooltipStyle = {
  direction: "rtl" as const,
  borderRadius: 12,
  border: "1px solid var(--border)",
  backgroundColor: "var(--card)",
  fontSize: 12,
  fontFamily: "inherit",
};

export function FinanceView() {
  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const { data: coops } = useCooperatives();
  const coop = coops?.find((c) => c.id === activeCoopId);
  const { data: txs } = useTransactions(activeCoopId);
  const { data: dash } = useDashboard(activeCoopId);
  const saveTx = useSaveTransaction(activeCoopId);
  const deleteTx = useDeleteTransaction(activeCoopId);
  const { toast } = useToast();

  const year = new Date().getFullYear();

  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [q, setQ] = React.useState("");
  const [formOpen, setFormOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Transaction | null>(null);
  const [report, setReport] = React.useState<"financial" | "ledger" | null>(null);

  const emptyForm = (): TxForm => ({
    id: null,
    cooperativeId: activeCoopId,
    type: "INCOME",
    category: INCOME_CATEGORIES[0],
    amount: 0,
    date: new Date().toISOString(),
    description: "",
    method: "CASH",
    reference: "",
  });
  const [form, setForm] = React.useState<TxForm>(emptyForm());

  const ytd = React.useMemo(() => (txs ?? []).filter((t) => new Date(t.date).getFullYear() === year), [txs, year]);
  const incomeYTD = ytd.filter((t) => t.type === "INCOME").reduce((s, t) => s + t.amount, 0);
  const expenseYTD = ytd.filter((t) => t.type === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const balance = (txs ?? []).reduce((s, t) => s + (t.type === "INCOME" ? t.amount : -t.amount), 0);

  const catAgg = React.useMemo(() => {
    const agg = (type: "INCOME" | "EXPENSE") => {
      const m = new Map<string, number>();
      for (const t of ytd) if (t.type === type) m.set(t.category, (m.get(t.category) ?? 0) + t.amount);
      return [...m.entries()].map(([name, value]) => ({ name, value: Math.round(value) })).sort((a, b) => b.value - a.value);
    };
    return { income: agg("INCOME"), expense: agg("EXPENSE") };
  }, [ytd]);

  const filtered = React.useMemo(() => {
    let rows = txs ?? [];
    if (typeFilter !== "ALL") rows = rows.filter((t) => t.type === typeFilter);
    if (q.trim()) {
      const s = q.trim();
      rows = rows.filter((t) => (t.description ?? "").includes(s) || t.category.includes(s) || (t.reference ?? "").includes(s));
    }
    return rows;
  }, [txs, typeFilter, q]);

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }
  function openEdit(t: Transaction) {
    setForm({ ...t });
    setFormOpen(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveTx.mutate(
      { ...form, cooperativeId: activeCoopId },
      {
        onSuccess: () => {
          toast({ title: form.id ? "تم تحديث الحركة" : "تمت تسجيل الحركة" });
          setFormOpen(false);
        },
        onError: (err) => toast({ variant: "destructive", title: "تعذر الحفظ", description: err.message }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="المالية والصندوق"
        desc={`تدبير مالية ${coop?.name ?? "التعاونية"} — المداخيل والمصاريف والتقارير`}
        actions={
          <Button onClick={openCreate} className="gap-1.5 font-bold">
            <Plus className="size-4" />
            تسجيل حركة
          </Button>
        }
      />

      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="bg-secondary">
          <TabsTrigger value="overview" className="text-xs">نظرة عامة</TabsTrigger>
          <TabsTrigger value="tx" className="text-xs">الحركات ({formatNumber((txs ?? []).length)})</TabsTrigger>
          <TabsTrigger value="reports" className="gap-1.5 text-xs">
            <FileBarChart className="size-3.5" />
            التقارير
          </TabsTrigger>
        </TabsList>

        {/* ─── نظرة عامة ─── */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label={`إيرادات ${year}`} value={formatMAD(incomeYTD)} icon={TrendingUp} tone="zellij" />
            <StatCard label={`مصاريف ${year}`} value={formatMAD(expenseYTD)} icon={TrendingDown} tone="terra" />
            <StatCard label="الرصيد الصافي" value={formatMAD(balance)} icon={Wallet} tone={balance >= 0 ? "olive" : "plum"} />
            <StatCard
              label="المتوسط الشهري الصافي"
              value={formatMAD((incomeYTD - expenseYTD) / Math.max(1, new Date().getMonth() + 1))}
              icon={Banknote}
              tone="saffron"
            />
          </div>

          <Card className="border-border/80">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-extrabold">
                <ZelligeStar className="size-3 text-saffron" />
                الإيرادات والمصاريف شهرياً — آخر 12 شهراً
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {dash && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dash.monthlySeries} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                    <YAxis orientation="right" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))} />
                    <ReTooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [formatMAD(v), n === "income" ? "الإيرادات" : "المصاريف"]} />
                    <Legend formatter={(v: string) => (v === "income" ? "الإيرادات" : "المصاريف")} wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {(["income", "expense"] as const).map((kind) => {
              const data = catAgg[kind];
              const isIncome = kind === "income";
              return (
                <Card key={kind} className="border-border/80">
                  <CardHeader className="pb-2">
                    <CardTitle className={`flex items-center gap-2 text-sm font-extrabold ${isIncome ? "text-zellij" : "text-terra"}`}>
                      {isIncome ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
                      {isIncome ? "مصادر الإيرادات" : "بنود المصاريف"} — {year}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="h-64">
                    {data.length === 0 ? (
                      <p className="grid h-full place-items-center text-xs text-muted-foreground">لا توجد بيانات</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={data} dataKey="value" nameKey="name" innerRadius="45%" outerRadius="75%" paddingAngle={3} stroke="var(--card)" strokeWidth={2}>
                            {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <ReTooltip contentStyle={tooltipStyle} formatter={(v: number, n: string) => [formatMAD(v), n]} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* ─── الحركات ─── */}
        <TabsContent value="tx" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث في البيان أو الفئة أو المرجع..." className="bg-card ps-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-36 bg-card text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">كل الحركات</SelectItem>
                <SelectItem value="INCOME">المداخيل</SelectItem>
                <SelectItem value="EXPENSE">المصاريف</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {filtered.length === 0 ? (
            <EmptyState icon={Wallet} title="لا توجد حركات مطابقة" desc="سجّل أول حركة مالية للتعاونية." action={<Button onClick={openCreate} className="gap-1.5"><Plus className="size-4" />تسجيل حركة</Button>} />
          ) : (
            <Card className="border-border/80">
              <CardContent className="p-0">
                <div className="max-h-[560px] overflow-y-auto scrollbar-thin">
                  <Table>
                    <TableHeader className="sticky top-0 z-10 bg-card">
                      <TableRow>
                        <TableHead className="text-start">التاريخ</TableHead>
                        <TableHead className="text-start">البيان</TableHead>
                        <TableHead className="text-start">الفئة</TableHead>
                        <TableHead className="text-start hidden md:table-cell">الأداء</TableHead>
                        <TableHead className="text-end">المبلغ</TableHead>
                        <TableHead className="w-20" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((t) => (
                        <TableRow key={t.id} className="group">
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatShortDate(t.date)}</TableCell>
                          <TableCell>
                            <p className="max-w-56 truncate text-xs font-bold text-foreground">{t.description ?? t.category}</p>
                            {t.reference && <p className="text-[10px] text-muted-foreground">{t.reference}</p>}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{t.category}</TableCell>
                          <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{TX_METHODS[t.method] ?? t.method}</TableCell>
                          <TableCell className={`text-end text-xs font-extrabold tabular-nums ${t.type === "INCOME" ? "text-zellij" : "text-terra"}`}>
                            {t.type === "INCOME" ? "+" : "−"}{formatMAD(t.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                              <Button variant="ghost" size="icon" className="size-7" aria-label="تحرير" onClick={() => openEdit(t)}>
                                <Pencil className="size-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label="حذف" onClick={() => setToDelete(t)}>
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ─── التقارير ─── */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="group cursor-pointer border-border/80 transition-all hover:-translate-y-0.5 hover:shadow-md" onClick={() => setReport("financial")}>
              <CardContent className="flex items-center gap-4 p-6">
                <span className="arch-top grid h-16 w-12 place-items-center bg-terra text-cream">
                  <FileBarChart className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-extrabold">التقرير المالي السنوي {year}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">الإيرادات والمصاريف حسب الفئات — جاهز للعرض على الجمع العام</p>
                </div>
              </CardContent>
            </Card>
            <Card className="group cursor-pointer border-border/80 transition-all hover:-translate-y-0.5 hover:shadow-md" onClick={() => setReport("ledger")}>
              <CardContent className="flex items-center gap-4 p-6">
                <span className="arch-top grid h-16 w-12 place-items-center bg-zellij text-cream">
                  <Banknote className="size-5" />
                </span>
                <div>
                  <h3 className="font-display text-sm font-extrabold">كشف الحساب المفصل</h3>
                  <p className="mt-1 text-xs text-muted-foreground">آخر 30 حركة مسجلة بصندوق التعاونية</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* تقرير قابل للطباعة */}
      <Dialog open={!!report} onOpenChange={(v) => !v && setReport(null)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-white text-black scrollbar-thin">
          <div className="print-area p-2" dir="rtl">
            <div className="mb-4 flex items-center justify-between border-b-2 border-[#9c4526] pb-3">
              <div>
                <h2 className="font-display text-lg font-black text-[#9c4526]">
                  {report === "financial" ? `التقرير المالي السنوي ${year}` : "كشف الحساب المفصل"}
                </h2>
                <p className="mt-0.5 text-xs text-gray-600">{coop?.name} — {coop?.province}، {coop?.region}</p>
              </div>
              <svg viewBox="0 0 64 64" className="size-12">
                <polygon points="32,2 36.98,19.99 53.21,10.79 44.02,27.04 62,32 44.02,36.96 53.21,53.21 36.98,44.01 32,62 27.02,44.01 10.79,53.21 19.98,36.96 2,32 19.98,27.04 10.79,10.79 27.02,19.99" fill="#9c4526" />
                <circle cx="32" cy="32" r="10" fill="#faf6ee" />
                <circle cx="32" cy="32" r="4.5" fill="#d9a03f" />
              </svg>
            </div>

            {report === "financial" && (
              <>
                <table className="w-full border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#f3ede1]">
                      <th className="border border-gray-300 p-2 text-start">الفئة</th>
                      <th className="border border-gray-300 p-2 text-end">المبلغ (د.م.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="font-bold">
                      <td className="border border-gray-300 bg-[#2a7f7a10] p-2" colSpan={2}>الإيرادات</td>
                    </tr>
                    {catAgg.income.map((r) => (
                      <tr key={r.name}>
                        <td className="border border-gray-300 p-2">{r.name}</td>
                        <td className="border border-gray-300 p-2 text-end tabular-nums">{formatMAD(r.value)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="border border-gray-300 p-2">مجموع الإيرادات</td>
                      <td className="border border-gray-300 p-2 text-end tabular-nums">{formatMAD(incomeYTD)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td className="border border-gray-300 bg-[#9c452610] p-2" colSpan={2}>المصاريف</td>
                    </tr>
                    {catAgg.expense.map((r) => (
                      <tr key={r.name}>
                        <td className="border border-gray-300 p-2">{r.name}</td>
                        <td className="border border-gray-300 p-2 text-end tabular-nums">{formatMAD(r.value)}</td>
                      </tr>
                    ))}
                    <tr className="font-bold">
                      <td className="border border-gray-300 p-2">مجموع المصاريف</td>
                      <td className="border border-gray-300 p-2 text-end tabular-nums">{formatMAD(expenseYTD)}</td>
                    </tr>
                    <tr className="text-sm font-black">
                      <td className="border border-gray-300 bg-[#f3ede1] p-2">النتيجة الصافية</td>
                      <td className="border border-gray-300 bg-[#f3ede1] p-2 text-end tabular-nums">{formatMAD(incomeYTD - expenseYTD)}</td>
                    </tr>
                  </tbody>
                </table>
                <p className="mt-4 text-[10px] text-gray-500">
                  وثيقة معدّة آلياً بواسطة منصة CMDP — تخضع للمصادقة أمام الجمع العام عملاً بالقانون رقم 112.12.
                </p>
              </>
            )}

            {report === "ledger" && (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-[#f3ede1]">
                    <th className="border border-gray-300 p-2">التاريخ</th>
                    <th className="border border-gray-300 p-2 text-start">البيان</th>
                    <th className="border border-gray-300 p-2">مدين (مصروف)</th>
                    <th className="border border-gray-300 p-2">دائن (مدخل)</th>
                  </tr>
                </thead>
                <tbody>
                  {(txs ?? []).slice(0, 30).map((t) => (
                    <tr key={t.id}>
                      <td className="border border-gray-300 p-2 text-center tabular-nums">{formatShortDate(t.date)}</td>
                      <td className="border border-gray-300 p-2">{t.description ?? t.category} — {t.category}</td>
                      <td className="border border-gray-300 p-2 text-center tabular-nums">{t.type === "EXPENSE" ? formatMAD(t.amount) : ""}</td>
                      <td className="border border-gray-300 p-2 text-center tabular-nums">{t.type === "INCOME" ? formatMAD(t.amount) : ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-4 flex items-center justify-between">
              <p className="text-[10px] text-gray-500">حُرّر بتاريخ: {formatShortDate(new Date())}</p>
              <div className="text-center text-[10px] text-gray-600">
                <p>أمين(ة) المال</p>
                <div className="mt-6 border-t border-dashed border-gray-400 pt-1">التوقيع والإمضاء</div>
              </div>
            </div>
          </div>

          <DialogFooter className="print:hidden">
            <Button variant="outline" onClick={() => setReport(null)}>إغلاق</Button>
            <Button onClick={() => window.print()} className="gap-1.5 font-bold">
              <Printer className="size-4" />
              طباعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* نموذج الحركة */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ZelligeStar className="size-4 text-saffron" />
              {form.id ? "تحرير الحركة" : "تسجيل حركة مالية"}
            </DialogTitle>
            <DialogDescription>حدّد الطبيعة والفئة والمبلغ — تُحدَّث التقارير آلياً.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">الطبيعة *</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v, category: v === "INCOME" ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0] })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">مدخل (إيراد)</SelectItem>
                  <SelectItem value="EXPENSE">مصروف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الفئة *</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(form.type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">المبلغ (درهم) *</Label>
              <Input required type="number" min={1} step="0.01" value={form.amount || ""} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">التاريخ *</Label>
              <Input required type="date" value={toInputDate(form.date)} onChange={(e) => setForm({ ...form, date: new Date(e.target.value).toISOString() })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">طريقة الأداء</Label>
              <Select value={form.method} onValueChange={(v) => setForm({ ...form, method: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TX_METHODS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">المرجع / رقم الوصل</Label>
              <Input value={form.reference ?? ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">البيان</Label>
              <Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} className="min-h-16 bg-background" />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saveTx.isPending} className="font-bold">
                {saveTx.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        desc={`سيتم حذف الحركة «${toDelete?.description ?? toDelete?.category}» بمبلغ ${toDelete ? formatMAD(toDelete.amount) : ""} نهائياً.`}
        loading={deleteTx.isPending}
        onConfirm={() =>
          toDelete &&
          deleteTx.mutate(toDelete.id, {
            onSuccess: () => {
              toast({ title: "تم حذف الحركة" });
              setToDelete(null);
            },
            onError: (e) => toast({ variant: "destructive", title: "تعذر الحذف", description: e.message }),
          })
        }
      />
    </div>
  );
}
