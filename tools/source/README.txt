SOURCE FILES (for regenerating content)
=======================================

You normally DON'T need these — the live site reads assets/js/data.js, and you
can edit that file directly. These are kept so the content can be rebuilt from
scratch if ever needed.

- scripts/english.json         The English audio-guide scripts (title, blurb, script per board).
- scripts/<code>.json          The 10 translations (title + script per board).
- manifest.json                The board list, order, sections, image filenames.
- build_data.py                Merges manifest + all scripts -> assets/js/data.js.
- build_images.py              Regenerates web images + PNG downloads from the original posters.

NOTE: the paths inside build_data.py / build_images.py point at the original
authoring locations (a temporary folder and the exhibition source posters). If you
re-run them, update the paths at the top of each script first. For everyday edits,
just change assets/js/data.js and re-deploy.

Languages: en ur ar es fr de pt sw zh ja ms
