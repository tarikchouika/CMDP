#!/usr/bin/env python3
"""تدقيق موثوق: كل السلاسل العربية في dataset.ts و seed-run.ts مقابل القواميس الأربعة."""
import re, json

def extract_ar(path):
    code = open(path, encoding='utf-8').read()
    # سلاسل بين علامتي اقتباس مزدوجة فقط (كما في الملفات فعلياً)
    strs = re.findall(r'"((?:\\.|[^"\\])*)"', code)
    ar = []
    for s in strs:
        s = s.replace('\\"', '"')
        if re.search(r'[\u0600-\u06FF]', s) and s not in ar:
            ar.append(s)
    return ar

def dict_keys(path):
    code = open(path, encoding='utf-8').read()
    return set(re.findall(r'"((?:\\.|[^"\\])*)":\s*"', code))

dataset = extract_ar('src/lib/dataset.ts')
en = dict_keys('src/lib/i18n/en.ts')
fr = dict_keys('src/lib/i18n/fr.ts')
it = dict_keys('src/lib/i18n/it.ts')
es = dict_keys('src/lib/i18n/es.ts')

print(f"dataset Arabic strings: {len(dataset)}")
print(f"dict sizes: EN={len(en)} FR={len(fr)} IT={len(it)} ES={len(es)}")

missing_en = [s for s in dataset if s not in en]
print(f"\n=== dataset strings MISSING in EN: {len(missing_en)} ===")
for s in missing_en:
    tags = []
    if s not in fr: tags.append('fr')
    if s not in it: tags.append('it')
    if s not in es: tags.append('es')
    print(json.dumps(s, ensure_ascii=False), ' | also missing in:', ','.join(tags) if tags else 'none')
