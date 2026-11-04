// ═══════════════════════════════════════════════════════════════════════════
// CMDP — سكريبت بذر قاعدة البيانات
// الاستعمال: bun run seed
// ═══════════════════════════════════════════════════════════════════════════

import { PrismaClient } from "@prisma/client";
import { runSeed } from "../src/lib/seed-run";

const db = new PrismaClient();

async function main() {
  console.log("⏳ جارٍ بذر قاعدة البيانات...");
  const result = await runSeed(db);
  console.log("✓ اكتمل البذر بنجاح:");
  for (const [k, v] of Object.entries(result)) {
    console.log(`   • ${k}: ${v}`);
  }
  console.log("🔑 حساب الدخول: admin / cmdp2026");
}

main()
  .catch((e) => {
    console.error("✗ فشل البذر:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
