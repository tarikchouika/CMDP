// ═══════════════════════════════════════════════════════════════════════════
// CMDP — فضاء العضو والمتعاقد
// العضو غير المسير: الاطلاع والمشاركة في الجموع العامة والتصويت (قانون 112.12)
// المتعاقد: الاطلاع على ما هو مصرح به من الرئيس أو عضو مسير
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import {
  BadgeCheck,
  CalendarCheck2,
  CalendarClock,
  Eye,
  FileCheck2,
  Gavel,
  Handshake,
  Landmark,
  MapPin,
  Scale,
  ThumbsDown,
  ThumbsUp,
  Vote,
} from "lucide-react";
import type { Assembly } from "@/lib/types";
import { ASSEMBLY_STATUS, ASSEMBLY_TYPES, BOARD_ROLES, DOC_TYPES } from "@/lib/constants";
import { formatNumber, formatShortDate } from "@/lib/format";
import { useUIStore } from "@/store/ui";
import {
  useAssemblies,
  useAssemblyAction,
  useCooperatives,
  useDocuments,
  useMembers,
} from "@/hooks/use-cmdp";
import { EmptyState, LBadge, PageHeader, AttendanceBar } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { t, tError } from "@/lib/i18n";

// ─── بطاقة الجمع العام للعضو ────────────────────────────────────────────────
function MemberAssemblyCard({ assembly, memberCount }: { assembly: Assembly; memberCount: number }) {
  const action = useAssemblyAction();
  const { toast } = useToast();
  const [busy, setBusy] = React.useState(false);

  async function run(payload: { action: "vote" | "attend"; decision?: string; label: string }) {
    setBusy(true);
    try {
      await action.mutateAsync({ assemblyId: assembly.id, action: payload.action, decision: payload.decision });
      toast({ title: payload.label, description: t("مشاركتكم مسجلة — شكراً لالتزامكم") });
    } catch (err) {
      toast({ variant: "destructive", title: t("تعذر تسجيل المشاركة"), description: tError(err) });
    } finally {
      setBusy(false);
    }
  }

  const scheduled = assembly.status === "SCHEDULED";
  const voted = !!assembly.myVote;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <LBadge map={ASSEMBLY_TYPES} value={assembly.type} />
            <LBadge map={ASSEMBLY_STATUS} value={assembly.status} />
          </div>
          <p className="mt-2 text-xs font-semibold text-muted-foreground">
            {new Date(assembly.date).toLocaleDateString("ar-MA", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {assembly.location ? ` — ${assembly.location}` : ""}
          </p>
          <div className="mt-2 rounded-xl bg-muted/60 p-3">
            <p className="text-[11px] font-bold text-foreground">{t("جدول الأعمال")}</p>
            <p className="mt-1 whitespace-pre-line text-[11px] leading-6 text-muted-foreground">{assembly.agenda}</p>
          </div>
          {assembly.decisions && !scheduled && (
            <div className="mt-2 rounded-xl border border-terra/25 bg-terra/5 p-3">
              <p className="text-[11px] font-bold text-terra">{t("القرارات المتخذة")}</p>
              <p className="mt-1 whitespace-pre-line text-[11px] leading-6 text-muted-foreground">{assembly.decisions}</p>
            </div>
          )}
          {!scheduled && memberCount > 0 && (
            <div className="mt-2">
              <AttendanceBar attendees={assembly.attendeesCount} total={memberCount} />
            </div>
          )}
        </div>

        {/* إجراءات العضو */}
        <div className="flex shrink-0 flex-col gap-2">
          {scheduled ? (
            assembly.myAttendance ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zellij/25 bg-zellij/10 px-3 py-1.5 text-[11px] font-bold text-zellij">
                <BadgeCheck className="size-3.5" /> {t("حضوركم مؤكد")}
              </span>
            ) : (
              <Button
                size="sm"
                className="gap-1.5 text-xs font-bold"
                disabled={busy}
                onClick={() => run({ action: "attend", label: t("تم تأكيد حضوركم") })}
              >
                <CalendarCheck2 className="size-3.5" /> {t("تأكيد الحضور")}
              </Button>
            )
          ) : voted ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-zellij/25 bg-zellij/10 px-3 py-1.5 text-[11px] font-bold text-zellij">
              <Vote className="size-3.5" />
              {t("صوّتم:")}{" "}
              {assembly.myVote === "FOR" ? t("موافقة") : assembly.myVote === "AGAINST" ? t("معارضة") : t("امتناع")}
            </span>
          ) : (
            <div className="space-y-1.5">
              <p className="text-center text-[10px] font-bold text-muted-foreground">{t("التصويت على القرارات")}</p>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  className="h-8 gap-1 px-2.5 text-xs font-bold"
                  disabled={busy}
                  onClick={() => run({ action: "vote", decision: "FOR", label: t("تم تسجيل صوتكم بالموافقة") })}
                >
                  <ThumbsUp className="size-3.5" /> {t("موافقة")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 px-2.5 text-xs text-destructive hover:text-destructive"
                  disabled={busy}
                  onClick={() => run({ action: "vote", decision: "AGAINST", label: t("تم تسجيل صوتكم بالمعارضة") })}
                >
                  <ThumbsDown className="size-3.5" /> {t("معارضة")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 px-2.5 text-xs"
                  disabled={busy}
                  onClick={() => run({ action: "vote", decision: "ABSTAIN", label: t("تم تسجيل امتناعكم") })}
                >
                  {t("امتناع")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type assemblies = import("@/lib/types").Assembly[];

// ─── الوحدة الرئيسية ───────────────────────────────────────────────────────
export function MySpaceView() {
  const user = useUIStore((s) => s.user);
  const setView = useUIStore((s) => s.setView);
  const coopId = user?.cooperativeId ?? 0;
  const { data: coops } = useCooperatives();
  const { data: members } = useMembers(coopId);
  const { data: assemblies } = useAssemblies(coopId);
  const { data: documents } = useDocuments(coopId);

  const coop = (coops ?? []).find((c) => c.id === coopId);
  const isContractor = user?.accountType === "CONTRACTOR";
  const myRecord = (members ?? []).find((m) => m.fullName === user?.fullName);
  const sharedDocs = (documents ?? []).filter((d) => d.isShared);
  const upcoming = (assemblies ?? []).filter((a) => a.status === "SCHEDULED");
  const past = (assemblies ?? []).filter((a) => a.status !== "SCHEDULED");

  if (!coopId || !coop) {
    return (
      <div>
        <PageHeader title={t("فضائي")} desc={t("فضاؤكم الشخصي داخل التعاونية")} />
        <EmptyState
          icon={Landmark}
          title={t("لم تُربطوا بتعاونية بعد")}
          desc={t("تواصلوا مع رئيس تعاونيتكم أو إدارة المنصة لربط حسابكم، أو تفضلوا بتصفح الفرص المتاحة.")}
          action={
            <Button onClick={() => setView("opportunities")} className="gap-2 font-bold">
              <Handshake className="size-4" /> {t("تصفح الفرص")}
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={t("فضائي — {name}", { name: coop.name })}
        desc={
          isContractor
            ? t("اطلاعكم على المحتوى المصرح لكم به من طرف رئيس التعاونية أو أحد أعضائها المسييرين.")
            : t("حقوقكم كمنخرط حسب القانون رقم 112.12 والقانون الأساسي: الاطلاع والمشاركة في الجموع العامة والتصويت.")
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* بطاقة التعاونية */}
        <Card className="relative overflow-hidden border-border/80 lg:col-span-1">
          <div className="pattern-zellige absolute inset-0 opacity-70" aria-hidden="true" />
          <CardContent className="relative space-y-3 p-5">
            <span className="arch-top grid h-16 w-12 place-items-center bg-gradient-to-b from-terra to-terra-soft text-cream">
              <Landmark className="size-5" />
            </span>
            <div>
              <h3 className="font-display text-sm font-extrabold leading-6 text-foreground">{coop.name}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" />
                {coop.province}{t("، ")}{coop.region}
              </p>
            </div>
            <div className="space-y-1.5 text-xs text-muted-foreground">
              <p>
                <span className="font-bold text-foreground">{t("القطاع:")}</span> {coop.sector}
              </p>
              <p>
                <span className="font-bold text-foreground">{t("الرئيس(ة):")}</span> {coop.presidentName}
              </p>
              <p>
                <span className="font-bold text-foreground">{t("رقم التسجيل:")}</span> {coop.registrationNumber}
              </p>
              {coop.odcCardNumber && (
                <p>
                  <span className="font-bold text-foreground">{t("بطاقة ODCO:")}</span> {coop.odcCardNumber}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* بطاقة عضويتي / تعاقدي */}
        <Card className="relative overflow-hidden border-border/80 lg:col-span-1">
          <div className="pattern-zellige absolute inset-0 opacity-70" aria-hidden="true" />
          <CardContent className="relative space-y-3 p-5">
            <span className="arch-top grid h-16 w-12 place-items-center bg-gradient-to-b from-zellij to-[#7fd4ce] text-ink">
              {isContractor ? <Handshake className="size-5" /> : <Scale className="size-5" />}
            </span>
            <div>
              <h3 className="font-display text-sm font-extrabold text-foreground">
                {isContractor ? t("علاقة التعاقد") : t("عضويتي")}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{user?.fullName}</p>
            </div>
            {isContractor ? (
              <p className="rounded-xl bg-muted/60 p-3 text-[11px] leading-6 text-muted-foreground">
                {t("حسابكم مرتبط بعلاقة تعاقد مع التعاونية. تطلعون حصراً على الوثائق والمعلومات التي يصرح لكم بها رئيس التعاونية أو أحد أعضائها المسييرين.")}
              </p>
            ) : (
              <div className="space-y-1.5 text-xs text-muted-foreground">
                {myRecord ? (
                  <>
                    <p>
                      <span className="font-bold text-foreground">{t("الحصص:")}</span> {formatNumber(myRecord.shares)}
                    </p>
                    <p>
                      <span className="font-bold text-foreground">{t("تاريخ الانخراط:")}</span>{" "}
                      {new Date(myRecord.joinDate).toLocaleDateString("ar-MA")}
                    </p>
                    {myRecord.boardRole && (
                      <p>
                        <span className="font-bold text-foreground">{t("صفة داخل المجلس:")}</span>{" "}
                        {t(BOARD_ROLES[myRecord.boardRole]) ?? myRecord.boardRole}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="rounded-xl bg-saffron/10 p-3 text-[11px] leading-6 text-saffron-ink">
                    {t("سجل عضويتكم قيد التحديث من طرف المسيّرين.")}
                  </p>
                )}
                <p className="flex items-start gap-1.5 rounded-xl bg-zellij/10 p-2.5 text-[11px] leading-6 text-zellij">
                  <Vote className="mt-1 size-3.5 shrink-0" />
                  {t("عضو واحد = صوت واحد — الرقابة الديمقراطية وفق مبادئ التعاون")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* بطاقة مؤشرات سريعة */}
        <Card className="relative overflow-hidden border-border/80 lg:col-span-1">
          <div className="pattern-zellige absolute inset-0 opacity-70" aria-hidden="true" />
          <CardContent className="relative grid grid-cols-2 gap-3 p-5">
            <div className="rounded-xl bg-terra/10 p-3 text-center">
              <p className="font-display text-2xl font-black text-terra">{upcoming.length}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{t("جمع مبرمج")}</p>
            </div>
            <div className="rounded-xl bg-zellij/10 p-3 text-center">
              <p className="font-display text-2xl font-black text-zellij">{(assemblies ?? []).length}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{t("جمع مسجل")}</p>
            </div>
            <div className="rounded-xl bg-saffron/15 p-3 text-center">
              <p className="font-display text-2xl font-black text-saffron-ink">{sharedDocs.length}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{t("وثيقة مصرحة")}</p>
            </div>
            <div className="rounded-xl bg-chart-5/10 p-3 text-center">
              <p className="font-display text-2xl font-black text-chart-5">{(members ?? []).length}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-muted-foreground">{t("عضواً")}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* الجموع العامة (للأعضاء) */}
      {!isContractor && (
        <section className="mt-8">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
            <Gavel className="size-4 text-terra" />
            {t("الجموع العامة — مشاركتي وتصويتي")}
          </h3>
          <div className="space-y-3">
            {upcoming.length === 0 && past.length === 0 ? (
              <EmptyState icon={CalendarClock} title={t("لا توجد جموع عامة مسجلة")} />
            ) : (
              <>
                {upcoming.map((a) => (
                  <MemberAssemblyCard key={a.id} assembly={a} memberCount={(members ?? []).length} />
                ))}
                {past.map((a) => (
                  <MemberAssemblyCard key={a.id} assembly={a} memberCount={(members ?? []).length} />
                ))}
              </>
            )}
          </div>
        </section>
      )}

      {/* الوثائق المصرح بها */}
      <section className="mt-8">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Eye className="size-4 text-terra" />
          {isContractor ? t("الوثائق المصرح لكم بها") : t("الوثائق المشتركة مع الأعضاء")}
        </h3>
        {sharedDocs.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title={t("لا توجد وثائق مصرح بها حالياً")}
            desc={isContractor ? t("يحدد رئيس التعاونية أو المسيرون الوثائق المتاحة لكم.") : t("الوثائق التي تشاركها الإدارة مع الأعضاء ستظهر هنا.")}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sharedDocs.map((d) => (
              <div key={d.id} className={cn("rounded-2xl border border-border bg-card p-4")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold leading-6 text-foreground">{d.title}</p>
                  <LBadge map={DOC_TYPES} value={d.type} />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {t("صادرة في")} {formatShortDate(d.issueDate)}
                  {d.reference ? ` • ${d.reference}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
