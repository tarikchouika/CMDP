// ═══════════════════════════════════════════════════════════════════════════
// CMDP — دوال التحليل والتجميع (مشتركة بين مسار /api/stats والوضع التجريبي)
// ═══════════════════════════════════════════════════════════════════════════

import type {
  Assembly,
  ComplianceTask,
  Cooperative,
  DashboardData,
  DocumentItem,
  Member,
  Transaction,
} from "./types";
import { computeDocStatus, daysUntil } from "./format";

const monthLabel = (d: Date) =>
  new Intl.DateTimeFormat("ar-MA", { month: "short" }).format(d);

export interface AnalyticsInput {
  coops: Cooperative[];
  members: Member[];
  transactions: Transaction[];
  tasks: ComplianceTask[];
  documents: DocumentItem[];
  assemblies: Assembly[];
  activeCoopId: number | null;
}

const sumBy = (rows: Transaction[], type: "INCOME" | "EXPENSE") =>
  rows.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0);

export function buildDashboardData(input: AnalyticsInput): DashboardData {
  const { coops, members, transactions, tasks, documents, assemblies, activeCoopId } = input;
  const coop = coops.find((c) => c.id === activeCoopId) ?? coops[0];
  const coopId = coop?.id ?? 0;

  const coopMembers = members.filter((m) => m.cooperativeId === coopId && m.status === "ACTIVE");
  const womenCount = coopMembers.filter((m) => m.gender === "F").length;

  const coopTx = transactions.filter((t) => t.cooperativeId === coopId);
  const year = new Date().getFullYear();
  const ytd = coopTx.filter((t) => new Date(t.date).getFullYear() === year);
  const incomeYTD = sumBy(ytd, "INCOME");
  const expenseYTD = sumBy(ytd, "EXPENSE");
  const balance = sumBy(coopTx, "INCOME") - sumBy(coopTx, "EXPENSE");

  // السلسلة الشهرية — آخر 12 شهراً
  const monthlySeries: { month: string; income: number; expense: number }[] = [];
  const now = new Date();
  for (let k = 11; k >= 0; k--) {
    const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
    const rows = coopTx.filter((t) => {
      const td = new Date(t.date);
      return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
    });
    monthlySeries.push({
      month: monthLabel(d),
      income: Math.round(sumBy(rows, "INCOME")),
      expense: Math.round(sumBy(rows, "EXPENSE")),
    });
  }

  // توزيع التعاونيات حسب القطاع
  const sectorMap = new Map<string, number>();
  for (const c of coops) sectorMap.set(c.sector, (sectorMap.get(c.sector) ?? 0) + 1);
  const sectorDistribution = [...sectorMap.entries()]
    .map(([sector, count]) => ({ sector, count }))
    .sort((a, b) => b.count - a.count);

  // تطور عدد الأعضاء (تراكمي)
  const yearMap = new Map<number, number>();
  for (const m of coopMembers) {
    const y = new Date(m.joinDate).getFullYear();
    yearMap.set(y, (yearMap.get(y) ?? 0) + 1);
  }
  const years = [...yearMap.keys()].sort();
  let acc = 0;
  const membersByYear = years.map((y) => {
    acc += yearMap.get(y) ?? 0;
    return { year: String(y), count: acc };
  });

  // المواعيد النظامية القادمة
  const tasksUpcoming = tasks
    .filter((t) => t.cooperativeId === coopId && t.status === "PENDING")
    .sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1))
    .slice(0, 6)
    .map((t) => ({ ...t, daysLeft: daysUntil(t.dueDate) }));

  // آخر الحركات
  const recentTransactions = [...coopTx]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 6);

  // صحة الوثائق
  const docStatuses = documents
    .filter((d) => d.cooperativeId === coopId)
    .map((d) => computeDocStatus(d.status, d.expiryDate));
  const documentsHealth = {
    valid: docStatuses.filter((s) => s === "VALID").length,
    expiring: docStatuses.filter((s) => s === "EXPIRING").length,
    expired: docStatuses.filter((s) => s === "EXPIRED").length,
  };

  const assembliesRecent = [...assemblies]
    .filter((a) => a.cooperativeId === coopId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 4);

  return {
    coopCount: coops.length,
    activeCoopCount: coops.filter((c) => c.status === "ACTIVE").length,
    memberCount: coopMembers.length,
    womenCount,
    womenShare: coopMembers.length ? Math.round((womenCount / coopMembers.length) * 100) : 0,
    sharesTotal: coopMembers.reduce((s, m) => s + m.shares, 0),
    incomeYTD: Math.round(incomeYTD),
    expenseYTD: Math.round(expenseYTD),
    balance: Math.round(balance),
    monthlySeries,
    sectorDistribution,
    membersByYear,
    tasksUpcoming,
    recentTransactions,
    documentsHealth,
    assembliesRecent,
  };
}
