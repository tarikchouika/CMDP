// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تسجيل الزوار: حساب مجرد / انخراط في تعاونية / تسجيل تعاونية جديدة
// كل الطلبات تُنشأ بحالة PENDING وتصادق عليها الأطراف المختصة:
//   - الحساب والانخراط: الأدمن أو كوأدمن التعاونية المعنية
//   - التعاونية الجديدة (مع حساب رئيسها): الأدمن أو سوبر أدمين
// ═══════════════════════════════════════════════════════════════════════════

import { db } from "@/lib/db";
import { fail, ok, preflight, readJson, toDate } from "@/lib/api-server";
import { hashPassword } from "@/lib/seed-run";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

type RegisterBody = {
  intent: "ACCOUNT" | "JOIN" | "NEW_COOP"; // نوع الطلب
  username: string;
  password: string;
  fullName: string;
  phone?: string;
  email?: string;
  cin?: string;
  // JOIN
  cooperativeId?: number;
  requestType?: "MEMBERSHIP" | "CONTRACT";
  motivation?: string;
  shares?: number;
  // NEW_COOP
  cooperative?: {
    name: string;
    sector: string;
    region: string;
    province: string;
    commune?: string;
    foundingDate?: string;
    phone?: string;
    email?: string;
    address?: string;
  };
};

const clean = (v: unknown, max = 200) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  const body = await readJson<RegisterBody>(req);
  const intent = body.intent ?? "ACCOUNT";
  const username = clean(body.username, 40).toLowerCase();
  const password = String(body.password ?? "");
  const fullName = clean(body.fullName, 120);

  // ─── تحقق أساسي ────────────────────────────────────────────────────────
  if (!/^[a-z0-9_.-]{3,40}$/.test(username)) {
    return fail("اسم المستخدم: حروف لاتينية صغيرة وأرقام فقط (3-40 حرفاً)");
  }
  if (password.length < 6) return fail("كلمة المرور يجب أن تتكون من 6 أحرف على الأقل");
  if (!fullName) return fail("الاسم الكامل مطلوب");
  const exists = await db.user.findUnique({ where: { username } });
  if (exists) return fail("اسم المستخدم محجوز — اختر اسماً آخر");

  // ─── طلب 1: انخراط في تعاونية قائمة ────────────────────────────────────
  if (intent === "JOIN") {
    const coopId = Number(body.cooperativeId ?? 0);
    const coop = await db.cooperative.findFirst({
      where: { id: coopId, approvalStatus: "APPROVED", status: "ACTIVE" },
    });
    if (!coop) return fail("التعاونية المحددة غير متاحة للانخراط");
    const requestType = body.requestType === "CONTRACT" ? "CONTRACT" : "MEMBERSHIP";
    const user = await db.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        fullName,
        phone: clean(body.phone, 30) || null,
        email: clean(body.email, 120) || null,
        cin: clean(body.cin, 30) || null,
        role: "USER",
        accountType: requestType === "CONTRACT" ? "CONTRACTOR" : "MEMBER",
        cooperativeId: coopId,
        status: "PENDING",
      },
    });
    await db.joinRequest.create({
      data: {
        cooperativeId: coopId,
        userId: user.id,
        fullName,
        cin: clean(body.cin, 30) || null,
        phone: clean(body.phone, 30) || null,
        email: clean(body.email, 120) || null,
        requestType,
        motivation: clean(body.motivation, 1000) || null,
        shares: requestType === "MEMBERSHIP" ? Math.max(1, Number(body.shares ?? 1)) : 0,
        status: "PENDING",
      },
    });
    return ok({
      message: "تم استلام طلب انخراطكم بنجاح. سيتمكن رئيس التعاونية أو أحد أعضائها المسييرين من المصادقة عليه.",
    }, 201);
  }

  // ─── طلب 2: تسجيل تعاونية جديدة (مع حساب رئيسها) ────────────────────────
  if (intent === "NEW_COOP") {
    const c = (body.cooperative ?? {}) as NonNullable<RegisterBody["cooperative"]>;
    const name = clean(c.name, 160);
    if (!name) return fail("اسم التعاونية مطلوب");
    if (!clean(c.sector, 80) || !clean(c.region, 80) || !clean(c.province, 80)) {
      return fail("القطاع والجهة والإقليم حقول إلزامية");
    }
    const dup = await db.cooperative.findFirst({ where: { name } });
    if (dup) return fail("يوجد ملف بهذا الاسم — تواصلوا مع إدارة المنصة");

    const coop = await db.cooperative.create({
      data: {
        name,
        registrationNumber: `طلب-${Date.now().toString(36)}`, // مؤقت إلى حين استكمال التسجيل الرسمي
        sector: clean(c.sector, 80),
        region: clean(c.region, 80),
        province: clean(c.province, 80),
        commune: clean(c.commune, 80) || null,
        presidentName: fullName,
        phone: clean(c.phone, 30) || null,
        email: clean(c.email, 120) || null,
        address: clean(c.address, 300) || null,
        foundingDate: toDate(c.foundingDate, new Date()),
        status: "ACTIVE",
        approvalStatus: "PENDING",
        notes: "طلب تسجيل مقدم من الواجهة العمومية",
      },
    });
    await db.user.create({
      data: {
        username,
        passwordHash: hashPassword(password),
        fullName,
        phone: clean(body.phone, 30) || null,
        email: clean(body.email, 120) || null,
        cin: clean(body.cin, 30) || null,
        role: "COADMIN",
        accountType: "PRESIDENT",
        cooperativeId: coop.id,
        status: "PENDING",
      },
    });
    return ok({
      message:
        "تم استلام طلب تسجيل التعاونية. ستقوم إدارة المنصة بمراجعة الملف والمصادقة عليه، ثم يُفعَّل حسابكم كرئيس(ة) للتعاونية.",
    }, 201);
  }

  // ─── طلب 3: حساب مجرد (بانتظار المصادقة) ────────────────────────────────
  await db.user.create({
    data: {
      username,
      passwordHash: hashPassword(password),
      fullName,
      phone: clean(body.phone, 30) || null,
      email: clean(body.email, 120) || null,
      cin: clean(body.cin, 30) || null,
      role: "USER",
      accountType: null,
      cooperativeId: null,
      status: "PENDING",
    },
  });
  return ok({
    message:
      "تم إنشاء حسابكم بنجاح. سيتم تفعيله بعد المصادقة من طرف إدارة المنصة، ويمكنكم في انتظار ذلك الاطلاع على الفرص المتاحة والقوانين.",
  }, 201);
}
