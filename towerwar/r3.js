// ===== 3D RENDERER (Three.js) =====
// Oyun məntiqi (game.js) dəyişmir; bu fayl yalnız vəziyyəti 3D səhnəyə çevirir.
// Koordinat: oyun (x, y) -> dünya (x, 0, y). Hündürlük = Y oxu.
const R3 = (() => {
  const W = 540, H = 960, INKC = 0x1d2b3a;
  let renderer, scene, camera, ray, plane;
  const toonCache = {}, tmp = new THREE.Vector3();
  const grad = (() => { const d = new Uint8Array([90, 170, 255]); const t = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; })();
  const toon = c => toonCache[c] || (toonCache[c] = new THREE.MeshToonMaterial({ color: c, gradientMap: grad }));
  const inkMat = new THREE.MeshBasicMaterial({ color: INKC, side: THREE.BackSide });
  const hex = s => new THREE.Color(s).getHex();
  function M(geo, color, o) { // konturlu mesh
    const m = new THREE.Mesh(geo, toon(color));
    if (o !== 0) { const k = new THREE.Mesh(geo, inkMat); const s = o || 1.1; k.scale.set(s, s > 1.05 ? 1.04 : 1, s); m.add(k); }
    return m;
  }
  const cyl = (rt, rb, h, seg) => new THREE.CylinderGeometry(rt, rb, h, seg || 20);

  // ---------- başlatma ----------
  function init(canvas) {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); renderer.setSize(W, H, false);
    scene = new THREE.Scene(); scene.background = new THREE.Color(0x6cc13a);
    camera = new THREE.PerspectiveCamera(36, W / H, 10, 4000);
    camera.position.set(270, 1300, 1250); camera.lookAt(270, 0, 500);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x7fb050, 0.5));
    const sun = new THREE.DirectionalLight(0xffffff, 0.85); sun.position.set(-300, 600, 300); scene.add(sun);
    ray = new THREE.Raycaster(); plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    buildGround(); buildTrees(); buildPools();
  }

  function buildGround() {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 1536; const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, c.height); gr.addColorStop(0, '#86d94a'); gr.addColorStop(1, '#6cc13a'); g.fillStyle = gr; g.fillRect(0, 0, c.width, c.height);
    let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 120; i++) { const x = rnd() * c.width, y = rnd() * c.height, r = 60 + rnd() * 140, d = rnd() < 0.5; const rg = g.createRadialGradient(x, y, 0, x, y, r); rg.addColorStop(0, d ? 'rgba(40,120,20,.17)' : 'rgba(210,255,120,.2)'); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2); }
    for (let i = 0; i < 520; i++) { const x = rnd() * c.width, y = rnd() * c.height; g.strokeStyle = rnd() < 0.5 ? 'rgba(40,120,20,.5)' : 'rgba(200,255,130,.6)'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 5, y - 11); g.moveTo(x, y); g.lineTo(x + 2, y - 14); g.moveTo(x, y); g.lineTo(x + 6, y - 9); g.stroke(); }
    for (let i = 0; i < 90; i++) { const x = rnd() * c.width, y = rnd() * c.height; g.fillStyle = ['#fff', '#ffe25a', '#ff9ac2'][i % 3]; g.beginPath(); g.arc(x, y, 4, 0, 6.3); g.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1000, 1500), new THREE.MeshBasicMaterial({ map: tex }));
    m.rotation.x = -Math.PI / 2; m.position.set(270, -0.5, 470); scene.add(m);
  }
  function tree(x, z, k) {
    const g = new THREE.Group();
    const tr = M(cyl(4 * k, 5 * k, 16 * k, 8), 0x8a5a2b, 1.12); tr.position.y = 8 * k; g.add(tr);
    [[0, 30, 22], [0, 46, 17], [0, 59, 11]].forEach(([_, y, r]) => { const c = M(new THREE.ConeGeometry(r * k, 20 * k, 10), 0x2f9e3a, 1.08); c.position.y = y * k; g.add(c); });
    g.position.set(x, 0, z); scene.add(g);
  }
  function buildTrees() {
    let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 26; i++) { const left = i % 2 === 0; tree(left ? -30 + rnd() * 34 : 570 - rnd() * 34, 60 + rnd() * 860, 0.8 + rnd() * 0.7); }
    for (let i = 0; i < 6; i++) tree(40 + rnd() * 460, -60 - rnd() * 30, 1.1);
  }

  // ---------- obyektlər ----------
  const buildCache = new Map();
  function tower(h, o, w) {
    const g = new THREE.Group(); w = w || 10;
    const body = M(cyl(w, w * 1.06, h, 20), 0xf4ead2); body.position.y = h / 2; g.add(body);
    const band = M(cyl(w * 1.06, w * 1.06, h * 0.16, 20), hex(o.main), 1.06); band.position.y = h * 0.5; g.add(band);
    const top = M(cyl(w * 1.3, w * 1.1, 8, 20), hex(o.main)); top.position.y = h + 2; g.add(top);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.283; const cr = M(new THREE.BoxGeometry(w * 0.55, 8, w * 0.55), hex(o.main), 1.12); cr.position.set(Math.cos(a) * w * 1.15, h + 9, Math.sin(a) * w * 1.15); g.add(cr); }
    const win = M(new THREE.BoxGeometry(w * 0.4, h * 0.2, 2), 0x35465a, 0); win.position.set(0, h * 0.72, w * 1.02); g.add(win);
    return g;
  }
  function makeBuilding(b) {
    const o = THEME.owners[b.owner], g = new THREE.Group(), ud = {};
    if (b.kind === 'fort') {
      const base = M(cyl(30, 33, 8, 28), hex(o.dark)); base.position.y = 4; g.add(base);
      const t = tower(46, o, 12); t.position.y = 8; g.add(t);
      const pivot = new THREE.Group(); pivot.position.y = 66; g.add(pivot); ud.barrel = pivot;
      const turret = M(new THREE.SphereGeometry(8, 16, 12), 0x6a7685, 1.1); pivot.add(turret);
      const brl = M(cyl(3.2, 3.6, 26, 12), 0x46515f, 1.15); brl.rotation.z = Math.PI / 2; brl.position.x = 15; pivot.add(brl);
    } else {
      const lv = b.level, R = 44 + lv * 6;
      const base = M(cyl(R, R + 3, 8, 36), hex(o.dark)); base.position.y = 4; g.add(base);
      const floor = M(cyl(R - 6, R - 6, 3, 36), hex(o.light), 1.03); floor.position.y = 9; g.add(floor);
      const inner = new THREE.Mesh(cyl(R - 16, R - 16, 1, 36), new THREE.MeshBasicMaterial({ color: 0xe8d3a0, transparent: true, opacity: .55 })); inner.position.y = 10.6; g.add(inner);
      const spots = lv === 0 ? [[0, 0]] : lv === 1 ? [[-R * 0.45, 2], [R * 0.45, 2]] : [[0, -12], [-R * 0.55, 8], [R * 0.55, 8]];
      const th = 34 + lv * 6;
      spots.forEach(([dx, dz], i) => { const t = tower(th + (i === 0 && lv === 2 ? 10 : 0), o, 10); t.position.set(dx, 10, dz); g.add(t); });
      const h0 = th + (lv === 2 ? 10 : 0) + 10, fx0 = spots[0][0], fz0 = spots[0][1];
      const pole = M(cyl(1.1, 1.1, 24, 8), 0x333333, 1.4); pole.position.set(fx0, h0 + 18, fz0); g.add(pole);
      const flag = new THREE.Mesh(new THREE.PlaneGeometry(17, 11), new THREE.MeshBasicMaterial({ color: hex(o.flag), side: THREE.DoubleSide }));
      const fp = new THREE.Group(); fp.position.set(fx0, h0 + 25, fz0); flag.position.x = 8.5; fp.add(flag); g.add(fp); ud.flag = fp;
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(b.r + 12, 2.2, 8, 40), new THREE.MeshBasicMaterial({ color: 0xffffff })); ring.rotation.x = Math.PI / 2; ring.position.y = 3; ring.visible = false; g.add(ring); ud.ring = ring;
    if (b.kind === 'fort') { const rg = new THREE.Mesh(new THREE.RingGeometry(b.range - 2, b.range, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, side: THREE.DoubleSide })); rg.rotation.x = -Math.PI / 2; rg.position.y = 1; rg.visible = !!b.owner; g.add(rg); }
    const sh = new THREE.Mesh(new THREE.CircleGeometry(b.kind === 'fort' ? 38 : 56 + b.level * 6, 28), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: .22 })); sh.rotation.x = -Math.PI / 2; sh.position.set(6, 0.4, 8); g.add(sh);
    g.userData = ud; return g;
  }
  function syncBuildings(B, drag, t) {
    const seen = new Set();
    for (const b of B) {
      const key = b.kind + b.owner + '_' + b.level; let e = buildCache.get(b);
      if (!e || e.key !== key) { if (e) scene.remove(e.g); e = { key, g: makeBuilding(b) }; scene.add(e.g); buildCache.set(b, e); }
      e.g.position.set(b.x, 0, b.y); seen.add(b);
      const u = e.g.userData; if (u.flag) u.flag.rotation.y = Math.sin(t * 5 + b.x) * 0.5;
      if (u.barrel) u.barrel.rotation.y = -(b.aim || 0);
      u.ring.visible = !!(drag && (drag.from === b || drag.to === b)); if (u.ring.visible) u.ring.scale.setScalar(1 + Math.sin(t * 8) * 0.05);
    }
    for (const [b, e] of buildCache) if (!seen.has(b)) { scene.remove(e.g); buildCache.delete(b); }
  }

  // asgərlər (instanced)
  let iBody, iHead, iHelm, iOutB, iOutH; const MAXN = 900;
  const dummy = new THREE.Object3D(), tankPool = [];
  function buildPools() {
    const mk = (geo, mat) => { const m = new THREE.InstancedMesh(geo, mat, MAXN); m.count = 0; m.frustumCulled = false; scene.add(m); return m; };
    const col = new THREE.Color();
    iBody = mk(new THREE.CapsuleGeometry(3.2, 5, 4, 10), new THREE.MeshToonMaterial({ gradientMap: grad }));
    iHead = mk(new THREE.SphereGeometry(3.6, 12, 10), new THREE.MeshToonMaterial({ color: 0xffd9b0, gradientMap: grad }));
    iHelm = mk(new THREE.SphereGeometry(3.9, 12, 10, 0, 6.283, 0, 1.4), new THREE.MeshToonMaterial({ gradientMap: grad }));
    iOutB = mk(new THREE.CapsuleGeometry(3.2, 5, 4, 10), inkMat); iOutH = mk(new THREE.SphereGeometry(3.6, 12, 10), inkMat);
    for (let i = 0; i < MAXN; i++) { iBody.setColorAt(i, col); iHelm.setColorAt(i, col); }
  }
  const cB = new THREE.Color(), cH = new THREE.Color();
  function syncSoldiers(S, t) {
    let n = 0;
    for (const s of S) {
      if (s.tank || n >= MAXN) continue;
      const o = THEME.owners[s.owner], bob = Math.abs(Math.sin(t * 14 + s.id)) * 1.8, y = 8 + bob;
      const place = (m, yy, sc) => { dummy.position.set(s.x, yy, s.y); dummy.scale.setScalar(sc); dummy.rotation.y = 0; dummy.updateMatrix(); m.setMatrixAt(n, dummy.matrix); };
      place(iBody, y, 1); place(iOutB, y, 1.28); place(iHead, y + 8, 1); place(iOutH, y + 8, 1.28); place(iHelm, y + 8.6, 1);
      iBody.setColorAt(n, cB.set(o.main)); iHelm.setColorAt(n, cH.set(o.dark)); n++;
    }
    for (const m of [iBody, iHead, iHelm, iOutB, iOutH]) { m.count = n; m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
    // tanklar
    const T = S.filter(s => s.tank); while (tankPool.length < T.length) { const g = new THREE.Group(); g.userData.parts = {}; const body = M(new THREE.BoxGeometry(26, 8, 18), 0x46515f, 1.1); body.position.y = 7; g.add(body); const top = M(new THREE.BoxGeometry(18, 6, 13), 0xffffff, 1.1); top.position.y = 13; g.add(top); g.userData.top = top; const tu = M(cyl(5.5, 5.5, 5, 14), 0xffffff, 1.1); tu.position.y = 18; g.add(tu); g.userData.tu = tu; const br = M(cyl(1.8, 2, 20, 10), 0x46515f, 1.2); br.rotation.z = Math.PI / 2; br.position.set(13, 18, 0); g.add(br); scene.add(g); tankPool.push(g); }
    tankPool.forEach((g, i) => { const s = T[i]; g.visible = !!s; if (!s) return; const o = THEME.owners[s.owner]; g.position.set(s.x, 0, s.y); g.rotation.y = -Math.atan2(s.to.y - s.y, s.to.x - s.x); g.userData.top.material = toon(hex(o.main)); g.userData.tu.material = toon(hex(o.light)); });
  }

  // yollar
  const roadMap = new Map(); const dashTex = (() => { const c = document.createElement('canvas'); c.width = 64; c.height = 16; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 5, 36, 6); const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; return t; })();
  function makeRoad() {
    const g = new THREE.Group();
    const out = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: INKC })); g.add(out);
    const col = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xffffff })); g.add(col);
    const tx = dashTex.clone(); tx.needsUpdate = true; tx.wrapS = THREE.RepeatWrapping;
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tx, transparent: true })); dash.rotation.x = -Math.PI / 2; g.add(dash);
    const arrow = M(new THREE.ConeGeometry(9, 18, 3), 0xffffff, 1.15); arrow.rotation.z = -Math.PI / 2; g.add(arrow);
    g.userData = { out, col, dash, arrow, tx }; scene.add(g); return g;
  }
  function setRoad(g, a, b, color, t, preview) {
    const dx = b.x - a.x, dz = b.y - a.y, len = Math.hypot(dx, dz) || 1, u = g.userData;
    g.position.set((a.x + b.x) / 2, 0, (a.y + b.y) / 2); g.rotation.y = -Math.atan2(dz, dx);
    const w = preview ? 8 : 13;
    u.out.scale.set(len, 1, w + 5); u.out.position.y = 0.6;
    u.col.scale.set(len, 1.4, w); u.col.position.y = 1.2; u.col.material.color.set(color); u.col.material.transparent = preview; u.col.material.opacity = preview ? .7 : 1;
    u.dash.visible = !preview; u.dash.scale.set(len, w * 0.85, 1); u.dash.position.y = 2.1; u.tx.repeat.set(len / 22, 1); u.tx.offset.x = -t * 1.4;
    u.arrow.visible = !preview; u.arrow.position.set(0, 6, 0);
  }
  function syncRoads(ways, drag, t) {
    const seen = new Set();
    for (const w of ways) { let g = roadMap.get(w); if (!g) { g = makeRoad(); roadMap.set(w, g); } setRoad(g, w.from, w.to, THEME.owners[w.from.owner].main, t, false); seen.add(w); }
    const pk = 'preview'; let pg = roadMap.get(pk);
    if (drag && drag.moved) { if (!pg) { pg = makeRoad(); roadMap.set(pk, pg); } pg.visible = true; setRoad(pg, drag.from, drag.to || { x: drag.x, y: drag.y }, drag.bad ? '#ff3b3b' : '#ffffff', t, true); seen.add(pk); }
    else if (pg) pg.visible = false;
    for (const [k, g] of roadMap) if (!seen.has(k) && k !== pk) { scene.remove(g); roadMap.delete(k); }
  }

  // maneələr, qutular, effektlər
  const obsMap = new Map(), crateMap = new Map(), fxPool = [], shotPool = [];
  function syncObs(obs, t) {
    for (const o of obs) {
      if (obsMap.has(o)) { const e = obsMap.get(o); if (e.ripple) { e.ripple.forEach((r, i) => { const k = (t * 0.5 + i / 3) % 1; r.scale.setScalar(0.3 + k * 0.7); r.material.opacity = 0.8 * (1 - k); }); } continue; }
      const g = new THREE.Group(), e = { g };
      if (o.kind === 'lake') {
        const sand = M(cyl(o.r * 1.2, o.r * 1.25, 3, 32), 0xd9c48a, 1.04); sand.scale.z = 0.8; g.add(sand);
        const w = new THREE.Mesh(cyl(o.r * 1.08, o.r * 1.08, 1, 32), new THREE.MeshBasicMaterial({ color: 0x3aa8f0 })); w.scale.z = 0.8; w.position.y = 2; g.add(w);
        e.ripple = [0, 1, 2].map(() => { const r = new THREE.Mesh(new THREE.RingGeometry(o.r * 0.9, o.r, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, side: THREE.DoubleSide })); r.rotation.x = -Math.PI / 2; r.position.y = 2.6; r.scale.z = 0.8; g.add(r); return r; });
      } else {
        for (let i = 0; i < 3; i++) { const k = i === 0 ? 1 : 0.55; const m = M(new THREE.DodecahedronGeometry(o.r * k, 0), i === 0 ? 0x9aa0aa : 0xb4bac2, 1.08); m.position.set(i === 0 ? 0 : (i === 1 ? -o.r * 0.9 : o.r * 0.8), o.r * k * 0.7, i === 0 ? 0 : o.r * 0.3); m.rotation.set(i, i * 2, 0); g.add(m); }
      }
      g.position.set(o.x, 0, o.y); scene.add(g); obsMap.set(o, e);
    }
    for (const [o, e] of obsMap) if (!obs.includes(o)) { scene.remove(e.g); obsMap.delete(o); }
  }
  function syncCrates(cr, t) {
    for (const c of cr) { let g = crateMap.get(c); if (!g) { g = M(new THREE.BoxGeometry(18, 18, 18), 0xe0a24a, 1.12); const s = new THREE.Mesh(new THREE.BoxGeometry(18.6, 3, 18.6), toon(0x8a5a1c)); s.position.y = 0; g.add(s); scene.add(g); crateMap.set(c, g); } g.position.set(c.x, 12 + Math.sin(t * 3 + c.x) * 2.5, c.y); g.rotation.y = t * 0.8; }
    for (const [c, g] of crateMap) if (!cr.includes(c)) { scene.remove(g); crateMap.delete(c); }
  }
  function syncFx(fx, shots) {
    while (fxPool.length < fx.length) { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ transparent: true })); const rg = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 36), new THREE.MeshBasicMaterial({ transparent: true })); rg.rotation.x = Math.PI / 2; m.add(rg); scene.add(m); fxPool.push(m); }
    fxPool.forEach((m, i) => { const f = fx[i]; m.visible = !!f; if (!f) return; const ring = f.type !== 'boom'; m.material.visible = !ring; m.children[0].visible = ring; m.position.set(f.x, ring ? 3 : 10, f.y);
      if (ring) { m.scale.setScalar(20 + f.t * 70); m.children[0].material.color.set(f.c); m.children[0].material.opacity = 1 - f.t; } else { m.scale.setScalar((f.r || 25) * (0.3 + f.t)); m.material.color.set(f.c || '#ffb347'); m.material.opacity = 1 - f.t; } });
    while (shotPool.length < shots.length) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 2.2, 2.2), new THREE.MeshBasicMaterial({ color: 0xfff6b0 })); scene.add(m); shotPool.push(m); }
    shotPool.forEach((m, i) => { const s = shots[i]; m.visible = !!s; if (!s) return; const a = { x: s.a.x, y: s.a.y }, dx = s.b.x - a.x, dz = s.b.y - a.y, len = Math.hypot(dx, dz) || 1; m.position.set((a.x + s.b.x) / 2, 40, (a.y + s.b.y) / 2); m.scale.x = len; m.rotation.y = -Math.atan2(dz, dx); });
  }

  // ---------- ümumi API ----------
  function render(st) {
    syncBuildings(st.B, st.drag, st.t); syncRoads(st.ways, st.drag, st.t); syncObs(st.obs, st.t); syncCrates(st.crates, st.t);
    syncSoldiers(st.soldiers, st.t); syncFx(st.fx, st.shots);
    renderer.render(scene, camera);
  }
  // oyun koordinatı -> overlay (540x960) koordinatı
  function screen(x, y, h) { tmp.set(x, h || 0, y).project(camera); return { x: (tmp.x + 1) / 2 * W, y: (1 - tmp.y) / 2 * H }; }
  // overlay koordinatı -> oyun koordinatı (yer müstəvisi)
  function ground(px, py) {
    ray.setFromCamera({ x: px / W * 2 - 1, y: -(py / H * 2 - 1) }, camera);
    const p = new THREE.Vector3(); return ray.ray.intersectPlane(plane, p) ? { x: p.x, y: p.z } : { x: -999, y: -999 };
  }
  function setCam(p, l) { camera.position.set(p[0], p[1], p[2]); camera.lookAt(l[0], l[1], l[2]); camera.updateMatrixWorld(); }
  return { init, render, screen, ground, setCam };
})();
