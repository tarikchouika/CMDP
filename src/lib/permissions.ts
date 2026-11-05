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
  | "manage:store" // إدارة منتجات وطلبات متجر التعاونية وإحصائياته
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
    "manage:store",
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
    "manage:store",
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
    "manage:store",
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

// ─── تراتبية الحماية بين الحسابات (إصلاح 1.3.0) ─────────────────────────────
/** هدف إدارة حساب */
export interface ManageableUser {
  id: number;
  role: string;
  accountType: string | null;
  cooperativeId: number | null;
}

/**
 * هل يمكن للفاعل إدارة حساب الهدف (تعديل/إيقاف/تفعيل/تغيير دور/تصفير كلمة مرور)؟
 * القواعد الصارمة:
 * • لا أحد يدير حسابه الخاص (حماية ذاتية)
 * • المالك (سوبر أدمين) وال أدمن: يديرهما المالك حصراً
 * • الكوأدمن المسير (MANAGER): يدير الأعضاء والمتعاقدين في تعاونيته فقط —
 *   لا يمكنه مسّ حساب الرئيس ولا حتى نظرائه المسيرين ولا أي حساب إداري
 *   (إصلاح الخلل المُبلّغ: كان بإمكان المسير إيقاف حساب الرئيس)
 * • الكوأدمن الرئيس (PRESIDENT): يدير المسيرين والأعضاء والمتعاقدين في تعاونيته
 * • أدمن المنصة: يدير الكوأدمن والمستخدمين في كل التعاونيات
 */
export function canManageUser(
  actor: (Pick<SessionUser, "id" | "role" | "accountType" | "cooperativeId"> & ManageableUser) | null,
  target: ManageableUser | null
): boolean {
  if (!actor || !target) return false;
  if (actor.id === target.id) return false; // لا إجراء على الحساب الشخصي
  if (target.role === "SUPER_ADMIN") return actor.role === "SUPER_ADMIN";
  if (target.role === "ADMIN") return actor.role === "SUPER_ADMIN";
  switch (actor.role) {
    case "SUPER_ADMIN":
      return true;
    case "ADMIN":
      return target.role === "COADMIN" || target.role === "USER";
    case "COADMIN": {
      if (target.cooperativeId !== actor.cooperativeId) return false; // نطاق التعاونية
      if (target.role === "USER") return true; // أعضاء ومتعاقدون
      if (target.role !== "COADMIN") return false;
      // الرئيس يدير المسيرين؛ المسير لا يدير الرئيس ولا نظراءه
      return actor.accountType === "PRESIDENT" && target.accountType !== "PRESIDENT";
    }
    default:
      return false;
  }
}

/** سبب الحماية (للرسائل التوضيحية في الواجهة) */
export function manageDenialReason(
  actor: Pick<SessionUser, "id" | "role"> | null,
  target: ManageableUser | null
): string {
  if (!actor || !target) return "";
  if (actor.id === target.id) return "لا يمكن تنفيذ إجراء على حسابك الخاص";
  if (target.role === "SUPER_ADMIN") return "حساب مالك المنصة محمي — يديره المالك حصراً";
  if (target.role === "ADMIN") return "حسابات الأدمن يديرها مالك المنصة حصراً";
  if (actor.role === "COADMIN" && target.role === "COADMIN") {
    return target.accountType === "PRESIDENT"
      ? "حساب رئيس التعاونية محمي حسب تراتبية الصلاحيات"
      : "حسابات المسيرين يديرها رئيس التعاونية أو إدارة المنصة";
  }
  return "هذا الحساب خارج نطاق صلاحياتك";
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
      "storemanage",
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
      "storemanage",
    ];
  }
  // USER — عضو أو متعاقد: فضاؤه الخاص
  return [...common, "myspace"];
}

/** الأدوار التي يمكن لمستخدمٍ ذي دور «actor» تعيينها عند إنشاء/تعديل حساب */
export function assignableRoles(
  role: Role | undefined,
  accountType?: AccountType | null
): { role: Role; accountType: AccountType | null; label: string }[] {
  const out: { role: Role; accountType: AccountType | null; label: string }[] = [];
  // المسير لا يعيّن رؤساء ولا مسيرين — منعاً للتصعيد داخل التعاونية
  if (role === "SUPER_ADMIN") {
    out.push({ role: "ADMIN", accountType: null, label: "أدمن منصة" });
  }
  if (role !== "COADMIN" || accountType === "PRESIDENT") {
    out.push(
      { role: "COADMIN", accountType: "PRESIDENT", label: "كوأدمن — رئيس تعاونية" },
      { role: "COADMIN", accountType: "MANAGER", label: "كوأدمن — عضو مسير" }
    );
  }
  out.push(
    { role: "USER", accountType: "MEMBER", label: "عضو غير مسير" },
    { role: "USER", accountType: "CONTRACTOR", label: "متعاقد مع التعاونية" }
  );
  return out;
}
