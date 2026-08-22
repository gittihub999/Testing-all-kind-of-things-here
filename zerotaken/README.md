# ZeroTaken — motion promo (9:16, with sound)

Vertical motion-graphics promo for [ZeroTaken](https://zerotaken.com), the AI
domain name generator that only surfaces domains you can actually register.

| file | what it is |
|---|---|
| `zerotaken-promo.mp4` | the finished film — 46.0s, 1080×1920, 30fps, H.264 CRF 17 + AAC |
| `zerotaken-promo.html` | the same film as a self-contained player with the audio embedded |
| `SEO.md` | titles, description, tags, transcript and claim sourcing |
| `engine.js` | the animation — one pure `drawFrame(ctx, t)`; `BRAND` and `TIMELINE` at the top |
| `render.js` | frame renderer: resumable, 3× temporal motion blur, JPEG intermediates |
| `shell.html` | player template; `/*__ENGINE__*/` and `__AUDIO__` are substituted at build time |
| `engine.16x9.js` | the original landscape cut, kept for reference |
| `audio/build_audio.py` | the score and the sound effects, synthesised |
| `audio/build_vo.py` | the voiceover (Piper TTS, `en_GB-alan-medium`) |
| `audio/mix.py` | stem mix |
| `audio/stem_*.m4a` | music / SFX / voice stems, if you want to remix |

## Script

The film is built from ZeroTaken's own positioning: it opens on the two
questions their users arrive with, lands the premium-pricing trap that is their
most-cited complaint, then answers it feature by feature. Every claim is
sourced in `SEO.md`.

```
 0– 4  ASK        chip feed of candidate names       "Naming your startup?"
 4– 8  TAKEN      every line struck through, ✕       "Every good .com is gone"
 8–12  TRAP       chip flips AVAILABLE → $2,450      "For $2,450."  · the aftermarket trap
12–18  REVEAL     wordmark snap                      "AI domain name generator" → "only names you can actually register"
18–24  GENERATE   three prompts typed, results       "Describe your idea"
24–28  EXTENSIONS 8 TLD tiles ticking green          "Checked live" · 240+ extensions
28–32  SCORE      gauge draws to 92                  "brand quality score"
32–36  HANDLES    five platform tiles, one handle    "One handle. Everywhere."
36–40  PRIVACY    browser pane, lock, brokers bounce "Never leaves your browser."
40–46  CLOSE      tile → check → lockup → CTA        "zerotaken.com · free to search"
```

Cuts sit on a 120 BPM bar grid (2.0s) so the score locks to the edit. Hue arc:
mint (searching) → magenta (rejected) → red (the trap) → ZeroTaken orange (the
answer) → blue/violet through the product beats → mint (privacy) → orange.

## Voiceover

`en_GB-alan-medium`, which reads at ~130 wpm unstretched, so the pace comes from
the voice rather than from slowing a fast one down. 53 words, 26.6s of speech
across 46s — 120 wpm while speaking, with real silences between phrases.

```
 0.70  Naming your startup?
 4.55  Every good dot com is gone.
 8.40  The free ones? / Premium priced.
12.65  ZeroTaken. / Only names you can actually register.
18.60  Describe your idea. / The A.I. writes the names.
24.50  Two hundred forty extensions.
28.60  Every name scored for brandability.
32.60  And the handle, everywhere.
36.60  Searches never leave your browser.
40.70  ZeroTaken dot com. / Free to search.
```

Every line has at least 0.8s of slack before its beat ends.

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

pip install piper-tts && python3 -m piper.download_voices en_GB-alan-medium
cd audio && python3 build_audio.py && python3 build_vo.py && python3 mix.py && cd ..

ffmpeg -y -i video_only.mp4 -i audio/mix.wav \
  -filter_complex "[1:a]loudnorm=I=-14:TP=-1.2:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart zerotaken-promo.mp4
```
