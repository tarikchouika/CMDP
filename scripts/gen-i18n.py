#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""توليد ملفات قواميس TS الأربعة + التحقق من التغطية الكاملة."""
import json, sys, importlib.util, re

def load(part, name):
    spec = importlib.util.spec_from_file_location(name, f"/home/z/my-project/scripts/i18n-dict-{part}.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return getattr(mod, name.upper())

T = {}
for i in ("1", "2", "3", "4", "5", "6", "7", "8", "9", "10"):
    T.update(load(f"part{i}", f"t{i}"))

# النصوص المستخرجة من الكود
def norm(s: str) -> str:
    # توحيد فاصل السطر: المصدر الخام يحتوي \\n والقاموس يحتوي سطراً جديداً
    return s.replace("\\n", "\n").strip()

extracted = json.load(open("/home/z/my-project/scripts/i18n-strings.json", encoding="utf-8"))
T_norm = {norm(k): v for k, v in T.items()}

missing = [k for k in extracted if norm(k) not in T_norm]
extra = [k for k in T if k not in extracted]
print(f"extracted: {len(extracted)}, authored: {len(T)}")
if missing:
    print(f"\n!!! MISSING ({len(missing)}):")
    for m in missing:
        print("  -", repr(m))

# التحقق من اكتمال اللغات
for key, vals in T.items():
    for lang in ("fr", "en", "it", "es"):
        if lang not in vals or not vals[lang]:
            print(f"!! incomplete {lang} for: {repr(key)}")

def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")

LANG_META = {
    "fr": ("FR", "Français — traduction professionnelle de la plateforme CMDP"),
    "en": ("EN", "English — professional translation of the CMDP platform"),
    "it": ("IT", "Italiano — traduzione professionale della piattaforma CMDP"),
    "es": ("ES", "Español — traducción profesional de la plataforma CMDP"),
}

for lang, (const, header) in LANG_META.items():
    lines = [
        "// ═══════════════════════════════════════════════════════════════════════════",
        f"// CMDP — قاموس {lang.upper()}: {header}",
        "// المفاتيح هي النصوص العربية الأصلية؛ أي مفتاح غائب يسقط آمناً إلى العربية.",
        "// ═══════════════════════════════════════════════════════════════════════════",
        "",
        f'export const {const}: Record<string, string> = {{',
    ]
    for key in sorted(T.keys()):
        val = T[key].get(lang, "").strip()
        if not val:
            continue
        lines.append(f'  "{esc(key)}": "{esc(val)}",')
    lines.append("};")
    lines.append("")
    with open(f"/home/z/my-project/src/lib/i18n/{lang}.ts", "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"wrote src/lib/i18n/{lang}.ts ({len(T)} entries)")

if missing:
    sys.exit(1)
print("\nOK — full coverage")
