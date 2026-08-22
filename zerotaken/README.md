# ZeroTaken — motion promo

Broadcast-style motion-graphics promo for [ZeroTaken](https://zerotaken.com),
the AI domain-name generator with live availability checking.

| file | what it is |
|---|---|
| `zerotaken-promo.mp4` | the finished film — 28.4s, 1920×1080, 30fps, H.264, silent |
| `zerotaken-promo.html` | the same animation as a self-contained player: open in any browser, scrub frame by frame |
| `engine.js` | the animation itself — one pure `drawFrame(ctx, t)`; `BRAND` and `TIMELINE` are at the top |
| `render.js` | frame renderer (resumable) |
| `shell.html` | player template; `/*__ENGINE__*/` is replaced with `engine.js` to build the HTML |

## Beat sheet

```
0.00–4.30   LIT-FORM     slashed zero on a mint canopy      "Every name is taken"
4.30–8.10   SHOCKWAVE    + wordmark snap + check draw-on    "AI names · live availability"
8.10–12.70  QUERY-PILL   three prompts typed                 fintech / photo editor / indie devs
12.70–17.30 SLAB-RING    8 TLD tiles expanding              "Checked live"
17.30–21.00 STAT-SLAM    gauge draws to 92                  "brand quality score"
21.00–24.70 CARD-SWEEP   warm panel                         "$30K name. Twelve dollars."
24.70–28.40 HERO-PEEL    .com tile → check → lockup         "zerotaken.com"
```

Hue arc: mint/cyan → electric blue → violet → magenta → ZeroTaken orange.

## Rebuilding

```bash
npm i @napi-rs/canvas
node render.js frames all              # 852 PNGs, resumable
ffmpeg -y -framerate 30 -i frames/f_%04d.png -c:v libx264 -pix_fmt yuv420p \
  -crf 18 -preset medium -movflags +faststart zerotaken-promo.mp4
```
