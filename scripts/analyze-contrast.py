#!/usr/bin/env python3
"""تحليل ألوان مناطق محددة من السكرين شوتس لحساب نسب التباين الفعلية."""
from PIL import Image
from collections import Counter
import sys

def luminance(rgb):
    def chan(c):
        c = c / 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb[:3]
    return 0.2126 * chan(r) + 0.7152 * chan(g) + 0.0722 * chan(b)

def contrast(c1, c2):
    l1, l2 = luminance(c1), luminance(c2)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)

def analyze(path, box, label):
    im = Image.open(path).convert("RGB")
    print(f"\n=== {label} ===")
    print(f"image size: {im.size}")
    w, h = im.size
    bl, bt, br, bb = box
    l, t, r, b = int(bl * w), int(bt * h), int(br * w), int(bb * h)
    crop = im.crop((l, t, r, b))
    # أكثر الألوان شيوعاً (الخلفية) مقابل الألوان المتطرفة (النص)
    px = list(crop.getdata())
    cnt = Counter(px)
    bg = cnt.most_common(3)
    print("top colors (bg):", [(f"#{r:02x}{g:02x}{b_:02x}", n) for (r, g, b_), n in bg])
    # النص: بكسلات نادرة نسبياً لكن ليست ضوضاء — نأخذ أكثر الألوان "المتباعدة" شيوعاً
    rare = [c for c, n in cnt.most_common() if n >= 8]
    if rare:
        bgc = bg[0][0]
        # أبعد الألوان عن الخلفية من حيث الإضاءة
        def dist(c):
            return abs(luminance(c) - luminance(bgc))
        far = sorted(rare, key=dist, reverse=True)[:5]
        print("candidate text colors:", [f"#{r:02x}{g:02x}{b_:02x}" for (r, g, b_) in far])
        print(f"contrast(best text vs bg): {contrast(far[0], bgc):.2f}:1")
    crop.save(f"/tmp/crop_{label}.png")

# 1) سكرين شوت 4 (ES landing): منطقة الشعار والعنوان أعلى الصفحة
analyze("/home/z/my-project/upload/Screenshot_20261104_223932_CMDP.jpg", (0.02, 0.03, 0.98, 0.16), "es_logo_title")
# 2) سكرين شوت 2 (register): منطقة عنوان Join CMDP
analyze("/home/z/my-project/upload/Screenshot_20261104_223359_Opera.jpg", (0.05, 0.06, 0.95, 0.17), "join_title")
# 3) سكرين شوت 2: منطقة التبويبات
analyze("/home/z/my-project/upload/Screenshot_20261104_223359_Opera.jpg", (0.05, 0.16, 0.95, 0.27), "join_tabs")
# 4) سكرين شوت 3 (dashboard): منطقة tooltip الرسم الدائري
analyze("/home/z/my-project/upload/Screenshot_20261104_223537_Opera.jpg", (0.30, 0.42, 0.72, 0.62), "dash_tooltip")
# 5) سكرين شوت 1 (landing): بطاقة الخطوات
analyze("/home/z/my-project/upload/Screenshot_20261104_223247_Opera.jpg", (0.45, 0.52, 0.98, 0.95), "landing_steps")
