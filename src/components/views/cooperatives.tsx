// ═══════════════════════════════════════════════════════════════════════════
// CMDP — وحدة التعاونيات
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  BadgeCheck,
  Building2,
  CalendarDays,
  Hash,
  Landmark,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  User,
} from "lucide-react";
import type { Cooperative } from "@/lib/types";
import { COOP_STATUS, REGIONS, SECTORS } from "@/lib/constants";
import { formatDate, formatNumber, toInputDate } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import {
  useAllMembers,
  useCooperatives,
  useDeleteCooperative,
  useSaveCooperative,
} from "@/hooks/use-cmdp";
import { ConfirmDialog, EmptyState, LBadge, PageHeader } from "@/components/shared";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type CoopForm = Omit<Cooperative, "id" | "createdAt"> & { id?: number | null };

const emptyForm = (): CoopForm => ({
  id: null,
  name: "",
  registrationNumber: "",
  odcCardNumber: "",
  sector: SECTORS[0],
  region: REGIONS[4],
  province: "",
  commune: "",
  presidentName: "",
  phone: "",
  email: "",
  address: "",
  foundingDate: new Date().toISOString(),
  status: "ACTIVE",
  approvalStatus: "APPROVED",
  approvalNote: null,
  notes: "",
});

function InfoRow({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg bg-muted/40 px-3 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-terra" />
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-muted-foreground">{label}</p>
        <p className="truncate text-xs font-bold text-foreground">{value || "—"}</p>
      </div>
    </div>
  );
}

export function CooperativesView() {
  const { data: coops, isLoading } = useCooperatives();
  const { data: allMembers } = useAllMembers();
  const saveCoop = useSaveCooperative();
  const deleteCoop = useDeleteCooperative();
  const { toast } = useToast();

  const activeCoopId = useUIStore((s) => s.activeCoopId);
  const setActiveCoop = useUIStore((s) => s.setActiveCoop);

  const [q, setQ] = React.useState("");
  const [sectorFilter, setSectorFilter] = React.useState("ALL");
  const [statusFilter, setStatusFilter] = React.useState("ALL");
  const [formOpen, setFormOpen] = React.useState(false);
  const [form, setForm] = React.useState<CoopForm>(emptyForm());
  const [detail, setDetail] = React.useState<Cooperative | null>(null);
  const [toDelete, setToDelete] = React.useState<Cooperative | null>(null);

  const memberCounts = React.useMemo(() => {
    const m = new Map<number, number>();
    for (const x of allMembers ?? []) m.set(x.cooperativeId, (m.get(x.cooperativeId) ?? 0) + 1);
    return m;
  }, [allMembers]);

  const filtered = React.useMemo(() => {
    let rows = coops ?? [];
    if (sectorFilter !== "ALL") rows = rows.filter((c) => c.sector === sectorFilter);
    if (statusFilter !== "ALL") rows = rows.filter((c) => c.status === statusFilter);
    if (q.trim()) {
      const s = q.trim();
      rows = rows.filter((c) => c.name.includes(s) || c.province.includes(s) || c.region.includes(s) || c.registrationNumber.includes(s));
    }
    return rows;
  }, [coops, q, sectorFilter, statusFilter]);

  function openCreate() {
    setForm(emptyForm());
    setFormOpen(true);
  }
  function openEdit(c: Cooperative) {
    setForm({ ...c });
    setFormOpen(true);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    saveCoop.mutate(form, {
      onSuccess: () => {
        toast({ title: form.id ? "تم تحديث التعاونية" : "تمت إضافة التعاونية" });
        setFormOpen(false);
      },
      onError: (err) => toast({ variant: "destructive", title: "تعذر الحفظ", description: err.message }),
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="التعاونيات"
        desc="سجل التعاونيات المسيرة عبر المنصة — التسجيل بالسجل المحلي وبطاقة الاعتراف ODCO"
        actions={
          <Button onClick={openCreate} className="gap-1.5 font-bold">
            <Plus className="size-4" />
            إضافة تعاونية
          </Button>
        }
      />

      {/* أدوات التصفية */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم أو الإقليم أو رقم التسجيل..." className="bg-card ps-9" />
        </div>
        <Select value={sectorFilter} onValueChange={setSectorFilter}>
          <SelectTrigger className="w-44 bg-card text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل القطاعات</SelectItem>
            {SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 bg-card text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">كل الحالات</SelectItem>
            <SelectItem value="ACTIVE">نشطة</SelectItem>
            <SelectItem value="DORMANT">خاملة</SelectItem>
            <SelectItem value="DISSOLVED">منحلة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* الشبكة */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Building2} title="لا توجد تعاونيات مطابقة" desc="جرّب تغيير معايير البحث أو أضف تعاونية جديدة." action={<Button onClick={openCreate} className="gap-1.5"><Plus className="size-4" />إضافة تعاونية</Button>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c) => {
            const isActive = c.id === activeCoopId;
            return (
              <Card key={c.id} className={`group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md ${isActive ? "border-terra/50 ring-1 ring-terra/25" : ""}`}>
                <div className="pattern-zellige absolute inset-0 opacity-50" aria-hidden="true" />
                <CardContent className="relative flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className={`arch-top grid h-14 w-10 shrink-0 place-items-center font-display text-lg font-black ${isActive ? "bg-terra text-cream" : "bg-terra/10 text-terra"}`}>
                      {c.name.replace("تعاونية ", "")[0] ?? "ت"}
                    </span>
                    <div className="flex flex-col items-end gap-1.5">
                      <LBadge map={COOP_STATUS} value={c.status} />
                      {isActive && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-terra">
                          <Star className="size-3 fill-terra" /> النشطة
                        </span>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 font-display text-sm font-extrabold leading-6 text-foreground">{c.name}</h3>
                  <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="size-3" />
                    {c.province}، {c.region}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                    <span className="rounded-lg bg-muted/60 px-2 py-1.5">
                      <span className="text-muted-foreground">التسجيل: </span>
                      <span className="font-bold tabular-nums">{c.registrationNumber}</span>
                    </span>
                    <span className="rounded-lg bg-muted/60 px-2 py-1.5">
                      <span className="text-muted-foreground">الأعضاء: </span>
                      <span className="font-bold tabular-nums">{formatNumber(memberCounts.get(c.id) ?? 0)}</span>
                    </span>
                  </div>

                  <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3">
                    <Button variant="outline" size="sm" className="h-8 flex-1 text-[11px]" onClick={() => setDetail(c)}>
                      البطاقة
                    </Button>
                    {!isActive && (
                      <Button variant="outline" size="icon" className="size-8" title="تعيين كتعاونية نشطة" aria-label="تعيين كتعاونية نشطة" onClick={() => { setActiveCoop(c.id); toast({ title: "أصبحت التعاونية النشطة", description: c.name }); }}>
                        <Star className="size-3.5" />
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="size-8" title="تحرير" aria-label="تحرير" onClick={() => openEdit(c)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="outline" size="icon" className="size-8 text-destructive hover:bg-destructive/10" title="حذف" aria-label="حذف" onClick={() => setToDelete(c)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* بطاقة التفاصيل */}
      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto scrollbar-thin">
          {detail && (
            <>
              <DialogHeader>
                <div className="arch-top mx-auto -mt-2 grid h-24 w-20 place-items-center bg-ink font-display text-3xl font-black text-terra-soft">
                  {detail.name.replace("تعاونية ", "")[0] ?? "ت"}
                </div>
                <DialogTitle className="text-center font-display text-base font-extrabold">{detail.name}</DialogTitle>
                <DialogDescription className="flex items-center justify-center gap-2 text-center">
                  <LBadge map={COOP_STATUS} value={detail.status} />
                  <span className="text-xs">{detail.sector}</span>
                </DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-2">
                <InfoRow icon={Hash} label="رقم التسجيل بالسجل المحلي" value={detail.registrationNumber} />
                <InfoRow icon={BadgeCheck} label="بطاقة الاعتراف ODCO" value={detail.odcCardNumber} />
                <InfoRow icon={MapPin} label="الجهة / الإقليم" value={`${detail.region} — ${detail.province}`} />
                <InfoRow icon={MapPin} label="الجماعة" value={detail.commune} />
                <InfoRow icon={User} label="رئيس(ة) التعاونية" value={detail.presidentName} />
                <InfoRow icon={CalendarDays} label="تاريخ التأسيس" value={formatDate(detail.foundingDate)} />
                <InfoRow icon={Phone} label="الهاتف" value={detail.phone} />
                <InfoRow icon={Mail} label="البريد الإلكتروني" value={detail.email} />
                <InfoRow icon={Landmark} label="العنوان" value={detail.address} />
                <InfoRow icon={Building2} label="عدد الأعضاء" value={formatNumber(memberCounts.get(detail.id) ?? 0)} />
              </div>
              {detail.notes && (
                <p className="rounded-xl border border-saffron/30 bg-saffron/10 p-3 text-xs leading-6 text-[#8a6414]">{detail.notes}</p>
              )}
              <DialogFooter className="gap-2 sm:justify-center">
                <Button variant="outline" className="gap-1.5" onClick={() => { setActiveCoop(detail.id); setDetail(null); toast({ title: "أصبحت التعاونية النشطة" }); }}>
                  <Star className="size-4" /> تعيين كتعاونية نشطة
                </Button>
                <Button variant="outline" className="gap-1.5" onClick={() => { openEdit(detail); setDetail(null); }}>
                  <Pencil className="size-4" /> تحرير
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* نموذج الإضافة/التحرير */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <ZelligeStar className="size-4 text-saffron" />
              {form.id ? "تحرير التعاونية" : "إضافة تعاونية جديدة"}
            </DialogTitle>
            <DialogDescription>
              أدخل المعطيات وفق القانون رقم 112.12 — الحقول المؤشرة بـ * إلزامية.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">اسم التعاونية *</Label>
              <Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-background" placeholder="تعاونية ... لل..." />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رقم التسجيل بالسجل المحلي *</Label>
              <Input required value={form.registrationNumber} onChange={(e) => setForm({ ...form, registrationNumber: e.target.value })} className="bg-background" placeholder="0000/00" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">بطاقة الاعتراف (ODCO)</Label>
              <Input value={form.odcCardNumber ?? ""} onChange={(e) => setForm({ ...form, odcCardNumber: e.target.value })} className="bg-background" placeholder="OD-0000-000" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">القطاع *</Label>
              <Select value={form.sector} onValueChange={(v) => setForm({ ...form, sector: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{SECTORS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الحالة</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">نشطة</SelectItem>
                  <SelectItem value="DORMANT">خاملة</SelectItem>
                  <SelectItem value="DISSOLVED">منحلة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الجهة *</Label>
              <Select value={form.region} onValueChange={(v) => setForm({ ...form, region: v })}>
                <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
                <SelectContent>{REGIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الإقليم / العمالة *</Label>
              <Input required value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الجماعة</Label>
              <Input value={form.commune ?? ""} onChange={(e) => setForm({ ...form, commune: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">رئيس(ة) التعاونية *</Label>
              <Input required value={form.presidentName} onChange={(e) => setForm({ ...form, presidentName: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تاريخ التأسيس *</Label>
              <Input required type="date" value={toInputDate(form.foundingDate)} onChange={(e) => setForm({ ...form, foundingDate: new Date(e.target.value).toISOString() })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">الهاتف</Label>
              <Input value={form.phone ?? ""} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="bg-background" placeholder="06 XX XX XX XX" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">البريد الإلكتروني</Label>
              <Input type="email" value={form.email ?? ""} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">العنوان</Label>
              <Input value={form.address ?? ""} onChange={(e) => setForm({ ...form, address: e.target.value })} className="bg-background" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">ملاحظات</Label>
              <Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="min-h-16 bg-background" />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>إلغاء</Button>
              <Button type="submit" disabled={saveCoop.isPending} className="font-bold">
                {saveCoop.isPending ? "جارٍ الحفظ..." : "حفظ"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(v) => !v && setToDelete(null)}
        desc={`سيتم حذف «${toDelete?.name}» وكل بياناتها المرتبطة (الأعضاء، الحركات، الوثائق...) نهائياً.`}
        loading={deleteCoop.isPending}
        onConfirm={() =>
          toDelete &&
          deleteCoop.mutate(toDelete.id, {
            onSuccess: () => {
              toast({ title: "تم حذف التعاونية" });
              setToDelete(null);
            },
            onError: (e) => toast({ variant: "destructive", title: "تعذر الحذف", description: e.message }),
          })
        }
      />
    </div>
  );
}
