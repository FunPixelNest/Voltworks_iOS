// node make.js [from] [to]  -> generates levels 26..100 into gen_levels.json
const fs = require('fs');
const G = require('./gen.js');
const { findShortcut } = require('./shortcut.js');
const FILE = process.env.OUT || ('gen_' + (process.argv[2] || 26) + '.json'); const out = fs.existsSync(FILE) ? JSON.parse(fs.readFileSync(FILE)) : {};
const from = +process.argv[2] || 26, to = +process.argv[3] || 100;
const NAMES = require('./names.json');
function spec(n) {
  const f = (n - 26) / 74;                    // 0 .. 1 across levels 26..100
  const big = n >= 61;
  const links = ['air', 'light', 'laser', 'wifi', 'water', 'steam', 'beam'];
  if (n >= 40) links.push('music', 'laser');
  if (process.env.FIXRECV) links.push('laser', 'air', 'light');   // more straight links, fewer free-floating ones
  return {
    w: big ? 10 : 9, h: big ? 14 : 13,
    stages: Math.min(+(process.env.MAXST || 7), 2 + Math.floor(f * 5.2 + (n % 3 === 0 ? 0.6 : 0))),
    links, mirrors: n < 36 ? 1 : 2,
    obstacles: n < 32 ? 0 : 0.25 + f * 0.5,
    fixRecv: process.env.FIXRECV ? 1 : Math.max(0.05, 0.65 - f * 0.7), fixEmit: Math.max(0, 0.3 - f * 0.45),
    decoys: n < 30 ? 0 : n < 50 ? 1 : n < 75 ? 2 : 3,
    minInv: Math.min(11, 3 + Math.floor(f * 8)),
  };
}
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
for (let n = from; n <= to; n++) {
  if (ONLY && !ONLY.includes(n)) continue;
  const sp = spec(n); let best = null, tries = 0, shortcuts = 0;
  G.setSeed(1000 + n * 7919 + (+(process.env.SEEDOFF || 0)));
  const t0 = Date.now();
  while (tries < 3000 && (!best || tries < 25) && Date.now() - t0 < (best ? 150000 : 420000)) {
    tries++;
    const b = G.build(sp); if (!b) continue;
    const L = G.toLevel(b, sp, NAMES[n - 26]);
    const nInv = L.sol.length; if (nInv < sp.minInv) continue;
    G.addDecoys(L, sp.decoys);
    const err = G.check(L, n < 50 ? 600 : 900);
    if (err) continue;
    // no layout with fewer parts may win (e.g. a laser fed straight into the feeder, making the mirrors pointless)
    let sc = null; for (let k = 0; k < 3 && !sc; k++) sc = findShortcut(L, 800);
    if (sc) { shortcuts++; continue; }
    const score = nInv * 3 + b.links.length * 2 + b.links.reduce((a, l) => a + (l.mirrors || 0), 0) + L.fixed.filter(f => ['battery', 'food', 'generator'].includes(f[0]) && false).length;
    if (!best || score > best.score) best = { L, score, links: b.links.map(l => l.type) };
  }
  if (!best) { console.log(n, 'FAILED'); continue; }
  out[n] = best;
  console.log(n, best.L.name.padEnd(18), best.L.w + 'x' + best.L.h, 'links', best.links.join('>'), 'tray', JSON.stringify(best.L.inv), 'fixed', best.L.fixed.length, 'rejected for shortcuts', shortcuts, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  fs.writeFileSync(FILE, JSON.stringify(out));
}
