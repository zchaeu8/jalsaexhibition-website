# Narration MP3 generator

Turns the on-screen narration in `assets/js/data.js` into natural-voice MP3s and
wires them into the site automatically.

## Quick start

```bash
cd "…/Website dev/Outputs/Website"

# 1. one-off setup (only the free Edge engine needs this)
python3 -m pip install --user edge-tts

# 2. generate (pilot = three boards, all 11 languages, FREE voices)
python3 tools/tts/generate_audio.py \
    --boards prophecy-and-persia,promise-of-the-holy-quran,the-cyrus-cylinder

# 3. publish
git add -A && git commit -m "Add narration MP3s" && git push
```

Files land in `audio/<lang>/<board-slug>.mp3` and the script rewrites the
`audioOverrides` map at the bottom of `data.js` so the player uses them. Any
board+language **without** an MP3 keeps using the phone's on-device voice.

The MP3 is spoken from the *exact* text in `scripts[lang].script`, so the audio
and the on-screen read-along always match. To change what's spoken, edit the
script in `data.js` and re-run with `--force`.

## Common commands

| Goal | Command |
|---|---|
| Everything, all languages | `python3 tools/tts/generate_audio.py --all` |
| One board, one language | `… --boards the-cyrus-cylinder --langs ur` |
| Re-do after editing a script | add `--force` |
| Just refresh the overrides map | `… --overrides-only` |

## Two voice engines

- **`--engine edge`** (default) — Microsoft Edge neural voices. **Free, no API
  key, no account.** These are the Azure Neural voices and include native
  Pakistani Urdu (`ur-PK`), Swahili (`sw-KE`) and Malay (`ms-MY`). Used for the
  pilot.
- **`--engine google`** — Google Cloud Text-to-Speech. Needs a key:
  ```bash
  export GOOGLE_TTS_API_KEY="AIza…"
  python3 tools/tts/generate_audio.py --all --engine google
  ```
  It auto-picks the most natural voice per language (Chirp3-HD → Neural2 →
  Wavenet → Standard).

Voices are chosen in `EDGE_VOICES` / the Google picker near the top of
`generate_audio.py` — edit there to change narrator, gender or accent.

## Getting a Google API key (for `--engine google`)

1. Go to <https://console.cloud.google.com/> and create (or pick) a project.
2. Enable **Cloud Text-to-Speech API**
   (APIs & Services → Library → search "Text-to-Speech" → Enable).
   Billing must be on; the free tier (1M+ characters/month) more than covers
   this whole site.
3. APIs & Services → **Credentials** → Create credentials → **API key**.
   Copy it. (Optional but tidy: "Restrict key" → restrict to the
   Text-to-Speech API.)
4. `export GOOGLE_TTS_API_KEY="AIza…"` then run with `--engine google`.
