/* ============================================================================
   ZEROTAKEN — motion promo engine  ·  BRIGHT house style
   ----------------------------------------------------------------------------
   drawFrame(ctx, tSeconds) is pure and seekable, so the same file drives both
   the HTML player and the MP4 render.
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PROMO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==========================================================================
     1. CONFIG
     ========================================================================== */
  var W = 1080, H = 1920, FPS = 30;

  var BRAND = {
    name: 'ZEROTAKEN',
    site: 'zerotaken.com',
    font: '"Helvetica Neue", Helvetica, "Liberation Sans", Arial, sans-serif',
    ink: '#0b1220',
    accent: '#10b981',
    hot: '#f59e0b'
  };

  // Bright palette. Paper is near-white; colour arrives as washes and haloes.
  var P = {
    paper:  '#ffffff', paperMid: '#f6f9fd', paperLow: '#e8eef7',
    ink:    '#0b1220', ink2: '#5a6578', ink3: '#98a4b8',
    steel:  '#b7c6dd', slate: '#7c8ea9',
    cold:   '#2f6bff', sky: '#12aef0',
    emerald:'#10b981', mint: '#3fe9ad', deep: '#047857',
    violet: '#6d5bff', indigo: '#4f46e5',
    amber:  '#f59e0b', gold: '#ffc94a', coral: '#ff5a45', rose: '#ff2f6e'
  };

  var TIMELINE = [
    { name: 'q1',      end: 3.60,  fn: sceneQ1 },
    { name: 'q2',      end: 7.10,  fn: sceneQ2 },
    { name: 'q3',      end: 10.40, fn: sceneQ3 },
    { name: 'reveal',  end: 14.00, fn: sceneReveal },
    { name: 'pill',    end: 17.60, fn: scenePill },
    { name: 'names',   end: 21.20, fn: sceneNames },
    { name: 'tld',     end: 24.30, fn: sceneTLD },
    { name: 'score',   end: 27.20, fn: sceneScore },
    { name: 'social',  end: 30.00, fn: sceneSocial },
    { name: 'close',   end: 33.60, fn: sceneClose }
  ];
  var DUR = TIMELINE[TIMELINE.length - 1].end;

  /* ==========================================================================
     2. MATH + COLOUR
     ========================================================================== */
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function inv(t, a, b) { return clamp((t - a) / (b - a)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOut4(t) { return 1 - Math.pow(1 - t, 4); }
  function easeOut5(t) { return 1 - Math.pow(1 - t, 5); }
  function easeIn(t) { return t * t * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeBack(t) { var c = 1.24; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

  function hexa(h, a) {
    var n = parseInt(h.slice(1), 16);
    return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function mix(h1, h2, t) {
    var a = parseInt(h1.slice(1), 16), b = parseInt(h2.slice(1), 16);
    var r = Math.round(lerp((a >> 16) & 255, (b >> 16) & 255, t));
    var g = Math.round(lerp((a >> 8) & 255, (b >> 8) & 255, t));
    var l = Math.round(lerp(a & 255, b & 255, t));
    return '#' + (((1 << 24) + (r << 16) + (g << 8) + l).toString(16).slice(1));
  }
  function rng(seed) { var s = seed; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

  /* Light breathes: one swell across a beat, with a smaller second pulse. */
  function swell(p) {
    var big = Math.sin(clamp(p) * Math.PI);
    var small = 0.5 - 0.5 * Math.cos(clamp(p) * Math.PI * 3.1);
    return 0.34 + 0.50 * big + 0.18 * small * big;
  }

  /* ==========================================================================
     3. PRIMITIVES — bright style
     ========================================================================== */
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /* The paper. Never flat: a vertical gradient plus tinted corners. */
  function paper(ctx, tint, tintA) {
    var g = ctx.createLinearGradient(0, 0, W * 0.25, H);
    g.addColorStop(0, P.paper);
    g.addColorStop(0.48, P.paperMid);
    g.addColorStop(1, P.paperLow);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    if (tint) { wash(ctx, W * 0.5, H * 0.30, H * 0.62, tint, tintA === undefined ? 0.16 : tintA); }
  }

  /* A soft colour field ON paper. Normal composite — 'lighter' just blows to
     white on a bright ground. Colour on white has to be laid down, not added. */
  function wash(ctx, x, y, r, color, a) {
    if (a <= 0 || r <= 0) return;
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexa(color, a));
    g.addColorStop(0.32, hexa(color, a * 0.56));
    g.addColorStop(0.66, hexa(color, a * 0.17));
    g.addColorStop(1, hexa(color, 0));
    ctx.save(); ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
  }
  function washE(ctx, x, y, rx, ry, color, a) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    wash(ctx, x, y, rx, color, a); ctx.restore();
  }

  /* ---- THE ONE THAT MAKES IT LOOK EXPENSIVE ----------------------------
     Bloom takes the shape of the object. On a bright ground it reads as a
     saturated coloured halo/shadow rather than emitted light — same rule,
     inverted ground. `path(k)` traces the silhouette at scale k.          */
  function shapeHalo(ctx, path, color, amount, layers) {
    layers = layers || [[3.2, 0.10], [2.3, 0.13], [1.66, 0.16], [1.26, 0.18], [1.07, 0.17]];
    ctx.save();
    for (var i = 0; i < layers.length; i++) {
      var k = layers[i][0], a = layers[i][1] * amount;
      if (a <= 0.002) continue;
      try { ctx.filter = 'blur(' + (10 + k * 26).toFixed(0) + 'px)'; } catch (e) { }
      path(k);
      ctx.fillStyle = hexa(color, a); ctx.fill();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();
  }

  /* Static film grain — fixed seed so it is texture, not noise, and encodes
     without eating bitrate. */
  var GRAIN = (function () {
    var r = rng(90210), a = [];
    for (var i = 0; i < 2400; i++) a.push([Math.floor(r() * W), Math.floor(r() * H), r() < 0.55 ? 1 : 2, (0.016 + r() * 0.042)]);
    return a;
  })();
  function grain(ctx) {
    ctx.save();
    for (var i = 0; i < GRAIN.length; i++) {
      var g = GRAIN[i];
      ctx.fillStyle = 'rgba(11,18,32,' + g[3].toFixed(3) + ')';
      ctx.fillRect(g[0], g[1], g[2], g[2]);
    }
    ctx.restore();
  }
  function vignette(ctx, a) {
    var g = ctx.createRadialGradient(W / 2, H * 0.46, H * 0.20, W / 2, H * 0.50, H * 0.80);
    g.addColorStop(0, 'rgba(11,18,32,0)');
    g.addColorStop(1, 'rgba(11,18,32,' + a + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* Light glass card: white body, coloured halo under it, hairline edge,
     top highlight. bodyA fades the container while leaving contents lit. */
  function card(ctx, x, y, w, h, r, o) {
    o = o || {};
    var a = o.alpha === undefined ? 1 : o.alpha;
    if (a <= 0.004) return;
    var halo = o.halo || P.cold, haloA = o.haloA === undefined ? 0.30 : o.haloA;
    ctx.save(); ctx.globalAlpha = ctx.globalAlpha * a;

    ctx.save();                                   // coloured halo
    try { ctx.filter = 'blur(' + Math.max(10, h * 0.30).toFixed(0) + 'px)'; } catch (e) { }
    rr(ctx, x + w * 0.03, y + h * 0.14, w * 0.94, h * 0.98, r);
    ctx.fillStyle = hexa(halo, haloA); ctx.fill();
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();

    ctx.save();                                   // contact shadow
    rr(ctx, x, y, w, h, r);
    ctx.shadowColor = 'rgba(17,28,48,0.16)'; ctx.shadowBlur = h * 0.30; ctx.shadowOffsetY = h * 0.10;
    ctx.fillStyle = '#fff'; ctx.fill();
    ctx.restore();

    var bg = ctx.createLinearGradient(x, y, x + w * 0.35, y + h);   // body
    bg.addColorStop(0, '#ffffff');
    bg.addColorStop(0.55, '#fbfcfe');
    bg.addColorStop(1, o.tint ? mix('#f1f5fa', o.tint, 0.16) : '#f0f4fa');
    rr(ctx, x, y, w, h, r); ctx.fillStyle = bg; ctx.fill();

    ctx.save();                                   // hairline + lit top-left edge
    rr(ctx, x + 1, y + 1, w - 2, h - 2, r - 1);
    var eg = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
    eg.addColorStop(0, 'rgba(255,255,255,0.95)');
    eg.addColorStop(0.22, hexa(halo, 0.30));
    eg.addColorStop(1, 'rgba(11,18,32,0.10)');
    ctx.lineWidth = 2; ctx.strokeStyle = eg; ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  /* ---- type ---- */
  function setFont(ctx, weight, size) { ctx.font = weight + ' ' + size + 'px ' + BRAND.font; }
  function trackW(ctx, txt, sp) {
    var w = 0; for (var i = 0; i < txt.length; i++) w += ctx.measureText(txt[i]).width + sp;
    return txt.length ? w - sp : 0;
  }
  function trackFill(ctx, txt, x, y, sp) {
    var c = x; for (var i = 0; i < txt.length; i++) { ctx.fillText(txt[i], c, y); c += ctx.measureText(txt[i]).width + sp; }
    return c;
  }
  function centreText(ctx, txt, y, size, col, weight, track) {
    setFont(ctx, weight || '700', size);
    ctx.textBaseline = 'alphabetic';
    var w = trackW(ctx, txt, track || 0);
    ctx.fillStyle = col;
    trackFill(ctx, txt, (W - w) / 2, y, track || 0);
    return w;
  }
  /* Type sits on darkness in the dark style; here it sits on light — so a
     soft white scrim keeps it legible over a saturated wash. */
  function scrim(ctx, y, h, a) {
    var g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,' + a + ')');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, y - h / 2, W, h);
  }

  /* Typewriter — the last character typed flashes hot and cools to ink. */
  function typeOut(ctx, txt, x, y, p, size, ink, hot, hotHold) {
    setFont(ctx, '700', size);
    var n = Math.min(txt.length, Math.floor(clamp(p) * (txt.length + 0.6)));
    var cx = x;
    for (var i = 0; i < n; i++) {
      var recent = i >= n - 2 ? (i === n - 1 ? 1 : 0.6) : 0;
      ctx.fillStyle = recent > 0 && hotHold > 0 ? mix(ink, hot, hotHold * recent) : ink;
      ctx.fillText(txt[i], cx, y);
      cx += ctx.measureText(txt[i]).width;
    }
    return { x: cx, done: n >= txt.length, n: n };
  }
  function typeWidth(ctx, txt, size) { setFont(ctx, '700', size); return ctx.measureText(txt).width; }

  /* ---- iconography ---- */
  function checkPath(ctx, s) {
    ctx.beginPath();
    ctx.moveTo(-0.40 * s, 0.02 * s);
    ctx.lineTo(-0.10 * s, 0.30 * s);
    ctx.lineTo(0.42 * s, -0.28 * s);
  }
  function drawCheck(ctx, x, y, s, col, wgt, p) {
    ctx.save(); ctx.translate(x, y);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = wgt; ctx.strokeStyle = col;
    var len = 0.42 * s + 0.60 * s;
    ctx.setLineDash([len * 2, len * 2]);
    ctx.lineDashOffset = len * 2 * (1 - clamp(p));
    checkPath(ctx, s); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }
  function lockPath(ctx, s) {
    ctx.beginPath();
    rrPath(ctx, -0.42 * s, -0.06 * s, 0.84 * s, 0.60 * s, 0.16 * s);
  }
  function rrPath(ctx, x, y, w, h, r) {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }
  function drawLock(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y);
    ctx.lineWidth = s * 0.11; ctx.strokeStyle = col; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -0.10 * s, 0.24 * s, Math.PI, 0); ctx.stroke();
    ctx.fillStyle = col; lockPath(ctx, s); ctx.fill();
    ctx.restore();
  }
  function drawSpark(ctx, x, y, s, col) {
    ctx.save(); ctx.translate(x, y); ctx.fillStyle = col;
    function star(sc) {
      ctx.beginPath();
      ctx.moveTo(0, -s * sc);
      ctx.quadraticCurveTo(s * 0.13 * sc, -s * 0.13 * sc, s * sc, 0);
      ctx.quadraticCurveTo(s * 0.13 * sc, s * 0.13 * sc, 0, s * sc);
      ctx.quadraticCurveTo(-s * 0.13 * sc, s * 0.13 * sc, -s * sc, 0);
      ctx.quadraticCurveTo(-s * 0.13 * sc, -s * 0.13 * sc, 0, -s * sc);
      ctx.closePath(); ctx.fill();
    }
    star(1);
    ctx.translate(s * 0.95, -s * 0.72); star(0.34);
    ctx.restore();
  }
  function drawGlass(ctx, x, y, s, col, wgt) {           // magnifier
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = col; ctx.lineWidth = wgt; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-s * 0.10, -s * 0.10, s * 0.42, 0, 6.2832); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.20, s * 0.20); ctx.lineTo(s * 0.50, s * 0.50); ctx.stroke();
    ctx.restore();
  }

  /* A drawn question mark — the type foundry's square dot reads as a stray
     UI block at 600px. Stroked so the halo can trace the same silhouette. */
  function qPath(ctx, s, wgt) {
    ctx.lineWidth = wgt; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.54 * s, -0.60 * s);
    ctx.bezierCurveTo(-0.56 * s, -1.20 * s, 0.66 * s, -1.24 * s, 0.56 * s, -0.44 * s);
    ctx.bezierCurveTo(0.50 * s, 0.04 * s, 0.00 * s, 0.06 * s, 0.00 * s, 0.52 * s);
  }
  function drawQ(ctx, x, y, s, stroke, wgt) {
    ctx.save(); ctx.translate(x, y);
    ctx.strokeStyle = stroke;
    qPath(ctx, s, wgt); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0.94 * s, wgt * 0.52, 0, 6.2832);
    ctx.fillStyle = stroke; ctx.fill();
    ctx.restore();
  }

  /* The ZeroTaken mark: a zero that is also a check — "nothing taken". */
  function drawMark(ctx, x, y, s, c1, c2, alpha, checkP, rot) {
    if (alpha <= 0.004) return;
    ctx.save(); ctx.globalAlpha = ctx.globalAlpha * alpha; ctx.translate(x, y); if (rot) ctx.rotate(rot);
    var g = ctx.createLinearGradient(-s, -s, s * 0.6, s);
    g.addColorStop(0, c1); g.addColorStop(1, c2);
    ctx.lineWidth = s * 0.235; ctx.strokeStyle = g; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, 0, s * 0.78, -Math.PI * 0.30, Math.PI * 1.62); ctx.stroke();
    drawCheck(ctx, -s * 0.02, s * 0.02, s * 0.86, g, s * 0.235, checkP === undefined ? 1 : checkP);
    ctx.restore();
  }
  function markHalo(ctx, x, y, s, col, amt) {
    ctx.save();
    for (var i = 0; i < 4; i++) {
      var k = [3.0, 2.1, 1.5, 1.15][i], a = [0.13, 0.16, 0.19, 0.18][i] * amt;
      try { ctx.filter = 'blur(' + (12 + k * 22).toFixed(0) + 'px)'; } catch (e) { }
      ctx.save(); ctx.translate(x, y);
      ctx.lineWidth = s * 0.235 * k; ctx.strokeStyle = hexa(col, a); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, 0, s * 0.78, -Math.PI * 0.30, Math.PI * 1.62); ctx.stroke();
      ctx.restore();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();
  }

  /* Availability pill */
  function pill(ctx, x, y, label, col, sc, alpha, checkP) {
    if (alpha <= 0.004) return;
    ctx.save(); ctx.globalAlpha = ctx.globalAlpha * alpha; ctx.translate(x, y); ctx.scale(sc, sc);
    setFont(ctx, '700', 30);
    var tw = ctx.measureText(label).width, w = tw + 96, h = 58;
    ctx.save();
    try { ctx.filter = 'blur(16px)'; } catch (e) { }
    rr(ctx, -w / 2, -h / 2 + 8, w, h, h / 2); ctx.fillStyle = hexa(col, 0.34); ctx.fill();
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();
    rr(ctx, -w / 2, -h / 2, w, h, h / 2);
    ctx.fillStyle = hexa(col, 0.13); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = hexa(col, 0.42); ctx.stroke();
    drawCheck(ctx, -w / 2 + 34, 1, 30, col, 5.5, checkP === undefined ? 1 : checkP);
    ctx.fillStyle = col; ctx.textBaseline = 'middle';
    ctx.fillText(label, -w / 2 + 62, 2);
    ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }

  function shake(ctx, d, amp) {
    if (d < 0 || d > 0.30) return;
    var k = Math.exp(-d * 15) * amp;
    ctx.translate(Math.sin(d * 96) * k, Math.cos(d * 81) * k * 0.65);
  }

  function watermark(ctx, col) {
    var s = 30, track = 4.2;
    ctx.save();
    ctx.globalAlpha = 0.34;
    setFont(ctx, '700', s);
    var w = trackW(ctx, BRAND.name, track);
    ctx.fillStyle = col || P.ink;
    ctx.textBaseline = 'alphabetic';
    trackFill(ctx, BRAND.name, W - 74 - w, 128, track);
    ctx.globalAlpha = 0.55;
    drawMark(ctx, W - 74 - w - 40, 118, 22, col || P.ink, col || P.ink, 0.5, 1);
    ctx.restore();
  }

  /* ==========================================================================
     4. SCENES
     ========================================================================== */

  /* ---- 1. "Still nameless?" — LIT-FORM, cold steel ---------------------- */
  function sceneQ1(ctx, t, dur) {
    var fade = smooth(inv(t, 0, 0.30));
    paper(ctx, P.cold, 0.05 * fade);
    ctx.save(); ctx.globalAlpha = fade;

    var push = easeOut(inv(t, 0, dur * 0.92));
    var sw = swell(inv(t, 0.1, dur));
    var cy = H * 0.415, sc = lerp(0.90, 1.06, push);

    washE(ctx, W / 2, cy + 40, 640, 700, mix(P.cold, P.steel, 0.35), 0.13 + 0.07 * sw);
    washE(ctx, W * 0.24, H * 0.14, 420, 380, P.violet, 0.05);

    var qs = 300 * sc, wgt = qs * 0.30;

    // bloom takes the shape of the object: blurred copies of the same stroke
    ctx.save();
    for (var i = 0; i < 4; i++) {
      var k = [1.55, 1.34, 1.18, 1.06][i], a = [0.09, 0.12, 0.15, 0.15][i] * (0.55 + 0.55 * sw);
      try { ctx.filter = 'blur(' + [70, 46, 28, 16][i] + 'px)'; } catch (e) { }
      drawQ(ctx, W / 2, cy, qs, hexa(mix(P.cold, P.slate, 0.28), a), wgt * k);
    }
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();

    ctx.save();                                        // the glyph
    var g = ctx.createLinearGradient(W / 2 - qs * 0.7, cy - qs * 1.2, W / 2 + qs * 0.7, cy + qs);
    g.addColorStop(0, '#e2e9f4');
    g.addColorStop(0.42, P.steel);
    g.addColorStop(1, mix(P.slate, P.cold, 0.34));
    ctx.shadowColor = 'rgba(30,52,92,0.20)'; ctx.shadowBlur = 54; ctx.shadowOffsetY = 24;
    drawQ(ctx, W / 2, cy, qs, g, wgt);
    ctx.restore();

    // cursor line under the glyph — the empty field it never got filled into
    var cw = lerp(0, 380, easeOut(inv(t, 0.35, 1.5))), ly = cy + qs * 1.42;
    ctx.save();
    ctx.strokeStyle = hexa(P.slate, 0.32); ctx.lineWidth = 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(W / 2 - cw / 2, ly); ctx.lineTo(W / 2 + cw / 2, ly); ctx.stroke();
    if (t > 0.5 && Math.floor((t - 0.5) * 2.0) % 2 === 0) {
      ctx.fillStyle = hexa(P.cold, 0.8);
      ctx.fillRect(W / 2 + cw / 2 - 4, ly - 54, 7, 50);
    }
    ctx.restore();

    var p = inv(t, 0.55, 1.85);
    var hold = clamp(1 - (t - (0.55 + p * 1.30)) / 0.30);
    var msg = 'Still nameless?';
    var tw = typeWidth(ctx, msg, 104);
    typeOut(ctx, msg, (W - tw) / 2, H * 0.745, p, 104, P.ink, P.cold, hold);

    var sp = smooth(inv(t, 1.95, 2.6));
    if (sp > 0) {
      ctx.globalAlpha = fade * sp * 0.85;
      centreText(ctx, 'DAY 41 OF THE SEARCH', H * 0.798, 30, P.ink3, '700', 6);
      ctx.globalAlpha = fade;
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.10); grain(ctx);
  }

  /* ---- 2. "Every good .com gone?" — LIST-STAMP, cold to coral ----------- */
  var TAKEN = ['northwind.com', 'lumenlabs.com', 'vertexly.com', 'orbitpay.com', 'atlasflow.com'];
  function sceneQ2(ctx, t, dur) {
    var fade = 1;
    var warm = smooth(inv(t, 1.1, 2.7));
    paper(ctx, mix(P.cold, P.coral, warm), (0.045 + 0.05 * warm) * fade);
    ctx.save(); ctx.globalAlpha = fade;

    washE(ctx, W * 0.5, H * 0.56, 620, 520, mix(P.steel, P.coral, warm), 0.10 + 0.10 * warm);

    centreText(ctx, 'Every good .com', H * 0.215, 92, P.ink, '700', -0.5);
    centreText(ctx, 'already gone?', H * 0.275, 92, mix(P.ink, P.coral, warm * 0.85), '700', -0.5);

    var rowH = 132, y0 = H * 0.395;
    for (var i = 0; i < TAKEN.length; i++) {
      var ta = 0.18 + i * 0.135;
      var ap = smooth(inv(t, ta, ta + 0.42));
      if (ap <= 0) continue;
      var y = y0 + i * rowH + lerp(46, 0, easeOut(ap));
      var x = W * 0.115, w = W * 0.77, h = 104;

      ctx.save(); ctx.globalAlpha = fade * ap;
      card(ctx, x, y, w, h, 26, { halo: P.slate, haloA: 0.16, alpha: 1 });

      setFont(ctx, '700', 44);
      ctx.fillStyle = mix(P.ink, P.ink3, 0.25);
      ctx.textBaseline = 'middle';
      ctx.fillText(TAKEN[i], x + 44, y + h / 2 + 2);
      var nameW = ctx.measureText(TAKEN[i]).width;

      // TAKEN stamp — snaps in over 2 frames, flashes hot, then settles
      var sa = ta + 0.52;
      var sp = inv(t, sa, sa + 0.066);                 // 2 frames
      if (sp > 0) {
        var flash = clamp(1 - (t - (sa + 0.066)) / 0.26);
        var col = mix(P.coral, '#ffffff', flash * 0.45);
        ctx.save();
        ctx.globalAlpha = fade * ap * sp;
        // strike-through
        ctx.strokeStyle = hexa(P.coral, 0.9); ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(x + 40, y + h / 2 + 2);
        ctx.lineTo(x + 40 + nameW * sp, y + h / 2 + 2);
        ctx.stroke();
        // chip
        var cw = 168, ch = 54, cx = x + w - cw - 34, cyy = y + h / 2 - ch / 2;
        ctx.save();
        try { ctx.filter = 'blur(14px)'; } catch (e) { }
        rr(ctx, cx, cyy + 7, cw, ch, ch / 2); ctx.fillStyle = hexa(P.coral, 0.35 + 0.3 * flash); ctx.fill();
        try { ctx.filter = 'none'; } catch (e) { }
        ctx.restore();
        rr(ctx, cx, cyy, cw, ch, ch / 2);
        ctx.fillStyle = hexa(P.coral, 0.14); ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = hexa(P.coral, 0.5); ctx.stroke();
        setFont(ctx, '700', 27);
        ctx.fillStyle = col;
        var lw = trackW(ctx, 'TAKEN', 3.4);
        trackFill(ctx, 'TAKEN', cx + (cw - lw) / 2, cyy + ch / 2 + 9, 3.4);
        ctx.restore();
      }
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.10); grain(ctx);
  }

  /* ---- 3. "$2,000. Premium." — STAT-SLAM, coral/amber ------------------- */
  function sceneQ3(ctx, t, dur) {
    var fade = 1;
    var slam = 0.62;
    paper(ctx, P.coral, 0.075 * fade);
    ctx.save();
    shake(ctx, t - slam, 26);
    ctx.globalAlpha = fade;

    var sw = swell(inv(t, slam, dur));
    washE(ctx, W / 2, H * 0.47, 700, 620, P.coral, 0.10 + 0.11 * sw);
    washE(ctx, W * 0.72, H * 0.20, 420, 380, P.amber, 0.10);

    centreText(ctx, 'FOUND THE PERFECT ONE', H * 0.265, 32, P.ink3, '700', 6.6);

    // digits rolling to value
    var rp = clamp((t - 0.18) / 0.46);
    var val = Math.round(lerp(0, 2000, easeOut4(rp)));
    var txt = '$' + val.toLocaleString('en-US');
    if (rp < 1) txt = '$' + (Math.round(val / 10) * 10).toLocaleString('en-US');
    var pop = t < slam ? lerp(0.86, 1.0, easeOut(inv(t, 0.18, slam))) : 1 + 0.05 * Math.exp(-(t - slam) * 9);
    var cy = H * 0.465;

    ctx.save();
    ctx.translate(W / 2, cy); ctx.scale(pop, pop);
    setFont(ctx, '700', 250); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var i = 0; i < 4; i++) {                       // shaped halo
      var k = [1.10, 1.06, 1.03, 1.01][i], a = [0.11, 0.14, 0.17, 0.16][i] * (0.5 + 0.6 * sw);
      try { ctx.filter = 'blur(' + [64, 42, 26, 15][i] + 'px)'; } catch (e) { }
      ctx.save(); ctx.scale(k, k);
      ctx.fillStyle = hexa(P.coral, a); ctx.fillText(txt, 0, 0); ctx.restore();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    var g = ctx.createLinearGradient(-330, -120, 330, 130);
    g.addColorStop(0, P.rose); g.addColorStop(0.5, P.coral); g.addColorStop(1, P.amber);
    ctx.shadowColor = 'rgba(120,30,20,0.20)'; ctx.shadowBlur = 40; ctx.shadowOffsetY = 16;
    ctx.fillStyle = g; ctx.fillText(txt, 0, 0);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();

    var lp = smooth(inv(t, slam + 0.06, slam + 0.44));
    if (lp > 0) {
      ctx.globalAlpha = fade * lp;
      centreText(ctx, 'PREMIUM. AGAIN.', H * 0.585 + lerp(16, 0, lp), 58, mix(P.ink, P.coral, 0.25), '700', 3.0);
      ctx.globalAlpha = fade;
    }

    var bp = smooth(inv(t, 1.5, 2.15));
    if (bp > 0) {
      ctx.save(); ctx.globalAlpha = fade * bp;
      var bw = W * 0.76, bh = 122, bx = (W - bw) / 2, by = H * 0.695 + lerp(28, 0, easeOut(bp));
      card(ctx, bx, by, bw, bh, 30, { halo: P.amber, haloA: 0.22 });
      setFont(ctx, '700', 34); ctx.textBaseline = 'middle';
      ctx.fillStyle = P.ink2;
      var s1 = 'Broker markup. Aftermarket trap.';
      ctx.fillText(s1, bx + (bw - ctx.measureText(s1).width) / 2, by + bh / 2 + 2);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.11); grain(ctx);
  }

  /* ---- 4. Reveal — SHOCKWAVE + WORDMARK-SNAP, emerald ------------------- */
  function sceneReveal(ctx, t, dur) {
    var fade = 1;
    var snap = 0.62;
    // the ground itself turns over 2 frames at the snap — a hard visual cut
    var turn = inv(t, snap, snap + 0.066);
    paper(ctx, mix(P.coral, P.emerald, turn), lerp(0.05, 0.10, turn) * fade);
    ctx.save(); ctx.globalAlpha = fade;

    var sw = swell(inv(t, snap, dur));
    var cy = H * 0.415;
    if (turn < 1) washE(ctx, W / 2, cy, 480, 440, P.coral, 0.16 * (1 - turn));
    washE(ctx, W / 2, cy, lerp(300, 700, easeOut(inv(t, snap, dur))), lerp(280, 640, easeOut(inv(t, snap, dur))),
      mix(P.mint, P.emerald, 0.4), (0.06 + 0.16 * sw) * turn);

    // shockwave — constant rate, fading as it grows
    for (var r = 0; r < 2; r++) {
      var rp = inv(t, snap + r * 0.20, snap + 0.20 * r + 1.15);
      if (rp > 0 && rp < 1) {
        var rad = lerp(30, 1000, rp), th = lerp(46, 150, rp);
        ctx.save();
        ctx.globalAlpha = fade * (1 - rp) * (1 - rp) * 0.85;
        var rg = ctx.createRadialGradient(W / 2, cy, Math.max(1, rad - th), W / 2, cy, rad + th * 0.4);
        rg.addColorStop(0, hexa(P.emerald, 0));
        rg.addColorStop(0.55, hexa(P.mint, 0.55));
        rg.addColorStop(1, hexa(P.emerald, 0));
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
        ctx.restore();
      }
    }

    // mark: ember-small and warm before the snap, full and emerald after
    var pre = t < snap;
    var ms = pre ? lerp(112, 152, easeOut(inv(t, 0, snap))) * (1 + 0.045 * Math.sin(t * 15)) : 200 * (1 + 0.045 * Math.exp(-(t - snap) * 10));
    var c1 = pre ? P.coral : mix(P.mint, P.emerald, 0.15);
    var c2 = pre ? P.amber : P.deep;
    markHalo(ctx, W / 2, cy, ms, pre ? P.coral : P.emerald, pre ? (0.75 + 0.45 * Math.sin(t * 13)) : (0.55 + 0.65 * sw));
    drawMark(ctx, W / 2, cy, ms, c1, c2, 1, pre ? 0 : smooth(inv(t, snap + 0.05, snap + 0.38)));

    // wordmark tracks out beneath
    var wp = smooth(inv(t, snap + 0.10, snap + 0.80));
    if (wp > 0) {
      ctx.save(); ctx.globalAlpha = fade * wp;
      var track = lerp(30, 12, easeOut(wp));
      setFont(ctx, '700', 86);
      var w = trackW(ctx, BRAND.name, track);
      var grd = ctx.createLinearGradient((W - w) / 2, 0, (W + w) / 2, 0);
      grd.addColorStop(0, P.ink); grd.addColorStop(0.55, P.ink); grd.addColorStop(1, mix(P.ink, P.deep, 0.55));
      ctx.fillStyle = grd;
      trackFill(ctx, BRAND.name, (W - w) / 2, cy + 400, track);
      ctx.restore();
    }
    var sp = smooth(inv(t, snap + 0.55, snap + 1.15));
    if (sp > 0) {
      ctx.globalAlpha = fade * sp;
      scrim(ctx, cy + 486, 150, 0.34);
      centreText(ctx, 'THERE IS A FASTER WAY', cy + 496, 32, mix(P.ink2, P.deep, 0.4), '700', 6.4);
      ctx.globalAlpha = fade;
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.10); grain(ctx);
  }

  /* ---- 5. QUERY-PILL — "Just describe it." ------------------------------ */
  var QUERIES = ['eco coffee subscription', 'AI agent for invoices'];
  function scenePill(ctx, t, dur) {
    var fade = 1;
    paper(ctx, P.violet, 0.045 * fade);
    ctx.save(); ctx.globalAlpha = fade;

    var sw = swell(inv(t, 0, dur));
    washE(ctx, W * 0.30, H * 0.30, 480, 440, P.violet, 0.09 + 0.04 * sw);
    washE(ctx, W * 0.74, H * 0.56, 500, 460, P.emerald, 0.09 + 0.05 * sw);

    centreText(ctx, 'Just describe it.', H * 0.285, 96, P.ink, '700', -0.5);

    var pw = W * 0.82, ph = 176, px = (W - pw) / 2, py = H * 0.465;
    var ep = easeOut(inv(t, 0.06, 0.70));
    ctx.save();
    ctx.translate(W / 2, py + ph / 2); ctx.scale(lerp(0.92, 1, ep), lerp(0.92, 1, ep)); ctx.translate(-W / 2, -(py + ph / 2));
    ctx.globalAlpha = fade * ep;

    // rotating multi-stop rim
    var ang = t * 0.85;
    ctx.save();
    try { ctx.filter = 'blur(26px)'; } catch (e) { }
    rr(ctx, px - 6, py + 10, pw + 12, ph, ph / 2);
    var hg = ctx.createLinearGradient(px + Math.cos(ang) * pw * 0.5, py, px + pw - Math.cos(ang) * pw * 0.5, py + ph);
    hg.addColorStop(0, hexa(P.violet, 0.45));
    hg.addColorStop(0.5, hexa(P.emerald, 0.42));
    hg.addColorStop(1, hexa(P.sky, 0.42));
    ctx.fillStyle = hg; ctx.fill();
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();

    rr(ctx, px, py, pw, ph, ph / 2);
    ctx.shadowColor = 'rgba(20,30,55,0.14)'; ctx.shadowBlur = 44; ctx.shadowOffsetY = 18;
    var bg = ctx.createLinearGradient(px, py, px + pw * 0.3, py + ph);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#f4f7fc');
    ctx.fillStyle = bg; ctx.fill();
    ctx.shadowColor = 'transparent';

    rr(ctx, px + 1.5, py + 1.5, pw - 3, ph - 3, ph / 2);
    var rimg = ctx.createLinearGradient(px + Math.cos(ang) * pw, py, px + pw - Math.cos(ang) * pw, py + ph);
    rimg.addColorStop(0, hexa(P.violet, 0.85));
    rimg.addColorStop(0.45, hexa(P.emerald, 0.8));
    rimg.addColorStop(1, hexa(P.sky, 0.85));
    ctx.lineWidth = 3; ctx.strokeStyle = rimg; ctx.stroke();

    // carousel: line 0 flies up and shrinks, line 1 rises from below
    var swapAt = 1.90;
    for (var i = 0; i < 2; i++) {
      var local, off = 0, al = 1, scl = 1;
      if (i === 0) {
        var up = smooth(inv(t, swapAt, swapAt + 0.30));
        if (up >= 1) continue;
        off = -up * 96; al = 1 - up; scl = 1 - up * 0.22;
        local = inv(t, 0.55, 1.70);
      } else {
        var dn = smooth(inv(t, swapAt + 0.06, swapAt + 0.36));
        if (dn <= 0) continue;
        off = (1 - dn) * 96; al = dn; scl = 0.80 + dn * 0.20;
        local = inv(t, swapAt + 0.30, swapAt + 1.35);
      }
      var msg = QUERIES[i];
      ctx.save();
      ctx.globalAlpha = fade * ep * al;
      ctx.translate(px + 76, py + ph / 2 + off);
      ctx.scale(scl, scl);
      ctx.textBaseline = 'middle';
      var hold = i === 0
        ? clamp(1 - (t - (0.55 + local * 1.15)) / 0.28)
        : clamp(1 - (t - (swapAt + 0.30 + local * 1.05)) / 0.28);
      var r2 = typeOut(ctx, msg, 0, 2, local, 46, P.ink, i === 0 ? P.emerald : P.violet, hold);
      if (local < 1 && Math.floor(t * 6) % 2 === 0) {
        ctx.fillStyle = hexa(i === 0 ? P.emerald : P.violet, 0.85);
        ctx.fillRect(r2.x + 6, -22, 5, 48);
      }
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    var spark = 0.5 + 0.5 * Math.sin(t * 3.2);
    drawSpark(ctx, px + pw - 74, py + ph / 2 - 4, 21 + spark * 3, mix(P.violet, P.emerald, spark));
    ctx.restore();

    var hp = smooth(inv(t, 2.7, 3.2));
    if (hp > 0) {
      ctx.globalAlpha = fade * hp;
      centreText(ctx, 'PLAIN WORDS IN. BRAND NAMES OUT.', H * 0.665, 30, P.ink3, '700', 5.2);
      ctx.globalAlpha = fade;
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.09); grain(ctx);
  }

  /* ---- 6. Names rise, availability checks pop --------------------------- */
  var FREE = ['brewroots.com', 'leafbloom.co', 'greenmug.io'];
  function sceneNames(ctx, t, dur) {
    var fade = 1;
    paper(ctx, P.emerald, 0.055 * fade);
    ctx.save(); ctx.globalAlpha = fade;

    var sw = swell(inv(t, 0, dur));
    washE(ctx, W * 0.5, H * 0.50, 620, 560, P.emerald, 0.09 + 0.07 * sw);
    washE(ctx, W * 0.22, H * 0.20, 380, 340, P.sky, 0.06);

    centreText(ctx, 'Checked live.', H * 0.215, 96, P.ink, '700', -0.5);
    centreText(ctx, 'Actually available.', H * 0.278, 96, mix(P.ink, P.deep, 0.55), '700', -0.5);

    var rowH = 168, y0 = H * 0.395 - inv(t, 0.6, dur) * 26;
    for (var i = 0; i < FREE.length; i++) {
      var ta = 0.22 + i * 0.30;
      var ap = smooth(inv(t, ta, ta + 0.44));
      if (ap <= 0) continue;
      var y = y0 + i * rowH + lerp(70, 0, easeOut(ap));
      var x = W * 0.10, w = W * 0.80, h = 132;
      ctx.save(); ctx.globalAlpha = fade * ap;
      ctx.translate(W / 2, y + h / 2); ctx.scale(lerp(0.94, 1, easeOut(ap)), lerp(0.94, 1, easeOut(ap)));
      ctx.translate(-W / 2, -(y + h / 2));
      card(ctx, x, y, w, h, 32, { halo: P.emerald, haloA: 0.26 + 0.10 * sw, tint: P.emerald });

      setFont(ctx, '700', 50); ctx.textBaseline = 'middle';
      ctx.fillStyle = P.ink;
      ctx.fillText(FREE[i], x + 46, y + h / 2 + 1);

      var sweep = inv(t, ta + 0.70, ta + 2.05);       // specular travelling across
      if (sweep > 0 && sweep < 1) {
        ctx.save();
        rr(ctx, x, y, w, h, 32); ctx.clip();
        var sx = lerp(x - w * 0.35, x + w * 1.05, sweep);
        var sg = ctx.createLinearGradient(sx - w * 0.30, y, sx + w * 0.30, y + h);
        sg.addColorStop(0, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, hexa(P.mint, 0.30 * Math.sin(sweep * Math.PI)));
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillRect(x, y, w, h);
        ctx.restore();
      }
      var cp = inv(t, ta + 0.40, ta + 0.62);
      var flash = clamp(1 - (t - (ta + 0.62)) / 0.30);
      var psc = cp < 1 ? lerp(0.72, 1.0, easeBack(cp)) : 1;
      ctx.save();
      ctx.globalAlpha = fade * ap * clamp(cp * 2);
      pill(ctx, x + w - 150, y + h / 2, 'Available', mix(P.emerald, P.mint, flash * 0.5), psc, 1, cp);
      ctx.restore();
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    var hp = smooth(inv(t, 1.9, 2.5));
    if (hp > 0) {
      ctx.globalAlpha = fade * hp;
      centreText(ctx, 'REGISTRY-VERIFIED. NO BROKER TRAPS.', H * 0.795, 30, P.ink3, '700', 5.0);
      ctx.globalAlpha = fade;
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.09); grain(ctx);
  }

  /* ---- 7. SLAB-RING of extensions --------------------------------------- */
  var TLDS = [
    { l: '.com', c1: '#3fe9ad', c2: '#10b981' },
    { l: '.io', c1: '#7ad3ff', c2: '#12aef0' },
    { l: '.ai', c1: '#a89bff', c2: '#6d5bff' },
    { l: '.app', c1: '#ffd478', c2: '#f59e0b' },
    { l: '.dev', c1: '#8fb8ff', c2: '#2f6bff' },
    { l: '.so', c1: '#5eeac4', c2: '#047857' },
    { l: '.new', c1: '#ff9db1', c2: '#ff2f6e' },
    { l: '.pro', c1: '#9be7ff', c2: '#0ea5e9' }
  ];
  function sceneTLD(ctx, t, dur) {
    var fade = 1;
    paper(ctx, P.sky, 0.05 * fade);
    ctx.save(); ctx.globalAlpha = fade;
    var sw = swell(inv(t, 0, dur));
    washE(ctx, W / 2, H * 0.47, 640, 600, mix(P.sky, P.violet, 0.35), 0.07 + 0.06 * sw);

    var p = inv(t, 0.05, dur * 0.92);
    var e = easeOut(p);
    var rad = lerp(168, 430, e), spin = p * 0.16;

    for (var i = 0; i < TLDS.length; i++) {
      var ang = (i / TLDS.length + spin) * 6.2832 - Math.PI / 2;
      var x = W / 2 + Math.cos(ang) * rad * 1.02;
      var y = H * 0.47 + Math.sin(ang) * rad * 1.30;
      var s = lerp(126, 200, e);
      var a = 1;                                   // cut hard: tiles land, not fade
      var o = TLDS[i];
      ctx.save(); ctx.globalAlpha = fade * a;
      ctx.translate(x, y); ctx.rotate(Math.sin(ang) * 0.08); ctx.translate(-x, -y);
      card(ctx, x - s / 2, y - s / 2, s, s, s * 0.30, { halo: o.c2, haloA: 0.34 + 0.14 * sw, tint: o.c2 });
      setFont(ctx, '700', s * 0.31);
      ctx.textBaseline = 'middle';
      var g = ctx.createLinearGradient(x - s / 2, y - s / 2, x + s / 2, y + s / 2);
      g.addColorStop(0, o.c1); g.addColorStop(1, o.c2);
      ctx.fillStyle = g;
      ctx.fillText(o.l, x - ctx.measureText(o.l).width / 2, y + 2);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    // copy held at centre, on a scrim so it survives the ring passing behind
    var cp = smooth(inv(t, 0, 0.26));
    if (cp > 0) {
      ctx.globalAlpha = fade * cp;
      scrim(ctx, H * 0.455, 320, 0.62);
      centreText(ctx, '100+', H * 0.445, 150, mix(P.ink, P.indigo, 0.30), '700', -1);
      centreText(ctx, 'EXTENSIONS. ONE SEARCH.', H * 0.505, 33, P.ink2, '700', 5.0);
      ctx.globalAlpha = fade;
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.09); grain(ctx);
  }

  /* ---- 8. Quality score gauge ------------------------------------------- */
  function sceneScore(ctx, t, dur) {
    var fade = 1;
    paper(ctx, P.amber, 0.05 * fade);
    ctx.save(); ctx.globalAlpha = fade;
    var sw = swell(inv(t, 0, dur));
    var cy = H * 0.45;
    washE(ctx, W / 2, cy, 560, 520, mix(P.gold, P.emerald, 0.35), 0.09 + 0.07 * sw);

    var gp = easeOut4(inv(t, 0.14, 1.30));
    var val = Math.round(92 * gp);
    var R = 300, a0 = Math.PI * 0.78, a1 = Math.PI * 2.22;

    ctx.save(); ctx.lineCap = 'round';
    ctx.lineWidth = 30; ctx.strokeStyle = hexa(P.ink3, 0.22);
    ctx.beginPath(); ctx.arc(W / 2, cy, R, a0, a1); ctx.stroke();

    var end = a0 + (a1 - a0) * gp * 0.92;
    ctx.save();                                     // gauge halo
    for (var i = 0; i < 3; i++) {
      try { ctx.filter = 'blur(' + [44, 26, 14][i] + 'px)'; } catch (e) { }
      ctx.lineWidth = 30 * [2.0, 1.5, 1.15][i];
      ctx.strokeStyle = hexa(P.emerald, [0.13, 0.16, 0.18][i] * (0.6 + 0.6 * sw));
      ctx.beginPath(); ctx.arc(W / 2, cy, R, a0, end); ctx.stroke();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();

    var ag = ctx.createLinearGradient(W / 2 - R, cy - R, W / 2 + R, cy + R);
    ag.addColorStop(0, P.gold); ag.addColorStop(0.45, P.mint); ag.addColorStop(1, P.emerald);
    ctx.lineWidth = 30; ctx.strokeStyle = ag;
    ctx.beginPath(); ctx.arc(W / 2, cy, R, a0, end); ctx.stroke();
    // leading dot
    ctx.fillStyle = '#fff';
    ctx.shadowColor = hexa(P.emerald, 0.9); ctx.shadowBlur = 30;
    ctx.beginPath(); ctx.arc(W / 2 + Math.cos(end) * R, cy + Math.sin(end) * R, 15, 0, 6.2832); ctx.fill();
    ctx.restore();

    var pop = gp < 1 ? 1 : 1 + 0.035 * Math.exp(-(t - 1.30) * 8);
    ctx.save();
    ctx.translate(W / 2, cy); ctx.scale(pop, pop);
    setFont(ctx, '700', 230); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (var j = 0; j < 3; j++) {
      try { ctx.filter = 'blur(' + [50, 30, 16][j] + 'px)'; } catch (e) { }
      ctx.save(); ctx.scale([1.08, 1.04, 1.01][j], [1.08, 1.04, 1.01][j]);
      ctx.fillStyle = hexa(P.emerald, [0.12, 0.15, 0.16][j] * (0.6 + 0.6 * sw));
      ctx.fillText(String(val), 0, 0); ctx.restore();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    var ng = ctx.createLinearGradient(-160, -110, 160, 110);
    ng.addColorStop(0, P.ink); ng.addColorStop(1, mix(P.ink, P.deep, 0.7));
    ctx.fillStyle = ng; ctx.fillText(String(val), 0, 0);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();

    var lp = smooth(inv(t, 1.34, 1.72));
    if (lp > 0) {
      ctx.globalAlpha = fade * lp;
      centreText(ctx, 'EXCELLENT', cy + 128, 38, mix(P.ink2, P.deep, 0.5), '700', 7.5);
      ctx.globalAlpha = fade;
    }
    centreText(ctx, 'Every name, scored.', H * 0.755, 84, P.ink, '700', -0.5);
    var sp2 = smooth(inv(t, 1.75, 2.25));
    if (sp2 > 0) {
      ctx.globalAlpha = fade * sp2;
      centreText(ctx, 'LENGTH · SOUND · MEMORABILITY', H * 0.80, 29, P.ink3, '700', 5.0);
      ctx.globalAlpha = fade;
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.09); grain(ctx);
  }

  /* ---- 9. Social handles + privacy -------------------------------------- */
  var SOCIAL = ['YouTube', 'Instagram', 'TikTok', 'Facebook', 'Pinterest'];
  function sceneSocial(ctx, t, dur) {
    var fade = 1;
    paper(ctx, P.violet, 0.05 * fade);
    ctx.save(); ctx.globalAlpha = fade;
    var sw = swell(inv(t, 0, dur));
    washE(ctx, W * 0.5, H * 0.46, 600, 560, mix(P.violet, P.emerald, 0.45), 0.08 + 0.06 * sw);

    centreText(ctx, 'The handles too.', H * 0.205, 92, P.ink, '700', -0.5);

    var pw = W * 0.80, ph = 700, px = (W - pw) / 2, py = H * 0.265;
    var ep = easeOut(inv(t, 0.04, 0.55));
    ctx.save();
    ctx.globalAlpha = fade * ep;
    ctx.translate(W / 2, py + ph / 2); ctx.scale(lerp(0.94, 1, ep), lerp(0.94, 1, ep)); ctx.translate(-W / 2, -(py + ph / 2));
    card(ctx, px, py, pw, ph, 44, { halo: P.violet, haloA: 0.26 + 0.08 * sw, tint: P.violet });

    for (var i = 0; i < SOCIAL.length; i++) {
      var ry = py + 92 + i * 118;
      var ta = 0.42 + i * 0.135;
      var ap = smooth(inv(t, ta, ta + 0.26));
      ctx.save(); ctx.globalAlpha = fade * ep;
      setFont(ctx, '700', 42); ctx.textBaseline = 'middle';
      ctx.fillStyle = mix(P.ink, P.ink3, 1 - ap * 0.8);
      ctx.fillText(SOCIAL[i], px + 54, ry);
      ctx.strokeStyle = hexa(P.ink3, 0.20); ctx.lineWidth = 1.5;
      if (i < SOCIAL.length - 1) {
        ctx.beginPath(); ctx.moveTo(px + 44, ry + 59); ctx.lineTo(px + pw - 44, ry + 59); ctx.stroke();
      }
      if (ap > 0) {
        var flash = clamp(1 - (t - (ta + 0.26)) / 0.28);
        ctx.globalAlpha = fade * ep * ap;
        pill(ctx, px + pw - 150, ry, 'Free', mix(P.emerald, P.mint, flash * 0.55),
          lerp(0.78, 1, easeBack(clamp(ap))), 1, inv(t, ta + 0.06, ta + 0.28));
      }
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
    ctx.restore();

    var lp = smooth(inv(t, 1.55, 2.05));
    if (lp > 0) {
      ctx.save(); ctx.globalAlpha = fade * lp;
      var ly = H * 0.855;
      washE(ctx, W / 2, ly, 300, 150, P.emerald, 0.14);
      drawLock(ctx, W / 2 - 178, ly - 4, 46, mix(P.ink, P.deep, 0.45));
      setFont(ctx, '700', 46); ctx.textBaseline = 'middle';
      ctx.fillStyle = P.ink;
      ctx.fillText('100% private search', W / 2 - 132, ly);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.09); grain(ctx);
  }

  /* ---- 10. Close — HERO-PEEL + SYMBOL-MORPH ----------------------------- */
  function sceneClose(ctx, t, dur) {
    var fade = 1;
    var out = 1;
    // colour runs emerald -> mint -> gold -> emerald across the beat
    var hue = clamp(t / (dur * 0.86));
    var col = hue < 0.42 ? mix(P.emerald, P.mint, hue / 0.42)
      : hue < 0.72 ? mix(P.mint, P.gold, (hue - 0.42) / 0.30)
        : mix(P.gold, P.emerald, (hue - 0.72) / 0.28);
    paper(ctx, col, 0.06 * fade);
    ctx.save(); ctx.globalAlpha = fade * out;

    var sw = swell(inv(t, 0, dur * 0.9));
    var cy = H * 0.40;
    washE(ctx, W / 2, cy, lerp(360, 660, easeOut(inv(t, 0, dur * 0.8))),
      lerp(340, 620, easeOut(inv(t, 0, dur * 0.8))), col, 0.10 + 0.10 * sw);

    // the tile from the previous beat drifts in, swells, and its contents morph
    var dp = easeOut(inv(t, 0, 1.05));
    var s = lerp(178, 300, dp);
    var boxA = 1 - smooth(inv(t, 1.15, 1.65));            // container dissolves,
    var morph = smooth(inv(t, 0.62, 1.05));               // contents stay lit
    var y = lerp(H * 0.50, cy, dp);

    if (boxA > 0.004) {
      ctx.save(); ctx.globalAlpha = fade * out * boxA;
      card(ctx, W / 2 - s / 2, y - s / 2, s, s, s * 0.30, { halo: col, haloA: 0.34, tint: col });
      ctx.restore();
    }
    if (morph < 1) {
      ctx.save(); ctx.globalAlpha = fade * out * (1 - morph);
      setFont(ctx, '700', s * 0.28); ctx.textBaseline = 'middle';
      var g = ctx.createLinearGradient(W / 2 - s / 2, y - s / 2, W / 2 + s / 2, y + s / 2);
      g.addColorStop(0, P.mint); g.addColorStop(1, P.emerald);
      ctx.fillStyle = g;
      ctx.fillText('.com', W / 2 - ctx.measureText('.com').width / 2, y);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }
    if (morph > 0) {
      var ms = lerp(60, 168, easeOut(morph)) * (1 + 0.04 * Math.exp(-Math.max(0, t - 1.05) * 8));
      markHalo(ctx, W / 2, y, ms, col, morph * (0.6 + 0.7 * sw));
      drawMark(ctx, W / 2, y, ms, mix(P.mint, col, 0.3), mix(P.deep, col, 0.35), morph, smooth(inv(t, 0.80, 1.25)));
    }

    // wordmark SNAPS in — 2 frames, no interpolation
    var snap = 1.45;
    var wp = t >= snap ? 1 : 0;
    if (wp) {
      var kick = 1 + 0.05 * Math.exp(-(t - snap) * 11);
      ctx.save();
      ctx.globalAlpha = fade * out;
      ctx.translate(W / 2, 0); ctx.scale(kick, 1); ctx.translate(-W / 2, 0);
      setFont(ctx, '700', 92);
      var track = 14;
      var w = trackW(ctx, BRAND.name, track);
      var grd = ctx.createLinearGradient((W - w) / 2, 0, (W + w) / 2, 0);
      grd.addColorStop(0, P.ink); grd.addColorStop(0.6, P.ink); grd.addColorStop(1, mix(P.ink, P.deep, 0.6));
      ctx.fillStyle = grd;
      trackFill(ctx, BRAND.name, (W - w) / 2, cy + 400, track);
      ctx.restore();
    }

    var up = smooth(inv(t, 1.72, 2.20));
    if (up > 0) {
      ctx.save(); ctx.globalAlpha = fade * out * up;
      var uy = cy + 500;
      var uw = 470, ux = (W - uw) / 2, uh = 96;
      card(ctx, ux, uy - uh / 2, uw, uh, uh / 2, { halo: col, haloA: 0.32, tint: col });
      setFont(ctx, '700', 46); ctx.textBaseline = 'middle';
      ctx.fillStyle = mix(P.ink, P.deep, 0.35);
      ctx.fillText(BRAND.site, W / 2 - ctx.measureText(BRAND.site).width / 2, uy + 1);
      ctx.textBaseline = 'alphabetic';
      ctx.restore();
    }

    var pp = smooth(inv(t, 2.35, 2.85));
    if (pp > 0) {
      ctx.globalAlpha = fade * out * pp;
      centreText(ctx, 'A $30K DOMAIN. FOUND FOR $12.', cy + 640, 30, P.ink3, '700', 4.6);
      ctx.globalAlpha = fade * out;
    }
    ctx.restore();
    watermark(ctx);
    vignette(ctx, 0.09); grain(ctx);
  }

  /* ==========================================================================
     5. FRAME DISPATCH
     ========================================================================== */
  function drawFrame(ctx, t) {
    t = Math.max(0, Math.min(DUR - 1e-6, t));
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = P.paper; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

    var start = 0;
    for (var i = 0; i < TIMELINE.length; i++) {
      var sc = TIMELINE[i];
      if (t < sc.end || i === TIMELINE.length - 1) {
        // Every beat carries a slow camera move — alternating push-in and
        // pull-back, LINEAR so it never stalls. Light that stops moving reads
        // as a frozen frame even when the content is still animating.
        var len = sc.end - start, p = clamp((t - start) / len);
        var inward = i % 2 === 0;
        var k = inward ? lerp(1.000, 1.038, p) : lerp(1.038, 1.000, p);
        var dy = inward ? lerp(7, -7, p) : lerp(-7, 7, p);
        ctx.save();
        ctx.translate(W / 2, H / 2 + dy); ctx.scale(k, k); ctx.translate(-W / 2, -H / 2);
        sc.fn(ctx, t - start, len);
        ctx.restore();
        return;
      }
      start = sc.end;
    }
  }

  return { drawFrame: drawFrame, W: W, H: H, FPS: FPS, DUR: DUR, BRAND: BRAND, TIMELINE: TIMELINE };
});
