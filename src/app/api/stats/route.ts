import { db } from "@/lib/db";
import { ok, preflight } from "@/lib/api-server";
import { buildDashboardData } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export function OPTIONS() {
  return preflight();
}

export async function GET(req: Request) {
  const cooperativeId = new URL(req.url).searchParams.get("cooperativeId");
  const [coops, members, transactions, tasks, documents, assemblies] = await Promise.all([
    db.cooperative.findMany(),
    db.member.findMany(),
    db.transaction.findMany(),
    db.complianceTask.findMany(),
    db.document.findMany(),
    db.assembly.findMany(),
  ]);

  // تسلسل التواريخ إلى ISO ثم التحليل
  const data = buildDashboardData({
    coops: JSON.parse(JSON.stringify(coops)),
    members: JSON.parse(JSON.stringify(members)),
    transactions: JSON.parse(JSON.stringify(transactions)),
    tasks: JSON.parse(JSON.stringify(tasks)),
    documents: JSON.parse(JSON.stringify(documents)),
    assemblies: JSON.parse(JSON.stringify(assemblies)),
    activeCoopId: cooperativeId ? Number(cooperativeId) : null,
  });
  return ok(data);
}
