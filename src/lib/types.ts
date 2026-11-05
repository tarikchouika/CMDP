// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الأنواع المشتركة (التواريخ بصيغة ISO بعد التسلسل عبر JSON)
// ═══════════════════════════════════════════════════════════════════════════

// ─── الأدوار وأنواع الحسابات ───────────────────────────────────────────────
export type Role = "SUPER_ADMIN" | "ADMIN" | "COADMIN" | "USER";
export type AccountType = "PRESIDENT" | "MANAGER" | "MEMBER" | "CONTRACTOR";
export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "REJECTED";

/** هوية الجلسة — يعيدها مسار الدخول مع الرمز */
export interface SessionUser {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  accountType: AccountType | null;
  cooperativeId: number | null;
  cooperativeName?: string | null;
  status: UserStatus;
}

/** حساب مستخدم كامل (إدارة) */
export interface AppUser extends SessionUser {
  phone: string | null;
  email: string | null;
  cin: string | null;
  createdAt: string;
}

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
  approvalStatus: string; // PENDING | APPROVED | REJECTED — حالة التسجيل بالمنصة
  approvalNote: string | null;
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
  myVote?: string | null; // FOR | AGAINST | ABSTAIN — صوت المستخدم الحالي
  myAttendance?: boolean; // تأكيد الحضور من المستخدم الحالي
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
  isShared: boolean; // مشاركة مع المتعاقدين
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

// ─── طلبات الانخراط ───────────────────────────────────────────────────────
export interface JoinRequest {
  id: number;
  cooperativeId: number;
  userId: number | null;
  fullName: string;
  cin: string | null;
  phone: string | null;
  email: string | null;
  requestType: string; // MEMBERSHIP | CONTRACT
  motivation: string | null;
  shares: number;
  status: string; // PENDING | APPROVED | REJECTED
  decidedBy: string | null;
  decisionNote: string | null;
  createdAt: string;
  cooperative?: Pick<Cooperative, "id" | "name" | "sector" | "region">;
}

// ─── فرص العمل والتعاقد ───────────────────────────────────────────────────
export interface Opportunity {
  id: number;
  cooperativeId: number;
  type: string; // JOB | CONTRACT | SERVICE_NEED | INTERNSHIP
  title: string;
  description: string;
  sector: string;
  region: string;
  city: string | null;
  positions: number;
  contractType: string | null; // CDI | CDD | SEASONAL | MISSION | PARTNERSHIP
  requirements: string | null;
  deadline: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string; // OPEN | CLOSED
  createdAt: string;
  cooperative?: Pick<Cooperative, "id" | "name" | "sector" | "region" | "phone" | "email">;
  applicationsCount?: number;
}

export interface OpportunityApplication {
  id: number;
  opportunityId: number;
  userId: number | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  motivation: string | null;
  experience: string | null;
  status: string; // PENDING | REVIEWED | ACCEPTED | REJECTED
  createdAt: string;
  opportunity?: Pick<Opportunity, "id" | "title" | "type">;
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

// ─── المتجر: المنتجات والطلبات والإحصائيات (الإصدار 1.3.0) ─────────────────
export interface Product {
  id: number;
  cooperativeId: number;
  name: string;
  description: string | null;
  category: string;
  unit: string | null;
  price: number;
  imageUrl: string | null;
  inStock: boolean;
  featured: boolean;
  status: string; // ACTIVE | HIDDEN
  createdAt: string;
  cooperative?: Pick<Cooperative, "id" | "name" | "region" | "sector">;
  _count?: { orders: number };
}

export interface Order {
  id: number;
  productId: number;
  quantity: number;
  customerName: string;
  phone: string;
  city: string | null;
  note: string | null;
  status: string; // NEW | CONTACTED | DONE | CANCELLED
  createdAt: string;
  product?: { id: number; name: string; cooperativeId: number; price: number; unit: string | null };
}

export interface StoreStats {
  scope: { cooperativeId: number | null; days: number };
  totals: {
    totalOrders: number;
    byStatus: Record<string, number>;
    doneRevenue: number;
    pipelineValue: number;
    avgOrderValue: number;
    completionRate: number;
  };
  weeklySeries: { week: string; orders: number; done: number; revenue: number }[];
  topProducts: { id: number; name: string; quantity: number; orders: number; revenue: number }[];
  catalog: { total: number; active: number; hidden: number; outOfStock: number; featured: number };
  generatedAt: string;
}
