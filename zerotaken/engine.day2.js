/* ============================================================================
   ZEROTAKEN — day 2  ·  "Everything taken?"
   9:16 · 1080x1920 · 30fps · 36.0s
   ----------------------------------------------------------------------------
   A deliberately BRIGHT film, not a recolour of the dark one. The dark house
   style makes light the subject; here the subject is paper and shadow. Depth
   comes from elevation, colour from soft washes and flat brand tints, and the
   motion is springy the way light product UI is, rather than floaty.

    0– 4  PAIN 1    a feed of names, each stamped TAKEN  "Everything taken?"
    4– 8  PAIN 2    the AI generator's names, also gone  "Even the AI ones?"
    8–14  THE FIX   brand, then results that are free    "Only what you can register"
   14–20  PRICE     $12 registrar vs $2,450 aftermarket  "At the real price"
   20–24  SCORE     brandability dial to 92              "Scored before you buy"
   24–28  HANDLE    five platforms tick free             "And the handle"
   28–34  CLOSE     results collapse into the logo       "zerotaken.com"
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


  /* ---------------------------------------------------------------------
     Floating icon tiles — the motion language from the dark film, rebuilt
     for light: a white squircle with a COLOURED shadow standing in for the
     neon halo, a tinted wash inside, and a coloured symbol.
     --------------------------------------------------------------------- */
  function gCheck(ctx, s, col) {
    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = col; ctx.lineWidth = s * 0.20;
    ctx.beginPath();
    ctx.moveTo(-s * 0.44, s * 0.02); ctx.lineTo(-s * 0.12, s * 0.34); ctx.lineTo(s * 0.46, -s * 0.34);
    ctx.stroke(); ctx.restore();
  }
  function gGlobe(ctx, s, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = s * 0.11;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.46, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, 0, s * 0.20, s * 0.46, 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.46, 0); ctx.lineTo(s * 0.46, 0); ctx.stroke();
    ctx.restore();
  }
  function gTag(ctx, s, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = s * 0.11; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-s * 0.08, -s * 0.44); ctx.lineTo(s * 0.44, -s * 0.44);
    ctx.lineTo(s * 0.44, s * 0.08); ctx.lineTo(-s * 0.06, s * 0.46);
    ctx.lineTo(-s * 0.46, s * 0.06); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(s * 0.22, -s * 0.22, s * 0.08, 0, TAU);
    ctx.fillStyle = col; ctx.fill();
    ctx.restore();
  }
  function gStar(ctx, s, col) {
    ctx.save();
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.50);
    ctx.quadraticCurveTo(s * 0.10, -s * 0.10, s * 0.50, 0);
    ctx.quadraticCurveTo(s * 0.10, s * 0.10, 0, s * 0.50);
    ctx.quadraticCurveTo(-s * 0.10, s * 0.10, -s * 0.50, 0);
    ctx.quadraticCurveTo(-s * 0.10, -s * 0.10, 0, -s * 0.50);
    ctx.fill(); ctx.restore();
  }
  function gAt(ctx, s, col) {
    ctx.save();
    setFont(ctx, '700', s * 1.10);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col; ctx.fillText('@', 0, s * 0.02);
    ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.restore();
  }
  function gLock(ctx, s, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = s * 0.11; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -s * 0.14, s * 0.24, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-s * 0.24, -s * 0.14); ctx.lineTo(-s * 0.24, s * 0.02);
    ctx.moveTo(s * 0.24, -s * 0.14); ctx.lineTo(s * 0.24, s * 0.02); ctx.stroke();
    rr(ctx, -s * 0.40, s * 0.00, s * 0.80, s * 0.46, s * 0.12);
    ctx.fillStyle = col; ctx.fill();
    ctx.restore();
  }
  function gSearch(ctx, s, col) {
    ctx.save();
    ctx.strokeStyle = col; ctx.lineWidth = s * 0.12; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(-s * 0.08, -s * 0.08, s * 0.30, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(s * 0.14, s * 0.14); ctx.lineTo(s * 0.42, s * 0.42); ctx.stroke();
    ctx.restore();
  }
  function gText(txt) {
    return function (ctx, s, col) {
      ctx.save();
      setFont(ctx, '700', s * 0.62);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = col; ctx.fillText(txt, 0, 0);
      ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.restore();
    };
  }
  var GLYPHS = [gCheck, gGlobe, gStar, gAt, gSearch, gCheck, gStar];

  function iconTile(ctx, o) {
    var s = o.size, h = s / 2, r = s * 0.30;
    var a = o.alpha === undefined ? 1 : o.alpha;
    if (a <= 0.004 || s <= 1) return;
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * a;
    ctx.translate(o.x, o.y);
    if (o.rot) ctx.rotate(o.rot);
    // the coloured shadow is what the neon halo becomes on paper
    ctx.shadowColor = hexa(o.hue, 0.40 * (o.elev === undefined ? 1 : o.elev));
    ctx.shadowBlur = s * 0.46; ctx.shadowOffsetY = s * 0.15;
    rr(ctx, -h, -h, s, s, r);
    ctx.fillStyle = C.card; ctx.fill();
    ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.save();
    rr(ctx, -h, -h, s, s, r); ctx.clip();
    wash(ctx, -h * 0.32, -h * 0.32, s * 0.92, s * 0.92, o.tint || o.hue, 0.85);
    ctx.restore();
    rr(ctx, -h + 1, -h + 1, s - 2, s - 2, r);
    ctx.lineWidth = 1.6; ctx.strokeStyle = C.line; ctx.stroke();
    if (o.symbol) o.symbol(ctx, s * 0.46, o.hue);
    if (o.badge > 0.001) tickMark(ctx, h * 0.66, -h * 0.66, s * 0.17, o.badge, null, o.pulse || 0);
    ctx.restore();
  }

  /* a drift of small icon tiles behind everything, with parallax */
  var ICONS = (function () {
    var r = rng(80531), a = [];
    for (var i = 0; i < 8; i++) {
      a.push({ x: r(), y: r(), z: 0.35 + 0.65 * r(), sp: 0.022 + 0.035 * r(),
               ph: r() * TAU, spin: (r() - 0.5) * 0.45, g: (r() * 7) | 0, c: (r() * 5) | 0 });
    }
    return a;
  })();
  function floatingIcons(ctx, t, amt) {
    if (amt <= 0.002) return;
    var hues = [C.orange, C.green, '#7A5BFF', '#2F8BD6', C.gold];
    var tints = [C.peach, C.mint, C.lav, C.sky, C.peach];
    for (var i = 0; i < ICONS.length; i++) {
      var f = ICONS[i];
      var y = ((f.y - t * f.sp * f.z) % 1 + 1) % 1;
      var xr = f.x < 0.5 ? f.x * 0.34 : 0.66 + (f.x - 0.5) * 0.68;
      var x = xr + Math.sin(t * 0.22 + f.ph) * 0.040 * f.z;
      iconTile(ctx, {
        x: x * W, y: y * H, size: W * (0.062 + 0.078 * f.z),
        rot: f.spin * t + f.ph, alpha: amt * (0.52 + 0.40 * f.z),
        hue: hues[f.c], tint: tints[f.c], symbol: GLYPHS[f.g], elev: 0.80 * f.z
      });
    }
  }

  /* ============================== SCENES ==============================
     Opens on the pain, the way the dark film does: a feed of names the
     viewer has already tried, each one stamped TAKEN as it goes past. */

  var TRIED = ['northstar.com', 'lumen.com', 'brightpath.com', 'kindred.com',
               'atlas.com', 'vertex.com', 'summit.com', 'orbit.com',
               'helix.com', 'cobalt.com', 'meridian.com', 'quanta.com'];

  /* one row of the feed, in its two states */
  function feedCard(ctx, o) {
    var w = o.w * o.scale, h = o.h * o.scale, r = h * 0.32;
    if (o.alpha <= 0.004) return;
    var x = o.x - w / 2, y = o.y - h / 2;
    ctx.save();
    ctx.globalAlpha = o.alpha;
    card(ctx, x, y, w, h, r, o.elev, { fill: o.struck > 0.5 ? '#FFF6F7' : C.card });
    var fs = h * 0.36;
    setFont(ctx, '700', fs);
    var tx = x + h * 0.42, ty = o.y + fs * 0.35;
    var tw = ctx.measureText(o.text).width;
    ctx.fillStyle = o.struck > 0.4 ? mix(C.ink, '#B9AFA6', o.struck) : C.ink;
    ctx.fillText(o.text, tx, ty);
    if (o.struck > 0.02) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = Math.max(2, h * 0.055);
      ctx.strokeStyle = C.red;
      ctx.beginPath();
      ctx.moveTo(tx - fs * 0.10, o.y + fs * 0.02);
      ctx.lineTo(tx - fs * 0.10 + (tw + fs * 0.20) * clamp(o.struck * 1.35), o.y + fs * 0.02);
      ctx.stroke();
      ctx.restore();
      var bp = clamp((o.struck - 0.20) / 0.45);
      if (bp > 0.01) {
        setFont(ctx, '700', h * 0.24);
        var lbl = o.label || 'TAKEN';
        var lw = ctx.measureText(lbl).width, pw = h * 0.34;
        var bw = lw + pw * 2, bh = h * 0.52;
        var k = spring(bp, 2.0);
        ctx.save();
        ctx.translate(x + w - h * 0.40 - bw / 2, o.y);
        ctx.scale(k, k);
        rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
        ctx.fillStyle = C.rose; ctx.fill();
        ctx.fillStyle = '#B32438';
        ctx.fillText(lbl, -lw / 2, h * 0.085);
        ctx.restore();
      }
    } else {
      // still checking
      ctx.save();
      ctx.globalAlpha = ctx.globalAlpha * (0.35 + 0.35 * Math.abs(Math.sin(o.y * 0.01 + o.spin)));
      ctx.beginPath(); ctx.arc(x + w - h * 0.52, o.y, h * 0.10, 0, TAU);
      ctx.fillStyle = C.ink3; ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function feed(ctx, t, o) {
    var count = 10, step = o.step, focusY = o.focusY;
    var top = focusY - step * 3.4;
    var frac = ((o.scroll % 1) + 1) % 1;
    var base = Math.floor(o.scroll);
    for (var i = count - 1; i >= 0; i--) {
      var yy = top + (i - frac) * step;
      var idx = ((i + base) % TRIED.length + TRIED.length) % TRIED.length;
      var d = (yy - focusY) / (H * 0.34);
      var sc = (1 - Math.min(0.34, Math.abs(d) * 0.26)) * o.scale;
      var al = clamp(1.25 - Math.abs(d) * 1.25) * o.alpha;
      if (al <= 0.005) continue;
      feedCard(ctx, {
        x: W / 2 + Math.sin(t * 0.5 + i * 0.9) * W * 0.004,
        y: yy, w: CW, h: H * 0.078, scale: sc, alpha: al,
        text: TRIED[idx], spin: i * 1.3,
        elev: 0.35 + 0.55 * clamp(1 - Math.abs(d) * 1.3),
        struck: smooth(clamp((focusY - yy) / (step * 0.62)))
      });
    }
    // the feed fades out at both ends instead of being cut off
    var g1 = ctx.createLinearGradient(0, focusY - step * 4.2, 0, focusY - step * 1.7);
    g1.addColorStop(0, C.paper); g1.addColorStop(1, hexa(C.paper, 0));
    ctx.fillStyle = g1; ctx.fillRect(0, focusY - step * 5.0, W, step * 3.3);
    var g2 = ctx.createLinearGradient(0, focusY + step * 2.2, 0, focusY + step * 5.4);
    g2.addColorStop(0, hexa(C.paper, 0)); g2.addColorStop(1, C.paper);
    ctx.fillStyle = g2; ctx.fillRect(0, focusY + step * 2.2, W, step * 3.6);
  }

  /* --- 1. PAIN · 0–4 · everything you type is taken ----------------------- */
  function sceneFeed(ctx, t, dur) {
    paper(ctx, t, [[C.rose, 0.24, 0.24, 0.66, 0.03, 0.05, 0.85],
                   [C.peach, 0.80, 0.58, 0.60, 0.035, 0.042, 0.70],
                   [C.sky, 0.44, 0.94, 0.62, 0.03, 0.034, 0.45]]);
    floatingIcons(ctx, t, 1.0);

    feed(ctx, t, {
      scroll: 1.2 + t * 0.78, focusY: H * 0.585, step: H * 0.098,
      scale: 1, alpha: 1
    });

    riseWords(ctx, 'Everything taken?', H * 0.150, W * 0.100, inv(t, -0.16, 0.60),
      { hotWords: [1], hot: C.red });

    // a counter of how many the viewer has already burned through
    var cp = easeOut4(inv(t, 0.30, 2.60));
    var cnt = Math.round(lerp(0, 137, cp));
    ctx.save();
    ctx.globalAlpha = smooth(inv(t, 0.22, 0.60));
    chip(ctx, W / 2, H * 0.228, cnt + ' names tried', W * 0.032, C.rose, '#B32438', 1);
    ctx.restore();

    ctx.save();
    wipeLabel(ctx, 'SEARCH · TAKEN · REPEAT', H * 0.905, W * 0.026, C.ink3,
      W * 0.0090, inv(t, 1.60, 2.40), smooth(inv(t, 1.55, 1.95)) * 0.95);
    ctx.restore();
  }

  /* --- 2. PAIN · 4–8 · the AI ones were taken too ------------------------- */
  var AI_NAMES = ['brightpath.com', 'nordly.com', 'craftbase.com'];
  var AI_BADGE = ['TAKEN', '$2,450', 'TAKEN'];
  function sceneAI(ctx, t, dur) {
    paper(ctx, t, [[C.rose, 0.26, 0.26, 0.68, 0.03, 0.049, 0.90],
                   [C.lav, 0.78, 0.60, 0.58, 0.035, 0.041, 0.65],
                   [C.peach, 0.42, 0.94, 0.60, 0.03, 0.033, 0.50]]);
    floatingIcons(ctx, t, 1.0);

    riseWords(ctx, 'Even the AI ones?', H * 0.148, W * 0.100, inv(t, -0.16, 0.64),
      { hotWords: [2], hot: C.red });

    var ch = H * 0.400, cy = H * 0.545;
    var p = spring(inv(t, -0.06, 0.70), 1.4);
    var fail = smooth(inv(t, 2.55, 3.30));
    ctx.save();
    var top = cy - ch / 2 + (1 - clamp(p)) * H * 0.22 + hover(t, 0);
    ctx.translate(W / 2, top + ch / 2);
    ctx.rotate(fail * 0.035);
    ctx.translate(-W / 2, -(top + ch / 2));
    card(ctx, M, top, CW, ch, W * 0.055, 0.9 + 0.06 * osc(t, 0.34));
    shine(ctx, M, top, CW, ch, W * 0.055, t, 2.4, 0.30);

    setFont(ctx, '700', W * 0.040);
    ctx.fillStyle = C.ink3;
    ctx.fillText('AI NAME GENERATOR', M + W * 0.055, top + H * 0.058);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(M + W * 0.05, top + H * 0.086); ctx.lineTo(M + CW - W * 0.05, top + H * 0.086);
    ctx.stroke();

    for (var i = 0; i < 3; i++) {
      var rp = smooth(inv(t, 0.16 + i * 0.14, 0.56 + i * 0.14));
      if (rp <= 0.004) continue;
      var ry = top + H * 0.150 + i * H * 0.088;
      var hit = smooth(inv(t, 1.35 + i * 0.34, 1.75 + i * 0.34));
      ctx.save();
      ctx.globalAlpha = rp;
      ctx.translate((1 - rp) * W * 0.06, 0);
      var rh = H * 0.070;
      rr(ctx, M + W * 0.050, ry - rh / 2, CW - W * 0.100, rh, rh * 0.34);
      ctx.fillStyle = hit > 0.4 ? '#FFF1F3' : '#F7F5F1'; ctx.fill();
      setFont(ctx, '700', W * 0.038);
      var tx = M + W * 0.082, tw = ctx.measureText(AI_NAMES[i]).width;
      ctx.fillStyle = mix(C.ink, '#B9AFA6', hit);
      ctx.fillText(AI_NAMES[i], tx, ry + W * 0.013);
      if (hit > 0.02) {
        ctx.save();
        ctx.lineCap = 'round'; ctx.lineWidth = W * 0.008;
        ctx.strokeStyle = C.red;
        ctx.beginPath();
        ctx.moveTo(tx - W * 0.006, ry + W * 0.001);
        ctx.lineTo(tx - W * 0.006 + (tw + W * 0.012) * clamp(hit * 1.35), ry + W * 0.001);
        ctx.stroke();
        ctx.restore();
        var bp = clamp((hit - 0.25) / 0.45);
        if (bp > 0.01) {
          setFont(ctx, '700', W * 0.026);
          var lw = ctx.measureText(AI_BADGE[i]).width, bw = lw + W * 0.052, bh = rh * 0.62;
          var k = spring(bp, 2.0);
          ctx.save();
          ctx.translate(M + CW - W * 0.086 - bw / 2, ry);
          ctx.scale(k, k);
          rr(ctx, -bw / 2, -bh / 2, bw, bh, bh / 2);
          ctx.fillStyle = C.rose; ctx.fill();
          ctx.fillStyle = '#B32438';
          ctx.fillText(AI_BADGE[i], -lw / 2, W * 0.009);
          ctx.restore();
        }
      }
      ctx.restore();
    }
    ctx.restore();

    var v = spring(inv(t, 2.70, 3.40), 1.6);
    if (v > 0.002) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 2.70, 2.96) * 1.5);
      chip(ctx, W / 2, H * 0.800, 'GENERATED, THEN GONE', W * 0.030, C.rose, '#B32438', v);
      ctx.restore();
    }
    ctx.save();
    wipeLabel(ctx, 'THREE OF THREE, ALREADY REGISTERED', H * 0.885, W * 0.025, C.ink3,
      W * 0.0080, inv(t, 3.30, 4.05), smooth(inv(t, 3.25, 3.60)) * 0.95);
    ctx.restore();
  }

  /* --- 3. THE FIX · 8–14 -------------------------------------------------- */
  var GOOD = ['brewnorth.com', 'kindroast.com', 'ovalgrove.com'];
  function sceneFix(ctx, t, dur) {
    paper(ctx, t, [[C.peach, 0.26, 0.24, 0.70, 0.03, 0.05, 0.95],
                   [C.mint, 0.78, 0.56, 0.62, 0.035, 0.042, 0.80],
                   [C.sky, 0.42, 0.94, 0.62, 0.03, 0.034, 0.55]]);
    floatingIcons(ctx, t, 1.0);

    // the brand lands, then makes room for the product
    var shrink = smooth(inv(t, 1.35, 2.10));
    var ls = lerp(W * 0.150, W * 0.070, shrink);
    var ly = lerp(H * 0.400, H * 0.130, shrink);
    ctx.save();
    lockup(ctx, W / 2, ly + hover(t, 9, 0.003), ls,
      { swoosh: smooth(inv(t, 0.18, 0.80)), reserveSwoosh: true });
    ctx.restore();
    var ba = inv(t, 0.02, 0.95);
    if (ba > 0 && ba < 1) confetti(ctx, W / 2, H * 0.40, ba, W * 0.55);

    var ha = smooth(inv(t, 1.95, 2.40));
    if (ha > 0.01) {
      ctx.save();
      ctx.globalAlpha = ha;
      riseWords(ctx, 'Only what you can register', H * 0.255, W * 0.062, inv(t, 1.95, 2.75),
        { hotWords: [3, 4], hot: C.orange });
      ctx.restore();
    }

    // the search
    var sp2 = spring(inv(t, 2.20, 2.95), 1.4);
    var sy = H * 0.330, sh = H * 0.086;
    if (sp2 > 0.002) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 2.20, 2.44) * 1.5);
      var syh = sy + (1 - clamp(sp2)) * H * 0.06 + hover(t, 7, 0.004);
      card(ctx, M, syh, CW, sh, sh / 2, 0.8 + 0.08 * osc(t, 0.36));
      shine(ctx, M, syh, CW, sh, sh / 2, t, 2.0, 0.34);
      var by = syh + sh / 2;
      var q = 'eco coffee subscription';
      var tp = inv(t, 2.55, 3.45);
      var per = (3.45 - 2.55) / (q.length + 0.6);
      var n = Math.floor(clamp(tp) * (q.length + 0.6));
      var hold = clamp(1 - (t - (2.55 + n * per)) / 0.26);
      setFont(ctx, '700', W * 0.040);
      var r2 = typeOut(ctx, q, M + W * 0.055, by + W * 0.014, tp, W * 0.040, C.ink, C.orange, hold);
      if (!r2.done && tp > 0.01) caret(ctx, r2.x, by + W * 0.014, W * 0.040, t, 0.9, C.orange);
      var bw2 = W * 0.10;
      rr(ctx, M + CW - bw2 - sh * 0.16, by - (sh - sh * 0.32) / 2, bw2, sh - sh * 0.32, (sh - sh * 0.32) / 2);
      ctx.fillStyle = C.orange; ctx.fill();
      ctx.save();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = W * 0.008; ctx.lineCap = 'round';
      var mx = M + CW - bw2 / 2 - sh * 0.16, my = by;
      ctx.beginPath(); ctx.arc(mx - W * 0.004, my - W * 0.004, W * 0.014, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(mx + W * 0.006, my + W * 0.006); ctx.lineTo(mx + W * 0.017, my + W * 0.017); ctx.stroke();
      ctx.restore();
      ctx.restore();
    }

    // every result already registrable, at standard price
    for (var r = 0; r < 3; r++) {
      var rp = spring(inv(t, 3.55 + r * 0.22, 4.25 + r * 0.22), 1.6);
      if (rp <= 0.002) continue;
      var ry = H * 0.470 + r * H * 0.105, rh = H * 0.088;
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 3.55 + r * 0.22, 3.78 + r * 0.22) * 1.5);
      var lift = (1 - clamp(rp)) * H * 0.05, hv = hover(t, r + 3, 0.0055);
      card(ctx, M, ry + lift + hv, CW, rh, rh * 0.30, 0.75 + 0.08 * osc(t, 0.33, r));
      shine(ctx, M, ry + lift + hv, CW, rh, rh * 0.30, t, 2.2, 0.34, r * 0.28);
      setFont(ctx, '700', W * 0.046);
      ctx.fillStyle = C.ink;
      ctx.fillText(GOOD[r], M + W * 0.050, ry + lift + hv + rh * 0.62);
      var gp = inv(t, 3.85 + r * 0.22, 4.15 + r * 0.22);
      if (gp > 0.01) {
        setFont(ctx, '700', W * 0.026);
        var lbl = 'available · $12';
        var lw = ctx.measureText(lbl).width, bw3 = lw + W * 0.050, bh3 = rh * 0.52;
        var k2 = spring(clamp(gp), 1.9);
        ctx.save();
        ctx.translate(M + CW - W * 0.048 - bw3 / 2, ry + lift + hv + rh / 2);
        ctx.scale(k2, k2);
        rr(ctx, -bw3 / 2, -bh3 / 2, bw3, bh3, bh3 / 2);
        ctx.fillStyle = C.mint; ctx.fill();
        ctx.fillStyle = C.greenD;
        ctx.fillText(lbl, -lw / 2, W * 0.009);
        ctx.restore();
      }
      ctx.restore();
    }
    var burst = inv(t, 4.60, 5.55);
    if (burst > 0 && burst < 1) confetti(ctx, W / 2, H * 0.56, burst, W * 0.60);

    ctx.save();
    wipeLabel(ctx, 'AI DOMAIN NAME GENERATOR · LIVE AVAILABILITY', H * 0.885, W * 0.025, C.ink3,
      W * 0.0075, inv(t, 4.90, 5.75), smooth(inv(t, 4.85, 5.20)) * 0.95);
    ctx.restore();
  }


  /* --- TLD RING · 14–20 · the dark film's ring, in light ------------------ */
  var RING_TLD = ['.com', '.io', '.ai', '.app', '.dev', '.co', '.net', '.xyz'];
  var RING_HUE = ['#EF7908', '#2E9E33', '#7A5BFF', '#2F8BD6', '#E0364F', '#C9820A', '#1F9E86', '#B44BC9'];
  var RING_TINT = [C.peach, C.mint, C.lav, C.sky, C.rose, C.peach, C.mint, C.lav];
  function sceneRing(ctx, t, dur) {
    paper(ctx, t, [[C.sky, 0.24, 0.24, 0.68, 0.03, 0.048, 0.90],
                   [C.mint, 0.80, 0.58, 0.60, 0.035, 0.041, 0.75],
                   [C.peach, 0.44, 0.93, 0.62, 0.03, 0.034, 0.55]]);
    floatingIcons(ctx, t, 0.55);
    plainHead(ctx, t, 'Every extension, live', [1], C.orange);

    var ringY = H * 0.545;
    var p = easeOut(inv(t, -0.04, dur * 0.58));
    var rad = lerp(W * 0.045, W * 0.330, p);
    for (var j = 0; j < 8; j++) {
      // the formation keeps turning long after it has opened
      var ang = (j / 8 - 0.1875 + p * 0.09 + t * 0.030) * TAU;
      var bob = Math.sin(t * 1.25 + j * 0.85) * H * 0.007;
      iconTile(ctx, {
        x: W / 2 + Math.cos(ang) * rad * 0.95,
        y: ringY + Math.sin(ang) * rad * 1.16 + bob,
        size: W * 0.170 * lerp(0.46, 1.05, p),
        rot: Math.sin(ang) * 0.09 + 0.03 * Math.sin(t * 0.9 + j),
        alpha: smooth(inv(p, 0, 0.10)),
        hue: RING_HUE[j], tint: RING_TINT[j], symbol: gText(RING_TLD[j]),
        elev: 0.85 + 0.20 * Math.sin(t * 1.4 + j),
        badge: smooth(inv(t, 1.05 + j * 0.11, 1.34 + j * 0.11)),
        pulse: Math.sin(t * 2.0 + j * 0.8)
      });
    }
    var burst = inv(t, 2.05, 3.05);
    if (burst > 0 && burst < 1) confetti(ctx, W / 2, ringY, burst, W * 0.60);
    var v = spring(inv(t, 2.05, 2.75), 1.7);
    if (v > 0.002) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 2.05, 2.30) * 1.5);
      chip(ctx, W / 2, H * 0.822, '240+ EXTENSIONS', W * 0.034, C.sky, '#1B5E9B', v);
      ctx.restore();
    }
    var burst2 = inv(t, 4.10, 5.10);
    if (burst2 > 0 && burst2 < 1) {
      ctx.save();
      ctx.globalAlpha = 0.20 * Math.sin(burst2 * Math.PI);
      ctx.lineWidth = 14 + 40 * burst2;
      ctx.strokeStyle = C.orange;
      ctx.beginPath(); ctx.arc(W / 2, ringY, rad * (1.20 + 0.45 * burst2), 0, TAU); ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    wipeLabel(ctx, 'QUERIED AGAINST THE REGISTRY, NOT A CACHE', H * 0.895, W * 0.025, C.ink3,
      W * 0.0072, inv(t, 3.10, 3.95), smooth(inv(t, 3.05, 3.40)) * 0.95);
    ctx.restore();
  }

  /* --- 4. THE REAL PRICE · 14–20 ------------------------------------------ */
  function scenePrice(ctx, t, dur) {
    paper(ctx, t, [[C.peach, 0.25, 0.22, 0.66, 0.03, 0.05, 0.95],
                   [C.rose, 0.78, 0.62, 0.60, 0.035, 0.041, 0.70],
                   [C.mint, 0.35, 0.92, 0.60, 0.03, 0.033, 0.50]]);
    floatingIcons(ctx, t, 1.0);
    plainHead(ctx, t, 'At the real price', [3], C.orange);

    var ch = H * 0.400, cy = H * 0.520;
    var p = spring(inv(t, -0.06, 0.72), 1.4);
    ctx.save();
    var top = cy - ch / 2 + (1 - clamp(p)) * H * 0.24 + hover(t, 0);
    card(ctx, M, top, CW, ch, W * 0.055, 0.9 + 0.06 * osc(t, 0.34));
    shine(ctx, M, top, CW, ch, W * 0.055, t, 2.6, 0.30);

    setFont(ctx, '700', W * 0.058);
    ctx.fillStyle = C.ink;
    ctx.fillText('brewnorth.com', M + W * 0.058, top + H * 0.074);
    setFont(ctx, '400', W * 0.030);
    ctx.fillStyle = C.ink3;
    ctx.fillText('what it actually costs', M + W * 0.058, top + H * 0.112);
    ctx.strokeStyle = C.line; ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(M + W * 0.05, top + H * 0.142); ctx.lineTo(M + CW - W * 0.05, top + H * 0.142);
    ctx.stroke();

    var focus = smooth(inv(t, 3.95, 4.70));
    ctx.save();
    ctx.globalAlpha = ctx.globalAlpha * (1 - focus * 0.58);
    ctx.translate(0, focus * H * 0.012);
    priceRow(ctx, t, M + W * 0.058, top + H * 0.322, CW - W * 0.116,
      'Aftermarket ask', '$' + Math.round(lerp(0, 2450, easeOut4(inv(t, 1.45, 2.25)))).toLocaleString('en-US'),
      C.red, false, 1.45, 2.20);
    ctx.restore();
    var fk = 1 + 0.055 * focus;
    ctx.save();
    ctx.translate(W / 2, top + H * 0.222); ctx.scale(fk, fk); ctx.translate(-W / 2, -(top + H * 0.222));
    if (focus > 0.02) {
      var rp2 = ((t - 3.95) % 1.25) / 1.25;
      ctx.save();
      ctx.globalAlpha = 0.55 * focus * Math.sin(rp2 * Math.PI);
      ctx.lineWidth = 4 + 10 * rp2;
      ctx.strokeStyle = C.green;
      rr(ctx, M + W * 0.058 - 10 - rp2 * 26, top + H * 0.222 - H * 0.039 - 8 - rp2 * 18,
        CW - W * 0.116 + 20 + rp2 * 52, H * 0.078 + 16 + rp2 * 36, H * 0.030);
      ctx.stroke();
      ctx.restore();
    }
    priceRow(ctx, t, M + W * 0.058, top + H * 0.222, CW - W * 0.116,
      'Standard registrar', '$12', C.green, true, 0.85, 1.20);
    ctx.restore();
    ctx.restore();

    // the brandability score lands on the winning row
    var sp3 = spring(inv(t, 3.35, 4.05), 1.8);
    if (sp3 > 0.002) {
      iconTile(ctx, {
        x: W / 2 - CW * 0.30, y: H * 0.762, size: W * 0.135 * clamp(sp3),
        rot: 0.05 * Math.sin(t * 0.9), alpha: Math.min(1, sp3 * 1.6),
        hue: C.orange, tint: C.peach, symbol: gStar,
        elev: 0.95 + 0.15 * Math.sin(t * 1.4)
      });
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 3.45, 3.75) * 1.6);
      setFont(ctx, '700', W * 0.072);
      ctx.fillStyle = C.ink;
      ctx.fillText('92', W / 2 - CW * 0.16, H * 0.782);
      setFont(ctx, '700', W * 0.026);
      ctx.fillStyle = C.greenD;
      ctx.fillText('EXCELLENT', W / 2 - CW * 0.16, H * 0.812);
      setFont(ctx, '400', W * 0.026);
      ctx.fillStyle = C.ink3;
      ctx.fillText('brandability score', W / 2 - CW * 0.16 + W * 0.155, H * 0.782);
      ctx.restore();
    }
    var v = spring(inv(t, 2.45, 3.15), 1.6);
    if (v > 0.002) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 2.45, 2.70) * 1.5) * (1 - smooth(inv(t, 3.30, 3.60)));
      chip(ctx, W / 2, H * 0.762, 'NO BROKER MARKUP', W * 0.030, C.mint, C.greenD, v);
      ctx.restore();
    }
    ctx.save();
    wipeLabel(ctx, 'PARKED, PREMIUM AND AFTERMARKET FILTERED OUT', H * 0.885, W * 0.024, C.ink3,
      W * 0.0070, inv(t, 3.15, 4.00), smooth(inv(t, 3.10, 3.45)) * 0.95);
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

  /* --- 6. THE HANDLE · 26–30 · platform tiles ---------------------------- */
  var PLAT = ['YT', 'IG', 'TT', 'FB', 'PIN'];
  var PLAT_HUE = ['#E0364F', '#C9349B', '#111111', '#2F6FD6', '#D62B3F'];
  var PLAT_TINT = [C.rose, C.lav, C.sky, C.sky, C.rose];
  function sceneHandles(ctx, t, dur) {
    paper(ctx, t, [[C.mint, 0.26, 0.26, 0.66, 0.03, 0.047, 0.95],
                   [C.sky, 0.78, 0.60, 0.58, 0.035, 0.039, 0.70],
                   [C.lav, 0.45, 0.93, 0.60, 0.03, 0.033, 0.50]]);
    floatingIcons(ctx, t, 0.55);
    plainHead(ctx, t, 'And the handle', [2], C.orange);

    // the handle itself, on a card
    var ha = spring(inv(t, -0.04, 0.60), 1.6);
    if (ha > 0.002) {
      var hw = W * 0.58, hh = H * 0.078;
      var hy = H * 0.352 + (1 - clamp(ha)) * H * 0.05 + hover(t, 5, 0.004);
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, -0.04, 0.20) * 1.5);
      card(ctx, (W - hw) / 2, hy, hw, hh, hh / 2, 0.8 + 0.08 * osc(t, 0.34));
      shine(ctx, (W - hw) / 2, hy, hw, hh, hh / 2, t, 2.0, 0.34);
      setFont(ctx, '700', hh * 0.46);
      var lbl = '@brewnorth';
      var lw = ctx.measureText(lbl).width;
      ctx.fillStyle = C.ink;
      ctx.fillText(lbl, W / 2 - lw / 2, hy + hh * 0.65);
      ctx.restore();
    }

    // five tiles on an arc, each ticking free
    var size = W * 0.166, gap = W * 0.030;
    var span = 5 * size + 4 * gap, x0 = W / 2 - span / 2 + size / 2;
    for (var i = 0; i < 5; i++) {
      var ap = spring(inv(t, 0.12 + i * 0.09, 0.76 + i * 0.09), 1.7);
      if (ap <= 0.002) continue;
      var arc = -Math.cos((i / 4 - 0.5) * Math.PI) * H * 0.018;
      iconTile(ctx, {
        x: x0 + i * (size + gap),
        y: H * 0.560 + arc + (1 - clamp(ap)) * H * 0.09 + Math.sin(t * 1.3 + i * 1.1) * H * 0.008,
        size: size * lerp(0.82, 1, clamp(ap)),
        rot: 0.04 * Math.sin(t * 0.85 + i),
        alpha: Math.min(1, ap * 1.6),
        hue: PLAT_HUE[i], tint: PLAT_TINT[i], symbol: gText(PLAT[i]),
        elev: 0.9 + 0.15 * Math.sin(t * 1.5 + i),
        badge: smooth(inv(t, 0.95 + i * 0.11, 1.24 + i * 0.11)),
        pulse: Math.sin(t * 2.1 + i * 0.9)
      });
    }

    var burst = inv(t, 1.60, 2.60);
    if (burst > 0 && burst < 1) confetti(ctx, W / 2, H * 0.56, burst, W * 0.55);
    var v = spring(inv(t, 1.60, 2.30), 1.7);
    if (v > 0.002) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, inv(t, 1.60, 1.85) * 1.5);
      chip(ctx, W / 2, H * 0.752, 'ALL FIVE FREE', W * 0.036, C.mint, C.greenD, v);
      ctx.restore();
    }
    ctx.save();
    wipeLabel(ctx, 'YOUTUBE · INSTAGRAM · TIKTOK · FACEBOOK · PINTEREST', H * 0.845,
      W * 0.023, C.ink3, W * 0.0045, inv(t, 2.10, 3.00), smooth(inv(t, 2.05, 2.40)) * 0.95);
    ctx.restore();
  }

  /* a headline that is present from the first frame of its beat */
  function plainHead(ctx, t, title, hotWords, hot) {
    var size = fitSize(ctx, title, CW - W * 0.04, W * 0.086, 0);
    ctx.save();
    riseWords(ctx, title, H * 0.180, size, inv(t, -0.16, 0.62), { hotWords: hotWords, hot: hot });
    ctx.restore();
    ctx.save();
    var railY = H * 0.222, railW = W * 0.20;
    rr(ctx, (W - railW) / 2, railY, railW, 6, 3);
    ctx.fillStyle = mix(C.orange, C.paper, 0.35); ctx.fill();
    shine(ctx, (W - railW) / 2, railY, railW, 6, 3, t, 1.6, 0.85, 0.1);
    ctx.restore();
  }

  /* --- 7. CLOSE · 28–34 --------------------------------------------------- */
  function sceneClose(ctx, t, dur) {
    paper(ctx, t, [[C.peach, 0.28, 0.30, 0.72, 0.035, 0.05, 1.0],
                   [C.mint, 0.76, 0.66, 0.62, 0.035, 0.041, 0.8],
                   [C.sky, 0.40, 0.94, 0.62, 0.03, 0.034, 0.5]]);
    floatingIcons(ctx, t, 1.0);

    // icon tiles spiral in and are absorbed into the mark
    for (var g = 0; g < 8; g++) {
      var gp = easeIn(inv(t, 0.02 + g * 0.045, 0.70 + g * 0.045));
      if (gp >= 0.999 || gp <= 0.001) continue;
      var ang = (g / 8) * TAU + 1.1 + gp * 1.3;
      var grad = lerp(Math.max(W, H) * 0.42, W * 0.05, gp);
      iconTile(ctx, {
        x: W / 2 + Math.cos(ang) * grad * 0.78,
        y: H * 0.395 + Math.sin(ang) * grad * 0.62,
        size: W * 0.115 * lerp(1, 0.25, gp),
        rot: ang * 0.5 + t * 0.4,
        alpha: Math.min(1, (1 - gp) * 2.2),
        hue: RING_HUE[g], tint: RING_TINT[g], symbol: gText(RING_TLD[g]),
        elev: 0.9
      });
    }
    var gather = easeIn(inv(t, 0.00, 0.80));
    for (var r = 0; r < 3; r++) {
      if (gather >= 0.999) break;
      var ry = lerp(H * 0.470 + r * H * 0.105, H * 0.40, gather);
      var sc = lerp(1, 0.22, gather), rh = H * 0.088;
      ctx.save();
      ctx.globalAlpha = 1 - smooth(inv(gather, 0.55, 1));
      ctx.translate(W / 2, ry + rh / 2); ctx.scale(sc, sc); ctx.translate(-W / 2, -(ry + rh / 2));
      card(ctx, M, ry, CW, rh, rh * 0.30, 0.7);
      setFont(ctx, '700', W * 0.046);
      ctx.fillStyle = C.ink;
      ctx.fillText(GOOD[r], M + W * 0.050, ry + rh * 0.62);
      setFont(ctx, '700', W * 0.026);
      var lbl = 'available · $12';
      var lw = ctx.measureText(lbl).width, bw3 = lw + W * 0.050, bh3 = rh * 0.52;
      ctx.save();
      ctx.translate(M + CW - W * 0.048 - bw3 / 2, ry + rh / 2);
      rr(ctx, -bw3 / 2, -bh3 / 2, bw3, bh3, bh3 / 2);
      ctx.fillStyle = C.mint; ctx.fill();
      ctx.fillStyle = C.greenD;
      ctx.fillText(lbl, -lw / 2, W * 0.009);
      ctx.restore();
      ctx.restore();
    }

    var SNAP = 0.92;
    if (t >= SNAP) {
      var s1 = W * 0.155 * (1 + 0.016 * osc(t, 0.55));
      lockup(ctx, W / 2, H * 0.395 + hover(t, 9, 0.0035), s1,
        { swoosh: smooth(inv(t, 1.05, 1.62)), reserveSwoosh: true });
      var ba = inv(t, SNAP, SNAP + 0.95);
      if (ba > 0 && ba < 1) confetti(ctx, W / 2, H * 0.40, ba, W * 0.60);

      var ua = smooth(inv(t, 1.75, 2.15));
      if (ua > 0.01) {
        ctx.save();
        ctx.globalAlpha = ua;
        setFont(ctx, '700', W * 0.044);
        var url = 'zerotaken.com';
        var uw = trackW(ctx, url, W * 0.006);
        ctx.fillStyle = C.ink;
        trackFill(ctx, url, (W - uw) / 2, H * 0.582, W * 0.006);
        ctx.restore();
      }

      var ca = spring(inv(t, 2.30, 2.98), 1.7);
      if (ca > 0.004) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, inv(t, 2.30, 2.56) * 1.5);
        var bw = W * 0.56, bh = H * 0.070;
        var bx = (W - bw) / 2, by2 = H * 0.660 + (1 - clamp(ca)) * H * 0.02;
        ctx.save();
        ctx.translate(W / 2, by2 + bh / 2); ctx.scale(ca, ca); ctx.translate(-W / 2, -(by2 + bh / 2));
        ctx.shadowColor = hexa(C.orange, 0.42); ctx.shadowBlur = H * 0.030; ctx.shadowOffsetY = H * 0.012;
        rr(ctx, bx, by2, bw, bh, bh / 2);
        var g2 = ctx.createLinearGradient(bx, by2, bx + bw, by2 + bh);
        g2.addColorStop(0, '#FF9A2B'); g2.addColorStop(1, C.orange);
        ctx.fillStyle = g2; ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0)'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
        setFont(ctx, '700', W * 0.034);
        var lbl2 = 'Free to search';
        var lw2 = ctx.measureText(lbl2).width;
        ctx.fillStyle = '#ffffff';
        ctx.fillText(lbl2, W / 2 - lw2 / 2, by2 + bh * 0.63);
        var q2 = ((t - 2.30) % 2.0) / 2.0;
        if (q2 < 0.40) {
          ctx.save();
          rr(ctx, bx, by2, bw, bh, bh / 2); ctx.clip();
          ctx.globalAlpha = 0.45 * Math.sin(q2 / 0.40 * Math.PI);
          var sx = lerp(bx - bw * 0.3, bx + bw * 1.3, q2 / 0.40);
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
        wipeLabel(ctx, 'NEVER SHOWS YOU A NAME YOU CANNOT HAVE', H * 0.775, W * 0.026, C.ink3,
          W * 0.0075, inv(t, 3.20, 4.05), fa * 0.95);
        ctx.restore();
      }
    }
  }

  /* ============================ TIMELINE ============================== */
  function cam(s0, s1, dy0, dy1, dx0, dx1) {
    return function (t, dur) {
      var e = easeOut(inv(t, 0, dur)), q = inv(t, 0, dur);
      return { s: lerp(s0, s1, e) * (1 + 0.012 * q),
               dx: lerp(dx0 || 0, dx1 || 0, q) * W,
               dy: lerp(dy0, dy1, e) * H };
    };
  }
  var TIMELINE = [
    { name: 'pain1', end: 4.0, fn: sceneFeed, cam: cam(1.00, 1.075, 0, -0.010, 0, 0.006) },
    { name: 'pain2', end: 8.0, fn: sceneAI, cam: cam(1.09, 1.00, -0.008, 0.006, 0.008, -0.008) },
    { name: 'fix', end: 14.0, fn: sceneFix, cam: cam(1.00, 1.075, 0.008, -0.008, -0.006, 0.006) },
    { name: 'ring', end: 20.0, fn: sceneRing, cam: cam(1.11, 1.00, -0.006, 0.004, 0.006, -0.006) },
    { name: 'price', end: 26.0, fn: scenePrice, cam: cam(1.00, 1.075, 0.008, -0.008, -0.008, 0.008) },
    { name: 'handles', end: 30.0, fn: sceneHandles, cam: cam(1.09, 1.00, -0.008, 0.006, 0.008, -0.008) },
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
