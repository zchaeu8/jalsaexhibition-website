#!/usr/bin/env python3
"""Generate web display images + copy full-res PNG downloads for every board."""
import json, os, shutil, sys
from PIL import Image

BASE = "/Users/tahirnasser/Desktop/Jama'at/Jalsa Salana 2026"
EXH = os.path.join(BASE, "Exhibitions")
W = os.path.join(BASE, "Outputs/Website")
MAN = "/private/tmp/claude-501/-Users-tahirnasser/c6b8e948-e0c5-406f-89ab-3e58ee8109fd/scratchpad/manifest.json"

man = json.load(open(MAN))
img_dir = os.path.join(W, "assets/img")
png_dir = os.path.join(W, "assets/posters")
os.makedirs(img_dir, exist_ok=True)
os.makedirs(png_dir, exist_ok=True)

def save_jpg(im, path, longest, q):
    im2 = im.copy()
    im2.thumbnail((longest, longest), Image.LANCZOS)
    if im2.mode in ("RGBA", "P"):
        bg = Image.new("RGB", im2.size, (244, 239, 227))
        bg.paste(im2, mask=im2.split()[-1] if im2.mode == "RGBA" else None)
        im2 = bg
    im2.save(path, "JPEG", quality=q, optimize=True, progressive=True)

for b in man["boards"]:
    src = os.path.join(EXH, b["orig"])
    slug = b["slug"]
    if not os.path.exists(src):
        print("MISSING", src); continue
    im = Image.open(src)
    # full display image (zoomable) ~1800px, thumb ~800px
    save_jpg(im, os.path.join(img_dir, slug + ".jpg"), 1800, 84)
    save_jpg(im, os.path.join(img_dir, slug + "_thumb.jpg"), 800, 80)
    # full-res PNG download (copy original)
    shutil.copy2(src, os.path.join(png_dir, slug + ".png"))
    print("ok", slug)

# social share / OG image from the title board
title = next(b for b in man["boards"] if b["type"] == "title")
im = Image.open(os.path.join(EXH, title["orig"])).convert("RGB")
# center-crop to 1200x630
tw, th = 1200, 630
iw, ih = im.size
scale = max(tw/iw, th/ih)
im2 = im.resize((int(iw*scale), int(ih*scale)), Image.LANCZOS)
l = (im2.width - tw)//2; t = int((im2.height - th)*0.12)
im2.crop((l, t, l+tw, t+th)).save(os.path.join(W, "assets/img/og-image.jpg"), "JPEG", quality=86)
print("OG image done")
print("DONE image build")
