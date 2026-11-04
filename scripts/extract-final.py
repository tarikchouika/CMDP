#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""استخراج نهائي دقيق: كل النصوص الخام المعروضة (سلاسل أحادية السطر) غير المغطاة."""
import re, json, importlib.util

def load(part, name):
    spec = importlib.util.spec_from_file_location(name, f"/home/z/my-project/scripts/i18n-dict-{part}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return getattr(mod, name.upper())

T = {}
for i in ("1", "2", "3", "4", "5", "6", "7", "8", "9", "10"):
    T.update(load(f"part{i}", f"t{i}"))

AR = re.compile(r'[\u0600-\u06FF]')

def strings_in_block(path, start, end):
    src = open(path, encoding="utf-8").read()
    i = src.index(start)
    j = src.index(end, i)
    out = []
    for ln in src[i:j].split("\n"):
        for m in re.finditer(r'"((?:[^"\\\n]|\\.)*[\u0600-\u06FF](?:[^"\\\n]|\\.)*)"', ln):
            s = m.group(1).replace("\\n", "\n").strip()
            if s and AR.search(s):
                out.append(s)
    return out

extra = {}
def add(strings, src):
    for s in strings:
        extra.setdefault(s, src)

add(strings_in_block("src/components/views/legal.tsx", "const LEGAL_DOCS", "export function LegalView"), "legal")
add(strings_in_block("src/components/views/login.tsx", "const DEMO_ACCOUNTS", "export function LoginView"), "login")
add(strings_in_block("src/components/views/register.tsx", "const INTENTS", "export function RegisterView"), "register")
add(strings_in_block("src/components/views/landing.tsx", "const MODULES", "export function LandingView"), "landing")
add(strings_in_block("src/lib/constants.ts", "export const FOUNDATION_STEPS", "// ─── إحصائيات"), "constants")
add(strings_in_block("src/lib/constants.ts", "export const SECTOR_STATS", "};"), "constants")

# مفاتيح t() الناقصة من التدقيق السابق
missing_prev = json.load(open("/home/z/my-project/scripts/i18n-missing.json", encoding="utf-8"))
for k in missing_prev:
    extra.setdefault(k, "code")

new = {k: v for k, v in extra.items() if k not in T}
print(f"total extra: {len(extra)}, already covered: {len(extra)-len(new)}, NEW: {len(new)}")
json.dump(new, open("/home/z/my-project/scripts/i18n-part5-needed.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for k in sorted(new):
    print(f"  [{new[k]}] {k[:100]}")
