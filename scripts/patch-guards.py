#!/usr/bin/env python3
"""CMDP — إضافة حراسة الصلاحيات إلى مسارات التسيير الحالية (POST/PUT/DELETE).
لا يمسّ مسارات المصادقة/المستخدمين/الفرص/الطلبات (مكتوبة يدوياً بمصادقة كاملة)."""
import re, pathlib

ROOT = pathlib.Path("/home/z/my-project/src/app/api")

# resource -> permission
GUARDS = {
    "members": "manage:members",
    "meetings": "manage:assemblies",
    "assemblies": None,  # تم تحديثه يدوياً
    "transactions": "manage:finance",
    "documents": "manage:documents",
    "tasks": "manage:assemblies",
    "interactions": "manage:entities",
}

IMPORT_LINE = 'import { coopAccessDenied, denied, requirePermission } from "@/lib/auth";\n'

def patch_file(path: pathlib.Path, permission: str) -> bool:
    src = path.read_text()
    if "await requirePermission(" in src:
        return False  # محمي مسبقاً
    lines = src.split("\n")
    # 1) أضف الاستيراد بعد استيراد api-server
    out = []
    for ln in lines:
        out.append(ln)
        if ln.startswith("import") and "api-server" in ln:
            out.append(IMPORT_LINE.rstrip("\n"))
    src = "\n".join(out)

    # 2) أدخل الحارس في بداية كل دالة كتابة
    guard_block = (
        f'  const auth = await requirePermission(req, "{permission}");\n'
        f'  if ("response" in auth) return auth.response;\n'
    )
    def add_guard(m: re.Match) -> str:
        head = m.group(0)
        return f"{head}\n{guard_block}"

    src = re.sub(
        r"export async function (?:POST|PUT|DELETE)\(req: Request, \{ params \}: \{ params: Promise<\{ id: string \}> \}\) \{",
        add_guard, src)
    src = re.sub(
        r"export async function (?:POST|PUT|DELETE)\(req: Request\) \{",
        add_guard, src)

    # 3) تحقق نطاق التعاونية عند وجود cooperativeId في الجسم
    src = re.sub(
        r"(if \(!b\.cooperativeId[^\n]*\n)",
        r"\1  if (coopAccessDenied(auth.user, Number(b.cooperativeId))) return denied(\"هذه التعاونية خارج نطاق صلاحياتكم\");\n",
        src)

    # 4) DELETE بدون req — تأكد من وجود req: Request
    src = src.replace(
        "export async function DELETE(_req: Request, { params }",
        "export async function DELETE(req: Request, { params }")

    path.write_text(src)
    return True

count = 0
for resource, perm in GUARDS.items():
    if perm is None:
        continue
    for p in sorted(ROOT.glob(f"{resource}/**/*.ts")):
        if p.name == "route.ts" and patch_file(p, perm):
            count += 1
            print(f"  ✔ {p.relative_to(ROOT)}")
print(f"تم تحديث {count} ملفاً")
