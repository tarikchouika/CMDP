#!/usr/bin/env python3
"""فحص جودة إزالة الخلفية: عدّ الثقوب الداخلية داخل منطقة الشعار."""
from PIL import Image
import numpy as np

im = Image.open("/home/z/my-project/public/logo.png").convert("RGBA")
a = np.array(im.getchannel("A"))
h, w = a.shape
opaque = a > 128

# ثقب داخلي = بكسل شفاف له جيران معتمون في الاتجاهات الأربعة
holes = 0
interior = 0
ys, xs = np.where(~opaque)
for y, x in zip(ys, xs):
    if 1 <= y < h-1 and 1 <= x < w-1:
        n = opaque[y-1, x] or opaque[y+1, x] or opaque[y, x-1] or opaque[y, x+1]
        if n:
            interior += 1
print(f"transparent total: {(~opaque).sum()} ({(~opaque).mean():.1%})")
print(f"transparent pixels adjacent to opaque (edge/holes): {interior} ({interior/max(1,(~opaque).sum()):.1%})")

# فحص عمود منتصف الشعار: نسبة المعتم على طول الخط
mid = opaque[:, w//2]
print(f"opaque ratio along center column: {mid.mean():.1%}")
row = opaque[h//2, :]
print(f"opaque ratio along center row: {row.mean():.1%}")

# قياس لون الوسط (يجب أن يكون ذهبياً وليس شفافاً)
rgb = np.array(im.convert("RGB"))
cy, cx = h//2, w//2
print("center color:", rgb[cy, cx], "alpha:", a[cy, cx])
print("quarter color:", rgb[h//4, w//4], "alpha:", a[h//4, w//4])
