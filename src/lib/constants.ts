// ═══════════════════════════════════════════════════════════════════════════
// CMDP — الثوابت والتسميات العربية
// ═══════════════════════════════════════════════════════════════════════════

export const APP_NAME = "CMDP";
export const APP_FULL_NAME = "المنصة الرقمية لإدارة التعاونيات";
export const APP_TAGLINE = "رقمنة شاملة للتعاونيات المغربية";

// ─── الجهات الاثنتا عشرة ───────────────────────────────────────────────────
export const REGIONS = [
  "الرباط-سلا-القنيطرة",
  "الدار البيضاء-سطات",
  "فاس-مكناس",
  "مراكش-آسفي",
  "سوس-ماسة",
  "درعة-تافيلالت",
  "بني ملال-خنيفرة",
  "الشرق",
  "طنجة-تطوان-الحسيمة",
  "كلميم-واد نون",
  "العيون-الساقية الحمراء",
  "الداخلة-وادي الذهب",
] as const;

export const SECTORS = [
  "الفلاحة والمنتجات المجالية",
  "الصناعة التقليدية",
  "الخدمات",
  "السكن",
  "الصيد البحري",
  "التجارة والتقسيط",
  "النقل واللوجستيك",
  "الصناعة",
] as const;

// ─── خرائط الحالات والألقاب ───────────────────────────────────────────────
type Labeled = { label: string; className: string };

export const COOP_STATUS: Record<string, Labeled> = {
  ACTIVE: { label: "نشطة", className: "bg-zellij/10 text-zellij border-zellij/25" },
  DORMANT: { label: "خاملة", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  DISSOLVED: { label: "منحلة", className: "bg-destructive/10 text-destructive border-destructive/25" },
};

export const MEMBER_STATUS: Record<string, Labeled> = {
  ACTIVE: { label: "نشط", className: "bg-zellij/10 text-zellij border-zellij/25" },
  SUSPENDED: { label: "موقوف", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  WITHDRAWN: { label: "منسحب", className: "bg-muted text-muted-foreground border-border" },
};

export const BOARD_ROLES: Record<string, string> = {
  PRESIDENT: "رئيس(ة) التعاونية",
  VICE: "نائب(ة) الرئيس",
  SECRETARY: "كاتب(ة) عام",
  TREASURER: "أمين(ة) المال",
  AUDITOR: "مراقب(ة) الحسابات",
  ADVISOR: "مستشار(ة)",
};

export const ASSEMBLY_TYPES: Record<string, Labeled> = {
  ORDINARY: { label: "جمع عام عادي", className: "bg-zellij/10 text-zellij border-zellij/25" },
  EXTRAORDINARY: { label: "جمع عام استثنائي", className: "bg-terra/10 text-terra border-terra/25" },
  CONSTITUENT: { label: "جمع عام تأسيسي", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
};

export const ASSEMBLY_STATUS: Record<string, Labeled> = {
  SCHEDULED: { label: "مُبرمج", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  HELD: { label: "منعقد", className: "bg-zellij/10 text-zellij border-zellij/25" },
  CANCELLED: { label: "ملغى", className: "bg-destructive/10 text-destructive border-destructive/25" },
};

export const DOC_TYPES: Record<string, Labeled> = {
  STATUTE: { label: "القانون الأساسي", className: "bg-terra/10 text-terra border-terra/25" },
  MINUTE: { label: "محضر", className: "bg-zellij/10 text-zellij border-zellij/25" },
  FINANCIAL: { label: "تقرير مالي", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  TAX: { label: "وثيقة جبائية", className: "bg-chart-5/10 text-chart-5 border-chart-5/25" },
  ODCO: { label: "وثيقة ODCO", className: "bg-terra/10 text-terra border-terra/25" },
  CONTRACT: { label: "عقد", className: "bg-chart-4/10 text-chart-4 border-chart-4/25" },
  OTHER: { label: "أخرى", className: "bg-muted text-muted-foreground border-border" },
};

export const DOC_STATUS: Record<string, Labeled> = {
  VALID: { label: "سارية", className: "bg-zellij/10 text-zellij border-zellij/25" },
  EXPIRING: { label: "قاربت الانتهاء", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  EXPIRED: { label: "منتهية", className: "bg-destructive/10 text-destructive border-destructive/25" },
  ARCHIVED: { label: "مؤرشفة", className: "bg-muted text-muted-foreground border-border" },
};

export const INTERACTION_TYPES: Record<string, Labeled> = {
  DECLARATION: { label: "تصريح", className: "bg-zellij/10 text-zellij border-zellij/25" },
  REQUEST: { label: "طلب", className: "bg-terra/10 text-terra border-terra/25" },
  CORRESPONDENCE: { label: "مراسلة", className: "bg-chart-4/10 text-chart-4 border-chart-4/25" },
  VISIT: { label: "زيارة ميدانية", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  AUDIT: { label: "تدقيق", className: "bg-chart-5/10 text-chart-5 border-chart-5/25" },
  SUPPORT: { label: "دعم ومواكبة", className: "bg-zellij/10 text-zellij border-zellij/25" },
};

export const INTERACTION_STATUS: Record<string, Labeled> = {
  PENDING: { label: "قيد الانتظار", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  IN_PROGRESS: { label: "قيد المعالجة", className: "bg-terra/10 text-terra border-terra/25" },
  DONE: { label: "منجز", className: "bg-zellij/10 text-zellij border-zellij/25" },
  REJECTED: { label: "مرفوض", className: "bg-destructive/10 text-destructive border-destructive/25" },
};

export const ENTITY_TYPES: Record<string, Labeled> = {
  MINISTRY: { label: "وزارة", className: "bg-terra/10 text-terra border-terra/25" },
  OFFICE: { label: "مكتب / مؤسسة عمومية", className: "bg-zellij/10 text-zellij border-zellij/25" },
  AGENCY: { label: "مديرية / وكالة", className: "bg-chart-4/10 text-chart-4 border-chart-4/25" },
  COURT: { label: "محكمة", className: "bg-chart-5/10 text-chart-5 border-chart-5/25" },
  LOCAL_AUTHORITY: { label: "سلطة محلية", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  INSTITUTE: { label: "معهد", className: "bg-muted text-muted-foreground border-border" },
};

export const REGULATION_CATEGORIES: Record<string, Labeled> = {
  LAW: { label: "قانون", className: "bg-terra/10 text-terra border-terra/25" },
  DECREE: { label: "مرسوم / قرار", className: "bg-zellij/10 text-zellij border-zellij/25" },
  TAX: { label: "نص جبائي", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  GUIDE: { label: "دليل توجيهي", className: "bg-chart-4/10 text-chart-4 border-chart-4/25" },
  PRINCIPLE: { label: "مبادئ التعاون", className: "bg-chart-5/10 text-chart-5 border-chart-5/25" },
  INTERNATIONAL: { label: "مرجعية دولية", className: "bg-muted text-muted-foreground border-border" },
};

export const REGULATION_STATUS: Record<string, Labeled> = {
  IN_FORCE: { label: "ساري", className: "bg-zellij/10 text-zellij border-zellij/25" },
  REPEALED: { label: "ملغى", className: "bg-destructive/10 text-destructive border-destructive/25" },
  REFERENCE: { label: "مرجع", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
};

export const TASK_TYPES: Record<string, Labeled> = {
  ASSEMBLY: { label: "الجمع العام", className: "bg-terra/10 text-terra border-terra/25" },
  TAX: { label: "الضرائب", className: "bg-saffron/15 text-[#8a6414] border-saffron/30" },
  CNSS: { label: "الضمان الاجتماعي", className: "bg-chart-4/10 text-chart-4 border-chart-4/25" },
  ODCO: { label: "ODCO", className: "bg-zellij/10 text-zellij border-zellij/25" },
  RENEWAL: { label: "تجديد", className: "bg-chart-5/10 text-chart-5 border-chart-5/25" },
  OTHER: { label: "أخرى", className: "bg-muted text-muted-foreground border-border" },
};

export const TX_METHODS: Record<string, string> = {
  CASH: "نقدا",
  BANK: "تحويل بنكي",
  CHEQUE: "شيك",
  MOBILE: "الدفع عن بعد",
};

export const INCOME_CATEGORIES = [
  "اشتراكات الأعضاء",
  "بيع المنتوجات",
  "منح ودعم",
  "أنشطة التكوين",
  "مداخيل أخرى",
] as const;

export const EXPENSE_CATEGORIES = [
  "مواد أولية",
  "الأجور والتعويضات",
  "الكراء",
  "الماء والكهرباء",
  "النقل والتوزيع",
  "التكوين",
  "التجهيزات",
  "رسوم إدارية",
  "مصاريف أخرى",
] as const;

// ─── مسار تأسيس تعاونية (شاشة القوانين) ────────────────────────────────────
export const FOUNDATION_STEPS = [
  {
    title: "شهادة التسمية",
    desc: "طلب مصادقة مكتب تنمية التعاون (ODCO) على اسم التعاونية المزمع تأسيسها.",
  },
  {
    title: "الجمع العام التأسيسي",
    desc: "انعقاد الجمع بحضور 5 أعضاء مؤسسين على الأقل، والمصادقة على القانون الأساسي واختيار المجلس.",
  },
  {
    title: "التصريح بالتأسيس",
    desc: "إيداع ملف التصريح لدى السلطة المحلية المختصة داخل الأجل القانوني (15 يوماً).",
  },
  {
    title: "التسجيل بالسجل المحلي",
    desc: "التقييد لدى كتابة ضبط المحكمة الابتدائية وفق المرسوم 2.15.617 وقرار 1369.16.",
  },
  {
    title: "التقييد بالسجل المركزي",
    desc: "تقوم السلطة المحلية بإحالة الملف على مكتب تنمية التعاون للتقييد بالسجل المركزي.",
  },
  {
    title: "التصريحات الضريبية والاجتماعية",
    desc: "فتح الحساب البنكي، والتصريح لدى المديرية العامة للضرائب والصندوق الوطني للضمان الاجتماعي.",
  },
];

// ─── إحصائيات القطاع (المصدر: مكتب تنمية التعاون — حصيلة 2025) ─────────────
export const SECTOR_STATS = {
  coops: 65315,
  members: 788000,
  womenShare: 34,
  womenCoops: 8000,
  agriculture: 40033,
  handicraft: 12744,
  source: "المصدر: مكتب تنمية التعاون (ODCO) — حصيلة سنة 2025",
};
