// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إدارة حسابات سوبر أدمين (حوكمة 1.3.0) — المالك حصراً
// GET: قائمة سوبر أدمين مع حالة الإيقاف المنضبط | POST: إنشاء سوبر أدمين جديد
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied, getAuthUser } from "@/lib/auth";
import { hashPassword } from "@/lib/seed-run";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

/** تحقق المالك: المسار حصري بمالك المنصة */
async function requireOwner(req: Request) {
  const user = await getAuthUser(req);
  if (!user) return { response: fail("يلزم تسجيل الدخول للقيام بهذه العملية", 401) };
  if (!user.isPlatformOwner) return { response: denied("هذه العملية حصرية لمالك المنصة") };
  return { user };
}

const SA_FIELDS = {
  id: true,
  username: true,
  fullName: true,
  phone: true,
  email: true,
  role: true,
  status: true,
  isPlatformOwner: true,
  noticedAt: true,
  noticeDeadline: true,
  suspendedAt: true,
  createdAt: true,
} as const;

export async function GET(req: Request) {
  const guard = await requireOwner(req);
  if ("response" in guard) return guard.response;

  const rows = await db.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: SA_FIELDS,
    orderBy: [{ isPlatformOwner: "desc" }, { id: "asc" }],
  });
  return ok(rows);
}

export async function POST(req: Request) {
  const guard = await requireOwner(req);
  if ("response" in guard) return guard.response;
  const { user: owner } = guard;

  const b = await readJson(req);
  const username = String(b.username ?? "").trim().toLowerCase();
  const password = String(b.password ?? "");
  const fullName = String(b.fullName ?? "").trim();
  const phone = b.phone ? String(b.phone) : null;
  const email = b.email ? String(b.email) : null;

  // ─── تحقق أساسي (نفس ضوابط باقي الحسابات) ─────────────────────────────
  if (!/^[a-z0-9_.-]{3,40}$/.test(username)) return fail("اسم مستخدم غير صالح (3-40 حرفاً لاتينياً)");
  if (password.length < 6) return fail("كلمة المرور: 6 أحرف على الأقل");
  if (!fullName) return fail("الاسم الكامل مطلوب");

  const exists = await db.user.findUnique({ where: { username } });
  if (exists) return fail("اسم المستخدم محجوز", 409);

  const row = await db.user.create({
    data: {
      username,
      passwordHash: hashPassword(password), // نفس تجزئة التسجيل العمومي
      fullName,
      phone,
      email,
      role: "SUPER_ADMIN",
      accountType: null,
      cooperativeId: null,
      status: "ACTIVE", // سوبر أدمين يُنشأ مفعَّلاً مباشرة بقرار من المالك
    },
    select: SA_FIELDS,
  });

  // ─── سجل التدقيق: إنشاء سوبر أدمين بقرار من المالك ────────────────────
  await audit(req, {
    actorId: owner.id,
    actorName: owner.fullName,
    actorRole: owner.role,
    action: "SUPER_ADMIN_CREATED",
    targetType: "USER",
    targetId: row.id,
    targetLabel: row.username,
    details: { fullName, phone, email },
  });
  return ok(row, 201);
}
