# ZeroTaken — motion promo (9:16, with sound)

Vertical motion-graphics promo for [ZeroTaken](https://zerotaken.com), the AI
domain-name generator with live availability checking.

| file | what it is |
|---|---|
| `zerotaken-promo.mp4` | the finished film — 30.0s, 1080×1920, 30fps, H.264 + AAC |
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

Cuts sit on a 120 BPM bar grid (2.0s), so the score locks to the edit.

```
 0.0– 5.0  LIT-FORM     slashed zero turning on a mint canopy    "Every name is taken"
 5.0– 9.0  SHOCKWAVE    wordmark snap + check draw-on            "AI names · live availability"
 9.0–14.0  QUERY-PILL   three prompts typed, results rising      fintech / photo editor / indie devs
14.0–18.0  SLAB-RING    8 TLD tiles expanding + ticking green    "Checked live"
18.0–21.0  STAT-SLAM    gauge draws to 92, comet runs the arc    "brand quality score"
21.0–25.0  CARD-SWEEP   warm panel, specular sweep, whip-out     "$30K name. Twelve dollars."
25.0–30.0  HERO-PEEL    .com tile → check → lockup               "zerotaken.com"
```

Hue arc: mint/cyan → electric blue → violet → magenta → ZeroTaken orange.

Every beat carries a camera move, a breathing glow, a drifting mote field and at
least one element in continuous motion — nothing holds still.

## Voiceover

```
 0.55  Every name you love is already taken.
 6.20  Zero Taken finds the ones that aren't.
 9.45  Describe your idea in plain words. The A.I. does the naming.
14.45  Every extension, checked live, straight from the registry.
18.35  Scored for brandability before you buy.
21.45  One founder found a thirty thousand dollar name for twelve.
25.70  Zero Taken dot com. Your name is waiting.
```

## Rebuilding

```bash
npm i @napi-rs/canvas
node render.js frames all                     # 900 PNGs, resumable — run 4 ranges in parallel
ffmpeg -y -framerate 30 -i frames/f_%04d.png -c:v libx264 -pix_fmt yuv420p \
  -crf 18 -preset medium -movflags +faststart video_only.mp4

pip install piper-tts && python3 -m piper.download_voices en_US-ryan-high
cd audio && python3 build_audio.py && python3 build_vo.py && python3 mix.py && cd ..

ffmpeg -y -i video_only.mp4 -i audio/mix.wav \
  -filter_complex "[1:a]loudnorm=I=-14:TP=-1.2:LRA=11,aresample=48000[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart zerotaken-promo.mp4
```

Mastered to −14 LUFS integrated, −1.2 dBTP.
