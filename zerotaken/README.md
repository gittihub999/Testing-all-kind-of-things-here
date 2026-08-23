# ZeroTaken — daily promo series

One film per day, each with its own script, look, voice and score, so nothing
gets re-posted. Every film is 9:16, 1080×1920, 30fps, H.264 + AAC, mastered to
−14 LUFS.

| day | film | look | angle | length |
|---|---|---|---|---|
| 1 | `zerotaken-day1-dark.mp4` · `.html` | dark neon, glass and light | problem → premium trap → product | 46.0s |
| 2 | `zerotaken-day2-light.mp4` · `.html` | bright paper, cards and shadow | "Everything taken?" — pain first, then the fix | 34.0s |

SEO packs: `SEO.md` (day 1), `SEO-day2.md` (day 2).

### Series rules

- **Every film opens on pain-point questions.** Two of them, one per scene,
  before the product is mentioned at all.
- **The opening scene carries content, not a title card.** A feed of real
  domain names being rejected, not a headline over empty space.
- Nothing repeats between days: script, look, voice and score are all new.
- Voice: pick one that is close to the target pace unstretched. Heavy
  time-stretching is what makes a read sound synthetic, so speed stays above
  ~0.80. Question lines are measured for terminal pitch rise at build time.

## Building any day

The renderer takes the engine as an environment variable, so each day is one
engine file plus one audio build:

```bash
npm i @napi-rs/canvas
ENGINE=./engine.day2.js SUB=3 node render.js frames-day2 all      # resumable
ffmpeg -y -framerate 30 -i frames-day2/f_%04d.jpg -c:v libx264 -pix_fmt yuv420p \
  -crf 17 -preset slow -movflags +faststart day2_video.mp4

pip install kokoro-onnx   # model files in /tmp/kokoro
cd audio && python3 day2_audio.py && python3 day2_vo.py && python3 day2_mix.py && cd ..

ffmpeg -y -i day2_video.mp4 -i audio/day2_mix.wav \
  -filter_complex "[1:a]loudnorm=I=-14:TP=-1.2:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart \
  zerotaken-day2-light.mp4
```

`render.js` renders every frame as the mean of 3 sub-samples across 62% of the
frame interval for motion blur, clamped inside the scene so a shutter never
straddles a cut.

---

## Day 2 — "Everything taken?" (bright)

A deliberately light film rather than a recolour of the dark one. The dark
house style makes light the subject; here the subject is paper and shadow.
Depth comes from elevation, colour from soft washes and flat brand tints, and
the motion is springy the way light product UI is.

It opens the way day 1 does — on the pain, with a feed of names the viewer has
already burned through, each one stamped TAKEN as it scrolls past — but in the
bright system, with white cards and red stamps instead of neon strikes.

```
 0– 4  PAIN 1    a feed of names, each stamped TAKEN   "Everything taken?"
 4– 8  PAIN 2    the AI generator's names, also gone   "Even the AI ones?"
 8–14  THE FIX   brand, then results that are free     "Only what you can register"
14–20  PRICE     $12 registrar vs $2,450 aftermarket   "At the real price"
20–24  SCORE     brandability dial to 92               "Scored before you buy"
24–28  HANDLE    five platforms tick free              "And the handle"
28–34  CLOSE     results collapse into the logo        "zerotaken.com"
```

Palette: warm paper `#F5F3EF`, white cards, ink `#191512`, ZeroTaken orange
`#EF7908`, green `#2E9E33`, red `#E0364F`, and peach / mint / lavender / sky
tints. Cuts on the 120 BPM bar grid.

**Voice:** Kokoro-82M `bf_emma` (British female), speed 0.82 — 129 wpm, dry,
and only an 18% stretch. Both opening pain questions are measured for terminal
pitch rise at build time:

```
Everything you type is taken, right?   +9.3 st   rises
The AI ones were taken too, right?     +3.5 st   rises
```

**Score:** C major (C–G–Am–F), marimba plucks, bells, shakers and claps. The
arrangement is sparse under the two pain beats and opens up at the brand
reveal, so the turn in the script is a turn in the music too.

---

## Day 1 — the dark film

Vertical motion-graphics promo for [ZeroTaken](https://zerotaken.com), the AI
domain name generator that only surfaces domains you can actually register.

| file | what it is |
|---|---|
| `zerotaken-day1-dark.mp4` | the finished film — 46.0s |
| `zerotaken-day1-dark.html` | the same film as a self-contained player |
| `SEO.md` | titles, description, tags, transcript and claim sourcing |
| `voice-auditions.m4a` | five voices reading the same line, if you want a different one |
| `engine.day1.js` | the animation — one pure `drawFrame(ctx, t)`; `BRAND` and `TIMELINE` at the top |
| `render.js` | frame renderer: resumable, 3× temporal motion blur, JPEG intermediates |
| `shell.html` | player template; `/*__ENGINE__*/` and `__AUDIO__` are substituted at build time |
| `engine.16x9.js` | the original landscape cut, kept for reference |
| `audio/build_audio.py` | the score and the sound effects, synthesised |
| `audio/build_vo.py` | the voiceover (Kokoro-82M, `af_heart`) — measures question intonation |
| `audio/mix.py` | stem mix |
| `audio/stem_*.m4a` | music / SFX / voice stems, if you want to remix |

## Script

The film is built from ZeroTaken's own positioning: it opens on the two
questions their users arrive with, lands the premium-pricing trap that is their
most-cited complaint, then answers it feature by feature. Every claim is
sourced in `SEO.md`.

```
 0– 4  ASK        chip feed of candidate names       "Naming your startup?"
 4– 8  TAKEN      every line struck through, ✕       "Every good .com taken?"
 8–12  TRAP       chip flips AVAILABLE → $2,450      "For $2,450."  · the aftermarket trap
12–18  REVEAL     wordmark snap                      "AI domain name generator" → "only names you can actually register"
18–24  GENERATE   three prompts typed, results       "Describe your idea"
24–28  EXTENSIONS 8 TLD tiles ticking green          "Checked live" · 240+ extensions
28–32  SCORE      gauge draws to 92                  "brand quality score"
32–36  HANDLES    five platform tiles, one handle    "One handle. Everywhere."
36–40  PRIVACY    browser pane, lock, brokers bounce "Never leaves your browser."
40–46  LOGO BUILD the rejected names spiral in and are absorbed; the tile becomes a
                  check; the check draws itself, then travels down and lands as the
                  swoosh of the wordmark while ZERO and taken fly in to meet it
```

Cuts sit on a 120 BPM bar grid (2.0s) so the score locks to the edit. Hue arc:
mint (searching) → magenta (rejected) → red (the trap) → ZeroTaken orange (the
answer) → blue/violet through the product beats → mint (privacy) → orange.

## Voiceover

**Kokoro-82M** (Apache-2.0), voice `af_heart` — Kokoro's highest-graded voice —
at speed 0.80: 56 words, 27.2s of speech across 46s, **124 wpm while speaking**,
with real silences between phrases. Every line has at least 1.0s of slack
before its beat ends.

Deliberately **dry**: no reverb on the voice at all. One high-pass at 80 Hz, a
2 dB presence shelf at 4.5 kHz and gentle levelling — no saturation stage. The
voice sits **+13.6 dB over the music** during speech.

### Questions that actually sound like questions

Most phrasings make this class of model drop its pitch at the end of a
question, so it reads as a statement. Measured on `af_heart`, "Naming your
startup?" ends **10 semitones down**. `build_vo.py` now tracks F0 and reports
the terminal pitch change of every question line, and the copy was chosen
against that measurement:

```
Looking for a name?                   +2.0 st   rises
Every good dot com is taken, right?   +4.7 st   rises
And the free ones?                    +6.7 st   rises
```

A trailing tag (`…, right?`) turned out to be the most reliable trigger, and
grammatically complete questions beat noun-phrase fragments.

`voice-auditions.m4a` has `af_heart`, `af_bella`, `bf_emma`, `bf_alice` and
`af_nova` each reading the film's opening three lines, so the question
intonation is directly comparable. To switch:
`VO_VOICE=bf_emma python3 audio/build_vo.py`, then re-run `mix.py`.

```
 0.70  Looking for a name?
 4.55  Every good dot com is taken, right?
 8.40  And the free ones? / Premium priced.
12.65  ZeroTaken. / Only names you can actually register.
18.60  Describe your idea. / The A.I. writes the names.
24.50  Two hundred forty extensions.
28.60  Every name scored for brandability.
32.60  And the handle, everywhere.
36.60  Searches never leave your browser.
40.70  ZeroTaken dot com. / Free to search.
```

## Score

One continuous piece — no per-scene risers, drops or stingers. A 120 BPM bed in
A minor (Am–F–C–G): sub bass and overlapping pads throughout, drums arriving in
stages, a 16th arp from the reveal, and a sparse lead lifting the last third.
Measured across the whole film the bed never drops more than 7 dB below its own
average. Transitions are handled in the SFX layer, not by cutting the music.

Music ducks 3.5 dB under the read on a 420ms envelope, so it leans back without
pumping. Mastered to −14 LUFS integrated, −1.2 dBTP.

## Craft notes

- **Motion blur.** Every output frame is the mean of 3 sub-samples across 62% of
  the frame interval, accumulated by compositing at 1/(k+1) rather than pulling
  pixels into JS. Sub-samples are clamped inside their own scene so a shutter
  never straddles a cut and softens it into a one-frame dissolve.
- **JPEG intermediates.** PNG encoding was 96% of render wall-clock; the final
  H.264 is 4:2:0 regardless.
- **Grain** is keyed to the output frame index, so it survives the blur average
  instead of being smoothed away. Plus a vignette and anamorphic streaks on the
  hero highlights.
- **Headlines** rise word by word out of a clip mask with the keyword in the
  accent colour. Typewriter is reserved for the search box, where it is diegetic.
- **Depth of field** on the tile ring; overshoot on arrivals; nothing holds
  still — every beat has a camera move, a breathing glow and a drifting field.

## Rebuilding

```bash
npm i @napi-rs/canvas
SUB=3 node render.js frames all                # 1380 frames, resumable
ffmpeg -y -framerate 30 -i frames/f_%04d.jpg -c:v libx264 -pix_fmt yuv420p \
  -crf 17 -preset slow -movflags +faststart video_only.mp4

pip install kokoro-onnx   # model files in /tmp/kokoro from the kokoro-onnx releases
cd audio && python3 build_audio.py && python3 build_vo.py && python3 mix.py && cd ..

ffmpeg -y -i video_only.mp4 -i audio/mix.wav \
  -filter_complex "[1:a]loudnorm=I=-14:TP=-1.2:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart zerotaken-promo.mp4
```
