// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة الجهات الوصية والتفاعلات معها
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  ArrowUpRight,
  Globe,
  Landmark,
  MapPin,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import type { EntityInteraction } from "@/lib/types";
import {
  ENTITY_TYPES,
  INTERACTION_STATUS,
  INTERACTION_TYPES,
} from "@/lib/constants";
import { formatDate, initials, toInputDate } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import {
  useCooperatives,
  useDeleteInteraction,
  useEntities,
  useInteractions,
  useSaveInteraction,
} from "@/hooks/use-cmdp";
import { ConfirmDialog, EmptyState, LBadge, PageHeader } from "@/components/shared";
import { ZelligeStar } from "@/components/patterns";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { t, tError } from "@/lib/i18n";

type InteractionForm = Omit<EntityInteraction, "id" | "createdAt" | "entity"> & { id?: number | null };

export function EntitiesView() {
  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const { data: coops } = useCooperatives();
  const coop = coops?.find((c) => c.id === activeCoopId);
  const { data: entities } = useEntities();
  const { data: interactions } = useInteractions();
  const saveInteraction = useSaveInteraction();
  const deleteInteraction = useDeleteInteraction();
  const { toast } = useToast();

  const [entityFilter, setEntityFilter] = React.useState("ALL");
  const [formOpen, setFormOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<EntityInteraction | null>(null);

  const emptyForm = (): InteractionForm => ({
    id: null,
    entityId: entities?.[0]?.id ?? 1,
    cooperativeId: activeCoopId,
    date: new Date().toISOString(),
    type: "REQUEST",
    subject: "",
    status: "PENDING",
    notes: "",
  });
  const [form, setForm] = React.useState<InteractionForm>(emptyForm());

  const interactionCounts = React.useMemo(() => {
    const m = new Map<number, number>();
    for (const i of interactions ?? []) m.set(i.entityId, (m.get(i.entityId) ?? 0) + 1);
    return m;
  }, [interactions]);

  const filteredInteractions = React.useMemo(() => {
    let rows = interactions ?? [];
    if (entityFilter !== "ALL") rows = rows.filter((i) => String(i.entityId) === entityFilter);
    return rows;
  }, [interactions, entityFilter]);

  const openInteractions = (interactions ?? []).filter((i) => i.status === "PENDING" || i.status === "IN_PROGRESS").length;

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }
  function openEdit(i: EntityInteraction) {
    setForm({ ...i });
    setFormOpen(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveInteraction.mutate(
      { ...form, cooperativeId: activeCoopId },
      {
        onSuccess: () => {
          toast({ title: form.id ? t("تم تحديث التفاعل") : t("تمت تسجيل التفاعل") });
          setFormOpen(false);
        },
        onError: (err) => toast({ variant: "destructive", title: t("تعذر الحفظ"), description: tError(err) }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("الجهات الوصية")}
        desc={t("دليل الجهات الحكومية والإدارية ذات الصلة بالتعاونيات — مع سجل تتبع التفاعلات")}
      />

      <Tabs defaultValue="directory" dir="rtl">
        <TabsList className="bg-secondary">
          <TabsTrigger value="directory" className="gap-1.5 text-xs">
            <Landmark className="size-3.5" />
            {t("الدليل")} ({(entities ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="interactions" className="gap-1.5 text-xs">
            {t("سجل التفاعلات")} ({(interactions ?? []).length})
            {openInteractions > 0 && (
              <span className="rounded-full bg-terra px-1.5 text-[9px] font-black text-cream">{openInteractions}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── الدليل ─── */}
        <TabsContent value="directory" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {(entities ?? []).map((e) => (
              <Collapsible key={e.id}>
                <Card className="group border-border/80 transition-all hover:-translate-y-0.5 hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3.5">
                      <span className="arch-top grid h-16 w-12 shrink-0 place-items-center bg-ink font-display text-xs font-black leading-4 text-terra-soft">
                        {e.acronym ? e.acronym.slice(0, 6) : initials(e.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <LBadge map={ENTITY_TYPES} value={e.type} className="px-2 py-0 text-[10px]" />
                        <h3 className="mt-1.5 text-sm font-extrabold leading-6 text-foreground">{e.name}</h3>
                        {e.supervisor && (
                          <p className="mt-0.5 text-[10px] text-muted-foreground">{t("الوصاية:")} {e.supervisor}</p>
                        )}
                      </div>
                    </div>

                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="mt-3 h-7 w-full gap-1 text-[11px] text-terra">
                        {t("المهام والاختصاصات")}
                        <ArrowUpRight className="size-3" />
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <ul className="mt-2 space-y-1.5 rounded-xl bg-muted/50 p-3">
                        {e.missions.split("\n").filter(Boolean).map((m, i) => (
                          <li key={i} className="flex items-start gap-2 text-[11px] leading-5 text-foreground">
                            <ZelligeStar className="mt-1 size-2 shrink-0 text-terra" />
                            {m}
                          </li>
                        ))}
                      </ul>
                    </CollapsibleContent>

                    <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3" />
                        {e.address ?? t("المغرب")}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="rounded-full bg-terra/10 px-2 py-0.5 font-bold text-terra">
                          {interactionCounts.get(e.id) ?? 0} {t("تفاعل")}
                        </span>
                        {e.website && (
                          <a
                            href={e.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="grid size-7 place-items-center rounded-full border border-border text-muted-foreground transition-colors hover:border-terra hover:text-terra"
                            aria-label={t("موقع {name}", { name: e.name })}
                          >
                            <Globe className="size-3.5" />
                          </a>
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Collapsible>
            ))}
          </div>
        </TabsContent>

        {/* ─── التفاعلات ─── */}
        <TabsContent value="interactions" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-64 bg-card text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("كل الجهات")}</SelectItem>
                {(entities ?? []).map((e) => (
                  <SelectItem key={e.id} value={String(e.id)}>{e.acronym ?? e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openCreate} className="gap-1.5 font-bold">
              <Plus className="size-4" />
              {t("تسجيل تفاعل")}
            </Button>
          </div>

          {filteredInteractions.length === 0 ? (
            <EmptyState icon={Landmark} title={t("لا توجد تفاعلات")} desc={t("سجّل التصريحات والطلبات والمراسلات مع الجهات الوصية.")} action={<Button onClick={openCreate} className="gap-1.5"><Plus className="size-4" />{t("تسجيل تفاعل")}</Button>} />
          ) : (
            <>
              {/* جدول — md+ */}
              <Card className="hidden border-border/80 md:block">
                <CardContent className="p-0">
                  <div className="max-h-[560px] overflow-y-auto scrollbar-thin">
                    <Table>
                      <TableHeader className="sticky top-0 z-10 bg-card">
                        <TableRow>
                          <TableHead className="text-start">{t("التاريخ")}</TableHead>
                          <TableHead className="text-start">{t("الجهة")}</TableHead>
                          <TableHead className="text-start">{t("النوع")}</TableHead>
                          <TableHead className="text-start">{t("الموضوع")}</TableHead>
                          <TableHead className="text-start">{t("الحالة")}</TableHead>
                          <TableHead className="w-20" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredInteractions.map((i) => (
                          <TableRow key={i.id} className="group">
                            <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formatDate(i.date)}</TableCell>
                            <TableCell className="text-xs font-bold">{i.entity?.acronym ?? i.entity?.name ?? "—"}</TableCell>
                            <TableCell><LBadge map={INTERACTION_TYPES} value={i.type} className="px-2 py-0 text-[10px]" /></TableCell>
                            <TableCell>
                              <p className="max-w-64 truncate text-xs font-medium">{i.subject}</p>
                              {i.notes && <p className="max-w-64 truncate text-[10px] text-muted-foreground">{i.notes}</p>}
                            </TableCell>
                            <TableCell><LBadge map={INTERACTION_STATUS} value={i.status} className="px-2 py-0 text-[10px]" /></TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                                <Button variant="ghost" size="icon" className="size-7" aria-label={t("تحرير")} onClick={() => openEdit(i)}>
                                  <Pencil className="size-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t("حذف")} onClick={() => setToDelete(i)}>
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

              {/* بطاقات — الهواتف */}
              <div className="space-y-2.5 md:hidden">
                {filteredInteractions.map((i) => (
                  <Card key={i.id} className="border-border/80">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold text-terra">{i.entity?.acronym ?? i.entity?.name}</p>
                          <p className="mt-1 text-xs font-bold leading-5 text-foreground">{i.subject}</p>
                          <p className="mt-1 text-[10px] text-muted-foreground">{formatDate(i.date)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                          <LBadge map={INTERACTION_TYPES} value={i.type} className="px-2 py-0 text-[9px]" />
                          <LBadge map={INTERACTION_STATUS} value={i.status} className="px-2 py-0 text-[9px]" />
                        </div>
                      </div>
                      {i.notes && <p className="mt-2 rounded-lg bg-muted/50 px-3 py-1.5 text-[10px] text-muted-foreground">{i.notes}</p>}
                      <div className="mt-2 flex justify-end gap-1">
                        <Button variant="ghost" size="icon" className="size-7" aria-label={t("تحرير")} onClick={() => openEdit(i)}>
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t("حذف")} onClick={() => setToDelete(i)}>
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ZelligeStar className="size-4 text-saffron" />
              {form.id ? t("تحرير التفاعل") : t("تسجيل تفاعل مع جهة")}
            </DialogTitle>
            <DialogDescription>{t("التصريحات والطلبات والمراسلات مع الجهات الوصية باسم {name}", { name: coop?.name ?? t("التعاونية") })}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("الجهة *")}</Label>
              <Select value={String(form.entityId)} onValueChange={(v) => setForm({ ...form, entityId: Number(v) })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(entities ?? []).map((e) => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.acronym ?? e.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("نوع التفاعل")}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INTERACTION_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("التاريخ *")}</Label>
              <Input required type="date" value={toInputDate(form.date)} onChange={(e) => setForm({ ...form, date: new Date(e.target.value).toISOString() })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("الحالة")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(INTERACTION_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("الموضوع *")}</Label>
              <Input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("ملاحظات")}</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-16 bg-background" />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t("إلغاء")}</Button>
              <Button type="submit" disabled={saveInteraction.isPending} className="font-bold">
                {saveInteraction.isPending ? t("جارٍ الحفظ...") : t("حفظ")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        desc={t("سيتم حذف التفاعل «{subject}» نهائياً.", { subject: toDelete?.subject ?? "" })}
        loading={deleteInteraction.isPending}
        onConfirm={() =>
          toDelete &&
          deleteInteraction.mutate(toDelete.id, {
            onSuccess: () => {
              toast({ title: t("تم الحذف") });
              setToDelete(null);
            },
            onError: (e) => toast({ variant: "destructive", title: t("تعذر الحذف"), description: tError(e) }),
          })
        }
      />
    </div>
  );
}
