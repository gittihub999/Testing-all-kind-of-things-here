# ZeroTaken — motion promo (9:16, with sound)

Vertical motion-graphics promo for [ZeroTaken](https://zerotaken.com), the AI
domain-name generator with live availability checking.

| file | what it is |
|---|---|
| `zerotaken-promo.mp4` | the finished film — 36.0s, 1080×1920, 30fps, H.264 + AAC |
| `zerotaken-promo.html` | the same film as a self-contained player with the audio embedded — open in any browser and scrub |
| `engine.js` | the animation — one pure `drawFrame(ctx, t)`; `BRAND` and `TIMELINE` at the top |
| `engine.16x9.js` | the earlier landscape cut, kept for reference |
| `render.js` | frame renderer (resumable) |
| `shell.html` | player template; `/*__ENGINE__*/` and `__AUDIO__` are substituted at build time |
| `audio/build_audio.py` | the score and the sound effects, synthesised |
| `audio/build_vo.py` | the voiceover (Piper TTS, `en_US-ryan-high`) |
| `audio/mix.py` | stem mix with music ducked under the read |
| `audio/stem_*.m4a` | music / SFX / voice stems, if you want to remix |

## Beat sheet

Eight beats, every cut on a 120 BPM bar line (2.0s), so the score locks to the edit.
The film opens by asking the viewer two questions, one per scene.

```
 0– 4  QUESTION 1   scrolling feed of candidate domains      "Naming your startup?"
 4– 8  QUESTION 2   every line struck through, ✕ TAKEN       "Every .com already gone?"
 8–12  BRAND SNAP   shockwave, wordmark snap, check draw-on  "AI names · live availability"
12–18  QUERY-PILL   three prompts typed, results rising      "Describe your idea"
18–22  SLAB-RING    8 TLD tiles expanding, ticking green     "Checked live"
22–26  STAT-SLAM    gauge draws to 92, comet runs the arc    "brand quality score"
26–30  CARD-SWEEP   warm panel, specular sweep, whip-out     "$30K name. Twelve dollars."
30–36  HERO-PEEL    .com tile → check → lockup → CTA         "zerotaken.com · free to search"
```

Hue arc: mint/cyan (searching) → magenta/pink (rejected) → ZeroTaken orange (the
answer) → blue/violet through the product beats → orange again at the close.

Beats 1 and 2 are built from the same glass-and-halo vocabulary as the TLD ring:
a perspective feed of domain chips scrolling continuously, each with a halo
hugging its silhouette and a lit top-left edge. Beat 2 stamps every chip that
crosses the focus line, then the feed runs away into the reveal.

Every beat carries a camera move, a breathing glow, a drifting mote field and at
least one element in continuous motion — nothing holds still. Cuts are hard: no
scene fades in or out.

## Voiceover

```
 0.45  Naming your startup? You'll check a hundred domains tonight.
 4.35  And every good dot com is already gone. Right?
 8.55  Zero Taken flips it. Every name it gives you is available.
12.45  Describe your idea in plain words. The A.I. writes the names and checks them as it goes.
18.45  Hundreds of extensions, checked live at the registry.
22.45  Each one scored for brandability, before you spend a cent.
26.45  One founder found a thirty thousand dollar name for twelve.
30.60  Zero Taken dot com. Free to search. Your name is still out there.
```

## Rebuilding

```bash
npm i @napi-rs/canvas
node render.js frames all                     # 1080 PNGs, resumable — run 4 ranges in parallel
ffmpeg -y -framerate 30 -i frames/f_%04d.png -c:v libx264 -pix_fmt yuv420p \
  -crf 18 -preset medium -movflags +faststart video_only.mp4

pip install piper-tts && python3 -m piper.download_voices en_US-ryan-high
cd audio && python3 build_audio.py && python3 build_vo.py && python3 mix.py && cd ..

ffmpeg -y -i video_only.mp4 -i audio/mix.wav \
  -filter_complex "[1:a]loudnorm=I=-14:TP=-1.2:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart zerotaken-promo.mp4
```

Mastered to −14 LUFS integrated, −1.2 dBTP.
