// node shortcut.js [from] [to]  -> for each level, takes one needed part out of the tray and looks for any win
// with what is left: first by moving one remaining part anywhere (every square, every direction), then by
// moving two parts at random. Prints levels that still win, i.e. a part the player never really needs.
const E = require('./engine.js'); const { LEVELS } = require('./levels.js');
const OFFWIRE = { mirror: 1, chime: 1, spring: 1, food: 1, soundbot: 1, kettle: 1, cannon: 1, block: 1 };
function cands(L) { const s0 = new E.Sim(L, []); const free = [], wires = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const i = s0.idx(x, y); if (s0.at(x, y) || s0.nobuild[i]) continue; free.push([x, y]); if (s0.wire[i]) wires.push([x, y]); }
  return { free, wires }; }
// same result as engine.layoutWins, but stops as soon as the board has settled (nothing moving, nothing changing)
function wins(L, placed) {
  const s = new E.Sim(L, placed); s.setPower(true); let still = 0, sig = '';
  for (let i = 0; i < 160 && !s.won; i++) { s.tick(); const g = s.signature(); if (!s.activity && !s.proj.length && g === sig) { if (++still >= 6) break; } else still = 0; sig = g; }
  if (s.won) return true;
  s.setPower(false);
  for (let i = 0; i < 120 && !s.won && !s.needsReset; i++) s.tick();
  return s.won;
}
const toP = s => ({ t: s[0], x: s[1], y: s[2], d: s[3] == null ? E.defaultDir(s[0]) : s[3] });
function findShortcut(L, samples) {
  const C = cands(L), sol = L.sol.map(toP);
  // the spare parts in the tray (decoys) may be used too
  const extra = {}; for (const t in L.inv) extra[t] = L.inv[t]; for (const p of sol) extra[p.t]--;
  for (let r = 0; r < sol.length; r++) {
    const rest = sol.filter((_, j) => j !== r), removed = sol[r];
    const spare = Object.assign({}, extra);
    const pool = []; for (const t in spare) for (let k = 0; k < spare[t]; k++) pool.push(t);
    const occupied = l => new Set(l.map(p => p.x + ',' + p.y));
    // 1) move any single remaining part (or drop in one spare part) to any square and direction
    // (layouts always use one part fewer than the intended solution, so swapping in a spare of the same kind is not a shortcut)
    const movers = rest.map((p, i) => ({ t: p.t, i }));
    for (const m of movers) {
      const base = rest.filter((_, j) => j !== m.i), occ = occupied(base);
      for (const [x, y] of (OFFWIRE[m.t] ? C.free : C.wires)) { if (occ.has(x + ',' + y)) continue;
        for (const d of E.partDirs(m.t)) { const lay = base.concat([{ t: m.t, x, y, d }]); if (wins(L, lay)) return { removed: removed.t, layout: lay.map(p => [p.t, p.x, p.y, p.d]) }; } }
    }
    // 2) random pairs of moves
    for (let k = 0; k < samples; k++) {
      let lay = rest.map(p => Object.assign({}, p));
      for (let q = 0; q < 2; q++) {
        if (pool.length && lay.length && Math.random() < 0.3) { const i = (Math.random() * lay.length) | 0, t = pool[(Math.random() * pool.length) | 0], cs = OFFWIRE[t] ? C.free : C.wires, c = cs[(Math.random() * cs.length) | 0]; lay[i] = { t, x: c[0], y: c[1], d: E.partDirs(t)[(Math.random() * E.partDirs(t).length) | 0] }; }
        else if (lay.length) { const i = (Math.random() * lay.length) | 0, p = lay[i], cs = OFFWIRE[p.t] ? C.free : C.wires, c = cs[(Math.random() * cs.length) | 0], ds = E.partDirs(p.t); lay[i] = { t: p.t, x: c[0], y: c[1], d: ds[(Math.random() * ds.length) | 0] }; }
      }
      const occ = new Set(); if (lay.some(p => { const kk = p.x + ',' + p.y; if (occ.has(kk)) return true; occ.add(kk); return false; })) continue;
      if (wins(L, lay)) return { removed: removed.t, layout: lay.map(p => [p.t, p.x, p.y, p.d]) };
    }
  }
  return null;
}
if (require.main === module) {
  const from = +process.argv[2] || 1, to = +process.argv[3] || LEVELS.length;
  for (let n = from; n <= to; n++) { const L = LEVELS[n - 1], t0 = Date.now(); const r = findShortcut(L, 600);
    console.log(String(n).padStart(3), L.name.padEnd(20), r ? 'SHORTCUT without ' + r.removed + ': ' + JSON.stringify(r.layout) : 'ok', ((Date.now() - t0) / 1000).toFixed(0) + 's'); }
}
module.exports = { findShortcut, wins };
