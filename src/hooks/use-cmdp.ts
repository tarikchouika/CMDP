// ═══════════════════════════════════════════════════════════════════════════
// CMDP — خطافات البيانات (TanStack Query مع سقوط آمن إلى الوضع التجريبي)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiUnavailableError, rawFetch } from "@/lib/api";
import { dataset } from "@/lib/dataset";
import { localizeDemo } from "@/lib/demo-localized";
import { getLang } from "@/lib/i18n";
import { buildDashboardData } from "@/lib/analytics";
import { useUIStore } from "@/store/ui";
import type {
  AppUser,
  Assembly,
  ComplianceTask,
  Cooperative,
  DashboardData,
  DocumentItem,
  EntityInteraction,
  GovEntity,
  JoinRequest,
  Member,
  Meeting,
  Opportunity,
  OpportunityApplication,
  Regulation,
  Transaction,
} from "@/lib/types";

// ─── استعلام عام مع سقوط إلى بيانات العرض ─────────────────────────────────
export function useCmdpQuery<T>(key: unknown[], path: string, demo: () => T) {
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  return useQuery({
    // اللغة ضمن مفتاح الاستعلام: تغيير اللغة يعيد توليد بيانات العرض مترجَمة
    queryKey: [...key, getLang()],
    queryFn: async () => {
      try {
        return await rawFetch<T>(path);
      } catch (e) {
        if (e instanceof ApiUnavailableError) {
          setDemoMode(true);
          return demo();
        }
        throw e;
      }
    },
    retry: false,
  });
}

// ─── أنواع المدخلات ────────────────────────────────────────────────────────
// اللوغو والوثائق القانونية تُرسَل كائنات مرفقات خام (يعقّمها الخادم ويخزّنها JSON)
type CoopInput = Omit<Cooperative, "id" | "createdAt" | "logo" | "legalDocuments"> & {
  id?: number | null;
  logo?: import("@/lib/attachments").Attachment | null;
  legalDocuments?: import("@/lib/attachments").Attachment[];
};
type MemberInput = Omit<Member, "id" | "createdAt"> & { id?: number | null };
type AssemblyInput = Omit<Assembly, "id" | "createdAt"> & { id?: number | null };
type MeetingInput = Omit<Meeting, "id" | "createdAt"> & { id?: number | null };
type TxInput = Omit<Transaction, "id" | "createdAt"> & {
  id?: number | null;
  // مرفقات إثبات الحركة (فاتورة/وصل أداء) — base64
  proofFiles?: { name: string; type: string; size: number; dataUrl: string }[];
};
type DocInput = Omit<DocumentItem, "id" | "createdAt"> & { id?: number | null };
type TaskInput = Omit<ComplianceTask, "id" | "createdAt"> & { id?: number | null };
type InteractionInput = Omit<EntityInteraction, "id" | "createdAt" | "entity"> & {
  id?: number | null;
};

// ─── طفرات عامة ────────────────────────────────────────────────────────────
const DEMO_MSG =
  "وضع العرض التجريبي: التغييرات غير محفوظة. شغّل الباك إند المحلي أو اضبط عنوانه من الإعدادات.";

export function useCmdpSave<T extends { id?: number | null }>(
  pathFn: (p: T) => string,
  invalidate: unknown[][]
) {
  const qc = useQueryClient();
  const demoMode = useUIStore((s) => s.demoMode);
  return useMutation({
    mutationFn: async (payload: T) => {
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>(pathFn(payload), {
        method: payload.id != null ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      for (const k of invalidate) qc.invalidateQueries({ queryKey: k });
    },
  });
}

export function useCmdpDelete(pathFn: (id: number) => string, invalidate: unknown[][]) {
  const qc = useQueryClient();
  const demoMode = useUIStore((s) => s.demoMode);
  return useMutation({
    mutationFn: async (id: number) => {
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>(pathFn(id), { method: "DELETE" });
    },
    onSuccess: () => {
      for (const k of invalidate) qc.invalidateQueries({ queryKey: k });
    },
  });
}

// ─── الاستعلامات ───────────────────────────────────────────────────────────
export const useCooperatives = () =>
  useCmdpQuery<Cooperative[]>(["cooperatives"], "/api/cooperatives", () => localizeDemo(dataset.cooperatives));

export const useMembers = (coopId: number) =>
  useCmdpQuery<Member[]>(
    ["members", String(coopId)],
    `/api/members?cooperativeId=${coopId}`,
    () => localizeDemo(dataset.members.filter((m) => m.cooperativeId === coopId))
  );

export const useAssemblies = (coopId: number) =>
  useCmdpQuery<Assembly[]>(
    ["assemblies", String(coopId)],
    `/api/assemblies?cooperativeId=${coopId}`,
    () => localizeDemo(dataset.assemblies.filter((a) => a.cooperativeId === coopId))
  );

export const useMeetings = (coopId: number) =>
  useCmdpQuery<Meeting[]>(
    ["meetings", String(coopId)],
    `/api/meetings?cooperativeId=${coopId}`,
    () => localizeDemo(dataset.meetings.filter((m) => m.cooperativeId === coopId))
  );

export const useTransactions = (coopId: number) =>
  useCmdpQuery<Transaction[]>(
    ["transactions", String(coopId)],
    `/api/transactions?cooperativeId=${coopId}`,
    () => localizeDemo(dataset.transactions.filter((t) => t.cooperativeId === coopId))
  );

export const useDocuments = (coopId: number) =>
  useCmdpQuery<DocumentItem[]>(
    ["documents", String(coopId)],
    `/api/documents?cooperativeId=${coopId}`,
    () => localizeDemo(dataset.documents.filter((d) => d.cooperativeId === coopId))
  );

export const useEntities = () =>
  useCmdpQuery<GovEntity[]>(["entities"], "/api/entities", () => localizeDemo(dataset.entities));

export const useInteractions = () =>
  useCmdpQuery<EntityInteraction[]>(
    ["interactions"],
    "/api/interactions",
    () =>
      localizeDemo(
        dataset.interactions.map((i) => ({
          ...i,
          entity: dataset.entities.find((e) => e.id === i.entityId) ?? null,
        }))
      )
  );

export const useRegulations = () =>
  useCmdpQuery<Regulation[]>(["regulations"], "/api/regulations", () => localizeDemo(dataset.regulations));

export const useTasks = (coopId: number) =>
  useCmdpQuery<ComplianceTask[]>(
    ["tasks", String(coopId)],
    `/api/tasks?cooperativeId=${coopId}`,
    () => localizeDemo(dataset.tasks.filter((t) => t.cooperativeId === coopId))
  );

export const useDashboard = (coopId: number) =>
  useCmdpQuery<DashboardData>(
    ["stats", String(coopId)],
    `/api/stats?cooperativeId=${coopId}`,
    () =>
      localizeDemo(
        buildDashboardData({
          coops: dataset.cooperatives,
          members: dataset.members,
          transactions: dataset.transactions,
          tasks: dataset.tasks,
          documents: dataset.documents,
          assemblies: dataset.assemblies,
          activeCoopId: coopId,
        })
      )
  );

// ─── الطفرات لكل مورد ─────────────────────────────────────────────────────
export const useSaveCooperative = () =>
  useCmdpSave<CoopInput>(
    (p) => (p.id != null ? `/api/cooperatives/${p.id}` : "/api/cooperatives"),
    [["cooperatives"], ["stats"], ["members"]]
  );
export const useDeleteCooperative = () =>
  useCmdpDelete((id) => `/api/cooperatives/${id}`, [["cooperatives"], ["stats"]]);

export const useAllMembers = () =>
  useCmdpQuery<Member[]>(["members"], "/api/members", () => localizeDemo(dataset.members));

export const useSaveMember = (coopId: number) =>
  useCmdpSave<MemberInput>(
    (p) => (p.id != null ? `/api/members/${p.id}` : "/api/members"),
    [["members"], ["stats"]]
  );
export const useDeleteMember = (coopId: number) =>
  useCmdpDelete((id) => `/api/members/${id}`, [["members"], ["stats"]]);

export const useSaveAssembly = (coopId: number) =>
  useCmdpSave<AssemblyInput>(
    (p) => (p.id != null ? `/api/assemblies/${p.id}` : "/api/assemblies"),
    [["assemblies", String(coopId)], ["stats"]]
  );
export const useDeleteAssembly = (coopId: number) =>
  useCmdpDelete((id) => `/api/assemblies/${id}`, [["assemblies", String(coopId)], ["stats"]]);

export const useSaveMeeting = (coopId: number) =>
  useCmdpSave<MeetingInput>(
    (p) => (p.id != null ? `/api/meetings/${p.id}` : "/api/meetings"),
    [["meetings", String(coopId)]]
  );
export const useDeleteMeeting = (coopId: number) =>
  useCmdpDelete((id) => `/api/meetings/${id}`, [["meetings", String(coopId)]]);

export const useSaveTransaction = (coopId: number) =>
  useCmdpSave<TxInput>(
    (p) => (p.id != null ? `/api/transactions/${p.id}` : "/api/transactions"),
    [["transactions", String(coopId)], ["stats"]]
  );
export const useDeleteTransaction = (coopId: number) =>
  useCmdpDelete((id) => `/api/transactions/${id}`, [["transactions", String(coopId)], ["stats"]]);

export const useSaveDocument = (coopId: number) =>
  useCmdpSave<DocInput>(
    (p) => (p.id != null ? `/api/documents/${p.id}` : "/api/documents"),
    [["documents", String(coopId)], ["stats"]]
  );
export const useDeleteDocument = (coopId: number) =>
  useCmdpDelete((id) => `/api/documents/${id}`, [["documents", String(coopId)], ["stats"]]);

export const useSaveTask = (coopId: number) =>
  useCmdpSave<TaskInput>(
    (p) => (p.id != null ? `/api/tasks/${p.id}` : "/api/tasks"),
    [["tasks", String(coopId)], ["stats"]]
  );
export const useDeleteTask = (coopId: number) =>
  useCmdpDelete((id) => `/api/tasks/${id}`, [["tasks", String(coopId)], ["stats"]]);

export const useSaveInteraction = () =>
  useCmdpSave<InteractionInput>(
    (p) => (p.id != null ? `/api/interactions/${p.id}` : "/api/interactions"),
    [["interactions"]]
  );
export const useDeleteInteraction = () =>
  useCmdpDelete((id) => `/api/interactions/${id}`, [["interactions"]]);

/** إعادة ضبط البيانات التجريبية */
export function useResetSeed() {
  const qc = useQueryClient();
  const demoMode = useUIStore((s) => s.demoMode);
  return useMutation({
    mutationFn: async () => {
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>("/api/seed", { method: "POST" });
    },
    onSuccess: () => qc.invalidateQueries(),
  });
}

// ═══════════════════ وحدات الإصدار 1.1.0 ═══════════════════════════════════

// ─── المستخدمون (ضمن النطاق) ──────────────────────────────────────────────
export const useUsers = () => {
  const user = useUIStore((s) => s.user);
  return useCmdpQuery<AppUser[]>(["users"], "/api/users", () =>
    localizeDemo(
      dataset.users
        .filter(
          (u) =>
            (user?.role === "SUPER_ADMIN"
              ? true
              : user?.role === "ADMIN"
                ? u.role !== "SUPER_ADMIN"
                : u.cooperativeId === user?.cooperativeId) && u.username !== user?.username
        )
        .map((u) => ({
          ...u,
          cooperativeName: dataset.cooperatives.find((c) => c.id === u.cooperativeId)?.name ?? null,
        }))
    )
  );
};

export type UserInput = {
  id?: number | null;
  username?: string;
  password?: string;
  fullName: string;
  phone?: string | null;
  email?: string | null;
  cin?: string | null;
  role: string;
  accountType: string | null;
  cooperativeId: number | null;
  status?: string;
  // سبب التوقيف الموثق (الإصدار 1.3.2) — إلزامي عند الإيقاف
  suspensionReason?: string;
  // مرفقات الهوية — تُرسل عند الإنشاء أو عند التغيير في التحرير فقط
  photo?: import("@/lib/attachments").Attachment | null;
  idDocuments?: import("@/lib/attachments").Attachment[];
};

export const useSaveUser = () =>
  useCmdpSave<UserInput>(
    (p) => (p.id != null ? `/api/users/${p.id}` : "/api/users"),
    [["users"]]
  );

export const useDeleteUser = () =>
  useCmdpDelete((id) => `/api/users/${id}`, [["users"]]);

// ─── طلبات الانخراط ────────────────────────────────────────────────────────
export const useJoinRequests = () => {
  const user = useUIStore((s) => s.user);
  return useCmdpQuery<JoinRequest[]>(["join-requests"], "/api/join-requests", () =>
    localizeDemo(dataset.joinRequests
      .filter((r) => user?.role === "COADMIN" ? r.cooperativeId === user.cooperativeId : true)
      .map((r) => ({
        ...r,
        cooperative:
          r.cooperative ??
          (dataset.cooperatives.find((c) => c.id === r.cooperativeId)
            ? {
                id: r.cooperativeId,
                name: dataset.cooperatives.find((c) => c.id === r.cooperativeId)!.name,
                sector: dataset.cooperatives.find((c) => c.id === r.cooperativeId)!.sector,
                region: dataset.cooperatives.find((c) => c.id === r.cooperativeId)!.region,
              }
            : undefined),
      })))
  );
};

export const useDecideJoinRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number; action: "APPROVED" | "REJECTED"; note?: string }) => {
      const demoMode = useUIStore.getState().demoMode;
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>(`/api/join-requests/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify({ action: payload.action, note: payload.note }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["join-requests"] });
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
};

// ─── الفرص (سوق عمومي + إدارة) ────────────────────────────────────────────
export const useOpportunities = (filters?: { type?: string; sector?: string; region?: string; q?: string }) => {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.sector) params.set("sector", filters.sector);
  if (filters?.region) params.set("region", filters.region);
  if (filters?.q) params.set("q", filters.q);
  const qs = params.toString();
  return useCmdpQuery<Opportunity[]>(
    ["opportunities", qs],
    `/api/opportunities${qs ? `?${qs}` : ""}`,
    () =>
      localizeDemo(
        dataset.opportunities
          .filter((o) => o.status === "OPEN")
          .filter((o) => (filters?.type ? o.type === filters.type : true))
          .filter((o) => (filters?.sector ? o.sector === filters.sector : true))
          .filter((o) => (filters?.region ? o.region === filters.region : true))
          .filter((o) =>
            filters?.q
              ? o.title.includes(filters.q) || o.description.includes(filters.q)
              : true
          )
      )
  );
};

/** فرص تعاونيتي (إدارة) */
export const useMyOpportunities = () => {
  const user = useUIStore((s) => s.user);
  return useCmdpQuery<Opportunity[]>(["opportunities", "mine"], "/api/opportunities?mine=1", () =>
    localizeDemo(dataset.opportunities.filter((o) =>
      user?.role === "COADMIN" ? o.cooperativeId === user.cooperativeId : true
    ))
  );
};

export type OpportunityInput = Omit<Opportunity, "id" | "createdAt" | "cooperative" | "applicationsCount"> & {
  id?: number | null;
};

export const useSaveOpportunity = () =>
  useCmdpSave<OpportunityInput>(
    (p) => (p.id != null ? `/api/opportunities/${p.id}` : "/api/opportunities"),
    [["opportunities"], ["opportunities", "mine"]]
  );

export const useDeleteOpportunity = () =>
  useCmdpDelete((id) => `/api/opportunities/${id}`, [["opportunities"], ["opportunities", "mine"]]);

/** الترشح لفرصة (عمومي) */
export function useApplyToOpportunity() {
  return useMutation({
    mutationFn: async (payload: {
      id: number;
      fullName: string;
      email?: string;
      phone?: string;
      motivation?: string;
      experience?: string;
    }) => {
      const demoMode = useUIStore.getState().demoMode;
      if (demoMode) throw new Error(DEMO_MSG);
      const { id, ...body } = payload;
      return rawFetch<unknown>(`/api/opportunities/${id}/apply`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    },
  });
}

/** ترشيحات تعاونيتي (دراسة) */
export const useApplications = () => {
  const user = useUIStore((s) => s.user);
  return useCmdpQuery<OpportunityApplication[]>(["applications"], "/api/applications", () =>
    localizeDemo(dataset.applications.filter((a) => {
      if (user?.role !== "COADMIN") return true;
      const opp = dataset.opportunities.find((o) => o.id === a.opportunityId);
      return opp?.cooperativeId === user.cooperativeId;
    }))
  );
};

export const useDecideApplication = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number; status: string }) => {
      const demoMode = useUIStore.getState().demoMode;
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>(`/api/applications/${payload.id}`, {
        method: "PUT",
        body: JSON.stringify({ status: payload.status }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["applications"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
    },
  });
};

// ─── التصويت والحضور في الجموع العامة ──────────────────────────────────────
export function useAssemblyAction() {
  const qc = useQueryClient();
  const user = useUIStore((s) => s.user);
  return useMutation({
    mutationFn: async (payload: { assemblyId: number; action: "vote" | "attend"; decision?: string }) => {
      const demoMode = useUIStore.getState().demoMode;
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>(`/api/assemblies/${payload.assemblyId}/${payload.action}`, {
        method: "POST",
        body: JSON.stringify({ decision: payload.decision }),
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assemblies", String(user?.cooperativeId)] }),
  });
}

// ═══════════════════ وحدة إدارة المتجر (الإصدار 1.3.0) ═════════════════════

/** منتجات العرض التجريبي لوحدة الإدارة (النسخة الساكنة) — تعاونية تافوكت */
const DEMO_STORE_PRODUCTS: import("@/lib/types").Product[] = [
  { id: -1, cooperativeId: 1, name: "زيت أركان غذائي معصور على البارد", description: "زيت أركان صافي 100% من تعاونية نسائية بسوس", category: "منتجات غذائية", unit: "250 مل", price: 180, imageUrl: "/store/argan-oil.png", inStock: true, featured: true, status: "ACTIVE", createdAt: "2026-09-02", _count: { orders: 14 } },
  { id: -2, cooperativeId: 1, name: "عسل جبلي مغربي متعدد الأزهار", description: "عسل خام غير مصفى من مرتفعات الأطلس", category: "منتجات غذائية", unit: "500 غ", price: 95, imageUrl: "/store/mountain-honey.png", inStock: true, featured: false, status: "ACTIVE", createdAt: "2026-09-10", _count: { orders: 9 } },
  { id: -3, cooperativeId: 1, name: "زعفران تالوين الأصيل", description: "زعفران مغربي من درجة أولى", category: "منتجات غذائية", unit: "1 غ", price: 35, imageUrl: "/store/taldaout-saffron.png", inStock: false, featured: true, status: "ACTIVE", createdAt: "2026-09-15", _count: { orders: 5 } },
  { id: -4, cooperativeId: 1, name: "أملو تقليدي باللوز والعسل", description: "خليط الأركان التقليدي — غير معروض مؤقتاً", category: "منتجات غذائية", unit: "مرطبان 250 غ", price: 85, imageUrl: null, inStock: true, featured: false, status: "HIDDEN", createdAt: "2026-10-01", _count: { orders: 2 } },
];

/** طلبات العرض التجريبي لوحدة الإدارة */
const DEMO_STORE_ORDERS: import("@/lib/types").Order[] = [
  { id: -1, productId: -1, quantity: 2, customerName: "يوسف العلوي", phone: "0661234567", city: "الدار البيضاء", note: "التوصيل بعد الخامسة مساءً", status: "NEW", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), product: { id: -1, name: "زيت أركان غذائي معصور على البارد", cooperativeId: 1, price: 180, unit: "250 مل" } },
  { id: -2, productId: -2, quantity: 3, customerName: "فاطمة الزهراء بناني", phone: "0677889900", city: "الرباط", note: null, status: "CONTACTED", createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), product: { id: -2, name: "عسل جبلي مغربي متعدد الأزهار", cooperativeId: 1, price: 95, unit: "500 غ" } },
  { id: -3, productId: -1, quantity: 1, customerName: "محمد الإدريسي", phone: "0655443322", city: "مراكش", note: null, status: "DONE", createdAt: new Date(Date.now() - 12 * 86400000).toISOString(), product: { id: -1, name: "زيت أركان غذائي معصور على البارد", cooperativeId: 1, price: 180, unit: "250 مل" } },
  { id: -4, productId: -3, quantity: 4, customerName: "خديجة أمزيل", phone: "0699112233", city: "أكادير", note: "هدية — تغليف خاص", status: "DONE", createdAt: new Date(Date.now() - 18 * 86400000).toISOString(), product: { id: -3, name: "زعفران تالوين الأصيل", cooperativeId: 1, price: 35, unit: "1 غ" } },
  { id: -5, productId: -2, quantity: 2, customerName: "عبد الرحيم تازي", phone: "0644556677", city: "فاس", note: null, status: "CANCELLED", createdAt: new Date(Date.now() - 25 * 86400000).toISOString(), product: { id: -2, name: "عسل جبلي مغربي متعدد الأزهار", cooperativeId: 1, price: 95, unit: "500 غ" } },
];

/** إحصائيات العرض التجريبي للمتجر */
function demoStoreStats(days: number): import("@/lib/types").StoreStats {
  const orders = DEMO_STORE_ORDERS.filter((o) => Date.now() - new Date(o.createdAt).getTime() <= days * 86400000);
  const byStatus: Record<string, number> = { NEW: 0, CONTACTED: 0, DONE: 0, CANCELLED: 0 };
  let doneRevenue = 0;
  let pipelineValue = 0;
  const prodAgg = new Map<number, { id: number; name: string; quantity: number; orders: number; revenue: number }>();
  for (const o of orders) {
    byStatus[o.status] = (byStatus[o.status] ?? 0) + 1;
    const value = (o.product?.price ?? 0) * o.quantity;
    if (o.status === "DONE") doneRevenue += value;
    else if (o.status === "NEW" || o.status === "CONTACTED") pipelineValue += value;
    if (o.product) {
      const cur = prodAgg.get(o.product.id) ?? { id: o.product.id, name: o.product.name, quantity: 0, orders: 0, revenue: 0 };
      cur.quantity += o.quantity;
      cur.orders++;
      if (o.status === "DONE") cur.revenue += value;
      prodAgg.set(o.product.id, cur);
    }
  }
  const doneCount = byStatus.DONE;
  return {
    scope: { cooperativeId: 1, days },
    totals: {
      totalOrders: orders.length,
      byStatus,
      doneRevenue,
      pipelineValue,
      avgOrderValue: doneCount ? Math.round(doneRevenue / doneCount) : 0,
      completionRate: orders.length ? Math.round((doneCount / orders.length) * 100) : 0,
    },
    weeklySeries: [],
    topProducts: [...prodAgg.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 8),
    catalog: { total: 4, active: 3, hidden: 1, outOfStock: 1, featured: 2 },
    generatedAt: new Date().toISOString(),
  };
}

/** منتجات التعاونية للإدارة (نشطة + مخفية) */
export const useStoreProducts = (coopId: number | null) => {
  const user = useUIStore((s) => s.user);
  const mine = user && user.role !== "USER" ? "?mine=1" : "";
  return useCmdpQuery<import("@/lib/types").Product[]>(
    ["store-products", String(coopId)],
    `/api/products${mine}`,
    () => localizeDemo(DEMO_STORE_PRODUCTS.filter((p) => !coopId || p.cooperativeId === coopId))
  );
};

/** طلبات متجر التعاونية */
export const useStoreOrders = () =>
  useCmdpQuery<import("@/lib/types").Order[]>(["store-orders"], "/api/orders", () =>
    localizeDemo(DEMO_STORE_ORDERS)
  );

/** إحصائيات المتجر (فترة قابلة للضبط) */
export const useStoreStats = (days: number) =>
  useCmdpQuery<import("@/lib/types").StoreStats>(
    ["store-stats", String(days)],
    `/api/store/stats?days=${days}`,
    () => localizeDemo(demoStoreStats(days))
  );

export type ProductInput = Omit<import("@/lib/types").Product, "id" | "createdAt" | "cooperative" | "_count"> & {
  id?: number | null;
};

/** حفظ منتج (إنشاء/تعديل) */
export const useSaveProduct = () =>
  useCmdpSave<ProductInput>(
    (p) => (p.id != null ? `/api/products/${p.id}` : "/api/products"),
    [["store-products"], ["store-stats"], ["store-products-all"]]
  );

/** حذف منتج */
export const useDeleteProduct = () =>
  useCmdpDelete((id) => `/api/products/${id}`, [["store-products"], ["store-stats"]]);

/** تحديث حالة طلب */
export const useUpdateOrderStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: number; status: string }) => {
      const demoMode = useUIStore.getState().demoMode;
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>(`/api/orders/${payload.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: payload.status }),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-orders"] });
      qc.invalidateQueries({ queryKey: ["store-stats"] });
    },
  });
};

/** حذف طلب */
export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const demoMode = useUIStore.getState().demoMode;
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>(`/api/orders/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-orders"] });
      qc.invalidateQueries({ queryKey: ["store-stats"] });
    },
  });
};

/** تسجيل طلب يدوي (هاتف/حضوري) على منتجات التعاونية */
export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      productId: number;
      quantity: number;
      customerName: string;
      phone: string;
      city?: string | null;
      note?: string | null;
    }) => {
      const demoMode = useUIStore.getState().demoMode;
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>("/api/orders", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-orders"] });
      qc.invalidateQueries({ queryKey: ["store-stats"] });
    },
  });
};

// ═══════════════════════════════════════════════════════════════════════════
// وحدات المالك والسوبر أدمين (الإصدار 1.3.2) — سجل الأحداث والإشعارات
// ═══════════════════════════════════════════════════════════════════════════

export type SuperAdminView = {
  id: number;
  username: string;
  fullName: string;
  phone: string | null;
  email: string | null;
  role: string;
  status: string;
  isOwner: boolean;
  suspensionNotice: string | null;
  suspensionReason: string | null;
  suspendedAt: string | null;
  createdAt: string;
};

/** إجراء مالك ضد سوبر أدمين — مع توحيد النطاق وإعادة التحقق */
export function useOwnerAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      step,
      targetId,
      body,
    }: {
      step: "create" | "promote" | "suspend-notice" | "suspend" | "reinstate" | "remove";
      targetId?: number;
      body?: Record<string, unknown>;
    }) => {
      const demoMode = useUIStore.getState().demoMode;
      if (demoMode) throw new Error(DEMO_MSG);
      let path = "/api/super-admins";
      let method = "POST";
      if (step === "create") {
        // path/method كما هي
      } else if (step === "promote") {
        // كما هي (POST /api/super-admins بوضع promote)
      } else if (step === "remove") {
        path = `/api/super-admins/${targetId}`;
        method = "DELETE";
      } else {
        path = `/api/super-admins/${targetId}/${step}`;
      }
      return rawFetch<unknown>(path, { method, body: body ? JSON.stringify(body) : undefined });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["super-admins"] });
    },
  });
}

/** نقل ملكية المنصة (المالك حصراً) */
export function useTransferOwnership() {
  return useMutation({
    mutationFn: async (payload: { targetUserId: number; confirmUsername: string; reason: string }) => {
      const demoMode = useUIStore.getState().demoMode;
      if (demoMode) throw new Error(DEMO_MSG);
      return rawFetch<unknown>("/api/ownership/transfer", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  });
}

/** قائمة السوبر أدمين (المالك حصراً) */
export const useSuperAdmins = () => {
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  return useQuery({
    queryKey: ["super-admins"],
    queryFn: async () => {
      try {
        const d = await rawFetch<{ items: SuperAdminView[] }>("/api/super-admins");
        return d.items;
      } catch (e) {
        if (e instanceof ApiUnavailableError) {
          setDemoMode(true);
          return [] as SuperAdminView[];
        }
        throw e;
      }
    },
    retry: false,
    staleTime: 15_000,
  });
};

/** إشعارات المعني الحالي */
export const useNotifications = () => {
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      try {
        return await rawFetch<{ items: import("@/lib/types").UserNotification[]; unread: number }>(
          "/api/notifications"
        );
      } catch (e) {
        if (e instanceof ApiUnavailableError) {
          setDemoMode(true);
          return { items: [], unread: 0 };
        }
        throw e;
      }
    },
    retry: false,
    staleTime: 20_000,
  });
};

/** وضع علامة مقروء على الإشعارات */
export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { all?: boolean; id?: number }) =>
      rawFetch<unknown>("/api/notifications", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** الرد على إشعار التوقيف (حق الدفاع — المعني حصراً) */
export function useRespondToNotice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { userId: number; response: string }) =>
      rawFetch<unknown>(`/api/super-admins/${payload.userId}/respond`, {
        method: "POST",
        body: JSON.stringify({ response: payload.response }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

/** سجل الأحداث التدقيقي (الملك والسوبر أدمين) — مع فلاتر وترقيم */
export const useAuditLogs = (filters: {
  action?: string;
  severity?: string;
  actor?: string;
  q?: string;
  limit?: number;
  offset?: number;
}) => {
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  const qs = new URLSearchParams();
  if (filters.action) qs.set("action", filters.action);
  if (filters.severity) qs.set("severity", filters.severity);
  if (filters.actor) qs.set("actor", filters.actor);
  if (filters.q) qs.set("q", filters.q);
  qs.set("limit", String(filters.limit ?? 50));
  qs.set("offset", String(filters.offset ?? 0));
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      try {
        return await rawFetch<import("@/lib/types").AuditLogPage>(
          `/api/audit-logs?${qs.toString()}`
        );
      } catch (e) {
        if (e instanceof ApiUnavailableError) {
          setDemoMode(true);
          return { items: [], total: 0, offset: 0, limit: 50 };
        }
        throw e;
      }
    },
    retry: false,
  });
};

/** إحصائيات سجل الأحداث */
export const useAuditStats = () => {
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  return useQuery({
    queryKey: ["audit-stats"],
    queryFn: async () => {
      try {
        return await rawFetch<import("@/lib/types").AuditLogStats>("/api/audit-logs/stats");
      } catch (e) {
        if (e instanceof ApiUnavailableError) {
          setDemoMode(true);
          return null;
        }
        throw e;
      }
    },
    retry: false,
    staleTime: 30_000,
  });
};

/**
 * التحقق من الجلسة عند الإقلاع (حصانة الشاشة البيضاء):
 * يعيد بيانات المستخدم الحية عند الصلاحية — لت_sync الملكية/الدور من الخادم.
 */
export async function verifySession(): Promise<
  { user: import("@/lib/types").SessionUser } | "invalid" | "unknown"
> {
  try {
    const { token } = useUIStore.getState();
    if (!token) return "unknown";
    return await rawFetch<{ user: import("@/lib/types").SessionUser }>("/api/auth/me");
  } catch (e) {
    if (e instanceof ApiUnavailableError) return "unknown"; // الباك إند غير متاح: نمسك الجلسة كما هي
    return "invalid"; // 401 ونحوه: جلسة ميتة → خروج نظيف
  }
}
