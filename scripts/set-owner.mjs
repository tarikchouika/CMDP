// ═══════════════════════════════════════════════════════════════════════════
// CMDP — تعيين مالك المنصة (حوكمة 1.3.0)
// يرفع علم isPlatformOwner لحساب tarik حصراً ويؤكد أن لا مالك آخر موجود.
// الاستعمال: node scripts/set-owner.mjs
// ═══════════════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.user.count({ where: { isPlatformOwner: true } });

  // تصفير العلم عند الجميع ثم رفعه للمالك الشرعي (idempotent)
  await prisma.user.updateMany({ where: { isPlatformOwner: true }, data: { isPlatformOwner: false } });
  const owner = await prisma.user.update({
    where: { username: "tarik" },
    data: { isPlatformOwner: true },
    select: { id: true, username: true, fullName: true, role: true, status: true, isPlatformOwner: true },
  });

  const owners = await prisma.user.findMany({
    where: { isPlatformOwner: true },
    select: { id: true, username: true, fullName: true, role: true, isPlatformOwner: true },
  });

  console.log(`مالكو المنصة قبل التنفيذ: ${before}`);
  console.log(`المالك المعيَّن: ${JSON.stringify(owner)}`);
  console.log(`عدد المالكين بعد التنفيذ: ${owners.length} — ${owners.map((o) => o.username).join(", ")}`);
  if (owners.length !== 1 || owners[0].username !== "tarik") {
    throw new Error("تحذير: يجب أن يكون tarik المالك الوحيد للمنصة");
  }
  console.log("✔ تم التعيين بنجاح — tarik هو المالك الوحيد للمنصة");
}

main()
  .catch((e) => {
    console.error("✗ فشل تعيين المالك:", e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
