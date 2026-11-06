// ═══════════════════════════════════════════════════════════════════════════
// CMDP — مصفوفة الصلاحيات المشتركة (تُستعمل في الواجهة وفي الباك إند)
// التدرج: المالك ← سوبر أدمين ← أدمن ← كوأدمن (رئيس/عضو مسير) ← مستخدم عادي
// (الإصدار 1.3.2: تمييز المالك عن باقي السوبر أدمين بعلم isOwner)
// ═══════════════════════════════════════════════════════════════════════════

import type { AccountType, Role, SessionUser } from "./types";

/** الأفعال القابلة للتفويض داخل المنصة */
export type Permission =
  | "manage:platform" // إدارة المنصة ككل (المالك فقط)
  | "manage:super-admins" // إدارة حسابات السوبر أدمين (المالك فقط)
  | "manage:admins" // إنشاء/تعديل حسابات الأدمن (المالك فقط)
  | "view:audit-log" // سجل الأحداث التدقيقي (المالك والسوبر أدمين)
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

/** صلاحيات يحتكرها المالك حصراً (isOwner=true) */
const OWNER_EXCLUSIVE: Permission[] = [
  "manage:platform",
  "manage:super-admins",
  "manage:admins",
];

/** صلاحيات كل دور — الكوأدمن يعمل داخل تعاونيته حصراً */
const ROLE_MATRIX: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    "manage:platform",
    "manage:super-admins",
    "manage:admins",
    "view:audit-log",
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

/** هل المستخدم مالك المنصة؟ */
export function isPlatformOwner(user: { role: string; isOwner?: boolean | null } | null): boolean {
  return !!user && user.role === "SUPER_ADMIN" && user.isOwner === true;
}

export function userPermissions(
  user: Pick<SessionUser, "role" | "accountType" | "isOwner"> | null
): Permission[] {
  if (!user) return [];
  const base = ROLE_MATRIX[user.role] ?? [];
  let out = base;
  if (user.role === "COADMIN" && user.accountType === "PRESIDENT") {
    out = [...base, ...PRESIDENT_EXTRA];
  }
  // الصلاحيات المالكية الحصرية: تُمنح لصاحبها فحسب — سوبر أدمين غير المالك
  // لا يدير الأدمن ولا السوبر أدمين ولا الملكية (حصرية المالك)
  if (user.role === "SUPER_ADMIN" && !user.isOwner) {
    out = out.filter((p) => !OWNER_EXCLUSIVE.includes(p));
  }
  return out;
}

export function can(
  user: Pick<SessionUser, "role" | "accountType" | "cooperativeId" | "isOwner"> | null,
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

// ─── تراتبية الحماية بين الحسابات (إصلاح 1.3.0 + ملكية 1.3.2) ─────────────
/** هدف إدارة حساب */
export interface ManageableUser {
  id: number;
  role: string;
  accountType: string | null;
  cooperativeId: number | null;
  isOwner?: boolean | null;
}

export interface ManagingUser
  extends Pick<SessionUser, "id" | "role" | "accountType" | "cooperativeId"> {
  isOwner?: boolean;
}

/**
 * هل يمكن للفاعل إدارة حساب الهدف (تعديل/إيقاف/تفعيل/تغيير دور/تصفير كلمة مرور)؟
 * القواعد الصارمة:
 * • لا أحد يدير حسابه الخاص (حماية ذاتية)
 * • حساب المالك (isOwner): محمي تماماً — لا يديره أحد مهما كان دوره
 * • حسابات السوبر أدمين: يديرها المالك حصراً من لوحة المالك (مسار عادل موثق)
 * • الأدمن: يديره المالك حصراً — سوبر أدمين غير المالك لا يمسّه
 * • الكوأدمن المسير (MANAGER): يدير الأعضاء والمتعاقدين في تعاونيته فقط —
 *   لا يمكنه مسّ حساب الرئيس ولا حتى نظرائه المسيرين ولا أي حساب إداري
 * • الكوأدمن الرئيس (PRESIDENT): يدير المسيرين والأعضاء والمتعاقدين في تعاونيته
 */
export function canManageUser(
  actor: ManagingUser | null,
  target: ManageableUser | null
): boolean {
  if (!actor || !target) return false;
  if (actor.id === target.id) return false; // لا إجراء على الحساب الشخصي
  if (isPlatformOwner(actor)) {
    // المالك يدير الجميع ما عدا نفسه (السوبر أدمين عبر مسارهم العادل الموثق)
    return !isPlatformOwner(target);
  }
  // حساب المالك محمي من الجميع
  if (isPlatformOwner(target)) return false;
  // سوبر أدمين غير المالك: يديره المالك حصراً
  if (target.role === "SUPER_ADMIN") return false;
  if (target.role === "ADMIN") return false; // الأدمن: المالك حصراً
  switch (actor.role) {
    case "SUPER_ADMIN":
      return true; // سوبر أدمين على الحسابات دون الإدارية
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
  actor: (Pick<SessionUser, "id" | "role"> & { isOwner?: boolean }) | null,
  target: ManageableUser | null
): string {
  if (!actor || !target) return "";
  if (actor.id === target.id) return "لا يمكن تنفيذ إجراء على حسابك الخاص";
  if (isPlatformOwner(target)) return "حساب مالك المنصة محمي بالكامل — لا يُدار ولا يُوقف ولا يُحذف";
  if (target.role === "SUPER_ADMIN")
    return "حسابات السوبر أدمين يديرها مالك المنصة حصراً من لوحة المالك (مسار عادل موثق)";
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
  if (user.role === "SUPER_ADMIN") {
    const views = [
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
      // سجل الأحداث التدقيقي: للمالك والسوبر أدمين
      "auditlog",
    ];
    // لوحة المالك (نقل الملكية + إدارة السوبر أدمين): المالك حصراً
    if (isPlatformOwner(user)) views.push("owner");
    return views;
  }
  if (user.role === "ADMIN") {
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
