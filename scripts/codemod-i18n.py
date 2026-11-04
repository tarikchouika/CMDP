#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""المحوّل الآلي: لفّ النصوص العربية في سياقات العرض بدالة t() مع استيرادها."""
import re, glob, os

AR = r'[\u0600-\u06FF]'
FILES = sorted(
    glob.glob("/home/z/my-project/src/components/*.tsx")
    + glob.glob("/home/z/my-project/src/components/views/*.tsx")
)
# ملفات تُعالج يدوياً (كلمات مفتاحية للمطابقة لا يجوز لفّها)
SKIP = {"chatbot.tsx"}

IMPORT = 'import { t } from "@/lib/i18n";'

def has_ar(s: str) -> bool:
    return re.search(AR, s) is not None

stats = {}
for path in FILES:
    base = os.path.basename(path)
    if base in SKIP:
        continue
    src = open(path, encoding="utf-8").read()
    orig = src
    n = 0

    # 1) خصائص JSX: label="عربي" → label={t("عربي")}
    def attr(m):
        global n
        n += 1
        return f'{m.group(1)}{m.group(2)}={{t("{m.group(3)}")}}'
    src = re.sub(
        r'(\s)((?:aria-)?label|placeholder|title|hint|desc|kicker|description|group)="([^"\n]*' + AR + r'[^"\n]*)"',
        attr, src)

    # 2) خصائص الكائنات: label: "عربي" → label: t("عربي")
    VIEWKEYS = "landing|login|register|opportunities|legal|dashboard|cooperatives|members|assembly|finance|documents|entities|regulations|users|myspace|settings"
    def obj(m):
        global n
        n += 1
        return f'{m.group(1)}{m.group(2)}: t("{m.group(3)}")'
    src = re.sub(
        r'(^|[\s{[,])(label|title|desc|description|placeholder|header|caption|unit|kicker|hint|text|group|updated|' + VIEWKEYS + r'):\s*"([^"\n]*' + AR + r'[^"\n]*)"',
        obj, src, flags=re.M)

    # 3) نص JSX: >عربي< → >{t("عربي")}<
    def jsx(m):
        global n
        n += 1
        return '>{t("' + m.group(1).strip() + '")}<'
    src = re.sub(
        r'>([^<>{}\n]*' + AR + r'[^<>{}\n]*)<',
        jsx, src)

    # 4) تعبير سلسلة داخل قوسين: {"عربي"} → {t("عربي")}
    def expr(m):
        global n
        n += 1
        return '{t("' + m.group(1).strip() + '")}'
    src = re.sub(r'\{"([^"\n]*' + AR + r'[^"\n]*)"\}', expr, src)

    # 5) عناصر مصفوفة سلسلة وحيدة في سطر (فقرات قانونية وعينات)
    def arr(m):
        global n
        n += 1
        return m.group(1) + 't("' + m.group(2) + '")' + (m.group(3) or "")
    src = re.sub(
        r'^(\s*)"([^"\n]*' + AR + r'[^"\n]*)"(,?)\s*$',
        arr, src, flags=re.M)

    # 6) خرائط النصوص المباشرة: ACCOUNT_TYPE_LABELS[x] → t(ACCOUNT_TYPE_LABELS[x])
    def lookup(m):
        global n
        n += 1
        return 't(' + m.group(0) + ')'
    src = re.sub(
        r'(?<!t\()(?<![\w.])(ACCOUNT_TYPE_LABELS|BOARD_ROLES|TX_METHODS|CONTRACT_TYPES)\[[^\]\n]+\]',
        lookup, src)

    # 7) الثوابت المعروضة: {APP_FULL_NAME} → {t(APP_FULL_NAME)}
    def const(m):
        global n
        n += 1
        return '{t(' + m.group(1) + ')}'
    src = re.sub(r'\{(APP_FULL_NAME|APP_TAGLINE)\}', const, src)

    if src != orig:
        # إضافة الاستيراد بعد آخر استيراد
        if IMPORT not in src:
            imports = list(re.finditer(r'^import .*?;$', src, flags=re.M))
            if imports:
                last = imports[-1]
                src = src[:last.end()] + "\n" + IMPORT + src[last.end():]
            else:
                src = IMPORT + "\n" + src
        open(path, "w", encoding="utf-8").write(src)
        stats[base] = n

print("files transformed:")
for k, v in sorted(stats.items(), key=lambda x: -x[1]):
    print(f"  {k}: {n if False else v} strings")
print(f"TOTAL: {sum(stats.values())}")
