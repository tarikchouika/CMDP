// ═══════════════════════════════════════════════════════════════════════════
// CMDP — صفحة فرص العمل والتعاقد (سوق عمومي مفتوح للزوار والمستخدمين)
// تبويبان: الفرص المتاحة (بحث وتصفية وترشح) | إدارة فرص التعاونية (للمسيّرين)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  Briefcase,
  CalendarClock,
  FileText,
  Handshake,
  Loader2,
  MapPin,
  Megaphone,
  Pencil,
  Plus,
  Search,
  Send,
  Trash2,
  Users2,
  GraduationCap,
} from "lucide-react";
import {
  APPLICATION_STATUS,
  CONTRACT_TYPES,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_TYPES,
  REGIONS,
  SECTORS,
} from "@/lib/constants";
import { can } from "@/lib/permissions";
import { formatNumber } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import {
  useApplications,
  useApplyToOpportunity,
  useDecideApplication,
  useDeleteOpportunity,
  useMyOpportunities,
  useOpportunities,
  useSaveOpportunity,
  type OpportunityInput,
} from "@/hooks/use-cmdp";
import type { Opportunity } from "@/lib/types";
import { ConfirmDialog, EmptyState, LBadge, PageHeader, TableSkeleton } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { cn } from "@/lib/utils";

const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  JOB: Briefcase,
  CONTRACT: Handshake,
  SERVICE_NEED: Megaphone,
  INTERNSHIP: GraduationCap,
};

function daysLeft(deadline: string | null): number | null {
  if (!deadline) return null;
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86_400_000);
}

// ─── بطاقة فرصة ────────────────────────────────────────────────────────────
function OpportunityCard({ o, onApply, onDetails }: { o: Opportunity; onApply: (o: Opportunity) => void; onDetails: (o: Opportunity) => void }) {
  const Icon = TYPE_ICONS[o.type] ?? Briefcase;
  const dl = daysLeft(o.deadline);
  const closed = o.status !== "OPEN" || (dl != null && dl < 0);
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-terra/40 hover:shadow-lg">
      <div className="pattern-zellige absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden="true" />
      <div className="relative flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="arch-top grid h-14 w-11 shrink-0 place-items-center bg-gradient-to-b from-terra/15 to-terra/5 text-terra">
            <Icon className="size-5" />
          </span>
          <div className="flex flex-col items-end gap-1.5">
            <LBadge map={OPPORTUNITY_TYPES} value={o.type} />
            {o.contractType && (
              <span className="text-[10px] font-semibold text-muted-foreground">{CONTRACT_TYPES[o.contractType] ?? o.contractType}</span>
            )}
          </div>
        </div>

        <h3 className="mt-3 font-display text-sm font-extrabold leading-6 text-foreground">{o.title}</h3>
        <p className="mt-0.5 text-xs font-semibold text-terra">{o.cooperative?.name}</p>

        <p className="mt-2 line-clamp-2 text-xs leading-6 text-muted-foreground">{o.description}</p>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" />
            {o.city ? `${o.city}، ` : ""}
            {o.region}
          </span>
          {o.positions > 1 && (
            <span className="inline-flex items-center gap-1">
              <Users2 className="size-3" />
              {o.positions} مناصب
            </span>
          )}
          {dl != null && (
            <span className={cn("inline-flex items-center gap-1 font-semibold", dl <= 7 && !closed ? "text-[#8a6414]" : "")}>
              <CalendarClock className="size-3" />
              {closed ? "انتهى الأجل" : dl === 0 ? "آخر أجل اليوم" : `آخر أجل بعد ${formatNumber(dl)} يوماً`}
            </span>
          )}
          {o.applicationsCount != null && o.applicationsCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <FileText className="size-3" />
              {o.applicationsCount} ترشيحاً
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2 pt-1">
          <Button
            size="sm"
            className="flex-1 gap-1.5 text-xs font-bold"
            disabled={closed}
            onClick={() => onApply(o)}
          >
            <Send className="size-3.5" />
            {closed ? "مغلقة" : o.type === "JOB" || o.type === "INTERNSHIP" ? "الترشح" : "إبداء الاهتمام"}
          </Button>
          <Button size="sm" variant="outline" className="text-xs" onClick={() => onDetails(o)}>
            التفاصيل
          </Button>
        </div>
      </div>
    </article>
  );
}

// ─── حوار التفاصيل ─────────────────────────────────────────────────────────
function DetailsDialog({ o, open, onOpenChange }: { o: Opportunity | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!o) return null;
  const dl = daysLeft(o.deadline);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span className="arch-top grid h-14 w-11 shrink-0 place-items-center bg-gradient-to-b from-terra/15 to-terra/5 text-terra">
              {React.createElement(TYPE_ICONS[o.type] ?? Briefcase, { className: "size-5" })}
            </span>
            <div>
              <DialogTitle className="text-start text-base leading-6">{o.title}</DialogTitle>
              <DialogDescription className="text-start">
                {o.cooperative?.name} • {o.sector}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="leading-7 text-muted-foreground">{o.description}</p>
          {o.requirements && (
            <div>
              <h4 className="mb-1.5 text-xs font-extrabold text-foreground">المؤهلات والمتطلبات</h4>
              <p className="whitespace-pre-line rounded-xl bg-muted/60 p-3 text-xs leading-6 text-muted-foreground">
                {o.requirements}
              </p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border p-3">
              <p className="font-bold text-foreground">الموقع</p>
              <p className="mt-1 text-muted-foreground">
                {o.city ? `${o.city}، ` : ""}
                {o.region}
              </p>
            </div>
            <div className="rounded-xl border border-border p-3">
              <p className="font-bold text-foreground">المناصب</p>
              <p className="mt-1 text-muted-foreground">{o.positions}</p>
            </div>
            {o.contractType && (
              <div className="rounded-xl border border-border p-3">
                <p className="font-bold text-foreground">نوع العقد</p>
                <p className="mt-1 text-muted-foreground">{CONTRACT_TYPES[o.contractType]}</p>
              </div>
            )}
            <div className="rounded-xl border border-border p-3">
              <p className="font-bold text-foreground">آخر أجل</p>
              <p className="mt-1 text-muted-foreground">
                {dl == null ? "غير محدد" : closedCheck(o) ? "انتهى" : `بعد ${dl} يوماً`}
              </p>
            </div>
          </div>
          {(o.contactEmail || o.contactPhone) && (
            <div className="rounded-xl border border-saffron/30 bg-saffron/10 p-3 text-xs leading-6 text-[#8a6414]">
              <span className="font-bold">للتواصل المباشر: </span>
              {o.contactEmail && <span dir="ltr">{o.contactEmail}</span>}
              {o.contactEmail && o.contactPhone && " • "}
              {o.contactPhone && <span dir="ltr">{o.contactPhone}</span>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function closedCheck(o: Opportunity): boolean {
  const dl = daysLeft(o.deadline);
  return o.status !== "OPEN" || (dl != null && dl < 0);
}

// ─── حوار الترشح ───────────────────────────────────────────────────────────
function ApplyDialog({ o, open, onOpenChange }: { o: Opportunity | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  const user = useUIStore((s) => s.user);
  const apply = useApplyToOpportunity();
  const { toast } = useToast();
  const [form, setForm] = React.useState({ fullName: "", email: "", phone: "", motivation: "", experience: "" });

  React.useEffect(() => {
    if (open && o) {
      setForm((f) => ({
        ...f,
        fullName: user?.fullName ?? "",
        email: user?.role ? (f.email ?? "") : "",
        phone: "",
        motivation: "",
        experience: "",
      }));
    }
  }, [open, o, user?.fullName, user?.role]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!o) return;
    try {
      const res = await apply.mutateAsync({
        id: o.id,
        fullName: form.fullName,
        email: form.email || undefined,
        phone: form.phone || undefined,
        motivation: form.motivation || undefined,
        experience: form.experience || undefined,
      });
      toast({ title: "تم تسجيل الترشيح", description: (res as { message?: string })?.message });
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: "تعذر إرسال الترشيح", description: (err as Error).message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-start">الترشح: {o?.title}</DialogTitle>
          <DialogDescription>
            ستتلقى التعاونية ترشيحكم وتتواصل معكم عند القبول. بياناتكم تبقى محفوظة لدى التعاونية حصراً.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">الاسم الكامل *</Label>
              <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">الهاتف</Label>
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} dir="ltr" placeholder="06..." />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">البريد الإلكتروني</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} dir="ltr" placeholder="name@mail.ma" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">نبذة عن المؤهلات والتجربة</Label>
            <Textarea
              value={form.experience}
              onChange={(e) => setForm((f) => ({ ...f, experience: e.target.value }))}
              rows={2}
              placeholder="شهاداتي، سنوات التجربة، مهاراتي..."
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">رسالة التحفيز</Label>
            <Textarea
              value={form.motivation}
              onChange={(e) => setForm((f) => ({ ...f, motivation: e.target.value }))}
              rows={3}
              placeholder="لماذا أنا المرشح المناسب لهذه الفرصة؟"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={apply.isPending} className="gap-2 font-bold">
              {apply.isPending && <Loader2 className="size-4 animate-spin" />}
              إرسال الترشيح
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── حوار إنشاء/تعديل فرصة ─────────────────────────────────────────────────
function OpportunityDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Opportunity | null;
}) {
  const user = useUIStore((s) => s.user);
  const save = useSaveOpportunity();
  const { toast } = useToast();
  const [form, setForm] = React.useState({
    type: "JOB",
    title: "",
    description: "",
    sector: SECTORS[0] as string,
    region: REGIONS[0] as string,
    city: "",
    positions: "1",
    contractType: "CDD",
    requirements: "",
    deadline: "",
    contactEmail: "",
    contactPhone: "",
  });

  React.useEffect(() => {
    if (open) {
      if (editing) {
        setForm({
          type: editing.type,
          title: editing.title,
          description: editing.description,
          sector: editing.sector,
          region: editing.region,
          city: editing.city ?? "",
          positions: String(editing.positions),
          contractType: editing.contractType ?? "",
          requirements: editing.requirements ?? "",
          deadline: editing.deadline ? editing.deadline.slice(0, 10) : "",
          contactEmail: editing.contactEmail ?? "",
          contactPhone: editing.contactPhone ?? "",
        });
      } else {
        setForm((f) => ({
          ...f,
          type: "JOB",
          title: "",
          description: "",
          sector: SECTORS[0],
          region: REGIONS[0],
          city: "",
          positions: "1",
          contractType: "CDD",
          requirements: "",
          deadline: "",
          contactEmail: "",
          contactPhone: "",
        }));
      }
    }
  }, [open, editing]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload: OpportunityInput = {
      id: editing?.id ?? null,
      cooperativeId: user?.cooperativeId ?? 0,
      type: form.type,
      title: form.title,
      description: form.description,
      sector: form.sector,
      region: form.region,
      city: form.city || null,
      positions: Number(form.positions) || 1,
      contractType: form.contractType || null,
      requirements: form.requirements || null,
      deadline: form.deadline || null,
      contactEmail: form.contactEmail || null,
      contactPhone: form.contactPhone || null,
      status: editing?.status ?? "OPEN",
    };
    try {
      await save.mutateAsync(payload);
      toast({ title: editing ? "تم تحديث الفرصة" : "تم نشر الفرصة", description: "ظهرت مباشرة في السوق العمومي" });
      onOpenChange(false);
    } catch (err) {
      toast({ variant: "destructive", title: "تعذر الحفظ", description: (err as Error).message });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "تعديل الفرصة" : "نشر فرصة جديدة"}</DialogTitle>
          <DialogDescription>
            تُنشر الفرص باسم تعاونيتكم وتظهر للعموم — زواراً ومستخدمين.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نوع الفرصة *</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(OPPORTUNITY_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">نوع العقد</Label>
              <Select value={form.contractType} onValueChange={(v) => setForm((f) => ({ ...f, contractType: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="غير محدد" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CONTRACT_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">العنوان *</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required placeholder="مسؤول(ة)..." />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">الوصف *</Label>
            <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">القطاع *</Label>
              <Select value={form.sector} onValueChange={(v) => setForm((f) => ({ ...f, sector: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {SECTORS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">الجهة *</Label>
              <Select value={form.region} onValueChange={(v) => setForm((f) => ({ ...f, region: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">المدينة</Label>
              <Input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">عدد المناصب</Label>
              <Input type="number" min={1} value={form.positions} onChange={(e) => setForm((f) => ({ ...f, positions: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">آخر أجل للترشح</Label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">المؤهلات والمتطلبات</Label>
            <Textarea value={form.requirements} onChange={(e) => setForm((f) => ({ ...f, requirements: e.target.value }))} rows={2} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">بريد التواصل</Label>
              <Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} dir="ltr" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">هاتف التواصل</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} dir="ltr" />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={save.isPending} className="gap-2 font-bold">
              {save.isPending && <Loader2 className="size-4 animate-spin" />}
              {editing ? "حفظ التعديلات" : "نشر الفرصة"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── الوحدة الرئيسية ───────────────────────────────────────────────────────
export function OpportunitiesView() {
  const user = useUIStore((s) => s.user);
  const canManage = can(user, "post:opportunities");
  const { toast } = useToast();

  const [query, setQuery] = React.useState("");
  const [type, setType] = React.useState<string>("");
  const [sector, setSector] = React.useState("");
  const [region, setRegion] = React.useState("");
  const { data: opportunities, isLoading } = useOpportunities({ q: query || undefined, type: type || undefined, sector: sector || undefined, region: region || undefined });
  const { data: mine } = useMyOpportunities();
  const { data: applications } = useApplications();
  const del = useDeleteOpportunity();
  const decideApp = useDecideApplication();

  const [applyTo, setApplyTo] = React.useState<Opportunity | null>(null);
  const [details, setDetails] = React.useState<Opportunity | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Opportunity | null>(null);
  const [deleting, setDeleting] = React.useState<Opportunity | null>(null);

  return (
    <div>
      <PageHeader
        title="فرص العمل والتعاقد"
        desc="منصة موحدة تعرض مناصب التعاونيات الشاغرة، وفرص التعاقد والشراكة، وحاجاتها الخدمية — متاحة للزوار والمستخدمين."
        actions={
          canManage ? (
            <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2 font-bold">
              <Plus className="size-4" />
              نشر فرصة
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="market">
        <TabsList className="mb-4">
          <TabsTrigger value="market" className="gap-1.5">
            <Search className="size-3.5" />
            السوق العمومي
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="manage" className="gap-1.5">
              <Megaphone className="size-3.5" />
              فرص تعاونيتي ({(mine ?? []).length})
            </TabsTrigger>
          )}
          {canManage && (
            <TabsTrigger value="applications" className="gap-1.5">
              <FileText className="size-3.5" />
              الترشيحات ({(applications ?? []).length})
            </TabsTrigger>
          )}
        </TabsList>

        {/* ─── السوق العمومي ─────────────────────────────────────────── */}
        <TabsContent value="market" className="space-y-5">
          {/* البحث والتصفية */}
          <div className="grid gap-2 rounded-2xl border border-border bg-card p-3 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن فرصة..."
                className="bg-background ps-9"
              />
            </div>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="كل الأنواع" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OPPORTUNITY_TYPES).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="كل القطاعات" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {SECTORS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="bg-background">
                <SelectValue placeholder="كل الجهات" />
              </SelectTrigger>
              <SelectContent className="max-h-64">
                {REGIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-56 animate-pulse rounded-2xl bg-muted/60" />
              ))}
            </div>
          ) : (opportunities ?? []).length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="لا توجد فرص مطابقة"
              desc="جرّب تغيير عوامل التصفية، أو عد لاحقاً — تُنشر فرص جديدة باستمرار."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {(opportunities ?? []).map((o) => (
                <OpportunityCard key={o.id} o={o} onApply={setApplyTo} onDetails={setDetails} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ─── إدارة فرص التعاونية ──────────────────────────────────── */}
        {canManage && (
          <TabsContent value="manage">
            {(mine ?? []).length === 0 ? (
              <EmptyState
                icon={Megaphone}
                title="لم تنشروا أي فرصة بعد"
                desc="انشروا المناصب الشاغرة وحاجاتكم الخدمية لتصل إلى مرشحين من كل الجهات."
                action={
                  <Button onClick={() => { setEditing(null); setDialogOpen(true); }} className="gap-2 font-bold">
                    <Plus className="size-4" /> نشر أول فرصة
                  </Button>
                }
              />
            ) : (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="divide-y divide-border">
                  {(mine ?? []).map((o) => (
                    <div key={o.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{o.title}</p>
                          <LBadge map={OPPORTUNITY_TYPES} value={o.type} />
                          <LBadge map={OPPORTUNITY_STATUS} value={o.status} />
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {o.city ? `${o.city}، ` : ""}
                          {o.region} • {o.positions} منصب
                          {o.applicationsCount != null ? ` • ${o.applicationsCount} ترشيحاً` : ""}
                          {daysLeft(o.deadline) != null
                            ? daysLeft(o.deadline)! < 0
                              ? " • انتهى الأجل"
                              : ` • باقي ${daysLeft(o.deadline)} يوماً`
                            : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs" onClick={() => { setEditing(o); setDialogOpen(true); }}>
                          <Pencil className="size-3.5" /> تعديل
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 gap-1 px-2 text-xs text-destructive hover:text-destructive" onClick={() => setDeleting(o)}>
                          <Trash2 className="size-3.5" /> حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        )}

        {/* ─── دراسة الترشيحات ───────────────────────────────────────── */}
        {canManage && (
          <TabsContent value="applications">
            {(applications ?? []).length === 0 ? (
              <EmptyState icon={FileText} title="لا توجد ترشيحات بعد" desc="ستظهر ترشيحات المرشحين على فرصكم هنا." />
            ) : (
              <div className="space-y-3">
                {(applications ?? []).map((a) => (
                  <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-foreground">{a.fullName}</p>
                          <LBadge map={APPLICATION_STATUS} value={a.status} />
                        </div>
                        <p className="mt-0.5 text-xs text-terra">{a.opportunity?.title}</p>
                        {a.experience && (
                          <p className="mt-1.5 rounded-lg bg-muted/60 p-2 text-[11px] leading-5 text-muted-foreground">
                            {a.experience}
                          </p>
                        )}
                        {a.motivation && (
                          <p className="mt-1.5 line-clamp-2 text-[11px] leading-5 text-muted-foreground">{a.motivation}</p>
                        )}
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                          {a.email && <span dir="ltr">{a.email}</span>}
                          {a.phone && <span dir="ltr">{a.phone}</span>}
                        </div>
                      </div>
                      <Select
                        value={a.status}
                        onValueChange={async (v) => {
                          try {
                            await decideApp.mutateAsync({ id: a.id, status: v });
                            toast({ title: "تم تحديث حالة الترشيح" });
                          } catch (err) {
                            toast({ variant: "destructive", title: "تعذر التحديث", description: (err as Error).message });
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 w-36 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(APPLICATION_STATUS).map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      <ApplyDialog o={applyTo} open={!!applyTo} onOpenChange={(v) => !v && setApplyTo(null)} />
      <DetailsDialog o={details} open={!!details} onOpenChange={(v) => !v && setDetails(null)} />
      {canManage && <OpportunityDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />}
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title="حذف الفرصة"
        desc={`هل تريدون حذف "${deleting?.title}" نهائياً؟ سيُحذف معها سجل الترشيحات المرتبطة بها.`}
        loading={del.isPending}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await del.mutateAsync(deleting.id);
            toast({ title: "تم حذف الفرصة" });
            setDeleting(null);
          } catch (err) {
            toast({ variant: "destructive", title: "تعذر الحذف", description: (err as Error).message });
          }
        }}
      />
    </div>
  );
}
