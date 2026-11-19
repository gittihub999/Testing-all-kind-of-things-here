(() => {
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 540, H = 960;
const CAP = [30, 50, 80], RATE = [1.0, 1.7, 2.5], UP_COST = [15, 30];
const SPEED = 110;

let level = 1, towers = [], soldiers = [], fx = [], state = 'play', drag = null, aiTimer = 0, sid = 0, t = 0;
let best = 1;
try { best = parseInt(localStorage.getItem('tw_level') || '1', 10) || 1; level = best; } catch (e) {}

function rng(seed) { return () => (seed = (seed * 16807) % 2147483647) / 2147483647; }

function buildLevel(n) {
  const r = rng(n * 7919 + 13);
  towers = []; soldiers = []; fx = []; state = 'play'; drag = null; aiTimer = 0;
  const count = Math.min(5 + Math.floor(n * 0.9), 12);
  const enemies = Math.min(1 + Math.floor((n - 1) / 3), 4);
  let guard = 0;
  while (towers.length < count && guard++ < 2000) {
    const x = 70 + r() * (W - 140), y = 150 + r() * (H - 300);
    if (towers.every(o => Math.hypot(o.x - x, o.y - y) > 150)) {
      towers.push({ x, y, r: 34, owner: 0, troops: 6 + Math.floor(r() * 20), level: 0, queue: [], id: towers.length });
    }
  }
  // oyunçu ən aşağıda, düşmənlər yuxarıda
  const sorted = [...towers].sort((a, b) => b.y - a.y);
  sorted[0].owner = 1; sorted[0].troops = 22;
  for (let i = 0; i < enemies; i++) {
    const tw = sorted[sorted.length - 1 - i];
    tw.owner = enemies > 1 && i % 2 ? 3 : 2; tw.troops = 18 + n * 2;
  }
}

function send(from, to, owner) {
  if (from === to || from.troops < 2) return;
  const n = Math.floor(from.troops / 2);
  from.queue.push({ to, left: n, timer: 0 });
}

function upgrade(tw) {
  if (tw.level >= 2 || tw.troops < UP_COST[tw.level] + 2) return false;
  tw.troops -= UP_COST[tw.level]; tw.level++;
  fx.push({ x: tw.x, y: tw.y, t: 0, c: THEME.owners[tw.owner].main });
  return true;
}

function arrive(s) {
  const tw = s.to;
  if (tw.owner === s.owner) { tw.troops += 1; return; }
  tw.troops -= 1;
  if (tw.troops < 0) {
    tw.owner = s.owner; tw.troops = 1; tw.queue = []; tw.level = Math.max(0, tw.level - 1);
    fx.push({ x: tw.x, y: tw.y, t: 0, c: THEME.owners[s.owner].main });
  }
}

function update(dt) {
  t += dt;
  if (state !== 'play') return;
  for (const tw of towers) {
    if (tw.owner) {
      if (tw.troops < CAP[tw.level]) tw.troops += RATE[tw.level] * dt;
      else tw.troops -= 0.5 * dt;
    }
    for (const q of tw.queue) {
      q.timer -= dt;
      while (q.timer <= 0 && q.left > 0 && tw.troops >= 1) {
        q.timer += 0.07; q.left--; tw.troops -= 1;
        const a = Math.atan2(q.to.y - tw.y, q.to.x - tw.x);
        soldiers.push({ id: sid++, x: tw.x + Math.cos(a) * 30 + (Math.random() - .5) * 8, y: tw.y + Math.sin(a) * 30 + (Math.random() - .5) * 8, owner: tw.owner, to: q.to });
      }
    }
    tw.queue = tw.queue.filter(q => q.left > 0 && tw.troops >= 1);
  }
  for (const s of soldiers) {
    const dx = s.to.x - s.x, dy = s.to.y - s.y, d = Math.hypot(dx, dy);
    if (d < s.to.r - 6) { s.dead = true; arrive(s); continue; }
    s.x += dx / d * SPEED * dt; s.y += dy / d * SPEED * dt;
  }
  // düşmən əsgərlər qarşılaşanda bir-birini məhv edir
  for (let i = 0; i < soldiers.length; i++) {
    const a = soldiers[i]; if (a.dead) continue;
    for (let j = i + 1; j < soldiers.length; j++) {
      const b = soldiers[j];
      if (b.dead || a.owner === b.owner) continue;
      if (Math.abs(a.x - b.x) < 7 && Math.abs(a.y - b.y) < 7) {
        a.dead = b.dead = true; fx.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: 0.6, c: '#ffd34d', small: true }); break;
      }
    }
  }
  soldiers = soldiers.filter(s => !s.dead);
  fx.forEach(f => f.t += dt * (f.small ? 3 : 1.2)); fx = fx.filter(f => f.t < 1);

  aiTimer -= dt;
  if (aiTimer <= 0) { aiTimer = Math.max(0.5, 1.4 - level * 0.05); ai(); }

  const pl = towers.some(x => x.owner === 1) || soldiers.some(s => s.owner === 1);
  const en = towers.some(x => x.owner > 1) || soldiers.some(s => s.owner > 1);
  if (!en) { state = 'win'; try { if (level + 1 > best) { best = level + 1; localStorage.setItem('tw_level', best); } } catch (e) {} }
  else if (!pl) state = 'lose';
}

function ai() {
  for (const owner of [2, 3]) {
    const mine = towers.filter(x => x.owner === owner);
    if (!mine.length) continue;
    for (const m of mine) {
      if (m.level < 2 && m.troops > UP_COST[m.level] + 14 && Math.random() < 0.5) { upgrade(m); continue; }
      if (m.troops < 10 || m.queue.length) continue;
      let best = null, bs = -1e9;
      for (const o of towers) {
        if (o === m || o.owner === owner) continue;
        const d = Math.hypot(o.x - m.x, o.y - m.y);
        const need = o.troops + d / SPEED * (o.owner ? RATE[o.level] : 0) + 2;
        if (m.troops / 2 < need) continue;
        const s = (o.owner === 1 ? 30 : 0) - need - d * 0.05;
        if (s > bs) { bs = s; best = o; }
      }
      if (best) send(m, best, owner);
      else if (m.troops > CAP[m.level] * 0.8) {
        const friend = mine.filter(x => x !== m).sort((a, b) => a.troops - b.troops)[0];
        if (friend) send(m, friend, owner);
      }
    }
  }
}

function draw() {
  THEME.drawBackground(ctx, W, H, t);
  if (drag) THEME.drawPath(ctx, drag.from, drag.to || { x: drag.x, y: drag.y }, 1);
  const order = [...towers].sort((a, b) => a.y - b.y);
  for (const tw of order) THEME.drawTower(ctx, tw, t, drag && (drag.from === tw || drag.to === tw));
  for (const s of soldiers) THEME.drawSoldier(ctx, s, t);
  for (const f of fx) THEME.drawCapture(ctx, f.x, f.y, f.t, f.c);
  ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('Səviyyə ' + level, 16, 30);
  ctx.textAlign = 'right'; ctx.font = '14px sans-serif'; ctx.fillStyle = '#bcd';
  ctx.fillText('Toxun: yüksəlt  •  Sürüşdür: hücum', W - 16, 30);
  if (state !== 'play') {
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = state === 'win' ? '#7dffa0' : '#ff7d7d';
    ctx.font = 'bold 52px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(state === 'win' ? 'Qələbə!' : 'Məğlubiyyət', W / 2, H / 2 - 40);
    ctx.fillStyle = '#3aa0ff'; ctx.beginPath(); ctx.roundRect(W / 2 - 120, H / 2 + 10, 240, 64, 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif';
    ctx.fillText(state === 'win' ? 'Növbəti' : 'Yenidən', W / 2, H / 2 + 43);
  }
}

function pos(e) {
  const r = cv.getBoundingClientRect();
  return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H };
}
function hit(p) { return towers.find(tw => Math.hypot(tw.x - p.x, tw.y + 2 - p.y) < tw.r + 12); }

cv.addEventListener('pointerdown', e => {
  const p = pos(e);
  if (state !== 'play') {
    if (p.x > W / 2 - 120 && p.x < W / 2 + 120 && p.y > H / 2 + 10 && p.y < H / 2 + 74) {
      if (state === 'win') level++; buildLevel(level);
    }
    return;
  }
  const tw = hit(p);
  if (tw && tw.owner === 1) { drag = { from: tw, x: p.x, y: p.y, moved: false }; cv.setPointerCapture(e.pointerId); }
});
cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = pos(e); drag.x = p.x; drag.y = p.y;
  if (Math.hypot(p.x - drag.from.x, p.y - drag.from.y) > 20) drag.moved = true;
  const h = hit(p); drag.to = h && h !== drag.from ? h : null;
});
const end = () => {
  if (!drag) return;
  if (!drag.moved) upgrade(drag.from);
  else if (drag.to) send(drag.from, drag.to, 1);
  drag = null;
};
cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', () => drag = null);

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); draw(); requestAnimationFrame(loop);
}
window.__tw = { get state() { return state; }, towers: () => towers, send, build: buildLevel, step: update, draw };
buildLevel(level);
requestAnimationFrame(loop);
})();
