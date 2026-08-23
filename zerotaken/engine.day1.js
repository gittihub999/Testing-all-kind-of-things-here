/* ============================================================================
   ZEROTAKEN — motion promo engine  ·  9:16  ·  1080x1920  ·  30fps  ·  46.0s
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
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
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
    var w = trackW(ctx, txt, sp);
    var max = W * 0.88;
    if (w > max) {                                     // auto-fit
      var k = max / w;
      size *= k; sp *= k;
      setFont(ctx, '700', size);
      w = trackW(ctx, txt, sp);
    }
    var x = (W - w) / 2;
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

  /* headline words rising out of a mask, staggered — the premium alternative
     to a typewriter for anything that is not a search box */
  function riseWords(ctx, txt, y, size, p, o) {
    o = o || {};
    var words = txt.split(' ');
    setFont(ctx, '700', size);
    var sp = ctx.measureText(' ').width;
    var widths = [], total = 0, i;
    for (i = 0; i < words.length; i++) { widths.push(ctx.measureText(words[i]).width); total += widths[i]; }
    total += sp * (words.length - 1);
    var x = (o.left === undefined ? (W - total) / 2 : o.left);
    var stag = o.stagger === undefined ? 0.11 : o.stagger;
    var span = o.span === undefined ? 0.44 : o.span;
    var pa = ctx.globalAlpha;
    for (i = 0; i < words.length; i++) {
      var wp = easeOut(inv(p, i * stag, i * stag + span));
      if (wp > 0.002) {
        var hot = o.hotWords && o.hotWords.indexOf(i) >= 0;
        var col = hot ? (o.hot || C.mint) : (o.ink || C.ink);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - size * 0.16, y - size * 1.06, widths[i] + size * 0.32, size * 1.34);
        ctx.clip();
        ctx.globalAlpha = pa * Math.min(1, wp * 1.7);
        ctx.fillStyle = col;
        ctx.shadowColor = hexa(hot ? col : '#ffffff', hot ? 0.60 : 0.28);
        ctx.shadowBlur = size * (hot ? 0.55 : 0.28);
        ctx.fillText(words[i], x, y + (1 - wp) * size * 0.95);
        ctx.restore();
      }
      x += widths[i] + sp;
    }
    return { width: total, done: p >= (words.length - 1) * stag + span };
  }

  /* anamorphic lens streak — what real bright highlights do to a lens */
  function streak(ctx, x, y, len, col, a) {
    if (a <= 0.003 || len <= 1) return;
    glowE(ctx, x, y, len, Math.max(2, len * 0.032), col, a);
    glowE(ctx, x, y, len * 0.52, Math.max(2, len * 0.011), '#ffffff', a * 0.65);
  }

  function vignette(ctx, amt) {
    var g = ctx.createRadialGradient(W / 2, H * 0.47, Math.min(W, H) * 0.30,
      W / 2, H * 0.47, Math.max(W, H) * 0.70);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.62, 'rgba(0,0,0,' + (amt * 0.30).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(0,0,0,' + amt.toFixed(3) + ')');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  /* film grain, keyed to the OUTPUT frame so it survives motion-blur
     averaging instead of being smoothed away */
  var GRAIN = (function () {
    var r = rng(99173), a = new Float32Array(7000 * 3);
    for (var i = 0; i < 7000; i++) { a[i * 3] = r(); a[i * 3 + 1] = r(); a[i * 3 + 2] = r(); }
    return a;
  })();
  function grain(ctx, t, amt) {
    if (amt <= 0.002) return;
    var f = Math.round(t * FPS);
    var off = (f * 1361) % 5200;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var b = 0; b < 3; b++) {
      ctx.fillStyle = 'rgba(255,255,255,' + (amt * (0.30 + b * 0.34)).toFixed(4) + ')';
      for (var i = b; i < 1500; i += 3) {
        var j = ((i + off) % 7000) * 3;
        ctx.fillRect((GRAIN[j] * W) | 0, (GRAIN[j + 1] * H) | 0, 2, 2);
      }
    }
    ctx.restore();
  }

  function slab(ctx, o) {
    var s = o.size, h = s / 2, r = s * 0.325, a = o.alpha === undefined ? 1 : o.alpha;
    var bodyA = o.bodyA === undefined ? 1 : o.bodyA;
    var DF = o.blur || 0;                                // depth of field
    var setDF = function () { if (DF > 0.25) { try { ctx.filter = 'blur(' + DF.toFixed(1) + 'px)'; } catch (e) { } } };
    var clrDF = function () { if (DF > 0.25) { try { ctx.filter = 'none'; } catch (e) { } } };
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
      try { ctx.filter = 'blur(' + (s * 0.185 + DF).toFixed(1) + 'px)'; } catch (e) { }
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
      setDF();
      rr(ctx, -h, -h, s, s, r);
      var bg = ctx.createLinearGradient(-h, -h, h * 0.5, h);
      bg.addColorStop(0, '#181822'); bg.addColorStop(0.42, '#0a0a12'); bg.addColorStop(1, '#020206');
      ctx.fillStyle = bg; ctx.fill();
      clrDF();
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
    setDF();
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
  /* the swoosh geometry, centred on the origin, optionally drawing on */
  function checkStroke(ctx, s, fill, drawP, lw) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = fill;
    ctx.lineWidth = lw === undefined ? s * 0.1848 : lw;
    var tip = pathCheck(ctx, 0, 0, s, drawP === undefined ? 1 : drawP);
    ctx.stroke();
    ctx.restore();
    return tip;
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
  /* where lockup() would put its swoosh — so a travelling mark can land on it */
  function swooshTarget(ctx, cx, cy, s) {
    setFont(ctx, '700', s);
    var wZ = trackW(ctx, 'ZERO', s * 0.07);
    setFont(ctx, '700', s * 0.94);
    var wT = trackW(ctx, 'taken', s * 0.015);
    var block = Math.max(wZ, wT);
    var left = cx - block / 2 - s * 0.30;
    return { x: left + block + s * 0.62, y: cy + s * 0.20, s: s * 0.92, lw: s * 0.17 };
  }
  function lockup(ctx, cx, cy, s, o) {
    o = o || {};
    var zTrack = s * 0.07, tTrack = s * 0.015;
    var zDX = o.zDX || 0, tDX = o.tDX || 0;
    var zA = o.zA === undefined ? 1 : o.zA, tA = o.tA === undefined ? 1 : o.tA;
    var pAlpha = ctx.globalAlpha;
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
    ctx.globalAlpha = pAlpha * zA;
    trackFill(ctx, 'ZERO', left + (block - wZ) / 2 + zDX, yZ, zTrack);
    ctx.globalAlpha = pAlpha;
    setFont(ctx, '700', s * 0.94);
    if (o.botCol) { ctx.fillStyle = o.botCol; }
    else {
      var gt = ctx.createLinearGradient(left, yT - s * 0.8, left + block, yT);
      gt.addColorStop(0, '#8ef56d'); gt.addColorStop(1, '#3fa020');
      if (ph >= 0) hotStop(gt, ((ph + 0.14) % 1), '#6ee85a', '#e8ffd8');
      ctx.fillStyle = gt;
    }
    ctx.shadowColor = hexa(o.glowCol || '#6ee85a', 0.7);
    ctx.globalAlpha = pAlpha * tA;
    trackFill(ctx, 'taken', left + (block - wT) / 2 + tDX, yT, tTrack);
    ctx.globalAlpha = pAlpha;
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
    var r = lerp(20, maxR, p), th = lerp(90, 340, p);
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

  /* --- 1+2. THE QUESTIONS ------------------------------------------------
     Built from the same glass-and-halo vocabulary as the TLD ring: a
     perspective feed of domain chips, scrolling continuously. Beat one asks
     what you are naming; beat two answers it by striking every line out. */

  var NAME_FEED = [
    'lumen.com', 'northstar.com', 'atlas.com', 'vertex.com', 'quanta.com',
    'orbit.com', 'helix.com', 'summit.com', 'aperture.com', 'cobalt.com',
    'meridian.com', 'kestrel.com', 'lattice.com', 'onyx.com'
  ];

  /* one glass name chip — dark body, halo hugging the silhouette, lit edge */
  function chip(ctx, o) {
    var w = o.w * o.scale, h = o.h * o.scale, r = h / 2;
    if (o.alpha <= 0.004) return;
    var x = o.x - w / 2, y = o.y - h / 2;
    ctx.save();
    ctx.globalAlpha = o.alpha;

    ctx.save();                                          // halo
    ctx.globalCompositeOperation = 'lighter';
    try { ctx.filter = 'blur(' + (h * 0.40).toFixed(1) + 'px)'; } catch (e) { }
    rr(ctx, x - h * 0.06, y - h * 0.06, w + h * 0.12, h + h * 0.12, r);
    var hg = ctx.createLinearGradient(x, y, x + w, y + h);
    hg.addColorStop(0, hexa(o.hue, 0.60 * o.glow));
    hg.addColorStop(0.55, hexa(o.hue2 || o.hue, 0.95 * o.glow));
    hg.addColorStop(1, hexa(o.hue, 0.55 * o.glow));
    ctx.fillStyle = hg; ctx.fill();
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();

    ctx.save();                                          // contact shadow
    rr(ctx, x, y + h * 0.10, w, h, r);
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = h * 0.5; ctx.shadowOffsetY = h * 0.16;
    ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();

    rr(ctx, x, y, w, h, r);                              // body
    var bg = ctx.createLinearGradient(x, y, x + w * 0.5, y + h);
    bg.addColorStop(0, '#191922'); bg.addColorStop(0.45, '#0a0a12'); bg.addColorStop(1, '#030308');
    ctx.fillStyle = bg; ctx.fill();

    rr(ctx, x + 1.5, y + 1.5, w - 3, h - 3, r);          // lit edge
    var eg = ctx.createLinearGradient(x, y, x + w * 0.7, y + h);
    eg.addColorStop(0, hexa(o.hue, 0.70));
    eg.addColorStop(0.28, 'rgba(255,255,255,0.15)');
    eg.addColorStop(0.75, 'rgba(255,255,255,0.03)');
    eg.addColorStop(1, hexa(o.hue2 || o.hue, 0.30));
    ctx.lineWidth = Math.max(1, h * 0.045); ctx.strokeStyle = eg; ctx.stroke();

    var fs = h * 0.42;                                   // the name
    setFont(ctx, '700', fs);
    var tx = x + h * 0.62, ty = o.y + fs * 0.35;
    var tw = ctx.measureText(o.text).width;
    ctx.fillStyle = o.dim > 0 ? mix('#ffffff', '#6d6d80', o.dim) : '#ffffff';
    ctx.shadowColor = hexa(o.hue, 0.5); ctx.shadowBlur = fs * 0.5;
    ctx.fillText(o.text, tx, ty);
    ctx.shadowBlur = 0;

    if (o.strike > 0.001) {                              // struck through
      var sl = tw * clamp(o.strike);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, h * 0.075);
      ctx.strokeStyle = hexa(C.pink, 0.95);
      ctx.shadowColor = hexa(C.pink, 0.9); ctx.shadowBlur = fs * 0.8;
      ctx.beginPath();
      ctx.moveTo(tx - fs * 0.10, o.y + fs * 0.06);
      ctx.lineTo(tx - fs * 0.10 + sl + fs * 0.20, o.y + fs * 0.06);
      ctx.stroke();
      ctx.restore();
    }

    if (o.badge > 0.001) {                               // ✕ TAKEN stamp
      var bs = h * 0.30 * easeBack(clamp(o.badge));
      var bx = x + w - h * 0.62;
      ctx.save();
      ctx.translate(bx, o.y);
      glow(ctx, 0, 0, bs * 3.4, C.pink, 0.60 * clamp(o.badge));
      ctx.beginPath(); ctx.arc(0, 0, bs, 0, TAU);
      ctx.fillStyle = mix('#1b0a12', C.pink, 0.18); ctx.fill();
      ctx.lineWidth = bs * 0.16; ctx.strokeStyle = C.pink; ctx.stroke();
      ctx.lineCap = 'round';
      ctx.lineWidth = bs * 0.24; ctx.strokeStyle = '#ffd8e6';
      ctx.beginPath();
      ctx.moveTo(-bs * 0.34, -bs * 0.34); ctx.lineTo(bs * 0.34, bs * 0.34);
      ctx.moveTo(bs * 0.34, -bs * 0.34); ctx.lineTo(-bs * 0.34, bs * 0.34);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }

  /* the scrolling perspective feed both question beats are built on */
  function feed(ctx, t, o) {
    var count = 11, step = o.step, focusY = o.focusY;
    var top = focusY - step * 4;
    var frac = ((o.scroll % 1) + 1) % 1;
    var base = Math.floor(o.scroll);
    for (var i = count - 1; i >= 0; i--) {
      var yy = top + (i - frac) * step;
      var idx = ((i + base) % NAME_FEED.length + NAME_FEED.length) % NAME_FEED.length;
      var d = (yy - focusY) / (H * 0.34);
      var sc = (1 - Math.min(0.40, Math.abs(d) * 0.30)) * o.scale;
      var al = clamp(1.25 - Math.abs(d) * 1.25) * o.alpha;
      if (al <= 0.005) continue;
      var near = clamp(1 - Math.abs(d) * 1.4);
      var strike = 0, badge = 0, dim = 0;
      if (o.taken) {
        strike = smooth(clamp((focusY - yy) / (step * 0.62)));
        badge = smooth(clamp((focusY - yy + step * 0.12) / (step * 0.5)));
        dim = strike * 0.75;
      }
      chip(ctx, {
        x: W / 2 + Math.sin(t * 0.5 + i * 0.9) * W * 0.006,
        y: yy, w: o.w, h: o.h, scale: sc, alpha: al,
        text: NAME_FEED[idx],
        hue: o.taken ? mix(o.hue, C.pink, strike) : o.hue,
        hue2: o.taken ? mix(o.hue2, C.magenta, strike) : o.hue2,
        glow: (0.35 + 0.65 * near) * (o.taken ? 0.55 + 0.75 * strike : 1) * o.glow,
        strike: strike, badge: badge, dim: dim
      });
    }
    // the feed fades out top and bottom rather than being cut off
    var g1 = ctx.createLinearGradient(0, focusY - step * 4.6, 0, focusY - step * 1.9);
    g1.addColorStop(0, '#000'); g1.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g1; ctx.fillRect(0, focusY - step * 5.2, W, step * 3.3);
    var g2 = ctx.createLinearGradient(0, focusY + step * 2.6, 0, focusY + step * 6.2);
    g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, '#000');
    ctx.fillStyle = g2; ctx.fillRect(0, focusY + step * 2.6, W, step * 3.8);
  }

  /* a headline that rises out of a mask, with a light bar sweeping under it */
  function headline(ctx, t, txt, y, p, o) {
    o = o || {};
    var size = fitSize(ctx, txt, W * 0.86, o.size || W * 0.094, 0);
    setFont(ctx, '700', size);
    scrim(ctx, W / 2, y - size * 0.32, W * 0.64, H * 0.072, o.scrim === undefined ? 0.86 : o.scrim);
    var r = riseWords(ctx, txt, y, size, p, o);
    if (o.sweep !== false && p > 0.98) {
      var q = ((t - (o.sweepFrom || 0)) % 1.5) / 1.5;
      var cx = W / 2;
      var bx = lerp(cx - r.width / 2, cx + r.width / 2, q);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var lg = ctx.createLinearGradient(bx - r.width * 0.24, 0, bx + r.width * 0.24, 0);
      var hc = o.hot || C.mint;
      lg.addColorStop(0, hexa(hc, 0));
      lg.addColorStop(0.5, hexa(hc, 0.80 * Math.sin(q * Math.PI)));
      lg.addColorStop(1, hexa(hc, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(cx - r.width / 2, y + size * 0.30, r.width, Math.max(2, size * 0.032));
      ctx.restore();
    }
    return size;
  }

  /* --- 1. QUESTION ONE · 0.0–4.0 ----------------------------------------- */
  function sceneAsk(ctx, t, dur) {
    var fade = 1, out = 0;
    var sw = swell(inv(t, 0, dur * 0.86));
    var focusY = H * 0.635, step = H * 0.098;

    ctx.save();
    ctx.globalAlpha = fade * (1 - out);
    ambient(ctx, t, C.mint, 0.55);
    aurora(ctx, t, C.mint, C.cyan, 0.40);
    columns(ctx, t, C.mint, 0.50);
    glowE(ctx, W / 2, focusY, W * 0.62, H * 0.13, C.mint, 0.20 * sw);

    // the feed builds as it starts moving — chips arrive, they do not pop in
    var build = lerp(0.42, 1, easeOut(inv(t, 0, 1.25)));
    feed(ctx, t, {
      scroll: 3.4 + easeOut(inv(t, 0, dur)) * 2.1 + t * 0.16,
      focusY: focusY, step: step, w: W * 0.76, h: H * 0.062,
      scale: lerp(0.62, 1, build), alpha: build, glow: 0.55 + 0.45 * sw,
      hue: C.mint, hue2: C.cyan, taken: false
    });

    // a scan bar riding the focus row
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    var q = (t * 0.62) % 1;
    var bw = W * 0.80;
    var sg = ctx.createLinearGradient(W / 2 - bw / 2, 0, W / 2 + bw / 2, 0);
    sg.addColorStop(0, hexa(C.mint, 0));
    sg.addColorStop(clamp(q, 0.02, 0.98), hexa(C.mint, 0.60 * sw));
    sg.addColorStop(1, hexa(C.mint, 0));
    ctx.fillStyle = sg;
    ctx.fillRect(W / 2 - bw / 2, focusY + step * 0.40, bw, Math.max(2, H * 0.0022));
    ctx.restore();

    headline(ctx, t, 'Naming your startup?', H * 0.225, inv(t, 0.22, 1.30),
      { hot: C.mint, hotWords: [2], sweepFrom: 1.30 });

    var la = smooth(inv(t, 1.95, 2.35));
    if (la > 0.01) {
      ctx.save();
      wipeLabel(ctx, 'IDEA  ·  NAME  ·  DOMAIN', H * 0.295, W * 0.028,
        '#ffffff', W * 0.0095, inv(t, 1.95, 2.60), la * 0.48);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 2. QUESTION TWO · 4.0–8.0 ----------------------------------------- */
  function sceneTaken(ctx, t, dur) {
    var out = 0;
    var sw = swell(inv(t, 0, dur * 0.84));
    var focusY = H * 0.635, step = H * 0.098;
    var rush = easeIn(inv(t, dur - 0.70, dur - 0.06));   // the feed runs away at the end

    ctx.save();
    ctx.globalAlpha = 1 - out;
    ambient(ctx, t, C.pink, 0.55);
    aurora(ctx, t, C.pink, C.magenta, 0.50);
    columns(ctx, t, C.pink, 0.55);
    glowE(ctx, W / 2, focusY, W * 0.66, H * 0.15, C.pink, (0.18 + 0.16 * sw) + 0.5 * rush);

    feed(ctx, t, {
      scroll: 6.15 + t * 0.72 + rush * 7.0,
      focusY: focusY, step: step, w: W * 0.76, h: H * 0.062,
      scale: 1, alpha: 1, glow: 0.55 + 0.45 * sw,
      hue: C.violet, hue2: C.indigo, taken: true
    });

    headline(ctx, t, 'Every good .com taken?', H * 0.225, inv(t, 0.12, 1.25),
      { hot: C.pink, hotWords: [2], sweepFrom: 1.25 });

    var la = smooth(inv(t, 1.90, 2.30));
    if (la > 0.01) {
      ctx.save();
      wipeLabel(ctx, 'TAKEN  ·  TAKEN  ·  TAKEN', H * 0.295, W * 0.028,
        C.pink, W * 0.0095, inv(t, 1.90, 2.55), la * 0.55);
      ctx.restore();
    }

    if (rush > 0.01) {                                   // whip out to the reveal
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = hexa('#ffffff', 0.30 * rush * rush);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }
    ctx.restore();
  }


  /* --- 3. THE PREMIUM TRAP · 8.0–12.0 -----------------------------------
     Their users' number one complaint: an AI generator hands you a name, you
     get excited, and it turns out to be a $2,450 aftermarket listing. The
     chip flips from AVAILABLE to a price and gets stamped. */
  function sceneTrap(ctx, t, dur) {
    var cx = W / 2, cy = H * 0.505;
    var cw = W * 0.86, ch = H * 0.102;
    var sw = swell(inv(t, 0, dur * 0.82));

    var inP = easeBack(inv(t, 0.00, 0.52));
    var FLIP0 = 1.42, FLIP1 = 1.74, MID = (FLIP0 + FLIP1) / 2;
    var flipped = t >= MID;
    var fx = t < FLIP0 ? 1 : (t > FLIP1 ? 1 :
      (t < MID ? 1 - easeIn(inv(t, FLIP0, MID)) : easeOut(inv(t, MID, FLIP1))));
    var stamp = smooth(inv(t, 1.80, 2.02));
    var tip = easeIn(inv(t, 3.40, 4.60));            // it tips over and sinks
    var hue = flipped ? mix(C.ember, C.pink, 0.45) : C.mint;

    ctx.save();
    ambient(ctx, t, flipped ? C.pink : C.mint, 0.55);
    aurora(ctx, t, flipped ? C.pink : C.mint, flipped ? C.ember : C.cyan, 0.48);
    columns(ctx, t, flipped ? C.pink : C.mint, 0.45);

    // the traps stacking up behind — receding, out of focus
    for (var k = 0; k < 2; k++) {
      var kp = smooth(inv(t, 2.16 + k * 0.34, 2.80 + k * 0.34));
      if (kp <= 0.002) continue;
      var kfall = 0;
      var ky = cy - H * (0.135 + k * 0.070) * kp + kfall * H * 0.55;
      var ks = 0.80 - k * 0.10;
      ctx.save();
      ctx.globalAlpha = kp * (1 - kfall) * 0.85;
      ctx.translate(cx, ky); ctx.rotate((k - 1) * 0.035 + kfall * 0.25); ctx.translate(-cx, -ky);
      try { ctx.filter = 'blur(' + (2.2 + k * 2.0).toFixed(1) + 'px)'; } catch (e) { }
      priceChip(ctx, cx, ky, cw * ks, ch * ks, ['$4,900', '$12,000'][k], C.pink, 0.9);
      try { ctx.filter = 'none'; } catch (e) { }
      ctx.restore();
    }

    // the hero chip
    ctx.save();
    var hy = cy + (1 - inP) * H * 0.10 + Math.sin(t * 1.15) * H * 0.004 + tip * H * 0.62;
    ctx.globalAlpha = Math.min(1, inP * 1.6);
    ctx.translate(cx, hy); ctx.rotate(tip * 0.30); ctx.translate(-cx, -hy);
    ctx.save();
    ctx.translate(cx, hy); ctx.scale(Math.max(0.02, fx), 1); ctx.translate(-cx, -hy);
    if (!flipped) {
      okChip(ctx, cx, hy, cw, ch, 'northstar.com', C.mint, smooth(inv(t, 0.42, 0.72)) * sw);
    } else {
      priceChip(ctx, cx, hy, cw, ch, '$2,450', C.pink, 0.6 + 0.5 * sw);
    }
    ctx.restore();
    // the edge flash as it turns through the side
    if (fx < 0.30) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      streak(ctx, cx, hy, cw * 0.72, '#ffffff', (1 - fx / 0.30) * 0.85);
      ctx.restore();
    }
    if (stamp > 0.01) {
      var ss = ch * 0.40 * easeBack(stamp);
      ctx.save();
      ctx.translate(cx + cw / 2 - ch * 0.52, hy);
      glow(ctx, 0, 0, ss * 3.6, C.pink, 0.65 * stamp);
      ctx.beginPath(); ctx.arc(0, 0, ss, 0, TAU);
      ctx.fillStyle = mix('#1b0a12', C.pink, 0.20); ctx.fill();
      ctx.lineWidth = ss * 0.16; ctx.strokeStyle = C.pink; ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineWidth = ss * 0.24; ctx.strokeStyle = '#ffd8e6';
      ctx.beginPath();
      ctx.moveTo(-ss * 0.34, -ss * 0.34); ctx.lineTo(ss * 0.34, ss * 0.34);
      ctx.moveTo(ss * 0.34, -ss * 0.34); ctx.lineTo(-ss * 0.34, ss * 0.34);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    if (stamp > 0.01 && stamp < 1) shockwave(ctx, cx, hy, inv(t, 1.80, 2.60), C.pink, 0.30, W * 1.5);

    // headline swaps from the promise to the price
    var s1 = 1 - smooth(inv(t, 1.30, 1.62));
    if (s1 > 0.01) {
      ctx.save();
      ctx.globalAlpha = s1;
      ctx.translate(0, -(1 - s1) * H * 0.045);
      headline(ctx, t, 'Available.', H * 0.235, inv(t, 0.20, 0.90),
        { hot: C.mint, hotWords: [0], sweep: false });
      ctx.restore();
    }
    var s2 = smooth(inv(t, 1.62, 1.96));
    if (s2 > 0.01) {
      ctx.save();
      ctx.globalAlpha = s2;
      ctx.translate(0, (1 - s2) * H * 0.045);
      headline(ctx, t, 'For $2,450.', H * 0.235, inv(t, 1.62, 2.30),
        { hot: C.pink, hotWords: [1], sweepFrom: 2.30 });
      ctx.restore();
    }

    var la = smooth(inv(t, 2.30, 2.70));
    if (la > 0.01) {
      ctx.save();
      wipeLabel(ctx, 'PREMIUM · AFTERMARKET · BROKER MARKUP', H * 0.815, W * 0.024,
        C.pink, W * 0.0060, inv(t, 2.30, 3.10), la * 0.62);
      ctx.restore();
    }
    ctx.restore();
  }

  /* a wide result chip in its two states */
  function chipShell(ctx, x, y, w, h, hue, glowAmt) {
    var r = h / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    try { ctx.filter = 'blur(' + (h * 0.42).toFixed(1) + 'px)'; } catch (e) { }
    rr(ctx, x - w / 2, y - h / 2, w, h, r);
    ctx.fillStyle = hexa(hue, 0.55 * glowAmt); ctx.fill();
    try { ctx.filter = 'none'; } catch (e) { }
    ctx.restore();
    ctx.save();
    rr(ctx, x - w / 2, y - h / 2 + h * 0.10, w, h, r);
    ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = h * 0.5; ctx.shadowOffsetY = h * 0.14;
    ctx.fillStyle = '#000'; ctx.fill();
    ctx.restore();
    rr(ctx, x - w / 2, y - h / 2, w, h, r);
    var bg = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w * 0.1, y + h / 2);
    bg.addColorStop(0, '#1b1b25'); bg.addColorStop(0.45, '#0b0b13'); bg.addColorStop(1, '#030308');
    ctx.fillStyle = bg; ctx.fill();
    rr(ctx, x - w / 2 + 2, y - h / 2 + 2, w - 4, h - 4, r);
    var eg = ctx.createLinearGradient(x - w / 2, y - h / 2, x + w * 0.6, y + h / 2);
    eg.addColorStop(0, hexa(hue, 0.80));
    eg.addColorStop(0.30, 'rgba(255,255,255,0.16)');
    eg.addColorStop(1, hexa(hue, 0.30));
    ctx.lineWidth = Math.max(1.4, h * 0.030); ctx.strokeStyle = eg; ctx.stroke();
  }
  function okChip(ctx, x, y, w, h, text, hue, badge) {
    chipShell(ctx, x, y, w, h, hue, 0.55 + 0.45 * badge);
    var right = x + w / 2 - h * 0.42;
    var bp = clamp(badge);
    setFont(ctx, '700', h * 0.185);
    var lblw = ctx.measureText('AVAILABLE').width;
    var bs = h * 0.185;
    if (bp > 0.01) {
      ctx.save();
      ctx.globalAlpha = ctx.globalAlpha * bp * 0.92;
      ctx.fillStyle = hue;
      ctx.fillText('AVAILABLE', right - lblw, y + h * 0.065);
      ctx.restore();
      var bx = right - lblw - h * 0.26 - bs;
      var bss = bs * easeBack(bp);
      ctx.save();
      ctx.translate(bx, y);
      glow(ctx, 0, 0, bss * 3.4, hue, 0.55 * bp);
      ctx.beginPath(); ctx.arc(0, 0, bss, 0, TAU);
      ctx.fillStyle = mix('#0b1b12', hue, 0.20); ctx.fill();
      ctx.lineWidth = bss * 0.16; ctx.strokeStyle = hue; ctx.stroke();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = bss * 0.26; ctx.strokeStyle = '#ddffee';
      ctx.beginPath();
      ctx.moveTo(-bss * 0.40, bss * 0.02); ctx.lineTo(-bss * 0.10, bss * 0.32); ctx.lineTo(bss * 0.44, -bss * 0.34);
      ctx.stroke();
      ctx.restore();
    }
    var limit = right - lblw - h * 0.26 - bs * 2 - h * 0.30;
    var fs = h * 0.30;
    setFont(ctx, '700', fs);
    var tx = x - w / 2 + h * 0.45;
    if (tx + ctx.measureText(text).width > limit) {
      fs *= (limit - tx) / ctx.measureText(text).width;
      setFont(ctx, '700', fs);
    }
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = hexa(hue, 0.5); ctx.shadowBlur = fs * 0.6;
    ctx.fillText(text, tx, y + fs * 0.35);
    ctx.shadowBlur = 0;
  }
  function priceChip(ctx, x, y, w, h, price, hue, glowAmt) {
    chipShell(ctx, x, y, w, h, hue, glowAmt);
    setFont(ctx, '700', h * 0.185);
    var pw2 = ctx.measureText('PREMIUM').width;
    ctx.fillStyle = hexa(hue, 0.95);
    ctx.fillText('PREMIUM', x + w / 2 - h * 1.30 - pw2, y + h * 0.065);
    var fs = h * 0.38;
    setFont(ctx, '700', fs);
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = hexa(hue, 0.65); ctx.shadowBlur = fs * 0.7;
    ctx.fillText(price, x - w / 2 + h * 0.45, y + fs * 0.35);
    ctx.shadowBlur = 0;
  }

  /* --- 2. SHOCKWAVE + WORDMARK-SNAP · 5.0–9.0 ---------------------------- */
  function sceneBrand(ctx, t, dur) {
    var out = 0;
    var cx = W * 0.5, cy = H * 0.44;
    var SNAP = 0.98;
    var snapped = t >= SNAP;
    var flash = 1 - smooth(inv(t, SNAP, SNAP + 0.20));

    ctx.save();
    ctx.globalAlpha = 1 - out;

    ambient(ctx, t, snapped ? C.gold : C.cyan, 0.5);
    aurora(ctx, t, snapped ? C.ember : C.blue, snapped ? C.orange : C.violet, 0.55);

    // a ring is always travelling outward
    shockwave(ctx, cx, cy, inv(t, 0.00, 0.95), mix(C.mint, C.blue, 0.55), 0.70, W * 1.95);
    shockwave(ctx, cx, cy, inv(t, 0.34, 1.30), C.violet, 0.40, W * 1.45);
    shockwave(ctx, cx, cy, inv(t, 1.05, 2.05), C.orange, 0.22, W * 1.85);
    shockwave(ctx, cx, cy, inv(t, 2.10, 3.10), C.gold, 0.14, W * 1.85);
    shockwave(ctx, cx, cy, inv(t, 3.00, 4.00), C.ember, 0.11, W * 1.85);
    shockwave(ctx, cx, cy, inv(t, 4.10, 5.10), C.gold, 0.10, W * 1.85);
    shockwave(ctx, cx, cy, inv(t, 5.10, 6.05), C.orange, 0.09, W * 1.85);

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

      // two labels, the second replacing the first on a vertical swap
      var l1 = smooth(inv(t, 1.50, 1.92)) * (1 - smooth(inv(t, 3.00, 3.30)));
      if (l1 > 0.01) {
        ctx.save();
        ctx.globalAlpha = l1;
        ctx.translate(0, -smooth(inv(t, 3.00, 3.30)) * H * 0.035);
        wipeLabel(ctx, 'AI DOMAIN NAME GENERATOR', cy + H * 0.112, W * 0.029, '#ffffff',
          W * 0.0090 * (1 + 0.05 * osc(t, 0.25)), inv(t, 1.50, 2.20), 0.60);
        ctx.restore();
      }
      var l2 = smooth(inv(t, 3.22, 3.56));
      if (l2 > 0.01) {
        ctx.save();
        ctx.globalAlpha = l2;
        ctx.translate(0, (1 - l2) * H * 0.035);
        wipeLabel(ctx, 'ONLY NAMES YOU CAN ACTUALLY REGISTER', cy + H * 0.112, W * 0.026,
          mix(C.gold, '#ffffff', 0.45), W * 0.0070, inv(t, 3.22, 4.20), 0.72);
        ctx.restore();
      }
      streak(ctx, cx, cy + s1 * 0.62, W * 0.80, C.gold, 0.055 + 0.055 * sw);
    }

    if (flash > 0.01 && snapped) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      streak(ctx, cx, cy, W * 1.5, '#fff0d0', 0.75 * flash);
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
    var fade = 1;
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
      wipeLabel(ctx, 'DESCRIBE  YOUR  IDEA', H * 0.315, W * 0.030, '#ffffff',
        W * 0.010, inv(t, 0.15, 0.85), ca * 0.52);
      ctx.restore();
      ctx.save();
      wipeLabel(ctx, 'AI DOMAIN NAME GENERATOR', H * 0.815, W * 0.026, mix(C.mint, '#ffffff', 0.4),
        W * 0.0080, inv(t, 0.60, 1.60), ca * 0.50);
      ctx.restore();
    }

    for (var i = 0; i < lines.length; i++) {
      var t0 = i * each, p = (t - t0) / each;
      if (p < -0.09 || p > 1.00) continue;

      var inP = easeOut(inv(p, -0.09, 0.15));
      var outP = (i === lines.length - 1) ? 0 : smooth(inv(p, 0.80, 0.99));
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
    var fade = 1;
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
      wipeLabel(ctx, '240+ EXTENSIONS · REGISTRY DIRECT · NO CACHE', H * 0.796, W * 0.0235, '#ffffff',
        W * 0.0095, inv(t, dur * 0.34, dur * 0.72), fade * ca * 0.50);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 5. STAT-SLAM · 18.0–21.0 ------------------------------------------ */
  function sceneScore(ctx, t, dur) {
    var fade = 1;
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

    shockwave(ctx, cx, cy, inv(t, 1.90, 2.70), hue, 0.16, W * 1.7);
    shockwave(ctx, cx, cy, inv(t, 2.90, 3.70), C.magenta, 0.13, W * 1.7);

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

  /* --- 10. THE LOGO BUILD · 40.0–46.0 ------------------------------------
     Everything the film has shown collapses into the mark: the rejected names
     spiral in and are absorbed, the tile becomes a check, the check draws
     itself, then travels down and lands as the swoosh of the wordmark while
     ZERO and taken fly in to meet it. Nothing appears from nowhere. */
  function sceneClose(ctx, t, dur) {
    var cx = W * 0.5;
    var sw = swell(inv(t, 0, 2.6));
    var hue = ramp([C.blue, C.indigo, C.violet, C.ember, C.orange], inv(t, 0.20, 2.30));

    var tileY = H * 0.315;
    var tileS = lerp(W * 0.20, W * 0.335, easeOut(inv(t, 0.00, 1.30)));
    var morph = smooth(inv(t, 0.62, 1.24));
    var bodyA = 1 - smooth(inv(t, 1.24, 1.86));
    var drawP = smooth(inv(t, 1.50, 2.16));          // the mark draws itself
    var TRAVEL0 = 2.24, SNAP = 2.92;
    var trav = easeInOut(inv(t, TRAVEL0, SNAP - 0.05));
    var snapped = t >= SNAP;
    var flash = 1 - smooth(inv(t, SNAP, SNAP + 0.24));

    var lockS = W * 0.150 * (1 + (snapped ? 0.020 * osc(t, 0.62) : 0));
    var lockY = H * 0.500;
    var tgt = swooshTarget(ctx, cx, lockY, lockS);
    var grow = lerp(0.52, 1.06, smooth(inv(t, 1.20, 2.14)));

    ctx.save();
    ambient(ctx, t, snapped ? C.gold : C.violet, 0.60);
    aurora(ctx, t, C.ember, C.orange, snapped ? 0.55 : 0.32);
    columns(ctx, t, snapped ? C.gold : C.violet, 0.35);

    /* --- the rejected names spiral in and are absorbed ------------------- */
    var absorbFlash = 0;
    for (var i = 0; i < 10; i++) {
      var t0i = 0.02 + i * 0.042, t1i = 0.62 + i * 0.042;
      var gp = easeIn(inv(t, t0i, t1i));
      absorbFlash = Math.max(absorbFlash, 1 - Math.min(1, Math.abs(t - t1i) / 0.11));
      if (gp >= 0.999 || gp <= 0.001) continue;
      var ang = (i / 10) * TAU + 1.15 + gp * 1.35;
      var rad = lerp(Math.max(W, H) * 0.52, tileS * 0.42, gp);
      var gx = cx + Math.cos(ang) * rad * 0.72;
      var gy = tileY + Math.sin(ang) * rad * 0.62;
      var gs = lerp(1, 0.28, gp);
      ctx.save();
      ctx.globalAlpha = Math.min(1, (1 - gp) * 2.2) * 0.9;
      chip(ctx, {
        x: gx, y: gy, w: W * 0.30, h: H * 0.032, scale: gs, alpha: 1,
        text: NAME_FEED[(i * 3 + 1) % NAME_FEED.length],
        hue: mix(C.violet, hue, gp), hue2: mix(C.indigo, C.gold, gp),
        glow: 0.35 + 0.75 * gp, strike: 0, badge: 0, dim: 0.55 * (1 - gp)
      });
      ctx.restore();
    }
    if (absorbFlash > 0.02 && t < 1.30) {
      glowE(ctx, cx, tileY, tileS * 1.5 * absorbFlash, tileS * 1.1 * absorbFlash,
        '#ffffff', 0.30 * absorbFlash);
    }

    glowE(ctx, cx, tileY, W * 0.50 * (0.8 + 0.3 * sw), H * 0.17 * (0.8 + 0.3 * sw),
      hue, (0.42 * sw) * (1 - trav * 0.55));
    var orbY = lerp(tileY, lockY + lockS * 0.35, trav);
    orbit(ctx, cx, orbY, lerp(tileS * 1.7, W * 0.46, trav), lerp(tileS * 1.5, H * 0.15, trav),
      t, 14, hue, 0.55, 0.62, 17);

    /* --- tile -> check -> travelling mark -------------------------------- */
    if (morph < 0.995 || bodyA > 0.004) {
      slab(ctx, {
        x: cx, y: tileY, size: tileS, alpha: 1, bodyA: bodyA,
        c1: '#ffffff', c2: hue, halo: hue,
        symbol: tldSym('.com'),
        symbol2: function (ctx2, s2, fill) { checkStroke(ctx2, s2 * 0.62, fill); },
        morph: morph, symbolCol: mix('#ffffff', hue, 0.42), glowCol: hue
      });
    }
    if (morph > 0.99) {
      // position and size interpolate straight onto the lockup's swoosh
      var bow = Math.sin(trav * Math.PI) * H * 0.055;
      var mx = lerp(cx, tgt.x, trav);
      var my = lerp(tileY, tgt.y, trav) - bow;
      var ms = lerp(tileS * grow, tgt.s, trav);
      var mlw = lerp(tileS * grow * 0.1848, tgt.lw, trav);
      var mAlpha = snapped ? 0 : 1;                  // the lockup takes over
      if (mAlpha > 0 && bodyA < 0.6) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (1 - bodyA) * 2.2);
        ctx.translate(mx, my);
        ctx.rotate((1 - trav) * 0.045 * osc(t, 0.30));
        strokeBloom(ctx, function () { pathCheck(ctx, 0, 0, ms, drawP); },
          mlw, hue, (0.55 + 0.75 * sw) * lerp(0.55, 1, 1 - bodyA));
        var cg = ctx.createLinearGradient(-ms * 0.5, ms * 0.3, ms * 0.56, -ms * 0.42);
        cg.addColorStop(0, '#ffe6bb'); cg.addColorStop(0.5, C.gold); cg.addColorStop(1, hue);
        ctx.shadowColor = hexa(hue, 0.95); ctx.shadowBlur = ms * 0.40;
        var tip = checkStroke(ctx, ms, cg, drawP, mlw);
        if (drawP < 0.995 && tip) {                  // bright leading dot
          ctx.globalCompositeOperation = 'lighter';
          ctx.fillStyle = '#fff';
          ctx.shadowColor = '#fff'; ctx.shadowBlur = ms * 0.6;
          ctx.beginPath(); ctx.arc(tip[0], tip[1], mlw * 0.62, 0, TAU); ctx.fill();
          streak(ctx, tip[0], tip[1], ms * 0.9, '#ffe6bb', 0.55);
        }
        ctx.restore();
      }
    }

    /* --- the wordmark converges on it ------------------------------------ */
    var conv = easeOut4(inv(t, TRAVEL0 + 0.06, SNAP - 0.04));
    if (conv > 0.002 || snapped) {
      var land = snapped ? 1 : conv * 0.96;
      var dx = (1 - land) * W * 0.62;
      var la = Math.min(1, conv * 1.8);
      // motion trails behind each half
      if (!snapped && conv < 0.97) {
        for (var g = 1; g <= 2; g++) {
          ctx.save();
          ctx.globalAlpha = 0.10 * (1 - conv) / g;
          lockup(ctx, cx, lockY, lockS, {
            glowCol: C.orange, glowAmt: 0.06, swoosh: 0,
            zDX: -dx - g * W * 0.030, tDX: dx + g * W * 0.030, zA: la, tA: la
          });
          ctx.restore();
        }
      }
      ctx.save();
      lockup(ctx, cx, lockY, lockS, {
        glowCol: C.orange, glowAmt: 0.24 + 0.16 * sw,
        swoosh: snapped ? 1 : 0,
        phase: snapped ? (t - SNAP) / 1.15 : undefined,
        zDX: -dx, tDX: dx, zA: la, tA: la
      });
      ctx.restore();
    }

    if (snapped) {
      shockwave(ctx, cx, lockY, inv(t, SNAP, SNAP + 0.55), C.gold, 0.16, W * 2.0);
      shockwave(ctx, cx, lockY, inv(t, SNAP + 0.95, SNAP + 1.85), C.orange, 0.11, W * 2.0);
      shockwave(ctx, cx, lockY, inv(t, SNAP + 2.00, SNAP + 2.90), C.gold, 0.09, W * 2.0);
      glowE(ctx, cx, lockY + lockS * 0.35, W * 0.60 * (0.9 + 0.18 * osc(t, 0.5)), H * 0.11,
        C.orange, 0.18 + 0.09 * sw);
      // a shine runs the swoosh on a loop
      var shq = ((t - SNAP) % 1.6) / 1.6;
      if (shq < 0.45) {
        streak(ctx, tgt.x, tgt.y, tgt.s * 1.5, '#fff2d8',
          0.42 * Math.sin(shq / 0.45 * Math.PI));
      }

      var ua = smooth(inv(t, 3.44, 3.82));
      if (ua > 0.01) {
        ctx.save();
        wipeLabel(ctx, 'ZEROTAKEN.COM', H * 0.648, W * 0.036, '#ffffff',
          W * 0.013 * (1 + 0.05 * osc(t, 0.28)), inv(t, 3.44, 4.16), ua * 0.78);
        ctx.restore();
      }

      var ca = easeBack(inv(t, 4.28, 4.86));
      if (ca > 0.004) {
        ctx.save();
        var cw2 = W * 0.46, ch2 = H * 0.048;
        var cy2 = H * 0.735 - ch2 / 2 + (1 - clamp(ca)) * H * 0.030;
        var cx2 = cx - cw2 / 2;
        ctx.globalAlpha = Math.min(1, ca * 1.6);
        var lsw = swell(inv(t, SNAP, dur));
        shapeBloom(ctx, function (k) {
          rr(ctx, cx2 - cw2 * (k - 1) * 0.12, cy2 - ch2 * (k - 1) * 0.5,
            cw2 * (1 + (k - 1) * 0.24), ch2 * k, ch2 * k / 2);
        }, C.orange, 0.75 * (0.6 + 0.5 * lsw), [[2.2, 0.20], [1.7, 0.26], [1.3, 0.30], [1.1, 0.32]]);
        rr(ctx, cx2, cy2, cw2, ch2, ch2 / 2);
        var cg2 = ctx.createLinearGradient(cx2, cy2, cx2 + cw2, cy2 + ch2);
        cg2.addColorStop(0, '#ffb347'); cg2.addColorStop(1, C.orange);
        ctx.fillStyle = cg2; ctx.fill();
        setFont(ctx, '700', W * 0.030);
        var lbl = 'FREE  TO  SEARCH';
        var lw2 = trackW(ctx, lbl, W * 0.010);
        ctx.fillStyle = '#1a0d02';
        trackFill(ctx, lbl, cx - lw2 / 2, cy2 + ch2 * 0.66, W * 0.010);
        sheen(ctx, cx2, cy2, cw2, ch2, ch2 / 2, t - 4.28, 1.5, '#ffffff', 0.45);
        ctx.restore();
      }
    }

    if (flash > 0.01 && snapped) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      streak(ctx, cx, lockY, W * 1.6, '#fff0d0', 0.55 * flash);
      ctx.fillStyle = hexa('#ffffff', 0.24 * flash * flash);
      ctx.fillRect(0, 0, W, H);
      ctx.restore();
    }

    var end = smooth(inv(t, dur - 0.22, dur));
    if (end > 0.001) { ctx.fillStyle = hexa('#000000', end * 0.55); ctx.fillRect(0, 0, W, H); }
    ctx.restore();
  }

  /* --- 8. SOCIAL HANDLES · 32.0–36.0 -------------------------------------
     Their feature nobody else promotes: the same name checked as a handle on
     five platforms at once. Written as labels, not logos. */
  var PLATFORMS = ['YT', 'IG', 'TT', 'FB', 'PIN'];
  function sceneSocial(ctx, t, dur) {
    var cx = W / 2, rowY = H * 0.605;
    var size = W * 0.148, gap = W * 0.038;
    var span = PLATFORMS.length * size + (PLATFORMS.length - 1) * gap;
    var x0 = cx - span / 2 + size / 2;
    var sw = swell(inv(t, 0, dur * 0.86));
    var hues = [C.magenta, C.pink, C.cyan, C.blue, C.ember];

    ctx.save();
    ambient(ctx, t, C.cyan, 0.55);
    aurora(ctx, t, C.magenta, C.cyan, 0.45);
    columns(ctx, t, C.cyan, 0.45);

    headline(ctx, t, 'One handle. Everywhere.', H * 0.225, inv(t, 0.10, 1.20),
      { hot: C.cyan, hotWords: [2], sweepFrom: 1.20 });

    // the handle itself, carried down from the name
    var ha = easeBack(inv(t, 0.18, 0.78));
    if (ha > 0.002) {
      var hw = W * 0.56, hh = H * 0.072;
      var hy = H * 0.395 + (1 - clamp(ha)) * H * 0.05 + Math.sin(t * 1.2) * H * 0.0035;
      ctx.save();
      ctx.globalAlpha = Math.min(1, ha * 1.5);
      chipShell(ctx, cx, hy, hw, hh, C.mint, 0.55 + 0.45 * sw);
      setFont(ctx, '700', hh * 0.44);
      var lbl = '@northstar';
      var lw = ctx.measureText(lbl).width;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = hexa(C.mint, 0.55); ctx.shadowBlur = hh * 0.6;
      ctx.fillText(lbl, cx - lw / 2, hy + hh * 0.16);
      sheen(ctx, cx - hw / 2, hy - hh / 2, hw, hh, hh / 2, t, 1.7, '#ffffff', 0.26);
      ctx.restore();
    }

    // a light line drawing left to right through the row
    var dp = smooth(inv(t, 0.62, 1.60));
    if (dp > 0.002) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      var lx0 = x0 - size * 0.42, lx1 = x0 + span - size * 0.58;
      var lx = lerp(lx0, lx1, dp);
      var lg = ctx.createLinearGradient(lx0, 0, lx1, 0);
      lg.addColorStop(0, hexa(C.cyan, 0.55));
      lg.addColorStop(1, hexa(C.cyan, 0.55));
      ctx.strokeStyle = lg; ctx.lineWidth = Math.max(2, H * 0.0022);
      ctx.shadowColor = hexa(C.cyan, 0.9); ctx.shadowBlur = H * 0.02;
      ctx.beginPath(); ctx.moveTo(lx0, rowY); ctx.lineTo(lx, rowY); ctx.stroke();
      if (dp < 0.99) glow(ctx, lx, rowY, W * 0.05, '#ffffff', 0.75);
      // a pulse keeps running the finished line
      if (dp > 0.99) {
        var pq = ((t - 1.60) % 1.15) / 1.15;
        var px2 = lerp(lx0, lx1, pq);
        var pg = ctx.createLinearGradient(px2 - W * 0.13, 0, px2 + W * 0.13, 0);
        pg.addColorStop(0, hexa(C.cyan, 0));
        pg.addColorStop(0.5, hexa('#ffffff', 0.85 * Math.sin(pq * Math.PI)));
        pg.addColorStop(1, hexa(C.cyan, 0));
        ctx.strokeStyle = pg; ctx.lineWidth = Math.max(3, H * 0.0035);
        ctx.beginPath(); ctx.moveTo(lx0, rowY); ctx.lineTo(lx1, rowY); ctx.stroke();
        glow(ctx, px2, rowY, W * 0.035, '#ffffff', 0.45 * Math.sin(pq * Math.PI));
      }
      ctx.restore();
    }

    for (var i = 0; i < PLATFORMS.length; i++) {
      var ap = easeBack(inv(t, 0.10 + i * 0.085, 0.72 + i * 0.085));
      if (ap <= 0.002) continue;
      var bob = Math.sin(t * 1.35 + i * 1.15) * H * 0.011;
      slab(ctx, {
        x: x0 + i * (size + gap),
        y: rowY + (1 - clamp(ap)) * H * 0.09 + bob,
        size: size * lerp(0.82, 1, clamp(ap)),
        rot: 0.03 * Math.sin(t * 0.85 + i),
        alpha: Math.min(1, ap * 1.6),
        c1: '#ffffff', c2: mix(hues[i], '#ffffff', 0.15 + 0.15 * (0.5 + 0.5 * Math.sin(t * 1.4 + i))),
        halo: hues[i], symbol: tldSym(PLATFORMS[i]),
        badge: smooth(inv(t, 1.05 + i * 0.12, 1.34 + i * 0.12))
      });
    }

    var la = smooth(inv(t, 1.70, 2.10));
    if (la > 0.01) {
      ctx.save();
      wipeLabel(ctx, 'YOUTUBE · INSTAGRAM · TIKTOK · FACEBOOK · PINTEREST', H * 0.775,
        W * 0.022, '#ffffff', W * 0.0040, inv(t, 1.70, 2.70), la * 0.52);
      ctx.restore();
    }
    ctx.restore();
  }

  /* --- 9. PRIVACY · 36.0–40.0 --------------------------------------------
     No front-running: searches stay in local storage. A browser pane with the
     bookmarks inside, a lock that closes, and broker darts that never land. */
  function scenePrivacy(ctx, t, dur) {
    var cx = W / 2, cy = H * 0.545;
    var pw = W * 0.66, ph = H * 0.235, r = W * 0.055;
    var sw = swell(inv(t, 0, dur * 0.86));
    var inP = easeOut4(inv(t, 0.00, 0.62));
    var LOCK = 1.05;
    var lock = smooth(inv(t, 0.72, LOCK));
    var snapL = 1 - smooth(inv(t, LOCK, LOCK + 0.24));

    ctx.save();
    ambient(ctx, t, C.mint, 0.55);
    aurora(ctx, t, C.mint, C.green, 0.24);
    columns(ctx, t, C.mint, 0.40);

    headline(ctx, t, 'Never leaves your browser.', H * 0.225, inv(t, 0.10, 1.25),
      { hot: C.mint, hotWords: [3], sweepFrom: 1.25, size: W * 0.082 });

    // broker darts that dissolve on the boundary
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (var d = 0; d < 8; d++) {
      var q = ((t * 0.86 + d * 0.127) % 1);
      var ang = (d / 8) * TAU + 0.42 + Math.sin(d * 2.1) * 0.35;
      var far = Math.max(W, H) * 0.62, near = pw * 0.62;
      var rr2 = lerp(far, near, easeOut(q));
      var dx = cx + Math.cos(ang) * rr2, dy = cy + Math.sin(ang) * rr2 * 0.85;
      var hit = clamp((q - 0.72) / 0.28);
      var a = (1 - hit) * 1.00 * clamp(q * 4);
      if (a > 0.01) {
        ctx.save();
        ctx.translate(dx, dy); ctx.rotate(ang + Math.PI);
        var dl = W * 0.070;
        var dg = ctx.createLinearGradient(-dl, 0, dl * 0.3, 0);
        dg.addColorStop(0, hexa(C.pink, 0)); dg.addColorStop(1, hexa(C.pink, a));
        ctx.fillStyle = dg;
        ctx.beginPath();
        ctx.moveTo(dl * 0.3, 0); ctx.lineTo(-dl, -W * 0.008); ctx.lineTo(-dl, W * 0.008);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (hit > 0.02 && hit < 1) {
        var hx = cx + Math.cos(ang) * near, hy2 = cy + Math.sin(ang) * near * 0.85;
        glow(ctx, hx, hy2, W * 0.13 * hit, C.mint, 0.75 * (1 - hit));
      }
    }
    ctx.restore();

    // the pane
    var py = cy + (1 - inP) * H * 0.06;
    ctx.save();
    ctx.globalAlpha = Math.min(1, inP * 1.6);
    shapeBloom(ctx, function (k) {
      rr(ctx, cx - pw * k / 2, py - ph * k / 2, pw * k, ph * k, r * k);
    }, C.mint, 0.34 * sw, [[1.9, 0.16], [1.5, 0.22], [1.25, 0.26], [1.08, 0.28]]);
    rr(ctx, cx - pw / 2, py - ph / 2, pw, ph, r);
    var bg = ctx.createLinearGradient(cx - pw / 2, py - ph / 2, cx + pw * 0.2, py + ph / 2);
    bg.addColorStop(0, '#141a18'); bg.addColorStop(0.5, '#080c0b'); bg.addColorStop(1, '#020403');
    ctx.fillStyle = bg; ctx.fill();
    rr(ctx, cx - pw / 2 + 2, py - ph / 2 + 2, pw - 4, ph - 4, r);
    var eg = ctx.createLinearGradient(cx - pw / 2, py - ph / 2, cx + pw * 0.5, py + ph / 2);
    eg.addColorStop(0, hexa(C.mint, 0.75));
    eg.addColorStop(0.35, 'rgba(255,255,255,0.14)');
    eg.addColorStop(1, hexa(C.green, 0.30));
    ctx.lineWidth = Math.max(1.5, H * 0.0022); ctx.strokeStyle = eg; ctx.stroke();

    // a scan sweeping down the pane
    ctx.save();
    rr(ctx, cx - pw / 2, py - ph / 2, pw, ph, r); ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    var sq2 = ((t * 0.55) % 1);
    var sy2 = lerp(py - ph / 2, py + ph / 2, sq2);
    var sgd = ctx.createLinearGradient(0, sy2 - H * 0.018, 0, sy2 + H * 0.018);
    sgd.addColorStop(0, hexa(C.mint, 0));
    sgd.addColorStop(0.5, hexa(C.mint, 0.22 * Math.sin(sq2 * Math.PI)));
    sgd.addColorStop(1, hexa(C.mint, 0));
    ctx.fillStyle = sgd;
    ctx.fillRect(cx - pw / 2, sy2 - H * 0.018, pw, H * 0.036);
    ctx.restore();

    // browser chrome
    ctx.save();
    ctx.globalAlpha = 0.45;
    for (var b = 0; b < 3; b++) {
      ctx.beginPath();
      ctx.arc(cx - pw / 2 + W * 0.055 + b * W * 0.032, py - ph / 2 + H * 0.030, W * 0.0085, 0, TAU);
      ctx.fillStyle = ['#ff5f57', '#febc2e', '#28c840'][b]; ctx.fill();
    }
    ctx.restore();

    // the bookmarks living inside it
    for (var i = 0; i < 3; i++) {
      var ca = smooth(inv(t, 0.42 + i * 0.13, 0.86 + i * 0.13));
      if (ca <= 0.004) continue;
      var chy = py - ph * 0.06 + i * H * 0.048 + Math.sin(t * 1.1 + i * 1.4) * H * 0.0025;
      ctx.save();
      ctx.globalAlpha = Math.min(1, inP * 1.6) * ca * 0.95;
      var cw2 = pw * 0.72, ch2 = H * 0.038;
      rr(ctx, cx - cw2 / 2, chy - ch2 / 2, cw2, ch2, ch2 / 2);
      ctx.fillStyle = 'rgba(10,16,13,0.95)'; ctx.fill();
      var hl = Math.pow(Math.max(0, Math.sin((t * 0.55 - i * 0.22) * Math.PI * 2)), 6);
      ctx.lineWidth = 1.4 + hl * 1.6;
      ctx.strokeStyle = hexa(C.mint, 0.35 + 0.45 * hl); ctx.stroke();
      setFont(ctx, '700', ch2 * 0.46);
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.fillText(['northstar.com', 'lumen.io', 'kestrel.ai'][i],
        cx - cw2 / 2 + W * 0.030, chy + ch2 * 0.17);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = W * 0.005; ctx.strokeStyle = C.mint;
      var bx2 = cx + cw2 / 2 - W * 0.040;
      ctx.beginPath();
      ctx.moveTo(bx2 - W * 0.009, chy); ctx.lineTo(bx2 - W * 0.002, chy + W * 0.008);
      ctx.lineTo(bx2 + W * 0.012, chy - W * 0.010);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // the lock, closing
    var ly = py - ph / 2 - H * 0.052;
    var ls = W * 0.052;
    ctx.save();
    ctx.globalAlpha = Math.min(1, inP * 1.6);
    var shH = lerp(ls * 1.30, ls * 0.86, lock);
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = ls * 0.20;
    ctx.strokeStyle = mix('#bfffe0', C.mint, 0.5);
    ctx.shadowColor = hexa(C.mint, 0.9); ctx.shadowBlur = ls * (0.6 + 1.6 * snapL);
    ctx.beginPath();
    ctx.arc(cx, ly - shH * 0.30, ls * 0.42, Math.PI, 0);
    ctx.moveTo(cx - ls * 0.42, ly - shH * 0.30); ctx.lineTo(cx - ls * 0.42, ly + ls * 0.10);
    ctx.moveTo(cx + ls * 0.42, ly - shH * 0.30); ctx.lineTo(cx + ls * 0.42, ly + ls * 0.10);
    ctx.stroke();
    ctx.restore();
    rr(ctx, cx - ls * 0.72, ly + ls * 0.04, ls * 1.44, ls * 1.10, ls * 0.26);
    var lg2 = ctx.createLinearGradient(cx - ls, ly, cx + ls, ly + ls);
    lg2.addColorStop(0, '#d8ffe8'); lg2.addColorStop(1, C.green);
    ctx.fillStyle = lg2;
    ctx.shadowColor = hexa(C.mint, 0.85); ctx.shadowBlur = ls * (0.5 + 1.4 * snapL);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.beginPath(); ctx.arc(cx, ly + ls * 0.56, ls * 0.14, 0, TAU);
    ctx.fillStyle = '#0a1a10'; ctx.fill();
    ctx.restore();
    if (snapL > 0.02) {
      streak(ctx, cx, ly + ls * 0.5, W * 0.5 * snapL, C.mint, 0.55 * snapL);
    }
    // the lock keeps pulsing once it is closed
    shockwave(ctx, cx, ly + ls * 0.5, inv(t, LOCK, LOCK + 0.70), C.mint, 0.26, W * 1.7);
    shockwave(ctx, cx, ly + ls * 0.5, inv(t, LOCK + 1.05, LOCK + 1.85), C.mint, 0.15, W * 1.7);
    shockwave(ctx, cx, ly + ls * 0.5, inv(t, LOCK + 2.05, LOCK + 2.85), C.green, 0.12, W * 1.7);
    glowE(ctx, cx, ly + ls * 0.4, W * 0.22 * (0.9 + 0.16 * osc(t, 0.55)), H * 0.05, C.mint,
      0.16 + 0.10 * sw);

    var la = smooth(inv(t, 1.55, 1.95));
    if (la > 0.01) {
      ctx.save();
      wipeLabel(ctx, 'NO FRONT-RUNNING · NO CACHING · LOCAL ONLY', H * 0.815,
        W * 0.024, '#ffffff', W * 0.0055, inv(t, 1.55, 2.55), la * 0.55);
      ctx.restore();
    }
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
    { name: 'ask', end: 4.0, fn: sceneAsk, cam: cam(1.00, 1.10, 0, 0, 0, -0.010) },
    { name: 'taken', end: 8.0, fn: sceneTaken, cam: cam(1.08, 1.00, 0, 0, -0.006, 0.006) },
    { name: 'trap', end: 12.0, fn: sceneTrap, cam: cam(1.00, 1.09, 0, 0, 0, -0.008) },
    { name: 'reveal', end: 18.0, fn: sceneBrand, cam: cam(1.14, 1.00, 0, 0, 0, 0) },
    { name: 'generate', end: 24.0, fn: scenePrompt, cam: cam(1.00, 1.06, 0.010, -0.010, 0, 0) },
    { name: 'tlds', end: 28.0, fn: sceneTLDs, cam: cam(1.16, 1.00, 0, 0, 0, 0) },
    { name: 'score', end: 32.0, fn: sceneScore, cam: cam(1.00, 1.07, 0, 0, 0.008, -0.004) },
    { name: 'social', end: 36.0, fn: sceneSocial, cam: cam(1.09, 1.00, 0, 0, 0.004, 0) },
    { name: 'privacy', end: 40.0, fn: scenePrivacy, cam: cam(1.00, 1.07, 0, 0, 0, -0.005) },
    { name: 'close', end: 46.0, fn: sceneClose, cam: cam(1.00, 1.09, 0, 0, 0, -0.006) }
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
    vignette(ctx, 0.42);
    grain(ctx, t, 0.055);
    watermark(ctx);
    ctx.restore();
  }

  return {
    W: W, H: H, FPS: FPS, DUR: DUR, BRAND: BRAND, TIMELINE: TIMELINE,
    drawFrame: drawFrame,
    u: {
      clamp: clamp, lerp: lerp, inv: inv, smooth: smooth, easeOut: easeOut,
      easeOut4: easeOut4, easeIn: easeIn, easeInOut: easeInOut, easeBack: easeBack, osc: osc,
      hexa: hexa, mix: mix, ramp: ramp, rng: rng, rr: rr, glow: glow, glowE: glowE,
      scrim: scrim, shapeBloom: shapeBloom, strokeBloom: strokeBloom, swell: swell,
      setFont: setFont, trackW: trackW, trackFill: trackFill, fitSize: fitSize,
      centred: centred, wipeLabel: wipeLabel, typeOut: typeOut, caret: caret,
      slab: slab, lockup: lockup, shockwave: shockwave, ambient: ambient,
      aurora: aurora, sheen: sheen, orbit: orbit,
      chip: chip, feed: feed, riseWords: riseWords, headline: headline,
      streak: streak, vignette: vignette, grain: grain, columns: columns,
      pathCheck: pathCheck, checkSym: checkSym, checkStroke: checkStroke,
      swooshTarget: swooshTarget,
      tldSym: tldSym, sparkSym: sparkSym
    }
  };
});
