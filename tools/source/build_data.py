#!/usr/bin/env python3
"""Assemble manifest + English + translation JSON into the site's data.js."""
import json, os

SCR = "/private/tmp/claude-501/-Users-tahirnasser/c6b8e948-e0c5-406f-89ab-3e58ee8109fd/scratchpad"
SITEJS = "/Users/tahirnasser/Desktop/Jama'at/Jalsa Salana 2026/Outputs/Website/assets/js/data.js"
man = json.load(open(os.path.join(SCR, "manifest.json")))

LANGS = [
    {"code":"en","name":"English","native":"English","bcp47":"en-GB","dir":"ltr","voiceHints":["Serena","Daniel","Arthur","Kate","Google UK English"]},
    {"code":"ur","name":"Urdu","native":"اردو","bcp47":"ur-PK","dir":"rtl","voiceHints":["Urdu"]},
    {"code":"ar","name":"Arabic","native":"العربية","bcp47":"ar-SA","dir":"rtl","voiceHints":["Maged","Tarik","Laila","Arabic"]},
    {"code":"es","name":"Spanish","native":"Español","bcp47":"es-ES","dir":"ltr","voiceHints":["Mónica","Monica","Jorge","Google español"]},
    {"code":"fr","name":"French","native":"Français","bcp47":"fr-FR","dir":"ltr","voiceHints":["Thomas","Amélie","Amelie","Google français"]},
    {"code":"de","name":"German","native":"Deutsch","bcp47":"de-DE","dir":"ltr","voiceHints":["Anna","Google Deutsch"]},
    {"code":"pt","name":"Portuguese","native":"Português","bcp47":"pt-PT","dir":"ltr","voiceHints":["Joana","Luciana","Google português"]},
    {"code":"sw","name":"Swahili","native":"Kiswahili","bcp47":"sw-KE","dir":"ltr","voiceHints":["Swahili"]},
    {"code":"zh","name":"Mandarin","native":"中文","bcp47":"zh-CN","dir":"ltr","voiceHints":["Ting-Ting","Tingting","Mei-Jia","Yaoyao","Google 普通话"]},
    {"code":"ja","name":"Japanese","native":"日本語","bcp47":"ja-JP","dir":"ltr","voiceHints":["Kyoko","O-ren","Otoya","Google 日本語"]},
    {"code":"ms","name":"Malay","native":"Bahasa Melayu","bcp47":"ms-MY","dir":"ltr","voiceHints":["Amira","Malay"]},
]

# load script sets (English lives in english.json; others are <code>.json)
scripts = {}
for l in LANGS:
    fname = "english.json" if l["code"] == "en" else (l["code"] + ".json")
    p = os.path.join(SCR, "scripts", fname)
    scripts[l["code"]] = json.load(open(p, encoding="utf-8")) if os.path.exists(p) else {}
eng = scripts["en"]
assert eng and all(eng[k].get("script") for k in eng), "English scripts missing/empty!"

boards = []
missing = {l["code"]:0 for l in LANGS}
for b in man["boards"]:
    bid = b["id"]; slug = b["slug"]
    e = eng.get(bid, {})
    entry = {
        "order": b["order"], "id": bid, "slug": slug, "section": b["section"],
        "type": b["type"], "title": b["title"],
        "image": "assets/img/%s.jpg" % slug,
        "thumb": "assets/img/%s_thumb.jpg" % slug,
        "download": "assets/posters/%s.png" % slug,
        "scripts": {}
    }
    # english entry (with blurb)
    entry["scripts"]["en"] = {"title": e.get("title", b["title"]),
                              "blurb": e.get("blurb", ""),
                              "script": e.get("script", "")}
    for l in LANGS:
        if l["code"] == "en": continue
        s = scripts[l["code"]].get(bid)
        if s and s.get("script"):
            entry["scripts"][l["code"]] = {"title": s.get("title", b["title"]), "script": s["script"]}
        else:
            missing[l["code"]] += 1
    boards.append(entry)

previous_years = [
    {"year":2025,"title":"National Outreach Exhibition 2025","description":"A previous exhibition in the annual National Outreach series. Boards and a downloadable PDF will be published here.","sections":["Downloads coming soon"],"pdf":None},
    {"year":2024,"title":"National Outreach Exhibition 2024","description":"A previous exhibition in the annual National Outreach series. Boards and a downloadable PDF will be published here.","sections":["Downloads coming soon"],"pdf":None},
    {"year":2023,"title":"National Outreach Exhibition 2023","description":"A previous exhibition in the annual National Outreach series. Boards and a downloadable PDF will be published here.","sections":["Downloads coming soon"],"pdf":None},
]

SITE = {
    "exhibition": man["exhibition"],
    "languages": LANGS,
    "sections": man["sections"],
    "boards": boards,
    "previousYears": previous_years,
    "audioOverrides": {}
}

header = ("/* =====================================================================\n"
          "   data.js — auto-generated content for Prophecy & Persia\n"
          "   Boards, 11-language audio-guide scripts, sections, archive.\n"
          "   To add pre-recorded audio for a board+language, add to audioOverrides:\n"
          "     audioOverrides['the-cyrus-cylinder'] = { ur: 'audio/ur/the-cyrus-cylinder.mp3' }\n"
          "   ===================================================================== */\n")
with open(SITEJS, "w", encoding="utf-8") as f:
    f.write(header)
    f.write("window.SITE = ")
    json.dump(SITE, f, ensure_ascii=False, indent=1)
    f.write(";\n")

print("boards:", len(boards))
print("languages present (missing board-scripts per lang):")
for l in LANGS:
    if l["code"]=="en": continue
    print("  %s: %d missing" % (l["code"], missing[l["code"]]))
print("wrote", SITEJS, "size", os.path.getsize(SITEJS)//1024, "KB")
