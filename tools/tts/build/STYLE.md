# English "listening script" brief — Prophecy & Persia audio guide

You are writing the **English audio-guide narration** for boards in the exhibition
*"Prophecy & Persia: Cyrus, Islam & the Imam Mahdi"*, produced by the **Ahmadiyya
Muslim Community UK**. The exhibition runs in three parts: (1) **Cyrus** the Great
and the case that he is the Holy Quran's **Dhul-Qarnain**; (2) the **Rise of
Islam** and Persia's place in it; (3) the **Promised Messiah**, the awaited
reformer of Persian origin (Hazrat Mirza Ghulam Ahmad).

## Your task
For each board slug you are assigned, produce ONE coherent, linear English
**listening script** — narration meant to be *heard*, not read. The poster is
designed for the eye, with information spread around the layout (headers, side
panels, quote boxes, timelines). Your job is to **gather all of that information
into a single logical spoken narrative** that a visitor can follow with their
eyes closed and come away knowing everything the board teaches.

## Sources (in priority order)
1. **The poster image is the source of truth.** Read it at the path given in
   `tools/tts/build/existing_en.json` (field `poster`, e.g.
   `assets/posters/<slug>.png`). Transcribe every text block, caption, date,
   side panel and quotation.
2. `tools/tts/build/existing_en.json` also has an `existing_en` summary and the
   `title` for each slug — use it for **terminology and spelling** of proper
   nouns (e.g. *Dhul-Qarnain*, *the Promised Messiah*, names, transliterations)
   and for tone. Do **not** just copy it; it is a partial summary and you must
   produce the fuller, complete version from the board itself.

## Rules
- **Completeness:** include every substantive point on the board — main text,
  side panels, dates/timelines, captions, and quotations. Nothing important on
  the board should be missing from the script.
- **Linear & coherent:** reorder freely into the clearest logical flow for the
  ear. Add light connective phrasing ("As you will see…", "This matters
  because…") but **add no facts that are not on the board.**
- **Spoken register:** flowing sentences, natural to read aloud, warm and
  dignified. Write numbers/dates as words where it aids the ear is optional —
  keep it readable. Aim for a similar density to the sample below (typically
  ~150–320 words; longer only if the board genuinely carries more).
- **Quotations:** when the board prints a quotation (Quran verse, Bible verse,
  a historical inscription, a saying of the Promised Messiah), weave it into the
  narration **using the exact wording printed on the board**, and name its source
  the way the board does (e.g. "the Holy Quran, chapter sixteen, verse
  thirty-seven"). Do not paraphrase quotations.
- **Reverence:** keep the Ahmadiyya Muslim framing. After "the Prophet Muhammad"
  you may add "peace and blessings be upon him" once; for prophets "peace be upon
  him" is appropriate but use sparingly and naturally.
- Start the script with the board's title as a short opening line where it reads
  naturally (as in the sample), but don't force it.

## Approved style sample (this is the target)
Board *The Promise of the Holy Quran*:

> The Promise of the Holy Quran. The Holy Quran is unique. It teaches that God
> Almighty is the Lord of every realm — of every people, and every nation. This
> means no one people is inherently supreme over another; all human beings are
> equal before God. Our division into different peoples was never meant to be a
> hierarchy — rather, those closest to Allah are simply those who are most
> righteous. But how do we become righteous? Through following the prophets. As
> the Quran teaches, in chapter sixteen, verse thirty-seven: "And We did raise
> among every people a Messenger with the teaching, 'Worship Allah and shun the
> Evil One.' Then among them were some whom Allah guided, and among them were
> some who became deserving of ruin." Every nation, then, was sent a prophet of
> its own — yet over time, people corrupted the religions they were given. At
> last the time came when humanity was ready to bear a single, universal
> message: Islam, for all peoples and for all time. The Quran declares this
> openly, in chapter seven, verse one hundred and fifty-nine: "Say, O mankind,
> truly I am a Messenger to you all from Allah, to Whom belongs the kingdom of
> the heavens and the earth. There is no God but He. He gives life, and He
> causes death." This message was revealed through the Prophet Muhammad, peace
> and blessings be upon him — born in the year 590, granted his first revelation
> in 610, the whole Quran complete by 632. And should its spirit ever be lost by
> the Muslims themselves, God promised to revive it by His own hand: "Verily, We
> Ourself have sent down this Exhortation, and most surely We will be its
> Guardian" — chapter fifteen, verse ten. As you will discover, the story of
> that promised renewal is bound up, inseparably, with one particular people:
> the Persians.

## Output — write a JSON file
Write your result to the path you are told (e.g. `tools/tts/build/en/g1.json`),
as a single JSON object keyed by slug:

```json
{
  "<slug>": {
    "script": "the full linear English listening script as one string",
    "verses": [
      {"ref": "16:37", "source": "Holy Quran", "text": "exact quotation as printed on the board"}
    ]
  }
}
```

- `verses` lists **every quotation** printed on the board that you wove in
  (Quran, Bible, inscriptions, sayings) with its reference/source and the exact
  printed text. If the board prints no quotations, use an empty array.
- Ensure the JSON is valid (properly escaped). Write only the file; your final
  message can just confirm which slugs you completed.
