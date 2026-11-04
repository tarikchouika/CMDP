import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { runSeed } from "@/lib/seed-run";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

/** إعادة ضبط البيانات التجريبية */
export async function POST() {
  const result = await runSeed(db);
  return ok({ message: "تمت إعادة ضبط البيانات التجريبية", ...result });
}
