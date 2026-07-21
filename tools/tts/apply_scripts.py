#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_scripts.py — write finished narration scripts into data.js.

Reads per-language script files from tools/tts/build/final/<lang>.json, each a
JSON object { "<board-slug>": "the script text", ... }, and updates
scripts[<lang>].script for each board in assets/js/data.js. Titles, blurbs,
audioOverrides, previousYears and everything else are preserved.

  python3 tools/tts/apply_scripts.py            # apply every build/final/*.json
  python3 tools/tts/apply_scripts.py --langs en,ur   # only these languages
  python3 tools/tts/apply_scripts.py --check    # report coverage, write nothing

After applying, regenerate audio:
  python3 tools/tts/generate_audio.py --all --force
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
WEB_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DATA_JS = os.path.join(WEB_ROOT, "assets", "js", "data.js")
FINAL_DIR = os.path.join(HERE, "build", "final")

sys.path.insert(0, HERE)
import generate_audio as g  # reuse load_site / _extract_braced

HEADER = ("/* =====================================================================\n"
          "   data.js — content for Prophecy & Persia\n"
          "   Boards, 11-language audio-guide scripts, sections, archive.\n"
          "   Narration scripts are managed via tools/tts/ (see tools/tts/README.md).\n"
          "   ===================================================================== */\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--langs", default="", help="comma-separated codes (default: all found)")
    ap.add_argument("--check", action="store_true", help="report coverage only")
    args = ap.parse_args()

    site = g.load_site()
    boards_by_slug = {b["slug"]: b for b in site["boards"]}
    all_slugs = set(boards_by_slug)

    want = set(s.strip() for s in args.langs.split(",") if s.strip())
    files = sorted(f for f in os.listdir(FINAL_DIR) if f.endswith(".json")) \
        if os.path.isdir(FINAL_DIR) else []

    applied = {}
    for fn in files:
        lang = fn[:-5]
        if want and lang not in want:
            continue
        data = json.load(open(os.path.join(FINAL_DIR, fn), encoding="utf-8"))
        missing = sorted(all_slugs - set(data))
        extra = sorted(set(data) - all_slugs)
        print("  %-3s : %d/%d boards%s%s" % (
            lang, len(set(data) & all_slugs), len(all_slugs),
            "  MISSING: " + ",".join(missing) if missing else "",
            "  UNKNOWN: " + ",".join(extra) if extra else ""))
        applied[lang] = data

    if args.check:
        return

    n = 0
    for lang, data in applied.items():
        for slug, script in data.items():
            b = boards_by_slug.get(slug)
            if not b:
                continue
            script = (script or "").strip()
            if not script:
                continue
            b.setdefault("scripts", {}).setdefault(lang, {})
            # keep existing title/blurb; only replace the spoken script
            if "title" not in b["scripts"][lang]:
                b["scripts"][lang]["title"] = b.get("title", "")
            b["scripts"][lang]["script"] = script
            n += 1

    body = "window.SITE = " + json.dumps(site, ensure_ascii=False, indent=1) + ";\n"
    with open(DATA_JS, "w", encoding="utf-8") as f:
        f.write(HEADER + body)
    print("\nApplied %d script(s) across %d language(s) into data.js." %
          (n, len(applied)))


if __name__ == "__main__":
    main()
