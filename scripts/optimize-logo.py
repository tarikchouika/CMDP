#!/usr/bin/env python3
"""تحسين نسخ الويب: تصغير + ضغط للحفاظ على سرعة التحميل."""
from PIL import Image
import os

OUT = "/home/z/my-project/public"

src = Image.open(f"{OUT}/logo.png").convert("RGBA")

# 1) نسخة الويب الكاملة (ترويسة/فوتر) — عرض أقصى 900px
web = src.copy()
web.thumbnail((900, 900), Image.LANCZOS)
web.save(f"{OUT}/logo-web.png", optimize=True)
print("logo-web.png:", os.path.getsize(f"{OUT}/logo-web.png"))

# 2) نسخة أفقية صغيرة للترويسة (ارتفاع ~120px)
head = src.copy()
head.thumbnail((420, 160), Image.LANCZOS)
head.save(f"{OUT}/logo-header.png", optimize=True)
print("logo-header.png:", os.path.getsize(f"{OUT}/logo-header.png"))

# 3) العلامة المائية — 720px بشفافية 6% و7% (نسختان حسب الوضع)
for name, op in (("watermark.png", 0.06), ("watermark-strong.png", 0.09)):
    wm = src.copy()
    wm.thumbnail((720, 720), Image.LANCZOS)
    a = wm.getchannel("A").point(lambda v, o=op: int(v * o))
    wm.putalpha(a)
    # تدرّج ناعم: ضبابية طفيفة تمنع الحواف الحادة في الخلفية
    wm = wm.filter(__import__("PIL.ImageFilter", fromlist=["GaussianBlur"]).GaussianBlur(0.6))
    wm.save(f"{OUT}/{name}", optimize=True)
    print(f"{name}:", os.path.getsize(f"{OUT}/{name}"))

# 4) نسخ أصلية عالية الدقة محفوظة في مجلد brand/ للأرشيف
os.makedirs(f"{OUT}/brand", exist_ok=True)
src.save(f"{OUT}/brand/emblem-original.png", optimize=True)
print("brand/emblem-original.png:", os.path.getsize(f"{OUT}/brand/emblem-original.png"))

# 5) صورة مرفق للتطبيق (splash): خلفية كريمية + شعار كبير وسط
S = 1080
splash = Image.new("RGB", (S, S), (250, 246, 238))
big = src.copy()
big.thumbnail((760, 760), Image.LANCZOS)
# لصق مع احترام الألفا
mask = big.getchannel("A")
splash_rgba = splash.convert("RGBA")
splash_rgba.paste(big, ((S - big.width)//2, (S - big.height)//2), mask)
splash_rgba.convert("RGB").save(f"{OUT}/brand/splash-light.png", optimize=True)
print("brand/splash-light.png:", os.path.getsize(f"{OUT}/brand/splash-light.png"))

# نسخة داكنة للـ splash
splash_d = Image.new("RGB", (S, S), (26, 15, 8))
splash_d_rgba = splash_d.convert("RGBA")
splash_d_rgba.paste(big, ((S - big.width)//2, (S - big.height)//2), mask)
splash_d_rgba.convert("RGB").save(f"{OUT}/brand/splash-dark.png", optimize=True)
print("brand/splash-dark.png:", os.path.getsize(f"{OUT}/brand/splash-dark.png"))
