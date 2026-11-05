#!/usr/bin/env python3
"""CMDP — استخراج مفاتيح t() العربية من ملفات محددة وفحص تغطية القواميس"""
import json
import re
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project")
FILES = [
    "src/components/views/storemanage.tsx",
    "src/components/views/login.tsx",
    "src/components/views/users.tsx",
    "src/components/app-shell.tsx",
    "src/lib/constants.ts",
    "src/lib/permissions.ts",
    "src/app/api/users/[id]/route.ts",
    "src/app/api/orders/[id]/route.ts",
    "src/app/api/orders/route.ts",
    "src/app/api/products/route.ts",
    "src/app/api/store/stats/route.ts",
]

# مفاتيح ديناميكية (من خرائط الثوابت ورسائل الخادم) لا تظهر في t()
EXTRA_KEYS = [
    "طلب جديد", "تم التواصل", "مكتمل", "ملغى", "معروض", "مخفي",
    "منتجات غذائية", "صناعة تقليدية", "نسيج وملابس", "تجميل وعناية", "خدمات", "أخرى",
    "حساب محمي",
    "لا يمكن تنفيذ إجراء على حسابك الشخصي",
    "لا يمكنك حذف حسابك الشخصي",
    "تراتبية الصلاحيات تمنع إدارة هذا الحساب",
    "حساب مالك المنصة محمي — يديره المالك حصراً",
    "حساب رئيس التعاونية محمي حسب تراتبية الصلاحيات",
    "حسابات المسيرين يديرها رئيس التعاونية أو إدارة المنصة",
    "لا يمكن تنفيذ إجراء على حسابك الخاص",
    "هذا الحساب خارج نطاق صلاحياتك",
    "هذا الطلب خارج نطاق تعاونيتكم",
    "حالة طلب غير صحيحة",
    "الطلب غير موجود",
    "السعر غير صالح",
    "لا توجد تعاونية مرتبطة بحسابكم",
    "الدار البيضاء", "الرباط", "مراكش", "أكادير", "فاس",
    "التوصيل بعد الخامسة مساءً", "هدية — تغليف خاص",
    "أملو تقليدي باللوز والعسل", "خليط الأركان التقليدي — غير معروض مؤقتاً",
    "أضف أول منتج لتعاونيتكم ليظهر في متجر المنصة العمومي",
]

key_re = re.compile(r'[tT]?\(?["\']([\u0600-\u06FF][^"\']*)["\']')

def extract_keys(text: str) -> set[str]:
    keys = set()
    # t("...") و t('...')
    for m in re.finditer(r'\bt\(\s*["\']([^"\']+)["\']', text):
        keys.add(m.group(1))
    # fail("...") denied("...") رسائل الخادم
    for m in re.finditer(r'(?:fail|denied)\(\s*["\']([^"\']+)["\']', text):
        keys.add(m.group(1))
    return keys

all_keys = set(EXTRA_KEYS)
for f in FILES:
    p = ROOT / f
    if p.exists():
        all_keys |= extract_keys(p.read_text())

# قواميس
def load_dict(lang: str) -> set[str]:
    src = (ROOT / f"src/lib/i18n/{lang}.ts").read_text()
    return set(re.findall(r'^\s*"([^"]+)":', src, re.M))

dicts = {lang: load_dict(lang) for lang in ["fr", "en", "it", "es"]}

missing = {k for k in all_keys if any(k not in d for d in dicts.values())}
# استبعاد ما هو مغطى كلياً
covered = {k for k in all_keys if all(k in d for d in dicts.values())}

print(f"إجمالي المفاتيح المكتشفة: {len(all_keys)}")
print(f"مغطاة كلياً: {len(covered)}")
print(f"ناقصة: {len(missing)}\n")
for k in sorted(missing):
    where = [lang for lang, d in dicts.items() if k not in d]
    print(json.dumps(k, ensure_ascii=False), "→ ناقص في:", ",".join(where))
