// ===== SKIN / THEME =====
// Bütün vizual burada. Yalnız bu faylı dəyişməklə oyunun görünüşü tam dəyişir.
const THEME = {
  owners: {
    0: { name: 'Neytral', main: '#a8a08c', dark: '#6b6454', flag: '#d8d2c0' },
    1: { name: 'Sən',     main: '#3aa0ff', dark: '#1f5fa8', flag: '#a6d6ff' },
    2: { name: 'Qırmızı', main: '#ff5a4d', dark: '#a8281f', flag: '#ffb6ae' },
    3: { name: 'Sarı',    main: '#ffc83a', dark: '#a8780f', flag: '#ffe9a6' },
    4: { name: 'Yaşıl',   main: '#4cd964', dark: '#1f8a34', flag: '#b6f5c2' },
    5: { name: 'Bənövşəyi', main: '#b86cff', dark: '#6a2fa8', flag: '#dcb4ff' }
  },

  drawBackground(ctx, W, H, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#6fae5a'); g.addColorStop(1, '#4b8a46');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // çəmən ləkələri
    for (let i = 0; i < 60; i++) {
      const x = (i * 131) % W, y = (i * 211) % H;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,40,0,.07)';
      ctx.beginPath(); ctx.ellipse(x, y, 50 + (i % 5) * 12, 22 + (i % 3) * 8, i, 0, 6.3); ctx.fill();
    }
    // kiçik otlar
    ctx.strokeStyle = 'rgba(20,70,20,.35)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 90; i++) {
      const x = (i * 97 + 31) % W, y = (i * 53 + 17) % H;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 2, y - 6); ctx.moveTo(x, y); ctx.lineTo(x + 2, y - 5); ctx.stroke();
    }
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,20,0,.4)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  },

  drawObstacle(ctx, o, t) {
    if (o.kind === 'lake') {
      ctx.fillStyle = '#2f7fc0'; ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r * 1.1, o.r * 0.8, 0, 0, 6.3); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.ellipse(o.x, o.y, o.r * (0.4 + i * 0.25) + Math.sin(t * 2 + i) * 2, o.r * (0.3 + i * 0.18), 0, 0, 3.1); ctx.stroke();
      }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(o.x, o.y + o.r * 0.7, o.r, o.r * 0.35, 0, 0, 6.3); ctx.fill();
      ctx.fillStyle = '#8a8d94';
      ctx.beginPath(); ctx.moveTo(o.x - o.r, o.y + o.r * 0.6); ctx.lineTo(o.x - o.r * 0.5, o.y - o.r * 0.7);
      ctx.lineTo(o.x + o.r * 0.2, o.y - o.r); ctx.lineTo(o.x + o.r, o.y + o.r * 0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#b4b7be';
      ctx.beginPath(); ctx.moveTo(o.x - o.r * 0.5, o.y - o.r * 0.7); ctx.lineTo(o.x + o.r * 0.2, o.y - o.r);
      ctx.lineTo(o.x, o.y + o.r * 0.1); ctx.lineTo(o.x - o.r * 0.6, o.y + o.r * 0.2); ctx.closePath(); ctx.fill();
    }
  },

  // yol: torpaq zolaq + istiqamət oxları
  drawRoad(ctx, a, b, owner, t, preview, bad) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = bad ? 'rgba(255,60,60,.7)' : preview ? 'rgba(255,255,255,.6)' : '#c9a46a';
    ctx.lineWidth = preview ? 8 : 12;
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    if (!preview) {
      ctx.strokeStyle = THEME.owners[owner].main; ctx.lineWidth = 3; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.globalAlpha = 0.85; ctx.fillStyle = '#fff';
      const nx = dx / d, ny = dy / d;
      for (let s = (t * 40) % 40; s < d - 30; s += 40) {
        if (s < 30) continue;
        const x = a.x + nx * s, y = a.y + ny * s;
        ctx.beginPath(); ctx.moveTo(x + nx * 5, y + ny * 5); ctx.lineTo(x - nx * 3 - ny * 4, y - ny * 3 + nx * 4); ctx.lineTo(x - nx * 3 + ny * 4, y - ny * 3 - nx * 4); ctx.fill();
      }
    }
    ctx.restore();
  },

  // ev (məhsul verən bina)
  drawHouse(ctx, b, t, selected) {
    const o = THEME.owners[b.owner], lv = b.level, x = b.x, y = b.y;
    const w = 34 + lv * 8, h = 22 + lv * 7;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 18, w * 0.8, 10, 0, 0, 6.3); ctx.fill();
    if (selected) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y + 4, b.r + 8 + Math.sin(t * 8) * 2, 0, 6.3); ctx.stroke(); }
    // divar
    ctx.fillStyle = '#efe3c8'; ctx.fillRect(x - w / 2, y + 18 - h, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.fillRect(x, y + 18 - h, w / 2, h);
    // qapı + pəncərə
    ctx.fillStyle = '#6b4a2a'; ctx.fillRect(x - 5, y + 18 - 14, 10, 14);
    ctx.fillStyle = '#9ad0f0'; ctx.fillRect(x - w / 2 + 5, y + 18 - h + 6, 8, 8); ctx.fillRect(x + w / 2 - 13, y + 18 - h + 6, 8, 8);
    // damı
    const rh = 20 + lv * 6;
    ctx.fillStyle = o.main;
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 6, y + 18 - h); ctx.lineTo(x, y + 18 - h - rh); ctx.lineTo(x + w / 2 + 6, y + 18 - h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = o.dark;
    ctx.beginPath(); ctx.moveTo(x, y + 18 - h - rh); ctx.lineTo(x + w / 2 + 6, y + 18 - h); ctx.lineTo(x, y + 18 - h); ctx.closePath(); ctx.fill();
    // bayraq
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y + 18 - h - rh); ctx.lineTo(x, y + 18 - h - rh - 18); ctx.stroke();
    ctx.fillStyle = o.flag; const wv = Math.sin(t * 5 + x) * 2;
    ctx.beginPath(); ctx.moveTo(x, y + 18 - h - rh - 18); ctx.lineTo(x + 14, y + 18 - h - rh - 14 + wv); ctx.lineTo(x, y + 18 - h - rh - 10); ctx.fill();
    THEME.count(ctx, b);
  },

  // qüllə (atəş açan bina)
  drawFort(ctx, b, t, selected) {
    const o = THEME.owners[b.owner], x = b.x, y = b.y, h = 54, w = 30;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(x, y + 18, 26, 10, 0, 0, 6.3); ctx.fill();
    if (b.owner) { ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, b.range, 0, 6.3); ctx.stroke(); ctx.setLineDash([]); }
    ctx.fillStyle = '#9ca0a8'; ctx.fillRect(x - w / 2, y + 18 - h, w, h);
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(x, y + 18 - h, w / 2, h);
    ctx.fillStyle = o.main; ctx.fillRect(x - w / 2 - 4, y + 18 - h - 8, w + 8, 12);
    for (let i = 0; i < 3; i++) ctx.fillRect(x - w / 2 - 4 + i * 16, y + 18 - h - 16, 8, 9);
    ctx.fillStyle = '#222'; ctx.save(); ctx.translate(x, y + 18 - h - 4); ctx.rotate(b.aim || 0);
    ctx.fillRect(0, -3, 22, 6); ctx.restore();
    ctx.fillStyle = '#333'; ctx.fillRect(x - 5, y + 4, 10, 14);
    THEME.count(ctx, b);
  },

  count(ctx, b) {
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.beginPath(); ctx.roundRect(b.x - 20, b.y + 24, 40, 20, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.max(0, Math.floor(b.troops)), b.x, b.y + 34);
  },

  drawSoldier(ctx, s, t, boosted) {
    const o = THEME.owners[s.owner], bob = Math.sin(t * 18 + s.id) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 5, 5, 2.5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = o.main; ctx.fillRect(s.x - 3, s.y - 5 + bob, 6, 9);
    ctx.fillStyle = o.flag; ctx.beginPath(); ctx.arc(s.x, s.y - 8 + bob, 3.3, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#eee'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(s.x + 4, s.y - 3 + bob); ctx.lineTo(s.x + 4, s.y - 11 + bob); ctx.stroke();
    if (boosted) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.beginPath(); ctx.moveTo(s.x - 6, s.y); ctx.lineTo(s.x - 14, s.y); ctx.stroke(); }
  },

  drawCrate(ctx, c, t) {
    const y = c.y + Math.sin(t * 3 + c.x) * 2;
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 10, 11, 4, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = '#b57a3a'; ctx.fillRect(c.x - 9, y - 9, 18, 18);
    ctx.strokeStyle = '#6b4519'; ctx.lineWidth = 2; ctx.strokeRect(c.x - 9, y - 9, 18, 18);
    ctx.beginPath(); ctx.moveTo(c.x - 9, y - 9); ctx.lineTo(c.x + 9, y + 9); ctx.moveTo(c.x + 9, y - 9); ctx.lineTo(c.x - 9, y + 9); ctx.stroke();
  },
  drawTank(ctx, s, t) {
    const o = THEME.owners[s.owner], a = Math.atan2(s.to.y - s.y, s.to.x - s.x);
    ctx.fillStyle = 'rgba(0,0,0,.3)'; ctx.beginPath(); ctx.ellipse(s.x, s.y + 6, 10, 4, 0, 0, 6.3); ctx.fill();
    ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(a);
    ctx.fillStyle = o.dark; ctx.fillRect(-9, -6, 18, 12);
    ctx.fillStyle = o.main; ctx.fillRect(-7, -4, 14, 8);
    ctx.fillStyle = '#333'; ctx.fillRect(0, -1.5, 13, 3);
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, 6.3); ctx.fillStyle = o.flag; ctx.fill();
    ctx.restore();
  },
  drawShot(ctx, a, b, c) {
    ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
  },
  drawBoom(ctx, x, y, p, r, color) {
    ctx.globalAlpha = 1 - p; ctx.fillStyle = color || '#ffb347';
    ctx.beginPath(); ctx.arc(x, y, (r || 25) * (0.3 + p), 0, 6.3); ctx.fill(); ctx.globalAlpha = 1;
  },
  drawCapture(ctx, x, y, p, color) {
    ctx.strokeStyle = color; ctx.globalAlpha = 1 - p; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 20 + p * 60, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1;
  }
};
