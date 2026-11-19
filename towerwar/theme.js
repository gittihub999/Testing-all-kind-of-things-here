// ===== SKIN / THEME =====
// Cizgi tərzli (toon) 3D hissi: qalın kontur, yumşaq işıq-kölgə, parlaq rənglər.
// Bütün vizual burada. Yalnız bu faylı dəyişməklə oyunun görünüşü tam dəyişir.
const INK = '#1d2b3a';
const THEME = {
  owners: {
    0: { name: 'Neytral',   main: '#b9b2a0', dark: '#7d7765', flag: '#e6e0cf', light: '#d8d2c0' },
    1: { name: 'Sən',       main: '#2f9bff', dark: '#1767c4', flag: '#bfe0ff', light: '#6fbaff' },
    2: { name: 'Qırmızı',   main: '#ff4d3d', dark: '#b8261a', flag: '#ffc2bb', light: '#ff8a7d' },
    3: { name: 'Sarı',      main: '#ffc928', dark: '#c4890a', flag: '#fff0b0', light: '#ffe26b' },
    4: { name: 'Yaşıl',     main: '#35c85a', dark: '#16853a', flag: '#c4f5cf', light: '#79e08f' },
    5: { name: 'Bənövşəyi', main: '#b25cff', dark: '#6d2bb0', flag: '#e2c2ff', light: '#cf94ff' }
  },

  // ---- köməkçilər ----
  rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); },
  shape(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || 3; ctx.strokeStyle = INK; ctx.lineJoin = 'round'; ctx.stroke(); },
  text(ctx, str, x, y, size) {
    ctx.font = '900 ' + size + 'px "Arial Black", Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.28; ctx.strokeStyle = INK; ctx.strokeText(str, x, y);
    ctx.fillStyle = '#fff'; ctx.fillText(str, x, y);
  },

  _bg: null,
  drawBackground(ctx, W, H, t) {
    if (!THEME._bg) {
      const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
      const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, '#86d94a'); grd.addColorStop(1, '#6cc13a');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      let s = 7; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < 70; i++) { // yumşaq ləkələr
        const x = rnd() * W, y = rnd() * H, r = 40 + rnd() * 90, dark = rnd() < 0.5;
        const rg = g.createRadialGradient(x, y, 0, x, y, r);
        rg.addColorStop(0, dark ? 'rgba(40,120,20,.16)' : 'rgba(210,255,120,.18)'); rg.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
      }
      for (let i = 0; i < 220; i++) { // ot dəstələri
        const x = rnd() * W, y = rnd() * H;
        g.strokeStyle = rnd() < 0.5 ? 'rgba(40,120,20,.5)' : 'rgba(200,255,130,.55)'; g.lineWidth = 2; g.lineCap = 'round';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x - 3, y - 7); g.moveTo(x, y); g.lineTo(x + 1, y - 9); g.moveTo(x, y); g.lineTo(x + 4, y - 6); g.stroke();
      }
      for (let i = 0; i < 40; i++) { // çiçəklər
        const x = rnd() * W, y = rnd() * H; g.fillStyle = ['#fff', '#ffe25a', '#ff9ac2'][i % 3];
        g.beginPath(); g.arc(x, y, 2.6, 0, 6.3); g.fill();
      }
      for (let i = 0; i < 16; i++) { // kənarlarda kol-ağac
        const left = i % 2 === 0, x = left ? -6 + rnd() * 30 : W + 6 - rnd() * 30, y = 80 + rnd() * (H - 160), r = 22 + rnd() * 16;
        g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(x, y + r * 0.8, r * 1.1, r * 0.4, 0, 0, 6.3); g.fill();
        g.beginPath(); g.arc(x, y, r, 0, 6.3); g.fillStyle = '#2f9e3a'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
        g.beginPath(); g.arc(x - r * 0.3, y - r * 0.3, r * 0.45, 0, 6.3); g.fillStyle = '#58c963'; g.fill();
      }
      const v = g.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, H * 0.8);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,60,10,.28)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
      THEME._bg = c;
    }
    ctx.drawImage(THEME._bg, 0, 0);
  },

  drawObstacle(ctx, o, t) {
    if (o.kind === 'lake') {
      ctx.beginPath(); ctx.ellipse(o.x, o.y + 3, o.r * 1.15, o.r * 0.85, 0, 0, 6.3); THEME.shape(ctx, '#d9c48a', 3);
      ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r * 1.05, o.r * 0.75, 0, 0, 6.3); ctx.fillStyle = '#3aa8f0'; ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) { const k = (t * 0.6 + i / 3) % 1; ctx.globalAlpha = 1 - k; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r * (0.2 + k * 0.7), o.r * (0.15 + k * 0.5), 0, 0.2, 2.6); ctx.stroke(); }
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.beginPath(); ctx.ellipse(o.x, o.y + o.r * 0.75, o.r * 1.05, o.r * 0.38, 0, 0, 6.3); ctx.fill();
      ctx.beginPath(); ctx.moveTo(o.x - o.r, o.y + o.r * 0.65); ctx.lineTo(o.x - o.r * 0.55, o.y - o.r * 0.65); ctx.lineTo(o.x + o.r * 0.15, o.y - o.r); ctx.lineTo(o.x + o.r * 0.95, o.y - o.r * 0.1); ctx.lineTo(o.x + o.r, o.y + o.r * 0.65); ctx.closePath();
      THEME.shape(ctx, '#9aa0aa', 3);
      ctx.beginPath(); ctx.moveTo(o.x - o.r * 0.55, o.y - o.r * 0.65); ctx.lineTo(o.x + o.r * 0.15, o.y - o.r); ctx.lineTo(o.x + o.r * 0.05, o.y + o.r * 0.1); ctx.lineTo(o.x - o.r * 0.65, o.y + o.r * 0.25); ctx.closePath();
      ctx.fillStyle = '#c6cbd3'; ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(o.x + o.r * 0.05, o.y + o.r * 0.1); ctx.lineTo(o.x + o.r * 0.15, o.y - o.r); ctx.stroke();
    }
  },

  // yol: owner rəngli lent + ağ qırıq-qırıq mərkəz xətti
  drawRoad(ctx, a, b, owner, t, preview, bad) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = dx / d, ny = dy / d;
    ctx.save(); ctx.lineCap = 'round';
    const col = bad ? '#ff3b3b' : preview ? '#ffffff' : THEME.owners[owner].main;
    ctx.globalAlpha = preview ? 0.7 : 1;
    ctx.strokeStyle = INK; ctx.lineWidth = preview ? 12 : 18; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = preview ? 8 : 13; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    if (!preview) {
      ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.lineWidth = 3; ctx.setLineDash([10, 12]); ctx.lineDashOffset = -t * 36;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      const mx = a.x + nx * d * 0.5, my = a.y + ny * d * 0.5; // istiqamət oxu ortada
      ctx.beginPath(); ctx.moveTo(mx + nx * 9, my + ny * 9); ctx.lineTo(mx - nx * 6 - ny * 8, my - ny * 6 + nx * 8); ctx.lineTo(mx - nx * 6 + ny * 8, my - ny * 6 - nx * 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    ctx.restore();
  },

  // bir qüllə: krem gövdə + rəngli zolaq + dişli rəngli başlıq
  tower(ctx, x, y, w, h, o, lit) {
    const top = y - h;
    ctx.beginPath(); THEME.rr(ctx, x - w / 2, top, w, h, 4); THEME.shape(ctx, '#f4ead2', 3);
    ctx.fillStyle = 'rgba(120,90,50,.28)'; ctx.fillRect(x + w * 0.1, top + 2, w * 0.4 - 1, h - 4);   // kölgə tərəfi
    ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillRect(x - w * 0.38, top + 4, w * 0.12, h - 8);    // parlaq ləkə
    ctx.fillStyle = o.main; ctx.fillRect(x - w / 2 + 1.5, top + h * 0.42, w - 3, h * 0.16);           // rəng zolağı
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.strokeRect(x - w / 2 + 1.5, top + h * 0.42, w - 3, h * 0.16);
    // başlıq
    const hw = w + 8;
    ctx.beginPath(); THEME.rr(ctx, x - hw / 2, top - 9, hw, 12, 3); THEME.shape(ctx, o.main, 3);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.rect(x - hw / 2 + 1 + i * (hw - 6) / 2.2, top - 17, hw / 4, 9); THEME.shape(ctx, o.main, 2.5); }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - hw / 2 + 3, top - 7, hw - 6, 3);
    // pəncərə
    ctx.fillStyle = '#35465a'; THEME.rr(ctx, x - 3, top + h * 0.7, 6, h * 0.2, 2); ctx.fill();
  },

  drawHouse(ctx, b, t, selected) {
    const o = THEME.owners[b.owner], lv = b.level, x = b.x, y = b.y;
    const rx = 44 + lv * 6, ry = 22 + lv * 3;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 22, rx + 6, ry + 4, 0, 0, 6.3); ctx.fill();
    if (selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(x, y + 6, b.r + 10 + Math.sin(t * 8) * 2, 0, 6.3); ctx.stroke(); }
    // platforma + daş divar halqası
    ctx.beginPath(); ctx.ellipse(x, y + 16, rx, ry, 0, 0, 6.3); THEME.shape(ctx, o.dark, 3.5);
    ctx.beginPath(); ctx.ellipse(x, y + 12, rx - 6, ry - 4, 0, 0, 6.3); THEME.shape(ctx, '#e8d3a0', 3);
    ctx.fillStyle = o.light; ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.ellipse(x, y + 12, rx - 14, ry - 10, 0, 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
    // qüllələr (arxadan önə)
    const th = 36 + lv * 6, tw = 20;
    const spots = lv === 0 ? [[0, 8]] : lv === 1 ? [[-rx * 0.5, 12], [rx * 0.5, 12]] : [[0, 2], [-rx * 0.58, 14], [rx * 0.58, 14]];
    spots.sort((p, q) => p[1] - q[1]).forEach(([dx, dy], i) => THEME.tower(ctx, x + dx, y + dy + 8, tw, th - (i === 0 && lv === 2 ? 0 : 6) , o));
    // bayraq
    const top = y + spots[0][1] + 8 - th - 17;
    ctx.strokeStyle = INK; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x + spots[0][0], top); ctx.lineTo(x + spots[0][0], top - 20); ctx.stroke();
    ctx.fillStyle = o.flag; ctx.beginPath(); const wv = Math.sin(t * 5 + x) * 3;
    ctx.moveTo(x + spots[0][0], top - 20); ctx.lineTo(x + spots[0][0] + 16, top - 15 + wv); ctx.lineTo(x + spots[0][0], top - 10); ctx.closePath(); THEME.shape(ctx, o.flag, 2);
    THEME.count(ctx, b);
  },

  drawFort(ctx, b, t, selected) {
    const o = THEME.owners[b.owner], x = b.x, y = b.y;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 22, 34, 13, 0, 0, 6.3); ctx.fill();
    if (b.owner) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([7, 7]); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(x, y, b.range, 0, 6.3); ctx.stroke(); ctx.setLineDash([]); }
    ctx.beginPath(); ctx.ellipse(x, y + 16, 30, 14, 0, 0, 6.3); THEME.shape(ctx, o.dark, 3.5);
    THEME.tower(ctx, x, y + 14, 26, 38, o);
    ctx.save(); ctx.translate(x, y - 28); ctx.rotate(b.aim || 0);
    ctx.beginPath(); THEME.rr(ctx, 2, -4.5, 24, 9, 3); THEME.shape(ctx, '#4b5663', 2.5);
    ctx.restore();
    ctx.beginPath(); ctx.arc(x, y - 28, 7, 0, 6.3); THEME.shape(ctx, '#6a7685', 2.5);
    THEME.count(ctx, b);
  },

  count(ctx, b) { THEME.text(ctx, String(Math.max(0, Math.floor(b.troops))), b.x, b.y + 42, 20); },

  drawSoldier(ctx, s, t, boosted) {
    const o = THEME.owners[s.owner], bob = Math.sin(t * 16 + s.id) * 1.6, x = s.x, y = s.y;
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(x, y + 6, 6, 2.8, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); THEME.rr(ctx, x - 4, y - 6 + bob, 8, 11, 3); THEME.shape(ctx, o.main, 2);
    ctx.beginPath(); ctx.arc(x, y - 10 + bob, 4.2, 0, 6.3); THEME.shape(ctx, '#ffd9b0', 2);
    ctx.beginPath(); ctx.arc(x, y - 11.5 + bob, 4.4, Math.PI, 0); THEME.shape(ctx, o.dark, 2);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x + 4, y - 2 + bob); ctx.lineTo(x + 10, y - 5 + bob); ctx.stroke();
    if (boosted) { ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 7, y - 3); ctx.lineTo(x - 16, y - 3); ctx.moveTo(x - 7, y + 2); ctx.lineTo(x - 13, y + 2); ctx.stroke(); }
  },

  drawTank(ctx, s, t) {
    const o = THEME.owners[s.owner], a = Math.atan2(s.to.y - s.y, s.to.x - s.x);
    ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 8, 13, 5, 0, 0, 6.3); ctx.fill();
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
    ctx.beginPath(); THEME.rr(ctx, -12, -8, 24, 16, 4); THEME.shape(ctx, '#46515f', 2.5);
    ctx.beginPath(); THEME.rr(ctx, -10, -6, 20, 12, 4); THEME.shape(ctx, o.main, 2.5);
    ctx.beginPath(); THEME.rr(ctx, 2, -2.2, 16, 4.4, 2); THEME.shape(ctx, '#46515f', 2);
    ctx.beginPath(); ctx.arc(-1, 0, 5.5, 0, 6.3); THEME.shape(ctx, o.light, 2.5);
    ctx.restore();
  },

  drawCrate(ctx, c, t) {
    const y = c.y + Math.sin(t * 3 + c.x) * 2.5;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 13, 12, 4, 0, 0, 6.3); ctx.fill();
    ctx.beginPath(); THEME.rr(ctx, c.x - 11, y - 11, 22, 22, 4); THEME.shape(ctx, '#e0a24a', 3);
    ctx.strokeStyle = '#8a5a1c'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(c.x - 9, y - 9); ctx.lineTo(c.x + 9, y + 9); ctx.moveTo(c.x + 9, y - 9); ctx.lineTo(c.x - 9, y + 9); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fillRect(c.x - 9, y - 9, 18, 3);
  },

  drawShot(ctx, a, b, c) {
    ctx.strokeStyle = INK; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.strokeStyle = '#fff6b0'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  },
  drawBoom(ctx, x, y, p, r, color) {
    ctx.globalAlpha = 1 - p; ctx.fillStyle = color || '#ffb347'; ctx.strokeStyle = INK; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(x, y, (r || 25) * (0.3 + p), 0, 6.3); ctx.fill(); ctx.stroke(); ctx.globalAlpha = 1;
  },
  drawCapture(ctx, x, y, p, color) {
    ctx.strokeStyle = color; ctx.globalAlpha = 1 - p; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x, y, 20 + p * 60, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1;
  },

  // interfeys
  hud(ctx, W, H, text) {
    const g = ctx.createLinearGradient(0, 0, 0, 56); g.addColorStop(0, '#2a3b52'); g.addColorStop(1, '#1d2b3a');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, 56); ctx.fillStyle = INK; ctx.fillRect(0, 54, W, 3);
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.font = '900 22px "Arial Black", sans-serif'; ctx.fillStyle = '#fff'; ctx.fillText(text, 16, 28);
  },
  button(ctx, x, y, w, h, label, active, dis) {
    ctx.beginPath(); THEME.rr(ctx, x, y + 4, w, h, 16); ctx.fillStyle = INK; ctx.fill();
    ctx.beginPath(); THEME.rr(ctx, x, y, w, h, 16);
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (dis) { g.addColorStop(0, '#8a929c'); g.addColorStop(1, '#5d6570'); } else if (active) { g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#ffa928'); } else { g.addColorStop(0, '#5db4ff'); g.addColorStop(1, '#1f78d8'); }
    THEME.shape(ctx, g, 3);
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); THEME.rr(ctx, x + 6, y + 4, w - 12, h * 0.3, 10); ctx.fill();
    THEME.text(ctx, label, x + w / 2, y + h / 2 + 1, 18);
  }
};
