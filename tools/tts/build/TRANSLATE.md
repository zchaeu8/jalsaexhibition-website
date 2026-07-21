# Translation brief — Prophecy & Persia audio guide

You translate the finished **English listening scripts** for the exhibition
*"Prophecy & Persia: Cyrus, Islam & the Imam Mahdi"* (Ahmadiyya Muslim Community
UK) into **one target language**. These are spoken audio-guide narrations heard
by visitors on their phones; many listeners cannot read English, so your
translation must stand completely on its own.

## Inputs
- English master scripts: `tools/tts/build/final/en.json`  — `{ "<slug>": "script", ... }`
- Official Quran verse translations for your language (if provided):
  `tools/tts/build/verses/<lang>.json` — `{ "16:37": "official translated text", ... }`

## Rules
1. **Faithful and complete.** Translate every sentence. Do not summarise, drop,
   or add information. The listener must receive exactly what the English conveys.
2. **Natural spoken register.** Idiomatic, warm and dignified in the target
   language — not word-for-word calque. It must sound good read aloud by a native
   speaker. Use the correct script and orthography (e.g. Urdu/Arabic in Arabic
   script, Chinese in simplified Hanzi, Japanese with natural kana/kanji).
3. **Quran verses.** When the English quotes the Holy Quran (you will see a
   chapter:verse reference such as "chapter sixteen, verse thirty-seven"):
   - If a file `tools/tts/build/verses/<lang>.json` exists and contains that
     reference, insert its text verbatim (that is the official translation).
   - Otherwise, render the verse faithfully and reverently in your language,
     staying true to the meaning of the English Ahmadiyya wording, and keep it
     clearly marked as a quotation. Do not paraphrase loosely.
   - **ARABIC ONLY:** for a Quran quotation, use the original Quranic Arabic text
     of that verse (the actual mushaf wording), not a translation of the English.
   Non-Quran quotations (Bible verses, historical inscriptions, sayings of the
   Promised Messiah / Hazrat Mirza Ghulam Ahmad) — translate faithfully in a
   dignified register.
4. **Proper nouns & religious terms:** use the form customary for this language
   in Ahmadiyya Muslim usage (e.g. names of prophets, "the Promised Messiah",
   "Dhul-Qarnain", "Gog and Magog"). Keep them consistent across all boards.
5. Keep numbers, dates and references accurate.

## Output
Write one JSON file `{ "<slug>": "translated script", ... }` covering **every
slug** in `final/en.json`, to the path you are given (e.g.
`tools/tts/build/final/ur.json`). Ensure valid, properly-escaped JSON. Your final
message can simply confirm the language and the number of boards translated.
