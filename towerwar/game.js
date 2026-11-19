(() => {
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 540, H = 960;
const CAP = [64, 80, 99], RATE = [0.9, 1.5, 2.2], UP_COST = [15, 30], MAXWAYS = [2, 3, 4];
const SPEED = 90, SPAWN_EVERY = 0.5;

let level = 1, B = [], ways = [], obs = [], soldiers = [], fx = [], shots = [], crates = [], aiDelay = 0;
let state = 'play', drag = null, aiTimer = 0, sid = 0, t = 0, msg = null;
let bombs = 3, speeds = 2, speedLeft = 0, bombArmed = false, best = 1;
try { best = parseInt(localStorage.getItem('tw_level') || '1', 10) || 1; level = best; } catch (e) {}

const rng = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function segDist(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, l2 = dx * dx + dy * dy || 1;
  const k = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2));
  return Math.hypot(p.x - (a.x + k * dx), p.y - (a.y + k * dy));
}
const blocked = (a, b) => obs.some(o => segDist(o, a, b) < o.r * 0.85 + 6);

function buildLevel(n) {
  const r = rng(n * 7919 + 13);
  B = []; ways = []; obs = []; soldiers = []; fx = []; shots = []; crates = [];
  state = 'play'; drag = null; bombs = 3; speeds = 2; speedLeft = 0; bombArmed = false;
  // Orijinal quruluşdan öyrənilən: oyunçunun bir neçə KİÇİK evi, hər düşmənin bir BÖYÜK evi var
  const myHouses = n === 1 ? 2 : 4, ais = Math.min(2 + Math.floor(n / 10), 4);
  const forts = n >= 2 && r() < 0.5 ? 1 : 0;
  const total = myHouses + ais + forts;
  let minD = 150, guard = 0;
  const pts = [];
  while (pts.length < total) {
    const p = { x: 70 + r() * (W - 140), y: 140 + r() * (H - 330) };
    if (pts.every(o => dist(o, p) > minD)) pts.push(p);
    if (++guard % 1500 === 0) minD -= 10;
  }
  pts.sort((a, b) => b.y - a.y);                       // oyunçu aşağıda, düşmənlər yuxarıda
  const mine = pts.slice(0, myHouses), foes = pts.slice(myHouses, myHouses + ais), fp = pts.slice(myHouses + ais);
  const tankChance = n >= 10 ? 0.2 : 0;
  const mk = (p, owner, troops, kind) => B.push({ x: p.x, y: p.y, r: 34, owner, kind: kind || 'house', troops, level: 0, cd: 0, range: 135, aim: 0, id: B.length, wt: r() < tankChance ? 2 : 1 });
  mine.forEach((p, i) => mk(p, 1, n === 1 ? (i ? 10 : 24) : 5));
  foes.forEach((p, i) => mk(p, 2 + (i % 4), Math.min(64, 30 + n * 2)));
  fp.forEach(p => mk(p, 0, 12 + Math.floor(r() * 10), 'fort'));
  let g2 = 0;
  const count = n < 100 ? 2 + Math.floor(r() * 3) : 3 + Math.floor(r() * 3);
  while (obs.length < count && g2++ < 600) {
    const o = { x: 70 + r() * (W - 140), y: 150 + r() * (H - 340), r: 26 + r() * 20, kind: r() < 0.5 ? 'lake' : 'rock' };
    if (B.every(b => dist(b, o) > o.r + 70) && obs.every(q => dist(q, o) > q.r + o.r + 20)) obs.push(o);
  }
  // 4 yük qutusu (orijinaldakı Cargo): yığılsa mənsub olduğu evə əsgər verir
  g2 = 0;
  while (crates.length < 4 && g2++ < 600) {
    const c = { x: 60 + r() * (W - 120), y: 150 + r() * (H - 340) };
    if (B.every(b => dist(b, c) > 80) && obs.every(o => dist(o, c) > o.r + 20)) crates.push(c);
  }
  aiDelay = Math.max(4, 25 - n * 2); aiTimer = aiDelay;  // orijinaldakı AD: AI əvvəlcə gözləyir
}

const waysFrom = b => ways.filter(w => w.from === b);
const maxWays = b => b.kind === 'house' ? MAXWAYS[b.level] : 0;

function addWay(from, to) {
  if (from === to || from.kind !== 'house' || waysFrom(from).length >= maxWays(from)) return 'limit';
  if (ways.some(w => w.from === from && w.to === to)) return 'dup';
  if (blocked(from, to)) return 'blocked';
  ways.push({ from, to, acc: 0 });
  return 'ok';
}
function upgrade(b) {
  if (b.kind !== 'house' || b.level >= 2 || b.troops < UP_COST[b.level] + 2) return false;
  b.troops -= UP_COST[b.level]; b.level++;
  fx.push({ type: 'ring', x: b.x, y: b.y, t: 0, c: THEME.owners[b.owner].main }); return true;
}
function flash(text) { msg = { text, t: 1.4 }; }

function arrive(s) {
  const b = s.to;
  if (b.owner === s.owner) { b.troops += s.p; return; }
  b.troops -= s.p;
  if (b.troops < 0) {
    b.owner = s.owner; b.troops = 1; b.level = Math.max(0, b.level - 1);
    ways = ways.filter(w => w.from !== b);
    fx.push({ type: 'ring', x: b.x, y: b.y, t: 0, c: THEME.owners[s.owner].main });
  }
}
function kill(s, color) { s.dead = true; fx.push({ type: 'boom', x: s.x, y: s.y, t: 0.5, r: 12, c: color }); }

function update(dt) {
  t += dt; if (msg) { msg.t -= dt; if (msg.t <= 0) msg = null; }
  fx.forEach(f => f.t += dt * (f.type === 'boom' ? 3 : 1.2)); fx = fx.filter(f => f.t < 1);
  shots.forEach(s => s.t -= dt); shots = shots.filter(s => s.t > 0);
  if (state !== 'play') return;
  const sp = speedLeft > 0 ? 1.8 : 1; speedLeft = Math.max(0, speedLeft - dt);

  for (const b of B) {
    if (b.owner) {
      const rate = RATE[b.level] * (b.kind === 'fort' ? 0.45 : 1);
      if (b.troops < CAP[b.level]) b.troops += rate * dt; else b.troops -= 0.5 * dt;
    }
    if (b.kind === 'fort' && b.owner) { // atəş
      b.cd -= dt;
      let tgt = null, bd = b.range;
      for (const s of soldiers) if (s.owner !== b.owner && !s.dead) { const d = dist(b, s); if (d < bd) { bd = d; tgt = s; } }
      if (tgt) {
        b.aim = Math.atan2(tgt.y - b.y, tgt.x - b.x);
        if (b.cd <= 0) { b.cd = 0.45; tgt.p -= 1; if (tgt.p <= 0) kill(tgt, '#ffd34d'); shots.push({ a: { x: b.x, y: b.y - 40 }, b: tgt, t: 0.1, c: THEME.owners[b.owner].main }); }
      }
    }
  }
  // yollar əsgər buraxır
  for (const w of ways) {
    if (w.from.owner === 0) continue;
    w.acc += dt * sp;
    while (w.acc >= SPAWN_EVERY) {
      w.acc -= SPAWN_EVERY;
      const cost = w.from.wt === 2 ? 2 : 1;
      if (w.from.troops >= cost + 1) {
        w.from.troops -= cost;
        const a = Math.atan2(w.to.y - w.from.y, w.to.x - w.from.x);
        soldiers.push({ id: sid++, x: w.from.x + Math.cos(a) * 28, y: w.from.y + Math.sin(a) * 28, owner: w.from.owner, to: w.to, from: w.from, p: cost === 2 ? 3 : 1, tank: cost === 2 });
      }
    }
  }
  for (const s of soldiers) {
    const dx = s.to.x - s.x, dy = s.to.y - s.y, d = Math.hypot(dx, dy);
    if (d < s.to.r - 6) { s.dead = true; arrive(s); continue; }
    const v = SPEED * sp * (s.tank ? 0.7 : 1); s.x += dx / d * v * dt; s.y += dy / d * v * dt;
    for (const c of crates) if (!c.got && dist(c, s) < 16) { c.got = true; if (s.from.owner === s.owner) s.from.troops += 6; fx.push({ type: 'ring', x: c.x, y: c.y, t: 0, c: '#ffe27a' }); }
  }
  for (let i = 0; i < soldiers.length; i++) { // toqquşma
    const a = soldiers[i]; if (a.dead) continue;
    for (let j = i + 1; j < soldiers.length; j++) {
      const c = soldiers[j]; if (c.dead || a.owner === c.owner) continue;
      if (Math.abs(a.x - c.x) < 8 && Math.abs(a.y - c.y) < 8) {
        const m = Math.min(a.p, c.p); a.p -= m; c.p -= m;
        if (a.p <= 0) kill(a, '#ffb347'); if (c.p <= 0) kill(c, '#ffb347'); if (a.dead) break;
      }
    }
  }
  soldiers = soldiers.filter(s => !s.dead); crates = crates.filter(c => !c.got);
  ways = ways.filter(w => w.from.owner !== 0);

  aiTimer -= dt; if (aiTimer <= 0) { aiTimer = 1 + Math.random() * Math.max(0.5, 2 - level * 0.03); ai(); }

  const pl = B.some(x => x.owner === 1) || soldiers.some(s => s.owner === 1);
  const en = B.some(x => x.owner > 1) || soldiers.some(s => s.owner > 1);
  if (!en) { state = 'win'; try { if (level + 1 > best) { best = level + 1; localStorage.setItem('tw_level', best); } } catch (e) {} }
  else if (!pl) state = 'lose';
}

function ai() {
  for (const m of B) {
    if (m.owner < 2 || m.kind !== 'house') continue;
    if (m.level < 2 && m.troops > UP_COST[m.level] + 14 && Math.random() < 0.4) { upgrade(m); continue; }
    // artıq dost olmuş hədəfə gedən yolları kəs (əsgər azdırsa)
    for (const w of waysFrom(m)) if (w.to.owner === m.owner && m.troops < 8) ways.splice(ways.indexOf(w), 1);
    if (waysFrom(m).length >= maxWays(m) || m.troops < 10) continue;
    let pick = null, bs = -1e9;
    for (const o of B) {
      if (o === m || o.owner === m.owner || ways.some(w => w.from === m && w.to === o) || blocked(m, o)) continue;
      const d = dist(m, o), need = o.troops + (o.owner ? RATE[o.level] * d / SPEED : 0) + 2;
      if (m.troops < need * 0.55 + 5) continue;
      const sc = (o.owner === 1 ? 25 : 0) + (o.kind === 'fort' ? 8 : 0) - need - d * 0.05;
      if (sc > bs) { bs = sc; pick = o; }
    }
    if (pick) addWay(m, pick);
  }
}

function drawButton(x, y, w, label, active, dis) { THEME.button(ctx, x, y, w, 52, label, active, dis); }
const BTN = { bomb: { x: 20, y: 886, w: 160 }, speed: { x: 190, y: 886, w: 170 } };

function draw() {
  R3.render({ B, ways, obs, soldiers, fx, shots, crates, drag, t });
  ctx.clearRect(0, 0, W, H);
  for (const b of B) { const p = R3.screen(b.x, b.y + 30, 0); THEME.text(ctx, String(Math.max(0, Math.floor(b.troops))), p.x, p.y + 6, 20); }
  THEME.hud(ctx, W, H, 'Səviyyə ' + level + (level % 5 === 0 ? '  ★ BOSS' : ''));
  ctx.textAlign = 'right'; ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = '#cfe3ff'; ctx.textBaseline = 'middle';
  ctx.fillText('Evdən evə sürüşdür: yol • Toxun: yüksəlt • Yola toxun: kəs', W - 10, 28);
  drawButton(BTN.bomb.x, BTN.bomb.y, BTN.bomb.w, 'Bomba ×' + bombs, bombArmed, bombs <= 0);
  drawButton(BTN.speed.x, BTN.speed.y, BTN.speed.w, speedLeft > 0 ? 'Sürət ' + Math.ceil(speedLeft) + 's' : 'Sürət ×' + speeds, speedLeft > 0, speeds <= 0 && speedLeft <= 0);
  if (bombArmed) THEME.text(ctx, 'Bomba atmaq üçün xəritəyə toxun', W / 2, 850, 18);
  if (msg) { ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.beginPath(); ctx.roundRect(W / 2 - 130, 80, 260, 36, 18); ctx.fill(); ctx.fillStyle = '#ffd0d0'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(msg.text, W / 2, 99); }
  if (state !== 'play') {
    ctx.fillStyle = 'rgba(10,20,35,.7)'; ctx.fillRect(0, 0, W, H);
    THEME.text(ctx, state === 'win' ? 'QƏLƏBƏ!' : 'MƏĞLUBİYYƏT', W / 2, H / 2 - 50, 54);
    THEME.button(ctx, W / 2 - 120, H / 2 + 10, 240, 64, state === 'win' ? 'Növbəti' : 'Yenidən', true, false);
  }
}

function pos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
const hit = p => B.find(b => dist({ x: b.x, y: b.y + 8 }, p) < b.r + 14);
const inBtn = (p, k) => p.x > k.x && p.x < k.x + k.w && p.y > k.y && p.y < k.y + 52;

function bomb(p) {
  bombs--; bombArmed = false;
  fx.push({ type: 'boom', x: p.x, y: p.y, t: 0, r: 80, c: '#ff8a3d' });
  for (const s of soldiers) if (s.owner !== 1 && dist(s, p) < 80) kill(s, '#ffb347');
  for (const b of B) if (b.owner > 1 && dist(b, p) < 80) b.troops = Math.max(0, b.troops - 8);
}

cv.addEventListener('pointerdown', e => {
  const q = pos(e), p = R3.ground(q.x, q.y);
  if (state !== 'play') {
    if (q.x > W / 2 - 120 && q.x < W / 2 + 120 && q.y > H / 2 + 10 && q.y < H / 2 + 74) { if (state === 'win') level++; buildLevel(level); }
    return;
  }
  if (inBtn(q, BTN.bomb)) { if (bombs > 0) bombArmed = !bombArmed; return; }
  if (inBtn(q, BTN.speed)) { if (speeds > 0 && speedLeft <= 0) { speeds--; speedLeft = 8; } return; }
  if (bombArmed) { bomb(p); return; }
  const b = hit(p);
  if (b && b.owner === 1) { drag = { from: b, x: p.x, y: p.y, moved: false }; cv.setPointerCapture(e.pointerId); return; }
  // yola toxunub kəsmək
  const w = ways.find(w => w.from.owner === 1 && segDist(p, w.from, w.to) < 14);
  if (w) ways.splice(ways.indexOf(w), 1);
});
cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const q = pos(e), p = R3.ground(q.x, q.y); drag.x = p.x; drag.y = p.y;
  if (dist(p, drag.from) > 20) drag.moved = true;
  const h = hit(p); drag.to = h && h !== drag.from ? h : null;
  drag.bad = drag.to ? blocked(drag.from, drag.to) : false;
});
cv.addEventListener('pointerup', () => {
  if (!drag) return;
  if (!drag.moved) upgrade(drag.from);
  else if (drag.to) {
    const r = addWay(drag.from, drag.to);
    if (r === 'blocked') flash('Yol maneə ilə bağlıdır'); else if (r === 'limit') flash('Bu evin yol limiti dolub'); else if (r === 'dup') flash('Bu yol artıq var');
  }
  drag = null;
});
cv.addEventListener('pointercancel', () => drag = null);

let last = performance.now();
function loop(now) { const dt = Math.min(0.05, (now - last) / 1000); last = now; update(dt); draw(); requestAnimationFrame(loop); }
window.__tw = { setCam: R3.setCam, screen: R3.screen, ground: R3.ground, get state() { return state; }, B: () => B, ways: () => ways, addWay, build: buildLevel, step: update, soldiers: () => soldiers };
R3.init(document.getElementById('gl'));
buildLevel(level);
requestAnimationFrame(loop);
})();
