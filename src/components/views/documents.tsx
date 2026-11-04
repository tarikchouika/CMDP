// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة سجل الوثائق
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  BadgeCheck,
  CalendarClock,
  FileCheck2,
  FileText,
  FileWarning,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { DocumentItem } from "@/lib/types";
import { DOC_STATUS, DOC_TYPES } from "@/lib/constants";
import { computeDocStatus, daysUntil, formatDate, toInputDate } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import { useCooperatives, useDeleteDocument, useDocuments, useSaveDocument } from "@/hooks/use-cmdp";
import { ConfirmDialog, EmptyState, LBadge, PageHeader, StatCard } from "@/components/shared";
import { ZelligeStar } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { t } from "@/lib/i18n";

type DocForm = Omit<DocumentItem, "id" | "createdAt"> & { id?: number | null };

export function DocumentsView() {
  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const { data: coops } = useCooperatives();
  const coop = coops?.find((c) => c.id === activeCoopId);
  const { data: docs } = useDocuments(activeCoopId);
  const saveDoc = useSaveDocument(activeCoopId);
  const deleteDoc = useDeleteDocument(activeCoopId);
  const { toast } = useToast();

  const [typeFilter, setTypeFilter] = React.useState("ALL");
  const [formOpen, setFormOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<DocumentItem | null>(null);

  const emptyForm = (): DocForm => ({
    id: null,
    cooperativeId: activeCoopId,
    title: "",
    type: "MINUTE",
    reference: "",
    issueDate: new Date().toISOString(),
    expiryDate: "",
    status: "VALID",
    isShared: false,
    notes: "",
  });
  const [form, setForm] = React.useState<DocForm>(emptyForm());

  const computed = React.useMemo(
    () =>
      (docs ?? []).map((d) => ({
        ...d,
        computed: computeDocStatus(d.status, d.expiryDate),
        daysLeft: d.expiryDate ? daysUntil(d.expiryDate) : null,
      })),
    [docs]
  );

  const filtered = React.useMemo(
    () => (typeFilter === "ALL" ? computed : computed.filter((d) => d.type === typeFilter)),
    [computed, typeFilter]
  );

  const health = React.useMemo(() => {
    const valid = computed.filter((d) => d.computed === "VALID").length;
    const expiring = computed.filter((d) => d.computed === "EXPIRING").length;
    const expired = computed.filter((d) => d.computed === "EXPIRED").length;
    return { valid, expiring, expired };
  }, [computed]);

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }
  function openEdit(d: DocumentItem) {
    setForm({ ...d, expiryDate: d.expiryDate ?? "" });
    setFormOpen(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveDoc.mutate(
      { ...form, cooperativeId: activeCoopId, expiryDate: form.expiryDate || null },
      {
        onSuccess: () => {
          toast({ title: form.id ? t("تم تحديث الوثيقة") : t("تمت إضافة الوثيقة") });
          setFormOpen(false);
        },
        onError: (err) => toast({ variant: "destructive", title: t("تعذر الحفظ"), description: err.message }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("سجل الوثائق")}
        desc={`أرشيف وثائق ${coop?.name ?? t("التعاونية")} — النظام الأساسي، المحاضر، التقارير، والوثائق الإدارية`}
        actions={
          <Button onClick={openCreate} className="gap-1.5 font-bold">
            <Plus className="size-4" />
            {t("إضافة وثيقة")}
          </Button>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label={t("وثائق سارية")} value={health.valid} icon={FileCheck2} tone="zellij" />
        <StatCard label={t("قاربت الانتهاء")} value={health.expiring} icon={FileWarning} tone="saffron" />
        <StatCard label={t("منتهية الصلاحية")} value={health.expired} icon={CalendarClock} tone="plum" />
      </div>

      {/* تصفية حسب النوع */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTypeFilter("ALL")}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${typeFilter === "ALL" ? "border-terra bg-terra text-cream" : "border-border bg-card text-muted-foreground hover:border-terra/40"}`}
        >
          {t("الكل")} ({computed.length})
        </button>
        {Object.entries(DOC_TYPES).map(([k, v]) => {
          const count = computed.filter((d) => d.type === k).length;
          if (count === 0) return null;
          return (
            <button
              key={k}
              onClick={() => setTypeFilter(k)}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${typeFilter === k ? "border-terra bg-terra text-cream" : "border-border bg-card text-muted-foreground hover:border-terra/40"}`}
            >
              {v.label} ({count})
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={FileText} title={t("لا توجد وثائق")} desc={t("أضف القانون الأساسي والمحاضر والتقارير لبناء الأرشيف الرقمي.")} action={<Button onClick={openCreate} className="gap-1.5"><Plus className="size-4" />{t("إضافة وثيقة")}</Button>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((d) => (
            <Card key={d.id} className={`border-border/80 ${d.computed === "EXPIRING" ? "border-saffron/50" : d.computed === "EXPIRED" ? "border-destructive/40" : ""}`}>
              <CardContent className="flex items-start gap-4 p-5">
                <span className={`arch-top grid h-16 w-12 shrink-0 place-items-center ${d.computed === "EXPIRED" ? "bg-destructive/15 text-destructive" : d.computed === "EXPIRING" ? "bg-saffron/20 text-[#8a6414]" : "bg-terra/10 text-terra"}`}>
                  <FileText className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <LBadge map={DOC_TYPES} value={d.type} className="px-2 py-0 text-[10px]" />
                    <LBadge map={DOC_STATUS} value={d.computed} className="px-2 py-0 text-[10px]" />
                  </div>
                  <h3 className="mt-2 text-sm font-extrabold leading-6 text-foreground">{d.title}</h3>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <span>{t("مرجع:")} {d.reference ?? "—"}</span>
                    <span>{t("الإصدار:")} {formatDate(d.issueDate)}</span>
                    {d.expiryDate && (
                      <span className={d.daysLeft !== null && d.daysLeft < 0 ? "font-bold text-destructive" : d.daysLeft !== null && d.daysLeft <= 90 ? "font-bold text-[#8a6414]" : ""}>
                        {t("الانتهاء:")} {formatDate(d.expiryDate)}
                        {d.daysLeft !== null && d.daysLeft >= 0 ? ` (بعد ${d.daysLeft} يوم)` : d.daysLeft !== null ? t(" (منتهية)") : ""}
                      </span>
                    )}
                  </div>
                  {d.notes && <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-5 text-muted-foreground">{d.notes}</p>}
                  <div className="mt-3 flex justify-end gap-1 border-t border-border/60 pt-2.5">
                    <Button variant="ghost" size="icon" className="size-7" aria-label={t("تحرير")} onClick={() => openEdit(d)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t("حذف")} onClick={() => setToDelete(d)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ZelligeStar className="size-4 text-saffron" />
              {form.id ? t("تحرير الوثيقة") : t("إضافة وثيقة")}
            </DialogTitle>
            <DialogDescription>{t("سجّل الوثيقة مع مراجعها وتاريخ انتهائها لتفادي الغرامات.")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("عنوان الوثيقة *")}</Label>
              <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="bg-background" placeholder={t("محضر الجمع العام العادي...")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("النوع *")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(DOC_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("المرجع")}</Label>
              <Input value={form.reference ?? ""} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="bg-background" placeholder={t("م.ع/2026/06")} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("تاريخ الإصدار *")}</Label>
              <Input required type="date" value={toInputDate(form.issueDate)} onChange={(e) => setForm({ ...form, issueDate: new Date(e.target.value).toISOString() })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("تاريخ الانتهاء (إن وجد)")}</Label>
              <Input type="date" value={toInputDate(form.expiryDate || null)} onChange={(e) => setForm({ ...form, expiryDate: e.target.value ? new Date(e.target.value).toISOString() : "" })} className="bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("ملاحظات")}</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-16 bg-background" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3 sm:col-span-2">
              <div>
                <Label htmlFor="doc-shared" className="text-xs font-bold">{t("المشاركة مع المتعاقدين والمصرح لهم")}</Label>
                <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">
                  {t("تُظهر الوثيقة في فضاء المتعاقدين والأعضاء ضمن «الوثائق المصرح بها»")}
                </p>
              </div>
              <Switch
                id="doc-shared"
                checked={form.isShared === true}
                onCheckedChange={(v) => setForm({ ...form, isShared: v })}
              />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t("إلغاء")}</Button>
              <Button type="submit" disabled={saveDoc.isPending} className="gap-1.5 font-bold">
                <BadgeCheck className="size-4" />
                {saveDoc.isPending ? t("جارٍ الحفظ...") : t("حفظ")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        desc={t("سيتم حذف «{title}» نهائياً من السجل.", { title: toDelete?.title ?? "" })}
        loading={deleteDoc.isPending}
        onConfirm={() =>
          toDelete &&
          deleteDoc.mutate(toDelete.id, {
            onSuccess: () => {
              toast({ title: t("تم حذف الوثيقة") });
              setToDelete(null);
            },
            onError: (e) => toast({ variant: "destructive", title: t("تعذر الحذف"), description: e.message }),
          })
        }
      />
    </div>
  );
}
