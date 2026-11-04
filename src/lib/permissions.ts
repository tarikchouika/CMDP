// ═══════════════════════════════════════════════════════════════════════════
// CMDP — مصفوفة الصلاحيات المشتركة (تُستعمل في الواجهة وفي الباك إند)
// التدرج: سوبر أدمين (المالك) ← أدمن ← كوأدمن (رئيس/عضو مسير) ← مستخدم عادي
// ═══════════════════════════════════════════════════════════════════════════

import type { AccountType, Role, SessionUser } from "./types";

/** الأفعال القابلة للتفويض داخل المنصة */
export type Permission =
  | "manage:platform" // إدارة المنصة ككل (المالك فقط)
  | "manage:admins" // إنشاء/تعديل حسابات الأدمن
  | "approve:cooperatives" // المصادقة على تسجيل التعاونيات
  | "create:cooperatives" // إنشاء تعاونية مباشرة
  | "list:all-cooperatives" // الاطلاع على سجل كل التعاونيات
  | "manage:cooperative" // تسيير بيانات التعاونية (أعضاء، مالية، وثائق...)
  | "manage:members" // إدارة سجل الأعضاء
  | "manage:finance" // إدارة المالية
  | "manage:documents" // إدارة الوثائق والمشاركة
  | "manage:assemblies" // إدارة الجموع العامة والمجلس
  | "manage:entities" // إدارة التفاعلات مع الجهات الوصية
  | "approve:users" // المصادقة على تسجيل المستخدمين
  | "create:users" // إنشاء مستخدمين (أعضاء/متعاقدين/كوأدمن)
  | "assign:coadmin" // تعيين كوأدمن (رئيس/عضو مسير)
  | "delegate:tasks" // تفويض المهام داخل التعاونية (الرئيس)
  | "post:opportunities" // نشر فرص العمل والتعاقد
  | "review:applications" // دراسة الترشيحات
  | "participate:assemblies" // حضور وتصويت في الجموع العامة (العضو)
  | "view:shared-documents" // الاطلاع على الوثائق المصرح بها
  | "apply:opportunities" // الترشح للفرص
  | "view:regulations"; // مكتبة القوانين — متاحة للجميع

/** صلاحيات كل دور — الكوأدمن يعمل داخل تعاونيته حصراً */
const ROLE_MATRIX: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "manage:platform",
    "manage:admins",
    "approve:cooperatives",
    "create:cooperatives",
    "list:all-cooperatives",
    "manage:cooperative",
    "manage:members",
    "manage:finance",
    "manage:documents",
    "manage:assemblies",
    "manage:entities",
    "approve:users",
    "create:users",
    "assign:coadmin",
    "delegate:tasks",
    "post:opportunities",
    "review:applications",
    "apply:opportunities",
    "view:regulations",
    "view:shared-documents",
  ],
  ADMIN: [
    "approve:cooperatives",
    "create:cooperatives",
    "list:all-cooperatives",
    "manage:cooperative",
    "manage:members",
    "manage:finance",
    "manage:documents",
    "manage:assemblies",
    "manage:entities",
    "approve:users",
    "create:users",
    "assign:coadmin",
    "post:opportunities",
    "review:applications",
    "apply:opportunities",
    "view:regulations",
    "view:shared-documents",
  ],
  COADMIN: [
    "manage:cooperative",
    "manage:members",
    "manage:finance",
    "manage:documents",
    "manage:assemblies",
    "approve:users",
    "create:users",
    "assign:coadmin",
    "post:opportunities",
    "review:applications",
    "apply:opportunities",
    "view:regulations",
    "view:shared-documents",
  ],
  USER: ["participate:assemblies", "apply:opportunities", "view:regulations", "view:shared-documents"],
};

/** تفويض الرئيس: كل صلاحيات التعاونية بما فيها تفويض المهام */
const PRESIDENT_EXTRA: Permission[] = ["delegate:tasks"];

export function userPermissions(user: Pick<SessionUser, "role" | "accountType"> | null): Permission[] {
  if (!user) return [];
  const base = ROLE_MATRIX[user.role] ?? [];
  if (user.role === "COADMIN" && user.accountType === "PRESIDENT") {
    return [...base, ...PRESIDENT_EXTRA];
  }
  return base;
}

export function can(
  user: Pick<SessionUser, "role" | "accountType" | "cooperativeId"> | null,
  permission: Permission
): boolean {
  return userPermissions(user).includes(permission);
}

/** هل يملك المستخدم صلاحية على تعاونية معينة؟ (الكوأدمن داخل تعاونيته فقط) */
export function canAccessCooperative(
  user: Pick<SessionUser, "role" | "cooperativeId"> | null,
  cooperativeId: number
): boolean {
  if (!user) return false;
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") return true;
  if (user.role === "COADMIN") return user.cooperativeId === cooperativeId;
  return false;
}

/** الوحدات المتاحة حسب الدور (للتصفح والقوائم) */
export function allowedViews(user: SessionUser | null): string[] {
  if (!user) return ["landing", "login", "register", "opportunities", "legal"];
  const common = ["landing", "opportunities", "legal", "settings"];
  if (user.role === "SUPER_ADMIN" || user.role === "ADMIN") {
    return [
      ...common,
      "dashboard",
      "cooperatives",
      "members",
      "assembly",
      "finance",
      "documents",
      "entities",
      "regulations",
      "users",
    ];
  }
  if (user.role === "COADMIN") {
    return [
      ...common,
      "dashboard",
      "members",
      "assembly",
      "finance",
      "documents",
      "regulations",
      "users",
    ];
  }
  // USER — عضو أو متعاقد: فضاؤه الخاص
  return [...common, "myspace"];
}

/** الأدوار التي يمكن لمستخدمٍ ذي دور «actor» تعيينها عند إنشاء/تعديل حساب */
export function assignableRoles(role: Role | undefined): { role: Role; accountType: AccountType | null; label: string }[] {
  const out: { role: Role; accountType: AccountType | null; label: string }[] = [];
  if (role === "SUPER_ADMIN") {
    out.push({ role: "ADMIN", accountType: null, label: "أدمن منصة" });
  }
  out.push(
    { role: "COADMIN", accountType: "PRESIDENT", label: "كوأدمن — رئيس تعاونية" },
    { role: "COADMIN", accountType: "MANAGER", label: "كوأدمن — عضو مسير" },
    { role: "USER", accountType: "MEMBER", label: "عضو غير مسير" },
    { role: "USER", accountType: "CONTRACTOR", label: "متعاقد مع التعاونية" }
  );
  return out;
}
