// node distract.js from to -> adds fixed, unmovable spare machines to the board (never on a wire, so they get no power)
// as red herrings. Each one is kept only if the intended solution still wins, the empty board still loses, and no
// layout with fewer parts wins. Writes dist_<from>.json  { n: [[type,x,y,d], ...] }
const fs = require('fs'); const E = require('./engine.js'); const { findShortcut } = require('./shortcut.js');
const { LEVELS } = require('./levels.js'); const DES = require('./designs.js');
const from = +process.argv[2], to = +process.argv[3], OUT = 'dist_' + from + '.json';
const out = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT)) : {};
let seed = 99; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
const POOL = ['fan', 'bulb', 'laser', 'mirror', 'generator', 'solar', 'kettle', 'drill', 'chargefan', 'chargelight', 'feeder', 'heater', 'steamdet', 'wsender'];
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1];
const ONLY = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
for (let n = from; n <= to; n++) {
  if (DES[n] || n < 26 || (ONLY && !ONLY.includes(n))) continue;
  seed = 1000 + n * 31;
  const L0 = LEVELS[n - 1], want = n < 50 ? 1 : n < 80 ? 2 : 3, added = [];
  const used = t => L0.sol.some(s => s[0] === t) || L0.fixed.some(f => f[0] === t);
  // prefer kinds that already appear in the level, so they look like they belong
  const kinds = POOL.filter(used).concat(POOL);
  for (let tries = 0; tries < 400 && added.length < want; tries++) {
    const L = JSON.parse(JSON.stringify(L0)); L.fixed = L.fixed.concat(added);
    const x = (rnd() * L.w) | 0, y = (rnd() * L.h) | 0;
    if (L.map[y][x] !== '.') continue;
    if (L.fixed.some(f => f[1] === x && f[2] === y) || L.sol.some(s => s[1] === x && s[2] === y)) continue;
    let nearPT = false; for (let k = 0; k < 4; k++) { const r = L.map[y + DY[k]]; const c = r && r[x + DX[k]]; if (c === 'P' || c === 'T') nearPT = true; }
    if (nearPT) continue;
    const t = kinds[(rnd() * kinds.length) | 0], dirs = E.partDirs(t), d = dirs[(rnd() * dirs.length) | 0];
    L.fixed.push([t, x, y, d]);
    if (!E.verifySolution(L, L.sol) || E.layoutWins(L, [])) continue;
    let sc = null; for (let k = 0; k < 2 && !sc; k++) sc = findShortcut(L, 600);
    if (sc) continue;
    added.push([t, x, y, d]);
  }
  out[n] = added; fs.writeFileSync(OUT, JSON.stringify(out));
  console.log(n, L0.name, 'added', added.map(a => a[0]).join(', ') || 'none');
}
