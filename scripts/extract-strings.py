#!/usr/bin/env python3
"""استخراج كل النصوص العربية من ملفات الواجهة لبناء قاموس الترجمة."""
import re, json, glob, os

FILES = sorted(
    glob.glob("/home/z/my-project/src/components/*.tsx")
    + glob.glob("/home/z/my-project/src/components/views/*.tsx")
    + ["/home/z/my-project/src/lib/constants.ts", "/home/z/my-project/src/lib/format.ts"]
)

AR = re.compile(r'[\u0600-\u06FF]')

# أنماط السياقات العرضية
patterns = [
    # JSX text: >عربي<
    (re.compile(r'>\s*([^<>{}"\'\n]*[\u0600-\u06FF][^<>{}"\'\n]*)\s*<'), "jsx-text"),
    # attributes: label="عربي"
    (re.compile(r'((?:aria-label|label|placeholder|title|description|desc|name|group|text)\s*=\s*)"([^"\n]*[\u0600-\u06FF][^"\n]*)"'), "attr"),
    # object props: label: "عربي"
    (re.compile(r'((?:label|title|desc|description|name|group|placeholder|text|header|caption|unit|kicker)\s*:\s*)"([^"\n]*[\u0600-\u06FF][^"\n]*)"'), "obj"),
    # ternary/plain string in JSX expression: {"عربي"}
    (re.compile(r'\{"([^"\n]*[\u0600-\u06FF][^"\n]*)"\}'), "expr"),
]

found = {}
for path in FILES:
    src = open(path).read()
    for pat, kind in patterns:
        for m in pat.finditer(src):
            s = (m.group(2) if pat.groups and len(m.groups()) > 1 else m.group(1)).strip()
            if AR.search(s) and len(s) > 0:
                found.setdefault(s, set()).add(os.path.basename(path))

strings = sorted(found.keys(), key=lambda s: (len(found[s]), s))
print(f"TOTAL unique Arabic display strings: {len(strings)}")
out = {}
for s in strings:
    out[s] = ""
with open("/home/z/my-project/scripts/i18n-strings.json", "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, indent=1)

# إحصاء التوزيع
from collections import Counter
cnt = Counter()
for s, fs in found.items():
    for f_ in fs:
        cnt[f_] += 1
print("\nper-file unique strings:")
for f_, c in cnt.most_common(40):
    print(f"  {f_}: {c}")
