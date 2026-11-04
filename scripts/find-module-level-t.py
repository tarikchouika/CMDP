#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""كشف استدعاءات t() داخل الثوابت المعرفة على مستوى الوحدة (تنفَّذ مرة عند التحميل)."""
import re, glob, os

FILES = sorted(
    glob.glob("/home/z/my-project/src/components/*.tsx")
    + glob.glob("/home/z/my-project/src/components/views/*.tsx")
)

# بداية تعريف على مستوى الوحدة (عمود 0)
TOP_DECL = re.compile(r'^(export\s+)?(const|let|var)\s+([A-Za-z_$][\w$]*)')

for path in FILES:
    src = open(path, encoding="utf-8").read()
    lines = src.split("\n")
    i = 0
    hits = []
    while i < len(lines):
        m = TOP_DECL.match(lines[i])
        if m and "function" not in lines[i]:
            # تتبّع نهاية التعريف: توازن الأقواس انطلاقاً من هذا السطر
            depth = 0
            j = i
            block = []
            while j < len(lines):
                ln = lines[j]
                depth += ln.count("(") + ln.count("{") + ln.count("[")
                depth -= ln.count(")") + ln.count("}") + ln.count("]")
                block.append((j + 1, ln))
                # انتهى التعريف عندما يتعادل العمق ونصل سطراً منتهياً بلا فاصلة علوية مفتوحة
                if depth <= 0 and j > i:
                    break
                if depth <= 0 and j == i and (";" in ln or ln.rstrip().endswith("}") or ln.rstrip().endswith("]")):
                    break
                j += 1
            body = "\n".join(x[1] for x in block)
            if re.search(r'\bt\(', body):
                hits.append((m.group(3), i + 1, len(block)))
            i = j + 1
        else:
            i += 1
    if hits:
        print(f"{os.path.basename(path)}:")
        for name, line, span in hits:
            print(f"   {name} (L{line}, {span} أسطر) يحتوي t() على مستوى الوحدة")
