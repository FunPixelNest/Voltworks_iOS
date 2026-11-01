// node gen.js  -> builds levels 26..100 as chained energy puzzles, verifies each with the real engine,
// and writes gen_levels.json  ({levels:[...], hints:[...]})
const E = require('./engine.js');
const { DX, DY, layoutWins, verifySolution, defaultDir, TYPES } = E;
const OFFWIRE = { mirror: 1, chime: 1, spring: 1, food: 1, soundbot: 1, kettle: 1, cannon: 1, block: 1 };

let SEED = 12345;
const rnd = () => { SEED = (SEED * 16807) % 2147483647; return SEED / 2147483647; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = a => a[Math.floor(rnd() * a.length)];
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const LET = ['a', 'b', 'c', 'd'];

function build(spec) {
  const W = spec.w, H = spec.h;
  const g = Array.from({ length: H }, () => Array(W).fill('.'));
  const owner = Array.from({ length: H }, () => Array(W).fill(-1));   // circuit index of a wire cell
  const obj = new Map();                                               // "x,y" -> {t,d,role,fixed}
  const reserved = new Set();                                           // cells that must stay empty (flow paths)
  const noObj = new Set();                                              // cells where no later part may go (ball column)
  const circuits = [];
  const K = (x, y) => x + ',' + y;
  const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
  const free = (x, y) => inb(x, y) && g[y][x] === '.' && !obj.has(K(x, y)) && !reserved.has(K(x, y));
  const sameLetterNear = (x, y, L, ci) => { for (let k = 0; k < 4; k++) { const nx = x + DX[k], ny = y + DY[k]; if (inb(nx, ny) && g[ny][nx] === L && owner[ny][nx] !== ci) return true; } return false; };
  const touchesPT = (x, y) => { for (let k = 0; k < 4; k++) { const nx = x + DX[k], ny = y + DY[k]; if (inb(nx, ny) && (g[ny][nx] === 'P' || g[ny][nx] === 'T')) return true; } return false; };
  const wireOK = (x, y, L, ci) => free(x, y) && !sameLetterNear(x, y, L, ci) && !touchesPT(x, y);
  function letterFor(x, y, avoid) {
    const opts = LET.filter(L => !avoid.includes(L) && !sameLetterNear(x, y, L, -2));
    return opts.length ? pick(opts) : null;
  }
  function lay(ci, x, y) { g[y][x] = circuits[ci].L; owner[y][x] = ci; circuits[ci].cells.push([x, y]); }
  function grow(ci, x, y, n) {
    let d = ri(0, 3), cx = x, cy = y;
    for (let s = 0; s < n; s++) {
      const dirs = rnd() < 0.7 ? [d, (d + 1) % 4, (d + 3) % 4] : shuffle([(d + 1) % 4, (d + 3) % 4, d]);
      let moved = false;
      for (const nd of dirs) { const nx = cx + DX[nd], ny = cy + DY[nd]; if (wireOK(nx, ny, circuits[ci].L, ci)) { lay(ci, nx, ny); cx = nx; cy = ny; d = nd; moved = true; break; } }
      if (!moved) break;
    }
  }
  // route a wire from (x,y) back to circuit ci (BFS) so a remover part there gets power
  function connect(ci, x, y, maxLen) {
    const L = circuits[ci].L; const prev = new Map(); const q = [[x, y]]; prev.set(K(x, y), null);
    while (q.length) {
      const [cx, cy] = q.shift();
      for (let k = 0; k < 4; k++) {
        const nx = cx + DX[k], ny = cy + DY[k]; if (!inb(nx, ny)) continue;
        if (owner[ny][nx] === ci) {   // reached the circuit
          const path = []; let c = K(cx, cy); while (c) { path.push(c.split(',').map(Number)); c = prev.get(c); }
          if (path.length > maxLen) return false;
          for (const [px, py] of path) lay(ci, px, py);
          return true;
        }
        const kk = K(nx, ny); if (prev.has(kk) || !wireOK(nx, ny, L, ci)) continue;
        prev.set(kk, K(cx, cy)); q.push([nx, ny]);
      }
    }
    return false;
  }
  function place(t, x, y, d, role, fixed) { obj.set(K(x, y), { t, x, y, d: d == null ? defaultDir(t) : d, role, fixed: !!fixed }); }
  // shield a receiver: on every side except the one its energy should arrive from, put a block on the first open
  // square (skipping its own wire), so no earlier machine can reach it from another direction
  function shield(rx, ry, inSide, ci) {
    for (let q = 0; q < 4; q++) {
      if (q === inSide) continue;
      for (let s = 1; s <= 3; s++) {
        const x = rx + DX[q] * s, y = ry + DY[q] * s; if (!inb(x, y)) break;
        if (g[y][x] === '#' || obj.has(K(x, y))) break;
        if (owner[y][x] >= 0 && owner[y][x] !== ci) break;
        if (owner[y][x] === ci) continue;
        if (g[y][x] === '.' && !reserved.has(K(x, y)) && !noObj.has(K(x, y)) && !touchesPT(x, y)) { g[y][x] = '#'; break; }
        break;
      }
    }
  }
  // looking back past the emitter: if an earlier wire lines up with the flow, it could skip a stage. Block it, or give up.
  function guardBehind(ex, ey, d, A) {
    const bd = (d + 2) % 4; let firstFree = null;
    for (let s = 1; ; s++) {
      const x = ex + DX[bd] * s, y = ey + DY[bd] * s; if (!inb(x, y)) return true;
      if (g[y][x] === '#' || obj.has(K(x, y))) return true;
      if (owner[y][x] >= 0 && owner[y][x] < A) { if (firstFree) { g[firstFree[1]][firstFree[0]] = '#'; return true; } return false; }
      if (!firstFree && g[y][x] === '.' && !reserved.has(K(x, y)) && !touchesPT(x, y)) firstFree = [x, y];
    }
  }

  // ---- power and the first circuit
  const side = ri(0, 1);
  const px = side ? W - 1 : 0, py = ri(1, H - 2);
  g[py][px] = 'P';
  circuits.push({ L: pick(LET), cells: [] });
  const sx = px + (side ? -1 : 1);
  lay(0, sx, py); grow(0, sx, py, ri(3, 6));
  const links = [];
  // ---- chain of links
  for (let st = 0; st < spec.stages; st++) {
    const A = st, Ac = circuits[A].cells.filter(([x, y]) => !obj.has(K(x, y)) && !noObj.has(K(x, y)));
    if (!Ac.length) return null;
    let made = false;
    for (let tries = 0; tries < 80 && !made; tries++) {
      const type = pick(spec.links);
      const [ex, ey] = pick(Ac);
      const res = tryLink(type, A, ex, ey);
      if (res) { links.push(res); made = true; }
    }
    if (!made) return null;
  }
  function newCircuit(rx, ry, avoidL) {
    const L = letterFor(rx, ry, avoidL); if (!L) return -1;
    if (!free(rx, ry) || touchesPT(rx, ry)) return -1;
    circuits.push({ L, cells: [] }); const ci = circuits.length - 1;
    if (sameLetterNear(rx, ry, L, ci)) { circuits.pop(); return -1; }
    lay(ci, rx, ry); grow(ci, rx, ry, ri(2, 5));
    return ci;
  }
  function pathFree(cells) { return cells.every(([x, y]) => free(x, y) && owner[y][x] === -1); }
  function tryLink(type, A, ex, ey) {
    const LA = circuits[A].L;
    const snapshot = () => JSON.stringify([g, owner, [...obj], [...reserved], circuits.length, circuits.map(c => c.cells.length)]);
    void snapshot;
    if (type === 'air' || type === 'light' || type === 'beam') {
      const d = ri(0, 3), k = ri(2, 5), cells = [];
      for (let s = 1; s < k; s++) cells.push([ex + DX[d] * s, ey + DY[d] * s]);
      const rx = ex + DX[d] * k, ry = ey + DY[d] * k;
      if (!inb(rx, ry) || !pathFree(cells) || !free(rx, ry)) return null;
      cells.forEach(([x, y]) => reserved.add(K(x, y)));
      const ci = newCircuit(rx, ry, [LA]); if (ci < 0) { cells.forEach(([x, y]) => reserved.delete(K(x, y))); return null; }
      const em = type === 'air' ? (rnd() < 0.25 ? 'chargefan' : 'fan') : type === 'beam' ? 'chargelight' : 'bulb';
      if (!guardBehind(ex, ey, d, A)) return null;
      place(em, ex, ey, em === 'bulb' ? null : d, 'emit');
      place(type === 'air' ? 'generator' : 'solar', rx, ry, null, 'recv');
      shield(rx, ry, (d + 2) % 4, ci);
      maybeObstacle(cells, A, d);
      return { type: em, ci };
    }
    if (type === 'laser') {
      const nm = spec.mirrors ? ri(1, Math.min(2, spec.mirrors)) : 0;
      let d = nm === 1 ? pick([1, 3]) : pick([0, 2]);
      if (nm === 2) d = pick([0, 2]);
      let x = ex, y = ey; const cells = [], mirrors = [];
      const legs = nm === 0 ? [d] : nm === 1 ? [d, pick([0, 2])] : [d, pick([1, 3]), d];
      for (let li = 0; li < legs.length; li++) {
        const dd = legs[li], n = li === legs.length - 1 ? ri(2, 4) : ri(1, 4);
        for (let s = 0; s < n; s++) { x += DX[dd]; y += DY[dd]; if (s < n - 1 || li === legs.length - 1) cells.push([x, y]); }
        if (li < legs.length - 1) { mirrors.push([x, y, dd, legs[li + 1]]); }
      }
      const [rx, ry] = cells.pop();
      if (!inb(rx, ry) || !pathFree(cells) || !free(rx, ry)) return null;
      for (const [mx, my] of mirrors) if (!free(mx, my) || owner[my][mx] !== -1) return null;
      cells.forEach(([cx, cy]) => reserved.add(K(cx, cy))); mirrors.forEach(([mx, my]) => reserved.add(K(mx, my)));
      const ci = newCircuit(rx, ry, [LA]);
      if (ci < 0) { cells.forEach(([cx, cy]) => reserved.delete(K(cx, cy))); mirrors.forEach(([mx, my]) => reserved.delete(K(mx, my))); return null; }
      mirrors.forEach(([mx, my]) => reserved.delete(K(mx, my)));
      place('laser', ex, ey, d, 'emit');
      for (const [mx, my, din, dout] of mirrors) { const md = (3 - din) === dout ? 0 : 1; place('mirror', mx, my, md, 'mirror'); }
      place('feeder', rx, ry, null, 'recv');
      const lastLeg = legs[legs.length - 1];
      shield(rx, ry, (lastLeg + 2) % 4, ci);
      if (!guardBehind(ex, ey, d, A)) { /* keep: the check below rejects a real shortcut */ }
      maybeObstacle(cells, A, null);
      return { type: 'laser', ci, mirrors: mirrors.length };
    }
    if (type === 'water') {
      const d = pick([0, 2]), sx = ex + DX[d], k = ri(2, 5), ry = ey + k;
      const cells = [[sx, ey]]; for (let s = 1; s < k; s++) cells.push([sx, ey + s]);
      if (!inb(sx, ry) || !pathFree(cells) || !free(sx, ry)) return null;
      cells.forEach(([x, y]) => reserved.add(K(x, y)));
      const ci = newCircuit(sx, ry, [LA]); if (ci < 0) { cells.forEach(([x, y]) => reserved.delete(K(x, y))); return null; }
      place('kettle', ex, ey, d, 'emit'); place('generator', sx, ry, null, 'recv'); shield(sx, ry, 3, ci);
      return { type: 'kettle', ci };
    }
    if (type === 'steam') {
      const kx = ex, ky = ey - 1, k = ri(2, 4), ry = ky - k;
      const cells = []; for (let s = 1; s < k; s++) cells.push([kx, ky - s]);
      if (!inb(kx, ry) || !free(kx, ky) || owner[ky][kx] !== -1 || !pathFree(cells) || !free(kx, ry)) return null;
      cells.forEach(([x, y]) => reserved.add(K(x, y))); reserved.add(K(kx, ky));
      const ci = newCircuit(kx, ry, [LA]); if (ci < 0) { cells.forEach(([x, y]) => reserved.delete(K(x, y))); reserved.delete(K(kx, ky)); return null; }
      reserved.delete(K(kx, ky));
      place('heater', ex, ey, null, 'emit'); place('kettle', kx, ky, ri(0, 1) ? 0 : 2, 'kettle'); place('steamdet', kx, ry, null, 'recv'); shield(kx, ry, 1, ci);
      return { type: 'steam', ci };
    }
    if (type === 'wifi') {
      const cand = [];
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.max(Math.abs(dx), Math.abs(dy)) >= 2) cand.push([ex + dx, ey + dy]);
      shuffle(cand);
      for (const [rx, ry] of cand) {
        if (!free(rx, ry)) continue;
        let near = false;   // an earlier wire within range would let a sender skip this stage
        for (let dy = -3; dy <= 3 && !near; dy++) for (let dx = -3; dx <= 3 && !near; dx++) { const x = rx + dx, y = ry + dy; if (inb(x, y) && owner[y][x] >= 0 && owner[y][x] < A) near = true; }
        if (near) continue;
        const ci = newCircuit(rx, ry, [LA]); if (ci < 0) continue;
        place('wsender', ex, ey, null, 'emit'); place('wreceiver', rx, ry, null, 'recv');
        return { type: 'wifi', ci };
      }
      return null;
    }
    if (type === 'music') {
      const d = ri(0, 3), k = ri(2, 4), cells = [];
      for (let s = 1; s < k; s++) cells.push([ex + DX[d] * s, ey + DY[d] * s]);
      const cx = ex + DX[d] * k, cy = ey + DY[d] * k;
      if (!inb(cx, cy) || !pathFree(cells) || !free(cx, cy) || owner[cy][cx] !== -1) return null;
      const around = shuffle([[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]].map(([a, b]) => [cx + a, cy + b]))
        .filter(([x, y]) => free(x, y) && !cells.some(c => c[0] === x && c[1] === y) && !(x === ex && y === ey));
      cells.forEach(([x, y]) => reserved.add(K(x, y))); reserved.add(K(cx, cy));
      for (const [hx, hy] of around) {
        const ci = newCircuit(hx, hy, [LA]); if (ci < 0) continue;
        reserved.delete(K(cx, cy));
        place('fan', ex, ey, d, 'emit'); place('chime', cx, cy, null, 'chime'); place('hamster', hx, hy, ri(0, 1) ? 0 : 2, 'recv'); shield(cx, cy, (d + 2) % 4, -2);
        return { type: 'music', ci };
      }
      cells.forEach(([x, y]) => reserved.delete(K(x, y))); reserved.delete(K(cx, cy));
      return null;
    }
    return null;
  }
  // an old machine dumped in the flow path: a drill (or a dropped ball) has to clear it first
  function maybeObstacle(cells, A, d) {
    if (!spec.obstacles || rnd() > spec.obstacles || cells.length < 2) return;
    const opts = shuffle(cells.slice(1));
    for (const [bx, by] of opts) {
      const tool = rnd() < 0.6 ? 'drill' : 'balldrop';
      if (tool === 'drill') {
        for (const k of shuffle([0, 1, 2, 3])) {
          const cx = bx - DX[k], cy = by - DY[k];
          if (!free(cx, cy) || owner[cy][cx] !== -1) continue;
          if (!wireOK(cx, cy, circuits[A].L, A)) continue;
          if (!connect(A, cx, cy, 5)) continue;
          place(pick(['battery', 'food', 'generator']), bx, by, null, 'junk', true);
          place('drill', cx, cy, k, 'tool');
          return;
        }
      } else {
        // ball dropper somewhere above the junk; everything under the junk in that column must stay clear
        for (let up = 2; up <= 4; up++) {
          const cx = bx, cy = by - up; if (!inb(cx, cy)) break;
          let ok = free(cx, cy) && owner[cy][cx] === -1 && wireOK(cx, cy, circuits[A].L, A);
          for (let y = cy + 1; y < by && ok; y++) if (obj.has(K(cx, y)) || reserved.has(K(cx, y)) && false) ok = false;
          for (let y = by + 1; y < H && ok; y++) if (obj.has(K(cx, y)) || owner[y][cx] >= 0) ok = false;
          if (!ok || !connect(A, cx, cy, 5)) continue;
          for (let y = by + 1; y < H; y++) noObj.add(K(cx, y));
          for (let y = cy + 1; y < by; y++) noObj.add(K(cx, y));
          place(pick(['battery', 'food']), bx, by, null, 'junk', true);
          place('balldrop', cx, cy, null, 'tool');
          return;
        }
      }
    }
  }
  // ---- target at the end of the last circuit
  const last = circuits[circuits.length - 1];
  let placedT = false;
  for (const [x, y] of shuffle(last.cells.slice().reverse()).slice(0, 12)) {
    for (const k of shuffle([0, 1, 2, 3])) {
      const tx = x + DX[k], ty = y + DY[k];
      if (!free(tx, ty)) continue;
      let bad = false; for (let q = 0; q < 4; q++) { const nx = tx + DX[q], ny = ty + DY[q]; if (inb(nx, ny) && owner[ny][nx] >= 0 && owner[ny][nx] !== circuits.length - 1) bad = true; if (inb(nx, ny) && g[ny][nx] === 'P') bad = true; }
      if (bad) continue;
      g[ty][tx] = 'T'; placedT = true; break;
    }
    if (placedT) break;
  }
  if (!placedT) return null;
  // power must only touch circuit 0
  for (let q = 0; q < 4; q++) { const nx = px + DX[q], ny = py + DY[q]; if (inb(nx, ny) && owner[ny][nx] > 0) return null; }
  // parts on noObj cells would be smashed
  for (const o of obj.values()) if (noObj.has(K(o.x, o.y)) && o.role !== 'junk') return null;
  return { W, H, g, obj, links, circuits };
}

// ---- turn a built layout into a level: decide what is fixed and what goes in the tray
function toLevel(b, spec, name) {
  const fixed = [], sol = [], inv = {};
  const parts = [...b.obj.values()];
  for (const o of parts) {
    let fix = o.fixed;
    if (!fix && o.role === 'recv') fix = rnd() < spec.fixRecv;
    if (!fix && o.role === 'emit') fix = rnd() < spec.fixEmit;
    if (!fix && o.role === 'kettle') fix = rnd() < spec.fixEmit;
    if (!fix && o.role === 'chime') fix = rnd() < spec.fixRecv;
    if (fix) fixed.push([o.t, o.x, o.y, o.d]);
    else { sol.push([o.t, o.x, o.y, o.d]); inv[o.t] = (inv[o.t] || 0) + 1; }
  }
  return { name, w: b.W, h: b.H, map: b.g.map(r => r.join('')), fixed, inv, sol };
}
function addDecoys(L, n) {
  const pool = ['fan', 'bulb', 'mirror', 'laser', 'kettle', 'heater', 'drill', 'chargefan', 'balldrop'];
  for (let i = 0; i < n; i++) { const t = pick(pool); L.inv[t] = (L.inv[t] || 0) + 1; }
}
// ---- checks with the real engine
function candidates(L) {
  const s0 = new E.Sim(L, []); const free = [], wires = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const i = s0.idx(x, y); if (s0.at(x, y) || s0.nobuild[i]) continue; free.push([x, y]); if (s0.wire[i]) wires.push([x, y]); }
  return { free, wires };
}
function randomLayout(L, C) {
  const used = new Set(), out = [];
  for (const t in L.inv) for (let n = 0; n < L.inv[t]; n++) {
    const cs = OFFWIRE[t] ? C.free : C.wires; if (!cs.length) continue;
    for (let tries = 0; tries < 20; tries++) {
      const [x, y] = pick(cs); if (used.has(x + ',' + y)) continue; used.add(x + ',' + y);
      out.push({ t, x, y, d: pick(E.partDirs(t)) }); break;
    }
  }
  return out;
}
function check(L, samples) {
  if (!verifySolution(L, L.sol)) return 'sol fails';
  if (layoutWins(L, [])) return 'wins empty';
  // every tray part in the solution is needed
  for (let i = 0; i < L.sol.length; i++) { const s = L.sol.filter((_, j) => j !== i); if (s.length ? verifySolution(L, s) : layoutWins(L, [])) return 'part ' + L.sol[i][0] + ' not needed'; }
  // random layouts should almost never win (no easy shortcut)
  const C = candidates(L); let wins = 0;
  for (let k = 0; k < samples; k++) if (layoutWins(L, randomLayout(L, C))) wins++;
  if (wins > samples * 0.004) return 'too easy (' + wins + '/' + samples + ')';
  return null;
}

module.exports = { build, toLevel, addDecoys, check, setSeed: s => { SEED = s; }, rnd, ri, pick };
