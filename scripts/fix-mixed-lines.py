#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""الإصلاح النهائي: النصوص في أسطر مختلطة (بعد الأيقونات، العدادات، الفقرات المتعددة)."""
import re

BASE = "/home/z/my-project/src/components"

def patch(path, pairs, verbose=True):
    src = open(path, encoding="utf-8").read()
    ok = 0
    for old, new in pairs:
        if old in src:
            src = src.replace(old, new)
            ok += 1
        elif verbose:
            print(f"  !! NOT FOUND {path.split('/')[-1]}: {old[:70]}")
    open(path, "w", encoding="utf-8").write(src)
    print(f"  {path.split('/')[-1]}: {ok}/{len(pairs)}")

# ── assembly.tsx ──
patch(f"{BASE}/views/assembly.tsx", [
    ("الجمع العام ({(assemblies ?? []).length})", '{t("الجمع العام")} ({(assemblies ?? []).length})'),
    ("اجتماعات المجلس ({(meetings ?? []).length})", '{t("اجتماعات المجلس")} ({(meetings ?? []).length})'),
    ("{m.attendeesCount} حاضر", '{m.attendeesCount} {t("حاضر")}'),
])

# ── cooperatives.tsx ──
patch(f"{BASE}/views/cooperatives.tsx", [
    ('<Star className="size-3 fill-terra" /> النشطة', '<Star className="size-3 fill-terra" /> {t("النشطة")}'),
    ("{c.province}، {c.region}", '{c.province}{t("، ")}{c.region}'),
    ('<Star className="size-4" /> تعيين كتعاونية نشطة', '<Star className="size-4" /> {t("تعيين كتعاونية نشطة")}'),
    ('<Pencil className="size-4" /> تحرير', '<Pencil className="size-4" /> {t("تحرير")}'),
])

# ── dashboard.tsx ──
patch(f"{BASE}/views/dashboard.tsx", [
    ("{done} منجز / {data.tasksUpcoming.length}", '{done} {i18n("منجز")} / {data.tasksUpcoming.length}'),
    ('{a.attendeesCount} حاضر', '{a.attendeesCount} {i18n("حاضر")}'),
])

# ── documents.tsx ──
patch(f"{BASE}/views/documents.tsx", [
    ('الكل ({computed.length})', '{t("الكل")} ({computed.length})'),
    ('<span>مرجع: {d.reference ?? "—"}</span>', '<span>{t("مرجع:")} {d.reference ?? "—"}</span>'),
    ('<span>الإصدار: {formatDate(d.issueDate)}</span>', '<span>{t("الإصدار:")} {formatDate(d.issueDate)}</span>'),
    ("الانتهاء: {formatDate(d.expiryDate)}", '{t("الانتهاء:")} {formatDate(d.expiryDate)}'),
])

# ── entities.tsx ──
patch(f"{BASE}/views/entities.tsx", [
    ("الدليل ({(entities ?? []).length})", '{t("الدليل")} ({(entities ?? []).length})'),
    ("سجل التفاعلات ({(interactions ?? []).length})", '{t("سجل التفاعلات")} ({(interactions ?? []).length})'),
    ("الوصاية: {e.supervisor}", '{t("الوصاية:")} {e.supervisor}'),
    ("{interactionCounts.get(e.id) ?? 0} تفاعل", '{interactionCounts.get(e.id) ?? 0} {t("تفاعل")}'),
    ('باسم {coop?.name ?? t("التعاونية")}', 'بااسمfix'),
])
# إصلاح جملة الحوار في entities (نص عربي + تعبير)
src = open(f"{BASE}/views/entities.tsx", encoding="utf-8").read()
src = src.replace(
    "بااسمfix",
    '{t("التصريحات والطلبات والمراسلات مع الجهات الوصية باسم {name}", { name: coop?.name ?? t("التعاونية") })}'
)
src = src.replace(
    "<DialogDescription>التصريحات والطلبات والمراسلات مع الجهات الوصية",
    '<DialogDescription>{t("التصريحات والطلبات والمراسلات مع الجهات الوصية'
)
open(f"{BASE}/views/entities.tsx", "w", encoding="utf-8").write(src)

# ── finance.tsx ──
patch(f"{BASE}/views/finance.tsx", [
    ('>الحركات ({formatNumber((txs ?? []).length)})<', '>{i18n("الحركات")} ({formatNumber((txs ?? []).length)})<'),
    ("التقرير المالي السنوي {year}", '{i18n("التقرير المالي السنوي {year}", { year })}'),
    ("{coop?.name} — {coop?.province}، {coop?.region}", "{coop?.name} — {coop?.province}{i18n(\"، \")}{coop?.region}"),
    ("حُرّر بتاريخ: {formatShortDate(new Date())}", '{i18n("حُرّر بتاريخ:")} {formatShortDate(new Date())}'),
])

# ── landing.tsx ──
src = open(f"{BASE}/views/landing.tsx", encoding="utf-8").read()
src = src.replace(
    """منصة موحدة لإدارة التعاونية وأنشطتها: الأعضاء، الجمع العام، المجلس الإداري،
            المالية والوثائق — مع تتبع العلاقات مع الجهات الحكومية والإدارية الوصية
            والامتثال للقانون رقم 112.12 واللوائح التنظيمية الجاري بها العمل.""",
    """{t("منصة موحدة لإدارة التعاونية وأنشطتها: الأعضاء، الجمع العام، المجلس الإداري، المالية والوثائق — مع تتبع العلاقات مع الجهات الحكومية والإدارية الوصية والامتثال للقانون رقم 112.12 واللوائح التنظيمية الجاري بها العمل.")}"""
)
src = src.replace(
    """منصة مفتوحة لرقمنة التعاونيات المغربية، من فكرة إلى منظومة متكاملة تحترم
            الخصوصية وتعمل محلياً.""",
    """{t("منصة مفتوحة لرقمنة التعاونيات المغربية، من فكرة إلى منظومة متكاملة تحترم الخصوصية وتعمل محلياً.")}"""
)
src = src.replace('<ZelligeStar className="size-3 text-saffron" /> فرونت إند ساكن — Cloudflare Pages', '<ZelligeStar className="size-3 text-saffron" /> {t("فرونت إند ساكن — Cloudflare Pages")}')
src = src.replace('<ZelligeStar className="size-3 text-saffron" /> باك إند محلي — SQLite', '<ZelligeStar className="size-3 text-saffron" /> {t("باك إند محلي — SQLite")}')
src = src.replace('<ZelligeStar className="size-3 text-saffron" /> عربية RTL بالكامل', '<ZelligeStar className="size-3 text-saffron" /> {t("عربية RTL بالكامل")}')
src = src.replace('ألف د.م.', '{t("ألف د.م.")}')
src = src.replace("مكتب تنمية التعاون (ODCO) — الموقع الرسمي\n", '{t("مكتب تنمية التعاون (ODCO) — الموقع الرسمي")}\n')
src = src.replace("الصندوق الوطني للضمان الاجتماعي (CNSS)\n", '{t("الصندوق الوطني للضمان الاجتماعي (CNSS)")}\n')
src = src.replace("سياسة الخصوصية وحماية المعطيات (ق.09.08)\n", '{t("سياسة الخصوصية وحماية المعطيات (ق.09.08)")}\n')
src = src.replace("الإشعار القانوني (ق.53.05)\n", '{t("الإشعار القانوني (ق.53.05)")}\n')
src = src.replace("صُنع بعناية للمتعاونين والمتعاونات في المملكة المغربية", '{t("صُنع بعناية للمتعاونين والمتعاونات في المملكة المغربية")}')
open(f"{BASE}/views/landing.tsx", "w", encoding="utf-8").write(src)
print("  landing.tsx patched")

# ── legal.tsx ──
patch(f"{BASE}/views/legal.tsx", [
    ("للاستفسارات القانونية حول استعمال المنصة: <span", '{t("للاستفسارات القانونية حول استعمال المنصة:")} <span'),
    ("• وثائق قانونية متوافقة مع التشريع المغربي", '• {t("وثائق قانونية متوافقة مع التشريع المغربي")}'),
])

# ── login.tsx ──
patch(f"{BASE}/views/login.tsx", [
    ('<User className="size-3.5 text-terra" /> اسم المستخدم', '<User className="size-3.5 text-terra" /> {t("اسم المستخدم")}'),
    ('<Lock className="size-3.5 text-terra" /> كلمة المرور', '<Lock className="size-3.5 text-terra" /> {t("كلمة المرور")}'),
    ("حسابات العرض حسب الأدوار (كلمة المرور: cmdp2026)", '{t("حسابات العرض حسب الأدوار (كلمة المرور: cmdp2026)")}'),
])

# ── members.tsx ──
patch(f"{BASE}/views/members.tsx", [
    ('{m.shares} حصص', '{m.shares} {t("حصص")}'),
    ('<DialogDescription>بيانات الانخراط والحصص داخل {coop?.name ?? t("التعاونية")}</DialogDescription>',
     '<DialogDescription>{t("بيانات الانخراط والحصص داخل {name}", { name: coop?.name ?? t("التعاونية") })}</DialogDescription>'),
])

# ── myspace.tsx ──
src = open(f"{BASE}/views/myspace.tsx", encoding="utf-8").read()
src = src.replace(
    """حسابكم مرتبط بعلاقة تعاقد مع التعاونية. تطلعون حصراً على الوثائق والمعلومات التي يصرح
              لكم بها رئيس التعاونية أو أحد أعضائها المسييرين.""",
    """{t("حسابكم مرتبط بعلاقة تعاقد مع التعاونية. تطلعون حصراً على الوثائق والمعلومات التي يصرح لكم بها رئيس التعاونية أو أحد أعضائها المسييرين.")}"""
)
src = src.replace('<BadgeCheck className="size-3.5" /> حضوركم مؤكد', '<BadgeCheck className="size-3.5" /> {t("حضوركم مؤكد")}')
src = src.replace('<CalendarCheck2 className="size-3.5" /> تأكيد الحضور', '<CalendarCheck2 className="size-3.5" /> {t("تأكيد الحضور")}')
src = src.replace('صوّتم:', '{t("صوّتم:")}')
src = src.replace('<ThumbsUp className="size-3.5" /> موافقة', '<ThumbsUp className="size-3.5" /> {t("موافقة")}')
src = src.replace('<ThumbsDown className="size-3.5" /> معارضة', '<ThumbsDown className="size-3.5" /> {t("معارضة")}')
src = src.replace('<Handshake className="size-4" /> تصفح الفرص', '<Handshake className="size-4" /> {t("تصفح الفرص")}')
src = src.replace("{coop.province}، {coop.region}", '{coop.province}{t("، ")}{coop.region}')
src = src.replace("عضو واحد = صوت واحد — الرقابة الديمقراطية وفق مبادئ التعاون", '{t("عضو واحد = صوت واحد — الرقابة الديمقراطية وفق مبادئ التعاون")}')
src = src.replace('صادرة في {new Date(d.issueDate).toLocaleDateString("ar-MA")}', '{t("صادرة في")} {formatShortDate(d.issueDate)}')
# التأكد من استيراد formatShortDate
if "formatShortDate" not in src.split("export function")[0]:
    src = src.replace('from "@/lib/format"', 'from "@/lib/format"').replace(
        "import { formatDate }", "import { formatDate, formatShortDate }")
open(f"{BASE}/views/myspace.tsx", "w", encoding="utf-8").write(src)
print("  myspace.tsx patched")

# ── opportunities.tsx ──
patch(f"{BASE}/views/opportunities.tsx", [
    ("{o.positions} مناصب", '{o.positions} {t("مناصب")}'),
    ("{o.applicationsCount} ترشيحاً", '{o.applicationsCount} {t("ترشيحاً")}'),
    ("الترشح: {o?.title}", '{t("الترشح: {title}", { title: o?.title ?? "" })}'),
    ("فرص تعاونيتي ({(mine ?? []).length})", '{t("فرص تعاونيتي")} ({(mine ?? []).length})'),
    ("الترشيحات ({(applications ?? []).length})", '{t("الترشيحات")} ({(applications ?? []).length})'),
    ('<Plus className="size-4" /> نشر أول فرصة', '<Plus className="size-4" /> {t("نشر أول فرصة")}'),
    ("{o.region} • {o.positions} منصب", '{o.region} • {o.positions} {t("منصب")}'),
    ('<Pencil className="size-3.5" /> تعديل', '<Pencil className="size-3.5" /> {t("تعديل")}'),
    ('<Trash2 className="size-3.5" /> حذف', '<Trash2 className="size-3.5" /> {t("حذف")}'),
])

# ── register.tsx ──
src = open(f"{BASE}/views/register.tsx", encoding="utf-8").read()
src = src.replace(
    "بيانات الحساب {intent === \"ACCOUNT\" ? \"\" : t(\"والتقديم\")}",
    '{t("بيانات الحساب")} {intent === "ACCOUNT" ? "" : t("والتقديم")}'
)
src = src.replace(
    """بعد المصادقة من طرف إدارة المنصة يُفعَّل حسابكم كرئيس(ة) للتعاونية. يبقى التسجيل الرسمي
              لدى السلطات المختصة (السجل المحلي + ODCO) وفق القانون رقم 112.12 مسؤولية التعاونية.""",
    """{t("بعد المصادقة من طرف إدارة المنصة يُفعَّل حسابكم كرئيس(ة) للتعاونية. يبقى التسجيل الرسمي لدى السلطات المختصة (السجل المحلي + ODCO) وفق القانون رقم 112.12 مسؤولية التعاونية.")}"""
)
open(f"{BASE}/views/register.tsx", "w", encoding="utf-8").write(src)
print("  register.tsx patched")

# ── regulations.tsx ──
src = open(f"{BASE}/views/regulations.tsx", encoding="utf-8").read()
src = src.replace("الكل ({(regulations ?? []).length})", '{t("الكل")} ({(regulations ?? []).length})')
src = src.replace("النقاط الأساسية ({r.keyPoints.length})", '{t("النقاط الأساسية")} ({r.keyPoints.length})')
src = src.replace(
    """هذا المحتوى توعوي لأغراض العرض والتوثيق — المرجع المعتمد يبقى النص الرسمي كما نُشر بالجريدة الرسمية
            للمملكة المغربية. المصادر: وزارة السياحة والصناعة التقليدية والاقتصاد الاجتماعي والتضامني،
            ومكتب تنمية التعاون (ODCO).""",
    """{t("هذا المحتوى توعوي لأغراض العرض والتوثيق — المرجع المعتمد يبقى النص الرسمي كما نُشر بالجريدة الرسمية للمملكة المغربية. المصادر: وزارة السياحة والصناعة التقليدية والاقتصاد الاجتماعي والتضامني، ومكتب تنمية التعاون (ODCO).")}"""
)
open(f"{BASE}/views/regulations.tsx", "w", encoding="utf-8").write(src)
print("  regulations.tsx patched")

# ── settings.tsx ──
src = open(f"{BASE}/views/settings.tsx", encoding="utf-8").read()
src = src.replace(
    """عند نشر الواجهة على Cloudflare Pages، اضبط هنا عنوان الخادم المحلي الذي يشغّل SQLite
              (مثال: http://192.168.1.10:3000)""",
    """{t("عند نشر الواجهة على Cloudflare Pages، اضبط هنا عنوان الخادم المحلي الذي يشغّل SQLite (مثال: http://192.168.1.10:3000)")}"""
)
src = src.replace(
    """CMDP منصة رقمية لإدارة التعاونيات بالمغرب: رقمنة الأنشطة، تتبع الالتزامات القانونية وفق
              القانون رقم 112.12، وتوثيق العلاقة مع الجهات الوصية. الفرونت إند تُنشر ساكنة على
              Cloudflare Pages، والباك إند يعمل محلياً بقاعدة بيانات SQLite يديرها المساعد الألي
              المسؤول عن البيئة المحلية وفق بروتوكول العمل المشترك (docs/AGENT-PROTOCOL.md).""",
    """{t("CMDP منصة رقمية لإدارة التعاونيات بالمغرب: رقمنة الأنشطة، تتبع الالتزامات القانونية وفق القانون رقم 112.12، وتوثيق العلاقة مع الجهات الوصية. الفرونت إند تُنشر ساكنة على Cloudflare Pages، والباك إند يعمل محلياً بقاعدة بيانات SQLite يديرها المساعد الألي المسؤول عن البيئة المحلية وفق بروتوكول العمل المشترك (docs/AGENT-PROTOCOL.md).")}"""
)
open(f"{BASE}/views/settings.tsx", "w", encoding="utf-8").write(src)
print("  settings.tsx patched")

# ── users.tsx ──
src = open(f"{BASE}/views/users.tsx", encoding="utf-8").read()
for icon in ["BadgeCheck", "XCircle", "KeyRound", "Ban"]:
    src = re.sub(rf'<{icon} className="size-(?:3\.5|4)" /> (المصادقة|رفض|تفعيل|إيقاف|تعديل)', r'<\1 className="size-3.5" /> {t("\2")}', src)
src = src.replace("الطلبات المعلقة\n", '{t("الطلبات المعلقة")}\n')
src = src.replace("حسابات بانتظار المصادقة ({pendingUsers.length})", '{t("حسابات بانتظار المصادقة")} ({pendingUsers.length})')
src = src.replace("طلبات الانخراط والتعاقد ({pendingRequests.length})", '{t("طلبات الانخراط والتعاقد")} ({pendingRequests.length})')
src = src.replace("طلبات تسجيل تعاونيات ({pendingCoops.length})", '{t("طلبات تسجيل تعاونيات")} ({pendingCoops.length})')
src = src.replace("الرئيس المقرر: {c.presidentName}", '{t("الرئيس المقرر:")} {c.presidentName}')
open(f"{BASE}/views/users.tsx", "w", encoding="utf-8").write(src)
print("  users.tsx patched")
print("ALL PATCHED")
