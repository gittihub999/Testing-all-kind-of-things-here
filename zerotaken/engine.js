/* ============================================================================
   ZEROTAKEN — motion promo engine
   ----------------------------------------------------------------------------
   drawFrame(ctx, tSeconds) is pure and seekable, so the same file drives the
   HTML player and the MP4 render.

   0.00–4.30   LIT-FORM     slashed-zero glyph on a mint canopy   "Every name is taken"
   4.30–8.10   SHOCKWAVE    + WORDMARK-SNAP + check LINE-DRAW
   8.10–12.70  QUERY-PILL   three prompts typed
   12.70–17.30 SLAB-RING    8 TLD tiles expanding                 "Checked live"
   17.30–21.00 STAT-SLAM    gauge draws to 92                     "brand quality score"
   21.00–24.70 CARD-SWEEP   warm panel                            "$30K name for $12"
   24.70–28.40 HERO-PEEL    tile -> check -> lockup               "zerotaken.com"
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PROMO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ==========================================================================
     1. CONFIG
     ========================================================================== */
  var W = 1920, H = 1080, FPS = 30;
  var TAU = Math.PI * 2;

  var BRAND = {
    name: 'ZeroTaken',
    font: '"Liberation Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    ink: '#ffffff',
    accent: '#ef7908',        // ZeroTaken orange — the hero slot
    green: '#3fa020',         // ZeroTaken green
    hot: '#35ffa8'            // the "just happened" highlight
  };

  // neon spectrum, cool -> violet -> warm across the film
  var C = {
    mint: '#35ffa8', green: '#5df08a', cyan: '#4ec8ff',
    blue: '#2f8bff', deep: '#1f4cff',
    violet: '#7a2bff', indigo: '#6b5bff',
    magenta: '#ff4ccf', pink: '#ff2f7a',
    orange: '#ef7908', ember: '#ff5c2b', gold: '#ffd08a',
    ink: '#ffffff'
  };

  var TIMELINE = [
    { name: 'hook', end: 4.30, fn: sceneHook },
    { name: 'brand', end: 8.10, fn: sceneBrand },
    { name: 'prompt', end: 12.70, fn: scenePrompt },
    { name: 'tlds', end: 17.30, fn: sceneTLDs },
    { name: 'score', end: 21.00, fn: sceneScore },
    { name: 'proof', end: 24.70, fn: sceneProof },
    { name: 'close', end: 28.40, fn: sceneClose }
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
  function easeIn(t) { return t * t * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function easeBack(t) { var c = 1.3; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }

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
  /* run a colour through a progression — light never holds one hue for long */
  function ramp(stops, p) {
    p = clamp(p) * (stops.length - 1);
    var i = Math.min(stops.length - 2, Math.floor(p));
    return mix(stops[i], stops[i + 1], p - i);
  }
  function rng(seed) { var s = seed; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

  /* ==========================================================================
     3. PRIMITIVES
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

  function glow(ctx, x, y, r, color, a, add) {
    if (r <= 0 || a <= 0) return;
    ctx.save();
    if (add !== false) ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexa(color, a));
    g.addColorStop(0.30, hexa(color, a * 0.55));
    g.addColorStop(0.62, hexa(color, a * 0.18));
    g.addColorStop(1, hexa(color, 0));
    ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }
  function glowE(ctx, x, y, rx, ry, color, a, add) {
    if (rx <= 0 || ry <= 0 || a <= 0) return;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    glow(ctx, x, y, rx, color, a, add);
    ctx.restore();
  }
  /* dark radial so type never lands on a bright field */
  function scrim(ctx, x, y, rx, ry, a) {
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    var g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, 'rgba(0,0,0,' + a + ')');
    g.addColorStop(0.55, 'rgba(0,0,0,' + a * 0.72 + ')');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }

  /* bloom takes the SHAPE of the object: blurred, growing copies of its own
     silhouette. A soft oval behind a shape is the cheap-render tell. */
  function shapeBloom(ctx, path, color, amount, layers) {
    if (amount <= 0.002) return;
    layers = layers || [[4.2, 0.26], [3.1, 0.34], [2.2, 0.40], [1.5, 0.44], [1.15, 0.40]];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < layers.length; i++) {
      var k = layers[i][0], a = layers[i][1] * amount;
      try { ctx.filter = 'blur(' + (12 + k * 20).toFixed(0) + 'px)'; } catch (e) { }
      path(k);
      ctx.fillStyle = hexa(color, Math.min(1, a)); ctx.fill();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();
  }
  /* same idea for stroked forms — the silhouette grows with the line width */
  function strokeBloom(ctx, path, baseW, color, amount) {
    if (amount <= 0.002) return;
    var layers = [[3.4, 0.24], [2.5, 0.30], [1.8, 0.36], [1.35, 0.42], [1.08, 0.40]];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < layers.length; i++) {
      var k = layers[i][0], a = layers[i][1] * amount;
      try { ctx.filter = 'blur(' + (10 + k * 18).toFixed(0) + 'px)'; } catch (e) { }
      ctx.lineWidth = baseW * k;
      ctx.strokeStyle = hexa(color, Math.min(1, a));
      path(); ctx.stroke();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();
  }

  /* light breathes across a beat — constant glow reads dead */
  function swell(p) {
    var big = Math.sin(clamp(p) * Math.PI);
    var small = 0.5 - 0.5 * Math.cos(clamp(p) * Math.PI * 3.1);
    return 0.34 + 0.50 * big + 0.18 * small * big;
  }

  function setFont(ctx, weight, size) { ctx.font = weight + ' ' + size + 'px ' + BRAND.font; }
  function trackW(ctx, txt, sp) {
    var w = 0; for (var i = 0; i < txt.length; i++) w += ctx.measureText(txt[i]).width + sp;
    return txt.length ? w - sp : 0;
  }
  function trackFill(ctx, txt, x, y, sp) {
    var c = x; for (var i = 0; i < txt.length; i++) { ctx.fillText(txt[i], c, y); c += ctx.measureText(txt[i]).width + sp; }
    return c;
  }
  function fitSize(ctx, txt, maxW, size, sp) {
    setFont(ctx, '700', size);
    var w = trackW(ctx, txt, sp || 0);
    return w > maxW ? size * maxW / w : size;
  }
  function centred(ctx, txt, y, size, col, sp, weight) {
    setFont(ctx, weight || '700', size);
    var w = trackW(ctx, txt, sp || 0);
    ctx.fillStyle = col;
    trackFill(ctx, txt, (W - w) / 2, y, sp || 0);
    return w;
  }

  /* typing, with the last character flashing the accent and cooling to ink */
  function typeOut(ctx, txt, x, y, p, size, ink, hot, hotHold) {
    setFont(ctx, '700', size);
    var n = Math.min(txt.length, Math.floor(clamp(p) * (txt.length + 0.6)));
    var cx = x;
    for (var i = 0; i < n; i++) {
      var recent = i >= n - 2 ? (i === n - 1 ? 1 : 0.65) : 0;
      ctx.fillStyle = recent > 0 && hotHold > 0 ? mix(ink, hot, hotHold * recent) : ink;
      ctx.fillText(txt[i], cx, y);
      cx += ctx.measureText(txt[i]).width;
    }
    return { x: cx, done: n >= txt.length, n: n };
  }
  /* a blinking caret that sits after the typed text */
  function caret(ctx, x, y, size, t, a, col) {
    var b = (t % 0.9) < 0.52 ? 1 : 0.12;
    ctx.save(); ctx.globalAlpha = ctx.globalAlpha * a * b;
    ctx.fillStyle = col; ctx.shadowColor = hexa(col, 0.9); ctx.shadowBlur = size * 0.5;
    ctx.fillRect(x + size * 0.10, y - size * 0.76, size * 0.075, size * 0.86);
    ctx.restore();
  }

  /* glass icon tile: near-black body, halo hugging the silhouette, lit
     top-left edge, bright symbol. bodyA dissolves the container and leaves
     the contents lit. */
  function slab(ctx, o) {
    var s = o.size, h = s / 2, r = s * 0.325, a = o.alpha === undefined ? 1 : o.alpha;
    var bodyA = o.bodyA === undefined ? 1 : o.bodyA;
    if (a <= 0.004) return;
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(o.x, o.y);
    if (o.rot) ctx.rotate(o.rot);
    var g = ctx.createLinearGradient(-h * 0.8, -h, h * 0.8, h);
    g.addColorStop(0, o.c1); g.addColorStop(1, o.c2);

    if (bodyA > 0.004) {
      ctx.save();                                          // halo
      ctx.globalAlpha = a * bodyA;
      ctx.globalCompositeOperation = 'lighter';
      try { ctx.filter = 'blur(' + (s * 0.185).toFixed(1) + 'px)'; } catch (e) { }
      rr(ctx, -h * 1.05, -h * 1.02, s * 1.10, s * 1.10, r * 1.08);
      var hg = ctx.createLinearGradient(-h, -h, h, h);
      hg.addColorStop(0, hexa(o.halo || o.c2, 0.85));
      hg.addColorStop(0.5, hexa(o.c2, 1));
      hg.addColorStop(1, hexa(o.halo || o.c2, 0.90));
      ctx.fillStyle = hg; ctx.fill();
      try { ctx.filter = 'none'; } catch (e) { }
      ctx.restore();

      ctx.save();                                          // contact shadow
      ctx.globalAlpha = a * bodyA;
      rr(ctx, -h, -h + s * 0.05, s, s, r);
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = s * 0.24; ctx.shadowOffsetY = s * 0.09;
      ctx.fillStyle = '#000'; ctx.fill();
      ctx.restore();

      ctx.save();                                          // glass body
      ctx.globalAlpha = a * bodyA;
      rr(ctx, -h, -h, s, s, r);
      var bg = ctx.createLinearGradient(-h, -h, h * 0.5, h);
      bg.addColorStop(0, '#181822'); bg.addColorStop(0.42, '#0a0a12'); bg.addColorStop(1, '#020206');
      ctx.fillStyle = bg; ctx.fill();
      ctx.restore();

      ctx.save();                                          // lit edge
      ctx.globalAlpha = a * bodyA;
      rr(ctx, -h, -h, s, s, r); ctx.clip();
      var eg = ctx.createLinearGradient(-h, -h, h * 0.6, h * 0.9);
      eg.addColorStop(0, hexa(o.c1, 0.75));
      eg.addColorStop(0.30, 'rgba(255,255,255,0.16)');
      eg.addColorStop(0.72, 'rgba(255,255,255,0.03)');
      eg.addColorStop(1, hexa(o.c2, 0.28));
      rr(ctx, -h + s * 0.018, -h + s * 0.018, s - s * 0.036, s - s * 0.036, r * 0.94);
      ctx.lineWidth = s * 0.036; ctx.strokeStyle = eg; ctx.stroke();
      ctx.restore();
    }

    ctx.save();                                            // symbol
    ctx.shadowColor = hexa(o.glowCol || o.c1, 0.95);
    ctx.shadowBlur = s * (o.glowCol ? 0.40 : 0.30);
    var fill = o.symbolCol || g;
    if (o.symbol2 && o.morph > 0.001) {
      if (o.morph < 0.999) {
        ctx.save(); ctx.globalAlpha = 1 - o.morph;
        ctx.scale(1 - o.morph * 0.35, 1 - o.morph * 0.35);
        o.symbol(ctx, s * 0.84, fill); ctx.restore();
      }
      ctx.save(); ctx.globalAlpha = o.morph;
      ctx.scale(0.68 + o.morph * 0.32, 0.68 + o.morph * 0.32);
      o.symbol2(ctx, s * 0.84, fill); ctx.restore();
    } else {
      o.symbol(ctx, s * 0.84, fill);
    }
    ctx.restore();
    ctx.restore();
  }

  /* a formation that starts clustered and expands — arranged, not scattered */
  function ringAt(items, i, p, opt) {
    opt = opt || {};
    var e = easeOut(clamp(p));
    var rad = lerp(opt.r0 === undefined ? 90 : opt.r0, opt.r1 === undefined ? 415 : opt.r1, e);
    var ang = (items[i].angle + clamp(p) * (opt.spin === undefined ? 0.30 : opt.spin)) * TAU;
    return {
      x: W / 2 + Math.cos(ang) * rad * (opt.rx === undefined ? 0.92 : opt.rx),
      y: H / 2 + Math.sin(ang) * rad * (opt.ry === undefined ? 1.34 : opt.ry),
      size: items[i].size * lerp(0.46, 1.18, e),
      rot: Math.sin(ang) * 0.10,
      alpha: smooth(inv(p, 0, 0.12)) * (opt.fade >= 1 ? 1 : (1 - smooth(inv(p, opt.fade === undefined ? 0.90 : opt.fade, 1.0))))
    };
  }

  function watermark(ctx) {
    if (!BRAND.name) return;
    var s = 30, track = 2.4;
    ctx.save();
    ctx.globalAlpha = 0.30;
    setFont(ctx, '700', s);
    var w = trackW(ctx, BRAND.name, track);
    ctx.fillStyle = BRAND.ink;
    ctx.textBaseline = 'alphabetic';
    trackFill(ctx, BRAND.name, W - 76 - w, 84, track);
    ctx.restore();
  }

  /* ==========================================================================
     4. BRAND FORMS
     ========================================================================== */

  /* slashed zero — thick matte glyph, traced at scale k for bloom copies */
  function pathZero(ctx, cx, cy, R, k, sy) {
    sy = sy === undefined ? 1 : sy;
    var rx = R * 0.66 * k, ry = R * k * sy;
    var bw = R * 0.155 * k;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU, false);
    ctx.ellipse(cx, cy, rx * 0.50, ry * 0.50, 0, 0, TAU, true);
    // the slash, as part of the same silhouette
    var ang = -Math.PI / 3.05, ca = Math.cos(ang), sa = Math.sin(ang);
    var L = R * 0.86 * k;
    var px = -sa * bw, py = ca * bw;
    var ax = cx - ca * L, ay = cy - sa * L * sy;
    var bx = cx + ca * L, by = cy + sa * L * sy;
    ctx.moveTo(ax + px, ay + py * sy);
    ctx.lineTo(ax - px, ay - py * sy);
    ctx.lineTo(bx - px, by - py * sy);
    ctx.lineTo(bx + px, by + py * sy);
    ctx.closePath();
  }

  /* the ZeroTaken check — stacked lockup's swoosh and the hero mark */
  function pathCheck(ctx, cx, cy, s, drawP) {
    drawP = drawP === undefined ? 1 : clamp(drawP);
    var p0 = [cx - s * 0.52, cy - s * 0.02];
    var p1 = [cx - s * 0.16, cy + s * 0.36];
    var p2 = [cx + s * 0.56, cy - s * 0.42];
    var l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    var l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    var tot = l1 + l2, want = tot * drawP;
    ctx.beginPath();
    ctx.moveTo(p0[0], p0[1]);
    if (want <= l1) {
      var u = want / l1;
      ctx.lineTo(lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u));
      return [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u)];
    }
    ctx.lineTo(p1[0], p1[1]);
    var v = (want - l1) / l2;
    ctx.lineTo(lerp(p1[0], p2[0], v), lerp(p1[1], p2[1], v));
    return [lerp(p1[0], p2[0], v), lerp(p1[1], p2[1], v)];
  }

  function checkSym(ctx, s, fill) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = fill; ctx.lineWidth = s * 0.135;
    ctx.beginPath();
    ctx.moveTo(-s * 0.30, s * 0.00);
    ctx.lineTo(-s * 0.09, s * 0.21);
    ctx.lineTo(s * 0.32, -s * 0.24);
    ctx.stroke();
    ctx.restore();
  }
  function tldSym(txt) {
    return function (ctx, s, fill) {
      ctx.save();
      setFont(ctx, '700', s * 0.30);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = fill;
      ctx.fillText(txt, 0, 0);
      ctx.restore();
    };
  }
  function sparkSym(ctx, cx, cy, s, col, a) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = col;
    ctx.shadowColor = hexa(col, 0.95); ctx.shadowBlur = s * 0.9;
    ctx.beginPath();
    ctx.moveTo(cx, cy - s); ctx.quadraticCurveTo(cx + s * 0.16, cy - s * 0.16, cx + s, cy);
    ctx.quadraticCurveTo(cx + s * 0.16, cy + s * 0.16, cx, cy + s);
    ctx.quadraticCurveTo(cx - s * 0.16, cy + s * 0.16, cx - s, cy);
    ctx.quadraticCurveTo(cx - s * 0.16, cy - s * 0.16, cx, cy - s);
    ctx.fill();
    ctx.restore();
  }

  /* stacked wordmark: ZERO over taken, the check swoosh to the right */
  function lockup(ctx, cx, cy, s, o) {
    o = o || {};
    var zTrack = s * 0.07, tTrack = s * 0.015;
    var top = o.topCol || null, bot = o.botCol || null;
    setFont(ctx, '700', s);
    var wZ = trackW(ctx, 'ZERO', zTrack);
    setFont(ctx, '700', s * 0.94);
    var wT = trackW(ctx, 'taken', tTrack);
    var block = Math.max(wZ, wT);
    var left = cx - block / 2 - s * 0.30;      // leave room for the swoosh right
    var yZ = cy - s * 0.10, yT = cy + s * 0.92;

    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = hexa(o.glowCol || BRAND.accent, 0.85);
    ctx.shadowBlur = s * (o.glowAmt === undefined ? 0.34 : o.glowAmt);

    setFont(ctx, '700', s);
    if (top) { ctx.fillStyle = top; }
    else {
      var gz = ctx.createLinearGradient(left, yZ - s, left + wZ, yZ);
      gz.addColorStop(0, '#ffc46b'); gz.addColorStop(0.5, '#ff9a1f'); gz.addColorStop(1, C.orange);
      ctx.fillStyle = gz;
    }
    trackFill(ctx, 'ZERO', left + (block - wZ) / 2, yZ, zTrack);

    setFont(ctx, '700', s * 0.94);
    if (bot) { ctx.fillStyle = bot; }
    else {
      var gt = ctx.createLinearGradient(left, yT - s * 0.8, left + wT, yT);
      gt.addColorStop(0, '#8ef56d'); gt.addColorStop(1, '#3fa020');
      ctx.fillStyle = gt;
    }
    ctx.shadowColor = hexa(o.glowCol || '#6ee85a', 0.7);
    trackFill(ctx, 'taken', left + (block - wT) / 2, yT, tTrack);
    ctx.restore();

    // the swoosh
    var sp = o.swoosh === undefined ? 1 : clamp(o.swoosh);
    if (sp > 0.05) {
      var scx = left + block + s * 0.62, scy = cy + s * 0.20, ss = s * 0.92;
      var col = o.swooshCol || C.orange;
      ctx.save();
      strokeBloom(ctx, function () { pathCheck(ctx, scx, scy, ss, sp); }, s * 0.17, col, 0.85 * (o.glowMul === undefined ? 1 : o.glowMul));
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = s * 0.17;
      var cg = ctx.createLinearGradient(scx - ss * 0.6, scy, scx + ss * 0.6, scy - ss * 0.4);
      cg.addColorStop(0, '#ffce8a'); cg.addColorStop(1, col);
      ctx.strokeStyle = cg;
      ctx.shadowColor = hexa(col, 0.9); ctx.shadowBlur = s * 0.35;
      var tip = pathCheck(ctx, scx, scy, ss, sp);
      ctx.stroke();
      if (sp > 0.06 && sp < 0.985 && tip) {                         // bright leading dot
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff'; ctx.shadowBlur = s * 0.6;
        ctx.beginPath(); ctx.arc(tip[0], tip[1], s * 0.10, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    return { left: left, block: block, bottom: yT };
  }

  /* an expanding ring travelling at a constant rate */
  function shockwave(ctx, cx, cy, p, color, amp, maxR) {
    if (p <= 0 || p >= 1) return;
    var r = lerp(20, maxR, p), th = lerp(70, 230, p);
    var a = (1 - smooth(inv(p, 0.38, 1))) * amp;
    var g = ctx.createRadialGradient(cx, cy, Math.max(1, r - th), cx, cy, r + th * 0.55);
    g.addColorStop(0, hexa(color, 0));
    g.addColorStop(0.50, hexa(color, 0.55 * a));
    g.addColorStop(0.66, hexa(color, 0.95 * a));
    g.addColorStop(1, hexa(color, 0));
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  /* ==========================================================================
     5. SCENES
     ========================================================================== */

  /* --- 1. LIT-FORM ------------------------------------------------------- */
  function sceneHook(ctx, t, dur) {
    var fade = lerp(0.62, 1, smooth(inv(t, 0, 0.30)));
    var out = smooth(inv(t, dur - 0.09, dur));
    var push = easeOut(inv(t, 0, dur * 0.94));
    var sw = swell(inv(t, 0, dur * 0.84));
    var fire = smooth(inv(t, dur - 0.46, dur - 0.10));

    var cx = W * 0.5, cy = H * 0.425;
    var R = H * 0.250 * lerp(1, 1.12, push);
    var sy = lerp(1, 0.10, fire);
    var hue = mix(C.mint, C.cyan, 0.30 + 0.35 * push);
    var bloomCol = mix(hue, '#ffffff', fire);

    ctx.save();
    ctx.globalAlpha = fade * (1 - out);

    // canopy — green spill one side, blue the other
    glowE(ctx, cx - W * 0.155, cy + R * 0.80, W * 0.27, H * 0.155, C.mint, 0.44 * sw);
    glowE(ctx, cx + W * 0.155, cy + R * 0.80, W * 0.27, H * 0.155, C.cyan, 0.38 * sw);
    glowE(ctx, cx, cy + R * 0.46, W * 0.19, H * 0.115, '#c9fff0', 0.24 * sw);

    // light cone falling from the form
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var spread = [[1.00, 0.17], [1.32, 0.11], [1.72, 0.075], [2.30, 0.045], [3.10, 0.025]];
    for (var ci = 0; ci < spread.length; ci++) {
      var kw = spread[ci][0], ka = spread[ci][1] * sw;
      var cg = ctx.createLinearGradient(0, cy, 0, H * 1.02);
      cg.addColorStop(0, hexa(hue, ka));
      cg.addColorStop(0.50, hexa(hue, ka * 0.30));
      cg.addColorStop(1, hexa(hue, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.60 * kw, cy); ctx.lineTo(cx + R * 0.60 * kw, cy);
      ctx.lineTo(cx + R * 2.6 * kw, H); ctx.lineTo(cx - R * 2.6 * kw, H);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    // bloom in the shape of the glyph, twice, offset for two-colour spill
    var LF = [[2.30, 0.20], [1.72, 0.27], [1.34, 0.34], [1.12, 0.40]];
    shapeBloom(ctx, function (k) { pathZero(ctx, cx - R * 0.075, cy + R * 0.075, R, k, sy); },
      mix(bloomCol, C.mint, 0.45), (0.78 * sw + 0.65 * fire), LF);
    shapeBloom(ctx, function (k) { pathZero(ctx, cx + R * 0.075, cy + R * 0.060, R, k, sy); },
      mix(bloomCol, C.blue, 0.35), (0.66 * sw + 0.55 * fire), LF);

    // the dark matte form
    pathZero(ctx, cx, cy, R, 1, sy);
    var bg = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    bg.addColorStop(0, '#16171f'); bg.addColorStop(0.42, '#07070c'); bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg; ctx.fill();

    // rim — lit from the upper left, never a neon outline
    pathZero(ctx, cx, cy, R, 1, sy);
    var rg = ctx.createLinearGradient(cx - R, cy - R, cx + R * 0.6, cy + R);
    rg.addColorStop(0, 'rgba(255,255,255,0.34)');
    rg.addColorStop(0.32, 'rgba(190,255,230,0.11)');
    rg.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.lineWidth = Math.max(1.5, R * 0.013);
    ctx.strokeStyle = rg; ctx.stroke();

    // surface falls off to black
    var fg = ctx.createLinearGradient(0, H * 0.70, 0, H);
    fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.62, 'rgba(0,0,0,0.72)'); fg.addColorStop(1, '#000');
    ctx.fillStyle = fg; ctx.fillRect(0, H * 0.70, W, H * 0.30);

    // headline
    var msg = 'Every name is taken';
    var p = inv(t, 0.45, 1.70);
    var size = fitSize(ctx, msg, W * 0.62, 104, 0);
    setFont(ctx, '700', size);
    var tw = ctx.measureText(msg).width;
    var ty = H * 0.865;
    ctx.save();
    ctx.globalAlpha = (1 - fire) * smooth(inv(t, 0.40, 0.55));
    scrim(ctx, cx, ty - size * 0.32, W * 0.40, H * 0.13, 0.86);
    ctx.shadowColor = 'rgba(140,255,210,0.40)'; ctx.shadowBlur = 24;
    var per = (1.70 - 0.45) / (msg.length + 0.6);
    var n = Math.floor(clamp(p) * (msg.length + 0.6));
    var hold = clamp(1 - (t - (0.45 + n * per)) / 0.26);
    var r2 = typeOut(ctx, msg, cx - tw / 2, ty, p, size, C.ink, C.mint, hold);
    ctx.shadowBlur = 0;
    if (!r2.done) caret(ctx, r2.x, ty, size, t, 0.9, C.mint);
    ctx.restore();

    // the fire — a blast of white as the form flattens
    if (fire > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glowE(ctx, cx, cy, W * 0.42 * fire, H * (0.03 + 0.16 * fire), '#ffffff', 0.42 * fire * fire);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 2. SHOCKWAVE + WORDMARK-SNAP -------------------------------------- */
  function sceneBrand(ctx, t, dur) {
    var out = smooth(inv(t, dur - 0.09, dur));
    var cx = W * 0.5, cy = H * 0.47;
    var SNAP = 0.98, SNAP_END = 1.045;                 // ~2 frames
    var snap = t < SNAP ? 0 : (t >= SNAP_END ? 1 : 1);
    var flash = 1 - smooth(inv(t, SNAP, SNAP + 0.20));

    ctx.save();
    ctx.globalAlpha = 1 - out;

    shockwave(ctx, cx, cy, inv(t, 0.00, 0.95), mix(C.mint, C.blue, 0.55), 0.95, W * 0.78);
    shockwave(ctx, cx, cy, inv(t, 0.34, 1.30), C.violet, 0.42, W * 0.95);
    shockwave(ctx, cx, cy, inv(t, 0.92, 1.80), C.orange, 0.30, W * 0.80);

    var sw = swell(inv(t, 0.9, dur * 0.94));
    if (snap) {
      glowE(ctx, cx, cy + H * 0.02, W * 0.22, H * 0.17,
        ramp([C.ember, C.orange, C.gold, C.orange], inv(t, 1.0, dur)), 0.30 * sw);
    }

    if (!snap) {
      // holds small and ember-hot
      var s0 = H * 0.055;
      lockup(ctx, cx, cy, s0, {
        topCol: mix('#d81028', '#ff7a1a', smooth(inv(t, 0.02, 0.95))),
        botCol: mix('#a01020', '#ff9a2a', smooth(inv(t, 0.02, 0.95))),
        glowCol: '#ff2f6e', glowAmt: 0.9, swoosh: 0
      });
    } else {
      var s1 = H * 0.115;
      var draw = smooth(inv(t, 1.14, 1.66));
      lockup(ctx, cx, cy - H * 0.02, s1, {
        glowCol: C.orange, glowAmt: 0.30 + 0.16 * sw,
        swoosh: draw, glowMul: 0.7 + 0.6 * sw
      });
      // subtitle
      var sa = smooth(inv(t, 1.55, 1.95));
      if (sa > 0.01) {
        ctx.save(); ctx.globalAlpha = sa * 0.55;
        centred(ctx, 'AI NAMES  ·  LIVE AVAILABILITY', cy + H * 0.155, H * 0.028, '#ffffff', H * 0.0075);
        ctx.restore();
      }
    }

    // the snap lands with a white flash, 3 frames
    if (flash > 0.01 && t >= SNAP) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexa('#ffffff', 0.42 * flash * flash);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 3. QUERY-PILL ----------------------------------------------------- */
  function scenePrompt(ctx, t, dur) {
    var fade = smooth(inv(t, 0, 0.12)) * (1 - smooth(inv(t, dur - 0.10, dur)));
    var lines = ['fintech for freelancers', 'an AI photo editor', 'tool for indie devs'];
    var cols = [[C.mint, C.blue], [C.blue, C.violet], [C.violet, C.magenta]];
    var each = dur / lines.length;
    var cx = W * 0.5, cy = H * 0.53;

    ctx.save();
    ctx.globalAlpha = fade;

    var ca = smooth(inv(t, 0.18, 0.60)) * (1 - smooth(inv(t, dur - 0.55, dur - 0.15)));
    if (ca > 0.01) {
      ctx.save(); ctx.globalAlpha = fade * ca * 0.50;
      centred(ctx, 'DESCRIBE  YOUR  IDEA', H * 0.295, H * 0.027, '#ffffff', H * 0.008);
      ctx.restore();
    }

    for (var i = 0; i < lines.length; i++) {
      var t0 = i * each, p = (t - t0) / each;
      if (p < -0.09 || p > 1.00) continue;

      var inP = easeOut(inv(p, -0.09, 0.15));
      var outP = smooth(inv(p, 0.80, 0.99));
      var slide = lerp(H * 0.30, 0, inP) - outP * H * 0.42;
      var scl = lerp(0.72, 1, inP) * lerp(1, 0.48, outP);
      var alpha = Math.min(1, inP * 1.7) * (1 - smooth(outP));
      if (alpha <= 0.005) continue;

      var fs = H * 0.058;
      setFont(ctx, '700', fs);
      var pw = Math.max(W * 0.38, ctx.measureText(lines[i]).width + W * 0.145);
      var ph = H * 0.135;
      var py = cy + slide;
      var c0 = cols[i][0], c1 = cols[i][1];
      var hue = mix(c0, c1, smooth(clamp(p)));

      ctx.save();
      ctx.globalAlpha = fade * alpha;

      shapeBloom(ctx, function (k) {
        var bw = pw * (1 + (k - 1) * 0.26) * scl, bh = ph * k * scl;
        rr(ctx, cx - bw / 2, py - bh / 2, bw, bh, bh / 2);
      }, hue, swell(clamp(p)) * 0.62, [[2.5, 0.20], [1.8, 0.26], [1.4, 0.32], [1.14, 0.36]]);

      ctx.translate(cx, py); ctx.scale(scl, scl); ctx.translate(-cx, -py);

      // body
      rr(ctx, cx - pw / 2, py - ph / 2, pw, ph, ph / 2);
      var bg = ctx.createLinearGradient(0, py - ph / 2, 0, py + ph / 2);
      bg.addColorStop(0, '#0e0e16'); bg.addColorStop(1, '#050508');
      ctx.fillStyle = bg; ctx.fill();

      // rotating multi-stop rim
      var a = t * 1.15 + i * 2.1;
      var rgx = Math.cos(a) * pw * 0.5, rgy = Math.sin(a) * ph * 0.5;
      var rimg = ctx.createLinearGradient(cx - rgx, py - rgy, cx + rgx, py + rgy);
      rimg.addColorStop(0, hexa(c0, 0.95));
      rimg.addColorStop(0.34, hexa('#ffffff', 0.85));
      rimg.addColorStop(0.68, hexa(c1, 0.95));
      rimg.addColorStop(1, hexa(c0, 0.60));
      rr(ctx, cx - pw / 2, py - ph / 2, pw, ph, ph / 2);
      ctx.lineWidth = H * 0.0055;
      ctx.strokeStyle = rimg;
      ctx.shadowColor = hexa(hue, 0.9); ctx.shadowBlur = H * 0.045;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // glass highlight along the top
      ctx.save();
      rr(ctx, cx - pw / 2, py - ph / 2, pw, ph, ph / 2); ctx.clip();
      var hg = ctx.createLinearGradient(0, py - ph / 2, 0, py + ph * 0.1);
      hg.addColorStop(0, 'rgba(255,255,255,0.13)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg; ctx.fillRect(cx - pw / 2, py - ph / 2, pw, ph * 0.6);
      ctx.restore();

      // typing
      var tp = inv(p, 0.07, 0.55);
      var per = (0.55 - 0.07) * each / (lines[i].length + 0.6);
      var n = Math.floor(clamp(tp) * (lines[i].length + 0.6));
      var hold = clamp(1 - (t - (t0 + 0.07 * each + n * per)) / 0.28);
      var tx = cx - pw / 2 + W * 0.038;
      var res = typeOut(ctx, lines[i], tx, py + fs * 0.35, tp, fs, C.ink, BRAND.hot, hold);
      if (!res.done) caret(ctx, res.x, py + fs * 0.35, fs, t, 1, hue);

      // AI spark on the right, pulses as the line lands
      var spa = smooth(inv(p, 0.42, 0.62));
      sparkSym(ctx, cx + pw / 2 - W * 0.036, py, H * 0.026 * (0.7 + 0.5 * swell(clamp(p))),
        mix('#ffffff', hue, 0.45), spa);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 4. SLAB-RING ------------------------------------------------------ */
  function sceneTLDs(ctx, t, dur) {
    var fade = smooth(inv(t, 0, 0.10)) * (1 - smooth(inv(t, dur - 0.10, dur)));
    var tlds = ['.com', '.io', '.ai', '.app', '.dev', '.co', '.net', '.xyz'];
    var hues = [C.mint, C.green, C.cyan, C.blue, C.deep, C.indigo, C.violet, C.mint];
    var items = [];
    for (var i = 0; i < 8; i++) items.push({ angle: i / 8 - 0.25, size: H * 0.175, symbol: tldSym(tlds[i]) });

    ctx.save();
    ctx.globalAlpha = fade;

    var b = 1 - smooth(inv(t, 0, 0.36));
    if (b > 0.01) glowE(ctx, W / 2, H / 2, lerp(W * 0.14, W * 0.52, 1 - b), lerp(H * 0.14, H * 0.34, 1 - b), C.mint, 0.85 * b);

    var p = inv(t, 0, dur * 0.92);
    var sw = swell(inv(t, 0.1, dur * 0.92));
    for (var j = 0; j < items.length; j++) {
      var q = ringAt(items, j, p, { r0: H * 0.05, r1: H * 0.400, rx: 1.58, ry: 0.80, spin: 0.07, fade: 1 });
      var hue = mix(hues[j], '#ffffff', 0.10 + 0.18 * sw);
      slab(ctx, {
        x: q.x, y: q.y, size: q.size, rot: q.rot, alpha: q.alpha,
        c1: '#ffffff', c2: hue, halo: hues[j], symbol: items[j].symbol
      });
    }

    // centre copy, once the formation has opened up
    var ca = smooth(inv(t, dur * 0.30, dur * 0.46));
    if (ca > 0.01) {
      ctx.save();
      ctx.globalAlpha = fade * ca;
      scrim(ctx, W / 2, H * 0.50, W * 0.27, H * 0.16, 0.92);
      ctx.shadowColor = hexa(C.mint, 0.45); ctx.shadowBlur = 26;
      centred(ctx, 'Checked live', H * 0.508, H * 0.108, C.ink, 0);
      ctx.shadowBlur = 0;
      ctx.globalAlpha = fade * ca * 0.48;
      centred(ctx, 'HUNDREDS  OF  EXTENSIONS', H * 0.575, H * 0.026, '#ffffff', H * 0.0075);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 5. STAT-SLAM ------------------------------------------------------ */
  function sceneScore(ctx, t, dur) {
    var fade = smooth(inv(t, 0, 0.07)) * (1 - smooth(inv(t, dur - 0.09, dur)));
    var cx = W * 0.5, cy = H * 0.475;
    var R = H * 0.255;
    var p = easeOut4(inv(t, 0.08, 1.02));
    var val = Math.round(lerp(0, 92, p));
    var sw = swell(inv(t, 0.05, dur * 0.90));
    var hue = ramp([C.blue, C.violet, C.indigo, C.magenta], inv(t, 0.1, dur * 0.95));
    var a0 = Math.PI * 0.75, sweep = Math.PI * 1.5;

    ctx.save();
    ctx.globalAlpha = fade;

    // the slam
    var slam = 1 - smooth(inv(t, 0.04, 0.42));
    if (slam > 0.01) glow(ctx, cx, cy, lerp(R * 0.6, R * 4.2, 1 - slam), C.violet, 0.80 * slam);
    glow(ctx, cx, cy, R * 2.0, hue, 0.20 * sw);

    // ticks — arranged, not scattered
    ctx.save();
    for (var i = 0; i <= 36; i++) {
      var ang = a0 + sweep * (i / 36);
      var lit = (i / 36) <= p * 0.92 ? 1 : 0.16;
      var r1 = R * 1.14, r2 = R * (i % 6 === 0 ? 1.23 : 1.19);
      ctx.globalAlpha = fade * lit * (i % 6 === 0 ? 0.85 : 0.5);
      ctx.strokeStyle = lit > 0.5 ? mix(hue, '#ffffff', 0.35) : '#5a5a72';
      ctx.lineWidth = H * (i % 6 === 0 ? 0.0055 : 0.003);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
      ctx.stroke();
    }
    ctx.restore();

    // track
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = H * 0.020;
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + sweep); ctx.stroke();
    ctx.restore();

    // the gauge drawing itself, with a bright leading dot
    var frac = p * 0.92;
    if (frac > 0.001) {
      var end = a0 + sweep * frac;
      var arc = function () { ctx.beginPath(); ctx.arc(cx, cy, R, a0, end); };
      ctx.save();
      ctx.lineCap = 'round';
      strokeBloom(ctx, arc, H * 0.020, hue, 0.95 * sw);
      var g = ctx.createLinearGradient(cx - R, cy + R, cx + R, cy - R);
      g.addColorStop(0, C.blue); g.addColorStop(0.5, C.violet); g.addColorStop(1, C.magenta);
      ctx.strokeStyle = g; ctx.lineWidth = H * 0.020;
      ctx.shadowColor = hexa(hue, 0.95); ctx.shadowBlur = H * 0.05;
      arc(); ctx.stroke();
      ctx.shadowBlur = 0;
      var dx = cx + Math.cos(end) * R, dy = cy + Math.sin(end) * R;
      glow(ctx, dx, dy, H * 0.10, '#ffffff', 0.85);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(dx, dy, H * 0.013, 0, TAU); ctx.fill();
      ctx.restore();
    }

    // the number
    var pop = lerp(1.22, 1, easeOut4(inv(t, 0.04, 0.40)));
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
    ctx.shadowColor = hexa(mix(hue, '#ffffff', 0.4), 0.75); ctx.shadowBlur = H * 0.06;
    centred(ctx, String(val), cy + H * 0.075, H * 0.215, C.ink, 0);
    ctx.shadowBlur = 0;
    ctx.restore();

    // label
    var la = smooth(inv(t, 0.85, 1.20));
    ctx.save(); ctx.globalAlpha = fade * la * 0.55;
    centred(ctx, 'BRAND  QUALITY  SCORE', cy + H * 0.325, H * 0.027, '#ffffff', H * 0.0085);
    ctx.restore();

    var ea = smooth(inv(t, 1.15, 1.45));
    if (ea > 0.01) {
      ctx.save(); ctx.globalAlpha = fade * ea;
      ctx.shadowColor = hexa(C.mint, 0.8); ctx.shadowBlur = H * 0.03;
      centred(ctx, 'EXCELLENT', cy - H * 0.120, H * 0.030, mix(C.mint, '#ffffff', 0.25), H * 0.009);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 6. CARD-SWEEP ----------------------------------------------------- */
  function sceneProof(ctx, t, dur) {
    var cw = W * 0.76, ch = H * 0.60, r = H * 0.055;
    var inP = easeOut4(inv(t, 0.00, 0.62));
    var exit = easeIn(inv(t, dur - 0.34, dur - 0.04));
    var cx = lerp(W * 0.5 - W * 0.55, W * 0.5, inP) + exit * W * 0.70;
    var cy = lerp(H * 0.5 + H * 0.85, H * 0.5, inP) - exit * H * 0.55;
    var rot = lerp(-0.16, -0.018, inP) + exit * 0.20;
    var sw = swell(inv(t, 0.1, dur * 0.88));
    var drift = t * 0.75;

    ctx.save();

    var cardPath = function (k) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
      rr(ctx, cx - cw * k / 2, cy - ch * k / 2, cw * k, ch * k, r * k);
      ctx.restore();
    };
    shapeBloom(ctx, function (k) { cardPath(1 + (k - 1) * 0.10); },
      ramp([C.ember, C.orange, C.magenta, C.orange], inv(t, 0, dur)), 1.10 * sw,
      [[2.2, 0.24], [1.7, 0.30], [1.35, 0.34], [1.12, 0.36]]);

    // motion smear on the exit
    if (exit > 0.02) {
      ctx.save(); ctx.globalAlpha = 0.28 * (1 - exit);
      for (var s = 1; s <= 3; s++) {
        ctx.save();
        ctx.translate(-W * 0.05 * s * exit, H * 0.04 * s * exit);
        cardPath(1); ctx.fillStyle = hexa(C.orange, 0.20); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
    rr(ctx, cx - cw / 2, cy - ch / 2, cw, ch, r);
    ctx.save();
    ctx.clip();
    // a drifting multi-point gradient face
    ctx.fillStyle = C.orange; ctx.fillRect(cx - cw, cy - ch, cw * 2, ch * 2);
    glowE(ctx, cx - cw * (0.34 + 0.04 * Math.sin(drift)), cy - ch * (0.36 + 0.05 * Math.cos(drift * 0.8)),
      cw * 0.52, ch * 0.72, '#fff3d6', 0.95, false);
    glowE(ctx, cx + cw * (0.40 + 0.04 * Math.cos(drift * 0.9)), cy + ch * (0.42 + 0.05 * Math.sin(drift)),
      cw * 0.55, ch * 0.85, C.pink, 0.80, false);
    glowE(ctx, cx - cw * (0.44 + 0.05 * Math.cos(drift * 1.2)), cy + ch * (0.48 + 0.04 * Math.sin(drift * 1.1)),
      cw * 0.42, ch * 0.70, C.indigo, 0.62, false);
    glowE(ctx, cx + cw * 0.10, cy - ch * 0.10, cw * 0.55, ch * 0.60, C.ember, 0.42, false);
    ctx.save();                                       // ghost mark embossed on the face
    ctx.globalAlpha = 0.10;
    ctx.translate(cx + cw * 0.30, cy - ch * 0.14);
    checkSym(ctx, ch * 1.15, '#ffffff');
    ctx.restore();
    ctx.restore();

    // inner edge
    rr(ctx, cx - cw / 2 + 2, cy - ch / 2 + 2, cw - 4, ch - 4, r);
    ctx.lineWidth = H * 0.0035;
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.stroke();

    // brand lockup pinned near the top-left of the card
    var ink = '#1a0d02';
    ctx.save();
    ctx.globalAlpha = 0.72 * smooth(inv(t, 0.35, 0.65));
    setFont(ctx, '700', H * 0.026);
    var lw = trackW(ctx, 'ZEROTAKEN', H * 0.010);
    ctx.fillStyle = ink;
    trackFill(ctx, 'ZEROTAKEN', cx - cw / 2 + W * 0.045, cy - ch / 2 + H * 0.085, H * 0.010);
    ctx.globalAlpha = 0.45 * smooth(inv(t, 0.45, 0.75));
    setFont(ctx, '700', H * 0.022);
    ctx.fillText('REAL FIND', cx - cw / 2 + W * 0.045, cy - ch / 2 + H * 0.130);
    ctx.restore();

    // the claim
    var ta = smooth(inv(t, 0.42, 0.72));
    ctx.save();
    ctx.globalAlpha = ta;
    ctx.fillStyle = ink;
    var l1 = '$30K name.';
    var l2 = 'Twelve dollars.';
    var s1 = fitSize(ctx, l1, cw * 0.80, H * 0.135, 0);
    setFont(ctx, '700', s1);
    ctx.fillText(l1, cx - cw * 0.40, cy + H * 0.015);
    var s2 = fitSize(ctx, l2, cw * 0.80, H * 0.135, 0);
    setFont(ctx, '700', s2);
    ctx.globalAlpha = ta * 0.80;
    ctx.fillText(l2, cx - cw * 0.40, cy + H * 0.155);
    ctx.restore();
    ctx.restore();

    // the tile the next beat carries forward — revealed as the card leaves
    var ha = smooth(inv(t, dur - 0.30, dur - 0.02));
    if (ha > 0.01) {
      slab(ctx, {
        x: W / 2, y: H / 2, size: H * 0.16 * lerp(0.7, 1, ha), alpha: ha,
        c1: '#ffffff', c2: C.blue, halo: C.blue, symbol: tldSym('.com')
      });
    }
    ctx.restore();
  }

  /* --- 7. HERO-PEEL + SYMBOL-MORPH --------------------------------------- */
  function sceneClose(ctx, t, dur) {
    var cx = W * 0.5;
    var sw = swell(inv(t, 0, 1.9));
    var hue = ramp([C.blue, C.indigo, C.violet, C.ember, C.orange], inv(t, 0.05, 1.85));

    // the tile drifts up as it swells, so the mark ends high in frame
    var rise = smooth(inv(t, 0.15, 2.05));
    var cyT = lerp(H * 0.50, H * 0.395, rise);
    var size = lerp(H * 0.16, H * 0.30, easeOut(inv(t, 0.00, 1.30)));
    var morph = smooth(inv(t, 0.86, 1.22));
    var bodyA = 1 - smooth(inv(t, 1.30, 1.80));
    var freeS = lerp(1, 1.30, smooth(inv(t, 1.24, 2.10)));

    var SNAP = 2.10, SNAP_END = 2.166;
    var snapped = t >= SNAP;
    var flash = 1 - smooth(inv(t, SNAP, SNAP + 0.22));

    ctx.save();

    glowE(ctx, cx, cyT, W * 0.26 * (0.8 + 0.3 * sw), H * 0.30 * (0.8 + 0.3 * sw), hue, 0.42 * sw);

    var noSym = function () { };
    if (morph < 0.995) {
      // container still holds the contents — only the symbol crossfades
      slab(ctx, {
        x: cx, y: cyT, size: size, alpha: 1, bodyA: bodyA,
        c1: '#ffffff', c2: hue, halo: hue,
        symbol: tldSym('.com'), symbol2: checkSym, morph: morph,
        symbolCol: mix('#ffffff', hue, 0.42), glowCol: hue
      });
    } else {
      // the container dissolves and leaves the mark lit
      if (bodyA > 0.004) {
        slab(ctx, {
          x: cx, y: cyT, size: size, alpha: 1, bodyA: bodyA,
          c1: '#ffffff', c2: hue, halo: hue, symbol: noSym
        });
      }
      var ms = size * 0.84 * freeS;
      ctx.save();
      ctx.translate(cx, cyT);
      strokeBloom(ctx, function () {
        ctx.beginPath();
        ctx.moveTo(-ms * 0.30, 0); ctx.lineTo(-ms * 0.09, ms * 0.21); ctx.lineTo(ms * 0.32, -ms * 0.24);
      }, ms * 0.135, hue, (0.55 + 0.75 * sw) * lerp(0.55, 1, 1 - bodyA));
      var cg = ctx.createLinearGradient(-ms * 0.3, ms * 0.2, ms * 0.32, -ms * 0.24);
      cg.addColorStop(0, '#ffe6bb'); cg.addColorStop(0.5, C.gold); cg.addColorStop(1, hue);
      ctx.shadowColor = hexa(hue, 0.95); ctx.shadowBlur = ms * 0.45;
      checkSym(ctx, ms, cg);
      ctx.restore();
    }

    if (snapped) {
      // the lockup lands full size behind the mark — a cut, not a tween
      var s1 = H * 0.092;
      var lsw = swell(inv(t, 2.16, dur));
      lockup(ctx, cx + s1 * 0.30, H * 0.685, s1, {
        glowCol: C.orange, glowAmt: 0.24 + 0.16 * lsw, swoosh: 0
      });
      shockwave(ctx, cx, H * 0.62, inv(t, SNAP, SNAP + 0.62), C.gold, 0.26, W * 0.95);

      var ua = smooth(inv(t, 2.62, 2.98));
      if (ua > 0.01) {
        ctx.save(); ctx.globalAlpha = ua * 0.70;
        centred(ctx, 'ZEROTAKEN.COM', H * 0.895, H * 0.030, '#ffffff', H * 0.011);
        ctx.restore();
      }
    }

    if (flash > 0.01 && snapped) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexa('#ffffff', 0.38 * flash * flash);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    // settle to black
    var end = smooth(inv(t, dur - 0.22, dur));
    if (end > 0.001) { ctx.fillStyle = hexa('#000000', end); ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  /* ==========================================================================
     6. MASTER
     ========================================================================== */
  function drawFrame(ctx, t) {
    t = Math.max(0, Math.min(DUR - 0.0001, t));
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    try { ctx.filter = 'none'; } catch (e) { }

    var start = 0;
    for (var i = 0; i < TIMELINE.length; i++) {
      if (t < TIMELINE[i].end) { TIMELINE[i].fn(ctx, t - start, TIMELINE[i].end - start); break; }
      start = TIMELINE[i].end;
    }
    watermark(ctx);
    ctx.restore();
  }

  return {
    W: W, H: H, FPS: FPS, DUR: DUR, BRAND: BRAND, TIMELINE: TIMELINE,
    drawFrame: drawFrame,
    u: {
      clamp: clamp, lerp: lerp, inv: inv, smooth: smooth, easeOut: easeOut,
      easeOut4: easeOut4, easeIn: easeIn, easeInOut: easeInOut, easeBack: easeBack,
      hexa: hexa, mix: mix, ramp: ramp, rng: rng, rr: rr, glow: glow, glowE: glowE,
      scrim: scrim, shapeBloom: shapeBloom, strokeBloom: strokeBloom, swell: swell,
      setFont: setFont, trackW: trackW, trackFill: trackFill, fitSize: fitSize,
      centred: centred, typeOut: typeOut, caret: caret, slab: slab, ringAt: ringAt,
      lockup: lockup, shockwave: shockwave, pathZero: pathZero, pathCheck: pathCheck,
      checkSym: checkSym, tldSym: tldSym, sparkSym: sparkSym
    }
  };
});
