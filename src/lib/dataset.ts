// ═══════════════════════════════════════════════════════════════════════════
// CMDP — البيانات الأولية الواقعية (مشتركة بين سكريبت البذر والوضع التجريبي)
// ملاحظة: البيانات لأغراض العرض فقط، منسجمة مع الإطار القانوني المغربي
// ═══════════════════════════════════════════════════════════════════════════

import type {
  AppUser,
  Assembly,
  ComplianceTask,
  Cooperative,
  DocumentItem,
  EntityInteraction,
  GovEntity,
  JoinRequest,
  Member,
  Meeting,
  Opportunity,
  OpportunityApplication,
  Regulation,
  Transaction,
} from "./types";

const NOW = new Date();
/** تاريخ نسبي عن اليوم (بالأيام) */
const rel = (days: number) => new Date(NOW.getTime() + days * 86_400_000).toISOString();
/** تاريخ ثابت: سنة، شهر (1-12)، يوم */
const at = (y: number, m: number, d = 1) =>
  new Date(Date.UTC(y, m - 1, d, 12)).toISOString();

// ─────────────────────────── التعاونيات (9) ───────────────────────────────
const cooperativesBase: Omit<Cooperative, "approvalStatus" | "approvalNote" | "logo" | "legalDocuments">[] = [
  {
    id: 1,
    name: "تعاونية تافوكت لإنتاج زيت أركان",
    registrationNumber: "1526/16",
    odcCardNumber: "OD-2016-0432",
    sector: "الفلاحة والمنتجات المجالية",
    region: "سوس-ماسة",
    province: "تارودانت",
    commune: "أولاد برحيل",
    presidentName: "فاطمة أيت الحاج",
    phone: "06 61 23 45 67",
    email: "contact@tafoukt.ma",
    address: "دوار تافوكت، جماعة أولاد برحيل، إقليم تارودانت",
    foundingDate: at(2016, 3, 12),
    status: "ACTIVE",
    notes: "تعاونية نسائية رائدة في إنتاج وتوضيب زيت أركان البيولوجي المعتمد.",
    createdAt: at(2016, 3, 12),
  },
  {
    id: 2,
    name: "تعاونية نسج الأطلس للنسيج التقليدي",
    registrationNumber: "2218/18",
    odcCardNumber: "OD-2018-1123",
    sector: "الصناعة التقليدية",
    region: "مراكش-آسفي",
    province: "الحوز",
    commune: "أسني",
    presidentName: "خديجة بن عمر",
    phone: "06 62 34 56 78",
    email: null,
    address: "مركز أسني، إقليم الحوز",
    foundingDate: at(2018, 5, 20),
    status: "ACTIVE",
    notes: "صيانة وتطوير فن النسج الأمازيغي بالأصواف والخيوط الطبيعية.",
    createdAt: at(2018, 5, 20),
  },
  {
    id: 3,
    name: "تعاونية دار الزليج للصناعة التقليدية",
    registrationNumber: "0912/12",
    odcCardNumber: "OD-2012-0091",
    sector: "الصناعة التقليدية",
    region: "فاس-مكناس",
    province: "فاس",
    commune: "سايس",
    presidentName: "محمد الشرقاوي",
    phone: "06 63 45 67 89",
    email: "darzellij@contact.ma",
    address: "حي الصناعة التقليدية، عين النقبي، فاس",
    foundingDate: at(2012, 10, 5),
    status: "ACTIVE",
    notes: "معلمون مجازون في الزليج الفاسي الأصيل — ورشات الترميم والابتكار.",
    createdAt: at(2012, 10, 5),
  },
  {
    id: 4,
    name: "تعاونية واحة النخيل لتحويل التمور",
    registrationNumber: "1744/14",
    odcCardNumber: "OD-2014-0765",
    sector: "الفلاحة والمنتجات المجالية",
    region: "درعة-تافيلالت",
    province: "الرشيدية",
    commune: "أرفود",
    presidentName: "إبراهيم أوباها",
    phone: "06 64 56 78 90",
    email: null,
    address: "جماعة أرفود، إقليم الرشيدية",
    foundingDate: at(2014, 11, 15),
    status: "ACTIVE",
    notes: "تحويل وتوضيب تمور المجول والدقلة النور، وتسويقها عبر الأسواق الجهوية.",
    createdAt: at(2014, 11, 15),
  },
  {
    id: 5,
    name: "تعاونية موجة الصويرة للصيد البحري",
    registrationNumber: "3325/17",
    odcCardNumber: "OD-2017-0228",
    sector: "الصيد البحري",
    region: "مراكش-آسفي",
    province: "الصويرة",
    commune: "الصويرة",
    presidentName: "مبارك أيت الباهي",
    phone: "06 65 67 89 01",
    email: null,
    address: "ميناء الصويرة",
    foundingDate: at(2017, 4, 8),
    status: "ACTIVE",
    notes: "وحدات التبريد والتلفيف للأسماك والمحاريات لفائدة الصيادين الأعضاء.",
    createdAt: at(2017, 4, 8),
  },
  {
    id: 6,
    name: "تعاونية أطلس للتوريد الفلاحي",
    registrationNumber: "2437/19",
    odcCardNumber: "OD-2019-0340",
    sector: "الخدمات",
    region: "بني ملال-خنيفرة",
    province: "بني ملال",
    commune: "بني ملال",
    presidentName: "نور الدين الشاكر",
    phone: "06 66 78 90 12",
    email: null,
    address: "شارع محمد الخامس، بني ملال",
    foundingDate: at(2019, 2, 25),
    status: "ACTIVE",
    notes: "توريد الأسمدة والبذور والأعلاف للأعضاء بأسعار تفضيلية.",
    createdAt: at(2019, 2, 25),
  },
  {
    id: 7,
    name: "تعاونية النور للسكن",
    registrationNumber: "0510/10",
    odcCardNumber: "OD-2010-0044",
    sector: "السكن",
    region: "الرباط-سلا-القنيطرة",
    province: "سلا",
    commune: "سلا",
    presidentName: "منير الركراكي",
    phone: "06 67 89 01 23",
    email: "annour.logement@gmail.com",
    address: "حي السلام، سلا",
    foundingDate: at(2010, 6, 30),
    status: "ACTIVE",
    notes: "إنجاز برنامج سكني لفائدة الأعضاء — 60 وحدة في طور الإنجاز.",
    createdAt: at(2010, 6, 30),
  },
  {
    id: 8,
    name: "تعاونية جبال شفشاون للأعشاب الطبية",
    registrationNumber: "2750/20",
    odcCardNumber: "OD-2020-0517",
    sector: "الفلاحة والمنتجات المجالية",
    region: "طنجة-تطوان-الحسيمة",
    province: "شفشاون",
    commune: "باب تازة",
    presidentName: "مليكة أيت سعيد",
    phone: "06 68 90 12 34",
    email: null,
    address: "جماعة باب تازة، إقليم شفشاون",
    foundingDate: at(2020, 3, 18),
    status: "ACTIVE",
    notes: "تقطير وتوضيب الزيوت العطرية والأعشاب الجبلية المجففة.",
    createdAt: at(2020, 3, 18),
  },
  {
    id: 9,
    name: "تعاونية مرجان لتجار التقسيط",
    registrationNumber: "3311/21",
    odcCardNumber: "OD-2021-0702",
    sector: "التجارة والتقسيط",
    region: "الدار البيضاء-سطات",
    province: "الدار البيضاء",
    commune: "سيدي معروف",
    presidentName: "ياسين المرابط",
    phone: "06 69 01 23 45",
    email: null,
    address: "سيدي معروف، الدار البيضاء",
    foundingDate: at(2021, 9, 2),
    status: "DORMANT",
    notes: "تعاونية في طور إعادة الهيكلة بعد توقف نشاط التوزيع.",
    createdAt: at(2021, 9, 2),
  },
];

/** حالة المصادقة: كلها مسجلة باستثناء طلب واحد قيد الدراسة (للعرض التفاعلي) */
export const cooperatives: Cooperative[] = cooperativesBase.map((c) => ({
  ...c,
  logo: null,
  legalDocuments: null,
  approvalStatus: "APPROVED",
  approvalNote: null,
}));
// طلب تسجيل تعاونية جديدة بانتظار مصادقة الأدمن
cooperatives.push({
  id: 10,
  logo: null,
  legalDocuments: null,
  name: "تعاونية أمل الأطلس للصناعة التقليدية",
  registrationNumber: "طلب-register10",
  odcCardNumber: null,
  sector: "الصناعة التقليدية",
  region: "بني ملال-خنيفرة",
  province: "بني ملال",
  commune: "أكادير",
  presidentName: "رشيد أمزيل",
  phone: "06 78 11 22 33",
  email: "amelatlas@contact.ma",
  address: "دوار أكادير، إقليم بني ملال",
  foundingDate: rel(-12),
  status: "ACTIVE",
  approvalStatus: "PENDING",
  approvalNote: null,
  notes: "طلب تسجيل مقدم من الواجهة العمومية — بانتظار مراجعة الوثائق",
  createdAt: rel(-12),
});

// ─────────────────────────── الأعضاء (90) ─────────────────────────────────
let _mid = 1;
const pad2 = (n: number) => String(n).padStart(2, "0");

interface MemberSeed {
  name: string;
  gender: "M" | "F";
  role?: string;
  shares?: number;
  status?: string;
  city?: string;
}

function mkMembers(coopId: number, seeds: MemberSeed[], startYear: number): Member[] {
  const cinLetters = ["R", "K", "A", "BE", "JA", "S", "T", "X"];
  return seeds.map((s, i) => {
    const id = _mid++;
    const y = startYear + (i % Math.max(1, 2026 - startYear));
    const m = ((i * 3) % 12) + 1;
    const d = ((i * 7) % 27) + 1;
    return {
      id,
      cooperativeId: coopId,
      fullName: s.name,
      cin: `${cinLetters[(i + coopId) % cinLetters.length]}${100000 + ((id * 7919) % 899999)}`,
      gender: s.gender,
      phone: `06 ${pad2((i * 37) % 90 + 10)} ${pad2((i * 53) % 90 + 10)} ${pad2((i * 71) % 90 + 10)} ${pad2((i * 97) % 90 + 10)}`,
      email: null,
      city: s.city ?? null,
      joinDate: at(y, m, d),
      shares: s.shares ?? (i % 3 === 0 ? 2 : 1),
      boardRole: s.role ?? null,
      status: s.status ?? "ACTIVE",
      createdAt: at(y, m, d),
    } satisfies Member;
  });
}

// أعضاء التعاونية النموذجية «تافوكت» (32 عضوة وعضواً — مجلس من 7)
export const members: Member[] = [
  ...mkMembers(1, [
    { name: "فاطمة أيت الحاج", gender: "F", role: "PRESIDENT", shares: 5, city: "تارودانت" },
    { name: "ركية بومهدي", gender: "F", role: "VICE", shares: 3, city: "أولاد برحيل" },
    { name: "حسن إد بلقاسم", gender: "M", role: "SECRETARY", shares: 2, city: "أولاد برحيل" },
    { name: "مريم أوبلا", gender: "F", role: "TREASURER", shares: 3, city: "تارودانت" },
    { name: "مباركة أيت واعزي", gender: "F", role: "AUDITOR", shares: 2, city: "أولاد برحيل" },
    { name: "عبد الرحيم الناجي", gender: "M", role: "AUDITOR", shares: 2, city: "أگادير" },
    { name: "سعيد أيت عيسي", gender: "M", role: "ADVISOR", shares: 1, city: "تارودانت" },
    { name: "نعيمة أبركان", gender: "F", shares: 2 },
    { name: "فاطنة بنعلي", gender: "F", shares: 1 },
    { name: "خديجة أوعلي", gender: "F", shares: 2 },
    { name: "رشيدة بلمقدم", gender: "F", shares: 1 },
    { name: "سعيدة أيت باها", gender: "F", shares: 3 },
    { name: "مليكة بوزيد", gender: "F", shares: 2 },
    { name: "زهور الإدريسي", gender: "F", shares: 1 },
    { name: "حورية السباعي", gender: "F", shares: 2 },
    { name: "سمية أمزيل", gender: "F", shares: 1 },
    { name: "نورا الودغيري", gender: "F", shares: 2, city: "أگادير" },
    { name: "سناء بومنجل", gender: "F", shares: 1 },
    { name: "إكرام الحياني", gender: "F", shares: 2 },
    { name: "جميلة أيت محمد", gender: "F", shares: 1 },
    { name: "عائشة بلهيش", gender: "F", shares: 2 },
    { name: "لحسن أورحو", gender: "M", shares: 1, status: "WITHDRAWN" },
    { name: "محمد أيت داود", gender: "M", shares: 2 },
    { name: "يوسف بنعمر", gender: "M", shares: 1 },
    { name: "كريم الساحلي", gender: "M", shares: 1, city: "أگادير", status: "SUSPENDED" },
    { name: "رشيد أوعمر", gender: "M", shares: 2 },
    { name: "عمر بلفايد", gender: "M", shares: 1 },
    { name: "حسنية الوزاني", gender: "F", shares: 2 },
    { name: "فاطمة الزهراء العلوي", gender: "F", shares: 1 },
    { name: "آسية الرامي", gender: "F", shares: 2 },
    { name: "سلمى بنكيران", gender: "F", shares: 1 },
    { name: "توفيق المرابط", gender: "M", shares: 1 },
  ], 2016),
  // بقية التعاونيات
  ...mkMembers(2, [
    { name: "خديجة بن عمر", gender: "F", role: "PRESIDENT", shares: 4 },
    { name: "فاطمة بوكرين", gender: "F", role: "TREASURER", shares: 2 },
    { name: "ميمونة أيت علي", gender: "F", role: "SECRETARY", shares: 2 },
    { name: "رقية الوزانية", gender: "F", shares: 1 },
    { name: "سناء بلمختار", gender: "F", shares: 1 },
    { name: "نعيمة أفراوي", gender: "F", shares: 2 },
    { name: "حسنة أدويني", gender: "F", shares: 1 },
  ], 2018),
  ...mkMembers(3, [
    { name: "محمد الشرقاوي", gender: "M", role: "PRESIDENT", shares: 5 },
    { name: "عبد السلام بن جلون", gender: "M", role: "VICE", shares: 2 },
    { name: "إدريس الفاسي", gender: "M", role: "SECRETARY", shares: 2 },
    { name: "يوسف العلمي", gender: "M", role: "TREASURER", shares: 2 },
    { name: "سعيد المريني", gender: "M", shares: 1 },
    { name: "رشيد بنعيسى", gender: "M", shares: 1 },
    { name: "حمزة البقالي", gender: "M", shares: 2 },
    { name: "كريم الشرفي", gender: "M", shares: 1 },
    { name: "مصطفى الإدريسي", gender: "M", shares: 1 },
  ], 2012),
  ...mkMembers(4, [
    { name: "إبراهيم أوباها", gender: "M", role: "PRESIDENT", shares: 4 },
    { name: "محمد أوعلي", gender: "M", role: "TREASURER", shares: 2 },
    { name: "حسن الدرعاوي", gender: "M", shares: 1 },
    { name: "سعيد أيت عثمان", gender: "M", shares: 1 },
    { name: "عبد الله بلحسن", gender: "M", shares: 2 },
    { name: "يوسف الوردي", gender: "M", shares: 1 },
    { name: "خالد الراشدي", gender: "M", shares: 1 },
    { name: "عمر التازي", gender: "M", shares: 1 },
    { name: "إبراهيم المعمر", gender: "M", shares: 1 },
  ], 2014),
  ...mkMembers(5, [
    { name: "مبارك أيت الباهي", gender: "M", role: "PRESIDENT", shares: 3 },
    { name: "الحسين أبرشان", gender: "M", role: "SECRETARY", shares: 2 },
    { name: "عبد الرحيم أوبيهي", gender: "M", shares: 1 },
    { name: "محمد أمزيل", gender: "M", shares: 1 },
    { name: "رشيد بوهدي", gender: "M", shares: 1 },
    { name: "لحسن الورياشي", gender: "M", shares: 1 },
  ], 2017),
  ...mkMembers(6, [
    { name: "نور الدين الشاكر", gender: "M", role: "PRESIDENT", shares: 3 },
    { name: "سعيد أولحسن", gender: "M", role: "TREASURER", shares: 2 },
    { name: "محمد بنعمر", gender: "M", shares: 1 },
    { name: "فؤاد أيت الطالب", gender: "M", shares: 1 },
    { name: "رشيد الورياغلي", gender: "M", shares: 1 },
  ], 2019),
  ...mkMembers(7, [
    { name: "منير الركراكي", gender: "M", role: "PRESIDENT", shares: 6 },
    { name: "حسن الغزواني", gender: "M", role: "VICE", shares: 3 },
    { name: "سامية بنجلون", gender: "F", role: "SECRETARY", shares: 2 },
    { name: "عبد الإله الحمداوي", gender: "M", role: "TREASURER", shares: 2 },
    { name: "سعيد البركة", gender: "M", shares: 2 },
    { name: "فاطمة الرامي", gender: "F", shares: 2 },
    { name: "خالد الصقلي", gender: "M", shares: 1 },
    { name: "نادية الفاسي", gender: "F", shares: 1 },
    { name: "عماد بنشقرون", gender: "M", shares: 1 },
    { name: "سلوى الإدريسي", gender: "F", shares: 1 },
    { name: "يوسف الناجي", gender: "M", shares: 1 },
    { name: "رجاء العثماني", gender: "F", shares: 1 },
  ], 2010),
  ...mkMembers(8, [
    { name: "مليكة أيت سعيد", gender: "F", role: "PRESIDENT", shares: 3 },
    { name: "نعيمة بوزيان", gender: "F", role: "SECRETARY", shares: 2 },
    { name: "حورية أوناغا", gender: "F", shares: 1 },
    { name: "فاطمة الزهراء بوشتى", gender: "F", shares: 1 },
    { name: "سعاد أمزيان", gender: "F", shares: 2 },
  ], 2020),
  ...mkMembers(9, [
    { name: "ياسين المرابط", gender: "M", role: "PRESIDENT", shares: 2 },
    { name: "أيوب الحياني", gender: "M", shares: 1 },
    { name: "سناء بلقاضي", gender: "F", shares: 1 },
    { name: "حمزة البراني", gender: "M", shares: 1 },
    { name: "إيمان الوزاني", gender: "F", shares: 1 },
  ], 2021),
];

// ─────────────────────────── الجمعات العامة (التعاونية 1) ─────────────────
export const assemblies: Assembly[] = [
  {
    id: 1,
    cooperativeId: 1,
    type: "CONSTITUENT",
    date: at(2016, 3, 12),
    location: "قاعة جماعة أولاد برحيل",
    agenda: "المصادقة على القانون الأساسي\nانتخاب أعضاء المجلس الأول\nتحديد قيمة الحصة الاجتماعية",
    decisions:
      "المصادقة بالإجماع على القانون الأساسي\nانتخاب السيدة فاطمة أيت الحاج رئيسةً للتعاونية\nتحديد قيمة الحصة الاجتماعية في 100 درهم",
    attendeesCount: 32,
    status: "HELD",
    createdAt: at(2016, 3, 12),
  },
  {
    id: 2,
    cooperativeId: 1,
    type: "ORDINARY",
    date: at(2024, 6, 14),
    location: "مقر التعاونية، تارودانت",
    agenda: "التقرير الأدبي لسنة 2023\nالتقرير المالي لسنة 2023\nالمصادقة على الحسابات السنوية\nتحديد برنامج النشاط السنوي",
    decisions:
      "المصادقة على الحسابات السنوية\nالتوصية بتوسيع مساحة التخزين\nتحديد برنامج التكوين لفائدة العضوات",
    attendeesCount: 29,
    status: "HELD",
    createdAt: at(2024, 6, 14),
  },
  {
    id: 3,
    cooperativeId: 1,
    type: "ORDINARY",
    date: at(2025, 6, 20),
    location: "مقر التعاونية، تارودانت",
    agenda: "التقريران الأدبي والمالي لسنة 2024\nالمصادقة على الحسابات\nتوزيع جزء من الفائض على الأعضاء\nبرنامج الاستثمار في وحدة العصر",
    decisions:
      "المصادقة على الحسابات بأغلبية 26 صوتاً\nاقتناء عصرية حديثة بمنحة من مكتب تنمية التعاون\nتجديد نصف أعضاء المجلس",
    attendeesCount: 27,
    status: "HELD",
    createdAt: at(2025, 6, 20),
  },
  {
    id: 4,
    cooperativeId: 1,
    type: "EXTRAORDINARY",
    date: at(2025, 11, 14),
    location: "قاعة العروض، تارودانت",
    agenda: "تعديل القانون الأساسي بإضافة نشاط التوضيب والتلفيف\nتغيير مقر التعاونية",
    decisions:
      "الموافقة على التعديل بأغلبية 28 صوتاً\nاعتماد المقر الجديد بمدينة تارودانت\nالتكليف بتثمين التعديل لدى السلطات المختصة",
    attendeesCount: 30,
    status: "HELD",
    createdAt: at(2025, 11, 14),
  },
  {
    id: 5,
    cooperativeId: 1,
    type: "ORDINARY",
    date: rel(38),
    location: "مقر التعاونية، تارودانت",
    agenda: "التقريران الأدبي والمالي لسنة 2026\nالمصادقة على الحسابات السنوية\nتجديد نصف أعضاء المجلس\nتحديد برنامج نشاط 2027",
    decisions: null,
    attendeesCount: 0,
    status: "SCHEDULED",
    createdAt: rel(-10),
  },
];

// ─────────────────────────── اجتماعات مجلس الإدارة ────────────────────────
export const meetings: Meeting[] = [
  {
    id: 1,
    cooperativeId: 1,
    date: at(2026, 1, 15),
    agenda: "مراجعة الحسابات الختامية لسنة 2025\nمناقشة برنامج التسويق السنوي",
    decisions: "المصادقة على الحسابات الختامية وإحالتها على المراقب\nاعتماد خطة المشاركة في المعارض الجهوية",
    attendeesCount: 7,
    createdAt: at(2026, 1, 15),
  },
  {
    id: 2,
    cooperativeId: 1,
    date: at(2026, 3, 10),
    agenda: "تحضير الدورة التكوينية بالشراكة مع مكتب تنمية التعاون",
    decisions: "تحديد لائحة العضوات المستفيدات من التكوين\nتخصيص غلاف مالي للتنقل والإيواء",
    attendeesCount: 6,
    createdAt: at(2026, 3, 10),
  },
  {
    id: 3,
    cooperativeId: 1,
    date: at(2026, 6, 4),
    agenda: "تقييم موسم البيع وتدبير المخزون\nدراسة طلبات الانخراط الجديدة",
    decisions: "الرفع في مخزون التوابل استعداداً لموسم نونبر\nقبول 3 طلبات انخراط جديدة",
    attendeesCount: 7,
    createdAt: at(2026, 6, 4),
  },
  {
    id: 4,
    cooperativeId: 1,
    date: at(2026, 9, 12),
    agenda: "تحضير الجمع العام العادي السنوي\nمراجعة مشروع التقريرين الأدبي والمالي",
    decisions: "تحديد تاريخ الجمع العام ومحل انعقاده\nإعداد قائمة الوجبات التنبيهية للأعضاء",
    attendeesCount: 6,
    createdAt: at(2026, 9, 12),
  },
  {
    id: 5,
    cooperativeId: 1,
    date: rel(12),
    agenda: "تحضير ملف طلب الدعم\nتحيين معطيات السجل المركزي لدى مكتب تنمية التعاون",
    decisions: null,
    attendeesCount: 0,
    createdAt: rel(-2),
  },
];

// ─────────────────────────── الحركات المالية (22 شهراً) ───────────────────
function genTransactions(): Transaction[] {
  const rows: Transaction[] = [];
  let id = 1;
  const push = (
    type: "INCOME" | "EXPENSE",
    category: string,
    amount: number,
    date: string,
    description: string,
    method = "BANK"
  ) =>
    rows.push({
      id: id++,
      cooperativeId: 1,
      type,
      category,
      amount: Math.round(amount),
      date,
      description,
      method,
      reference: null,
      createdAt: date,
    });

  for (let k = 22; k >= 0; k--) {
    const d = new Date(NOW.getFullYear(), NOW.getMonth() - k, 8, 12);
    if (d.getTime() > NOW.getTime()) continue;
    const iso = d.toISOString();
    const m = d.getMonth();
    const season = 1 + 0.22 * Math.sin(((m + 3) / 12) * 2 * Math.PI);
    const wig = (n: number) => ((k * 137 + n * 53) % 17) * 55;
    push("INCOME", "بيع المنتوجات", 26_000 * season + wig(1), iso, "مداخيل بيع زيت أركان والتوابل", "BANK");
    push("INCOME", "اشتراكات الأعضاء", 3_200, iso, "الاشتراكات الشهرية للعضوات", "CASH");
    push("EXPENSE", "مواد أولية", 12_500 + wig(2), iso, "اقتناء لوز الأركان من المنتجين المحليين", "CASH");
    push("EXPENSE", "الأجور والتعويضات", d >= new Date(2026, 5, 1) ? 8_800 : 8_000, iso, "أجور مستخدمات وحدة العصر", "BANK");
    push("EXPENSE", "الكراء", 2_500, iso, "كراء المحل ووحدة التخزين", "BANK");
    push("EXPENSE", "الماء والكهرباء", 540 + wig(3), iso, "فاتورة الماء والكهرباء", "BANK");
    if (k % 3 === 0)
      push("EXPENSE", "النقل والتوزيع", 1_700 + wig(4), iso, "نقل المنتوجات نحو مراكز التوزيع", "CASH");
  }
  // عمليات استثنائية
  push("INCOME", "منح ودعم", 45_000, at(2025, 2, 17), "منحة مكتب تنمية التعاون لاقتناء عصرية حديثة", "BANK");
  push("EXPENSE", "التجهيزات", 28_000, at(2025, 4, 3), "اقتناء وحدتي تلفيف وتوضيب", "CHEQUE");
  push("INCOME", "منح ودعم", 30_000, at(2025, 11, 12), "دعم برنامج التعاونيات النسائية — كتابة الدولة", "BANK");
  push("EXPENSE", "التكوين", 6_500, at(2026, 2, 9), "تكوين العضوات في التسويق الرقمي", "BANK");
  push("INCOME", "أنشطة التكوين", 4_000, at(2026, 3, 21), "تنشيط ورشة تكوينية لفائدة تعاونية شريكة", "CASH");
  push("EXPENSE", "التجهيزات", 15_500, at(2026, 7, 8), "تجهيز المخزن الجديد", "BANK");
  push("EXPENSE", "رسوم إدارية", 950, at(2026, 4, 22), "رسوم التصريحات والتسجيلات الإدارية", "BANK");

  return rows.sort((a, b) => (a.date < b.date ? 1 : -1)).map((r, i) => ({ ...r, id: i + 1 }));
}
export const transactions: Transaction[] = genTransactions();

// ─────────────────────────── سجل الوثائق (التعاونية 1) ────────────────────
const documentsBase: Omit<DocumentItem, "isShared">[] = [
  { id: 1, cooperativeId: 1, title: "القانون الأساسي المصادق عليه", type: "STATUTE", reference: "ن.أ/2016/01", issueDate: at(2016, 3, 12), expiryDate: null, status: "VALID", notes: "النسخة المحدثة بعد تعديل 2025", createdAt: at(2016, 3, 12) },
  { id: 2, cooperativeId: 1, title: "محضر الجمع العام التأسيسي", type: "MINUTE", reference: "م.ت/2016/01", issueDate: at(2016, 3, 12), expiryDate: null, status: "ARCHIVED", notes: null, createdAt: at(2016, 3, 12) },
  { id: 3, cooperativeId: 1, title: "محضر الجمع العام العادي 2024", type: "MINUTE", reference: "م.ع/2024/06", issueDate: at(2024, 6, 14), expiryDate: null, status: "ARCHIVED", notes: null, createdAt: at(2024, 6, 14) },
  { id: 4, cooperativeId: 1, title: "محضر الجمع العام العادي 2025", type: "MINUTE", reference: "م.ع/2025/06", issueDate: at(2025, 6, 20), expiryDate: null, status: "VALID", notes: null, createdAt: at(2025, 6, 20) },
  { id: 5, cooperativeId: 1, title: "محضر الجمع العام الاستثنائي 2025", type: "MINUTE", reference: "م.إ/2025/11", issueDate: at(2025, 11, 14), expiryDate: null, status: "VALID", notes: "تعديل القانون الأساسي", createdAt: at(2025, 11, 14) },
  { id: 6, cooperativeId: 1, title: "التقرير المالي لسنة 2025", type: "FINANCIAL", reference: "ت.م/2025", issueDate: at(2026, 2, 10), expiryDate: null, status: "VALID", notes: "مصادق عليه من المراقب", createdAt: at(2026, 2, 10) },
  { id: 7, cooperativeId: 1, title: "التقرير الأدبي لسنة 2025", type: "FINANCIAL", reference: "ت.أ/2025", issueDate: at(2026, 2, 10), expiryDate: null, status: "VALID", notes: null, createdAt: at(2026, 2, 10) },
  { id: 8, cooperativeId: 1, title: "بطاقة الاعتراف — مكتب تنمية التعاون", type: "ODCO", reference: "OD-2016-0432", issueDate: at(2016, 5, 2), expiryDate: rel(45), status: "VALID", notes: "ينبغي طلب التجديد قبل الأجل", createdAt: at(2016, 5, 2) },
  { id: 9, cooperativeId: 1, title: "وصل التسجيل بالسجل المحلي", type: "ODCO", reference: "ر.م/1526/2016", issueDate: at(2016, 4, 18), expiryDate: null, status: "VALID", notes: "كتابة ضبط المحكمة الابتدائية بتارودانت", createdAt: at(2016, 4, 18) },
  { id: 10, cooperativeId: 1, title: "التصريح السنوي بالضريبة المهنية 2026", type: "TAX", reference: "ض.م/2026", issueDate: at(2026, 4, 30), expiryDate: null, status: "VALID", notes: null, createdAt: at(2026, 4, 30) },
  { id: 11, cooperativeId: 1, title: "التصريح السنوي لدى الضمان الاجتماعي 2026", type: "TAX", reference: "CNSS/2026", issueDate: at(2026, 2, 28), expiryDate: null, status: "VALID", notes: null, createdAt: at(2026, 2, 28) },
  { id: 12, cooperativeId: 1, title: "عقد كراء المحل ووحدة التخزين", type: "CONTRACT", reference: "ع.ك/2025", issueDate: at(2025, 1, 1), expiryDate: rel(70), status: "VALID", notes: "تجديد سنوي في يناير", createdAt: at(2025, 1, 1) },
  { id: 13, cooperativeId: 1, title: "عقد اقتناء وحدتي تلفيف", type: "CONTRACT", reference: "ع.ت/2025/04", issueDate: at(2025, 4, 3), expiryDate: null, status: "VALID", notes: "ضمان سنتان", createdAt: at(2025, 4, 3) },
  { id: 14, cooperativeId: 1, title: "شهادة التسمية (ODCO)", type: "ODCO", reference: "ش.ت/2016/009", issueDate: at(2016, 1, 20), expiryDate: null, status: "ARCHIVED", notes: null, createdAt: at(2016, 1, 20) },
  { id: 15, cooperativeId: 1, title: "تقرير التدقيق المالي 2025", type: "FINANCIAL", reference: "ت.د/2026", issueDate: at(2026, 3, 5), expiryDate: null, status: "VALID", notes: null, createdAt: at(2026, 3, 5) },
];

// ─────────────────────────── الجهات الوصية (9) ─────────────────────────────
export const entities: GovEntity[] = [
  {
    id: 1,
    name: "مكتب تنمية التعاون",
    acronym: "ODCO",
    type: "OFFICE",
    supervisor: "الوزارة المكلفة بالاقتصاد الاجتماعي والتضامني",
    missions: "مسك السجل المركزي للتعاونيات\nالمصادقة على طلبات شهادات التسمية للتعاونيات واتحاداتها\nدعم التعاونيات في ميادين التكوين والإعلام والمساعدة التقنية والقانونية\nإصدار بطاقات الاعتراف ومواكبة مشاريع التأسيس",
    website: "https://www.odco.gov.ma",
    phone: null,
    email: null,
    address: "الرباط، المملكة المغربية",
  },
  {
    id: 2,
    name: "كتابة الدولة المكلفة بالصناعة التقليدية والاقتصاد الاجتماعي والتضامني",
    acronym: "SEAESS",
    type: "MINISTRY",
    supervisor: "الحكومة",
    missions: "إعداد وتنفيذ السياسة الحكومية في مجال الاقتصاد الاجتماعي والتضامني\nتأطير ودعم التعاونيات والصناعة التقليدية\nتنزيل البرامج الوطنية لدعم القطاع التعاوني",
    website: "https://mtaess.gov.ma/ar",
    phone: null,
    email: null,
    address: "الرباط، المملكة المغربية",
  },
  {
    id: 3,
    name: "المديرية العامة للضرائب",
    acronym: "DGI",
    type: "AGENCY",
    supervisor: "وزارة الاقتصاد والمالية",
    missions: "تدبير المنظومة الجبائية للدولة\nتسلم التصريحات والوصولات الجبائية\nمتابعة الامتثال الضريبي للتعاونيات المشكَّلة والمسجلة طبق القانون",
    website: "https://www.tax.gov.ma",
    phone: null,
    email: null,
    address: "الرباط، المملكة المغربية",
  },
  {
    id: 4,
    name: "الصندوق الوطني للضمان الاجتماعي",
    acronym: "CNSS",
    type: "OFFICE",
    supervisor: "وزارة الشغل والإدماج المهني",
    missions: "تصريح وتغطية الأجراء والمستخدمين العاملين لدى التعاونيات\nتسلم شهادات الانخراط والمستخرجات\nتحصيل المساهمات الاجتماعية",
    website: "https://www.cnss.ma",
    phone: null,
    email: null,
    address: "الدار البيضاء، المملكة المغربية",
  },
  {
    id: 5,
    name: "المكتب الوطني للاستشارة الفلاحية",
    acronym: "ONCA",
    type: "OFFICE",
    supervisor: "وزارة الفلاحة والصيد البحري والتنمية القروية والمياه والغابات",
    missions: "الإرشاد الفني والمواكبة الميدانية للتعاونيات الفلاحية\nتنظيم دورات التكوين لفائدة الفلاحين المنخرطين\nتأطير الأنشطة الفلاحية وبرامج التحسين",
    website: "https://www.onca.ma",
    phone: null,
    email: null,
    address: "الرباط، المملكة المغربية",
  },
  {
    id: 6,
    name: "وزارة الفلاحة والصيد البحري والتنمية القروية والمياه والغابات",
    acronym: null,
    type: "MINISTRY",
    supervisor: "الحكومة",
    missions: "وضع وتنفيذ السياسة الفلاحية والبرامج الداعمة\nدعم التعاونيات الفلاحية عبر برامج الغرس والتجهيز والتسويق\nالتحفيز على التنظيم الجماعي للمنتجين",
    website: "https://www.agriculture.gov.ma",
    phone: null,
    email: null,
    address: "الرباط، المملكة المغربية",
  },
  {
    id: 7,
    name: "مركز الاستثمار الجهوي — سوس-ماسة",
    acronym: "CRI",
    type: "AGENCY",
    supervisor: "ولاية جهة سوس-ماسة",
    missions: "تسهيل مساطر إحداث المقاولات\nتسلم الشهادات الإدارية والجبائية\nمواكبة المشاريع الاستثمارية بالجهة",
    website: null,
    phone: null,
    email: null,
    address: "أگادير، المملكة المغربية",
  },
  {
    id: 8,
    name: "المحكمة الابتدائية — كتابة الضبط",
    acronym: null,
    type: "COURT",
    supervisor: "وزارة العدل",
    missions: "مسك السجل المحلي للتعاونيات والتقييدات المعدلة والتشطيب\nتسلم المستخرجات والشهادات من السجل المحلي\nتطبيق المرسوم 2.15.617 وقرار 1369.16",
    website: null,
    phone: null,
    email: null,
    address: "تارودانت، المملكة المغربية",
  },
  {
    id: 9,
    name: "السلطة المحلية (القيادة / الباشوية)",
    acronym: null,
    type: "LOCAL_AUTHORITY",
    supervisor: "وزارة الداخلية",
    missions: "تلقي التصريحات بتأسيس التعاونيات والتغييرات اللاحقة\nتسلم وصولات الإيداع\nإحالة الملفات على السجل المركزي",
    website: null,
    phone: null,
    email: null,
    address: "أولاد برحيل، إقليم تارودانت",
  },
];

// ─────────────────────────── التفاعلات مع الجهات (14) ──────────────────────
export const interactions: EntityInteraction[] = [
  { id: 1, entityId: 1, cooperativeId: 1, date: rel(-25), type: "DECLARATION", subject: "طلب تجديد بطاقة الاعتراف بعد تجديد المجلس", status: "IN_PROGRESS", notes: "في انتظار إيداع محضر الجمع العام الأخير", createdAt: rel(-25) },
  { id: 2, entityId: 1, cooperativeId: 1, date: at(2026, 2, 9), type: "SUPPORT", subject: "مواكبة برنامج التكوين في التسويق الرقمي", status: "DONE", notes: "دورة تكوينية لفائدة 20 عضوة", createdAt: at(2026, 2, 9) },
  { id: 3, entityId: 2, cooperativeId: 1, date: rel(-40), type: "SUPPORT", subject: "طلب الانخراط في برنامج دعم التعاونيات النسائية", status: "IN_PROGRESS", notes: "استكمال ملف المرفقات التقنية", createdAt: rel(-40) },
  { id: 4, entityId: 3, cooperativeId: 1, date: at(2026, 4, 30), type: "DECLARATION", subject: "التصريح السنوي بالضريبة المهنية برسم 2026", status: "DONE", notes: null, createdAt: at(2026, 4, 30) },
  { id: 5, entityId: 3, cooperativeId: 1, date: rel(-8), type: "REQUEST", subject: "طلب شهادة عدم المديونية الضريبية", status: "PENDING", notes: "ضرورية لملف صفقة عمومية", createdAt: rel(-8) },
  { id: 6, entityId: 4, cooperativeId: 1, date: at(2026, 2, 28), type: "DECLARATION", subject: "التصريح السنوي بالمستخدمات والأجراء 2025", status: "DONE", notes: null, createdAt: at(2026, 2, 28) },
  { id: 7, entityId: 4, cooperativeId: 1, date: rel(-70), type: "REQUEST", subject: "طلب مستخرج من حساب الانخراط السنوي", status: "DONE", notes: null, createdAt: rel(-70) },
  { id: 8, entityId: 5, cooperativeId: 1, date: at(2026, 5, 14), type: "VISIT", subject: "زيارة إرشادية لوحدة العصر وتقييم جودة التخزين", status: "DONE", notes: "توصيات بتحسين تهوية المخزن", createdAt: at(2026, 5, 14) },
  { id: 9, entityId: 6, cooperativeId: 1, date: rel(-15), type: "SUPPORT", subject: "طلب الدعم في إطار برنامج تحديث البساتين", status: "PENDING", notes: "الرد داخل أجل 60 يوماً", createdAt: rel(-15) },
  { id: 10, entityId: 7, cooperativeId: 1, date: rel(-12), type: "REQUEST", subject: "طلب شهادات جبائية لملف صفقة عمومية", status: "IN_PROGRESS", notes: null, createdAt: rel(-12) },
  { id: 11, entityId: 8, cooperativeId: 1, date: at(2025, 11, 14), type: "DECLARATION", subject: "التقييد بالمحضر الانتخابي للمجلس الجديد", status: "DONE", notes: null, createdAt: at(2025, 11, 14) },
  { id: 12, entityId: 8, cooperativeId: 1, date: at(2026, 6, 20), type: "REQUEST", subject: "مستخرج من السجل المحلي للتعاونية", status: "DONE", notes: null, createdAt: at(2026, 6, 20) },
  { id: 13, entityId: 9, cooperativeId: 1, date: rel(-95), type: "DECLARATION", subject: "إيداع محضر تغيير مقر التعاونية", status: "DONE", notes: null, createdAt: rel(-95) },
  { id: 14, entityId: 3, cooperativeId: 1, date: at(2026, 3, 5), type: "AUDIT", subject: "فحص حسابات السنة المالية 2025", status: "DONE", notes: "لا ملاحظات جوهرية", createdAt: at(2026, 3, 5) },
];

// ─────────────────────────── مكتبة القوانين واللوائح (10) ──────────────────
export const regulations: Regulation[] = [
  {
    id: 1,
    code: "112.12",
    title: "القانون رقم 112.12 المتعلق بالتعاونيات",
    year: 2014,
    category: "LAW",
    authority: "البرلمان — صادر بتنفيذه الظهير الشريف بتاريخ 21 نونبر 2014 (الجريدة الرسمية عدد 6318)",
    summary:
      "الإطار القانوني العام المنظم لتأسيس التعاونيات وتسييرها ومراقبتها بالمغرب. حلّ محل القانون رقم 24.83، مع تبسيط مسطرة التأسيس وإرساء سجل مركزي وسجلات محلية ذات قوة قانونية.",
    keyPoints: [
      "التأسيس من 5 أعضاء على الأقل بدل 7 سابقاً",
      "حذف نظام الترخيص واعتماد نظام التصريح بالتأسيس",
      "رأس المال الاجتماعي الأدنى: 1000 درهم",
      "إحداث سجل مركزي يمسكه مكتب تنمية التعاون وسجلات محلية بكتابة ضبط المحاكم الابتدائية",
      "عقد الجمع العام العادي مرة واحدة على الأقل في السنة",
      "الرقابة الديمقراطية: عضو واحد = صوت واحد",
      "إمكانية التعامل مع غير الأعضاء وفق شروط محددة",
    ],
    status: "IN_FORCE",
    url: "https://www.odco.gov.ma",
    createdAt: at(2014, 11, 21),
  },
  {
    id: 2,
    code: "2.15.617",
    title: "المرسوم رقم 2.15.617 بتحديد قواعد تنظيم وتسيير سجل التعاونيات",
    year: 2016,
    category: "DECREE",
    authority: "الحكومة — صادر في 24 مارس 2016 (الجريدة الرسمية عدد 6455 بتاريخ 11 أبريل 2016)",
    summary:
      "يحدد قواعد تنظيم وتسيير السجل المركزي والسجلات المحلية للتعاونيات، وكيفيات التقييد والتقييدات المعدلة والتشطيب.",
    keyPoints: [
      "تحديد كيفيات التقييد بالسجل المحلي لدى كتابة ضبط المحكمة الابتدائية",
      "آجال إحالة الملفات من السلطة المحلية على مكتب تنمية التعاون للتقييد بالسجل المركزي",
      "مضمون بطاقات التسجيل والمستخرجات المسلمة للأعضاء والغير",
    ],
    status: "IN_FORCE",
    url: "https://www.odco.gov.ma",
    createdAt: at(2016, 3, 24),
  },
  {
    id: 3,
    code: "1369.16",
    title: "قرار وزير العدل والحريات رقم 1369.16",
    year: 2016,
    category: "DECREE",
    authority: "وزارة العدل والحريات — 09 ماي 2016",
    summary:
      "يحدد شكل ومضمون السجل المحلي للتعاونيات، ونماذج استمارات طلبات التسجيل والتقييدات المعدلة والتشطيب، وكذا نموذج شهادة ومستخرج من السجل.",
    keyPoints: [
      "توحيد نماذج استمارات التسجيل على الصعيد الوطني",
      "رقمنة تدريجية للسجلات المحلية",
    ],
    status: "IN_FORCE",
    url: null,
    createdAt: at(2016, 5, 9),
  },
  {
    id: 4,
    code: "24.83",
    title: "القانون رقم 24.83 المتعلق بالتعاونيات (ملغى)",
    year: 1983,
    category: "LAW",
    authority: "البرلمان — 1983",
    summary:
      "الإطار القانوني السابق للتعاونيات. كشفت الممارسة عن ثغراته: تشعب إجراءات التأسيس، تعدد الجهات المتدخلة وتداخل صلاحياتها، وضعف آليات التدبير — فتم تجاوزه بالقانون 112.12.",
    keyPoints: [
      "كان يفرض 7 أعضاء مؤسسين على الأقل",
      "أخضع التأسيس لنظام الترخيص",
      "ألغي بموجب القانون رقم 112.12",
    ],
    status: "REPEALED",
    url: null,
    createdAt: at(1983, 1, 1),
  },
  {
    id: 5,
    code: "10.21",
    title: "القانون الإطار رقم 10.21 المتعلق بالاقتصاد الاجتماعي والتضامني",
    year: 2023,
    category: "LAW",
    authority: "البرلمان — 2023",
    summary:
      "قانون إطار يؤطر منظمات الاقتصاد الاجتماعي والتضامني ومن ضمنها التعاونيات، ويرسي رؤية استراتيجية لتطوير القطاع ودوره في التنمية والتشغيل.",
    keyPoints: [
      "الاعتراف بالمقاولات الاجتماعية كفاعل اقتصادي",
      "إرساء آليات التأهيل والتمويل الخاصة بالقطاع",
      "تعبئة الهيئات المهتمة بالنفع العام لدعم المنظمات التعاونية",
    ],
    status: "IN_FORCE",
    url: null,
    createdAt: at(2023, 2, 1),
  },
  {
    id: 6,
    code: "م.ع.ض — م.4",
    title: "المدونة العامة للضرائب — الإعفاءات الخاصة بالتعاونيات",
    year: 2026,
    category: "TAX",
    authority: "وزارة الاقتصاد والمالية",
    summary:
      "تقرر المدونة إعفاءات ضريبية لفائدة التعاونيات المشكَّلة والعاملة وفق القانون المنظم للتعاونيات، تحت شروط تتعلق بطبيعة عملياتها وبتوزيع فوائضها.",
    keyPoints: [
      "الإعفاء مشروط بالاحترام الكامل لمقتضيات القانون المنظم للتعاونيات",
      "التصريحات السنوية المنتظمة لدى المديرية العامة للضرائب",
      "يستحسن استشارة خبير جبائي عند كل تغيير في النشاط",
    ],
    status: "IN_FORCE",
    url: "https://www.tax.gov.ma",
    createdAt: at(2026, 1, 1),
  },
  {
    id: 7,
    code: "ICA-7",
    title: "مبادئ التعاون السبعة — التحالف التعاوني الدولي",
    year: 1995,
    category: "PRINCIPLE",
    authority: "التحالف التعاوني الدولي (ICA) — مانشستر 1995",
    summary:
      "المرجعية العالمية لقيم التعاون التي تلتزم بها التعاونيات المنضوية تحت التحالف، وتشكل جوهر الهوية التعاونية.",
    keyPoints: [
      "العضوية الطوعية والمفتوحة",
      "الرقابة الديمقراطية من طرف الأعضاء",
      "المشاركة الاقتصادية للأعضاء",
      "الاستقلالية والحياد",
      "التربية والتكوين والمعلومات",
      "التعاون فيما بين التعاونيات",
      "الاهتمام بالمجتمع المحلي",
    ],
    status: "REFERENCE",
    url: "https://www.ica.coop",
    createdAt: at(1995, 9, 1),
  },
  {
    id: 8,
    code: "IYC-2025",
    title: "السنة الدولية للتعاونيات 2025",
    year: 2025,
    category: "INTERNATIONAL",
    authority: "الأمم المتحدة",
    summary:
      "أعلنت الجمعية العامة للأمم المتحدة سنة 2025 سنة دولية للتعاونيات تحت شعار «التعاونيات تبني عالماً أفضل»، احتفاءً بمساهمتها في التنمية المستدامة.",
    keyPoints: [
      "إبراز دور التعاونيات في التحول الاقتصادي والاجتماعي",
      "المغرب من الدول الفاعلة بأزيد من 65 ألف تعاونية نشيطة",
    ],
    status: "REFERENCE",
    url: null,
    createdAt: at(2025, 1, 1),
  },
  {
    id: 9,
    code: "ODCO-GUIDE",
    title: "دليل تأسيس وتسيير التعاونيات",
    year: 2024,
    category: "GUIDE",
    authority: "مكتب تنمية التعاون",
    summary:
      "دليل عملي يرشد المؤسسين إلى مسار تأسيس التعاونية خطوة بخطوة، ويلخص الالتزامات السنوية أثناء التسيير.",
    keyPoints: [
      "مسار التأسيس في 6 خطوات أساسية",
      "النموذج الاسترشادي للقانون الأساسي",
      "الالتزامات السنوية: الجمع العام والتصريحات",
    ],
    status: "REFERENCE",
    url: "https://www.odco.gov.ma",
    createdAt: at(2024, 1, 1),
  },
  {
    id: 10,
    code: "ILO-193",
    title: "توصية منظمة العمل الدولية رقم 193 بشأن تعزيز التعاونيات",
    year: 2002,
    category: "INTERNATIONAL",
    authority: "منظمة العمل الدولية (ILO)",
    summary:
      "توصية دولية تدعو الدول الأعضاء إلى تهيئة بيئة قانونية ومؤسساتية مواتية لتطور التعاونيات وإدماجها في السياسات الوطنية للتنمية والتشغيل.",
    keyPoints: [
      "تمكين التعاونيات من الاستفادة من السياسات الداعمة",
      "توفير التكوين والمعلومات للأعضاء",
      "تشجيع التعاون بين التعاونيات عبر الوطنية",
    ],
    status: "REFERENCE",
    url: null,
    createdAt: at(2002, 6, 1),
  },
];

// ─────────────────────────── الالتزامات والمواعيد (8) ──────────────────────
export const tasks: ComplianceTask[] = [
  { id: 1, cooperativeId: 1, title: "عقد الجمع العام العادي السنوي 2026", description: "عرض التقريرين الأدبي والمالي، المصادقة على الحسابات، وتجديد نصف أعضاء المجلس.", type: "ASSEMBLY", dueDate: rel(38), status: "PENDING", createdAt: rel(-10) },
  { id: 2, cooperativeId: 1, title: "إيداع محضر الجمع العام لدى السلطة المحلية", description: "داخل الأجل القانوني بعد انعقاد الجمع العام.", type: "ASSEMBLY", dueDate: rel(55), status: "PENDING", createdAt: rel(-10) },
  { id: 3, cooperativeId: 1, title: "تحديث المعطيات بالسجل المركزي (ODCO)", description: "تحيين تركيبة المجلس والمقر الجديد بعد الجمع العام الاستثنائي.", type: "ODCO", dueDate: rel(20), status: "PENDING", createdAt: rel(-5) },
  { id: 4, cooperativeId: 1, title: "التصريح السنوي بالضريبة المهنية 2027", description: "التصريح لدى المديرية العامة للضرائب.", type: "TAX", dueDate: at(2027, 4, 30), status: "PENDING", createdAt: rel(-3) },
  { id: 5, cooperativeId: 1, title: "التصريح السنوي لدى الضمان الاجتماعي", description: "تصريح المستخدمات والأجراء لدى الصندوق الوطني للضمان الاجتماعي.", type: "CNSS", dueDate: at(2027, 2, 28), status: "PENDING", createdAt: rel(-3) },
  { id: 6, cooperativeId: 1, title: "إعداد الحسابات السنوية لسنة 2026", description: "إعداد الحسابات وإخضاعها لمراقبة مراقب الحسابات قبل الجمع العام.", type: "TAX", dueDate: at(2027, 3, 31), status: "PENDING", createdAt: rel(-3) },
  { id: 7, cooperativeId: 1, title: "تجديد عقد كراء المحل", description: "تفاوض شروط الكراء السنوي مع المالك.", type: "RENEWAL", dueDate: rel(70), status: "PENDING", createdAt: rel(-15) },
  { id: 8, cooperativeId: 1, title: "التصريح بالضريبة المهنية 2026", description: "تم الإيداع في الأجل.", type: "TAX", dueDate: at(2026, 4, 30), status: "DONE", createdAt: at(2026, 1, 10) },
];

/** الوثائق: القانون الأساسي والمحاضر تُشارك مع المتعاقدين */
export const documents: DocumentItem[] = documentsBase.map((d) => ({
  ...d,
  isShared: d.type === "STATUTE" || d.type === "MINUTE",
}));

// ─────────────────────────── مستخدمو العرض حسب الأدوار ─────────────────────
// كلمة المرور الموحدة للعرض والبذر: cmdp2026
const usersBase: Omit<AppUser, "photo" | "idDocuments">[] = [
  { id: 1, username: "superadmin", fullName: "طاريق الشويكة", role: "SUPER_ADMIN", accountType: null, cooperativeId: null, cooperativeName: null, status: "ACTIVE", phone: "06 00 00 00 01", email: "owner@cmdp.ma", cin: null, createdAt: at(2026, 1, 5) },
  { id: 2, username: "admin", fullName: "مدير المنصة", role: "ADMIN", accountType: null, cooperativeId: null, cooperativeName: null, status: "ACTIVE", phone: "06 00 00 00 02", email: "admin@cmdp.ma", cin: null, createdAt: at(2026, 1, 6) },
  { id: 3, username: "president", fullName: "فاطمة أيت الحاج", role: "COADMIN", accountType: "PRESIDENT", cooperativeId: 1, cooperativeName: "تعاونية تافوكت لإنتاج زيت أركان", status: "ACTIVE", phone: "06 61 23 45 67", email: "contact@tafoukt.ma", cin: "AB123456", createdAt: at(2016, 3, 12) },
  { id: 4, username: "manager", fullName: "خديجة بن عمر", role: "COADMIN", accountType: "MANAGER", cooperativeId: 2, cooperativeName: "تعاونية نسج الأطلس للنسيج التقليدي", status: "ACTIVE", phone: "06 62 34 56 78", email: null, cin: "CD234567", createdAt: at(2018, 5, 20) },
  { id: 5, username: "member", fullName: "مليكة أوعلي", role: "USER", accountType: "MEMBER", cooperativeId: 1, cooperativeName: "تعاونية تافوكت لإنتاج زيت أركان", status: "ACTIVE", phone: "06 70 45 67 89", email: null, cin: "EE345678", createdAt: at(2019, 4, 2) },
  { id: 6, username: "contractor", fullName: "شركة وافي للتغليف", role: "USER", accountType: "CONTRACTOR", cooperativeId: 3, cooperativeName: "تعاونية دار الزليج للصناعة التقليدية", status: "ACTIVE", phone: "05 22 33 44 55", email: "contact@wafi.ma", cin: null, createdAt: at(2025, 2, 10) },
  { id: 7, username: "candidate1", fullName: "يوسف المرابط", role: "USER", accountType: "MEMBER", cooperativeId: 1, cooperativeName: "تعاونية تافوكت لإنتاج زيت أركان", status: "PENDING", phone: "06 11 22 33 44", email: "youssef@mail.ma", cin: "FG456789", createdAt: rel(-3) },
  { id: 8, username: "partner1", fullName: "مؤسسة النخيل للتسويق", role: "USER", accountType: "CONTRACTOR", cooperativeId: 4, cooperativeName: "تعاونية واحة النخيل لتحويل التمور", status: "PENDING", phone: "05 35 66 77 88", email: "contact@nakhil.ma", cin: null, createdAt: rel(-5) },
  { id: 9, username: "amelatlas", fullName: "رشيد أمزيل", role: "COADMIN", accountType: "PRESIDENT", cooperativeId: 10, cooperativeName: "تعاونية أمل الأطلس للصناعة التقليدية", status: "PENDING", phone: "06 78 11 22 33", email: "amelatlas@contact.ma", cin: "HI567890", createdAt: rel(-12) },
];

// بيانات العرض بلا مرفقات هوية — تُستكمل بصور/وثائق حقيقية عند إضافتها من الواجهة
export const users: AppUser[] = usersBase.map((u) => ({ ...u, photo: null, idDocuments: null }));

// ─────────────────────────── طلبات الانخراط ────────────────────────────────
export const joinRequests: JoinRequest[] = [
  { id: 1, cooperativeId: 1, userId: 7, fullName: "يوسف المرابط", cin: "FG456789", phone: "06 11 22 33 44", email: "youssef@mail.ma", requestType: "MEMBERSHIP", motivation: "خبرة 5 سنوات في التسويق الرقمي للمنتجات المجالية، ورغبة في المساهمة في تطوير مبيعات التعاونية إلكترونياً.", shares: 2, status: "PENDING", decidedBy: null, decisionNote: null, createdAt: rel(-3), cooperative: { id: 1, name: "تعاونية تافوكت لإنتاج زيت أركان", sector: "الفلاحة والمنتجات المجالية", region: "سوس-ماسة" } },
  { id: 2, cooperativeId: 4, userId: 8, fullName: "مؤسسة النخيل للتسويق", cin: null, phone: "05 35 66 77 88", email: "contact@nakhil.ma", requestType: "CONTRACT", motivation: "شراكة لتوزيع التمور الموضبة داخل المراكز التجارية الكبرى بالدار البيضاء والرباط.", shares: 0, status: "PENDING", decidedBy: null, decisionNote: null, createdAt: rel(-5), cooperative: { id: 4, name: "تعاونية واحة النخيل لتحويل التمور", sector: "الفلاحة والمنتجات المجالية", region: "درعة-تافيلالت" } },
  { id: 3, cooperativeId: 2, userId: null, fullName: "نعيمة الصنهاجي", cin: "IJ678901", phone: "06 44 55 66 77", email: "naima@mail.ma", requestType: "MEMBERSHIP", motivation: "حرفية في النسج الأمازيغي، أرغب في الانخراط لنقل مهاراتي للعنصر النسائية الجدد.", shares: 1, status: "APPROVED", decidedBy: "خديجة بن عمر", decisionNote: "تمت المصادقة في اجتماع المجلس.", createdAt: rel(-30), cooperative: { id: 2, name: "تعاونية نسج الأطلس للنسيج التقليدي", sector: "الصناعة التقليدية", region: "مراكش-آسفي" } },
  { id: 4, cooperativeId: 3, userId: null, fullName: "مكتب الدراسات أفق", cin: null, phone: "05 55 11 22 33", email: "etudehorizon@mail.ma", requestType: "CONTRACT", motivation: "مواكبة في إعداد دفتر التكاليف وملفات الصفقات العمومية.", shares: 0, status: "REJECTED", decidedBy: "محمد الشرقاوي", decisionNote: "سبق التعاقد مع مكتب آخر لهذه المهمة.", createdAt: rel(-45), cooperative: { id: 3, name: "تعاونية دار الزليج للصناعة التقليدية", sector: "الصناعة التقليدية", region: "فاس-مكناس" } },
];

// ─────────────────────────── فرص العمل والتعاقد ────────────────────────────
export const opportunities: Opportunity[] = [
  { id: 1, cooperativeId: 1, type: "JOB", title: "مسؤول(ة) التسويق الرقمي", description: "تدبير الحضور الرقمي للتعاونية: متاجر إلكترونية، شبكات التواصل، وتتبع الطلبات الوطنية والدولية لزيت أركان البيولوجي المعتمد.", sector: "الفلاحة والمنتجات المجالية", region: "سوس-ماسة", city: "أولاد برحيل", positions: 1, contractType: "CDD", requirements: "شهادة في التسويق أو التجارة • خبرة سنة على الأقل في التجارة الإلكترونية • إتقان الفرنسية والعربية", deadline: rel(21), contactEmail: "contact@tafoukt.ma", contactPhone: "06 61 23 45 67", status: "OPEN", createdAt: rel(-6), cooperative: { id: 1, name: "تعاونية تافوكت لإنتاج زيت أركان", sector: "الفلاحة والمنتجات المجالية", region: "سوس-ماسة", phone: "06 61 23 45 67", email: "contact@tafoukt.ma" }, applicationsCount: 4 },
  { id: 2, cooperativeId: 1, type: "SERVICE_NEED", title: "طلب خدمة: مراجعة محاسبية للحسابات السنوية", description: "التعاونية تبحث عن مكتب محاسبة معتمد لمراجعة الحسابات السنوية 2026 وإعداد التصريحات الجبائية.", sector: "الخدمات", region: "سوس-ماسة", city: "تارودانت", positions: 1, contractType: "MISSION", requirements: "محاسب قانوني معتمد • تجربة مع التعاونيات أو منظمات الاقتصاد الاجتماعي", deadline: rel(35), contactEmail: "contact@tafoukt.ma", contactPhone: "06 61 23 45 67", status: "OPEN", createdAt: rel(-10), cooperative: { id: 1, name: "تعاونية تافوكت لإنتاج زيت أركان", sector: "الفلاحة والمنتجات المجالية", region: "سوس-ماسة", phone: "06 61 23 45 67", email: "contact@tafoukt.ma" }, applicationsCount: 2 },
  { id: 3, cooperativeId: 2, type: "JOB", title: "حرفي(ة) نسيج أمازيغي — 3 مناصب", description: "تشغيل حرفيين متمكنين من النسج التقليدي بالأصواف الطبيعية للعمل بورشة التعاونية بأسني، مع إمكانية التكوين المستمر.", sector: "الصناعة التقليدية", region: "مراكش-آسفي", city: "أسني", positions: 3, contractType: "CDI", requirements: "إتقان techniques النسج اليدوي • الانضباط والقدرة على العمل الجماعي", deadline: rel(15), contactEmail: null, contactPhone: "06 62 34 56 78", status: "OPEN", createdAt: rel(-8), cooperative: { id: 2, name: "تعاونية نسج الأطلس للنسيج التقليدي", sector: "الصناعة التقليدية", region: "مراكش-آسفي", phone: "06 62 34 56 78", email: null }, applicationsCount: 7 },
  { id: 4, cooperativeId: 3, type: "CONTRACT", title: "فرصة تعاقد: أشغال زليج لترميم RIAD تاريخي", description: "تعاونية دار الزليج تبحث عن مقاول منفذ لأشغال الزليج والجبس ضمن مشروع ترميم رياض تاريخي بالمدينة العتيقة لفاس — 400 متر مربع.", sector: "الصناعة التقليدية", region: "فاس-مكناس", city: "فاس", positions: 1, contractType: "MISSION", requirements: "تجربة في الترميم المعماري التقليدي • فريق عمل مؤهل • جهاز تقني", deadline: rel(28), contactEmail: "darzellij@contact.ma", contactPhone: "06 63 45 67 89", status: "OPEN", createdAt: rel(-4), cooperative: { id: 3, name: "تعاونية دار الزليج للصناعة التقليدية", sector: "الصناعة التقليدية", region: "فاس-مكناس", phone: "06 63 45 67 89", email: "darzellij@contact.ma" }, applicationsCount: 3 },
  { id: 5, cooperativeId: 4, type: "CONTRACT", title: "شراكة توزيع: تمور المجول والدقلة النور", description: "بحث عن موزعين وشركاء تجاريين لتسويق منتوجات التعاونية الموضبة داخل المدن الكبرى، مع عقود تزويد موسمية.", sector: "الفلاحة والمنتجات المجالية", region: "درعة-تافيلالت", city: "أرفود", positions: 4, contractType: "PARTNERSHIP", requirements: "سجل تجاري ساري • شبكة توزيع نشيطة • القدرة اللوجستية على النقل المبرد", deadline: null, contactEmail: null, contactPhone: "06 64 56 78 90", status: "OPEN", createdAt: rel(-14), cooperative: { id: 4, name: "تعاونية واحة النخيل لتحويل التمور", sector: "الفلاحة والمنتجات المجالية", region: "درعة-تافيلالت", phone: "06 64 56 78 90", email: null }, applicationsCount: 5 },
  { id: 6, cooperativeId: 5, type: "JOB", title: "تقني(ة) وحدة التبريد والتلفيف", description: "تشغيل تقني لتدبير وحدة التبريد والتلفيف بميناء الصويرة: صيانة المعدات، احترام معايير HACCP، وتتبع المخزون.", sector: "الصيد البحري", region: "مراكش-آسفي", city: "الصويرة", positions: 2, contractType: "CDD", requirements: "دبلوم تقني في التبريد أو الصناعات الغذائية • خبرة سنتين • عمل بنظام الحصص", deadline: rel(12), contactEmail: null, contactPhone: "06 65 67 89 01", status: "OPEN", createdAt: rel(-2), cooperative: { id: 5, name: "تعاونية موجة الصويرة للصيد البحري", sector: "الصيد البحري", region: "مراكش-آسفي", phone: "06 65 67 89 01", email: null }, applicationsCount: 1 },
  { id: 7, cooperativeId: 6, type: "SERVICE_NEED", title: "طلب خدمة: تصميم هوية بصرية وشعار", description: "التعاونية بصدد تحديث هويتها البصرية وتحتاج مصمماً محترفاً لإنجاز شعار جديد ودليل الهوية البصرية.", sector: "الخدمات", region: "الدار البيضاء-سطات", city: "سطات", positions: 1, contractType: "MISSION", requirements: "ملف أعمال (Portfolio) في الهوية البصرية • قدرة على العمل عن بعد", deadline: rel(40), contactEmail: null, contactPhone: "06 66 78 90 12", status: "OPEN", createdAt: rel(-1), cooperative: { id: 6, name: "تعاونية أطلس للتوريد الفلاحي", sector: "الخدمات", region: "الدار البيضاء-سطات", phone: "06 66 78 90 12", email: null }, applicationsCount: 0 },
  { id: 8, cooperativeId: 7, type: "INTERNSHIP", title: "تدريب محاسبي — PFE", description: "استقبال طالب(ة) في مرحلة تكوين لإنجاز مشروع نهاية الدراس في المحاسبة والمالية داخل تعاونية سياحية بخميسات.", sector: "الخدمات", region: "الرباط-سلا-القنيطرة", city: "خميسات", positions: 2, contractType: null, requirements: "مستوى السلك الثالث محاسبة/مالية • إتقان أدوات المعلوماتية المكتبية", deadline: rel(50), contactEmail: null, contactPhone: "06 67 89 01 23", status: "OPEN", createdAt: rel(-7), cooperative: { id: 7, name: "تعاونية سياحة أطلس المتوسط", sector: "الخدمات", region: "الرباط-سلا-القنيطرة", phone: "06 67 89 01 23", email: null }, applicationsCount: 2 },
  { id: 9, cooperativeId: 8, type: "CONTRACT", title: "فرصة تعاقد: مواكبة في الترقيم الرقمي", description: "تعاونية الأصيلة للصناعة الغذائية تبحث عن مصفن رقمي لمواكبتها في رقمنة التسيير: فاتورة إلكترونية، مخزون، وتتبع الإنتاج.", sector: "الصناعة", region: "طنجة-تطوان-الحسيمة", city: "الأصيلة", positions: 1, contractType: "MISSION", requirements: "تجربة في رقمنة المقاولات الصغيرة • معرفة بمنظومات ERP", deadline: rel(25), contactEmail: null, contactPhone: "06 68 90 12 34", status: "OPEN", createdAt: rel(-3), cooperative: { id: 8, name: "تعاونية الأصيلة للصناعة الغذائية", sector: "الصناعة", region: "طنجة-تطوان-الحسيمة", phone: "06 68 90 12 34", email: null }, applicationsCount: 1 },
  { id: 10, cooperativeId: 9, type: "SERVICE_NEED", title: "طلب خدمة: تكوين في التقنيات المتقدمة للتوضيب", description: "التعاونية تروم تكوين 12 منخرطة على التقنيات المتقدمة في توضيب وتلفيف المنتجات التجميلية الطبيعية.", sector: "الصناعة التقليدية", region: "سوس-ماسة", city: "تارودانت", positions: 1, contractType: "MISSION", requirements: "مكوِّن(ة) معتمد(ة) في التوضيب التجميلي • منهجية عملية", deadline: rel(30), contactEmail: null, contactPhone: "06 69 01 23 45", status: "OPEN", createdAt: rel(-9), cooperative: { id: 9, name: "تعاونية خبير صوامة للتوضيب التجميلي", sector: "الصناعة التقليدية", region: "سوس-ماسة", phone: "06 69 01 23 45", email: null }, applicationsCount: 0 },
];

// ─────────────────────────── ترشيحات على الفرص ────────────────────────────
export const applications: OpportunityApplication[] = [
  { id: 1, opportunityId: 1, userId: 7, fullName: "يوسف المرابط", email: "youssef@mail.ma", phone: "06 11 22 33 44", motivation: "خبرة 5 سنوات في التسويق الرقمي للمنتجات المجالية، وأنجزت حملات ناجحة لعلامات أركان.", experience: "مسؤول تسويق رقمي سابق بشركة توزيع بأكادير", status: "PENDING", createdAt: rel(-2), opportunity: { id: 1, title: "مسؤول(ة) التسويق الرقمي", type: "JOB" } },
  { id: 2, opportunityId: 3, userId: null, fullName: "حفيظة الإدريسي", email: "hafida@mail.ma", phone: "06 77 88 99 00", motivation: "حرفية نسج منذ 12 سنة، أتقن النسج المسطح واليدوي.", experience: "ورشة منزلية للنسيج بمراكش", status: "REVIEWED", createdAt: rel(-4), opportunity: { id: 3, title: "حرفي(ة) نسيج أمازيغي — 3 مناصب", type: "JOB" } },
  { id: 3, opportunityId: 4, userId: 6, fullName: "شركة وافي للتغليف", email: "contact@wafi.ma", phone: "05 22 33 44 55", motivation: "فريق مؤهل في أشغال الترميم التقليدي وتعامل سابق مع معالم مصنفة.", experience: "ترميم زليج بقصر الباهية جزئياً", status: "ACCEPTED", createdAt: rel(-3), opportunity: { id: 4, title: "فرصة تعاقد: أشغال زليج لترميم RIAD تاريخي", type: "CONTRACT" } },
  { id: 4, opportunityId: 5, userId: 8, fullName: "مؤسسة النخيل للتسويق", email: "contact@nakhil.ma", phone: "05 35 66 77 88", motivation: "شبكة توزيع تغطي الدار البيضاء والرباط مع أسطول مبرد.", experience: "توزيع تمور لثلاث علامات جهوية", status: "PENDING", createdAt: rel(-5), opportunity: { id: 5, title: "شراكة توزيع: تمور المجول والدقلة النور", type: "CONTRACT" } },
];

export const dataset = {
  cooperatives,
  members,
  assemblies,
  meetings,
  transactions,
  documents,
  entities,
  interactions,
  regulations,
  tasks,
  users,
  joinRequests,
  opportunities,
  applications,
};
