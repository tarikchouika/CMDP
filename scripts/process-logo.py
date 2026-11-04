#!/usr/bin/env python3
"""CMDP — تحليل اللوغو الرسمي الجديد وإنتاج كل النسخ المطلوبة."""
import os
from PIL import Image, ImageDraw, ImageFilter

SRC = "/home/z/my-project/upload/Ornate Gilded CMDP Emblem.png"
OUT = "/home/z/my-project/public"
os.makedirs(OUT, exist_ok=True)

im = Image.open(SRC).convert("RGBA")
W, H = im.size
print("opened:", im.size, im.mode)

# --- 1) كشف لون الزوايا (خلفية محتملة) ---
px = im.load()
corners = [px[0, 0], px[W-1, 0], px[0, H-1], px[W-1, H-1]]
print("corners:", corners)

# --- 2) إزالة الخلفية الموحّدة إن وُجدت (احتمال تدرّج خفيف: نستخدم عتبة لمعان) ---
# اللوغو ذهبي داكن على الأرجح خلفية شفافة أو بيضاء؛ نفحص متوسط الزوايا
def near(c1, c2, tol=28):
    return all(abs(a - b) <= tol for a, b in zip(c1[:3], c2[:3]))

bg = corners[0]
# إذا كانت الزوايا متشابهة وليست ذهبية → نعتبرها خلفية ونزيلها
gold_like = (bg[0] > 150 and bg[1] > 100 and bg[2] < 120)
if not gold_like:
    # نمسح كل بكسل قريب من لون الزوايا الأربع (خلفية شبه موحدة)
    bg_set = {c[:3] for c in corners}
    data = im.getdata()
    cleaned = []
    for r, g, b, a in data:
        if any(near((r, g, b), b3) for b3 in bg_set):
            cleaned.append((r, g, b, 0))
        else:
            cleaned.append((r, g, b, a))
    im.putdata(cleaned)
    print("background removed, bg was:", bg)
else:
    print("corners look golden; keeping as-is")

# --- 3) قصّ الصندوق المحيط بالمحتوى غير الشفاف ---
bbox = im.getbbox()
print("bbox:", bbox)
if bbox:
    im = im.crop(bbox)
W, H = im.size
print("cropped:", (W, H))

def save_square(img, size, path, pad_ratio=0.0, bg_color=None):
    """يحفظ نسخة مربعة بحجم محدد مع حشوة اختيارية وخلفية اختيارية."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0) if bg_color is None else bg_color)
    ratio = (1 - pad_ratio * 2)
    target = int(size * ratio)
    tmp = img.copy()
    tmp.thumbnail((target, target), Image.LANCZOS)
    x = (size - tmp.width) // 2
    y = (size - tmp.height) // 2
    canvas.paste(tmp, (x, y), tmp)
    canvas.save(path)
    return canvas

# --- النسخ الأساسية ---
im.save(f"{OUT}/logo.png")                       # الأصل (شفاف، مقصوص)
save_square(im, 512, f"{OUT}/icon-512.png")
save_square(im, 192, f"{OUT}/icon-192.png")
save_square(im, 180, f"{OUT}/apple-touch-icon.png", pad_ratio=0.04)
save_square(im, 64,  f"{OUT}/logo-64.png")
save_square(im, 96,  f"{OUT}/logo-96.png")

# favicon متعدد الأحجام (ICO)
fav = [save_square(im, s, f"/tmp/_fav_{s}.png") for s in (48, 32, 16)]
fav[1].save(f"{OUT}/favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)], append_images=[fav[0], fav[2]])
for s in (48, 32, 16):
    os.remove(f"/tmp/_fav_{s}.png")

# أيقونة الشاتبوت: مربعة بخلفية داكنة دافئة + حدود ذهبية رقيقة
S = 256
chat = Image.new("RGBA", (S, S), (0, 0, 0, 0))
disc = Image.new("RGBA", (S, S), (0, 0, 0, 0))
d = ImageDraw.Draw(disc)
d.ellipse([4, 4, S-5, S-5], fill=(60, 30, 12, 255))
d.ellipse([4, 4, S-5, S-5], outline=(217, 160, 63, 255), width=6)
chat = Image.alpha_composite(chat, disc)
mark = im.copy()
mark.thumbnail((S - 78, S - 78), Image.LANCZOS)
chat.paste(mark, ((S - mark.width)//2, (S - mark.height)//2), mark)
chat.save(f"{OUT}/chatbot-icon.png")

# العلامة المائية: نسخة كبيرة نصف شفافة (للاستخدام كخلفية زخرفية)
wm = im.copy()
a = wm.getchannel("A").point(lambda v: int(v * 0.06))
wm.putalpha(a)
wm.save(f"{OUT}/watermark.png")

# نسخة داكنة للوضع الفاتح إذا احتجنا (غير شفافة بقليل) — wm2 بحد 9%
wm2 = im.copy()
a2 = wm2.getchannel("A").point(lambda v: int(v * 0.10))
wm2.putalpha(a2)
wm2.save(f"{OUT}/watermark-strong.png")

# معاينة النتائج
for f in ["logo.png", "icon-512.png", "favicon.ico", "chatbot-icon.png", "watermark.png", "watermark-strong.png"]:
    p = os.path.join(OUT, f)
    print(f"{f}: {os.path.getsize(p)} bytes")

# فحص نسبة البكسلات غير الشفافة للتأكد من نجاح إزالة الخلفية
alpha = im.getchannel("A")
hist = alpha.histogram()
opaque = sum(hist[128:])
total = im.size[0] * im.size[1]
print(f"opaque ratio: {opaque/total:.2%}")
