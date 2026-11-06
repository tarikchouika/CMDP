#!/usr/bin/env python3
# CMDP-049/B — مسح شامل لتحصين وحدات العرض:
# 1) إزالة max-h-[90vh] و overflow-y-auto من حوارات الواجهات (أصبحت في مكوّن Dialog)
# 2) min-h-screen / h-screen / max-h-screen → وحدات --cmdp-vh الحية (سقوط آمن 1vh)
# 3) 88vw في الأنماط و80vh في الدرج → وحدات حية
import re, pathlib

ROOT = pathlib.Path("/home/z/my-project/src")

dialog_files = [
    "components/views/finance.tsx", "components/views/cooperatives.tsx",
    "components/views/users.tsx", "components/views/documents.tsx",
    "components/views/opportunities.tsx", "components/views/assembly.tsx",
    "components/views/storemanage.tsx", "components/views/store.tsx",
    "components/views/entities.tsx", "components/views/members.tsx",
]
vh_files = [
    "components/views/login.tsx", "components/views/register.tsx",
    "components/views/install.tsx", "components/views/store.tsx",
    "components/views/legal.tsx", "components/views/landing.tsx",
    "components/app-shell.tsx",
]
LIVE_MAX = "max-h-[calc(var(--cmdp-vh,1vh)*100)]"
LIVE_MIN = "min-h-[calc(var(--cmdp-vh,1vh)*100)]"
LIVE_H = "h-[calc(var(--cmdp-vh,1vh)*100)]"

changed = []

# ── 1) حوارات الواجهات: إسقاط max-h-[90vh] و overflow-y-auto ──
for rel in dialog_files:
    p = ROOT / rel
    lines = p.read_text().splitlines(keepends=True)
    n = 0
    for i, ln in enumerate(lines):
        if "<DialogContent" in ln and "max-h-[90vh]" in ln:
            new = ln.replace("max-h-[90vh] ", "").replace(" overflow-y-auto", "")
            if new != ln:
                lines[i] = new
                n += 1
    if n:
        p.write_text("".join(lines))
        changed.append(f"{rel}: {n} dialog(s) cleaned")

# ── 2) min-h-screen / h-screen ──
for rel in vh_files:
    p = ROOT / rel
    txt = p.read_text()
    new = txt.replace("min-h-screen", LIVE_MIN).replace(" h-screen ", f" {LIVE_H} ")
    if new != txt:
        p.write_text(new)
        changed.append(f"{rel}: screen units hardened")

# ── 3) التوست + الدرج + الأنماط ──
p = ROOT / "components/ui/toast.tsx"
txt = p.read_text()
new = txt.replace("max-h-screen", LIVE_MAX)
if new != txt:
    p.write_text(new)
    changed.append("components/ui/toast.tsx: max-h hardened")

p = ROOT / "components/ui/drawer.tsx"
txt = p.read_text()
new = txt.replace("max-h-[80vh]", "max-h-[calc(var(--cmdp-vh,1vh)*80)]")
if new != txt:
    p.write_text(new)
    changed.append("components/ui/drawer.tsx: 80vh hardened")

p = ROOT / "components/patterns.tsx"
txt = p.read_text()
new = txt.replace("bg-[length:min(88vw,620px)]",
                  "bg-[length:min(calc(var(--cmdp-vw,1vw)*88),620px)]")
if new != txt:
    p.write_text(new)
    changed.append("components/patterns.tsx: 88vw hardened")

print("\n".join(changed) if changed else "لا تغييرات")
