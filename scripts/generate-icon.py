"""Generate OCR Desktop app icon (1024x1024 PNG)"""
from PIL import Image, ImageDraw
import os

SIZE = 1024
PAD = 120  # padding from edge

img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Blue rounded rectangle background
draw.rounded_rectangle([PAD, PAD, SIZE - PAD, SIZE - PAD],
    radius=180, fill=(37, 99, 235, 255))

# White document area
doc_l, doc_t, doc_r, doc_b = 280, 220, 780, 760
draw.rounded_rectangle([doc_l, doc_t, doc_r, doc_b],
    radius=40, fill=(255, 255, 255, 255))

# Text lines on document
line_color = (200, 205, 215)
for i in range(5):
    y = doc_t + 70 + i * 100
    draw.rounded_rectangle([doc_l + 55, y, min(doc_r - 55, doc_l + 400), y + 18],
        radius=9, fill=line_color)

# Magnifying glass (bottom-right)
cx, cy, r = doc_r + 50, doc_b + 30, 100
# Glass circle
draw.ellipse([cx - r, cy - r, cx + r, cy + r],
    fill=(37, 99, 235, 200), outline=(255, 255, 255, 255), width=12)
# Glass handle
import math
hx = cx + int(r * 0.7)
hy = cy + int(r * 0.7)
draw.line([hx, hy, hx + 100, hy + 100],
    fill=(255, 255, 255, 255), width=26)

# Save
out_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
os.makedirs(out_dir, exist_ok=True)
out_path = os.path.join(out_dir, "icon.png")
img.save(out_path, "PNG")
print(f"Icon saved: {out_path} ({SIZE}x{SIZE})")
