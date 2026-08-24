# ZeroTaken — motion promo film

A 33.6s vertical (9:16) promo film for [ZeroTaken](https://zerotaken.com), the
AI domain-name generator with live availability checking.

Built in the **bright** variant of the motion-promo house style: near-white
paper, dark ink type, and saturated colour arriving as washes and shape-matched
haloes instead of emitted neon. Same craft rules as the dark style, inverted
ground.

## Deliverables

| File | What it is |
|---|---|
| `zerotaken-promo.mp4` | 1080×1920 · 30fps · H.264 · AAC · 33.6s |
| `zerotaken-promo.html` | Self-contained interactive player — engine + audio inlined, scrub any frame |

## Beat sheet

The film opens on the viewer's problem and only names the product a third of
the way in.

```
ARC   cold steel → coral alarm → EMERALD BLOOM → violet/blue → gold → emerald

 0.00–3.60   LIT-FORM    drawn "?" on a cold canopy       "Still nameless?"
 3.60–7.10   LIST-STAMP  five names stamped TAKEN         "Every good .com already gone?"
 7.10–10.40  STAT-SLAM   $2,000 rolls in, screen shake    "Premium. Again."
10.40–14.00  SHOCKWAVE   ember mark SNAPS to emerald      ZEROTAKEN
14.00–17.60  QUERY-PILL  two queries typed, carousel swap "Just describe it."
17.60–21.20  LIST-RISE   names rise, Available checks pop "Checked live."
21.20–24.30  SLAB-RING   eight TLD tiles expand + rotate  "100+ extensions."
24.30–27.20  GAUGE-SLAM  arc sweeps to 92                 "Every name, scored."
27.20–30.00  PANEL       five handles tick free + lock    "The handles too."
30.00–33.60  HERO-PEEL   tile morphs to the mark          zerotaken.com
```

## Voiceover

Ten lines, one per beat, synthesised offline with [Piper](https://github.com/OHF-Voice/piper1-gpl)
(`en_US-ryan-high`) — no third-party audio in the output. Sound design (whooshes,
two impacts, a riser into the reveal, UI ticks and a single-key drone) is
synthesised from scratch in `mixaudio.py`, which also ducks the bed under every
spoken line.

## Building

```bash
npm i @napi-rs/canvas ffmpeg-static
python3 -m pip install piper-tts numpy

node render.js ./frames all 0 252      # resumable; run four chunks in parallel
python3 mixaudio.py                    # voiceover + sound design -> audio.wav
ffmpeg -framerate 30 -i frames/f_%04d.png -i audio.wav \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium \
  -c:a aac -b:a 192k -shortest -movflags +faststart zerotaken-promo.mp4
node build_html.js                     # inlines engine + audio into the player
```

`engine.js` exposes one pure function, `drawFrame(ctx, tSeconds)`. The same file
drives the HTML player and the MP4 render, so what you scrub is what encodes.
`BRAND` and `TIMELINE` sit at the top of the file.
