#!/usr/bin/env python3
"""تحويل النسخ الثقيلة إلى WebP مع تصغير العلامة المائية."""
from PIL import Image, ImageFilter
import os

OUT = "/home/z/my-project/public"
src = Image.open(f"{OUT}/logo.png").convert("RGBA")

# 1) اللوغو الكامل للويب — WebP
web = src.copy()
web.thumbnail((880, 880), Image.LANCZOS)
web.save(f"{OUT}/logo-web.webp", "WEBP", quality=88, method=6)
print("logo-web.webp:", os.path.getsize(f"{OUT}/logo-web.webp"))

# 2) نسخة الترويسة — WebP
head = src.copy()
head.thumbnail((420, 160), Image.LANCZOS)
head.save(f"{OUT}/logo-header.webp", "WEBP", quality=90, method=6)
print("logo-header.webp:", os.path.getsize(f"{OUT}/logo-header.webp"))

# 3) العلامة المائية — 560px + WebP (تُعرض بشفافية منخفضة أصلاً)
for name, op in (("watermark.webp", 0.065), ("watermark-strong.webp", 0.10)):
    wm = src.copy()
    wm.thumbnail((560, 560), Image.LANCZOS)
    a = wm.getchannel("A").point(lambda v, o=op: int(v * o))
    wm.putalpha(a)
    wm = wm.filter(ImageFilter.GaussianBlur(0.5))
    wm.save(f"{OUT}/{name}", "WEBP", quality=80, method=6)
    print(f"{name}:", os.path.getsize(f"{OUT}/{name}"))

# 4) أيقونة الشاتبوت — WebP خفيفة
Image.open(f"{OUT}/chatbot-icon.png").save(f"{OUT}/chatbot-icon.webp", "WEBP", quality=90, method=6)
print("chatbot-icon.webp:", os.path.getsize(f"{OUT}/chatbot-icon.webp"))

# 5) أيقونات PWA — WebP صغيرة
for s in (192, 512):
    im = src.copy()
    im.thumbnail((s, s), Image.LANCZOS)
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    canvas.paste(im, ((s - im.width)//2, (s - im.height)//2), im)
    canvas.save(f"{OUT}/icon-{s}.webp", "WEBP", quality=88, method=6)
    print(f"icon-{s}.webp:", os.path.getsize(f"{OUT}/icon-{s}.webp"))

# تنظيف النسخ الثقيلة غير المستعملة
for f in ("logo-web.png", "logo-header.png", "watermark.png", "watermark-strong.png"):
    os.remove(f"{OUT}/{f}")
print("cleaned heavy pngs")
