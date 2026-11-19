// ===== SKIN / THEME =====
// Bütün vizual burada toplanıb. Fon, qüllə və əsgər görünüşünü
// yalnız bu faylı dəyişməklə tamamilə yeniləmək olur.
const THEME = {
  owners: {
    0: { name: 'Neytral', main: '#9aa3ad', dark: '#5d6670', flag: '#cfd6dd' },
    1: { name: 'Sən',     main: '#3aa0ff', dark: '#1f5fa8', flag: '#9bd0ff' },
    2: { name: 'Düşmən',  main: '#ff5a4d', dark: '#a8281f', flag: '#ffb0a8' },
    3: { name: 'Düşmən 2',main: '#b86cff', dark: '#6a2fa8', flag: '#dcb4ff' }
  },

  drawBackground(ctx, W, H, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1b2a49'); g.addColorStop(0.55, '#2c4a52'); g.addColorStop(1, '#1f3b2d');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // ulduzlar
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % W, y = (i * 53) % (H * 0.35);
      const s = 1 + ((i + Math.floor(t * 2)) % 7 === 0 ? 1 : 0);
      ctx.fillRect(x, y, s, s);
    }
    // low-poly təpələr
    const layers = [
      { y: H * 0.62, c: '#27483f', a: 90, f: 0.011 },
      { y: H * 0.74, c: '#21392f', a: 70, f: 0.017 },
      { y: H * 0.86, c: '#192c24', a: 50, f: 0.023 }
    ];
    layers.forEach((L, k) => {
      ctx.fillStyle = L.c; ctx.beginPath(); ctx.moveTo(0, H);
      for (let x = 0; x <= W; x += 45) {
        ctx.lineTo(x, L.y + Math.sin(x * L.f + k * 2) * L.a * 0.5 + Math.cos(x * L.f * 2.3) * L.a * 0.3);
      }
      ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
    });
    // yumşaq qaranlıq künc effekti
    const v = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  },

  drawPath(ctx, a, b, owner) {
    ctx.save();
    ctx.strokeStyle = THEME.owners[owner].main; ctx.globalAlpha = 0.55;
    ctx.lineWidth = 4; ctx.setLineDash([10, 8]);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.restore();
  },

  drawTower(ctx, tw, t, selected) {
    const o = THEME.owners[tw.owner];
    const lv = tw.level;
    const w = 26 + lv * 6, h = 34 + lv * 14;
    const x = tw.x, y = tw.y;
    // kölgə
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath(); ctx.ellipse(x, y + 20, w * 0.85, 11, 0, 0, 6.3); ctx.fill();
    // seçim halqası
    if (selected) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(x, y + 6, tw.r + 8 + Math.sin(t * 8) * 2, 0, 6.3); ctx.stroke();
    }
    // gövdə (sol işıqlı, sağ kölgəli — low-poly təsir)
    ctx.fillStyle = o.main;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y + 18); ctx.lineTo(x - w / 2 + 3, y + 18 - h);
    ctx.lineTo(x, y + 18 - h); ctx.lineTo(x, y + 18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = o.dark;
    ctx.beginPath(); ctx.moveTo(x, y + 18); ctx.lineTo(x, y + 18 - h);
    ctx.lineTo(x + w / 2 - 3, y + 18 - h); ctx.lineTo(x + w / 2, y + 18); ctx.closePath(); ctx.fill();
    // daş cərgələri
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1;
    for (let i = 1; i < lv * 2 + 2; i++) {
      const yy = y + 18 - i * (h / (lv * 2 + 2));
      ctx.beginPath(); ctx.moveTo(x - w / 2, yy); ctx.lineTo(x + w / 2, yy); ctx.stroke();
    }
    // yuxarı hissə: dişli divar
    const topY = y + 18 - h, tw2 = w + 10;
    ctx.fillStyle = o.dark; ctx.fillRect(x - tw2 / 2, topY - 6, tw2, 8);
    ctx.fillStyle = o.main;
    for (let i = 0; i < 4; i++) ctx.fillRect(x - tw2 / 2 + i * (tw2 / 3.4), topY - 14, tw2 / 6, 9);
    // qapı
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.beginPath(); ctx.moveTo(x - 6, y + 18); ctx.lineTo(x - 6, y + 6);
    ctx.arc(x, y + 6, 6, Math.PI, 0); ctx.lineTo(x + 6, y + 18); ctx.fill();
    // bayraq
    ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, topY - 14); ctx.lineTo(x, topY - 36); ctx.stroke();
    ctx.fillStyle = o.flag;
    const wave = Math.sin(t * 5 + x) * 3;
    ctx.beginPath(); ctx.moveTo(x, topY - 36); ctx.lineTo(x + 18, topY - 31 + wave); ctx.lineTo(x, topY - 26); ctx.fill();
    // əsgər sayı
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.beginPath(); ctx.roundRect(x - 20, y + 24, 40, 20, 10); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(Math.floor(tw.troops), x, y + 34);
  },

  drawSoldier(ctx, s, t) {
    const o = THEME.owners[s.owner];
    const bob = Math.sin(t * 18 + s.id) * 1.5;
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath(); ctx.ellipse(s.x, s.y + 5, 5, 2.5, 0, 0, 6.3); ctx.fill();
    ctx.fillStyle = o.main; ctx.fillRect(s.x - 3, s.y - 5 + bob, 6, 9);
    ctx.fillStyle = o.flag; ctx.beginPath(); ctx.arc(s.x, s.y - 8 + bob, 3.3, 0, 6.3); ctx.fill();
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(s.x + 4, s.y - 3 + bob); ctx.lineTo(s.x + 4, s.y - 11 + bob); ctx.stroke();
  },

  drawCapture(ctx, x, y, p, color) {
    ctx.strokeStyle = color; ctx.globalAlpha = 1 - p; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(x, y, 20 + p * 60, 0, 6.3); ctx.stroke(); ctx.globalAlpha = 1;
  }
};
