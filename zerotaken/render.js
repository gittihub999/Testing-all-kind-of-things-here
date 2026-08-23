/* Frame renderer — resumable, with temporal motion blur.

   Frames are written as high-quality JPEG rather than PNG: PNG encoding was
   most of the wall clock here, and the final H.264 is 4:2:0 anyway.

   Every output frame is the average of SUB sub-samples spread across a
   SHUTTER-wide slice of the frame interval, which is what stops fast moves
   from strobing. SUB=1 turns it off.

     node render.js OUTDIR                      # everything
     node render.js OUTDIR all 120 180          # a range (run 4 in parallel)
     node render.js OUTDIR preview 2.4 6.0 9.1  # stills at given seconds
     node render.js OUTDIR missing              # list gaps

   env: SUB (default 3), SHUTTER (default 0.6 of a frame interval)
*/
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');
const ENGINE = require(process.env.ENGINE || './engine.day1.js');   // ENGINE=./engine.day2.js for another film

const outDir = process.argv[2] || './frames';
const mode = process.argv[3] || 'all';
const SUB = Math.max(1, parseInt(process.env.SUB || '3', 10));
const SHUTTER = parseFloat(process.env.SHUTTER || '0.62');
const QUAL = parseInt(process.env.JPEG_Q || '97', 10);
fs.mkdirSync(outDir, { recursive: true });

const total = Math.round(ENGINE.DUR * ENGINE.FPS);

/* Scene boundaries. A shutter that straddles a cut would blend the two
   scenes into a one-frame dissolve, which is exactly what a hard cut must
   not do — so every sub-sample is clamped inside its own scene. */
const ENDS = ENGINE.TIMELINE.map(b => b.end);
function sceneBounds(t) {
  let start = 0;
  for (let i = 0; i < ENDS.length; i++) {
    if (t < ENDS[i]) return [start, ENDS[i]];
    start = ENDS[i];
  }
  return [start, ENGINE.DUR];
}
const canvas = createCanvas(ENGINE.W, ENGINE.H);      // output
const ctx = canvas.getContext('2d');
const scratch = SUB > 1 ? createCanvas(ENGINE.W, ENGINE.H) : null;
const sctx = scratch ? scratch.getContext('2d') : null;

/* One output frame, averaged over the shutter.

   The average is accumulated by compositing each sub-sample at 1/(k+1) — an
   incremental mean done by the rasteriser, which is an order of magnitude
   faster than pulling 8 MB of pixels into JS per sample. */
function frameBuffer(t) {
  if (SUB === 1) {
    ENGINE.drawFrame(ctx, t);
    return canvas.toBuffer('image/jpeg', QUAL);
  }
  const span = SHUTTER / ENGINE.FPS;
  const [s0, s1] = sceneBounds(t);
  const eps = 1e-4;
  for (let k = 0; k < SUB; k++) {
    const off = (k / (SUB - 1) - 0.5) * span;
    const st = Math.min(s1 - eps, Math.max(s0 + eps, Math.max(0, t + off)));
    ENGINE.drawFrame(sctx, st);
    ctx.globalCompositeOperation = k === 0 ? 'copy' : 'source-over';
    ctx.globalAlpha = 1 / (k + 1);
    ctx.drawImage(scratch, 0, 0);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  return canvas.toBuffer('image/jpeg', QUAL);
}

if (mode === 'preview') {
  process.argv.slice(4).map(Number).forEach((t, i) => {
    fs.writeFileSync(path.join(outDir, 'p_' + String(i).padStart(2, '0') + '.jpg'), frameBuffer(t));
  });
  console.log('preview frames:', process.argv.length - 4, 'sub:', SUB);

} else if (mode === 'missing') {
  const have = new Set(fs.readdirSync(outDir).filter(f => /^f_\d+\.jpg$/.test(f))
    .map(f => parseInt(f.slice(2, -4), 10)));
  const miss = [];
  for (let i = 0; i < total; i++) if (!have.has(i)) miss.push(i);
  console.log(JSON.stringify({ total, have: have.size, missing: miss.length, first: miss.slice(0, 10) }));

} else {
  const a = parseInt(process.argv[4] || '0', 10);
  const b = parseInt(process.argv[5] || '0', 10);
  const from = b > 0 ? a : 0, to = b > 0 ? Math.min(b, total) : total;
  const t0 = Date.now();
  let drew = 0;
  for (let i = from; i < to; i++) {
    const p = path.join(outDir, 'f_' + String(i).padStart(4, '0') + '.jpg');
    if (fs.existsSync(p) && fs.statSync(p).size > 2000) continue;   // resume
    fs.writeFileSync(p, frameBuffer(i / ENGINE.FPS));
    drew++;
  }
  console.log(`rendered ${from}->${to} (${drew} new, sub=${SUB}) in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}
