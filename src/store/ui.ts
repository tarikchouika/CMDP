// ═══════════════════════════════════════════════════════════════════════════
// CMDP — مخزن الحالة العامة (التنقل، التعاونية النشطة، المصادقة، الرمز، الدور)
// ═══════════════════════════════════════════════════════════════════════════

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { allowedViews, can, userPermissions, type Permission } from "@/lib/permissions";
import type { SessionUser } from "@/lib/types";

export type View =
  | "landing"
  | "login"
  | "register"
  | "opportunities"
  | "legal"
  | "dashboard"
  | "cooperatives"
  | "members"
  | "assembly"
  | "finance"
  | "documents"
  | "entities"
  | "regulations"
  | "users"
  | "platform"
  | "myspace"
  | "settings"
  | "install"
  | "store"
  | "storemanage";

export const VIEWS: View[] = [
  "landing",
  "login",
  "register",
  "opportunities",
  "legal",
  "dashboard",
  "cooperatives",
  "members",
  "assembly",
  "finance",
  "documents",
  "entities",
  "regulations",
  "users",
  "platform",
  "myspace",
  "settings",
  "install",
  "store",
  "storemanage",
];

/** الوحدات العمومية المتاحة دائماً */
export const PUBLIC_VIEWS: View[] = ["landing", "login", "register", "opportunities", "legal", "install", "store"];

interface UIState {
  view: View;
  params: Record<string, string | number>;
  activeCoopId: number;
  demoMode: boolean;
  authed: boolean;
  user: SessionUser | null;
  token: string | null;
  setView: (v: View, params?: Record<string, string | number>) => void;
  setParams: (p: Record<string, string | number>) => void;
  setActiveCoop: (id: number) => void;
  setDemoMode: (b: boolean) => void;
  setAuthed: (user: SessionUser | null, token?: string | null) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      view: "landing",
      params: {},
      activeCoopId: 1,
      demoMode: false,
      authed: false,
      user: null,
      token: null,
      setView: (view, params = {}) => set({ view, params }),
      setParams: (params) => set({ params }),
      setActiveCoop: (activeCoopId) => set({ activeCoopId }),
      setDemoMode: (demoMode) => set({ demoMode }),
      setAuthed: (user, token = null) =>
        set((s) => {
          // بعد الدخول: كوأدمن/مستخدم ينتقل لتعاونيته مباشرة
          const activeCoopId =
            user && user.cooperativeId != null ? user.cooperativeId : s.activeCoopId;
          const allowed = allowedViews(user);
          const fallback: View =
            user && (user.role === "USER") ? "myspace" : "dashboard";
          return {
            user,
            token,
            authed: !!user,
            activeCoopId,
            view: user ? (allowed.includes(fallback) ? fallback : "landing") : "login",
          };
        }),
    }),
    {
      name: "cmdp-ui",
      partialize: (s) => ({
        view: s.view,
        activeCoopId: s.activeCoopId,
        authed: s.authed,
        user: s.user,
        token: s.token,
        demoMode: s.demoMode,
      }),
    }
  )
);

/** هل يمكن للمستخدم الحالي فتح وحدة معينة؟ */
export function viewAllowed(user: SessionUser | null, view: View): boolean {
  if (PUBLIC_VIEWS.includes(view)) return true;
  if (!user) return false;
  return allowedViews(user).includes(view);
}

// ─── خطافات الصلاحية (تُستعمل في الوحدات) ──────────────────────────────────
export function usePermission(permission: Permission): boolean {
  const user = useUIStore((s) => s.user);
  return can(user, permission);
}

export function useMyPermissions(): Permission[] {
  const user = useUIStore((s) => s.user);
  return userPermissions(user);
}
