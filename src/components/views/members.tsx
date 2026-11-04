// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة الأعضاء
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  CalendarDays,
  Hash,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  Venus,
} from "lucide-react";
import type { Member } from "@/lib/types";
import { BOARD_ROLES, MEMBER_STATUS } from "@/lib/constants";
import { formatNumber, formatShortDate, initials, toInputDate } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import { useCooperatives, useDeleteMember, useMembers, useSaveMember } from "@/hooks/use-cmdp";
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { t, tError } from "@/lib/i18n";

type MemberForm = Omit<Member, "id" | "createdAt"> & { id?: number | null };

const ROLE_ORDER: Record<string, number> = {
  PRESIDENT: 1,
  VICE: 2,
  SECRETARY: 3,
  TREASURER: 4,
  AUDITOR: 5,
  ADVISOR: 6,
};

export function MembersView() {
  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const { data: members, isLoading } = useMembers(activeCoopId);
  const { data: coops } = useCooperatives();
  const saveMember = useSaveMember(activeCoopId);
  const deleteMember = useDeleteMember(activeCoopId);
  const { toast } = useToast();

  const coop = coops?.find((c) => c.id === activeCoopId);

  const [q, setQ] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [formOpen, setFormOpen] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Member | null>(null);

  const emptyForm = (): MemberForm => ({
    id: null,
    cooperativeId: activeCoopId,
    fullName: "",
    cin: "",
    gender: "F",
    phone: "",
    email: "",
    city: coop?.province ?? "",
    joinDate: new Date().toISOString(),
    shares: 1,
    boardRole: "",
    status: "ACTIVE",
  });
  const [form, setForm] = React.useState<MemberForm>(emptyForm());

  const sorted = React.useMemo(() => {
    const rows = [...(members ?? [])];
    rows.sort((a, b) => {
      const ra = a.boardRole ? ROLE_ORDER[a.boardRole] ?? 9 : 9;
      const rb = b.boardRole ? ROLE_ORDER[b.boardRole] ?? 9 : 9;
      if (ra !== rb) return ra - rb;
      return a.joinDate < b.joinDate ? -1 : 1;
    });
    return rows;
  }, [members]);

  const filtered = React.useMemo(() => {
    let rows = sorted;
    if (statusFilter !== "ALL") rows = rows.filter((m) => m.status === statusFilter);
    if (q.trim()) {
      const s = q.trim();
      rows = rows.filter((m) => m.fullName.includes(s) || (m.cin ?? "").includes(s) || (m.phone ?? "").includes(s));
    }
    return rows;
  }, [sorted, q, statusFilter]);

  const stats = React.useMemo(() => {
    const total = sorted.length;
    const active = sorted.filter((m) => m.status === "ACTIVE");
    const women = active.filter((m) => m.gender === "F").length;
    const shares = sorted.reduce((s, m) => s + m.shares, 0);
    const council = sorted.filter((m) => m.boardRole).length;
    return { total, active: active.length, womenPct: active.length ? Math.round((women / active.length) * 100) : 0, shares, council };
  }, [sorted]);

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }
  function openEdit(m: Member) {
    setForm({ ...m });
    setFormOpen(true);
  }
  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveMember.mutate(
      { ...form, cooperativeId: activeCoopId, boardRole: form.boardRole || null },
      {
        onSuccess: () => {
          toast({ title: form.id ? t("تم تحديث العضو") : t("تمت إضافة العضو") });
          setFormOpen(false);
        },
        onError: (err) => toast({ variant: "destructive", title: t("تعذر الحفظ"), description: tError(err) }),
      }
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("الأعضاء")}
        desc={t("سجل منخرطي {name} — الحصص ومناصب المجلس الإداري", { name: coop?.name ?? t("التعاونية") })}
        actions={
          <Button onClick={openCreate} className="gap-1.5 font-bold">
            <Plus className="size-4" />
            {t("إضافة عضو")}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label={t("إجمالي الأعضاء")} value={formatNumber(stats.total)} icon={Users} tone="terra" />
        <StatCard label={t("الأعضاء النشطون")} value={formatNumber(stats.active)} icon={UserRound} tone="zellij" />
        <StatCard label={t("نسبة النساء")} value={`${stats.womenPct}%`} icon={Venus} tone="plum" />
        <StatCard label={t("إجمالي الحصص")} value={formatNumber(stats.shares)} hint={t("المجلس: {n} مناصب", { n: stats.council })} icon={Hash} tone="saffron" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("ابحث بالاسم أو البطاقة الوطنية أو الهاتف...")} className="bg-card ps-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-card text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">{t("كل الحالات")}</SelectItem>
            <SelectItem value="ACTIVE">{t("نشط")}</SelectItem>
            <SelectItem value="SUSPENDED">{t("موقوف")}</SelectItem>
            <SelectItem value="WITHDRAWN">{t("منسحب")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Users} title={t("لا يوجد أعضاء مطابقون")} desc={t("أضف أول عضو أو غيّر معايير البحث.")} action={<Button onClick={openCreate} className="gap-1.5"><Plus className="size-4" />{t("إضافة عضو")}</Button>} />
      ) : (
        <>
          {/* جدول — الشاشات المتوسطة فما فوق */}
          <Card className="hidden border-border/80 md:block">
            <CardContent className="p-0">
              <div className="max-h-[560px] overflow-y-auto scrollbar-thin">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-card">
                    <TableRow>
                      <TableHead className="text-start">{t("العضو")}</TableHead>
                      <TableHead className="text-start">{t("البطاقة الوطنية")}</TableHead>
                      <TableHead className="text-start">{t("الهاتف")}</TableHead>
                      <TableHead className="text-start">{t("تاريخ الانخراط")}</TableHead>
                      <TableHead className="text-center">{t("الحصص")}</TableHead>
                      <TableHead className="text-start">{t("المنصب")}</TableHead>
                      <TableHead className="text-start">{t("الحالة")}</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((m) => (
                      <TableRow key={m.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <span className={`grid size-9 shrink-0 place-items-center rounded-full text-xs font-black ${m.gender === "F" ? "bg-chart-5/10 text-chart-5" : "bg-terra/10 text-terra"}`}>
                              {initials(m.fullName)}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-bold text-foreground">{m.fullName}</p>
                              {m.city && <p className="text-[10px] text-muted-foreground">{m.city}</p>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">{m.cin ?? "—"}</TableCell>
                        <TableCell className="text-xs tabular-nums text-muted-foreground">{m.phone ?? "—"}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{formatShortDate(m.joinDate)}</TableCell>
                        <TableCell className="text-center text-xs font-extrabold tabular-nums">{m.shares}</TableCell>
                        <TableCell>
                          {m.boardRole ? (
                            <span className="rounded-full bg-terra/10 px-2 py-0.5 text-[10px] font-bold text-terra">
                              {t(BOARD_ROLES[m.boardRole])}
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">{t("عضو")}</span>
                          )}
                        </TableCell>
                        <TableCell><LBadge map={MEMBER_STATUS} value={m.status} className="px-2 py-0 text-[10px]" /></TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1 opacity-60 transition-opacity group-hover:opacity-100">
                            <Button variant="ghost" size="icon" className="size-7" aria-label={t("تحرير")} onClick={() => openEdit(m)}>
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t("حذف")} onClick={() => setToDelete(m)}>
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
            {filtered.map((m) => (
              <Card key={m.id} className="border-border/80">
                <CardContent className="flex items-center gap-3 p-3.5">
                  <span className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-black ${m.gender === "F" ? "bg-chart-5/10 text-chart-5" : "bg-terra/10 text-terra"}`}>
                    {initials(m.fullName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-foreground">{m.fullName}</p>
                      {m.boardRole && (
                        <span className="shrink-0 rounded-full bg-terra/10 px-2 py-0.5 text-[9px] font-bold text-terra">{t(BOARD_ROLES[m.boardRole])}</span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1"><CalendarDays className="size-3" />{formatShortDate(m.joinDate)}</span>
                      <span className="flex items-center gap-1"><Hash className="size-3" />{m.shares} {t("حصص")}</span>
                      {m.phone && <span className="flex items-center gap-1"><Phone className="size-3" />{m.phone}</span>}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <LBadge map={MEMBER_STATUS} value={m.status} className="px-2 py-0 text-[9px]" />
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-7" aria-label={t("تحرير")} onClick={() => openEdit(m)}>
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-7 text-destructive" aria-label={t("حذف")} onClick={() => setToDelete(m)}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* نموذج العضو */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ZelligeStar className="size-4 text-saffron" />
              {form.id ? t("تحرير العضو") : t("إضافة عضو جديد")}
            </DialogTitle>
            <DialogDescription>{t("بيانات الانخراط والحصص داخل {name}", { name: coop?.name ?? t("التعاونية") })}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">{t("الاسم الكامل *")}</Label>
              <Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("رقم البطاقة الوطنية")}</Label>
              <Input value={form.cin ?? ""} onChange={(e) => setForm({ ...form, cin: e.target.value })} className="bg-background" placeholder="X000000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("الجنس")}</Label>
              <Select value={form.gender ?? "F"} onValueChange={(v) => setForm({ ...form, gender: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="F">{t("أنثى")}</SelectItem>
                  <SelectItem value="M">{t("ذكر")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("الهاتف")}</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-background" placeholder="06 XX XX XX XX" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("المدينة")}</Label>
              <Input value={form.city ?? ""} onChange={(e) => setForm({ ...form, city: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("تاريخ الانخراط *")}</Label>
              <Input required type="date" value={toInputDate(form.joinDate)} onChange={(e) => setForm({ ...form, joinDate: new Date(e.target.value).toISOString() })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("عدد الحصص")}</Label>
              <Input type="number" min={1} max={99} value={form.shares} onChange={(e) => setForm({ ...form, shares: Number(e.target.value) || 1 })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("المنصب داخل المجلس")}</Label>
              <Select value={form.boardRole ?? "NONE"} onValueChange={(v) => setForm({ ...form, boardRole: v === "NONE" ? "" : v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">{t("عضو عادي")}</SelectItem>
                  {Object.entries(BOARD_ROLES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{t("الحالة")}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">{t("نشط")}</SelectItem>
                  <SelectItem value="SUSPENDED">{t("موقوف")}</SelectItem>
                  <SelectItem value="WITHDRAWN">{t("منسحب")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>{t("إلغاء")}</Button>
              <Button type="submit" disabled={saveMember.isPending} className="font-bold">
                {saveMember.isPending ? t("جارٍ الحفظ...") : t("حفظ")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        desc={t("سيتم حذف العضو «{name}» نهائياً من سجل التعاونية.", { name: toDelete?.fullName ?? "" })}
        loading={deleteMember.isPending}
        onConfirm={() =>
          toDelete &&
          deleteMember.mutate(toDelete.id, {
            onSuccess: () => {
              toast({ title: t("تم حذف العضو") });
              setToDelete(null);
            },
            onError: (e) => toast({ variant: "destructive", title: t("تعذر الحذف"), description: tError(e) }),
          })
        }
      />
    </div>
  );
}
