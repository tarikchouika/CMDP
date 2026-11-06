// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة الجمع العام والمجلس الإداري
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { CalendarDays, Gavel, MapPin, Pencil, Plus, Trash2, Users2 } from "lucide-react";
import type { Assembly, Meeting } from "@/lib/types";
import { ASSEMBLY_STATUS, ASSEMBLY_TYPES, BOARD_ROLES } from "@/lib/constants";
import { formatDate, toInputDate } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import {
  useAssemblies,
  useCooperatives,
  useDeleteAssembly,
  useDeleteMeeting,
  useMembers,
  useMeetings,
  useSaveAssembly,
  useSaveMeeting,
} from "@/hooks/use-cmdp";
import { AttendanceBar, ConfirmDialog, EmptyState, LBadge, PageHeader } from "@/components/shared";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { t, tError } from "@/lib/i18n";

type AssemblyForm = Omit<Assembly, "id" | "createdAt"> & { id?: number | null };
type MeetingForm = Omit<Meeting, "id" | "createdAt"> & { id?: number | null };

const lines = (s?: string | null) =>
  (s ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export function AssemblyView() {
  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const { data: coops } = useCooperatives();
  const coop = coops?.find((c) => c.id === activeCoopId);

  const { data: assemblies } = useAssemblies(activeCoopId);
  const { data: meetings } = useMeetings(activeCoopId);
  const { data: members } = useMembers(activeCoopId);

  const saveAssembly = useSaveAssembly(activeCoopId);
  const deleteAssembly = useDeleteAssembly(activeCoopId);
  const saveMeeting = useSaveMeeting(activeCoopId);
  const deleteMeeting = useDeleteMeeting(activeCoopId);
  const { toast } = useToast();

  const totalMembers = (members ?? []).filter((m) => m.status === "ACTIVE").length;
  const council = (members ?? []).filter((m) => m.boardRole);

  const [gaFormOpen, setGaFormOpen] = React.useState(false);
  const [gaForm, setGaForm] = React.useState<AssemblyForm>({
    id: null,
    cooperativeId: activeCoopId,
    type: "ORDINARY",
    date: new Date().toISOString(),
    location: "",
    agenda: "",
    decisions: "",
    attendeesCount: 0,
    status: "SCHEDULED",
  });
  const [gaToDelete, setGaToDelete] = React.useState<Assembly | null>(null);

  const [mtFormOpen, setMtFormOpen] = React.useState(false);
  const [mtForm, setMtForm] = React.useState<MeetingForm>({
    id: null,
    cooperativeId: activeCoopId,
    date: new Date().toISOString(),
    agenda: "",
    decisions: "",
    attendeesCount: council.length || 7,
  });
  const [mtToDelete, setMtToDelete] = React.useState<Meeting | null>(null);

  function openGaEdit(a: Assembly) {
    setGaForm({ ...a });
    setGaFormOpen(true);
  }
  function openGaCreate() {
    setGaForm({
      id: null,
      cooperativeId: activeCoopId,
      type: "ORDINARY",
      date: new Date().toISOString(),
      location: coop?.province ?? "",
      agenda: "",
      decisions: "",
      attendeesCount: 0,
      status: "SCHEDULED",
    });
    setGaFormOpen(true);
  }
  function submitGa(e: React.FormEvent) {
    e.preventDefault();
    saveAssembly.mutate(
      { ...gaForm, cooperativeId: activeCoopId },
      {
        onSuccess: () => {
          toast({ title: gaForm.id ? t("تم تحديث الجمع العام") : t("تمت برمجة الجمع العام") });
          setGaFormOpen(false);
        },
        onError: (err) => toast({ variant: "destructive", title: t("تعذر الحفظ"), description: tError(err) }),
      }
    );
  }

  function openMtEdit(m: Meeting) {
    setMtForm({ ...m });
    setMtFormOpen(true);
  }
  function openMtCreate() {
    setMtForm({
      id: null,
      cooperativeId: activeCoopId,
      date: new Date().toISOString(),
      agenda: "",
      decisions: "",
      attendeesCount: council.length || 7,
    });
    setMtFormOpen(true);
  }
  function submitMt(e: React.FormEvent) {
    e.preventDefault();
    saveMeeting.mutate(
      { ...mtForm, cooperativeId: activeCoopId },
      {
        onSuccess: () => {
          toast({ title: mtForm.id ? t("تم تحديث الاجتماع") : t("تمت إضافة الاجتماع") });
          setMtFormOpen(false);
        },
        onError: (err) => toast({ variant: "destructive", title: t("تعذر الحفظ"), description: tError(err) }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("الجمع العام والمجلس")}
        desc={t("الحياة التعاونية لـ {name} — الجمعات العامة واجتماعات مجلس الإدارة ومحاضرها", { name: coop?.name ?? t("التعاونية") })}
      />

      <Tabs defaultValue="ga" dir="rtl">
        <TabsList className="bg-secondary">
          <TabsTrigger value="ga" className="gap-1.5 text-xs">
            <Gavel className="size-3.5" />
            {t("الجمع العام")} ({(assemblies ?? []).length})
          </TabsTrigger>
          <TabsTrigger value="council" className="gap-1.5 text-xs">
            <Users2 className="size-3.5" />
            {t("اجتماعات المجلس")} ({(meetings ?? []).length})
          </TabsTrigger>
        </TabsList>

        {/* ─── الجمع العام ─── */}
        <TabsContent value="ga" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={openGaCreate} className="gap-1.5 font-bold">
              <Plus className="size-4" />
              {t("برمجة جمع عام")}
            </Button>
          </div>

          {(assemblies ?? []).length === 0 ? (
            <EmptyState icon={Gavel} title={t("لا توجد جمعات عامة")} desc={t("برمج الجمع العام العادي السنوي — التزام قانوني بمقتضى القانون 112.12.")} />
          ) : (
            <div className="relative space-y-4 before:absolute before:inset-y-2 before:start-5 before:w-px before:bg-border">
              {(assemblies ?? []).map((a) => {
                const upcoming = a.status === "SCHEDULED";
                return (
                  <Card key={a.id} className={`relative ms-12 border-border/80 ${upcoming ? "border-saffron/50 ring-1 ring-saffron/25" : ""}`}>
                    <span className={`absolute -start-12 top-6 grid size-10 place-items-center rounded-full border-4 border-background ${upcoming ? "bg-saffron text-ink" : "bg-terra text-cream"}`}>
                      <Gavel className="size-4" />
                    </span>
                    <CardContent className="p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <LBadge map={ASSEMBLY_TYPES} value={a.type} />
                            <LBadge map={ASSEMBLY_STATUS} value={a.status} />
                          </div>
                          <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="flex items-center gap-1"><CalendarDays className="size-3" />{formatDate(a.date)}</span>
                            {a.location && <span className="flex items-center gap-1"><MapPin className="size-3" />{a.location}</span>}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="size-8" aria-label={t("تحرير")} onClick={() => openGaEdit(a)}>
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="size-8 text-destructive" aria-label={t("حذف")} onClick={() => setGaToDelete(a)}>
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl bg-muted/50 p-3.5">
                          <p className="mb-2 text-[11px] font-extrabold text-terra">{t("جدول الأعمال")}</p>
                          <ul className="space-y-1.5">
                            {lines(a.agenda).map((l, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs leading-6 text-foreground">
                                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-terra" />
                                {l}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="rounded-xl bg-zellij/5 p-3.5">
                          <p className="mb-2 text-[11px] font-extrabold text-zellij">{t("القرارات والتوصيات")}</p>
                          {lines(a.decisions).length === 0 ? (
                            <p className="text-xs italic text-muted-foreground">
                              {upcoming ? t("لم يُعقد الجمع بعد — ستُدوَّن القرارات بعد الانعقاد") : "—"}
                            </p>
                          ) : (
                            <ul className="space-y-1.5">
                              {lines(a.decisions).map((l, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs leading-6 text-foreground">
                                  <ZelligeStar className="mt-1.5 size-2.5 shrink-0 text-zellij" />
                                  {l}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
                        <span className="text-[11px] font-bold text-muted-foreground">{t("نسبة الحضور")}</span>
                        <AttendanceBar attendees={a.attendeesCount} total={totalMembers} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─── اجتماعات المجلس ─── */}
        <TabsContent value="council" className="mt-4 space-y-4">
          {/* تركيبة المجلس */}
          <Card className="border-border/80">
            <CardContent className="p-5">
              <p className="mb-3 flex items-center gap-2 text-sm font-extrabold">
                <Users2 className="size-4 text-terra" />
                {t("تركيبة المجلس الإداري")}
              </p>
              {council.length === 0 ? (
                <p className="text-xs text-muted-foreground">{t("لم تُحدَّد مناصب المجلس بعد — حدّدها من سجل الأعضاء.")}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {council
                    .sort((a, b) => (a.boardRole ?? "").localeCompare(b.boardRole ?? ""))
                    .map((m) => (
                      <span key={m.id} className="flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5 text-xs">
                        <span className={`grid size-6 place-items-center rounded-full text-[10px] font-black ${m.gender === "F" ? "bg-chart-5/10 text-chart-5" : "bg-terra/10 text-terra"}`}>
                          {m.fullName[0]}
                        </span>
                        <span className="font-bold">{m.fullName}</span>
                        <span className="text-[10px] text-muted-foreground">— {m.boardRole ? t(BOARD_ROLES[m.boardRole]) : ""}</span>
                      </span>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={openMtCreate} className="gap-1.5 font-bold">
              <Plus className="size-4" />
              {t("إضافة اجتماع")}
            </Button>
          </div>

          {(meetings ?? []).length === 0 ? (
            <EmptyState icon={Users2} title={t("لا توجد اجتماعات")} desc={t("سجّل اجتماعات مجلس الإدارة ومحاضرها.")} />
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {(meetings ?? []).map((m) => {
                const upcoming = new Date(m.date).getTime() > Date.now();
                return (
                  <Card key={m.id} className={`border-border/80 ${upcoming ? "border-saffron/50 ring-1 ring-saffron/25" : ""}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <CalendarDays className="size-3" />
                            {formatDate(m.date)}
                            {upcoming && <span className="ms-1 rounded-full bg-saffron/15 px-2 py-0.5 text-[9px] font-bold text-saffron-ink">{t("قادم")}</span>}
                          </p>
                          <ul className="mt-2.5 space-y-1.5">
                            {lines(m.agenda).map((l, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs leading-6 text-foreground">
                                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-terra" />
                                {l}
                              </li>
                            ))}
                          </ul>
                          {lines(m.decisions).length > 0 && (
                            <div className="mt-3 rounded-lg bg-zellij/5 p-2.5">
                              <p className="text-[10px] font-extrabold text-zellij">{t("القرارات")}</p>
                              <ul className="mt-1 space-y-1">
                                {lines(m.decisions).map((l, i) => (
                                  <li key={i} className="text-[11px] leading-5 text-foreground">• {l}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
                            {m.attendeesCount} {t("حاضر")}
                          </span>
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="size-7" aria-label={t("تحرير")} onClick={() => openMtEdit(m)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t("حذف")} onClick={() => setMtToDelete(m)}>
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* نموذج الجمع العام */}
      <Dialog open={gaFormOpen} onOpenChange={setGaFormOpen}>
        <DialogContent className="max-w-lg scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ZelligeStar className="size-4 text-saffron" />
              {gaForm.id ? t("تحرير الجمع العام") : t("برمجة جمع عام")}
            </DialogTitle>
            <DialogDescription>{t("المادة القانونية توجب عقد الجمع العام العادي مرة واحدة على الأقل سنوياً.")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitGa} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("النوع")}</Label>
              <Select value={gaForm.type} onValueChange={(v) => setGaForm({ ...gaForm, type: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSEMBLY_TYPES).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("الحالة")}</Label>
              <Select value={gaForm.status} onValueChange={(v) => setGaForm({ ...gaForm, status: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ASSEMBLY_STATUS).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("التاريخ *")}</Label>
              <Input required type="date" value={toInputDate(gaForm.date)} onChange={(e) => setGaForm({ ...gaForm, date: new Date(e.target.value).toISOString() })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("محل الانعقاد")}</Label>
              <Input value={gaForm.location ?? ""} onChange={(e) => setGaForm({ ...gaForm, location: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("جدول الأعمال (بند في كل سطر) *")}</Label>
              <Textarea required value={gaForm.agenda} onChange={(e) => setGaForm({ ...gaForm, agenda: e.target.value })} className="min-h-20 bg-background" placeholder={t("المصادقة على التقرير الأدبي\nالمصادقة على الحسابات")} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("القرارات (بند في كل سطر)")}</Label>
              <Textarea value={gaForm.decisions ?? ""} onChange={(e) => setGaForm({ ...gaForm, decisions: e.target.value })} className="min-h-20 bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("عدد الحاضرين")}</Label>
              <Input type="number" min={0} max={999} value={gaForm.attendeesCount} onChange={(e) => setGaForm({ ...gaForm, attendeesCount: Number(e.target.value) || 0 })} className="bg-background" />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setGaFormOpen(false)}>{t("إلغاء")}</Button>
              <Button type="submit" disabled={saveAssembly.isPending} className="font-bold">
                {saveAssembly.isPending ? t("جارٍ الحفظ...") : t("حفظ")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* نموذج الاجتماع */}
      <Dialog open={mtFormOpen} onOpenChange={setMtFormOpen}>
        <DialogContent className="max-w-lg scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ZelligeStar className="size-4 text-saffron" />
              {mtForm.id ? t("تحرير الاجتماع") : t("إضافة اجتماع مجلس")}
            </DialogTitle>
            <DialogDescription>{t("اجتماع مجلس الإدارة — جدول الأعمال والقرارات")}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitMt} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs">{t("التاريخ *")}</Label>
              <Input required type="date" value={toInputDate(mtForm.date)} onChange={(e) => setMtForm({ ...mtForm, date: new Date(e.target.value).toISOString() })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("عدد الحاضرين")}</Label>
              <Input type="number" min={0} max={99} value={mtForm.attendeesCount} onChange={(e) => setMtForm({ ...mtForm, attendeesCount: Number(e.target.value) || 0 })} className="bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("جدول الأعمال (بند في كل سطر) *")}</Label>
              <Textarea required value={mtForm.agenda} onChange={(e) => setMtForm({ ...mtForm, agenda: e.target.value })} className="min-h-20 bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("القرارات (بند في كل سطر)")}</Label>
              <Textarea value={mtForm.decisions ?? ""} onChange={(e) => setMtForm({ ...mtForm, decisions: e.target.value })} className="min-h-20 bg-background" />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setMtFormOpen(false)}>{t("إلغاء")}</Button>
              <Button type="submit" disabled={saveMeeting.isPending} className="font-bold">
                {saveMeeting.isPending ? t("جارٍ الحفظ...") : t("حفظ")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!gaToDelete}
        onOpenChange={(v) => !v && setGaToDelete(null)}
        desc={t("سيتم حذف محضر «{type}» بتاريخ {date} نهائياً.", { type: gaToDelete ? ASSEMBLY_TYPES[gaToDelete.type]?.label ?? "" : "", date: gaToDelete ? formatDate(gaToDelete.date) : "" })}
        loading={deleteAssembly.isPending}
        onConfirm={() =>
          gaToDelete &&
          deleteAssembly.mutate(gaToDelete.id, {
            onSuccess: () => {
              toast({ title: t("تم الحذف") });
              setGaToDelete(null);
            },
            onError: (e) => toast({ variant: "destructive", title: t("تعذر الحذف"), description: tError(e) }),
          })
        }
      />
      <ConfirmDialog
        open={!!mtToDelete}
        onOpenChange={(v) => !v && setMtToDelete(null)}
        desc={t("سيتم حذف اجتماع {date} نهائياً.", { date: mtToDelete ? formatDate(mtToDelete.date) : "" })}
        loading={deleteMeeting.isPending}
        onConfirm={() =>
          mtToDelete &&
          deleteMeeting.mutate(mtToDelete.id, {
            onSuccess: () => {
              toast({ title: t("تم الحذف") });
              setMtToDelete(null);
            },
            onError: (e) => toast({ variant: "destructive", title: t("تعذر الحذف"), description: tError(e) }),
          })
        }
      />
    </div>
  );
}
