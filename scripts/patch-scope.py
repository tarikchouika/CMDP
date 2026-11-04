#!/usr/bin/env python3
"""CMDP — فحص نطاق التعاونية في مسارات [id]: الكوأدمن يعدّل سجلات تعاونيته فقط."""
import re, pathlib

ROOT = pathlib.Path("/home/z/my-project/src/app/api")

# resource -> prisma model
MODELS = {
    "members": "member",
    "meetings": "meeting",
    "transactions": "transaction",
    "documents": "document",
    "tasks": "complianceTask",
    "interactions": "entityInteraction",
}

SCOPE_BLOCK = """  const existing = await db.{model}.findUnique({{ where: {{ id: Number(id) }} }});
  if (!existing) return fail("السجل غير موجود", 404);
  if (auth.user.role === "COADMIN" && existing.cooperativeId !== auth.user.cooperativeId) {{
    return denied("هذا السجل خارج نطاق تعاونيتكم");
  }}
"""

count = 0
for resource, model in MODELS.items():
    p = ROOT / resource / "[id]" / "route.ts"
    if not p.exists():
        continue
    src = p.read_text()
    if "const existing = await db." in src:
        continue  # مفحوص مسبقاً
    # أدخل الفحص بعد سطر params مباشرة (يغطي PUT و DELETE)
    new_src = re.sub(
        r"(  const \{ id \} = await params;\n)",
        r"\1" + SCOPE_BLOCK.format(model=model),
        src)
    if new_src != src:
        p.write_text(new_src)
        count += 1
        print(f"  ✔ {p.relative_to(ROOT)}")
print(f"تم تحديث {count} ملفاً")
