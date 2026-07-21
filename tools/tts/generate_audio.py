#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_audio.py — build natural-voice narration MP3s for Prophecy & Persia.

WHAT IT DOES
  Reads the narration text straight out of  assets/js/data.js  (the very same
  scripts[lang].script that shows on screen as the read-along), speaks each one
  with a natural neural voice, and saves:

        audio/<lang>/<board-slug>.mp3

  It then rewrites the "audioOverrides" map at the bottom of data.js so the
  website automatically plays every MP3 that exists (any board+language WITHOUT
  a file keeps using the phone's on-device voice).

  Because the MP3 is generated from the exact on-screen text, the audio and the
  read-along always match — one source of truth per board+language.

TWO VOICE ENGINES
  --engine edge     Microsoft Edge neural voices.  FREE, no API key, no account.
                    (These are the Azure Neural voices — includes native
                    Pakistani Urdu ur-PK, Swahili sw-KE, Malay ms-MY.)  DEFAULT.

  --engine google   Google Cloud Text-to-Speech.  Needs a key:
                        export GOOGLE_TTS_API_KEY=...        (or --api-key ...)
                    Picks the most natural voice available per language
                    (Chirp3-HD > Neural2 > Wavenet > Standard).

EXAMPLES
  # Pilot: three boards, every language, free Edge voices
  python3 tools/tts/generate_audio.py \
      --boards prophecy-and-persia,promise-of-the-holy-quran,the-cyrus-cylinder

  # Everything, all languages
  python3 tools/tts/generate_audio.py --all

  # Same, but with Google once you have a key
  python3 tools/tts/generate_audio.py --all --engine google --api-key "AIza..."

  # Only rebuild the audioOverrides map from whatever MP3s already exist
  python3 tools/tts/generate_audio.py --overrides-only

Requires (edge engine):  pip install --user edge-tts
Requires (google engine): nothing extra — uses the standard library.
"""

import argparse
import base64
import json
import os
import re
import sys
import time
import urllib.request
import urllib.error
import urllib.parse

# ---------------------------------------------------------------------------
# Paths — resolved relative to this file so it works from anywhere.
# ---------------------------------------------------------------------------
HERE = os.path.dirname(os.path.abspath(__file__))
WEB_ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))   # .../Website/
DATA_JS = os.path.join(WEB_ROOT, "assets", "js", "data.js")
AUDIO_DIR = os.path.join(WEB_ROOT, "audio")

# ---------------------------------------------------------------------------
# Voice choices.  A calm, warm female narrator across every language.
# ---------------------------------------------------------------------------
# Edge (Microsoft) neural voices — verified present via `edge-tts --list-voices`.
EDGE_VOICES = {
    "en": "en-GB-SoniaNeural",
    "ur": "ur-PK-UzmaNeural",     # native Pakistani Urdu
    "ar": "ar-SA-ZariyahNeural",
    "es": "es-ES-ElviraNeural",
    "fr": "fr-FR-DeniseNeural",
    "de": "de-DE-KatjaNeural",
    "pt": "pt-PT-RaquelNeural",
    "sw": "sw-KE-ZuriNeural",
    "zh": "zh-CN-XiaoxiaoNeural",
    "ja": "ja-JP-NanamiNeural",
    "ms": "ms-MY-YasminNeural",
}

# Google language codes per our site language codes.
GOOGLE_LANG = {
    "en": "en-GB", "ur": "ur-IN", "ar": "ar-XA", "es": "es-ES", "fr": "fr-FR",
    "de": "de-DE", "pt": "pt-PT", "sw": "sw-KE", "zh": "cmn-CN", "ja": "ja-JP",
    "ms": "ms-MY",
}
# Optional hard overrides if you want a specific Google voice for a language.
GOOGLE_VOICE_OVERRIDE = {}
# Preference when auto-picking a Google voice (most natural first).
GOOGLE_TIER_ORDER = ["Chirp3-HD", "Chirp-HD", "Neural2", "Wavenet", "Standard"]


# ---------------------------------------------------------------------------
# data.js parsing / writing
# ---------------------------------------------------------------------------
def load_site(path=DATA_JS):
    """Extract the window.SITE {...} object from data.js and parse it as JSON."""
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    m = re.search(r"window\.SITE\s*=\s*", text)
    if not m:
        raise SystemExit("Could not find 'window.SITE =' in data.js")
    start = text.index("{", m.end())
    obj = _extract_braced(text, start)
    return json.loads(obj)


def _extract_braced(text, start):
    """Return the substring text[start:...] covering one balanced {...} block."""
    assert text[start] == "{"
    depth, i, in_str, esc = 0, start, False, False
    while i < len(text):
        c = text[i]
        if in_str:
            if esc:
                esc = False
            elif c == "\\":
                esc = True
            elif c == '"':
                in_str = False
        else:
            if c == '"':
                in_str = True
            elif c == "{":
                depth += 1
            elif c == "}":
                depth -= 1
                if depth == 0:
                    return text[start:i + 1]
        i += 1
    raise SystemExit("Unbalanced braces while parsing data.js")


def rebuild_overrides(path=DATA_JS, audio_dir=AUDIO_DIR):
    """Scan audio/ and rewrite the audioOverrides value in data.js to match."""
    overrides = {}
    if os.path.isdir(audio_dir):
        for lang in sorted(os.listdir(audio_dir)):
            langdir = os.path.join(audio_dir, lang)
            if not os.path.isdir(langdir):
                continue
            for fn in sorted(os.listdir(langdir)):
                if not fn.lower().endswith(".mp3"):
                    continue
                slug = fn[:-4]
                overrides.setdefault(slug, {})[lang] = "audio/%s/%s" % (lang, fn)

    with open(path, "r", encoding="utf-8") as f:
        text = f.read()
    key = '"audioOverrides"'
    ki = text.rindex(key)
    brace = text.index("{", ki + len(key))
    old = _extract_braced(text, brace)
    new = json.dumps(overrides, ensure_ascii=False, indent=1)
    # keep the leading indentation of the closing brace tidy (1-space file style)
    new = new.replace("\n", "\n ")
    text = text[:brace] + new + text[brace + len(old):]
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    n = sum(len(v) for v in overrides.values())
    print("  audioOverrides rewritten: %d board(s), %d file(s)" %
          (len(overrides), n))


# ---------------------------------------------------------------------------
# Engine: Edge (Microsoft) — free, no key
# ---------------------------------------------------------------------------
def synth_edge(text, voice, rate, outfile):
    import asyncio
    import edge_tts

    async def _run():
        kwargs = {}
        if rate:
            kwargs["rate"] = rate
        communicate = edge_tts.Communicate(text, voice, **kwargs)
        await communicate.save(outfile)

    asyncio.run(_run())


# ---------------------------------------------------------------------------
# Engine: Google Cloud Text-to-Speech — needs an API key
# ---------------------------------------------------------------------------
_GOOGLE_VOICE_CACHE = {}


def _http_json(url, payload=None, method="GET"):
    data = json.dumps(payload).encode("utf-8") if payload is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Content-Type", "application/json; charset=utf-8")
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            body = e.read().decode("utf-8", "replace")
            if e.code in (429, 500, 503) and attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise SystemExit("Google API error %s: %s" % (e.code, body))
        except urllib.error.URLError as e:
            if attempt < 3:
                time.sleep(2 * (attempt + 1))
                continue
            raise SystemExit("Network error calling Google API: %s" % e)


def pick_google_voice(lang, api_key):
    if lang in GOOGLE_VOICE_OVERRIDE:
        return GOOGLE_VOICE_OVERRIDE[lang], GOOGLE_LANG[lang]
    langcode = GOOGLE_LANG[lang]
    if langcode in _GOOGLE_VOICE_CACHE:
        return _GOOGLE_VOICE_CACHE[langcode], langcode
    url = ("https://texttospeech.googleapis.com/v1/voices?languageCode=%s&key=%s"
           % (urllib.parse.quote(langcode), api_key))
    data = _http_json(url)
    voices = data.get("voices", [])
    if not voices:
        raise SystemExit("Google has no voice for %s (%s)." % (lang, langcode))

    def score(v):
        name = v.get("name", "")
        tier = next((i for i, t in enumerate(GOOGLE_TIER_ORDER) if t in name),
                    len(GOOGLE_TIER_ORDER))
        female = 0 if v.get("ssmlGender") == "FEMALE" else 1
        return (tier, female, name)

    best = sorted(voices, key=score)[0]["name"]
    _GOOGLE_VOICE_CACHE[langcode] = best
    return best, langcode


def _chunk_text(text, limit=4200):
    """Split on sentence boundaries so each request stays under the byte limit."""
    parts = re.split(r"(?<=[\.\!\?。！？۔؟])\s+", text)
    chunks, cur = [], ""
    for p in parts:
        cand = (cur + " " + p).strip() if cur else p
        if len(cand.encode("utf-8")) > limit and cur:
            chunks.append(cur)
            cur = p
        else:
            cur = cand
    if cur:
        chunks.append(cur)
    return chunks


def synth_google(text, lang, api_key, rate, outfile):
    voice_name, langcode = pick_google_voice(lang, api_key)
    url = ("https://texttospeech.googleapis.com/v1/text:synthesize?key=%s"
           % api_key)
    audio = b""
    for chunk in _chunk_text(text):
        payload = {
            "input": {"text": chunk},
            "voice": {"languageCode": langcode, "name": voice_name},
            "audioConfig": {"audioEncoding": "MP3", "speakingRate": rate or 1.0},
        }
        try:
            resp = _http_json(url, payload, method="POST")
        except SystemExit:
            # Chirp3-HD voices reject some audioConfig fields — retry minimal.
            payload["audioConfig"] = {"audioEncoding": "MP3"}
            resp = _http_json(url, payload, method="POST")
        audio += base64.b64decode(resp["audioContent"])
    with open(outfile, "wb") as f:
        f.write(audio)
    return voice_name


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    ap = argparse.ArgumentParser(description="Generate narration MP3s.")
    ap.add_argument("--engine", choices=["edge", "google"], default="edge")
    ap.add_argument("--api-key", default=os.environ.get("GOOGLE_TTS_API_KEY", ""))
    ap.add_argument("--boards", default="",
                    help="comma-separated board slugs (default: all)")
    ap.add_argument("--langs", default="",
                    help="comma-separated language codes (default: all)")
    ap.add_argument("--all", action="store_true", help="every board")
    ap.add_argument("--force", action="store_true",
                    help="regenerate even if the MP3 already exists")
    ap.add_argument("--rate", default="",
                    help="edge: e.g. -5%%  |  google: e.g. 0.95 (default natural)")
    ap.add_argument("--overrides-only", action="store_true",
                    help="just rewrite audioOverrides from existing files")
    args = ap.parse_args()

    if args.overrides_only:
        rebuild_overrides()
        return

    if args.engine == "google" and not args.api_key:
        raise SystemExit("Google engine needs --api-key or $GOOGLE_TTS_API_KEY")

    site = load_site()
    boards = site["boards"]
    want_boards = set(s.strip() for s in args.boards.split(",") if s.strip())
    want_langs = set(s.strip() for s in args.langs.split(",") if s.strip())
    if not want_boards and not args.all:
        raise SystemExit("Pass --boards slug1,slug2  or  --all")

    # edge rate default: keep natural (no shift). google rate default: 1.0
    edge_rate = args.rate if args.engine == "edge" else ""
    google_rate = float(args.rate) if (args.engine == "google" and args.rate) else 1.0

    made, skipped, failed = 0, 0, 0
    for b in boards:
        slug = b["slug"]
        if want_boards and slug not in want_boards:
            continue
        for lang, sc in b.get("scripts", {}).items():
            if want_langs and lang not in want_langs:
                continue
            text = (sc or {}).get("script", "").strip()
            if not text:
                continue
            outdir = os.path.join(AUDIO_DIR, lang)
            os.makedirs(outdir, exist_ok=True)
            outfile = os.path.join(outdir, slug + ".mp3")
            if os.path.exists(outfile) and not args.force:
                skipped += 1
                continue
            try:
                if args.engine == "edge":
                    synth_edge(text, EDGE_VOICES[lang], edge_rate, outfile)
                    vlabel = EDGE_VOICES[lang]
                else:
                    vlabel = synth_google(text, lang, args.api_key, google_rate,
                                          outfile)
                size = os.path.getsize(outfile)
                made += 1
                print("  ✓ %-30s %-3s  %-26s %6.0f KB"
                      % (slug, lang, vlabel, size / 1024.0))
            except Exception as e:  # noqa
                failed += 1
                print("  ✗ %-30s %-3s  FAILED: %s" % (slug, lang, e))

    print("\nGenerated %d, skipped %d (already existed), failed %d."
          % (made, skipped, failed))
    rebuild_overrides()
    print("Done. Commit + push to publish:  git add -A && git commit && git push")


if __name__ == "__main__":
    main()
