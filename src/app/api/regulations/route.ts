import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET() {
  const rows = await db.regulation.findMany({ orderBy: [{ status: "asc" }, { year: "desc" }] });
  // فك ترميز النقاط الأساسية (مخزنة كنص JSON)
  const parsed = rows.map((r) => {
    let keyPoints: string[] = [];
    try {
      const v = JSON.parse(r.keyPoints);
      if (Array.isArray(v)) keyPoints = v.map(String);
    } catch {
      keyPoints = [];
    }
    return { ...r, keyPoints };
  });
  return ok(parsed);
}
