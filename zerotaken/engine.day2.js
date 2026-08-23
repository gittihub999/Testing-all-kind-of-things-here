/* ============================================================================
   ZEROTAKEN — day 2  ·  "3 checks before you buy"
   9:16 · 1080x1920 · 30fps · 36.0s
   ----------------------------------------------------------------------------
   A deliberately BRIGHT film, not a recolour of the dark one. The dark house
   style makes light the subject; here the subject is paper and shadow. Depth
   comes from elevation, colour from soft washes and flat brand tints, and the
   motion is springy the way light product UI is, rather than floaty.

    0– 4  HOOK      the three checks stack up          "3 checks before you buy"
    4–10  CHECK 1   registrar price vs aftermarket     "Really available?"
   10–16  CHECK 2   brandability gauge to 92           "Worth remembering?"
   16–22  CHECK 3   five platform handles tick green   "Handle free?"
   22–30  SHORTCUT  the checks dock, results land      "ZeroTaken does all three"
   30–36  CLOSE     results collapse into the logo     "zerotaken.com"
   ========================================================================== */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.PROMO = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var W = 1080, H = 1920, FPS = 30;
  var TAU = Math.PI * 2;
  var M = 84;                                   // page margin
  var CW = W - M * 2;                           // content width

  var BRAND = {
    name: 'ZeroTaken',
    font: '"Liberation Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'
  };

  /* the light system */
  var C = {
    paper: '#F5F3EF', paper2: '#EFEBE4', card: '#FFFFFF',
    ink: '#191512', ink2: '#6E665E', ink3: '#A79E94',
    line: 'rgba(25,21,18,0.10)',
    orange: '#EF7908', orangeD: '#C25E00', gold: '#FFC24D',
    green: '#2E9E33', greenD: '#1F7A24',
    red: '#E0364F',
    peach: '#FFE4C6', mint: '#D9F5DE', lav: '#E7E3FF', sky: '#D6EAFF', rose: '#FFDCE2'
  };

  /* ---------------------------------------------------------------- math */
  function clamp(v, a, b) { a = a === undefined ? 0 : a; b = b === undefined ? 1 : b; return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function inv(t, a, b) { return clamp((t - a) / (b - a)); }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
  function easeOut4(t) { return 1 - Math.pow(1 - t, 4); }
  function easeIn(t) { return t * t * t; }
  function easeInOut(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  /* light UI wants overshoot — it reads as physical rather than floaty */
  function spring(t, c) { c = c === undefined ? 1.70158 : c; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }
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
  function rng(seed) { var s = seed; return function () { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }

  /* ------------------------------------------------------------ drawing */
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
  function setFont(ctx, weight, size) { ctx.font = weight + ' ' + size + 'px ' + BRAND.font; }
  function trackW(ctx, txt, sp) {
    var w = 0; for (var i = 0; i < txt.length; i++) w += ctx.measureText(txt[i]).width + sp;
    return txt.length ? w - sp : 0;
  }
  function trackFill(ctx, txt, x, y, sp) {
    var c = x; for (var i = 0; i < txt.length; i++) { ctx.fillText(txt[i], c, y); c += ctx.measureText(txt[i]).width + sp; }
    return c;
  }
  function fitSize(ctx, txt, maxW, size, sp, weight) {
    setFont(ctx, weight || '700', size);
    var w = trackW(ctx, txt, sp || 0);
    return w > maxW ? size * maxW / w : size;
  }

  /* a soft colour wash — the light equivalent of a glow */
  function wash(ctx, x, y, rx, ry, col, a) {
    if (a <= 0.002) return;
    ctx.save();
    ctx.translate(x, y); ctx.scale(1, ry / rx); ctx.translate(-x, -y);
    var g = ctx.createRadialGradient(x, y, 0, x, y, rx);
    g.addColorStop(0, hexa(col, a));
    g.addColorStop(0.55, hexa(col, a * 0.42));
    g.addColorStop(1, hexa(col, 0));
    ctx.fillStyle = g; ctx.fillRect(x - rx, y - rx, rx * 2, rx * 2);
    ctx.restore();
  }

  /* elevation, in two layers: a wide ambient shadow and a tight contact one */
  function card(ctx, x, y, w, h, r, elev, o) {
    o = o || {};
    ctx.save();
    if (o.alpha !== undefined) ctx.globalAlpha = ctx.globalAlpha * o.alpha;
    ctx.shadowColor = 'rgba(90,60,25,' + (0.13 * elev).toFixed(3) + ')';
    ctx.shadowBlur = 70 * elev; ctx.shadowOffsetY = 30 * elev;
    rr(ctx, x, y, w, h, r);
    ctx.fillStyle = o.fill || C.card; ctx.fill();
    ctx.shadowColor = 'rgba(30,20,12,' + (0.10 * elev).toFixed(3) + ')';
    ctx.shadowBlur = 12 * elev; ctx.shadowOffsetY = 4 * elev;
    ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    if (o.border !== false) {
      ctx.lineWidth = 1.6; ctx.strokeStyle = o.borderCol || C.line; ctx.stroke();
    }
    ctx.restore();
  }

  /* a highlight crossing a surface on a loop */
  function shine(ctx, x, y, w, h, r, t, period, amt, phase) {
    if (w <= 2 || h <= 1) return;
    var q = (((t / period) + (phase || 0)) % 1);
    if (q > 0.42) return;
    var p = q / 0.42;
    ctx.save();
    rr(ctx, x, y, w, h, r); ctx.clip();
    ctx.globalAlpha = ctx.globalAlpha * amt * Math.sin(p * Math.PI);
    var sx = lerp(x - w * 0.30, x + w * 1.30, p);
    var g = ctx.createLinearGradient(sx - w * 0.15, y, sx + w * 0.15, y + h);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.92)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  /* every surface breathes a little */
  function hover(t, i, amp) { return Math.sin(t * (1.05 + i * 0.13) + i * 1.7) * H * (amp || 0.0045); }

  /* a green tick that pops with overshoot */
  function tickMark(ctx, x, y, s, p, col, pulse) {
    p = clamp(p); if (p <= 0.002) return;
    col = col || C.green;
    var k = spring(p, 2.2) * (1 + 0.055 * (pulse || 0));
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = s * 0.24; ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-s * 0.40, s * 0.02); ctx.lineTo(-s * 0.10, s * 0.32); ctx.lineTo(s * 0.44, -s * 0.34);
    ctx.stroke();
    ctx.restore();
  }
  function crossMark(ctx, x, y, s, p, col) {
    p = clamp(p); if (p <= 0.002) return;
    col = col || C.red;
    var k = spring(p, 2.4);
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU);
    ctx.fillStyle = col; ctx.fill();
    ctx.lineCap = 'round';
    ctx.lineWidth = s * 0.24; ctx.strokeStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-s * 0.34, -s * 0.34); ctx.lineTo(s * 0.34, s * 0.34);
    ctx.moveTo(s * 0.34, -s * 0.34); ctx.lineTo(-s * 0.34, s * 0.34);
    ctx.stroke();
    ctx.restore();
  }
  /* the numbered step badge */
  function badge(ctx, x, y, s, n, p, col) {
    p = clamp(p); if (p <= 0.002) return;
    col = col || C.orange;
    var k = spring(p, 1.9);
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k);
    ctx.shadowColor = hexa(col, 0.35); ctx.shadowBlur = s * 0.9; ctx.shadowOffsetY = s * 0.24;
    ctx.beginPath(); ctx.arc(0, 0, s, 0, TAU);
    var g = ctx.createLinearGradient(-s, -s, s, s);
    g.addColorStop(0, mix(col, '#ffffff', 0.22)); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    setFont(ctx, '700', s * 1.18);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(n), 0, s * 0.04);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
  /* a soft tinted pill — used for verdicts and labels */
  function chip(ctx, x, y, txt, size, bg, fg, p, pad) {
    p = p === undefined ? 1 : clamp(p);
    if (p <= 0.002) return 0;
    setFont(ctx, '700', size);
    var tw = ctx.measureText(txt).width;
    pad = pad === undefined ? size * 0.85 : pad;
    var w = tw + pad * 2, h = size * 2.05;
    var k = spring(p, 1.8);
    ctx.save();
    ctx.translate(x, y); ctx.scale(k, k); ctx.translate(-x, -y);
    ctx.globalAlpha = ctx.globalAlpha * Math.min(1, p * 2);
    rr(ctx, x - w / 2, y - h / 2, w, h, h / 2);
    ctx.fillStyle = bg; ctx.fill();
    ctx.fillStyle = fg;
    ctx.fillText(txt, x - tw / 2, y + size * 0.35);
    ctx.restore();
    return w;
  }
  function bar(ctx, x, y, w, h, p, col, track) {
    rr(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = track || '#EDE9E2'; ctx.fill();
    var fw = Math.max(h, w * clamp(p));
    rr(ctx, x, y, fw, h, h / 2);
    var g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, mix(col, '#ffffff', 0.28)); g.addColorStop(1, col);
    ctx.fillStyle = g; ctx.fill();
  }

  /* headline words rising out of a mask */
  function riseWords(ctx, txt, y, size, p, o) {
    o = o || {};
    var words = txt.split(' ');
    setFont(ctx, '700', size);
    var sp = ctx.measureText(' ').width, widths = [], total = 0, i;
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
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - size * 0.18, y - size * 1.08, widths[i] + size * 0.36, size * 1.38);
        ctx.clip();
        ctx.globalAlpha = pa * Math.min(1, wp * 1.7);
        ctx.fillStyle = hot ? (o.hot || C.orange) : (o.ink || C.ink);
        ctx.fillText(words[i], x, y + (1 - wp) * size * 0.95);
        ctx.restore();
      }
      x += widths[i] + sp;
    }
    return { width: total, done: p >= (words.length - 1) * stag + span };
  }
  function wipeLabel(ctx, txt, y, size, col, sp, p, alpha) {
    setFont(ctx, '700', size);
    var w = trackW(ctx, txt, sp), max = W * 0.86;
    if (w > max) { var k = max / w; size *= k; sp *= k; setFont(ctx, '700', size); w = trackW(ctx, txt, sp); }
    var x = (W - w) / 2, n = clamp(p) * txt.length;
    for (var i = 0; i < txt.length; i++) {
      var la = clamp(n - i);
      if (la > 0) { ctx.globalAlpha = alpha * la; ctx.fillStyle = col; ctx.fillText(txt[i], x, y); }
      x += ctx.measureText(txt[i]).width + sp;
    }
    ctx.globalAlpha = 1;
  }
  function typeOut(ctx, txt, x, y, p, size, ink, hot, hotHold) {
    setFont(ctx, '700', size);
    var n = Math.min(txt.length, Math.floor(clamp(p) * (txt.length + 0.6))), cx = x;
    for (var i = 0; i < n; i++) {
      var recent = i >= n - 2 ? (i === n - 1 ? 1 : 0.6) : 0;
      ctx.fillStyle = recent > 0 && hotHold > 0 ? mix(ink, hot, hotHold * recent) : ink;
      ctx.fillText(txt[i], cx, y);
      cx += ctx.measureText(txt[i]).width;
    }
    return { x: cx, done: n >= txt.length };
  }
  function caret(ctx, x, y, size, t, a, col) {
    var b = (t % 0.9) < 0.52 ? 1 : 0.10;
    ctx.save(); ctx.globalAlpha = ctx.globalAlpha * a * b;
    ctx.fillStyle = col;
    ctx.fillRect(x + size * 0.10, y - size * 0.78, size * 0.07, size * 0.88);
    ctx.restore();
  }

  /* ------------------------------------------------------------- world */
  var DOTS = (function () {
    var a = [];
    for (var y = 0; y < 42; y++) for (var x = 0; x < 24; x++) a.push([x, y]);
    return a;
  })();
  /* soft shapes drifting behind everything — the light-UI answer to a mote
     field, and the reason a flat page never sits still */
  var FLOAT = (function () {
    var r = rng(31337), a = [];
    for (var i = 0; i < 13; i++) {
      a.push({ x: r(), y: r(), s: 0.07 + r() * 0.15, sp: 0.030 + r() * 0.055,
               ph: r() * TAU, rot: r() * TAU, spin: (r() - 0.5) * 0.35, c: (r() * 4) | 0,
               sq: r() > 0.45 });
    }
    return a;
  })();
  function floaters(ctx, t, tints) {
    for (var i = 0; i < FLOAT.length; i++) {
      var f = FLOAT[i];
      var y = ((f.y - t * f.sp) % 1 + 1) % 1;
      var x = f.x + Math.sin(t * 0.16 + f.ph) * 0.085;
      var r = f.s * W * (0.62 + 0.10 * Math.sin(t * 0.42 + f.ph));
      wash(ctx, x * W, y * H, r, r * (f.sq ? 0.72 : 1.0),
        tints[f.c % tints.length], 0.30 + 0.12 * Math.sin(t * 0.5 + f.ph));
    }
  }
  function paper(ctx, t, tints) {
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    for (var i = 0; i < tints.length; i++) {
      var q = tints[i];
      wash(ctx, W * (q[1] + 0.11 * osc(t, q[5] * 2.0, i)), H * (q[2] + 0.055 * osc(t, q[5] * 1.7, i + 2)),
        W * q[3], H * q[3] * 0.62, q[0], q[6]);
    }
    floaters(ctx, t, [tints[0][0], tints[1][0], tints[2][0], C.peach]);
    ctx.save();
    ctx.globalAlpha = 0.055;
    ctx.fillStyle = C.ink;
    var step = 48, ox = (t * 15) % step, oy = (t * 21) % step;
    for (var d = 0; d < DOTS.length; d++) {
      var px = DOTS[d][0] * step + ox - step, py = DOTS[d][1] * step + oy - step;
      ctx.fillRect(px, py, 2.4, 2.4);
    }
    ctx.restore();
    // page light: brighter at the top, grounded at the bottom
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.00)');
    g.addColorStop(1, 'rgba(120,95,60,0.07)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }

  var GRAIN = (function () {
    var r = rng(4711), a = new Float32Array(6000 * 3);
    for (var i = 0; i < 6000; i++) { a[i * 3] = r(); a[i * 3 + 1] = r(); a[i * 3 + 2] = r(); }
    return a;
  })();
  function paperGrain(ctx, t, amt) {
    var f = Math.round(t * FPS), off = (f * 1361) % 4200;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    for (var b = 0; b < 2; b++) {
      ctx.fillStyle = 'rgba(120,105,90,' + (amt * (0.5 + b * 0.5)).toFixed(4) + ')';
      for (var i = b; i < 1100; i += 2) {
        var j = ((i + off) % 6000) * 3;
        ctx.fillRect((GRAIN[j] * W) | 0, (GRAIN[j + 1] * H) | 0, 2, 2);
      }
    }
    ctx.restore();
  }

  var CONF = (function () {
    var r = rng(90210), a = [];
    for (var i = 0; i < 44; i++) a.push({ a: r(), sp: 0.55 + r() * 0.9, rot: r() * TAU, spin: (r() - 0.5) * 9, w: 10 + r() * 12, h: 6 + r() * 9, c: (r() * 5) | 0 });
    return a;
  })();
  function confetti(ctx, x, y, p, spread, n) {
    if (p <= 0.001 || p >= 1) return;
    var cols = [C.orange, C.green, C.gold, '#7A5BFF', C.red];
    n = n || CONF.length;
    ctx.save();
    for (var i = 0; i < n; i++) {
      var c = CONF[i % CONF.length];
      var ang = c.a * TAU;
      var d = spread * easeOut(p) * c.sp;
      var px = x + Math.cos(ang) * d;
      var py = y + Math.sin(ang) * d * 0.72 + p * p * spread * 0.75;
      var a = 1 - smooth(inv(p, 0.5, 1));
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(px, py); ctx.rotate(c.rot + p * c.spin);
      ctx.fillStyle = cols[c.c];
      rr(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 3);
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function watermark(ctx) {
    ctx.save();
    ctx.globalAlpha = 0.34;
    setFont(ctx, '700', 26);
    var w = trackW(ctx, BRAND.name, 2.2);
    ctx.fillStyle = C.ink2;
    trackFill(ctx, BRAND.name, W - 58 - w, 84, 2.2);
    ctx.restore();
  }

  /* the wordmark, on light */
  function lockup(ctx, cx, cy, s, o) {
    o = o || {};
    var zTrack = s * 0.07, tTrack = s * 0.015;
    setFont(ctx, '700', s);
    var wZ = trackW(ctx, 'ZERO', zTrack);
    setFont(ctx, '700', s * 0.94);
    var wT = trackW(ctx, 'taken', tTrack);
    var block = Math.max(wZ, wT);
    var hasSw = (o.swoosh === undefined ? 1 : o.swoosh) > 0.05;
    var left = cx - block / 2 - (hasSw || o.reserveSwoosh ? s * 0.30 : 0);
    var yZ = cy - s * 0.10, yT = cy + s * 0.92;
    ctx.save();
    setFont(ctx, '700', s);
    var gz = ctx.createLinearGradient(left, yZ - s, left + block, yZ);
    gz.addColorStop(0, '#FF9A2B'); gz.addColorStop(1, C.orangeD);
    ctx.fillStyle = o.topCol || gz;
    trackFill(ctx, 'ZERO', left + (block - wZ) / 2 + (o.zDX || 0), yZ, zTrack);
    setFont(ctx, '700', s * 0.94);
    var gt = ctx.createLinearGradient(left, yT - s * 0.8, left + block, yT);
    gt.addColorStop(0, '#4CB84F'); gt.addColorStop(1, C.greenD);
    ctx.fillStyle = o.botCol || gt;
    trackFill(ctx, 'taken', left + (block - wT) / 2 + (o.tDX || 0), yT, tTrack);
    ctx.restore();
    var sp = o.swoosh === undefined ? 1 : clamp(o.swoosh);
    if (sp > 0.05) {
      var scx = left + block + s * 0.62, scy = cy + s * 0.20, ss = s * 0.92;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.lineWidth = s * 0.17;
      var cg = ctx.createLinearGradient(scx - ss * 0.6, scy, scx + ss * 0.6, scy - ss * 0.4);
      cg.addColorStop(0, '#FFA83A'); cg.addColorStop(1, C.orangeD);
      ctx.strokeStyle = cg;
      var p0 = [scx - ss * 0.52, scy - ss * 0.02], p1 = [scx - ss * 0.16, scy + ss * 0.36], p2 = [scx + ss * 0.56, scy - ss * 0.42];
      var l1 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), l2 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
      var want = (l1 + l2) * sp;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]);
      if (want <= l1) { var u = want / l1; ctx.lineTo(lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u)); }
      else { ctx.lineTo(p1[0], p1[1]); var v = (want - l1) / l2; ctx.lineTo(lerp(p1[0], p2[0], v), lerp(p1[1], p2[1], v)); }
      ctx.stroke();
      ctx.restore();
    }
    return { left: left, block: block, top: yZ - s, bottom: yT };
  }

  /* ============================== SCENES ============================== */

  var CHECKS = [
    { n: 1, q: 'Really available?', tint: C.peach },
    { n: 2, q: 'Worth remembering?', tint: C.lav },
    { n: 3, q: 'Handle free?', tint: C.mint }
  ];

  /* --- 1. HOOK · 0–4 ------------------------------------------------------ */
  function sceneHook(ctx, t, dur) {
    paper(ctx, t, [[C.peach, 0.22, 0.20, 0.62, 0.03, 0.05, 0.85],
                   [C.sky, 0.82, 0.30, 0.55, 0.03, 0.043, 0.55],
                   [C.mint, 0.50, 0.88, 0.70, 0.04, 0.037, 0.60]]);

    riseWords(ctx, '3 checks', H * 0.235, W * 0.150, inv(t, -0.16, 0.66), { hotWords: [0] });
    ctx.save();
    ctx.globalAlpha = smooth(inv(t, 0.14, 0.58));
    var s2 = W * 0.052;
    setFont(ctx, '400', s2);
    var sub = 'before you buy a domain';
    var sw2 = ctx.measureText(sub).width;
    ctx.fillStyle = C.ink2;
    ctx.fillText(sub, (W - sw2) / 2, H * 0.300);
    ctx.restore();

    for (var i = 0; i < 3; i++) {
      var p = spring(inv(t, 0.30 + i * 0.18, 1.00 + i * 0.18), 1.5);
      if (p <= 0.002) continue;
      var y = H * (0.445 + i * 0.140);
      var lift = (1 - clamp(p)) * H * 0.05;
      var hv = hover(t, i, 0.006);
      var h = H * 0.115;
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 0.30 + i * 0.18, 0.50 + i * 0.18) * 1.4);
      card(ctx, M, y - h / 2 + lift + hv, CW, h, h * 0.32, (0.55 + 0.45 * clamp(p)) * (1 + 0.10 * osc(t, 0.30, i)));
      var cy = y + lift + hv;
      shine(ctx, M, cy - h / 2, CW, h, h * 0.32, t, 2.4, 0.32, i * 0.30);
      // tinted swatch on the left, then the badge
      ctx.save();
      rr(ctx, M, cy - h / 2, h * 0.30, h, h * 0.32); ctx.fillStyle = CHECKS[i].tint; ctx.fill();
      rr(ctx, M + h * 0.16, cy - h / 2, h * 0.16, h, 0); ctx.fillStyle = CHECKS[i].tint; ctx.fill();
      ctx.restore();
      badge(ctx, M + h * 0.62, cy, h * 0.235, CHECKS[i].n, inv(t, 0.46 + i * 0.18, 0.84 + i * 0.18));
      setFont(ctx, '700', W * 0.050);
      ctx.fillStyle = C.ink;
      ctx.fillText(CHECKS[i].q, M + h * 1.06, cy + W * 0.018);
      ctx.restore();
    }

    ctx.save();
    wipeLabel(ctx, 'DO THIS BEFORE YOU SPEND A CENT', H * 0.845, W * 0.026, C.ink3,
      W * 0.0085, inv(t, 1.55, 2.35), smooth(inv(t, 1.50, 1.90)) * 0.95);
    ctx.restore();
  }

  /* --- 2. CHECK ONE · 4–10 · the price ------------------------------------ */
  function sceneCheck1(ctx, t, dur) {
    paper(ctx, t, [[C.peach, 0.25, 0.22, 0.66, 0.03, 0.05, 0.95],
                   [C.rose, 0.78, 0.62, 0.60, 0.035, 0.041, 0.75],
                   [C.sky, 0.35, 0.92, 0.60, 0.03, 0.033, 0.45]]);
    stepHead(ctx, t, 0, 'Really available?');

    var ch = H * 0.430, cy = H * 0.508;
    var p = spring(inv(t, -0.06, 0.72), 1.4);
    ctx.save();
    var top = cy - ch / 2 + (1 - clamp(p)) * H * 0.24 + hover(t, 0);
    card(ctx, M, top, CW, ch, W * 0.055, 0.9 + 0.06 * osc(t, 0.34));
    shine(ctx, M, top, CW, ch, W * 0.055, t, 2.6, 0.30);

    setFont(ctx, '700', W * 0.062);
    ctx.fillStyle = C.ink;
    ctx.fillText('northstar.com', M + W * 0.058, top + H * 0.078);
    setFont(ctx, '400', W * 0.031);
    ctx.fillStyle = C.ink3;
    ctx.fillText('the name you actually want', M + W * 0.058, top + H * 0.118);

    ctx.strokeStyle = C.line; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(M + W * 0.05, top + H * 0.152); ctx.lineTo(M + CW - W * 0.05, top + H * 0.152); ctx.stroke();

    var focus = smooth(inv(t, 4.15, 4.85));          // the good row is singled out
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * (1 - focus * 0.58);
    ctx.translate(0, focus * H * 0.012);
    priceRow(ctx, t, M + W * 0.058, top + H * 0.345, CW - W * 0.116,
      'Aftermarket ask', '$' + Math.round(lerp(0, 2450, easeOut4(inv(t, 1.62, 2.42)))).toLocaleString('en-US'),
      C.red, false, 1.62, 2.36);
    ctx.restore();
    var fk = 1 + 0.055 * focus;
    ctx.save();
    ctx.translate(W / 2, top + H * 0.235); ctx.scale(fk, fk); ctx.translate(-W / 2, -(top + H * 0.235));
    if (focus > 0.02) {
      var rp2 = ((t - 4.15) % 1.25) / 1.25;
      ctx.save();
      ctx.globalAlpha = 0.55 * focus * Math.sin(rp2 * Math.PI);
      ctx.lineWidth = 4 + 10 * rp2;
      ctx.strokeStyle = C.green;
      rr(ctx, M + W * 0.058 - 10 - rp2 * 26, top + H * 0.235 - H * 0.039 - 8 - rp2 * 18,
        CW - W * 0.116 + 20 + rp2 * 52, H * 0.078 + 16 + rp2 * 36, H * 0.030);
      ctx.stroke();
      ctx.restore();
    }
    priceRow(ctx, t, M + W * 0.058, top + H * 0.235, CW - W * 0.116,
      'Standard registrar', '$12', C.green, true, 0.95, 1.30);
    ctx.restore();
    ctx.restore();

    var v = spring(inv(t, 2.60, 3.30), 1.6);
    if (v > 0.002) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 2.60, 2.86) * 1.5);
      chip(ctx, W / 2, H * 0.788, 'MOST "AVAILABLE" NAMES ARE LISTINGS', W * 0.028, C.rose, '#9A1B2E', v);
      ctx.restore();
    }
    ctx.save();
    wipeLabel(ctx, 'CHECK THE REAL PRICE, NOT THE BADGE', H * 0.868, W * 0.025, C.ink3,
      W * 0.0080, inv(t, 3.30, 4.10), smooth(inv(t, 3.25, 3.60)) * 0.95);
    ctx.restore();
  }
  function priceRow(ctx, t, x, y, w, label, value, col, ok, t0, t1) {
    var p = smooth(inv(t, t0, t0 + 0.34));
    if (p <= 0.004) return;
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * p;
    ctx.translate(0, (1 - p) * H * 0.018);
    var h = H * 0.078;
    rr(ctx, x, y - h / 2, w, h, h * 0.32);
    ctx.fillStyle = ok ? C.mint : C.rose; ctx.fill();
    setFont(ctx, '400', W * 0.032);
    ctx.fillStyle = C.ink2;
    ctx.fillText(label, x + W * 0.036, y + W * 0.011);
    setFont(ctx, '700', W * 0.046);
    var vw = ctx.measureText(value).width;
    ctx.fillStyle = ok ? C.greenD : '#B32438';
    ctx.fillText(value, x + w - W * 0.085 - vw, y + W * 0.016);
    if (ok) tickMark(ctx, x + w - W * 0.042, y, W * 0.026, inv(t, t1, t1 + 0.30), null, Math.sin(t * 2.0));
    else crossMark(ctx, x + w - W * 0.042, y, W * 0.026, inv(t, t1, t1 + 0.30));
    shine(ctx, x, y - h / 2, w, h, h * 0.32, t, 2.2, 0.35, ok ? 0 : 0.4);
    ctx.restore();
  }

  /* --- 3. CHECK TWO · 10–16 · brandability -------------------------------- */
  function sceneCheck2(ctx, t, dur) {
    paper(ctx, t, [[C.lav, 0.24, 0.24, 0.66, 0.03, 0.048, 0.95],
                   [C.sky, 0.80, 0.58, 0.58, 0.035, 0.04, 0.70],
                   [C.peach, 0.45, 0.92, 0.62, 0.03, 0.034, 0.55]]);
    stepHead(ctx, t, 1, 'Worth remembering?');

    var ch = H * 0.430, cy = H * 0.508;
    var p = spring(inv(t, -0.06, 0.72), 1.4);
    ctx.save();
    var top = cy - ch / 2 + (1 - clamp(p)) * H * 0.24 + hover(t, 1);
    card(ctx, M, top, CW, ch, W * 0.055, 0.9 + 0.06 * osc(t, 0.31));
    shine(ctx, M, top, CW, ch, W * 0.055, t, 2.6, 0.30);

    // the dial
    var gx = M + CW * 0.27, gy = top + ch * 0.44, R = W * 0.140;
    var a0 = Math.PI * 0.72, sweep = Math.PI * 1.56;
    var gp = easeOut4(inv(t, 0.55, 1.75));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = W * 0.034;
    ctx.strokeStyle = '#EDE9E2';
    ctx.beginPath(); ctx.arc(gx, gy, R, a0, a0 + sweep); ctx.stroke();
    var g = ctx.createLinearGradient(gx - R, gy + R, gx + R, gy - R);
    g.addColorStop(0, C.gold); g.addColorStop(1, C.orange);
    ctx.strokeStyle = g;
    ctx.beginPath(); ctx.arc(gx, gy, R, a0, a0 + sweep * gp * 0.92); ctx.stroke();
    if (gp > 0.99) {
      var cq = ((t - 1.75) % 1.5) / 1.5;
      ctx.save();
      ctx.lineCap = 'round'; ctx.lineWidth = W * 0.034;
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.55 * Math.sin(cq * Math.PI)).toFixed(3) + ')';
      var ca2 = a0 + sweep * 0.92 * cq;
      ctx.beginPath(); ctx.arc(gx, gy, R, Math.max(a0, ca2 - 0.22), ca2); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    setFont(ctx, '700', W * 0.125);
    var val = String(Math.round(lerp(0, 92, gp)));
    var vw = ctx.measureText(val).width;
    var na = smooth(inv(t, 0.55, 0.78));
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * na;
    ctx.fillStyle = C.ink;
    ctx.fillText(val, gx - vw / 2, gy + W * 0.044);
    ctx.restore();
    setFont(ctx, '700', W * 0.024);
    var el = 'EXCELLENT';
    ctx.fillStyle = C.greenD;
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * smooth(inv(t, 1.70, 2.00));
    ctx.fillText(el, gx - ctx.measureText(el).width / 2, gy + R * 0.92);
    ctx.restore();

    // the attributes
    var labels = ['Short', 'Sayable', 'Memorable'];
    var vals = [0.92, 0.86, 0.95];
    for (var i = 0; i < 3; i++) {
      var bp = easeOut4(inv(t, 0.95 + i * 0.22, 1.95 + i * 0.22));
      var by = top + ch * 0.235 + i * ch * 0.215;
      var bx = M + CW * 0.50;
      setFont(ctx, '400', W * 0.032);
      ctx.fillStyle = C.ink2;
      ctx.fillText(labels[i], bx, by - W * 0.010);
      bar(ctx, bx, by + W * 0.010, CW * 0.34, W * 0.024, bp * vals[i], C.orange);
      shine(ctx, bx, by + W * 0.010, CW * 0.34 * bp * vals[i], W * 0.024, W * 0.012, t, 1.9, 0.55, i * 0.22);
      tickMark(ctx, bx + CW * 0.395, by + W * 0.022, W * 0.022, inv(t, 1.85 + i * 0.22, 2.15 + i * 0.22),
        null, Math.sin(t * 1.9 + i * 1.2));
    }
    ctx.restore();

    var pulse2 = inv(t, 4.20, 5.20);
    if (pulse2 > 0 && pulse2 < 1) {
      ctx.save();
      ctx.globalAlpha = 0.42 * Math.sin(pulse2 * Math.PI);
      ctx.lineWidth = 6 + 14 * pulse2;
      ctx.strokeStyle = C.orange;
      ctx.beginPath(); ctx.arc(gx, gy, R * (1.25 + 0.85 * pulse2), 0, TAU); ctx.stroke();
      ctx.restore();
    }
    var v = spring(inv(t, 2.70, 3.40), 1.6) * (1 + 0.06 * clamp(Math.sin((t - 4.2) * 3.2)));
    if (v > 0.002) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 2.70, 2.96) * 1.5);
      chip(ctx, W / 2, H * 0.788, 'CANNOT SPELL IT? CANNOT FIND YOU.', W * 0.028, C.lav, '#4B3FA8', v);
      ctx.restore();
    }
    ctx.save();
    wipeLabel(ctx, 'EVERY NAME SCORED FOR BRANDABILITY', H * 0.868, W * 0.025, C.ink3,
      W * 0.0080, inv(t, 3.40, 4.20), smooth(inv(t, 3.35, 3.70)) * 0.95);
    ctx.restore();
  }

  /* --- 4. CHECK THREE · 16–22 · the handles ------------------------------- */
  var PLATFORMS = ['YouTube', 'Instagram', 'TikTok', 'Facebook', 'Pinterest'];
  function sceneCheck3(ctx, t, dur) {
    paper(ctx, t, [[C.mint, 0.26, 0.26, 0.66, 0.03, 0.047, 0.95],
                   [C.sky, 0.78, 0.60, 0.58, 0.035, 0.039, 0.70],
                   [C.lav, 0.45, 0.93, 0.60, 0.03, 0.033, 0.50]]);
    stepHead(ctx, t, 2, 'Handle free?');

    var ch = H * 0.430, cy = H * 0.508;
    var p = spring(inv(t, -0.06, 0.72), 1.4);
    ctx.save();
    var top = cy - ch / 2 + (1 - clamp(p)) * H * 0.24 + hover(t, 2);
    card(ctx, M, top, CW, ch, W * 0.055, 0.9 + 0.06 * osc(t, 0.29));
    shine(ctx, M, top, CW, ch, W * 0.055, t, 2.6, 0.30);
    setFont(ctx, '700', W * 0.050);
    ctx.fillStyle = C.ink;
    ctx.fillText('@northstar', M + W * 0.055, top + H * 0.062);

    for (var i = 0; i < 5; i++) {
      var rp = smooth(inv(t, 0.42 + i * 0.12, 0.80 + i * 0.12));
      if (rp <= 0.004) continue;
      var ry = top + H * 0.128 + i * H * 0.070;
      ctx.save();
      ctx.globalAlpha = ctx.globalAlpha * rp;
      ctx.translate((1 - rp) * W * 0.05, 0);
      setFont(ctx, '400', W * 0.036);
      ctx.fillStyle = C.ink2;
      ctx.fillText(PLATFORMS[i], M + W * 0.055, ry + W * 0.013);
      setFont(ctx, '700', W * 0.028);
      ctx.fillStyle = C.greenD;
      ctx.globalAlpha = ctx.globalAlpha * smooth(inv(t, 1.30 + i * 0.14, 1.60 + i * 0.14));
      var av = 'available';
      ctx.fillText(av, M + CW - W * 0.155 - ctx.measureText(av).width, ry + W * 0.010);
      ctx.restore();
      tickMark(ctx, M + CW - W * 0.082, ry, W * 0.027, inv(t, 1.24 + i * 0.14, 1.54 + i * 0.14),
        null, Math.sin(t * 2.1 + i * 0.9));
    }
    ctx.restore();

    var burst = inv(t, 2.10, 3.10);
    if (burst > 0 && burst < 1) confetti(ctx, W / 2, H * 0.58, burst, W * 0.55);
    var burst2 = inv(t, 4.30, 5.40);
    if (burst2 > 0 && burst2 < 1) {
      confetti(ctx, W / 2, H * 0.72, burst2, W * 0.42, 22);
      ctx.save();
      ctx.globalAlpha = 0.40 * Math.sin(burst2 * Math.PI);
      ctx.lineWidth = 5 + 12 * burst2;
      ctx.strokeStyle = C.green;
      rr(ctx, W * 0.5 - W * (0.20 + 0.18 * burst2), H * 0.788 - H * (0.030 + 0.026 * burst2),
        W * (0.40 + 0.36 * burst2), H * (0.060 + 0.052 * burst2), H * 0.030);
      ctx.stroke();
      ctx.restore();
    }
    var v = spring(inv(t, 2.10, 2.80), 1.7);
    if (v > 0.002) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 2.10, 2.36) * 1.5);
      chip(ctx, W / 2, H * 0.788, 'ALL FIVE FREE', W * 0.036, C.mint, C.greenD, v);
      ctx.restore();
    }
    ctx.save();
    wipeLabel(ctx, 'ONE HANDLE, EVERY PLATFORM', H * 0.868, W * 0.025, C.ink3,
      W * 0.0080, inv(t, 3.20, 4.00), smooth(inv(t, 3.15, 3.50)) * 0.95);
    ctx.restore();
  }

  /* the numbered step header shared by the three check beats */
  function stepHead(ctx, t, idx, title) {
    // present from the first frame — it slides and settles rather than fading in
    badge(ctx, M + W * 0.052, H * 0.148, W * 0.048, CHECKS[idx].n, inv(t, -0.30, 0.34));
    ctx.save();
    var size = fitSize(ctx, title, CW - W * 0.16, W * 0.088, 0);
    setFont(ctx, '700', size);
    ctx.fillStyle = C.ink;
    ctx.fillText(title, M + W * 0.125 + (1 - easeOut(inv(t, 0, 0.42))) * W * 0.030,
      H * 0.148 + size * 0.35);
    ctx.restore();
    // a thin progress rail showing which check we are on
    ctx.save();
    var railY = H * 0.212, railW = CW, seg = railW / 3;
    for (var i = 0; i < 3; i++) {
      rr(ctx, M + i * seg + 4, railY, seg - 8, 6, 3);
      ctx.fillStyle = i <= idx ? (i === idx ? C.orange : mix(C.orange, C.paper, 0.55)) : '#E4DFD7';
      ctx.globalAlpha = i === idx ? smooth(inv(t, -0.10, 0.55)) : 1;
      ctx.fill();
      if (i === idx) shine(ctx, M + i * seg + 4, railY, seg - 8, 6, 3, t, 1.6, 0.85, 0.1);
    }
    ctx.restore();
  }

  /* --- 5. THE SHORTCUT · 22–30 -------------------------------------------- */
  var RESULTS = ['brewnorth.com', 'kindroast.com', 'ovalgrove.com'];
  function sceneShortcut(ctx, t, dur) {
    paper(ctx, t, [[C.peach, 0.24, 0.22, 0.68, 0.03, 0.05, 0.9],
                   [C.mint, 0.80, 0.52, 0.60, 0.035, 0.042, 0.75],
                   [C.lav, 0.40, 0.92, 0.64, 0.03, 0.035, 0.60]]);

    riseWords(ctx, 'ZeroTaken does all three', H * 0.135, W * 0.072, inv(t, -0.16, 0.72),
      { hotWords: [0] });

    // the three checks dock into a row — they carry over from the beats before
    for (var i = 0; i < 3; i++) {
      var dp = spring(inv(t, -0.05 + i * 0.10, 0.62 + i * 0.10), 1.5);
      if (dp <= 0.002) continue;
      var w = CW / 3 - W * 0.016, x = M + i * (CW / 3) + W * 0.008;
      var y = H * 0.195 + (1 - clamp(dp)) * H * 0.03;
      var h = H * 0.062;
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, -0.05 + i * 0.10, 0.20 + i * 0.10) * 1.5);
      card(ctx, x, y, w, h, h * 0.34, 0.45, { fill: CHECKS[i].tint, border: false });
      badge(ctx, x + h * 0.44, y + h / 2, h * 0.22, CHECKS[i].n, 1);
      setFont(ctx, '700', W * 0.0245);
      ctx.fillStyle = C.ink2;
      ctx.fillText(['available', 'brandable', 'handle'][i], x + h * 0.80, y + h / 2 + W * 0.009);
      ctx.restore();
    }

    // the search bar
    var sp2 = spring(inv(t, 0.55, 1.30), 1.4);
    var sy = H * 0.335, sh = H * 0.086;
    if (sp2 > 0.002) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 0.55, 0.78) * 1.5);
      var syh = sy + (1 - clamp(sp2)) * H * 0.03 + hover(t, 7, 0.004);
      card(ctx, M, syh, CW, sh, sh / 2, 0.8 + 0.08 * osc(t, 0.36));
      shine(ctx, M, syh, CW, sh, sh / 2, t, 2.0, 0.34);
      var by = syh + sh / 2;
      var q = 'eco coffee subscription';
      var tp = inv(t, 1.30, 2.35);
      var per = (2.35 - 1.30) / (q.length + 0.6);
      var n = Math.floor(clamp(tp) * (q.length + 0.6));
      var hold = clamp(1 - (t - (1.30 + n * per)) / 0.26);
      setFont(ctx, '700', W * 0.040);
      var r2 = typeOut(ctx, q, M + W * 0.055, by + W * 0.014, tp, W * 0.040, C.ink, C.orange, hold);
      if (!r2.done && tp > 0.01) caret(ctx, r2.x, by + W * 0.014, W * 0.040, t, 0.9, C.orange);
      // the search button
      var bw = W * 0.10;
      rr(ctx, M + CW - bw - sh * 0.16, by - (sh - sh * 0.32) / 2, bw, sh - sh * 0.32, (sh - sh * 0.32) / 2);
      ctx.fillStyle = C.orange; ctx.fill();
      ctx.save();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = W * 0.008; ctx.lineCap = 'round';
      var mx = M + CW - bw / 2 - sh * 0.16, my = by;
      ctx.beginPath(); ctx.arc(mx - W * 0.004, my - W * 0.004, W * 0.014, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + W * 0.006, my + W * 0.006); ctx.lineTo(mx + W * 0.017, my + W * 0.017); ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    // results, each already passing all three checks
    for (var r = 0; r < 3; r++) {
      var rp = spring(inv(t, 2.45 + r * 0.24, 3.15 + r * 0.24), 1.6);
      if (rp <= 0.002) continue;
      var ry = H * 0.475 + r * H * 0.105;
      var rh = H * 0.088;
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 2.45 + r * 0.24, 2.70 + r * 0.24) * 1.5);
      var lift = (1 - clamp(rp)) * H * 0.04;
      var hv = hover(t, r + 3, 0.0055);
      card(ctx, M, ry + lift + hv, CW, rh, rh * 0.30, 0.75 + 0.08 * osc(t, 0.33, r));
      shine(ctx, M, ry + lift + hv, CW, rh, rh * 0.30, t, 2.2, 0.34, r * 0.28);
      setFont(ctx, '700', W * 0.046);
      ctx.fillStyle = C.ink;
      ctx.fillText(RESULTS[r], M + W * 0.050, ry + lift + hv + rh * 0.62);
      for (var k = 0; k < 3; k++) {
        tickMark(ctx, M + CW - W * 0.055 - k * W * 0.062, ry + lift + hv + rh / 2, W * 0.021,
          inv(t, 2.80 + r * 0.24 + (2 - k) * 0.09, 3.06 + r * 0.24 + (2 - k) * 0.09),
          null, Math.sin(t * 2.2 + r * 1.1 + k * 0.7));
      }
      ctx.restore();
    }
    var burst = inv(t, 3.90, 5.00);
    if (burst > 0 && burst < 1) confetti(ctx, W / 2, H * 0.56, burst, W * 0.62);

    ctx.save();
    wipeLabel(ctx, 'AI DOMAIN NAME GENERATOR  ·  LIVE AVAILABILITY', H * 0.845, W * 0.025, C.ink3,
      W * 0.0075, inv(t, 4.40, 5.40), smooth(inv(t, 4.35, 4.75)) * 0.95);
    ctx.restore();
  }

  /* --- 6. CLOSE · 30–36 --------------------------------------------------- */
  function sceneClose(ctx, t, dur) {
    paper(ctx, t, [[C.peach, 0.28, 0.30, 0.72, 0.035, 0.05, 1.0],
                   [C.mint, 0.76, 0.66, 0.62, 0.035, 0.041, 0.8],
                   [C.sky, 0.40, 0.94, 0.62, 0.03, 0.034, 0.5]]);

    // the three result cards collapse into the mark
    var gather = easeIn(inv(t, 0.00, 0.80));
    for (var r = 0; r < 3; r++) {
      if (gather >= 0.999) break;
      var ry = lerp(H * 0.475 + r * H * 0.105, H * 0.40, gather);
      var sc = lerp(1, 0.22, gather);
      var rh = H * 0.088;
      ctx.save();
      ctx.globalAlpha = 1 - smooth(inv(gather, 0.55, 1));
      ctx.translate(W / 2, ry + rh / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -(ry + rh / 2));
      card(ctx, M, ry, CW, rh, rh * 0.30, 0.7);
      setFont(ctx, '700', W * 0.046);
      ctx.fillStyle = C.ink;
      ctx.fillText(RESULTS[r], M + W * 0.050, ry + rh * 0.62);
      for (var k = 0; k < 3; k++) {
        tickMark(ctx, M + CW - W * 0.055 - k * W * 0.062, ry + rh / 2, W * 0.021, 1,
          null, Math.sin(t * 2.2 + r * 1.1 + k * 0.7));
      }
      ctx.restore();
    }

    var SNAP = 0.92;
    var snapped = t >= SNAP;
    // the three checks come with it
    for (var i = 0; i < 3; i++) {
      var dp = spring(inv(t, 1.30 + i * 0.10, 1.95 + i * 0.10), 1.5);
      if (dp <= 0.002) continue;
      var w = CW / 3 - W * 0.016, x = M + i * (CW / 3) + W * 0.008;
      var y = H * 0.175 + (1 - clamp(dp)) * H * 0.025 + hover(t, i, 0.004), h = H * 0.062;
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 1.30 + i * 0.10, 1.55 + i * 0.10) * 1.5);
      card(ctx, x, y, w, h, h * 0.34, 0.45, { fill: CHECKS[i].tint, border: false });
      shine(ctx, x, y, w, h, h * 0.34, t, 2.1, 0.40, i * 0.26);
      badge(ctx, x + h * 0.44, y + h / 2, h * 0.22, CHECKS[i].n, 1);
      setFont(ctx, '700', W * 0.0245);
      ctx.fillStyle = C.ink2;
      ctx.fillText(['available', 'brandable', 'handle'][i], x + h * 0.80, y + h / 2 + W * 0.009);
      ctx.restore();
    }
    if (snapped) {
      var lsw = 1 + 0.016 * osc(t, 0.55);
      var s1 = W * 0.155 * lsw;
      lockup(ctx, W / 2, H * 0.415 + hover(t, 9, 0.0035), s1, { swoosh: smooth(inv(t, 1.05, 1.62)), reserveSwoosh: true });

      var ba = inv(t, SNAP, SNAP + 0.95);
      if (ba > 0 && ba < 1) confetti(ctx, W / 2, H * 0.42, ba, W * 0.60);

      var ua = smooth(inv(t, 1.75, 2.15));
      if (ua > 0.01) {
        ctx.save();
        ctx.globalAlpha = ua;
        setFont(ctx, '700', W * 0.044);
        var url = 'zerotaken.com';
        var uw = trackW(ctx, url, W * 0.006);
        ctx.fillStyle = C.ink;
        trackFill(ctx, url, (W - uw) / 2, H * 0.600, W * 0.006);
        ctx.restore();
      }

      var ca = spring(inv(t, 2.30, 2.98), 1.7);
      if (ca > 0.004) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, inv(t, 2.30, 2.56) * 1.5);
        var bw = W * 0.56, bh = H * 0.070;
        var bx = (W - bw) / 2, by2 = H * 0.672 + (1 - clamp(ca)) * H * 0.02;
        ctx.save();
        ctx.translate(W / 2, by2 + bh / 2); ctx.scale(ca, ca); ctx.translate(-W / 2, -(by2 + bh / 2));
        ctx.shadowColor = hexa(C.orange, 0.42); ctx.shadowBlur = H * 0.030; ctx.shadowOffsetY = H * 0.012;
        rr(ctx, bx, by2, bw, bh, bh / 2);
        var g2 = ctx.createLinearGradient(bx, by2, bx + bw, by2 + bh);
        g2.addColorStop(0, '#FF9A2B'); g2.addColorStop(1, C.orange);
        ctx.fillStyle = g2; ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        setFont(ctx, '700', W * 0.034);
        var lbl = 'Free to search';
        var lw2 = ctx.measureText(lbl).width;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(lbl, W / 2 - lw2 / 2, by2 + bh * 0.63);
        // a shine crossing the button on a loop
        var q = ((t - 2.30) % 2.0) / 2.0;
        if (q < 0.40) {
          ctx.save();
          rr(ctx, bx, by2, bw, bh, bh / 2); ctx.clip();
          ctx.globalAlpha = 0.45 * Math.sin(q / 0.40 * Math.PI);
          var sx = lerp(bx - bw * 0.3, bx + bw * 1.3, q / 0.40);
          var sg = ctx.createLinearGradient(sx - bw * 0.16, 0, sx + bw * 0.16, 0);
          sg.addColorStop(0, 'rgba(255,255,255,0)');
          sg.addColorStop(0.5, 'rgba(255,255,255,0.85)');
          sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sg; ctx.fillRect(bx, by2, bw, bh);
          ctx.restore();
        }
        ctx.restore();
        ctx.restore();
      }

      var fa = smooth(inv(t, 3.20, 3.60));
      if (fa > 0.01) {
        ctx.save();
        wipeLabel(ctx, 'CHECKED BEFORE YOU EVER SEE IT', H * 0.800, W * 0.026, C.ink3,
          W * 0.0085, inv(t, 3.20, 4.05), fa * 0.95);
        ctx.restore();
      }
    }
  }

  /* ============================ TIMELINE ============================== */
  function cam(s0, s1, dy0, dy1, dx0, dx1) {
    return function (t, dur) {
      var e = easeOut(inv(t, 0, dur));
      var q = inv(t, 0, dur);                    // a slow linear drift on top
      return { s: lerp(s0, s1, e) * (1 + 0.012 * q),
               dx: lerp(dx0 || 0, dx1 || 0, q) * W,
               dy: lerp(dy0, dy1, e) * H };
    };
  }
  var TIMELINE = [
    { name: 'hook', end: 4.0, fn: sceneHook, cam: cam(1.00, 1.075, 0, -0.010, 0, 0.006) },
    { name: 'check1', end: 10.0, fn: sceneCheck1, cam: cam(1.10, 1.00, -0.008, 0.006, 0.008, -0.008) },
    { name: 'check2', end: 16.0, fn: sceneCheck2, cam: cam(1.00, 1.085, 0.008, -0.008, -0.008, 0.008) },
    { name: 'check3', end: 22.0, fn: sceneCheck3, cam: cam(1.10, 1.00, -0.008, 0.006, 0.008, -0.008) },
    { name: 'shortcut', end: 30.0, fn: sceneShortcut, cam: cam(1.00, 1.075, 0.008, -0.008, -0.006, 0.006) },
    { name: 'close', end: 36.0, fn: sceneClose, cam: cam(1.09, 1.00, -0.006, 0.004, 0.005, -0.005) }
  ];
  var DUR = TIMELINE[TIMELINE.length - 1].end;

  function drawFrame(ctx, t) {
    t = Math.max(0, Math.min(DUR - 0.0001, t));
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.fillStyle = C.paper; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
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
    paperGrain(ctx, t, 0.035);
    watermark(ctx);
    ctx.restore();
  }

  return {
    W: W, H: H, FPS: FPS, DUR: DUR, BRAND: BRAND, TIMELINE: TIMELINE, C: C,
    drawFrame: drawFrame
  };
});
