#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""استخراج كل مفاتيح t()/i18n() من الكود ومقارنتها بالقواميس المولدة."""
import re, glob, json, os, importlib.util

def load(part, name):
    spec = importlib.util.spec_from_file_location(name, f"/home/z/my-project/scripts/i18n-dict-{part}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return getattr(mod, name.upper())

T = {}
for i in ("1", "2", "3", "4", "5", "6", "7", "8", "9", "10"):
    T.update(load(f"part{i}", f"t{i}"))

FILES = sorted(
    glob.glob("/home/z/my-project/src/components/*.tsx")
    + glob.glob("/home/z/my-project/src/components/views/*.tsx")
    + ["/home/z/my-project/src/lib/constants.ts"]
)

key_re = re.compile(r'\b(?:i18n|t)\(\s*"((?:[^"\\]|\\.)*)"')
keys = {}
for path in FILES:
    src = open(path, encoding="utf-8").read()
    for m in key_re.finditer(src):
        k = m.group(1).replace("\\n", "\n").strip()
        keys.setdefault(k, set()).add(os.path.basename(path))

# مفاتيح القوائم من constants (المناطق والقطاعات والفئات)
const_src = open("/home/z/my-project/src/lib/constants.ts", encoding="utf-8").read()
for arr_re in (r'export const (?:INCOME_CATEGORIES|EXPENSE_CATEGORIES|REGIONS|SECTORS)\s*=\s*\[(.*?)\]as const',):
    for m in re.finditer(arr_re, const_src, re.S):
        for s in re.findall(r'"([^"]+)"', m.group(1)):
            keys.setdefault(s, set()).add("constants.ts")
# خرائط القيم النصية
for mapname in ("TX_METHODS", "CONTRACT_TYPES", "BOARD_ROLES", "ACCOUNT_TYPE_LABELS"):
    m = re.search(rf'export const {mapname}[^=]+=\s*\{{(.*?)\n\}}', const_src, re.S)
    if m:
        for s in re.findall(r':\s*"([^"]+)"', m.group(1)):
            keys.setdefault(s, set()).add("constants.ts")
m = re.search(r'export const APP_TAGLINE\s*=\s*"([^"]+)"', const_src)
if m:
    keys.setdefault(m.group(1), set()).add("constants.ts")

missing = [k for k in keys if k not in T]
print(f"code keys: {len(keys)}, dict: {len(T)}")
print(f"\nMISSING ({len(missing)}):")
out = {}
for k in sorted(missing):
    out[k] = ""
    srcs = ",".join(sorted(keys[k]))
    print(f"  [{srcs}] {k[:110]}")
json.dump(out, open("/home/z/my-project/scripts/i18n-missing.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
