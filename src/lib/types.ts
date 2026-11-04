// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الأنواع المشتركة (التواريخ بصيغة ISO بعد التسلسل عبر JSON)
// ═══════════════════════════════════════════════════════════════════════════

export interface Cooperative {
  id: number;
  name: string;
  registrationNumber: string;
  odcCardNumber: string | null;
  sector: string;
  region: string;
  province: string;
  commune: string | null;
  presidentName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  foundingDate: string;
  status: string; // ACTIVE | DORMANT | DISSOLVED
  notes: string | null;
  createdAt: string;
}

export interface Member {
  id: number;
  cooperativeId: number;
  fullName: string;
  cin: string | null;
  gender: string | null; // M | F
  phone: string | null;
  email: string | null;
  city: string | null;
  joinDate: string;
  shares: number;
  boardRole: string | null; // PRESIDENT | VICE | SECRETARY | TREASURER | AUDITOR | ADVISOR
  status: string; // ACTIVE | SUSPENDED | WITHDRAWN
  createdAt: string;
}

export interface Assembly {
  id: number;
  cooperativeId: number;
  type: string; // ORDINARY | EXTRAORDINARY | CONSTITUENT
  date: string;
  location: string | null;
  agenda: string;
  decisions: string | null;
  attendeesCount: number;
  status: string; // SCHEDULED | HELD | CANCELLED
  createdAt: string;
}

export interface Meeting {
  id: number;
  cooperativeId: number;
  date: string;
  agenda: string;
  decisions: string | null;
  attendeesCount: number;
  createdAt: string;
}

export interface Transaction {
  id: number;
  cooperativeId: number;
  type: string; // INCOME | EXPENSE
  category: string;
  amount: number;
  date: string;
  description: string | null;
  method: string; // CASH | BANK | CHEQUE | MOBILE
  reference: string | null;
  createdAt: string;
}

export interface DocumentItem {
  id: number;
  cooperativeId: number;
  title: string;
  type: string; // STATUTE | MINUTE | FINANCIAL | TAX | ODCO | CONTRACT | OTHER
  reference: string | null;
  issueDate: string;
  expiryDate: string | null;
  status: string; // VALID | EXPIRING | EXPIRED | ARCHIVED
  notes: string | null;
  createdAt: string;
}

export interface GovEntity {
  id: number;
  name: string;
  acronym: string | null;
  type: string; // MINISTRY | OFFICE | AGENCY | COURT | LOCAL_AUTHORITY | INSTITUTE
  supervisor: string | null;
  missions: string;
  website: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  interactions?: EntityInteraction[];
}

export interface EntityInteraction {
  id: number;
  entityId: number;
  cooperativeId: number | null;
  date: string;
  type: string; // DECLARATION | REQUEST | CORRESPONDENCE | VISIT | AUDIT | SUPPORT
  subject: string;
  status: string; // PENDING | IN_PROGRESS | DONE | REJECTED
  notes: string | null;
  createdAt: string;
  entity?: GovEntity | null;
}

export interface Regulation {
  id: number;
  code: string;
  title: string;
  year: number;
  category: string; // LAW | DECREE | TAX | GUIDE | PRINCIPLE | INTERNATIONAL
  authority: string;
  summary: string;
  keyPoints: string[]; // يخزَّن كـ JSON في قاعدة البيانات
  status: string; // IN_FORCE | REPEALED | REFERENCE
  url: string | null;
  createdAt: string;
}

export interface ComplianceTask {
  id: number;
  cooperativeId: number;
  title: string;
  description: string | null;
  type: string; // ASSEMBLY | TAX | CNSS | ODCO | RENEWAL | OTHER
  dueDate: string;
  status: string; // PENDING | DONE
  createdAt: string;
}

// ─── لوحة القيادة: بنية الإحصائيات المجمَّعة ────────────────────────────────
export interface DashboardData {
  coopCount: number;
  activeCoopCount: number;
  memberCount: number;
  womenShare: number; // نسبة النساء %
  sharesTotal: number;
  incomeYTD: number;
  expenseYTD: number;
  balance: number;
  monthlySeries: { month: string; income: number; expense: number }[];
  sectorDistribution: { sector: string; count: number }[];
  membersByYear: { year: string; count: number }[];
  tasksUpcoming: (ComplianceTask & { daysLeft: number })[];
  recentTransactions: Transaction[];
  documentsHealth: { valid: number; expiring: number; expired: number };
  assembliesRecent: Assembly[];
  womenCount: number;
}
