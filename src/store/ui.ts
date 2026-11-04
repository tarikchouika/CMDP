// ═══════════════════════════════════════════════════════════════════════════
// CMDP — مخزن الحالة العامة (التنقل، التعاونية النشطة، المصادقة، وضع العرض)
// ═══════════════════════════════════════════════════════════════════════════

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type View =
  | "landing"
  | "login"
  | "dashboard"
  | "cooperatives"
  | "members"
  | "assembly"
  | "finance"
  | "documents"
  | "entities"
  | "regulations"
  | "settings";

export const VIEWS: View[] = [
  "landing",
  "login",
  "dashboard",
  "cooperatives",
  "members",
  "assembly",
  "finance",
  "documents",
  "entities",
  "regulations",
  "settings",
];

export interface SessionUser {
  username: string;
  fullName: string;
  role: string;
}

interface UIState {
  view: View;
  params: Record<string, string | number>;
  activeCoopId: number;
  demoMode: boolean;
  authed: boolean;
  user: SessionUser | null;
  setView: (v: View, params?: Record<string, string | number>) => void;
  setParams: (p: Record<string, string | number>) => void;
  setActiveCoop: (id: number) => void;
  setDemoMode: (b: boolean) => void;
  setAuthed: (user: SessionUser | null) => void;
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
      setView: (view, params = {}) => set({ view, params }),
      setParams: (params) => set({ params }),
      setActiveCoop: (activeCoopId) => set({ activeCoopId }),
      setDemoMode: (demoMode) => set({ demoMode }),
      setAuthed: (user) =>
        set({ user, authed: !!user, view: user ? "dashboard" : "login" }),
    }),
    {
      name: "cmdp-ui",
      partialize: (s) => ({
        view: s.view,
        activeCoopId: s.activeCoopId,
        authed: s.authed,
        user: s.user,
      }),
    }
  )
);
