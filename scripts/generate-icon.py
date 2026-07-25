"""Generate OCR Desktop app icon"""
from PIL import Image, ImageDraw
import os

size = 1024
img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

margin = 80

# Blue gradient rounded background
for y in range(size):
    r, g, b = 37, 99, 235
    for x in range(size):
        dist_tl = ((x - margin) ** 2 + (y - margin) ** 2) ** 0.5 if x < margin and y < margin else margin
        dist_tr = ((x - (size - margin)) ** 2 + (y - margin) ** 2) ** 0.5 if x > size - margin and y < margin else margin
        dist_bl = ((x - margin) ** 2 + (y - (size - margin)) ** 2) ** 0.5 if x < margin and y > size - margin else margin
        dist_br = ((x - (size - margin)) ** 2 + (y - (size - margin)) ** 2) ** 0.5 if x > size - margin and y > size - margin else margin
        if min(dist_tl, dist_tr, dist_bl, dist_br) < margin:
            img.putpixel((x, y), (r, g, b, 255))

# White document
d_x1, d_y1, d_x2, d_y2 = 250, 180, 770, 700
draw.rounded_rectangle([d_x1, d_y1, d_x2, d_y2], radius=30, fill=(255, 255, 255, 255))

# Text lines
for i in range(6):
    y_pos = d_y1 + 60 + i * 85
    draw.rounded_rectangle([d_x1 + 50, y_pos, d_x2 - 50, y_pos + 16], radius=8, fill=(180, 190, 210))

# Magnifying glass
gc_x, gc_y, gr = d_x2 + 40, d_y2 + 40, 100
draw.ellipse([gc_x - gr, gc_y - gr, gc_x + gr, gc_y + gr],
             fill=(37, 99, 235, 180), outline=(255, 255, 255, 255), width=10)
draw.line([gc_x + gr * 0.7, gc_y + gr * 0.7, gc_x + gr * 2.2, gc_y + gr * 2.2],
          fill=(255, 255, 255, 255), width=24)

# Save
icon_dir = os.path.join(os.path.dirname(__file__), "..", "frontend", "build")
os.makedirs(icon_dir, exist_ok=True)
img.save(os.path.join(icon_dir, "icon.png"))
print(f"Icon saved to {icon_dir}/icon.png (1024x1024, RGBA)")
