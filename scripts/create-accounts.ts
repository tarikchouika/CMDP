// ═══════════════════════════════════════════════════════════════════════════
// CMDP — إنشاء الحسابات الحقيقية في قاعدة البيانات (الإصدار 1.3.0)
//
// الغرض: الانتقال من حسابات العرض (cmdp2026) إلى حسابات حقيقية بكلمات مرور
// قوية عشوائية — تُطبع مرة واحدة عند الإنشاء ولا تُخزَّن في أي ملف.
//
// الاستعمال (من جذر المشروع):
//   bun scripts/create-accounts.ts                 ← المالك + طقم اختبار الأدوار
//   bun scripts/create-accounts.ts --owner-only    ← حساب المالك فقط
//   bun scripts/create-accounts.ts --purge-demo    ← حذف حسابات العرض القديمة أولاً
//   bun scripts/create-accounts.ts --password "..." ← كلمة مرور مخصصة للمالك
//
// آمن للتكرار: الحسابات الموجودة تُتخطى (وليست استبدالاً).
// ═══════════════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const prisma = new PrismaClient();

// ─── تجزئة كلمة المرور (نفس خوارزمية src/lib/seed-run.ts) ─────────────────
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

/** كلمة مرور قوية: 16 محرفاً من الأبجدية غير الملتبسة */
function strongPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#%&";
  const bytes = randomBytes(16);
  return [...bytes].map((b) => alphabet[b % alphabet.length]).join("");
}

const DEMO_USERNAMES = [
  "superadmin", "admin", "president", "manager", "member", "contractor",
];

interface AccountSpec {
  username: string;
  fullName: string;
  role: string;
  accountType: string | null;
  note: string;
}

async function main() {
  const args = process.argv.slice(2);
  const ownerOnly = args.includes("--owner-only");
  const purgeDemo = args.includes("--purge-demo");
  const customPwdIdx = args.indexOf("--password");
  const ownerPassword = customPwdIdx >= 0 ? args[customPwdIdx + 1] : null;

  console.log("\n╔══════════════════════════════════════════════════════════════╗");
  console.log("║   CMDP — إنشاء الحسابات الحقيقية (كلمات مرور قوية تُطبع مرة)   ║");
  console.log("╚══════════════════════════════════════════════════════════════╝\n");

  // ─── 1) تنظيف حسابات العرض القديمة إن طُلب ──────────────────────────────
  if (purgeDemo) {
    const deleted = await prisma.user.deleteMany({
      where: { username: { in: DEMO_USERNAMES } },
    });
    console.log(`🧹 حُذفت ${deleted.count} من حسابات العرض القديمة (كلمة المرور cmdp2026 المكشوفة)\n`);
  }

  // ─── 2) حساب المالك (سوبر أدمين) ────────────────────────────────────────
  const created: { username: string; password: string; fullName: string; role: string; note: string }[] = [];

  const existingOwner = await prisma.user.findUnique({ where: { username: "tarik" } });
  if (existingOwner) {
    // ضمان علم الملكية على حساب المالك الحالي (توحيد 1.3.4) — واحد لا يتعدد
    const ownerCount = await prisma.user.count({ where: { isPlatformOwner: true } });
    if (!existingOwner.isPlatformOwner && ownerCount === 0) {
      await prisma.user.update({
        where: { username: "tarik" },
        data: { isPlatformOwner: true, role: "SUPER_ADMIN" },
      });
      console.log("✓ رُفع حساب المالك tarik إلى رتبة المالك (isPlatformOwner=true)");
    } else {
      console.log("✓ حساب المالك tarik موجود مسبقاً — تُخطي");
    }
  } else {
    const pwd = ownerPassword ?? strongPassword();
    await prisma.user.create({
      data: {
        username: "tarik",
        passwordHash: hashPassword(pwd),
        fullName: "Tarik Chouika",
        role: "SUPER_ADMIN",
        isPlatformOwner: true, // المالك الوحيد للمنصة (حوكمة 1.3.0/توحيد 1.3.4)
        accountType: null,
        cooperativeId: null,
        status: "ACTIVE",
      },
    });
    created.push({
      username: "tarik",
      password: pwd,
      fullName: "Tarik Chouika",
      role: "SUPER_ADMIN — مالك المنصة",
      note: "الدخول الكامل: إدارة المنصة والسوبر أدمين ونقل الملكية وسجل الأحداث",
    });
  }

  // ─── 3) طقم اختبار الأدوار (تعاونية اختبار + رئيس/مسير/عضو/متعاقد) ──────
  if (!ownerOnly) {
    let coop = await prisma.cooperative.findFirst({
      where: { registrationNumber: "TEST-CMDP-2026" },
    });
    if (!coop) {
      coop = await prisma.cooperative.create({
        data: {
          name: "تعاونية الاختبار — منتجات مجالية",
          registrationNumber: "TEST-CMDP-2026",
          sector: "الفلاحة والمنتجات المجالية",
          region: "سوس-ماسة",
          province: "تارودانت",
          presidentName: "حساب اختبار الرئيس",
          foundingDate: new Date(),
          status: "ACTIVE",
          approvalStatus: "APPROVED",
          notes: "تعاونية اختبار أُنشئت لتجربة قاعدة البيانات والأدوار — يمكن تعديلها أو حذفها من وحدة التعاونيات",
        },
      });
      console.log(`✓ أُنشئت تعاونية الاختبار: ${coop.name} (#${coop.id})`);
    }

    const specs: AccountSpec[] = [
      { username: "test.president", fullName: "حساب اختبار — رئيس التعاونية", role: "COADMIN", accountType: "PRESIDENT", note: "كل صلاحيات التعاونية + إدارة المسيرين + إدارة المتجر" },
      { username: "test.manager", fullName: "حساب اختبار — عضو مسير", role: "COADMIN", accountType: "MANAGER", note: "تسيير التعاونية والمتجر — لا يمكنه مسّ حساب الرئيس (التراتبية)" },
      { username: "test.member", fullName: "حساب اختبار — عضو غير مسير", role: "USER", accountType: "MEMBER", note: "فضاء العضو: الجموع والتصويت والوثائق المصرح بها" },
      { username: "test.contractor", fullName: "حساب اختبار — متعاقد", role: "USER", accountType: "CONTRACTOR", note: "فضاء المتعاقد: الفرص والوثائق المصرح بها فقط" },
    ];

    for (const spec of specs) {
      const exists = await prisma.user.findUnique({ where: { username: spec.username } });
      if (exists) {
        console.log(`✓ ${spec.username} موجود مسبقاً — تُخطي`);
        continue;
      }
      const pwd = strongPassword();
      await prisma.user.create({
        data: {
          username: spec.username,
          passwordHash: hashPassword(pwd),
          fullName: spec.fullName,
          role: spec.role,
          accountType: spec.accountType,
          cooperativeId: coop.id,
          status: "ACTIVE",
        },
      });
      created.push({
        username: spec.username,
        password: pwd,
        fullName: spec.fullName,
        role: `${spec.role}/${spec.accountType}`,
        note: spec.note,
      });
    }
  }

  // ─── 4) طباعة بيانات الدخول (مرة واحدة) ─────────────────────────────────
  if (created.length === 0) {
    console.log("\nℹ لا حسابات جديدة أُنشئت — كل شيء موجود مسبقاً.\n");
    return;
  }
  console.log("\n┌─────────────────────────────────────────────────────────────────────┐");
  console.log("│              بيانات الدخول — احفظها الآن (لا تُطبع ثانية)          │");
  console.log("├─────────────────────────────────────────────────────────────────────┤");
  for (const c of created) {
    console.log(`│  👤 ${c.fullName}`);
    console.log(`│     المستخدم: ${c.username}`);
    console.log(`│     كلمة المرور: ${c.password}`);
    console.log(`│     الدور: ${c.role}`);
    console.log(`│     ${c.note}`);
    console.log("├─────────────────────────────────────────────────────────────────────┤");
  }
  console.log("│  🔐 غيّر كلمات المرور من وحدة المستخدمين عند أول دخول.              │");
  console.log("└─────────────────────────────────────────────────────────────────────┘\n");
}

main()
  .catch((e) => {
    console.error("✗ فشل إنشاء الحسابات:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
