(() => {
const cv = document.getElementById('c'), ctx = cv.getContext('2d');
const W = 540, H = 960;
const CAP = [30, 50, 80], RATE = [0.9, 1.5, 2.2], UP_COST = [15, 30], MAXWAYS = [2, 3, 4];
const SPEED = 90, SPAWN_EVERY = 0.5;

let level = 1, B = [], ways = [], obs = [], soldiers = [], fx = [], shots = [];
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
  B = []; ways = []; obs = []; soldiers = []; fx = []; shots = [];
  state = 'play'; drag = null; aiTimer = 1.5; bombs = 3; speeds = 2; speedLeft = 0; bombArmed = false;
  const houses = Math.min(5 + Math.floor(n * 0.7), 10), forts = Math.min(Math.floor(n / 2), 4);
  const enemies = Math.min(1 + Math.floor((n - 1) / 3), 3);
  let guard = 0;
  while (B.length < houses + forts && guard++ < 3000) {
    const x = 70 + r() * (W - 140), y = 140 + r() * (H - 300);
    if (B.every(o => dist(o, { x, y }) > 150)) {
      const fort = B.length >= houses;
      B.push({ x, y, r: 34, owner: 0, kind: fort ? 'fort' : 'house', troops: 6 + Math.floor(r() * 18), level: 0, cd: 0, range: 135, aim: 0, id: B.length });
    }
  }
  const homes = B.filter(b => b.kind === 'house').sort((a, b) => b.y - a.y);
  homes[0].owner = 1; homes[0].troops = 24;
  const foes = n % 5 === 0 ? 3 : enemies; // hər 5-ci səviyyə boss: 3 düşmən
  for (let i = 0; i < foes && i < homes.length - 1; i++) {
    const h = homes[homes.length - 1 - i];
    h.owner = i % 2 ? 3 : 2; h.troops = 16 + n * 2;
  }
  const count = Math.min(1 + Math.floor(n / 2), 5);
  guard = 0;
  while (obs.length < count && guard++ < 500) {
    const o = { x: 70 + r() * (W - 140), y: 150 + r() * (H - 320), r: 28 + r() * 22, kind: r() < 0.5 ? 'lake' : 'rock' };
    if (B.every(b => dist(b, o) > o.r + 70)) obs.push(o);
  }
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
  if (b.owner === s.owner) { b.troops += 1; return; }
  b.troops -= 1;
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
        if (b.cd <= 0) { b.cd = 0.45; kill(tgt, '#ffd34d'); shots.push({ a: { x: b.x, y: b.y - 40 }, b: tgt, t: 0.1, c: THEME.owners[b.owner].main }); }
      }
    }
  }
  // yollar əsgər buraxır
  for (const w of ways) {
    if (w.from.owner === 0) continue;
    w.acc += dt * sp;
    while (w.acc >= SPAWN_EVERY) {
      w.acc -= SPAWN_EVERY;
      if (w.from.troops >= 2) {
        w.from.troops -= 1;
        const a = Math.atan2(w.to.y - w.from.y, w.to.x - w.from.x);
        soldiers.push({ id: sid++, x: w.from.x + Math.cos(a) * 28, y: w.from.y + Math.sin(a) * 28, owner: w.from.owner, to: w.to });
      }
    }
  }
  for (const s of soldiers) {
    const dx = s.to.x - s.x, dy = s.to.y - s.y, d = Math.hypot(dx, dy);
    if (d < s.to.r - 6) { s.dead = true; arrive(s); continue; }
    s.x += dx / d * SPEED * sp * dt; s.y += dy / d * SPEED * sp * dt;
  }
  for (let i = 0; i < soldiers.length; i++) { // toqquşma
    const a = soldiers[i]; if (a.dead) continue;
    for (let j = i + 1; j < soldiers.length; j++) {
      const c = soldiers[j]; if (c.dead || a.owner === c.owner) continue;
      if (Math.abs(a.x - c.x) < 8 && Math.abs(a.y - c.y) < 8) { kill(a, '#ffb347'); kill(c, '#ffb347'); break; }
    }
  }
  soldiers = soldiers.filter(s => !s.dead);
  ways = ways.filter(w => w.from.owner !== 0);

  aiTimer -= dt; if (aiTimer <= 0) { aiTimer = Math.max(0.6, 1.6 - level * 0.05); ai(); }

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

function drawButton(x, y, w, label, active, dis) {
  ctx.fillStyle = dis ? 'rgba(60,60,60,.7)' : active ? '#ffb347' : 'rgba(0,0,0,.6)';
  ctx.beginPath(); ctx.roundRect(x, y, w, 52, 14); ctx.fill();
  ctx.fillStyle = dis ? '#888' : active ? '#222' : '#fff'; ctx.font = 'bold 17px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + 26);
}
const BTN = { bomb: { x: 20, y: 886, w: 160 }, speed: { x: 190, y: 886, w: 170 } };

function draw() {
  THEME.drawBackground(ctx, W, H, t);
  for (const o of obs) THEME.drawObstacle(ctx, o, t);
  for (const w of ways) THEME.drawRoad(ctx, w.from, w.to, w.from.owner, t);
  if (drag && drag.moved) THEME.drawRoad(ctx, drag.from, drag.to || { x: drag.x, y: drag.y }, 1, t, true, drag.bad);
  for (const b of [...B].sort((a, c) => a.y - c.y)) {
    const sel = drag && (drag.from === b || drag.to === b);
    if (b.kind === 'fort') THEME.drawFort(ctx, b, t, sel); else THEME.drawHouse(ctx, b, t, sel);
  }
  for (const s of soldiers) THEME.drawSoldier(ctx, s, t, speedLeft > 0);
  for (const s of shots) THEME.drawShot(ctx, s.a, s.b, s.c);
  for (const f of fx) f.type === 'boom' ? THEME.drawBoom(ctx, f.x, f.y, f.t, f.r, f.c) : THEME.drawCapture(ctx, f.x, f.y, f.t, f.c);

  ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(0, 0, W, 60);
  ctx.fillStyle = '#fff'; ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillText('Səviyyə ' + level + (level % 5 === 0 ? '  ★ BOSS' : ''), 16, 30);
  ctx.textAlign = 'right'; ctx.font = '13px sans-serif'; ctx.fillStyle = '#dfe';
  ctx.fillText('Evdən evə sürüşdür: yol çək • Toxun: yüksəlt • Yola toxun: kəs', W - 12, 30);
  drawButton(BTN.bomb.x, BTN.bomb.y, BTN.bomb.w, 'Bomba ×' + bombs, bombArmed, bombs <= 0);
  drawButton(BTN.speed.x, BTN.speed.y, BTN.speed.w, speedLeft > 0 ? 'Sürət ' + Math.ceil(speedLeft) + 's' : 'Sürət ×' + speeds, speedLeft > 0, speeds <= 0 && speedLeft <= 0);
  if (bombArmed) { ctx.fillStyle = '#fff'; ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('Bomba atmaq üçün xəritəyə toxun', W / 2, 850); }
  if (msg) { ctx.fillStyle = 'rgba(0,0,0,.7)'; ctx.beginPath(); ctx.roundRect(W / 2 - 130, 80, 260, 36, 18); ctx.fill(); ctx.fillStyle = '#ffd0d0'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(msg.text, W / 2, 99); }
  if (state !== 'play') {
    ctx.fillStyle = 'rgba(0,0,0,.65)'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = state === 'win' ? '#7dffa0' : '#ff7d7d'; ctx.font = 'bold 52px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(state === 'win' ? 'Qələbə!' : 'Məğlubiyyət', W / 2, H / 2 - 40);
    ctx.fillStyle = '#3aa0ff'; ctx.beginPath(); ctx.roundRect(W / 2 - 120, H / 2 + 10, 240, 64, 16); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 26px sans-serif'; ctx.fillText(state === 'win' ? 'Növbəti' : 'Yenidən', W / 2, H / 2 + 43);
  }
}

function pos(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * W, y: (e.clientY - r.top) / r.height * H }; }
const hit = p => B.find(b => dist({ x: b.x, y: b.y + 2 }, p) < b.r + 12);
const inBtn = (p, k) => p.x > k.x && p.x < k.x + k.w && p.y > k.y && p.y < k.y + 52;

function bomb(p) {
  bombs--; bombArmed = false;
  fx.push({ type: 'boom', x: p.x, y: p.y, t: 0, r: 80, c: '#ff8a3d' });
  for (const s of soldiers) if (s.owner !== 1 && dist(s, p) < 80) kill(s, '#ffb347');
  for (const b of B) if (b.owner > 1 && dist(b, p) < 80) b.troops = Math.max(0, b.troops - 8);
}

cv.addEventListener('pointerdown', e => {
  const p = pos(e);
  if (state !== 'play') {
    if (p.x > W / 2 - 120 && p.x < W / 2 + 120 && p.y > H / 2 + 10 && p.y < H / 2 + 74) { if (state === 'win') level++; buildLevel(level); }
    return;
  }
  if (inBtn(p, BTN.bomb)) { if (bombs > 0) bombArmed = !bombArmed; return; }
  if (inBtn(p, BTN.speed)) { if (speeds > 0 && speedLeft <= 0) { speeds--; speedLeft = 8; } return; }
  if (bombArmed) { bomb(p); return; }
  const b = hit(p);
  if (b && b.owner === 1) { drag = { from: b, x: p.x, y: p.y, moved: false }; cv.setPointerCapture(e.pointerId); return; }
  // yola toxunub kəsmək
  const w = ways.find(w => w.from.owner === 1 && segDist(p, w.from, w.to) < 14);
  if (w) ways.splice(ways.indexOf(w), 1);
});
cv.addEventListener('pointermove', e => {
  if (!drag) return;
  const p = pos(e); drag.x = p.x; drag.y = p.y;
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
window.__tw = { get state() { return state; }, B: () => B, ways: () => ways, addWay, build: buildLevel, step: update, soldiers: () => soldiers };
buildLevel(level);
requestAnimationFrame(loop);
})();
