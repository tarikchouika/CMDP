// ═══════════════════════════════════════════════════════════════════════════
// CMDP — خطافات البيانات (TanStack Query مع سقوط آمن إلى الوضع التجريبي)
// ═══════════════════════════════════════════════════════════════════════════

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiUnavailableError, rawFetch } from "@/lib/api";
import { dataset } from "@/lib/dataset";
import { buildDashboardData } from "@/lib/analytics";
import { useUIStore } from "@/store/ui";
import type {
  Assembly,
  ComplianceTask,
  Cooperative,
  DashboardData,
  DocumentItem,
  EntityInteraction,
  GovEntity,
  Member,
  Meeting,
  Regulation,
  Transaction,
} from "@/lib/types";

// ─── استعلام عام مع سقوط إلى بيانات العرض ─────────────────────────────────
export function useCmdpQuery<T>(key: unknown[], path: string, demo: () => T) {
  const setDemoMode = useUIStore((s) => s.setDemoMode);
  return useQuery({
    queryKey: [...key],
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
type CoopInput = Omit<Cooperative, "id" | "createdAt"> & { id?: number | null };
type MemberInput = Omit<Member, "id" | "createdAt"> & { id?: number | null };
type AssemblyInput = Omit<Assembly, "id" | "createdAt"> & { id?: number | null };
type MeetingInput = Omit<Meeting, "id" | "createdAt"> & { id?: number | null };
type TxInput = Omit<Transaction, "id" | "createdAt"> & { id?: number | null };
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
  useCmdpQuery<Cooperative[]>(["cooperatives"], "/api/cooperatives", () => dataset.cooperatives);

export const useMembers = (coopId: number) =>
  useCmdpQuery<Member[]>(
    ["members", String(coopId)],
    `/api/members?cooperativeId=${coopId}`,
    () => dataset.members.filter((m) => m.cooperativeId === coopId)
  );

export const useAssemblies = (coopId: number) =>
  useCmdpQuery<Assembly[]>(
    ["assemblies", String(coopId)],
    `/api/assemblies?cooperativeId=${coopId}`,
    () => dataset.assemblies.filter((a) => a.cooperativeId === coopId)
  );

export const useMeetings = (coopId: number) =>
  useCmdpQuery<Meeting[]>(
    ["meetings", String(coopId)],
    `/api/meetings?cooperativeId=${coopId}`,
    () => dataset.meetings.filter((m) => m.cooperativeId === coopId)
  );

export const useTransactions = (coopId: number) =>
  useCmdpQuery<Transaction[]>(
    ["transactions", String(coopId)],
    `/api/transactions?cooperativeId=${coopId}`,
    () => dataset.transactions.filter((t) => t.cooperativeId === coopId)
  );

export const useDocuments = (coopId: number) =>
  useCmdpQuery<DocumentItem[]>(
    ["documents", String(coopId)],
    `/api/documents?cooperativeId=${coopId}`,
    () => dataset.documents.filter((d) => d.cooperativeId === coopId)
  );

export const useEntities = () =>
  useCmdpQuery<GovEntity[]>(["entities"], "/api/entities", () => dataset.entities);

export const useInteractions = () =>
  useCmdpQuery<EntityInteraction[]>(
    ["interactions"],
    "/api/interactions",
    () =>
      dataset.interactions.map((i) => ({
        ...i,
        entity: dataset.entities.find((e) => e.id === i.entityId) ?? null,
      }))
  );

export const useRegulations = () =>
  useCmdpQuery<Regulation[]>(["regulations"], "/api/regulations", () => dataset.regulations);

export const useTasks = (coopId: number) =>
  useCmdpQuery<ComplianceTask[]>(
    ["tasks", String(coopId)],
    `/api/tasks?cooperativeId=${coopId}`,
    () => dataset.tasks.filter((t) => t.cooperativeId === coopId)
  );

export const useDashboard = (coopId: number) =>
  useCmdpQuery<DashboardData>(
    ["stats", String(coopId)],
    `/api/stats?cooperativeId=${coopId}`,
    () =>
      buildDashboardData({
        coops: dataset.cooperatives,
        members: dataset.members,
        transactions: dataset.transactions,
        tasks: dataset.tasks,
        documents: dataset.documents,
        assemblies: dataset.assemblies,
        activeCoopId: coopId,
      })
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
  useCmdpQuery<Member[]>(["members"], "/api/members", () => dataset.members);

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
