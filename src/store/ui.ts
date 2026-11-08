// ═══════════════════════════════════════════════════════════════════════════
// CMDP — مخزن الحالة العامة (التنقل، التعاونية النشطة، المصادقة، الرمز، الدور)
// ═══════════════════════════════════════════════════════════════════════════

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { allowedViews, can, userPermissions, type Permission } from "@/lib/permissions";
import type { Role, SessionUser } from "@/lib/types";

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
  /** تحديث بيانات المستخدم الحالي دون المساس بالرمز (تغيير ملكية/دور من الخادم) */
  updateUser: (patch: Partial<SessionUser>) => void;
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
      updateUser: (patch) =>
        set((s) => (s.user ? { user: { ...s.user, ...patch } } : s)),
    }),
    {
      name: "cmdp-ui",
      version: 2,
      // ── إعادة ترطيب آمنة (حصانة ضد الشاشة البيضاء) ─────────────────────
      // الجلسات القديمة/المشوّهة (ترقية قاعدة، حقول ناقصة، رمز ميت) لا تُفكك
      // الواجهة بعد الآن: تُشذَّب لقيمة آمنة أو تُهمَل نهائياً.
      migrate: (persisted: unknown) => {
        const p = (persisted ?? {}) as Partial<UIState>;
        const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "COADMIN", "USER"];
        let user: SessionUser | null = null;
        const u = p.user as Partial<SessionUser> | null | undefined;
        if (
          u &&
          typeof u.id === "number" &&
          typeof u.username === "string" &&
          typeof u.fullName === "string" &&
          ROLES.includes(u.role as Role)
        ) {
          user = {
            id: u.id,
            username: u.username,
            fullName: u.fullName,
            role: u.role as Role,
            accountType: (u.accountType ?? null) as SessionUser["accountType"],
            cooperativeId: typeof u.cooperativeId === "number" ? u.cooperativeId : null,
            cooperativeName: u.cooperativeName ?? null,
            status: u.status === "ACTIVE" ? "ACTIVE" : (u.status as SessionUser["status"]),
            isPlatformOwner: u.isPlatformOwner === true,
          };
        }
        const token = typeof p.token === "string" && p.token ? p.token : null;
        const view = typeof p.view === "string" && VIEWS.includes(p.view as View) && !(p.view === "login" || p.view === "register")
          ? (p.view as View)
          : "landing";
        return {
          view,
          params: {},
          activeCoopId: typeof p.activeCoopId === "number" ? p.activeCoopId : 1,
          demoMode: p.demoMode === true,
          authed: !!(user && token && p.authed === true),
          user: user && token ? user : null,
          token,
        } as UIState;
      },
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
