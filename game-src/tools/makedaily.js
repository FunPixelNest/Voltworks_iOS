// node makedaily.js <from> <to>  -> daily challenge pool entries into daily_<from>.json
// Pool of 100: tiers by weekday. Mon 0-11, Tue 12-23, Wed 24-37, Thu 38-51, Fri 52-67, Sat/Sun 68-99 (extreme).
const fs = require('fs');
const G = require('./gen.js');
const { findShortcut } = require('./shortcut.js');
const from = +process.argv[2], to = +process.argv[3];
const FILE = 'daily_' + from + '.json'; const out = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : {};
const TIERS = [[0, 11, 42, 'Monday'], [12, 23, 56, 'Tuesday'], [24, 37, 68, 'Wednesday'], [38, 51, 80, 'Thursday'], [52, 67, 90, 'Friday'], [68, 99, 100, 'Weekend']];
const tierOf = i => TIERS.findIndex(t => i >= t[0] && i <= t[1]);
const A = ['Midnight', 'Copper', 'Static', 'Iron', 'Neon', 'Solar', 'Hollow', 'Twin', 'Silent', 'Crimson', 'Polar', 'Rapid', 'Deep', 'Golden', 'Broken', 'Hidden', 'Rogue', 'Prime', 'Echo', 'Storm'];
const N = ['Relay', 'Circuit', 'Spark', 'Coil', 'Grid', 'Maze', 'Switch', 'Furnace', 'Beacon', 'Pulse', 'Engine', 'Vault', 'Signal', 'Tower', 'Arc', 'Forge', 'Loop', 'Bridge', 'Core', 'Chain'];
function spec(i) {
  const [a, b, n] = TIERS[tierOf(i)]; const f = (n - 26) / 74, extreme = n >= 100, big = n >= 61;
  const links = ['air', 'light', 'laser', 'wifi', 'water', 'steam', 'beam', 'music', 'laser', 'laser', 'air', 'light'];
  return {
    w: big ? 10 : 9, h: big ? 14 : 13,
    stages: Math.min(7, 2 + Math.floor(f * 5.2 + (i % 3 === 0 ? 0.6 : 0)) + (extreme ? 1 : 0)),
    links, mirrors: 2, obstacles: 0.25 + f * 0.5,
    fixRecv: 1, fixEmit: Math.max(0, 0.3 - f * 0.45),
    decoys: n < 50 ? 1 : n < 75 ? 2 : 3,
    minInv: Math.min(12, 3 + Math.floor(f * 8) + (extreme ? 1 : 0)),
  };
}
for (let i = from; i <= to; i++) {
  if (out[i]) continue;
  const sp = spec(i); let best = null, tries = 0, sc0 = 0;
  G.setSeed(777777 + i * 104729 + (+(process.env.SEEDOFF || 0)));
  const t0 = Date.now(); let tBest = 0;
  while (tries < 2500 && (!best || (tries < 14 && Date.now() - tBest < 70000)) && Date.now() - t0 < 300000) {
    tries++;
    const b = G.build(sp); if (!b) continue;
    const L = G.toLevel(b, sp, A[i % 20] + ' ' + N[(i * 7 + 3) % 20]);
    if (L.sol.length < sp.minInv) continue;
    G.addDecoys(L, sp.decoys);
    if (G.check(L, 900)) continue;
    let sc = null; for (let k = 0; k < (+process.env.SCPASS || 3) && !sc; k++) sc = findShortcut(L, 800);
    if (sc) { sc0++; continue; }
    const score = L.sol.length * 3 + b.links.length * 2 + b.links.reduce((a, l) => a + (l.mirrors || 0), 0);
    if (!best || score > best.score) { best = { L, score, links: b.links.map(l => l.type), tier: tierOf(i) }; tBest = Date.now(); }
  }
  if (!best) { console.log(i, 'FAILED'); continue; }
  out[i] = best; fs.writeFileSync(FILE, JSON.stringify(out));
  console.log(i, TIERS[best.tier][3].padEnd(9), best.L.name.padEnd(16), 'links', best.links.join('>'), 'parts', best.L.sol.length, 'shortcuts rejected', sc0, ((Date.now() - t0) / 1000 | 0) + 's');
}
