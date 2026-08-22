/* ============================================================================
   ZEROTAKEN — motion promo engine  ·  9:16  ·  1080x1920  ·  30fps  ·  30.0s
   ----------------------------------------------------------------------------
   drawFrame(ctx, tSeconds) is pure and seekable, so the same file drives the
   HTML player and the MP4 render.

   Cuts sit on a 120 BPM bar grid (2.0s) so the score locks to the edit:

   0.0–5.0    LIT-FORM     rotating slashed zero on a mint canopy
   5.0–9.0    SHOCKWAVE    + wordmark snap + check draw-on + orbiting sparks
   9.0–14.0   QUERY-PILL   three prompts typed, results rising behind
   14.0–18.0  SLAB-RING    8 TLD tiles expanding, rotating, ticking green
   18.0–21.0  STAT-SLAM    gauge draws to 92, comet runs the arc
   21.0–25.0  CARD-SWEEP   warm panel, specular sweep, whip-out
   25.0–30.0  HERO-PEEL    tile -> check -> lockup

   Nothing holds still: every beat carries a camera move, a breathing glow,
   an ambient mote field and at least one element in continuous motion.
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
  var TAU = Math.PI * 2;

  var BRAND = {
    name: 'ZeroTaken',
    font: '"Liberation Sans", "Helvetica Neue", Helvetica, Arial, sans-serif',
    ink: '#ffffff',
    accent: '#ef7908',        // ZeroTaken orange — the hero slot
    green: '#3fa020',         // ZeroTaken green
    hot: '#35ffa8'
  };

  var C = {
    mint: '#35ffa8', green: '#5df08a', cyan: '#4ec8ff',
    blue: '#2f8bff', deep: '#1f4cff',
    violet: '#7a2bff', indigo: '#6b5bff',
    magenta: '#ff4ccf', pink: '#ff2f7a',
    orange: '#ef7908', ember: '#ff5c2b', gold: '#ffd08a',
    ink: '#ffffff'
  };

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
  function easeBack(t) { var c = 1.5; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
  function osc(t, hz, ph) { return Math.sin(t * hz * TAU + (ph || 0)); }

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
  function shapeBloom(ctx, path, color, amount, layers) {
    if (amount <= 0.002) return;
    layers = layers || [[3.4, 0.24], [2.5, 0.30], [1.8, 0.36], [1.35, 0.40], [1.12, 0.38]];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < layers.length; i++) {
      var k = layers[i][0], a = layers[i][1] * amount;
      try { ctx.filter = 'blur(' + (10 + k * 17).toFixed(0) + 'px)'; } catch (e) { }
      path(k);
      ctx.fillStyle = hexa(color, Math.min(1, a)); ctx.fill();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();
  }
  function strokeBloom(ctx, path, baseW, color, amount) {
    if (amount <= 0.002) return;
    var layers = [[3.4, 0.24], [2.5, 0.30], [1.8, 0.36], [1.35, 0.42], [1.08, 0.40]];
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (var i = 0; i < layers.length; i++) {
      var k = layers[i][0], a = layers[i][1] * amount;
      try { ctx.filter = 'blur(' + (9 + k * 15).toFixed(0) + 'px)'; } catch (e) { }
      ctx.lineWidth = baseW * k;
      ctx.strokeStyle = hexa(color, Math.min(1, a));
      path(); ctx.stroke();
    }
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();
  }
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
  /* small caps line that wipes on letter by letter — a label that is never still */
  function wipeLabel(ctx, txt, y, size, col, sp, p, alpha) {
    setFont(ctx, '700', size);
    var w = trackW(ctx, txt, sp), x = (W - w) / 2;
    var n = clamp(p) * txt.length;
    for (var i = 0; i < txt.length; i++) {
      var la = clamp(n - i);
      if (la > 0) {
        ctx.globalAlpha = alpha * la;
        ctx.fillStyle = col;
        ctx.fillText(txt[i], x, y);
      }
      x += ctx.measureText(txt[i]).width + sp;
    }
    ctx.globalAlpha = 1;
  }
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
  function caret(ctx, x, y, size, t, a, col) {
    var b = (t % 0.9) < 0.52 ? 1 : 0.12;
    ctx.save(); ctx.globalAlpha = ctx.globalAlpha * a * b;
    ctx.fillStyle = col; ctx.shadowColor = hexa(col, 0.9); ctx.shadowBlur = size * 0.5;
    ctx.fillRect(x + size * 0.10, y - size * 0.76, size * 0.075, size * 0.86);
    ctx.restore();
  }

  /* ---- things that keep the frame alive ---------------------------------- */

  var MOTES = (function () {
    var r = rng(20260822), a = [];
    for (var i = 0; i < 58; i++) {
      a.push({ x: r(), y: r(), z: 0.30 + 0.70 * r(), s: 1.6 + 3.4 * r(), ph: r() * TAU, sp: 0.012 + 0.040 * r() });
    }
    return a;
  })();
  /* a drifting mote field — present in every beat, so nothing is ever frozen */
  function ambient(ctx, t, hue, amt) {
    if (amt <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < MOTES.length; i++) {
      var m = MOTES[i];
      var y = ((m.y - t * m.sp * m.z) % 1 + 1) % 1;
      var x = m.x + Math.sin(t * 0.32 + m.ph) * 0.035 * m.z;
      var a = amt * m.z * (0.16 + 0.14 * Math.sin(t * 1.6 + m.ph));
      if (a <= 0.002) continue;
      var r = m.s * m.z * 7;
      var g = ctx.createRadialGradient(x * W, y * H, 0, x * W, y * H, r);
      g.addColorStop(0, hexa(hue, a));
      g.addColorStop(0.35, hexa(hue, a * 0.4));
      g.addColorStop(1, hexa(hue, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x * W - r, y * H - r, r * 2, r * 2);
    }
    ctx.restore();
  }
  /* slow horizon light that never stops moving */
  function aurora(ctx, t, c1, c2, amt) {
    if (amt <= 0.001) return;
    glowE(ctx, W * (0.30 + 0.16 * osc(t, 0.055)), H * (0.86 + 0.02 * osc(t, 0.043, 1)), W * 0.52, H * 0.16, c1, 0.30 * amt);
    glowE(ctx, W * (0.72 + 0.14 * osc(t, 0.047, 2)), H * (0.90 + 0.02 * osc(t, 0.061, 3)), W * 0.46, H * 0.13, c2, 0.26 * amt);
    glowE(ctx, W * (0.50 + 0.20 * osc(t, 0.037, 4)), H * 0.06, W * 0.62, H * 0.11, c2, 0.14 * amt);
  }
  /* a specular band travelling across a rect — keeps flat panels alive */
  function sheen(ctx, x, y, w, h, r, t, period, col, amt, ang) {
    var q = (t % period) / period;
    if (q > 0.42) return;
    var p = q / 0.42;
    ctx.save();
    rr(ctx, x, y, w, h, r); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(x + w * lerp(-0.35, 1.35, p), y + h / 2);
    ctx.rotate(ang === undefined ? -0.42 : ang);
    var bw = w * 0.34, bh = Math.max(w, h) * 2.2;
    var g = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    g.addColorStop(0, hexa(col, 0));
    g.addColorStop(0.5, hexa(col, amt * Math.sin(p * Math.PI)));
    g.addColorStop(1, hexa(col, 0));
    ctx.fillStyle = g; ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.restore();
  }
  /* sparks orbiting an anchor — continuous motion around a held element */
  function orbit(ctx, cx, cy, rx, ry, t, n, col, amt, spd, seed) {
    var r = rng(seed || 7);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var i = 0; i < n; i++) {
      var ph = r() * TAU, sp = spd * (0.6 + 0.8 * r());
      var a = ph + t * sp;
      var depth = 0.55 + 0.45 * Math.sin(a);
      var x = cx + Math.cos(a) * rx, y = cy + Math.sin(a) * ry * 0.42;
      var s = (2.6 + 3.4 * r()) * depth;
      var al = amt * depth * (0.5 + 0.5 * Math.sin(t * 2.1 + ph));
      var g = ctx.createRadialGradient(x, y, 0, x, y, s * 7);
      g.addColorStop(0, hexa(col, al));
      g.addColorStop(1, hexa(col, 0));
      ctx.fillStyle = g; ctx.fillRect(x - s * 7, y - s * 7, s * 14, s * 14);
    }
    ctx.restore();
  }

  function columns(ctx, t, hue, amt) {
    if (amt <= 0.001) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var dash = H * 0.028;
    for (var i = 0; i < 7; i++) {
      var x = (i + 0.5) / 7 * W + Math.sin(t * 0.22 + i * 1.3) * W * 0.012;
      var sp = 0.055 + (i % 4) * 0.022;
      for (var k = 0; k < 9; k++) {
        var y = ((((k / 9) + t * sp + i * 0.137) % 1) + 1) % 1 * (H + dash) - dash;
        var a = amt * (0.10 + 0.09 * Math.sin(t * 1.25 + i * 0.8 + k));
        if (a <= 0.003) continue;
        var g = ctx.createLinearGradient(0, y, 0, y + dash);
        g.addColorStop(0, hexa(hue, 0));
        g.addColorStop(0.5, hexa(hue, a));
        g.addColorStop(1, hexa(hue, 0));
        ctx.fillStyle = g;
        ctx.fillRect(x - 1.6, y, 3.2, dash);
      }
    }
    ctx.restore();
  }

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
      ctx.save();
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

      ctx.save();
      ctx.globalAlpha = a * bodyA;
      rr(ctx, -h, -h + s * 0.05, s, s, r);
      ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = s * 0.24; ctx.shadowOffsetY = s * 0.09;
      ctx.fillStyle = '#000'; ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = a * bodyA;
      rr(ctx, -h, -h, s, s, r);
      var bg = ctx.createLinearGradient(-h, -h, h * 0.5, h);
      bg.addColorStop(0, '#181822'); bg.addColorStop(0.42, '#0a0a12'); bg.addColorStop(1, '#020206');
      ctx.fillStyle = bg; ctx.fill();
      ctx.restore();

      ctx.save();
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

    ctx.save();
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

    if (o.badge > 0.001) {                                  // "available" tick
      var bs = s * 0.20 * easeBack(clamp(o.badge));
      ctx.save();
      ctx.translate(h * 0.70, -h * 0.70);
      glow(ctx, 0, 0, bs * 3.2, C.mint, 0.55 * clamp(o.badge));
      ctx.beginPath(); ctx.arc(0, 0, bs, 0, TAU);
      ctx.fillStyle = mix('#0b1b12', C.mint, 0.20); ctx.fill();
      ctx.lineWidth = bs * 0.16; ctx.strokeStyle = C.mint; ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = bs * 0.26; ctx.strokeStyle = '#ddffee';
      ctx.beginPath();
      ctx.moveTo(-bs * 0.40, bs * 0.02); ctx.lineTo(-bs * 0.10, bs * 0.32); ctx.lineTo(bs * 0.44, -bs * 0.34);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  function watermark(ctx) {
    var s = 26, track = 2.2;
    ctx.save();
    ctx.globalAlpha = 0.30;
    setFont(ctx, '700', s);
    var w = trackW(ctx, BRAND.name, track);
    ctx.fillStyle = BRAND.ink;
    ctx.textBaseline = 'alphabetic';
    trackFill(ctx, BRAND.name, W - 58 - w, 84, track);
    ctx.restore();
  }

  /* ==========================================================================
     4. BRAND FORMS
     ========================================================================== */
  function pathZero(ctx, cx, cy, R, k, sy, squash) {
    sy = sy === undefined ? 1 : sy;
    squash = squash === undefined ? 1 : squash;
    var rx = R * 0.66 * k * squash, ry = R * k * sy;
    var bw = R * 0.155 * k;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, TAU, false);
    ctx.ellipse(cx, cy, Math.max(0.5, rx * 0.50), Math.max(0.5, ry * 0.50), 0, 0, TAU, true);
    var ang = -Math.PI / 3.05, ca = Math.cos(ang), sa = Math.sin(ang);
    var L = R * 0.86 * k;
    var px = -sa * bw * squash, py = ca * bw;
    var ax = cx - ca * L * squash, ay = cy - sa * L * sy;
    var bx = cx + ca * L * squash, by = cy + sa * L * sy;
    ctx.moveTo(ax + px, ay + py * sy);
    ctx.lineTo(ax - px, ay - py * sy);
    ctx.lineTo(bx - px, by - py * sy);
    ctx.lineTo(bx + px, by + py * sy);
    ctx.closePath();
  }
  function pathCheck(ctx, cx, cy, s, drawP) {
    drawP = drawP === undefined ? 1 : clamp(drawP);
    var p0 = [cx - s * 0.52, cy - s * 0.02];
    var p1 = [cx - s * 0.16, cy + s * 0.36];
    var p2 = [cx + s * 0.56, cy - s * 0.42];
    var l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    var l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    var want = (l1 + l2) * drawP;
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
    ctx.moveTo(-s * 0.30, 0); ctx.lineTo(-s * 0.09, s * 0.21); ctx.lineTo(s * 0.32, -s * 0.24);
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
  function sparkSym(ctx, cx, cy, s, col, a, spin) {
    ctx.save();
    ctx.globalAlpha = a;
    ctx.globalCompositeOperation = 'lighter';
    ctx.translate(cx, cy); ctx.rotate(spin || 0);
    ctx.fillStyle = col;
    ctx.shadowColor = hexa(col, 0.95); ctx.shadowBlur = s * 0.9;
    ctx.beginPath();
    ctx.moveTo(0, -s); ctx.quadraticCurveTo(s * 0.16, -s * 0.16, s, 0);
    ctx.quadraticCurveTo(s * 0.16, s * 0.16, 0, s);
    ctx.quadraticCurveTo(-s * 0.16, s * 0.16, -s, 0);
    ctx.quadraticCurveTo(-s * 0.16, -s * 0.16, 0, -s);
    ctx.fill();
    ctx.restore();
  }
  /* drop a travelling hot stop into a gradient, keeping stops monotonic */
  function hotStop(g, q, base, hot) {
    var w = 0.16;
    var a = Math.max(0.001, q - w), b = Math.min(0.999, q + w);
    if (a > 0.002) g.addColorStop(a, base);
    g.addColorStop(clamp(q, 0.003, 0.997), hot);
    if (b < 0.998) g.addColorStop(b, base);
  }
  function lockup(ctx, cx, cy, s, o) {
    o = o || {};
    var zTrack = s * 0.07, tTrack = s * 0.015;
    setFont(ctx, '700', s);
    var wZ = trackW(ctx, 'ZERO', zTrack);
    setFont(ctx, '700', s * 0.94);
    var wT = trackW(ctx, 'taken', tTrack);
    var block = Math.max(wZ, wT);
    var hasSw = (o.swoosh === undefined ? 1 : o.swoosh) > 0.05;
    var left = cx - block / 2 - ((hasSw || o.reserveSwoosh) ? s * 0.30 : 0);
    var yZ = cy - s * 0.10, yT = cy + s * 0.92;

    ctx.save();
    ctx.textBaseline = 'alphabetic';
    ctx.shadowColor = hexa(o.glowCol || BRAND.accent, 0.85);
    ctx.shadowBlur = s * (o.glowAmt === undefined ? 0.34 : o.glowAmt);
    var ph = o.phase === undefined ? -1 : ((o.phase % 1) + 1) % 1;
    setFont(ctx, '700', s);
    if (o.topCol) { ctx.fillStyle = o.topCol; }
    else {
      var gz = ctx.createLinearGradient(left, yZ - s, left + block, yZ);
      gz.addColorStop(0, '#ffc46b'); gz.addColorStop(0.5, '#ff9a1f'); gz.addColorStop(1, C.orange);
      if (ph >= 0) hotStop(gz, ph, '#ff9a1f', '#fff4d8');
      ctx.fillStyle = gz;
    }
    trackFill(ctx, 'ZERO', left + (block - wZ) / 2, yZ, zTrack);
    setFont(ctx, '700', s * 0.94);
    if (o.botCol) { ctx.fillStyle = o.botCol; }
    else {
      var gt = ctx.createLinearGradient(left, yT - s * 0.8, left + block, yT);
      gt.addColorStop(0, '#8ef56d'); gt.addColorStop(1, '#3fa020');
      if (ph >= 0) hotStop(gt, ((ph + 0.14) % 1), '#6ee85a', '#e8ffd8');
      ctx.fillStyle = gt;
    }
    ctx.shadowColor = hexa(o.glowCol || '#6ee85a', 0.7);
    trackFill(ctx, 'taken', left + (block - wT) / 2, yT, tTrack);
    ctx.restore();

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
      if (sp > 0.06 && sp < 0.985 && tip) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = '#fff';
        ctx.shadowColor = '#fff'; ctx.shadowBlur = s * 0.6;
        ctx.beginPath(); ctx.arc(tip[0], tip[1], s * 0.10, 0, TAU); ctx.fill();
      }
      ctx.restore();
    }
    return { left: left, block: block, top: yZ - s, bottom: yT };
  }
  function shockwave(ctx, cx, cy, p, color, amp, maxR) {
    if (p <= 0 || p >= 1) return;
    var r = lerp(20, maxR, p), th = lerp(60, 210, p);
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

  /* --- 1. LIT-FORM · 0.0–5.0 --------------------------------------------- */
  function sceneHook(ctx, t, dur) {
    var fade = lerp(0.62, 1, smooth(inv(t, 0, 0.30)));
    var out = smooth(inv(t, dur - 0.08, dur));
    var sw = swell(inv(t, 0, dur * 0.82));
    var fire = smooth(inv(t, dur - 0.45, dur - 0.09));

    var cx = W * 0.5, cy = H * 0.385;
    var R = W * 0.290 * lerp(1, 1.06, easeOut(inv(t, 0, dur)));
    var sy = lerp(1, 0.10, fire);
    var spin = osc(t, 0.115) * 0.075;                 // the form never stops turning
    var squash = 0.80 + 0.20 * Math.abs(Math.cos(t * 0.72));
    var hue = mix(C.mint, C.cyan, 0.30 + 0.30 * (0.5 + 0.5 * osc(t, 0.13)));
    var bloomCol = mix(hue, '#ffffff', fire);

    ctx.save();
    ctx.globalAlpha = fade * (1 - out);

    ambient(ctx, t, C.mint, 0.55);
    aurora(ctx, t, C.mint, C.cyan, 0.42);
    columns(ctx, t, C.mint, 0.55);

    // canopy — the two spills drift against each other
    glowE(ctx, cx + W * (-0.20 + 0.05 * osc(t, 0.09)), cy + R * 0.86, W * 0.42, H * 0.10, C.mint, 0.46 * sw);
    glowE(ctx, cx + W * (0.20 + 0.05 * osc(t, 0.09, Math.PI)), cy + R * 0.86, W * 0.42, H * 0.10, C.cyan, 0.40 * sw);
    glowE(ctx, cx, cy + R * 0.50, W * 0.26, H * 0.07, '#c9fff0', 0.26 * sw);

    // light cone
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var spread = [[1.00, 0.17], [1.32, 0.11], [1.72, 0.075], [2.30, 0.045], [3.10, 0.025]];
    for (var ci = 0; ci < spread.length; ci++) {
      var kw = spread[ci][0] * (1 + 0.05 * osc(t, 0.19, ci));
      var ka = spread[ci][1] * sw;
      var cg = ctx.createLinearGradient(0, cy, 0, H * 1.02);
      cg.addColorStop(0, hexa(hue, ka));
      cg.addColorStop(0.50, hexa(hue, ka * 0.30));
      cg.addColorStop(1, hexa(hue, 0));
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.moveTo(cx - R * 0.60 * kw, cy); ctx.lineTo(cx + R * 0.60 * kw, cy);
      ctx.lineTo(cx + R * 2.2 * kw, H); ctx.lineTo(cx - R * 2.2 * kw, H);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    orbit(ctx, cx, cy, R * 1.45, R * 2.1, t, 10, C.mint, 0.55, 0.50, 5);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var bi = 0; bi < 3; bi++) {
      var bq = ((t * 0.34 + bi / 3) % 1);
      var by = lerp(cy + R * 0.35, H * 0.96, bq);
      var ba = 0.20 * Math.sin(bq * Math.PI) * sw;
      var bg2 = ctx.createLinearGradient(0, by - H * 0.02, 0, by + H * 0.02);
      bg2.addColorStop(0, hexa(hue, 0));
      bg2.addColorStop(0.5, hexa(hue, ba));
      bg2.addColorStop(1, hexa(hue, 0));
      ctx.fillStyle = bg2;
      var bw2 = W * (0.35 + 0.55 * bq);
      ctx.fillRect(cx - bw2 / 2, by - H * 0.02, bw2, H * 0.04);
    }
    ctx.restore();

    ctx.save();
    ctx.translate(cx, cy); ctx.rotate(spin); ctx.translate(-cx, -cy);
    var LF = [[2.30, 0.20], [1.72, 0.27], [1.34, 0.34], [1.12, 0.40]];
    shapeBloom(ctx, function (k) { pathZero(ctx, cx - R * 0.075, cy + R * 0.075, R, k, sy, squash); },
      mix(bloomCol, C.mint, 0.45), (0.78 * sw + 0.65 * fire), LF);
    shapeBloom(ctx, function (k) { pathZero(ctx, cx + R * 0.075, cy + R * 0.060, R, k, sy, squash); },
      mix(bloomCol, C.blue, 0.35), (0.66 * sw + 0.55 * fire), LF);

    pathZero(ctx, cx, cy, R, 1, sy, squash);
    var bg = ctx.createLinearGradient(0, cy - R, 0, cy + R);
    bg.addColorStop(0, '#16171f'); bg.addColorStop(0.42, '#07070c'); bg.addColorStop(1, '#000000');
    ctx.fillStyle = bg; ctx.fill();

    pathZero(ctx, cx, cy, R, 1, sy, squash);
    var rimx = cx - R * (0.7 - 0.5 * (0.5 + 0.5 * osc(t, 0.115)));
    var rg = ctx.createLinearGradient(rimx, cy - R, cx + R * 0.6, cy + R);
    rg.addColorStop(0, 'rgba(255,255,255,0.36)');
    rg.addColorStop(0.32, 'rgba(190,255,230,0.11)');
    rg.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.lineWidth = Math.max(1.5, R * 0.013);
    ctx.strokeStyle = rg; ctx.stroke();
    ctx.restore();

    var fg = ctx.createLinearGradient(0, H * 0.60, 0, H * 0.92);
    fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(0.62, 'rgba(0,0,0,0.74)'); fg.addColorStop(1, '#000');
    ctx.fillStyle = fg; ctx.fillRect(0, H * 0.60, W, H * 0.32);

    // headline, then a light bar that keeps sweeping under it
    var msg = 'Every name is taken';
    var p = inv(t, 0.55, 2.30);
    var size = fitSize(ctx, msg, W * 0.84, W * 0.098, 0);
    setFont(ctx, '700', size);
    var tw = ctx.measureText(msg).width;
    var ty = H * 0.715;
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * (1 - fire) * smooth(inv(t, 0.48, 0.62));
    scrim(ctx, cx, ty - size * 0.30, W * 0.62, H * 0.075, 0.88);
    ctx.shadowColor = 'rgba(140,255,210,0.40)'; ctx.shadowBlur = 24;
    var per = (2.30 - 0.55) / (msg.length + 0.6);
    var n = Math.floor(clamp(p) * (msg.length + 0.6));
    var hold = clamp(1 - (t - (0.55 + n * per)) / 0.26);
    var r2 = typeOut(ctx, msg, cx - tw / 2, ty, p, size, C.ink, C.mint, hold);
    ctx.shadowBlur = 0;
    if (!r2.done) caret(ctx, r2.x, ty, size, t, 0.9, C.mint);
    if (r2.done) {
      var q = ((t - 2.30) % 1.5) / 1.5;
      var bx = lerp(cx - tw / 2, cx + tw / 2, q);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var lg = ctx.createLinearGradient(bx - tw * 0.22, 0, bx + tw * 0.22, 0);
      lg.addColorStop(0, hexa(C.mint, 0)); lg.addColorStop(0.5, hexa(C.mint, 0.85 * Math.sin(q * Math.PI)));
      lg.addColorStop(1, hexa(C.mint, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(cx - tw / 2, ty + size * 0.30, tw, Math.max(2, size * 0.035));
      ctx.restore();
    }
    ctx.restore();

    if (fire > 0.01) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      glowE(ctx, cx, cy, W * 0.70 * fire, H * (0.02 + 0.10 * fire), '#ffffff', 0.45 * fire * fire);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 2. SHOCKWAVE + WORDMARK-SNAP · 5.0–9.0 ---------------------------- */
  function sceneBrand(ctx, t, dur) {
    var out = smooth(inv(t, dur - 0.08, dur));
    var cx = W * 0.5, cy = H * 0.44;
    var SNAP = 0.98;
    var snapped = t >= SNAP;
    var flash = 1 - smooth(inv(t, SNAP, SNAP + 0.20));

    ctx.save();
    ctx.globalAlpha = 1 - out;

    ambient(ctx, t, snapped ? C.gold : C.cyan, 0.5);
    aurora(ctx, t, snapped ? C.ember : C.blue, snapped ? C.orange : C.violet, 0.55);

    // a ring is always travelling outward
    shockwave(ctx, cx, cy, inv(t, 0.00, 0.95), mix(C.mint, C.blue, 0.55), 0.95, W * 1.25);
    shockwave(ctx, cx, cy, inv(t, 0.34, 1.30), C.violet, 0.40, W * 1.45);
    shockwave(ctx, cx, cy, inv(t, 1.05, 2.05), C.orange, 0.30, W * 1.30);
    shockwave(ctx, cx, cy, inv(t, 2.10, 3.10), C.gold, 0.20, W * 1.30);
    shockwave(ctx, cx, cy, inv(t, 3.00, 4.00), C.ember, 0.16, W * 1.30);

    var sw = swell(inv(t, 0.9, dur * 0.92));

    if (!snapped) {
      var s0 = W * 0.062;
      var jit = 1 + 0.05 * osc(t, 5.5) * inv(t, 0.5, 0.98);
      glow(ctx, cx, cy, W * 0.22 * (0.6 + 0.5 * Math.abs(osc(t, 1.6))), '#ff2f6e', 0.30);
      ctx.save();
      ctx.translate(cx, cy); ctx.scale(jit, jit); ctx.translate(-cx, -cy);
      lockup(ctx, cx, cy, s0, {
        topCol: mix('#d81028', '#ff7a1a', smooth(inv(t, 0.02, 0.95))),
        botCol: mix('#a01020', '#ff9a2a', smooth(inv(t, 0.02, 0.95))),
        glowCol: '#ff2f6e', glowAmt: 0.9, swoosh: 0
      });
      ctx.restore();
    } else {
      var breathe = 1 + 0.014 * osc(t, 0.42);
      var s1 = W * 0.150 * breathe;
      var draw = smooth(inv(t, 1.14, 1.66));
      glowE(ctx, cx, cy + H * 0.01, W * 0.42, H * 0.13,
        ramp([C.ember, C.orange, C.gold, C.orange], inv(t, 1.0, dur)), 0.34 * sw);
      orbit(ctx, cx, cy + s1 * 0.4, W * 0.40, H * 0.16, t, 9, C.gold, 0.55, 0.55, 31);

      var lk = lockup(ctx, cx, cy - H * 0.012, s1, {
        glowCol: C.orange, glowAmt: 0.28 + 0.16 * sw, reserveSwoosh: true,
        swoosh: draw, glowMul: 0.7 + 0.6 * sw, phase: (t - SNAP) / 1.9
      });

      var sa = smooth(inv(t, 1.50, 1.95));
      if (sa > 0.01) {
        ctx.save();
        wipeLabel(ctx, 'AI NAMES  ·  LIVE AVAILABILITY', cy + H * 0.112, W * 0.028, '#ffffff',
          W * 0.0085 * (1 + 0.05 * osc(t, 0.25)), inv(t, 1.50, 2.15), sa * 0.58);
        ctx.restore();
      }
    }

    if (flash > 0.01 && snapped) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexa('#ffffff', 0.42 * flash * flash);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 3. QUERY-PILL · 9.0–14.0 ------------------------------------------ */
  var RESULTS = [
    ['lumenpay.com', 'freelo.io', 'tallypeak.com'],
    ['grainlab.ai', 'retint.app', 'photonic.co'],
    ['dyadkit.dev', 'shipbarn.io', 'nooklab.com']
  ];
  function scenePrompt(ctx, t, dur) {
    var fade = smooth(inv(t, 0, 0.10)) * (1 - smooth(inv(t, dur - 0.09, dur)));
    var lines = ['fintech for freelancers', 'an AI photo editor', 'tool for indie devs'];
    var cols = [[C.mint, C.blue], [C.blue, C.violet], [C.violet, C.magenta]];
    var each = dur / lines.length;
    var cx = W * 0.5, cy = H * 0.47;

    ctx.save();
    ctx.globalAlpha = fade;
    ambient(ctx, t, C.blue, 0.5);
    columns(ctx, t, C.blue, 0.75);
    aurora(ctx, t, C.blue, C.violet, 0.30);

    var ca = smooth(inv(t, 0.15, 0.55)) * (1 - smooth(inv(t, dur - 0.50, dur - 0.12)));
    if (ca > 0.01) {
      ctx.save();
      wipeLabel(ctx, 'DESCRIBE  YOUR  IDEA', H * 0.335, W * 0.030, '#ffffff',
        W * 0.010, inv(t, 0.15, 0.85), ca * 0.52);
      ctx.restore();
    }

    for (var i = 0; i < lines.length; i++) {
      var t0 = i * each, p = (t - t0) / each;
      if (p < -0.09 || p > 1.00) continue;

      var inP = easeOut(inv(p, -0.09, 0.15));
      var outP = smooth(inv(p, 0.80, 0.99));
      var float = Math.sin((t + i) * 1.35) * H * 0.006;
      var slide = lerp(H * 0.20, 0, inP) - outP * H * 0.28 + float;
      var scl = lerp(0.72, 1, inP) * lerp(1, 0.48, outP);
      var alpha = Math.min(1, inP * 1.7) * (1 - smooth(outP));
      if (alpha <= 0.005) continue;

      var fs = W * 0.058;
      setFont(ctx, '700', fs);
      var pw = Math.min(W * 0.90, Math.max(W * 0.74, ctx.measureText(lines[i]).width + W * 0.20));
      var ph = H * 0.078;
      var py = cy + slide;
      var c0 = cols[i][0], c1 = cols[i][1];
      var hue = mix(c0, c1, smooth(clamp(p)));

      // results rising behind the pill as the line lands
      ctx.save();
      ctx.globalAlpha = fade * alpha;
      for (var k = 0; k < 3; k++) {
        var rp = inv(p, 0.46 + k * 0.13, 0.99);
        if (rp <= 0.001) continue;
        var ra = smooth(inv(rp, 0, 0.16)) * (1 - smooth(inv(rp, 0.86, 1)));
        var ry2 = py + ph * 0.95 + k * H * 0.052 - smooth(clamp(rp * 3)) * H * 0.012
          + Math.sin(t * 1.1 + k * 1.7) * H * 0.0035;
        var rx2 = cx + Math.sin(t * 0.8 + k * 2.1) * W * 0.010;
        ctx.save();
        ctx.globalAlpha = fade * alpha * ra;
        setFont(ctx, '700', W * 0.034);
        var rtw = ctx.measureText(RESULTS[i][k]).width;
        var chw = rtw + W * 0.150, chh = H * 0.038;
        glowE(ctx, rx2, ry2, chw * 0.7, chh * 1.5, C.mint, 0.22 * ra);
        rr(ctx, rx2 - chw / 2, ry2 - chh / 2, chw, chh, chh / 2);
        ctx.fillStyle = 'rgba(10,14,12,0.92)'; ctx.fill();
        ctx.lineWidth = 1.6; ctx.strokeStyle = hexa(C.mint, 0.45); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.80)';
        ctx.fillText(RESULTS[i][k], rx2 - chw / 2 + W * 0.042, ry2 + W * 0.013);
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.lineWidth = W * 0.006; ctx.strokeStyle = C.mint;
        var bx2 = rx2 + chw / 2 - W * 0.058;
        ctx.beginPath();
        ctx.moveTo(bx2 - W * 0.010, ry2); ctx.lineTo(bx2 - W * 0.002, ry2 + W * 0.009); ctx.lineTo(bx2 + W * 0.013, ry2 - W * 0.011);
        ctx.stroke();
        ctx.restore();
      }
      ctx.restore();

      ctx.save();
      ctx.globalAlpha = fade * alpha;
      shapeBloom(ctx, function (k2) {
        var bw = pw * (1 + (k2 - 1) * 0.26) * scl, bh = ph * k2 * scl;
        rr(ctx, cx - bw / 2, py - bh / 2, bw, bh, bh / 2);
      }, hue, swell(clamp(p)) * 0.62, [[2.5, 0.20], [1.8, 0.26], [1.4, 0.32], [1.14, 0.36]]);

      ctx.translate(cx, py); ctx.scale(scl, scl); ctx.translate(-cx, -py);

      rr(ctx, cx - pw / 2, py - ph / 2, pw, ph, ph / 2);
      var bg = ctx.createLinearGradient(0, py - ph / 2, 0, py + ph / 2);
      bg.addColorStop(0, '#0e0e16'); bg.addColorStop(1, '#050508');
      ctx.fillStyle = bg; ctx.fill();

      var a = t * 1.15 + i * 2.1;
      var rgx = Math.cos(a) * pw * 0.5, rgy = Math.sin(a) * ph * 0.5;
      var rimg = ctx.createLinearGradient(cx - rgx, py - rgy, cx + rgx, py + rgy);
      rimg.addColorStop(0, hexa(c0, 0.95));
      rimg.addColorStop(0.34, hexa('#ffffff', 0.85));
      rimg.addColorStop(0.68, hexa(c1, 0.95));
      rimg.addColorStop(1, hexa(c0, 0.60));
      rr(ctx, cx - pw / 2, py - ph / 2, pw, ph, ph / 2);
      ctx.lineWidth = W * 0.0055;
      ctx.strokeStyle = rimg;
      ctx.shadowColor = hexa(hue, 0.9); ctx.shadowBlur = W * 0.045;
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.save();
      rr(ctx, cx - pw / 2, py - ph / 2, pw, ph, ph / 2); ctx.clip();
      var hg = ctx.createLinearGradient(0, py - ph / 2, 0, py + ph * 0.1);
      hg.addColorStop(0, 'rgba(255,255,255,0.13)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg; ctx.fillRect(cx - pw / 2, py - ph / 2, pw, ph * 0.6);
      ctx.restore();

      var tp = inv(p, 0.07, 0.50);
      var per = (0.50 - 0.07) * each / (lines[i].length + 0.6);
      var n = Math.floor(clamp(tp) * (lines[i].length + 0.6));
      var hold = clamp(1 - (t - (t0 + 0.07 * each + n * per)) / 0.28);
      var tx = cx - pw / 2 + W * 0.055;
      var res = typeOut(ctx, lines[i], tx, py + fs * 0.35, tp, fs, C.ink, BRAND.hot, hold);
      if (!res.done) caret(ctx, res.x, py + fs * 0.35, fs, t, 1, hue);

      var spa = smooth(inv(p, 0.40, 0.60));
      sparkSym(ctx, cx + pw / 2 - W * 0.055, py, W * 0.026 * (0.7 + 0.5 * swell(clamp(p))),
        mix('#ffffff', hue, 0.45), spa, t * 1.1);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 4. SLAB-RING · 14.0–18.0 ------------------------------------------ */
  var TLDS = ['.com', '.io', '.ai', '.app', '.dev', '.co', '.net', '.xyz'];
  var TLD_HUES = ['#35ffa8', '#5df08a', '#4ec8ff', '#2f8bff', '#1f4cff', '#6b5bff', '#7a2bff', '#35ffa8'];
  function sceneTLDs(ctx, t, dur) {
    var fade = smooth(inv(t, 0, 0.09)) * (1 - smooth(inv(t, dur - 0.09, dur)));
    ctx.save();
    ctx.globalAlpha = fade;
    ambient(ctx, t, C.mint, 0.55);

    var b = 1 - smooth(inv(t, 0, 0.34));
    if (b > 0.01) glowE(ctx, W / 2, H * 0.415, lerp(W * 0.16, W * 0.75, 1 - b), lerp(H * 0.09, H * 0.26, 1 - b), C.mint, 0.85 * b);

    var p = easeOut(inv(t, 0, dur * 0.62));
    var sw = swell(inv(t, 0.1, dur * 0.92));
    var rad = lerp(W * 0.06, W * 0.400, p);
    var ringY = H * 0.415;

    for (var j = 0; j < 8; j++) {
      // the formation keeps turning long after it has opened
      var ang = (j / 8 - 0.1875 + p * 0.10 + t * 0.028) * TAU;
      var bob = Math.sin(t * 1.15 + j * 0.8) * H * 0.007;
      var x = W / 2 + Math.cos(ang) * rad * 0.80;
      var y = ringY + Math.sin(ang) * rad * 1.08 + bob;
      var size = W * 0.155 * lerp(0.46, 1.10, p);
      var hue = mix(TLD_HUES[j], '#ffffff', 0.10 + 0.20 * (0.5 + 0.5 * Math.sin(t * 1.5 + j)));
      slab(ctx, {
        x: x, y: y, size: size, rot: Math.sin(ang) * 0.10 + 0.03 * Math.sin(t * 0.9 + j),
        alpha: smooth(inv(p, 0, 0.12)),
        c1: '#ffffff', c2: hue, halo: TLD_HUES[j], symbol: tldSym(TLDS[j]),
        badge: smooth(inv(t, 1.15 + j * 0.13, 1.45 + j * 0.13))
      });
    }

    var ca = smooth(inv(t, dur * 0.26, dur * 0.42));
    if (ca > 0.01) {
      ctx.save();
      ctx.globalAlpha = fade * ca;
      scrim(ctx, W / 2, H * 0.748, W * 0.56, H * 0.085, 0.90);
      ctx.shadowColor = hexa(C.mint, 0.45); ctx.shadowBlur = 26;
      var kick = 1 + 0.018 * osc(t, 0.5);
      ctx.translate(W / 2, H * 0.748); ctx.scale(kick, kick); ctx.translate(-W / 2, -H * 0.748);
      centred(ctx, 'Checked live', H * 0.755, W * 0.105, C.ink, 0);
      ctx.shadowBlur = 0;
      ctx.restore();
      ctx.save();
      wipeLabel(ctx, 'REGISTRY  DIRECT  ·  NO  CACHE', H * 0.796, W * 0.028, '#ffffff',
        W * 0.0095, inv(t, dur * 0.34, dur * 0.72), fade * ca * 0.50);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 5. STAT-SLAM · 18.0–21.0 ------------------------------------------ */
  function sceneScore(ctx, t, dur) {
    var fade = smooth(inv(t, 0, 0.06)) * (1 - smooth(inv(t, dur - 0.08, dur)));
    var cx = W * 0.5, cy = H * 0.435;
    var R = W * 0.315;
    var p = easeOut4(inv(t, 0.08, 1.05));
    var val = Math.round(lerp(0, 92, p));
    var sw = swell(inv(t, 0.05, dur * 0.90));
    var hue = ramp([C.blue, C.violet, C.indigo, C.magenta, C.violet], inv(t, 0.1, dur));
    var a0 = Math.PI * 0.75, sweepA = Math.PI * 1.5;
    var frac = p * 0.92;

    ctx.save();
    ctx.globalAlpha = fade;
    ambient(ctx, t, C.violet, 0.6);

    var slam = 1 - smooth(inv(t, 0.04, 0.42));
    if (slam > 0.01) glow(ctx, cx, cy, lerp(R * 0.6, R * 3.6, 1 - slam), C.violet, 0.80 * slam);
    glow(ctx, cx, cy, R * 2.0 * (0.9 + 0.12 * osc(t, 0.33)), hue, 0.20 * sw);
    orbit(ctx, cx, cy, R * 1.45, R * 2.0, t, 10, hue, 0.5, 0.42, 91);

    // ticks, with a travelling shimmer running through them
    ctx.save();
    for (var i = 0; i <= 36; i++) {
      var q = i / 36;
      var ang = a0 + sweepA * q;
      var on = q <= frac;
      var shim = Math.pow(Math.max(0, Math.sin((q - (t * 0.42 % 1)) * Math.PI * 2)), 8);
      var r1 = R * 1.13, r2 = R * (i % 6 === 0 ? 1.22 : 1.18) + shim * R * 0.04;
      ctx.globalAlpha = fade * (on ? (0.55 + 0.45 * shim) : 0.16) * (i % 6 === 0 ? 1 : 0.62);
      ctx.strokeStyle = on ? mix(hue, '#ffffff', 0.30 + 0.6 * shim) : '#5a5a72';
      ctx.lineWidth = W * (i % 6 === 0 ? 0.0085 : 0.0045);
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2);
      ctx.stroke();
    }
    ctx.restore();

    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = W * 0.030;
    ctx.beginPath(); ctx.arc(cx, cy, R, a0, a0 + sweepA); ctx.stroke();
    ctx.restore();

    if (frac > 0.001) {
      var end = a0 + sweepA * frac;
      var arc = function () { ctx.beginPath(); ctx.arc(cx, cy, R, a0, end); };
      ctx.save();
      ctx.lineCap = 'round';
      strokeBloom(ctx, arc, W * 0.030, hue, 0.95 * sw);
      var g = ctx.createLinearGradient(cx - R, cy + R, cx + R, cy - R);
      g.addColorStop(0, C.blue); g.addColorStop(0.5, C.violet); g.addColorStop(1, C.magenta);
      ctx.strokeStyle = g; ctx.lineWidth = W * 0.030;
      ctx.shadowColor = hexa(hue, 0.95); ctx.shadowBlur = W * 0.05;
      arc(); ctx.stroke();
      ctx.shadowBlur = 0;

      // a comet keeps running the finished arc
      if (p > 0.98) {
        var cq = ((t - 1.05) % 1.25) / 1.25;
        var ca2 = a0 + sweepA * frac * cq;
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';
        ctx.strokeStyle = hexa('#ffffff', 0.55 * Math.sin(cq * Math.PI));
        ctx.lineWidth = W * 0.030;
        ctx.beginPath();
        ctx.arc(cx, cy, R, Math.max(a0, ca2 - 0.22), ca2);
        ctx.stroke();
        glow(ctx, cx + Math.cos(ca2) * R, cy + Math.sin(ca2) * R, W * 0.075, '#ffffff', 0.55 * Math.sin(cq * Math.PI));
      }
      var dx = cx + Math.cos(end) * R, dy = cy + Math.sin(end) * R;
      glow(ctx, dx, dy, W * 0.10 * (1 + 0.15 * osc(t, 1.1)), '#ffffff', 0.85);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(dx, dy, W * 0.014, 0, TAU); ctx.fill();
      ctx.restore();
    }

    var pop = lerp(1.22, 1, easeOut4(inv(t, 0.04, 0.40))) * (1 + 0.012 * osc(t, 0.55));
    ctx.save();
    ctx.translate(cx, cy); ctx.scale(pop, pop); ctx.translate(-cx, -cy);
    ctx.shadowColor = hexa(mix(hue, '#ffffff', 0.4), 0.75); ctx.shadowBlur = W * 0.07;
    centred(ctx, String(val), cy + W * 0.115, W * 0.325, C.ink, 0);
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.save();
    wipeLabel(ctx, 'BRAND  QUALITY  SCORE', cy + R * 1.42, W * 0.030, '#ffffff',
      W * 0.0105 * (1 + 0.04 * osc(t, 0.3)), inv(t, 0.85, 1.45), fade * 0.58);
    ctx.restore();

    var ea = smooth(inv(t, 1.10, 1.40));
    if (ea > 0.01) {
      ctx.save();
      ctx.globalAlpha = fade * ea * (0.75 + 0.25 * Math.abs(osc(t, 0.6)));
      ctx.shadowColor = hexa(C.mint, 0.8); ctx.shadowBlur = W * 0.05;
      centred(ctx, 'EXCELLENT', cy - R * 0.52, W * 0.034, mix(C.mint, '#ffffff', 0.25), W * 0.011);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 6. CARD-SWEEP · 21.0–25.0 ----------------------------------------- */
  function sceneProof(ctx, t, dur) {
    var cw = W * 0.86, ch = H * 0.40, r = W * 0.075;
    var inP = easeOut4(inv(t, 0.00, 0.62));
    var exit = easeIn(inv(t, dur - 0.36, dur - 0.04));
    var floatY = Math.sin(t * 0.9) * H * 0.010;
    var floatX = Math.cos(t * 0.62) * W * 0.010;
    var cx = lerp(W * 0.5 - W * 0.85, W * 0.5, inP) + exit * W * 1.05 + floatX;
    var cy = lerp(H * 0.5 + H * 0.60, H * 0.47, inP) - exit * H * 0.35 + floatY;
    var rot = lerp(-0.20, -0.022, inP) + 0.020 * Math.sin(t * 0.85) + exit * 0.22;
    var sw = swell(inv(t, 0.1, dur * 0.88));
    var drift = t * 1.15;

    ctx.save();
    ambient(ctx, t, C.gold, 0.5);
    aurora(ctx, t, C.ember, C.magenta, 0.45);
    orbit(ctx, W * 0.5, H * 0.5, W * 0.62, H * 0.62, t, 12, C.gold, 0.45, 0.38, 61);

    var cardPath = function (k) {
      ctx.save();
      ctx.translate(cx, cy); ctx.rotate(rot); ctx.translate(-cx, -cy);
      rr(ctx, cx - cw * k / 2, cy - ch * k / 2, cw * k, ch * k, r * k);
      ctx.restore();
    };
    shapeBloom(ctx, function (k) { cardPath(1 + (k - 1) * 0.10); },
      ramp([C.ember, C.orange, C.magenta, C.orange], inv(t, 0, dur)), 1.10 * sw,
      [[2.2, 0.24], [1.7, 0.30], [1.35, 0.34], [1.12, 0.36]]);

    if (exit > 0.02) {
      ctx.save(); ctx.globalAlpha = 0.28 * (1 - exit);
      for (var s2 = 1; s2 <= 3; s2++) {
        ctx.save();
        ctx.translate(-W * 0.07 * s2 * exit, H * 0.03 * s2 * exit);
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
    ctx.fillStyle = C.orange; ctx.fillRect(cx - cw, cy - ch, cw * 2, ch * 2);
    glowE(ctx, cx - cw * (0.34 + 0.06 * Math.sin(drift)), cy - ch * (0.36 + 0.08 * Math.cos(drift * 0.8)),
      cw * 0.52, ch * 0.72, '#fff3d6', 0.95, false);
    glowE(ctx, cx + cw * (0.40 + 0.06 * Math.cos(drift * 0.9)), cy + ch * (0.42 + 0.08 * Math.sin(drift)),
      cw * 0.55, ch * 0.85, C.pink, 0.80, false);
    glowE(ctx, cx - cw * (0.44 + 0.07 * Math.cos(drift * 1.2)), cy + ch * (0.48 + 0.06 * Math.sin(drift * 1.1)),
      cw * 0.42, ch * 0.70, C.indigo, 0.62, false);
    glowE(ctx, cx + cw * (0.10 + 0.08 * Math.sin(drift * 0.6)), cy - ch * 0.10, cw * 0.55, ch * 0.60, C.ember, 0.42, false);
    ctx.save();
    ctx.globalAlpha = 0.10;
    ctx.translate(cx + cw * (0.28 + 0.02 * Math.sin(t * 0.8)), cy - ch * (0.24 + 0.03 * Math.cos(t * 0.7)));
    ctx.rotate(0.05 * Math.sin(t * 0.6));
    checkSym(ctx, ch * 1.05, '#ffffff');
    ctx.restore();
    ctx.restore();

    rr(ctx, cx - cw / 2 + 2, cy - ch / 2 + 2, cw - 4, ch - 4, r);
    ctx.lineWidth = W * 0.0035;
    ctx.strokeStyle = 'rgba(255,255,255,0.42)';
    ctx.stroke();

    sheen(ctx, cx - cw / 2, cy - ch / 2, cw, ch, r, t, 1.45, '#ffffff', 0.34);

    var ink = '#1a0d02';
    ctx.save();
    ctx.globalAlpha = 0.72 * smooth(inv(t, 0.35, 0.65));
    setFont(ctx, '700', W * 0.032);
    ctx.fillStyle = ink;
    trackFill(ctx, 'ZEROTAKEN', cx - cw / 2 + W * 0.070, cy - ch / 2 + H * 0.052, W * 0.012);
    ctx.globalAlpha = 0.45 * smooth(inv(t, 0.45, 0.75));
    setFont(ctx, '700', W * 0.026);
    ctx.fillText('REAL FIND', cx - cw / 2 + W * 0.070, cy - ch / 2 + H * 0.079);
    ctx.restore();

    ctx.save();
    ctx.fillStyle = ink;
    var l1 = '$30K name.', l2 = 'Twelve dollars.';
    var a1 = smooth(inv(t, 0.40, 0.68)), a2 = smooth(inv(t, 0.56, 0.86));
    var s1 = fitSize(ctx, l1, cw * 0.80, W * 0.145, 0);
    setFont(ctx, '700', s1);
    ctx.globalAlpha = a1;
    ctx.fillText(l1, cx - cw * 0.40, cy + W * 0.010 + (1 - a1) * H * 0.02);
    var s3 = fitSize(ctx, l2, cw * 0.80, W * 0.145, 0);
    setFont(ctx, '700', s3);
    ctx.globalAlpha = a2 * 0.82;
    ctx.fillText(l2, cx - cw * 0.40, cy + W * 0.145 + (1 - a2) * H * 0.02);
    ctx.restore();
    ctx.restore();

    var ha = smooth(inv(t, dur - 0.32, dur - 0.02));
    if (ha > 0.01) {
      slab(ctx, {
        x: W / 2, y: H / 2, size: W * 0.20 * lerp(0.7, 1, ha), alpha: ha,
        c1: '#ffffff', c2: C.blue, halo: C.blue, symbol: tldSym('.com')
      });
    }
    ctx.restore();
  }

  /* --- 7. HERO-PEEL + SYMBOL-MORPH · 25.0–30.0 --------------------------- */
  function sceneClose(ctx, t, dur) {
    var cx = W * 0.5;
    var sw = swell(inv(t, 0, 2.0));
    var hue = ramp([C.blue, C.indigo, C.violet, C.ember, C.orange], inv(t, 0.05, 1.90));
    var rise = smooth(inv(t, 0.15, 2.10));
    var cyT = lerp(H * 0.50, H * 0.360, rise) + Math.sin(t * 0.85) * H * 0.004;
    var size = lerp(W * 0.20, W * 0.375, easeOut(inv(t, 0.00, 1.35)));
    var morph = smooth(inv(t, 0.86, 1.22));
    var bodyA = 1 - smooth(inv(t, 1.30, 1.80));
    var freeS = lerp(1, 1.28, smooth(inv(t, 1.24, 2.10)));
    var SNAP = 2.10;
    var snapped = t >= SNAP;
    var flash = 1 - smooth(inv(t, SNAP, SNAP + 0.22));

    ctx.save();
    ambient(ctx, t, snapped ? C.gold : C.violet, 0.6);
    aurora(ctx, t, C.ember, C.orange, snapped ? 0.6 : 0.35);

    glowE(ctx, cx, cyT, W * 0.50 * (0.8 + 0.3 * sw), H * 0.17 * (0.8 + 0.3 * sw), hue, 0.42 * sw);
    // sparks spiral into the mark, then keep orbiting it
    orbit(ctx, cx, cyT, size * (1.6 - 0.5 * smooth(inv(t, 0, 1.6))), size * 1.5, t, 12, hue, 0.55, 0.62, 17);

    var noSym = function () { };
    if (morph < 0.995) {
      slab(ctx, {
        x: cx, y: cyT, size: size, alpha: 1, bodyA: bodyA,
        c1: '#ffffff', c2: hue, halo: hue,
        symbol: tldSym('.com'), symbol2: checkSym, morph: morph,
        symbolCol: mix('#ffffff', hue, 0.42), glowCol: hue
      });
    } else {
      if (bodyA > 0.004) {
        slab(ctx, {
          x: cx, y: cyT, size: size, alpha: 1, bodyA: bodyA,
          c1: '#ffffff', c2: hue, halo: hue, symbol: noSym
        });
      }
      var ms = size * 0.84 * freeS * (1 + 0.035 * osc(t, 0.62));
      ctx.save();
      ctx.translate(cx, cyT);
      ctx.rotate(0.045 * osc(t, 0.30));
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
      var lsw = swell(inv(t, SNAP, dur));
      var s1 = W * 0.150 * (1 + 0.022 * osc(t, 0.62));
      lockup(ctx, cx, H * 0.655, s1, {
        glowCol: C.orange, glowAmt: 0.24 + 0.16 * lsw, swoosh: 0, phase: (t - SNAP) / 1.15
      });
      shockwave(ctx, cx, H * 0.60, inv(t, SNAP, SNAP + 0.55), C.gold, 0.16, W * 2.0);
      shockwave(ctx, cx, H * 0.60, inv(t, SNAP + 0.95, SNAP + 1.85), C.orange, 0.11, W * 2.0);
      shockwave(ctx, cx, H * 0.60, inv(t, SNAP + 2.00, SNAP + 2.90), C.gold, 0.09, W * 2.0);
      glowE(ctx, cx, H * 0.655, W * 0.60 * (0.9 + 0.18 * osc(t, 0.5)), H * 0.10, C.orange, 0.16 + 0.08 * lsw);

      var ua = smooth(inv(t, 2.58, 2.95));
      if (ua > 0.01) {
        ctx.save();
        wipeLabel(ctx, 'ZEROTAKEN.COM', H * 0.815, W * 0.036, '#ffffff',
          W * 0.013 * (1 + 0.05 * osc(t, 0.28)), inv(t, 2.58, 3.30), ua * 0.75);
        ctx.restore();
      }
    }

    if (flash > 0.01 && snapped) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexa('#ffffff', 0.38 * flash * flash);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    var end = smooth(inv(t, dur - 0.22, dur));
    if (end > 0.001) { ctx.fillStyle = hexa('#000000', end * 0.55); ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  /* ==========================================================================
     6. TIMELINE + CAMERA
     ========================================================================== */
  function cam(s0, s1, dx0, dx1, dy0, dy1, ease) {
    return function (t, dur) {
      var e = (ease || easeOut)(inv(t, 0, dur));
      return { s: lerp(s0, s1, e), dx: lerp(dx0, dx1, e) * W, dy: lerp(dy0, dy1, e) * H };
    };
  }
  var TIMELINE = [
    { name: 'hook', end: 5.0, fn: sceneHook, cam: cam(1.00, 1.09, 0, 0, 0, -0.012) },
    { name: 'brand', end: 9.0, fn: sceneBrand, cam: cam(1.14, 1.00, 0, 0, 0, 0) },
    { name: 'prompt', end: 14.0, fn: scenePrompt, cam: cam(1.00, 1.06, 0.010, -0.010, 0, 0) },
    { name: 'tlds', end: 18.0, fn: sceneTLDs, cam: cam(1.16, 1.00, 0, 0, 0, 0) },
    { name: 'score', end: 21.0, fn: sceneScore, cam: cam(1.00, 1.07, 0, 0, 0.008, -0.004) },
    { name: 'proof', end: 25.0, fn: sceneProof, cam: cam(1.10, 1.00, -0.012, 0.008, 0, 0) },
    { name: 'close', end: 30.0, fn: sceneClose, cam: cam(1.00, 1.08, 0, 0, 0, -0.006) }
  ];
  var DUR = TIMELINE[TIMELINE.length - 1].end;

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
      if (t < TIMELINE[i].end) {
        var local = t - start, dur = TIMELINE[i].end - start;
        var c = TIMELINE[i].cam ? TIMELINE[i].cam(local, dur) : null;
        ctx.save();
        if (c) {
          ctx.translate(W / 2 + c.dx, H / 2 + c.dy);
          ctx.scale(c.s, c.s);
          ctx.translate(-W / 2, -H / 2);
        }
        TIMELINE[i].fn(ctx, local, dur);
        ctx.restore();
        break;
      }
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
      easeOut4: easeOut4, easeIn: easeIn, easeBack: easeBack, osc: osc,
      hexa: hexa, mix: mix, ramp: ramp, rng: rng, rr: rr, glow: glow, glowE: glowE,
      scrim: scrim, shapeBloom: shapeBloom, strokeBloom: strokeBloom, swell: swell,
      setFont: setFont, trackW: trackW, trackFill: trackFill, fitSize: fitSize,
      centred: centred, wipeLabel: wipeLabel, typeOut: typeOut, caret: caret,
      slab: slab, lockup: lockup, shockwave: shockwave, ambient: ambient,
      aurora: aurora, sheen: sheen, orbit: orbit,
      pathZero: pathZero, pathCheck: pathCheck, checkSym: checkSym,
      tldSym: tldSym, sparkSym: sparkSym
    }
  };
});
