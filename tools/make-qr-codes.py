#!/usr/bin/env python3
"""
Generate QR codes for every board, plus a printable sheet to place beside
each poster. Each code opens that board's audio guide directly.

USAGE:
    pip install segno            # one-time
    python3 tools/make-qr-codes.py https://your-real-domain.org

If you omit the URL it uses the placeholder in the site. Re-run this after
you register your domain (or after your first Netlify deploy) so the codes
point at the live site.
"""
import sys, os, io, json

try:
    import segno
except ImportError:
    sys.exit("Please run:  pip install segno   then try again.")

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.dirname(HERE)
BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://www.prophecyandpersia.com").rstrip("/")

man = json.load(open(os.path.join(WEB, "assets/js/manifest.json"), encoding="utf-8"))
boards = sorted(man["boards"], key=lambda b: b["order"])
sections = {s["id"]: s for s in man["sections"]}

qr_dir = os.path.join(WEB, "assets/qr")
os.makedirs(qr_dir, exist_ok=True)

NAVY = "#16234B"

def qr_svg(data, scale=5, border=0):
    qr = segno.make(data, error="m")
    buff = io.BytesIO()
    qr.save(buff, kind="svg", scale=scale, border=border, dark=NAVY, light=None)
    return buff.getvalue().decode("utf-8")

cards = []
for b in boards:
    url = "%s/#/p/%s" % (BASE, b["slug"])
    svg = qr_svg(url, scale=6)
    # save individual file too
    with open(os.path.join(qr_dir, b["slug"] + ".svg"), "w", encoding="utf-8") as f:
        f.write(svg)
    sec = sections.get(b["section"], {})
    kind = {"title": "Welcome", "header": "Section", "quote": "Quotation"}.get(b["type"], "Board")
    cards.append(
        '<div class="qcard">'
        '<div class="qtop"><span class="kk">%s</span><span class="stop">Stop %02d</span></div>'
        '<div class="qr">%s</div>'
        '<div class="qtitle">%s</div>'
        '<div class="qsec">%s</div>'
        '<div class="qcta">Scan for the audio guide &middot; 11 languages</div>'
        '</div>' % (kind, b["order"], svg, b["title"], sec.get("title", ""))
    )

html = """<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>Prophecy &amp; Persia — QR codes for print</title>
<style>
@page {{ size: A4; margin: 12mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: Georgia, 'Times New Roman', serif; color:#16234B; background:#fff; margin:0; }}
.head {{ text-align:center; padding:10mm 0 4mm; }}
.head h1 {{ font-size:22pt; margin:0; letter-spacing:.01em; }}
.head p {{ font-size:10pt; color:#6B6453; margin:3mm 0 0; font-family:Arial,sans-serif; }}
.base {{ font-family:Arial,sans-serif; font-size:8pt; color:#A9852E; margin-top:2mm; }}
.grid {{ display:grid; grid-template-columns:repeat(3,1fr); gap:6mm; padding:4mm; }}
.qcard {{ border:1px solid #d8cfb8; border-radius:4mm; padding:5mm 4mm; text-align:center;
  page-break-inside:avoid; display:flex; flex-direction:column; align-items:center; }}
.qtop {{ display:flex; justify-content:space-between; width:100%; font-family:Arial,sans-serif;
  font-size:6.5pt; letter-spacing:.14em; text-transform:uppercase; color:#A9852E; font-weight:bold; }}
.qr {{ width:38mm; height:38mm; margin:3mm 0; }}
.qr svg {{ width:100%; height:100%; }}
.qtitle {{ font-size:12.5pt; font-weight:bold; line-height:1.1; margin-top:1mm; }}
.qsec {{ font-family:Arial,sans-serif; font-size:7.5pt; color:#6B6453; margin-top:1mm; }}
.qcta {{ font-family:Arial,sans-serif; font-size:6.8pt; color:#16234B; margin-top:3mm;
  border-top:1px solid #e6ddca; padding-top:2mm; width:100%; }}
</style></head><body>
<div class="head">
  <h1>Prophecy &amp; Persia</h1>
  <p>Place each code beside its board. Visitors scan to open the audio guide in eleven languages.</p>
  <p class="base">Codes point to: {base}</p>
</div>
<div class="grid">{cards}</div>
</body></html>""".format(base=BASE, cards="".join(cards))

out = os.path.join(WEB, "print-qr-codes.html")
with open(out, "w", encoding="utf-8") as f:
    f.write(html)

print("Base URL:", BASE)
print("Wrote %d QR SVGs to assets/qr/" % len(boards))
print("Wrote printable sheet:", out)
print("Open print-qr-codes.html in a browser and print to A4 (or Save as PDF).")
