// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إدارة السوبر أدمين (الإصدار 1.3.2) — المالك حصراً
//
// GET  /api/super-admins  → قائمة السوبر أدمين بحالة الإشعار/التوقيف
// POST /api/super-admins  → إنشاء سوبر أدمين جديد أو ترقية أدمن قائم
//                           { mode: "new" | "promote", …, reason }
//
// مسار الإجراء العادل ضد سوبر أدمين (لا إيقاف بلا إشعار موثق):
//   إشعار ← أجل عادل للرد/التسوية ← توقيف موثق ← (اختيارياً) إزالة
// خطواته في المسارات الفرعية [id]/… — حساب المالك محمي تماماً.
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson } from "@/lib/api-server";
import { denied } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { hashPassword } from "@/lib/seed-run";
import { notifyUser } from "@/lib/notify";
import { ownerOnly, toView } from "@/lib/super-admins";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const actorOrRes = await ownerOnly(req);
  if (actorOrRes instanceof Response) return actorOrRes;

  const rows = await db.user.findMany({
    where: { role: "SUPER_ADMIN" },
    orderBy: [{ isOwner: "desc" }, { createdAt: "desc" }],
  });
  return ok({ items: rows.map((u) => toView(u)) });
}

export async function POST(req: Request) {
  const actorOrRes = await ownerOnly(req);
  if (actorOrRes instanceof Response) return actorOrRes;
  const actor = actorOrRes;

  const b = await readJson(req);
  const mode = String(b.mode ?? "new");
  const reason = String(b.reason ?? "").trim();
  if (reason.length < 10) {
    return fail("اذكر سبب منح صلاحية السوبر أدمين (10 أحرف على الأقل) — يوثق في سجل الأحداث");
  }

  // ── الوضع 1: إنشاء حساب سوبر أدمين جديد ────────────────────────────────
  if (mode === "new") {
    const username = String(b.username ?? "").trim();
    const fullName = String(b.fullName ?? "").trim();
    const password = String(b.password ?? "");
    const phone = String(b.phone ?? "").trim() || null;
    const email = String(b.email ?? "").trim() || null;

    if (!/^[a-zA-Z0-9_.-]{3,32}$/.test(username)) {
      return fail("اسم المستخدم: 3-32 حرفاً لاتينياً/رقماً (- _ . مسموحة)");
    }
    if (fullName.length < 3) return fail("الاسم الكامل مطلوب (3 أحرف على الأقل)");
    if (password.length < 10) return fail("كلمة مرور السوبر أدمين: 10 أحرف على الأقل");

    const exists = await db.user.findUnique({ where: { username } });
    if (exists) return fail("اسم المستخدم محجوز لحساب قائم");

    const created = await db.user.create({
      data: {
        username,
        fullName,
        passwordHash: hashPassword(password),
        phone,
        email,
        role: "SUPER_ADMIN",
        isOwner: false,
        status: "ACTIVE",
      },
    });

    await logAudit({
      req,
      actor,
      action: "super_admin.add",
      entityType: "USER",
      entityId: created.id,
      summary: `إنشاء سوبر أدمين جديد: ${created.fullName} (${created.username})`,
      details: { mode, reason },
      severity: "CRITICAL",
    });
    await notifyUser({
      userId: created.id,
      type: "SYSTEM",
      title: "أُنشئ حسابك سوبر أدمين",
      body: `منحك مالك المنصة صلاحية سوبر أدمين. سبب المنح الموثق: «${reason}». تُدار هذه الصلاحية وفق ميثاق إداري عادل: أي إجراء في مواجهتها يسبقه إشعار مسبب ووفق أجل معقول.`,
    });

    return ok({ created: true, user: toView(created) }, 201);
  }

  // ── الوضع 2: ترقية أدمن قائم إلى سوبر أدمين ────────────────────────────
  if (mode === "promote") {
    const targetId = Number(b.targetUserId ?? 0);
    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target) return fail("الحساب الهدف غير موجود", 404);
    if (target.role !== "ADMIN") {
      return fail("الترقية إلى سوبر أدمين متاحة لحسابات الأدمن حصراً");
    }
    if (target.status !== "ACTIVE") return fail("لا تُرقَّى إلا الحسابات النشطة");
    if (target.id === actor.id) return fail("لا يمكن تنفيذ الإجراء على حسابك الشخصي");

    const promoted = await db.user.update({
      where: { id: target.id },
      data: { role: "SUPER_ADMIN", isOwner: false },
    });

    await logAudit({
      req,
      actor,
      action: "super_admin.promote",
      entityType: "USER",
      entityId: promoted.id,
      summary: `ترقية ${promoted.fullName} (${promoted.username}) من أدمن إلى سوبر أدمين`,
      details: { mode, reason, previousRole: "ADMIN" },
      severity: "CRITICAL",
    });
    await notifyUser({
      userId: promoted.id,
      type: "SYSTEM",
      title: "تمت ترقيتك إلى سوبر أدمين",
      body: `رقّاك مالك المنصة إلى رتبة سوبر أدمين. سبب الترقية الموثق: «${reason}».`,
    });

    return ok({ promoted: true, user: toView(promoted) });
  }

  return fail("وضع غير معروف — استعمل mode: new أو promote");
}
