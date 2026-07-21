/* =====================================================================
   PROPHECY & PERSIA  —  National Outreach Exhibition Hub
   Single-page app: routing, gallery, poster detail, multilingual
   on-device audio guide (Web Speech API) with drop-in MP3 support.
   ===================================================================== */
(function () {
  "use strict";
  var SITE = window.SITE;
  var boards = SITE.boards.slice().sort(function (a, b) { return a.order - b.order; });
  var boardBySlug = {}; boards.forEach(function (b, i) { b._i = i; boardBySlug[b.slug] = b; });
  var sectionById = {}; SITE.sections.forEach(function (s) { sectionById[s.id] = s; });
  var langByCode = {}; SITE.languages.forEach(function (l) { langByCode[l.code] = l; });

  var IS_IOS = /iP(hone|ad|od)/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  /* ---------- state ---------- */
  var state = {
    lang: localStorage.getItem("pp_lang") || "en",
    rate: parseFloat(localStorage.getItem("pp_rate") || "0.96"),
    autonext: localStorage.getItem("pp_autonext") === "1"
  };
  if (!langByCode[state.lang]) state.lang = "en";

  /* ---------- icons ---------- */
  var I = {
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.14v13.72c0 .8.87 1.28 1.54.84l10.3-6.86a1 1 0 000-1.68L9.54 4.3A1 1 0 008 5.14z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    next: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5.5v13a1 1 0 001.55.83L16 14.2V18a1 1 0 002 0V6a1 1 0 00-2 0v3.8L7.55 4.67A1 1 0 006 5.5z"/></svg>',
    prev: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18 5.5v13a1 1 0 01-1.55.83L8 14.2V18a1 1 0 01-2 0V6a1 1 0 012 0v3.8l8.45-5.13A1 1 0 0118 5.5z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3v12m0 0l-4-4m4 4l4-4M4 17v2a2 2 0 002 2h12a2 2 0 002-2v-2"/></svg>',
    zoom: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4M11 8v6M8 11h6"/></svg>',
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 6.5C10.5 5 8 4.5 4 5v13c4-.5 6.5 0 8 1.5 1.5-1.5 4-2 8-1.5V5c-4-.5-6.5 0-8 1.5z"/><path d="M12 6.5v13"/></svg>',
    head: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M4 13v-1a8 8 0 0116 0v1"/><rect x="3" y="13" width="4" height="7" rx="1.6"/><rect x="17" y="13" width="4" height="7" rx="1.6"/></svg>',
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M5 12.5l4.5 4.5L19 7"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>',
    speed: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M5 19a9 9 0 1114 0"/><path d="M12 12l4-3"/></svg>'
  };

  /* =====================================================================
     AUDIO ENGINE
     ===================================================================== */
  var synth = window.speechSynthesis;
  var voicesCache = [];
  function loadVoices() { try { voicesCache = synth ? synth.getVoices() : []; } catch (e) { voicesCache = []; } }
  if (synth) { loadVoices(); if (typeof synth.onvoiceschanged !== "undefined") synth.onvoiceschanged = loadVoices; }

  function pickVoice(bcp47, hints) {
    if (!voicesCache.length) loadVoices();
    if (!voicesCache.length) return null;
    var base = bcp47.split("-")[0].toLowerCase();
    var exact = voicesCache.filter(function (v) { return v.lang && v.lang.toLowerCase() === bcp47.toLowerCase(); });
    var partial = voicesCache.filter(function (v) { return v.lang && v.lang.toLowerCase().indexOf(base) === 0; });
    var pool = exact.length ? exact : partial;
    if (!pool.length) return null;
    if (hints && hints.length) {
      for (var h = 0; h < hints.length; h++) {
        for (var i = 0; i < pool.length; i++) {
          if (pool[i].name.toLowerCase().indexOf(hints[h].toLowerCase()) !== -1) return pool[i];
        }
      }
    }
    var local = pool.filter(function (v) { return v.localService; });
    return (local[0] || pool[0]);
  }
  function hasVoiceFor(code) {
    var l = langByCode[code]; if (!l) return false;
    return !!pickVoice(l.bcp47, l.voiceHints);
  }

  // split narration into speak/highlight chunks
  function splitSentences(text, code) {
    text = (text || "").replace(/\s+/g, " ").trim();
    if (!text) return [];
    var parts;
    if (code === "zh" || code === "ja") {
      parts = text.split(/(?<=[。！？；])/);
    } else if (code === "ur" || code === "ar") {
      parts = text.split(/(?<=[.!?؟۔])\s+/);
    } else {
      parts = text.split(/(?<=[.!?])\s+/);
    }
    var out = [], MAX = 230;
    parts.forEach(function (p) {
      p = p.trim(); if (!p) return;
      if (p.length <= MAX) { out.push(p); return; }
      // break long sentence on commas / spaces
      var buf = "";
      var toks = p.split(/(?<=[,،、])\s+|\s+/);
      toks.forEach(function (t) {
        if ((buf + " " + t).trim().length > MAX && buf) { out.push(buf.trim()); buf = t; }
        else { buf = (buf ? buf + " " : "") + t; }
      });
      if (buf.trim()) out.push(buf.trim());
    });
    return out;
  }

  // Controller object shared across views
  var AC = {
    board: null, code: null, kind: null, // 'tts' | 'file'
    chunks: [], idx: 0, playing: false, ended: false,
    audioEl: null, watchdog: null,
    subscribers: [],
    on: function (fn) { this.subscribers.push(fn); },
    emit: function () { var s = this.state(); this.subscribers.forEach(function (f) { try { f(s); } catch (e) {} }); },
    state: function () {
      var total = this.kind === "file" ? 1 : this.chunks.length;
      var ratio = 0;
      if (this.kind === "file" && this.audioEl && this.audioEl.duration) ratio = this.audioEl.currentTime / this.audioEl.duration;
      else if (this.chunks.length) ratio = this.ended ? 1 : (this.idx) / this.chunks.length;
      return { board: this.board, code: this.code, playing: this.playing, ended: this.ended,
               idx: this.idx, total: this.chunks.length, ratio: Math.max(0, Math.min(1, ratio)) };
    },
    load: function (board, code) {
      this.stop();
      this.board = board; this.code = code; this.ended = false; this.idx = 0;
      var ov = (SITE.audioOverrides[board.slug] || {})[code];
      if (ov) {
        this.kind = "file";
        this.audioEl = new Audio(ov);
        var self = this;
        this.audioEl.addEventListener("timeupdate", function () { self.emit(); });
        this.audioEl.addEventListener("ended", function () { self.playing = false; self.ended = true; self.emit(); if (state.autonext) gotoAdjacent(1, true); });
        this.chunks = [];
      } else {
        this.kind = "tts";
        this.chunks = splitSentences((board.scripts[code] || board.scripts.en || {}).script || "", code);
        this.audioEl = null;
      }
      this.emit();
    },
    play: function () {
      var self = this;
      if (this.kind === "file") {
        this.audioEl.play().then(function () { self.playing = true; self.emit(); }).catch(function () {});
        return;
      }
      if (!synth) return;
      if (this.ended || this.idx >= this.chunks.length) { this.idx = 0; this.ended = false; }
      // resume path
      if (synth.paused && this.playing === false && this._wasStarted) {
        try { synth.resume(); this.playing = true; this.emit(); this._watch(); return; } catch (e) {}
      }
      this.playing = true; this._wasStarted = true;
      this._speakFrom(this.idx);
      this._watch();
    },
    _speakFrom: function (i) {
      var self = this;
      if (!synth) return;
      try { synth.cancel(); } catch (e) {}
      if (i >= this.chunks.length) { this.playing = false; this.ended = true; this.emit(); if (state.autonext) gotoAdjacent(1, true); return; }
      this.idx = i;
      var l = langByCode[this.code];
      var u = new SpeechSynthesisUtterance(this.chunks[i]);
      u.lang = l.bcp47; u.rate = state.rate; u.pitch = 1;
      var v = pickVoice(l.bcp47, l.voiceHints); if (v) u.voice = v;
      u.onstart = function () { self.emit(); highlightSentence(i); };
      u.onend = function () {
        if (!self.playing) return;
        if (self.idx + 1 < self.chunks.length) { self._speakFrom(self.idx + 1); }
        else { self.playing = false; self.ended = true; self.idx = self.chunks.length; self.emit(); clearHighlight(); if (state.autonext) gotoAdjacent(1, true); }
      };
      u.onerror = function () { /* skip to next on error */
        if (self.playing && self.idx + 1 < self.chunks.length) self._speakFrom(self.idx + 1);
        else { self.playing = false; self.emit(); }
      };
      try { synth.speak(u); } catch (e) {}
      this.emit();
    },
    _watch: function () {           // Chrome desktop long-run keepalive
      var self = this;
      clearInterval(this.watchdog);
      if (IS_IOS || this.kind === "file") return;
      this.watchdog = setInterval(function () {
        if (self.playing && synth.speaking && !synth.paused) { try { synth.resume(); } catch (e) {} }
        else if (!self.playing) clearInterval(self.watchdog);
      }, 8000);
    },
    pause: function () {
      this.playing = false;
      clearInterval(this.watchdog);
      if (this.kind === "file") { if (this.audioEl) this.audioEl.pause(); }
      else if (synth) { try { synth.pause(); } catch (e) {} }
      this.emit();
    },
    toggle: function () { this.playing ? this.pause() : this.play(); },
    jump: function (i) {   // tts only: jump to sentence i
      if (this.kind !== "tts") return;
      this.ended = false; this.idx = Math.max(0, Math.min(i, this.chunks.length - 1));
      if (this.playing) this._speakFrom(this.idx); else { highlightSentence(this.idx); this.emit(); }
    },
    stop: function () {
      this.playing = false; clearInterval(this.watchdog);
      if (synth) { try { synth.cancel(); } catch (e) {} }
      if (this.audioEl) { try { this.audioEl.pause(); } catch (e) {} }
    }
  };

  var pendingAutoplay = false;
  function gotoAdjacent(dir, autoplay) {
    var b = AC.board; if (!b) return;
    var nb = boards[b._i + dir]; if (!nb) return;
    if (autoplay) pendingAutoplay = true;
    location.hash = "#/p/" + nb.slug;
  }

  function highlightSentence(i) {
    var box = document.getElementById("scriptText"); if (!box) return;
    var sents = box.querySelectorAll(".sent");
    sents.forEach(function (s) { s.classList.remove("active"); });
    if (sents[i]) { sents[i].classList.add("active"); }
  }
  function clearHighlight() {
    var box = document.getElementById("scriptText"); if (!box) return;
    box.querySelectorAll(".sent").forEach(function (s) { s.classList.remove("active"); });
  }

  /* =====================================================================
     RENDER HELPERS
     ===================================================================== */
  var app = document.getElementById("app");
  function h(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }
  function esc(s) { return (s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function scriptFor(b, code) { return (b.scripts[code] || b.scripts.en || {}); }
  function titleFor(b, code) { var s = b.scripts[code]; return (s && s.title) ? s.title : b.title; }

  function sectionLabel(b) {
    var s = sectionById[b.section];
    if (b.type === "title") return "Introduction";
    return s ? s.title : "";
  }

  /* =====================================================================
     ROUTER
     ===================================================================== */
  function parseHash() {
    var hash = location.hash.replace(/^#\/?/, "");
    var parts = hash.split("/").filter(Boolean);
    if (!parts.length) return { view: "home" };
    if (parts[0] === "posters") return { view: "gallery" };
    if (parts[0] === "previous") return { view: "previous" };
    if (parts[0] === "about") return { view: "about" };
    if (parts[0] === "p" && parts[1]) return { view: "poster", slug: decodeURIComponent(parts[1]) };
    if (parts[0] === "tour") return { view: "poster", slug: boards[0].slug };
    return { view: "home" };
  }

  function route() {
    var r = parseHash();
    setActiveNav(r.view);
    closeMenu();
    if (r.view === "home") renderHome();
    else if (r.view === "gallery") renderGallery();
    else if (r.view === "previous") renderPrevious();
    else if (r.view === "about") renderAbout();
    else if (r.view === "poster") {
      var b = boardBySlug[r.slug];
      if (!b) { location.hash = "#/posters"; return; }
      renderPoster(b);
    }
    if (r.view !== "poster") window.scrollTo(0, 0);
    updateMini();
  }

  function setActiveNav(view) {
    document.querySelectorAll(".nav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-view") === view);
    });
  }

  /* =====================================================================
     VIEW: HOME
     ===================================================================== */
  function renderHome() {
    var ex = SITE.exhibition;
    var secCards = SITE.sections.filter(function (s) { return s.id !== "welcome"; }).map(function (s) {
      var first = boards.filter(function (b) { return b.section === s.id && b.type === "header"; })[0] ||
                  boards.filter(function (b) { return b.section === s.id; })[0];
      var img = first ? first.image : "";
      var n = boards.filter(function (b) { return b.section === s.id; }).length;
      // Section 3 is a portrait of the Promised Messiah. Show the whole photo uncropped
      // ("contain") on the poster's maroon so nothing — turban included — is ever cut.
      var isPortrait = s.id === "s3";
      var bgStyle = isPortrait
        ? "background-image:url(assets/img/the-promised-messiah_portrait.jpg);background-size:contain;background-position:center;background-repeat:no-repeat"
        : "background-image:url(" + img + ");background-position:center";
      var cardStyle = isPortrait ? ' style="background:#69172d"' : "";
      return '<a class="sec-card"' + cardStyle + ' href="#/p/' + first.slug + '">' +
        '<div class="bg" style="' + bgStyle + '"></div>' +
        '<div class="c"><span class="k">' + esc(s.kicker) + '</span>' +
        '<h3>' + esc(s.title) + '</h3><p>' + (s.subtitle ? esc(s.subtitle) : n + ' boards') + '</p></div></a>';
    }).join("");

    var titleBoard = boards.filter(function (b) { return b.type === "title"; })[0] || boards[0];

    app.innerHTML =
    '<section class="hero">' +
      '<div class="hero-bg" style="background-image:url(assets/img/og-image.jpg)"></div>' +
      '<div class="hero-inner">' +
        '<img class="emblem" src="assets/logo/emblem_512.png" alt="Ahmadiyya Muslim Community UK emblem">' +
        '<span class="kicker">' + esc(ex.organiser) + ' &nbsp;·&nbsp; National Outreach ' + ex.year + '</span>' +
        '<h1>' + esc(ex.title) + '</h1>' +
        '<div class="sub">' + esc(ex.subtitle) + '</div>' +
        '<p class="lede">A journey across a thousand years of prophecy — from Cyrus the Great to the Rise of Islam and the Promised Messiah. Walk the exhibition with a guided audio tour in eleven languages, on your own phone.</p>' +
        '<div class="hero-cta">' +
          '<a class="btn btn-gold" href="#/p/' + boards[0].slug + '">' + I.head + ' Begin the Audio Tour</a>' +
          '<a class="btn btn-ghost" href="#/posters">' + I.book + ' Browse the Boards</a>' +
        '</div>' +
        '<div class="meta">' + esc(ex.credit) + '</div>' +
      '</div>' +
    '</section>' +

    '<section class="band">' +
      '<div class="wrap">' +
        '<div class="section-head"><span class="kicker">How it works</span>' +
        '<h2>Your guide, in your language</h2>' +
        '<p>No app, no sign-up. Everything runs privately on your phone — even offline.</p></div>' +
        '<div class="steps">' +
          '<div class="step"><div class="n">1</div><h3>Choose your language</h3><p>Tap the globe and pick from English, Urdu, Arabic, Spanish, French, German, Portuguese, Swahili, Mandarin, Japanese or Malay.</p></div>' +
          '<div class="step"><div class="n">2</div><h3>Find the board</h3><p>Scan the code beside a poster, or open it from the tour. Press play and let the guide walk you through it.</p></div>' +
          '<div class="step"><div class="n">3</div><h3>Listen or read</h3><p>Follow along with the narrated text on screen, zoom into any poster, and download the artwork to keep.</p></div>' +
        '</div>' +
      '</div>' +
    '</section>' +

    '<section class="band paper">' +
      '<div class="wrap">' +
        '<div class="section-head"><span class="kicker">The Exhibition</span><h2>Three chapters, one prophecy</h2>' +
        '<p>' + boards.length + ' boards across three sections. Tap any chapter to begin.</p></div>' +
        '<div class="sec-cards">' + secCards + '</div>' +
      '</div>' +
    '</section>' +

    '<section class="band tight">' +
      '<div class="wrap" style="text-align:center">' +
        '<span class="kicker">Previous Exhibitions</span>' +
        '<h2 class="display" style="font-size:clamp(1.8rem,4vw,2.6rem);margin:.4rem 0 .6rem">An ongoing National Outreach series</h2>' +
        '<p class="muted" style="max-width:620px;margin:0 auto 1.6rem">Each year the National Outreach team produces a new exhibition. Browse and download boards from previous years.</p>' +
        '<a class="btn btn-outline" href="#/previous">View previous years ' + I.arrow + '</a>' +
      '</div>' +
    '</section>' +

    creditBandHTML() +
    '';
    window.scrollTo(0, 0);
  }

  function creditBandHTML() {
    return '<section class="band credit-band">' +
      '<div class="wrap"><div class="credit-grid">' +
        '<div>' +
          '<span class="kicker">With Gratitude</span>' +
          '<h2>Artefacts by courtesy of the Barlas Foundation</h2>' +
          '<hr class="rule">' +
          '<p>The manuscripts, calligraphy and antiquities displayed in <em>Prophecy &amp; Persia</em> are generously loaned by <strong>Razwan Baig</strong> and <strong>the Barlas Foundation</strong>, which preserves, researches and shares Islamic artistic heritage at leading venues worldwide.</p>' +
          '<p class="muted" style="font-family:var(--sans);font-size:.86rem">An exhibition by the ' + esc(SITE.exhibition.organiser) + ' — ' + esc(SITE.exhibition.department) + '.</p>' +
        '</div>' +
        '<div class="credit-card">' +
          '<span class="k">Razwan Baig</span>' +
          '<h3>The Barlas Foundation</h3>' +
          '<p>Master calligrapher, collector and philanthropist. Founder of the Al-Qalam Project and custodian of one of Europe’s largest private collections of Islamic art. His work is held in the Khalili and Vatican Collections and shown at the British Museum and Ashmolean.</p>' +
        '</div>' +
      '</div></div>' +
    '</section>';
  }

  /* =====================================================================
     VIEW: GALLERY
     ===================================================================== */
  function renderGallery() {
    var html = '<section class="band"><div class="wrap">' +
      '<div class="section-head"><span class="kicker">The Boards</span><h2>' + esc(SITE.exhibition.title) + '</h2>' +
      '<p>Listen to the audio guide, read along, or download any board.</p></div>';
    SITE.sections.forEach(function (s) {
      var items = boards.filter(function (b) { return b.section === s.id; });
      if (!items.length) return;
      html += '<div class="gallery-section"><div class="sh"><span class="k">' + esc(s.kicker) + '</span>' +
        '<h2>' + esc(s.title) + '</h2><span class="count">' + items.length + ' boards</span></div>' +
        '<div class="card-grid">' + items.map(cardHTML).join("") + '</div></div>';
    });
    html += '</div></section>' + creditBandHTML();
    app.innerHTML = html;
  }

  function cardHTML(b) {
    var badge = b.type === "quote" ? "Quotation" : (b.type === "header" ? "Section" : (b.type === "title" ? "Welcome" : "Board"));
    return '<div class="pcard">' +
      '<a class="thumb" href="#/p/' + b.slug + '">' +
        '<span class="badge">' + badge + '</span>' +
        '<img loading="lazy" src="assets/img/' + b.slug + '_thumb.jpg" alt="' + esc(b.title) + '">' +
        '<span class="play-fab">' + I.play + '</span>' +
      '</a>' +
      '<div class="body">' +
        '<span class="st">' + esc(sectionLabel(b)) + '</span>' +
        '<h3><a href="#/p/' + b.slug + '">' + esc(b.title) + '</a></h3>' +
        '<p>' + esc(scriptFor(b, "en").blurb || "") + '</p>' +
        '<div class="foot">' +
          '<a class="lnk" href="#/p/' + b.slug + '">' + I.head + ' Listen</a>' +
          '<a class="lnk" href="assets/posters/' + b.slug + '.png" download>' + I.download + ' PNG</a>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* =====================================================================
     VIEW: POSTER DETAIL
     ===================================================================== */
  function renderPoster(b) {
    var code = state.lang, l = langByCode[code];
    var sc = scriptFor(b, code);
    var prev = boards[b._i - 1], next = boards[b._i + 1];
    var rtl = l.dir === "rtl";
    var cjk = (code === "zh" || code === "ja");

    var sentences = splitSentences(sc.script || "", code);
    var scriptHTML = sentences.map(function (s, i) { return '<span class="sent" data-i="' + i + '">' + esc(s) + '</span> '; }).join("");

    app.innerHTML =
    '<div class="wrap">' +
      '<div class="detail-top">' +
        '<a class="back-lnk" href="#/posters">' + I.back + ' All boards</a>' +
        '<span class="stopnum">Stop ' + (b._i + 1) + ' of ' + boards.length + ' · ' + esc(sectionLabel(b)) + '</span>' +
      '</div>' +
      '<div class="detail-grid">' +
        '<div class="poster-figure">' +
          '<div class="frame" id="zoomFrame">' +
            '<img src="assets/img/' + b.slug + '.jpg" alt="' + esc(b.title) + '">' +
            '<span class="zoomhint">' + I.zoom + ' Tap to zoom &amp; read</span>' +
          '</div>' +
        '</div>' +
        '<div class="detail-side">' +
          '<span class="st">' + esc(sectionLabel(b)) + '</span>' +
          '<h1>' + esc(titleFor(b, code)) + '</h1>' +

          '<div class="player" id="player">' +
            '<div class="prow">' +
              '<button class="play-main" id="btnPlay" aria-label="Play">' + I.play + '</button>' +
              '<div class="pmeta"><div class="lab">Audio Guide · <span id="curLang">' + esc(l.name) + '</span></div>' +
              '<div class="lname" id="playState">Press play to listen</div></div>' +
              '<div class="pnav">' +
                '<button id="btnPrev" aria-label="Previous board"' + (prev ? "" : " disabled") + '>' + I.prev + '</button>' +
                '<button id="btnNext" aria-label="Next board"' + (next ? "" : " disabled") + '>' + I.next + '</button>' +
              '</div>' +
            '</div>' +
            '<div class="progress"><div class="bar" id="pbar"></div></div>' +
            '<div class="pctrls">' +
              '<button class="chip" id="btnLang">' + I.globe + ' <span>' + esc(l.native) + '</span></button>' +
              '<button class="chip" id="btnSpeed">' + I.speed + ' <span id="speedLbl">' + fmtRate(state.rate) + '</span></button>' +
              '<span class="spacer"></span>' +
              '<label class="toggle"><input type="checkbox" id="chkAuto"' + (state.autonext ? " checked" : "") + '> Auto-play next</label>' +
            '</div>' +
            '<div class="voice-note" id="voiceNote">' + I.info + '<span></span></div>' +
          '</div>' +

          '<div class="readalong">' +
            '<div class="rhead"><span class="kicker">Read along</span><span class="rline"></span>' +
            '<a class="lnk" style="font-family:var(--sans);font-size:.8rem;font-weight:600;color:var(--gold-2)" href="assets/posters/' + b.slug + '.png" download>' + I.download + ' Download board</a></div>' +
            '<div class="script-text' + (cjk ? " cjk" : "") + '" id="scriptText"' + (rtl ? ' dir="rtl" lang="' + code + '"' : ' lang="' + code + '"') + '>' + scriptHTML + '</div>' +
          '</div>' +

          '<div class="downloads-row">' +
            '<a class="btn btn-navy btn-sm" href="assets/posters/' + b.slug + '.png" download>' + I.download + ' High-resolution PNG</a>' +
            '<button class="btn btn-outline btn-sm" id="btnZoom2">' + I.zoom + ' Zoom the board</button>' +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="poster-jump">' +
        (prev ? '<a class="prev" href="#/p/' + prev.slug + '"><span class="d">' + I.back + ' Previous</span><span class="t">' + esc(prev.title) + '</span></a>' : '<span></span>') +
        (next ? '<a class="next" href="#/p/' + next.slug + '"><span class="d">Next ' + I.arrow + '</span><span class="t">' + esc(next.title) + '</span></a>' : '<span></span>') +
      '</div>' +
    '</div>';

    // wire up
    AC.load(b, code);
    var btnPlay = document.getElementById("btnPlay");
    var playState = document.getElementById("playState");
    var pbar = document.getElementById("pbar");
    function refresh(s) {
      var pl = s.playing;
      btnPlay.innerHTML = pl ? I.pause : I.play;
      btnPlay.setAttribute("aria-label", pl ? "Pause" : "Play");
      if (pl) playState.textContent = AC.kind === "file" ? "Now playing" : "Now playing — sentence " + Math.min(s.idx + 1, s.total) + " of " + s.total;
      else if (s.ended) playState.textContent = "Finished — " + (next ? "on to the next board" : "end of the tour");
      else if (s.idx > 0) playState.textContent = "Paused";
      else playState.textContent = "Press play to listen";
      pbar.style.width = (s.ratio * 100).toFixed(1) + "%";
    }
    AC.subscribers = [];
    AC.on(refresh); AC.on(updateMini);
    refresh(AC.state());

    btnPlay.onclick = function () { primeAudio(); AC.toggle(); };
    document.getElementById("btnNext").onclick = function () { if (next) location.hash = "#/p/" + next.slug; };
    document.getElementById("btnPrev").onclick = function () { if (prev) location.hash = "#/p/" + prev.slug; };
    document.getElementById("btnLang").onclick = openLangSheet;
    document.getElementById("btnSpeed").onclick = cycleSpeed;
    document.getElementById("chkAuto").onchange = function (e) { state.autonext = e.target.checked; localStorage.setItem("pp_autonext", state.autonext ? "1" : "0"); };
    document.getElementById("btnZoom2").onclick = openLightbox;
    document.getElementById("zoomFrame").onclick = openLightbox;
    // click a sentence to jump
    document.getElementById("scriptText").addEventListener("click", function (e) {
      var t = e.target.closest(".sent"); if (!t) return; primeAudio();
      AC.jump(parseInt(t.getAttribute("data-i"), 10)); if (!AC.playing) AC.play();
    });
    // voice availability note
    var vn = document.getElementById("voiceNote");
    if (AC.kind === "tts" && !hasVoiceFor(code)) {
      vn.classList.add("show");
      vn.querySelector("span").innerHTML = "Your device may not have a spoken voice for <strong>" + esc(l.name) +
        "</strong>. You can still read the guide below, or switch language. On many phones you can add voices in Settings › Accessibility › Spoken Content.";
    } else { vn.classList.remove("show"); }

    window.scrollTo(0, 0);
    this_currentBoard = b;
    if (pendingAutoplay) { pendingAutoplay = false; primeAudio(); AC.play(); }
  }
  var this_currentBoard = null;

  function fmtRate(r) { return (r).toFixed(2).replace(/0$/, "") + "×"; }
  function cycleSpeed() {
    var steps = [0.8, 0.9, 0.96, 1.05, 1.15, 1.3];
    var i = steps.indexOf(state.rate); i = (i + 1) % steps.length;
    state.rate = steps[i]; localStorage.setItem("pp_rate", String(state.rate));
    var lbl = document.getElementById("speedLbl"); if (lbl) lbl.textContent = fmtRate(state.rate);
    if (AC.kind === "file" && AC.audioEl) AC.audioEl.playbackRate = state.rate;
    if (AC.kind === "tts" && AC.playing) AC._speakFrom(AC.idx); // apply new rate live
  }

  /* iOS/Chrome need a user-gesture "prime" for speechSynthesis */
  var primed = false;
  function primeAudio() {
    if (primed || !synth) return;
    try { var u = new SpeechSynthesisUtterance(""); u.volume = 0; synth.speak(u); } catch (e) {}
    primed = true; loadVoices();
  }

  /* =====================================================================
     VIEW: PREVIOUS YEARS
     ===================================================================== */
  function renderPrevious() {
    var cards = SITE.previousYears.map(function (y) {
      var tags = (y.sections || []).map(function (t) { return '<span>' + esc(t) + '</span>'; }).join("");
      var action = y.pdf
        ? '<a class="btn btn-navy btn-sm" href="' + y.pdf + '" download>' + I.download + ' Download PDF</a>'
        : '<span class="soon">' + I.info + ' Boards to be uploaded soon</span>';
      return '<div class="year-card"><div class="yr">' + y.year + '</div>' +
        '<h3>' + esc(y.title) + '</h3>' +
        '<p>' + esc(y.description) + '</p>' +
        (tags ? '<div class="tags">' + tags + '</div>' : "") +
        '<div style="margin-top:8px">' + action + '</div></div>';
    }).join("");
    app.innerHTML = '<section class="band"><div class="wrap">' +
      '<div class="section-head"><span class="kicker">Archive</span><h2>Previous Exhibitions</h2>' +
      '<p>National Outreach produces a new exhibition each year. Downloadable boards from earlier years will appear here.</p></div>' +
      '<div class="year-grid">' + cards + '</div>' +
      '<p class="muted" style="text-align:center;margin-top:34px;font-family:var(--sans);font-size:.86rem">To publish a past exhibition, drop its PDF into <code>previous-years/pdfs/</code> and add an entry in <code>assets/js/data.js</code>. See the deployment guide.</p>' +
      '</div></section>';
  }

  /* =====================================================================
     VIEW: ABOUT
     ===================================================================== */
  function renderAbout() {
    var ex = SITE.exhibition;
    app.innerHTML = '<section class="band"><div class="wrap" style="max-width:820px">' +
      '<div class="section-head"><span class="kicker">About</span><h2>' + esc(ex.title) + '</h2>' +
      '<p>' + esc(ex.subtitle) + '</p></div>' +
      '<div class="serif" style="font-size:1.16rem;line-height:1.85">' +
      '<p><em>Prophecy &amp; Persia</em> traces a single thread of divine promise across more than a thousand years of history — from Cyrus the Great, whom the exhibition identifies with the Qur’anic figure of Dhul-Qarnain, through the Rise of Islam and the coming of a Persian reviver, to the advent of the Promised Messiah.</p>' +
      '<p>The exhibition is produced by the <strong>' + esc(ex.organiser) + '</strong> through its <strong>' + esc(ex.department) + '</strong>, as part of the annual National Outreach programme.</p>' +
      '<h3 class="display" style="font-size:1.8rem;margin:1.6rem 0 .6rem">The audio guide</h3>' +
      '<p>Every board carries a narrated guide available in eleven languages — English, Urdu, Arabic, Spanish, French, German, Portuguese, Swahili, Mandarin, Japanese and Malay. Audio is generated privately on your own device; nothing is recorded or sent anywhere. Where your phone lacks a particular voice, the full script can still be read on screen.</p>' +
      '<h3 class="display" style="font-size:1.8rem;margin:1.6rem 0 .6rem">Acknowledgement</h3>' +
      '<p>' + esc(ex.credit) + '. The Foundation, founded by master calligrapher Razwan Baig, preserves and shares Islamic artistic heritage at leading venues including the British Museum, the Ashmolean Museum and the Pakistan National Art Gallery.</p>' +
      '</div>' +
      '<div style="margin-top:30px"><a class="btn btn-gold" href="#/p/' + boards[0].slug + '">' + I.head + ' Begin the Audio Tour</a></div>' +
      '</div></section>' + creditBandHTML();
  }

  /* =====================================================================
     LANGUAGE SHEET
     ===================================================================== */
  function openLangSheet() {
    loadVoices();
    var opts = SITE.languages.map(function (l) {
      var ok = hasVoiceFor(l.code);
      return '<button class="lang-opt' + (l.code === state.lang ? " sel" : "") + '" data-code="' + l.code + '">' +
        '<span class="nm">' + esc(l.name) + '</span>' +
        '<span class="nat"' + (l.dir === "rtl" ? ' dir="rtl"' : '') + '>' + esc(l.native) + '</span>' +
        '<span class="dot' + (ok ? " ok" : "") + '">' + (ok ? "voice ✓" : "read") + '</span></button>';
    }).join("");
    var ov = document.getElementById("overlay");
    ov.innerHTML = '<button class="x" id="ovX">✕</button>' +
      '<div class="sheet"><h3>Choose your language</h3>' +
      '<p class="sub">“voice ✓” plays audio on this device. “read” means follow the written guide.</p>' +
      '<div class="lang-list">' + opts + '</div></div>';
    ov.classList.add("show");
    ov.querySelector("#ovX").onclick = closeOverlay;
    ov.onclick = function (e) { if (e.target === ov) closeOverlay(); };
    ov.querySelectorAll(".lang-opt").forEach(function (btn) {
      btn.onclick = function () { setLang(btn.getAttribute("data-code")); closeOverlay(); };
    });
  }
  function closeOverlay() { document.getElementById("overlay").classList.remove("show"); }

  function setLang(code) {
    if (!langByCode[code]) return;
    state.lang = code; localStorage.setItem("pp_lang", code);
    var r = parseHash();
    AC.stop();
    if (r.view === "poster") { var b = boardBySlug[r.slug]; if (b) renderPoster(b); }
    updateHeaderLang();
    updateMini();
  }
  function updateHeaderLang() {
    var l = langByCode[state.lang];
    var el = document.getElementById("hdrLang"); if (el) el.textContent = l.code.toUpperCase();
  }

  /* =====================================================================
     LIGHTBOX (zoom & read the full board)
     ===================================================================== */
  function openLightbox() {
    var b = this_currentBoard; if (!b) return;
    var lb = document.getElementById("lightbox");
    lb.innerHTML = '<button class="lx" id="lbX">✕</button>' +
      '<img src="assets/img/' + b.slug + '.jpg" alt="' + esc(b.title) + '">' +
      '<div class="lhint">Pinch or scroll to read every word · tap ✕ to close</div>';
    lb.classList.add("show");
    document.body.style.overflow = "hidden";
    lb.querySelector("#lbX").onclick = closeLightbox;
    lb.onclick = function (e) { if (e.target === lb) closeLightbox(); };
  }
  function closeLightbox() {
    document.getElementById("lightbox").classList.remove("show");
    document.body.style.overflow = "";
  }

  /* =====================================================================
     MINI PLAYER
     ===================================================================== */
  function updateMini(s) {
    s = s || AC.state();
    var mini = document.getElementById("mini");
    var onPoster = parseHash().view === "poster";
    var active = AC.board && (s.playing || (s.idx > 0 && !s.ended));
    if (active && (!onPoster || s.playing)) {
      mini.classList.add("show");
      document.getElementById("miniTitle").textContent = AC.board.title;
      document.getElementById("miniLang").textContent = langByCode[AC.code].name + " · Audio Guide";
      document.getElementById("miniPlay").innerHTML = s.playing ? I.pause : I.play;
      document.getElementById("miniBar").style.width = (s.ratio * 100).toFixed(1) + "%";
    } else {
      mini.classList.remove("show");
    }
  }

  /* =====================================================================
     HEADER / MENU
     ===================================================================== */
  function toggleMenu() { document.querySelector(".nav").classList.toggle("open"); }
  function closeMenu() { var n = document.querySelector(".nav"); if (n) n.classList.remove("open"); }

  /* =====================================================================
     INIT
     ===================================================================== */
  function init() {
    updateHeaderLang();
    document.getElementById("hdrLangBtn").onclick = openLangSheet;
    document.getElementById("menuToggle").onclick = toggleMenu;
    // mini player controls
    document.getElementById("miniPlay").onclick = function () { AC.toggle(); };
    document.getElementById("miniOpen").onclick = function () { if (AC.board) location.hash = "#/p/" + AC.board.slug; };
    // stop audio when leaving a poster for a non-poster view is handled in setLang/renderPoster;
    window.addEventListener("hashchange", route);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeOverlay(); closeLightbox(); }
      if (e.key === " " && parseHash().view === "poster" && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) {
        e.preventDefault(); primeAudio(); AC.toggle();
      }
    });
    route();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
