#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// CMDP — بناء النسخة الساكنة للنشر على Cloudflare Pages / أي استضافة ساكنة
// ينقل مجلد مسارات API مؤقتاً (غير متوافق مع التصدير الساكن) ثم يعيده بعد البناء.
// الاستعمال: npm run build:static  →  المخرجات في out/
// ═══════════════════════════════════════════════════════════════════════════

import { existsSync, renameSync, rmSync } from "node:fs";
import { execSync } from "node:child_process";

const API_DIR = "src/app/api";
const TMP_DIR = ".static-build-tmp";

function main() {
  const hadApi = existsSync(API_DIR);
  if (hadApi) {
    rmSync(TMP_DIR, { recursive: true, force: true });
    renameSync(API_DIR, TMP_DIR);
    console.log("⏸  أُوقف مجلد API مؤقتاً للتصدير الساكن");
  }
  try {
    execSync("npx next build", {
      stdio: "inherit",
      env: { ...process.env, CMDP_STATIC: "1" },
    });
  } finally {
    if (hadApi) {
      renameSync(TMP_DIR, API_DIR);
      console.log("▶️  أُعيد مجلد API إلى مكانه");
    }
  }
  console.log("✓ النسخة الساكنة جاهزة في مجلد out/");
}

main();
