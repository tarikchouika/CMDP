#!/usr/bin/env python3
"""توليد أيقونات أندرويد من الشعار الرسمي: mipmaps + adaptive icons + splash."""
from PIL import Image, ImageDraw
import os

SRC = "/home/z/my-project/public/logo.png"
RES = "/home/z/my-project/android/app/src/main/res"
os.makedirs(RES, exist_ok=True)

src = Image.open(SRC).convert("RGBA")

# خلفية الأيقونة التكيفية: تدرّج داكن دافئ (طين مغربي)
def adaptive_bg(size):
    bg = Image.new("RGB", (size, size))
    px = bg.load()
    top = (0x6e, 0x33, 0x1c)   # طين داكن
    bot = (0x3a, 0x1a, 0x0c)   # بني عميق
    for y in range(size):
        r = top[0] + (bot[0] - top[0]) * y // size
        g = top[1] + (bot[1] - top[1]) * y // size
        b = top[2] + (bot[2] - top[2]) * y // size
        for x in range(size):
            px[x, y] = (r, g, b)
    return bg

# ── 1) أيقونات mipmap التقليدية ──
DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
for d, s in DENSITIES.items():
    ddir = f"{RES}/mipmap-{d}"
    os.makedirs(ddir, exist_ok=True)
    # ic_launcher: الشعار على خلفية متدرجة داخل مربع بزوايا دائرية (النظام يقصّها)
    bg = adaptive_bg(s).convert("RGBA")
    mark = src.copy()
    mark.thumbnail((int(s * 0.72), int(s * 0.72)), Image.LANCZOS)
    # توسيط عمودي (الشعار أفقي عريض)
    bg.paste(mark, ((s - mark.width) // 2, (s - mark.height) // 2), mark)
    bg.save(f"{ddir}/ic_launcher.png")
    # ic_launcher_round: نسخة دائرية
    rnd = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    mask = Image.new("L", (s, s), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, s - 1, s - 1], fill=255)
    rnd.paste(bg, (0, 0), mask)
    rnd.save(f"{ddir}/ic_launcher_round.png")

# ── 2) الأيقونة التكيفية (Android 8+) ──
AD = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}
for d, s in AD.items():
    ddir = f"{RES}/mipmap-{d}"
    # الخلفية: تدرّج (يمكن أيضاً لون صافٍ عبر XML — نستخدم PNG للتدرّج)
    adaptive_bg(s).save(f"{ddir}/ic_launcher_bg.png")
    # المقدمة: الشعار داخل المنطقة الآمنة (66% من 108dp = ~71dp → 0.62)
    fg = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    mark = src.copy()
    mark.thumbnail((int(s * 0.60), int(s * 0.60)), Image.LANCZOS)
    fg.paste(mark, ((s - mark.width) // 2, (s - mark.height) // 2), mark)
    fg.save(f"{ddir}/ic_launcher_fg.png")

# ── 3) شاشة البدء ──
os.makedirs("/home/z/my-project/android/app/src/main/res/drawable", exist_ok=True)
S = 1200
splash = adaptive_bg(S).convert("RGBA")
mark = src.copy()
mark.thumbnail((int(S * 0.62), int(S * 0.62)), Image.LANCZOS)
splash.paste(mark, ((S - mark.width) // 2, (S - mark.height) // 2), mark)
# لمسة ذهبية سفلية: خط زخرفي
d = ImageDraw.Draw(splash)
d.rectangle([0, S - 14, S, S], fill=(217, 160, 63, 255))
splash.save("/home/z/my-project/android/app/src/main/res/drawable/splash.png")

print("Android icons generated:")
for root, _, files in os.walk(RES):
    for f in files:
        p = os.path.join(root, f)
        print("  ", p.split("android/")[-1], os.path.getsize(p))
