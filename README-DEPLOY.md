# Prophecy & Persia — Website: Go-Live Guide

This folder is a **complete, self-contained website**. There is no build step and
no server code — you can put it online in about five minutes.

- **Audio guide:** every board is narrated on the visitor's own phone (on-device
  text-to-speech) in **11 languages** — English, Urdu, Arabic, Spanish, French,
  German, Portuguese, Swahili, Mandarin, Japanese, Malay. Nothing is recorded or
  sent anywhere; it also works on weak exhibition Wi-Fi.
- **Read-along:** the full script is shown on screen in the chosen language, so a
  visitor can read a board even if their phone has no voice for that language.
- **Downloads:** every board is a high-resolution PNG download.
- **Previous years:** a ready-made archive page for older exhibitions (PDF only).

---

## 1. Put it online (choose ONE)

### Option A — Netlify Drop (easiest, no account tools needed)
1. Go to **https://app.netlify.com/drop**
2. Drag **this entire `Website` folder** onto the page.
3. Wait for the upload (the folder is ~370 MB because it contains the full-size
   poster PNGs, so give it a minute or two on a good connection).
4. Netlify gives you a live address like `https://random-name-1234.netlify.app`.
   **Your site is live.** You can rename it under *Site settings → Change site name*.

### Option B — Netlify + GitHub (best if you'll update it over time)
1. Create a new GitHub repository and upload the contents of this folder to it.
   *(Because the posters are large, this works best with the GitHub desktop app or
   `git` on the command line rather than the browser uploader.)*
2. In Netlify: **Add new site → Import an existing project → GitHub**, pick the repo.
3. Leave the build command **empty** and publish directory **`.`** (a `netlify.toml`
   is already included with the right settings). Deploy.
4. From then on, every push to GitHub redeploys automatically.

> Either way, the included `_redirects` and `netlify.toml` make deep links, page
> refreshes, and caching work correctly. Nothing to configure.

---

## 2. Connect your own domain

1. Register your domain (e.g. `www.prophecyandpersia.com`) with any registrar.
2. In Netlify: **Domain settings → Add a custom domain**, enter it, and follow the
   prompts. Netlify will either give you nameservers to set at your registrar, or a
   CNAME/A record to add. HTTPS is switched on automatically (free).
3. **Find-and-replace the placeholder domain.** The site works fine without this,
   but for correct social-share previews and QR codes, replace every occurrence of
   `www.prophecyandpersia.com` with your real domain in these files:
   - `index.html` (the `og:image` / `og:url` tags)
   - `robots.txt`
   Then re-deploy.

---

## 3. Print the QR codes for the exhibition floor  ★ important

Each board has a QR code that opens **its own audio guide**. Visitors scan the code
beside a poster and press play.

The codes were generated pointing at the placeholder domain. **Once you know your
final web address, regenerate them so they point to the live site:**

```
pip install segno                 # one-time (needs Python 3)
python3 tools/make-qr-codes.py  https://your-real-address
```

(Use your Netlify address if you haven't got a custom domain yet, e.g.
`https://prophecy-persia.netlify.app`.)

This rewrites **`print-qr-codes.html`** — open it in a browser and print to A4 (or
"Save as PDF"). It lays out all 33 codes as tidy cards, one per board, ready to cut
out and place. Individual codes are also saved as SVGs in `assets/qr/`.

---

## 4. Everyday updates

| I want to… | Do this |
|---|---|
| Add a **previous year's** exhibition | See `previous-years/README.txt` — drop a PDF in `previous-years/pdfs/` and add a block to `assets/js/data.js`. |
| Add **professional / human-recorded audio** | See `audio/README.txt` — drop MP3s in `audio/<lang>/` and register them in `audioOverrides` in `assets/js/data.js`. Any board without a recording keeps using the phone's voice. |
| Edit an **audio-guide script** | Edit the relevant board in `assets/js/data.js` (`scripts.en.script`, `scripts.ur.script`, etc.). |
| Change wording on the pages | The home/about/how-it-works copy lives in `assets/js/app.js`. |

After any change, re-deploy (drag the folder to Netlify again, or push to GitHub).

---

## 5. Good to know

- **The audio voice quality depends on the visitor's phone.** Modern iPhones and
  Android phones read English, Arabic, French, Spanish, etc. very naturally. A few
  languages (notably **Urdu, Swahili, Malay**) aren't installed on every device — on
  those phones the guide shows a short note and the visitor can still **read** the
  script, or add the voice via *Settings → Accessibility → Spoken Content /
  Text-to-Speech*. If you later want guaranteed audio everywhere, add MP3s (step 4).
- **First tap:** phones only allow speech to start after the user taps — that's why
  the guide begins when the visitor presses **Play**. This is expected.
- **Size:** the `assets/posters/` folder holds the full-resolution PNGs (~370 MB).
  If you ever need a lighter deploy, you can remove that folder and the "Download
  PNG" buttons will simply 404 — but keeping it is recommended, since downloads are
  a core feature.
- **Privacy:** there is no tracking, no cookies, no analytics, and no external
  requests. Everything (including the fonts) is served from your own site.

---

### Folder map
```
Website/
├── index.html               ← the site
├── netlify.toml, _redirects  ← deploy config (leave as-is)
├── site.webmanifest, robots.txt
├── print-qr-codes.html       ← printable QR sheet (regenerate for your domain)
├── assets/
│   ├── css/style.css
│   ├── js/app.js             ← app logic + audio engine
│   ├── js/data.js            ← ALL content: boards + 11-language scripts  ← edit here
│   ├── js/manifest.json      ← board list (used by the QR tool)
│   ├── img/                  ← web images + thumbnails + share image
│   ├── posters/              ← full-resolution PNG downloads (33 boards)
│   ├── qr/                   ← one QR SVG per board
│   ├── fonts/                ← self-hosted fonts (offline-safe)
│   └── logo/                 ← emblem + favicons
├── audio/                    ← (optional) drop-in MP3s + README
├── previous-years/           ← archive PDFs + README
└── tools/make-qr-codes.py    ← regenerate QR codes for your domain
```
