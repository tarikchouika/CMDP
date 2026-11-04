#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""إرجاع t() داخل الثوابت على مستوى الوحدة إلى نصوص خام + لفّها عند مواضع الاستعمال."""
import re

BASE = "/home/z/my-project/src/components"

def revert_block(path, start_marker, end_content):
    """يُرجع t("...") إلى "..." داخل كتلة محددة بين علامتي بداية ونهاية."""
    src = open(path, encoding="utf-8").read()
    i = src.index(start_marker)
    j = src.index(end_content, i)
    block = src[i:j]
    block2 = re.sub(r'\bt\(("[^"]*")\)', r"\1", block)
    block2 = re.sub(r"\bt\((APP_FULL_NAME|APP_TAGLINE|APP_NAME)\)", r"\1", block2)
    src = src[:i] + block2 + src[j:]
    open(path, "w", encoding="utf-8").write(src)
    print(f"reverted block in {path.split('/')[-1]}: {start_marker[:40]}...")

# 1) app-shell: NAV_GROUPS وVIEW_TITLES
p = f"{BASE}/app-shell.tsx"
revert_block(p, "const NAV_GROUPS", "const VIEW_TITLES")
revert_block(p, "const VIEW_TITLES", "/** مجموعات التنقل")

src = open(p, encoding="utf-8").read()
# لفّ عند الاستعمال
src = src.replace("            {g.group}", "            {t(g.group)}")
src = src.replace("                    <span>{item.label}</span>", "                    <span>{t(item.label)}</span>")
src = src.replace("          {VIEW_TITLES[view]}", "          {t(VIEW_TITLES[view])}")
src = src.replace("            {q.label}", "            {t(q.label)}")
open(p, "w", encoding="utf-8").write(src)
print("app-shell usage sites wrapped")

# 2) landing: MODULES وFEATURES
p = f"{BASE}/views/landing.tsx"
src = open(p, encoding="utf-8").read()
i = src.index("const MODULES")
j = src.index("export function LandingView")
block = src[i:j]
block2 = re.sub(r'\bt\(("[^"]*")\)', r"\1", block)
src = src[:i] + block2 + src[j:]
open(p, "w", encoding="utf-8").write(src)
print("landing constants reverted; usage sites:")

# 3) legal: LEGAL_DOCS
p = f"{BASE}/views/legal.tsx"
src = open(p, encoding="utf-8").read()
i = src.index("const LEGAL_DOCS")
j = src.index("export function LegalView")
block = src[i:j]
block2 = re.sub(r'\bt\(("[^"]*")\)', r"\1", block)
src = src[:i] + block2 + src[j:]
open(p, "w", encoding="utf-8").write(src)
print("legal constants reverted")

# 4) login: DEMO_ACCOUNTS
p = f"{BASE}/views/login.tsx"
src = open(p, encoding="utf-8").read()
i = src.index("const DEMO_ACCOUNTS")
j = src.index("export function LoginView")
block = src[i:j]
block2 = re.sub(r'\bt\(("[^"]*")\)', r"\1", block)
src = src[:i] + block2 + src[j:]
open(p, "w", encoding="utf-8").write(src)
print("login constants reverted")

# 5) register: INTENTS
p = f"{BASE}/views/register.tsx"
src = open(p, encoding="utf-8").read()
i = src.index("const INTENTS")
j = src.index("export function RegisterView")
block = src[i:j]
block2 = re.sub(r'\bt\(("[^"]*")\)', r"\1", block)
src = src[:i] + block2 + src[j:]
open(p, "w", encoding="utf-8").write(src)
print("register constants reverted")
