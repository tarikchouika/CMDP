// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إدارة المستخدمين (عرض حسب النطاق + إنشاء بأدوار محددة)
// سوبر أدمين: الجميع | أدمن: الجميع عدا سوبر أدمين | كوأدمن: تعاونيته فقط
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, requirePermission } from "@/lib/auth";
import { hashPassword } from "@/lib/seed-run";
import { assignableRoles } from "@/lib/permissions";
import type { AccountType, Role } from "@/lib/types";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

const PUBLIC_FIELDS = {
  id: true,
  username: true,
  fullName: true,
  phone: true,
  email: true,
  cin: true,
  role: true,
  accountType: true,
  cooperativeId: true,
  status: true,
  createdAt: true,
  cooperative: { select: { id: true, name: true } },
} as const;

export async function GET(req: Request) {
  const auth = await requirePermission(req, "approve:users");
  if ("response" in auth) return auth.response;
  const { user } = auth;

  const status = new URL(req.url).searchParams.get("status");
  const where: Record<string, unknown> = {};
  if (status) where.status = status;
  if (user.role === "COADMIN") where.cooperativeId = user.cooperativeId;
  if (user.role === "ADMIN") where.role = { not: "SUPER_ADMIN" }; // أدمن لا يرى حساب المالك

  const rows = await db.user.findMany({
    where,
    select: PUBLIC_FIELDS,
    orderBy: [{ status: "asc" }, { id: "asc" }],
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const auth = await requirePermission(req, "create:users");
  if ("response" in auth) return auth.response;
  const { user: actor } = auth;

  const b = await readJson(req);
  const username = String(b.username ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const fullName = String(b.fullName ?? "").trim();
  if (!/^[a-z0-9_.-]{3,40}$/.test(username)) return fail("اسم مستخدم غير صالح (3-40 حرفاً لاتينياً)");
  if (password.length < 6) return fail("كلمة المرور: 6 أحرف على الأقل");
  if (!fullName) return fail("الاسم الكامل مطلوب");

  const role = String(b.role ?? "USER") as Role;
  const accountType = (b.accountType ?? null) as AccountType | null;
  const cooperativeId = b.cooperativeId != null ? Number(b.cooperativeId) : null;

  // ─── ضوابط التعيين حسب صلاحية الموظِّف ──────────────────────────────────
  const allowed = assignableRoles(actor.role, actor.accountType).some(
    (r) => r.role === role && r.accountType === accountType
  );
  if (!allowed) return denied("لا يمكنك تعيين هذا الدور — تحقق من نطاق صلاحياتك");

  if (role === "SUPER_ADMIN") return denied("إنشاء حساب سوبر أدمين غير مسموح");

  if (role === "ADMIN" || role === "COADMIN" || accountType === "MEMBER" || accountType === "CONTRACTOR") {
    if (!cooperativeId && role !== "ADMIN") return fail("حدد التعاونية التابع لها الحساب");
    if (cooperativeId && actor.role === "COADMIN" && cooperativeId !== actor.cooperativeId) {
      return denied("لا يمكنك إنشاء حسابات خارج تعاونيتك");
    }
  }

  const exists = await db.user.findUnique({ where: { username } });
  if (exists) return fail("اسم المستخدم محجوز", 409);

  const row = await db.user.create({
    data: {
      username,
      passwordHash: hashPassword(password),
      fullName,
      phone: b.phone ? String(b.phone) : null,
      email: b.email ? String(b.email) : null,
      cin: b.cin ? String(b.cin) : null,
      role,
      accountType: accountType ?? null,
      cooperativeId: role === "ADMIN" ? null : cooperativeId,
      status: "ACTIVE", // الإنشاء المباشر من الإدارة = مفعَّل
    },
    select: PUBLIC_FIELDS,
  });
  return ok(row, 201);
}
