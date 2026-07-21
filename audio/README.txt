AUDIO — optional pre-recorded narration (upgrade path)
======================================================

By default the audio guide is spoken live by each visitor's phone
(on-device text-to-speech), so NOTHING is required in this folder.

If you later want higher-quality or human-recorded narration for any
board and language, you can drop in MP3 files here and the player will
use them automatically instead of the phone's voice.

STEPS:

1. Create a folder per language code and name each file after the board slug:
      audio/ur/the-cyrus-cylinder.mp3
      audio/es/the-cyrus-cylinder.mp3
   (Language codes: en ur ar es fr de pt sw zh ja ms.
    Board slugs are the same as the poster URLs, e.g. #/p/the-cyrus-cylinder.)

2. Open  assets/js/data.js  and register the file in "audioOverrides", e.g.
      "audioOverrides": {
        "the-cyrus-cylinder": { "ur": "audio/ur/the-cyrus-cylinder.mp3",
                                "es": "audio/es/the-cyrus-cylinder.mp3" }
      }

3. Re-deploy. Any board+language WITHOUT an entry keeps using on-device speech.

You can mix and match freely — record only the languages or boards you want.
