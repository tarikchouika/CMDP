// ═══════════════════════════════════════════════════════════════════════════
// CMDP — مكتبة القوانين واللوائح
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import * as React from "react";
import { ArrowUpRight, BookOpenCheck, ExternalLink, Scale, ScrollText } from "lucide-react";
import { FOUNDATION_STEPS, REGULATION_CATEGORIES, REGULATION_STATUS } from "@/lib/constants";
import { useRegulations } from "@/hooks/use-cmdp";
import { EmptyState, LBadge, PageHeader } from "@/components/shared";
import { ZelligeStar, DividerZellige } from "@/components/patterns";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";

export function RegulationsView() {
  const { data: regulations, isLoading } = useRegulations();
  const [cat, setCat] = React.useState("ALL");

  const filtered = React.useMemo(() => {
    const rows = regulations ?? [];
    return cat === "ALL" ? rows : rows.filter((r) => r.category === cat);
  }, [regulations, cat]);

  const cats = React.useMemo(() => {
    const m = new Map<string, number>();
    for (const r of regulations ?? []) m.set(r.category, (m.get(r.category) ?? 0) + 1);
    return [...m.entries()];
  }, [regulations]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="القوانين واللوائح"
        desc="مكتبة الإطار القانوني المنظم للتعاونيات بالمملكة المغربية — للتوثيق والتوعية"
      />

      {/* مسار التأسيس */}
      <Card className="border-saffron/40 bg-gradient-to-l from-saffron/10 via-card to-card">
        <CardContent className="p-6">
          <h3 className="flex items-center gap-2 font-display text-sm font-extrabold text-foreground">
            <BookOpenCheck className="size-4 text-terra" />
            دليل التأسيس — من الفكرة إلى بطاقة التسجيل
          </h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FOUNDATION_STEPS.map((s, i) => (
              <div key={s.title} className="flex items-start gap-3 rounded-xl border border-border/70 bg-background p-3.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-terra/10 font-display text-xs font-black text-terra">
                  {i + 1}
                </span>
                <div>
                  <p className="text-xs font-extrabold text-foreground">{s.title}</p>
                  <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* تصفية حسب الفئة */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setCat("ALL")}
          className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${cat === "ALL" ? "border-terra bg-terra text-cream" : "border-border bg-card text-muted-foreground hover:border-terra/40"}`}
        >
          الكل ({(regulations ?? []).length})
        </button>
        {cats.map(([k, count]) => (
          <button
            key={k}
            onClick={() => setCat(k)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-bold transition-colors ${cat === k ? "border-terra bg-terra text-cream" : "border-border bg-card text-muted-foreground hover:border-terra/40"}`}
          >
            {REGULATION_CATEGORIES[k]?.label ?? k} ({count})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-52" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Scale} title="لا توجد نصوص في هذا التصنيف" />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {filtered.map((r) => (
            <Collapsible key={r.id}>
              <Card className={`group border-border/80 transition-all hover:-translate-y-0.5 hover:shadow-md ${r.status === "REPEALED" ? "opacity-75" : ""}`}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <span className={`arch-top grid h-16 w-12 shrink-0 place-items-center ${r.status === "REPEALED" ? "bg-muted text-muted-foreground" : "bg-ink text-terra-soft"}`}>
                        <ScrollText className="size-5" />
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="rounded-lg bg-terra/10 px-2 py-0.5 font-display text-xs font-black tabular-nums text-terra">{r.code}</span>
                          <LBadge map={REGULATION_CATEGORIES} value={r.category} className="px-2 py-0 text-[10px]" />
                          <LBadge map={REGULATION_STATUS} value={r.status} className="px-2 py-0 text-[10px]" />
                        </div>
                        <h3 className="mt-2 max-w-md font-display text-sm font-extrabold leading-6 text-foreground">{r.title}</h3>
                        <p className="mt-1 text-[11px] text-muted-foreground">{r.authority}</p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-black tabular-nums text-secondary-foreground">{r.year}</span>
                  </div>

                  <p className="mt-3 text-xs leading-6 text-muted-foreground">{r.summary}</p>

                  <CollapsibleTrigger asChild>
                    <button className="mt-3 flex items-center gap-1 text-[11px] font-bold text-terra transition-colors hover:text-terra-soft">
                      <ArrowUpRight className="size-3.5" />
                      النقاط الأساسية ({r.keyPoints.length})
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <ul className="mt-2.5 space-y-2 rounded-xl bg-muted/50 p-3.5">
                      {r.keyPoints.map((p, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs leading-6 text-foreground">
                          <ZelligeStar className="mt-1.5 size-2.5 shrink-0 text-saffron" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </CollapsibleContent>

                  {r.url && (
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-zellij hover:underline"
                    >
                      <ExternalLink className="size-3" />
                      النص الرسمي على موقع الجهة
                    </a>
                  )}
                </CardContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      <DividerZellige />

      <p className="text-center text-[11px] leading-6 text-muted-foreground">
        هذا المحتوى توعوي لأغراض العرض والتوثيق — المرجع المعتمد يبقى النص الرسمي كما نُشر بالجريدة الرسمية
        للمملكة المغربية. المصادر: وزارة السياحة والصناعة التقليدية والاقتصاد الاجتماعي والتضامني،
        ومكتب تنمية التعاون (ODCO).
      </p>
    </div>
  );
}
