#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""مرحلة تنظيف: نصوص JSX متعددة الأسطر + سلاسل ثلاثيات وبدائل + لفّ متغيرات القوالب."""
import re, glob, os

AR = r'[\u0600-\u06FF]'
FILES = sorted(
    glob.glob("/home/z/my-project/src/components/*.tsx")
    + glob.glob("/home/z/my-project/src/components/views/*.tsx")
)
SKIP = {"chatbot.tsx"}
IMPORT = 'import { t } from "@/lib/i18n";'

for path in FILES:
    base = os.path.basename(path)
    if base in SKIP:
        continue
    src = open(path, encoding="utf-8").read()
    orig = src
    n = 0

    # 1) سطر نصي خالص بين وسمين (نص JSX متعدد الأسطر)
    lines = src.split("\n")
    out_lines = []
    for idx, ln in enumerate(lines):
        stripped = ln.strip()
        if (
            stripped
            and re.search(AR, stripped)
            and not re.search(r'[<>{}();=`]', stripped)
            and not stripped.startswith("//")
            and not stripped.startswith("*")
            and not stripped.startswith('"')
        ):
            # تأكد أن السطر التالي يبدأ بوسم إغلاق أو عنصر
            nxt = lines[idx + 1].lstrip() if idx + 1 < len(lines) else ""
            prv = lines[idx - 1].rstrip() if idx > 0 else ""
            if nxt.startswith("<") and (prv.endswith(">") or prv.endswith("}")):
                indent = ln[: len(ln) - len(ln.lstrip())]
                out_lines.append(f'{indent}{{t("{stripped}")}}')
                n += 1
                continue
        out_lines.append(ln)
    src = "\n".join(out_lines)

    # 2) التزامات الثلاثيات: ? "عربي" → ? t("عربي")
    def tern(m):
        global n
        n += 1
        return m.group(1) + 't("' + m.group(2) + '")'
    src = re.sub(r'(\?\s*)"([^"\n]*' + AR + r'[^"\n]*)"', tern, src)
    src = re.sub(r'(\?\?\s*)"([^"\n]*' + AR + r'[^"\n]*)"', tern, src)
    # البديل: : "عربي" (بعد ثلاثية) — لا يمسّ case "x": لأن النص هناك قبل النقطتين
    src = re.sub(r'(:\s*)"([^"\n]*' + AR + r'[^"\n]*)"(?!\s*[;,])', tern, src)

    if src != orig:
        if IMPORT not in src and "t(" in src:
            imports = list(re.finditer(r'^import .*?;$', src, flags=re.M))
            if imports:
                last = imports[-1]
                src = src[:last.end()] + "\n" + IMPORT + src[last.end():]
        open(path, "w", encoding="utf-8").write(src)
        if n:
            print(f"  {base}: {n} leftovers wrapped")

print("done")
