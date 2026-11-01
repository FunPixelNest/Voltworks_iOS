// random-sample layouts to estimate how many win (for boards too big to enumerate)
const { Sim, layoutWins, partDirs } = require('../../engine.js');
const { NEW_LEVELS } = require('./levels_new.js');
const OFF = { mirror: 1, chime: 1, spring: 1, food: 1, soundbot: 1, kettle: 1, cannon: 1, block: 1 };
const n = +process.argv[2], N = +(process.argv[3] || 8000), L = NEW_LEVELS[n - 26];
const items = []; for (const k in L.inv) for (let i = 0; i < L.inv[k]; i++) items.push(k);
const s0 = new Sim(L, []); const free = [], wires = [];
for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) { const i = s0.idx(x, y); if (s0.at(x, y) || s0.nobuild[i]) continue; free.push([x, y]); if (s0.wire[i]) wires.push([x, y]); }
let wins = 0; const seen = new Set(), ex = [];
for (let k = 0; k < N; k++) {
  const used = new Set(), pl = [];
  for (const t of items) { const cs = OFF[t] ? free : wires; let c; do { c = cs[(Math.random() * cs.length) | 0]; } while (used.has(c + '')); used.add(c + ''); const ds = partDirs(t); pl.push({ t, x: c[0], y: c[1], d: ds[(Math.random() * ds.length) | 0] }); }
  if (layoutWins(L, pl)) { wins++; const key = JSON.stringify(pl.map(p => [p.t, p.x, p.y, p.d]).sort()); if (!seen.has(key)) { seen.add(key); if (ex.length < 6) ex.push(key); } }
}
console.log(n, L.name, 'random layouts', N, 'wins', wins, (100 * wins / N).toFixed(3) + '%'); ex.forEach(e => console.log('   ', e));
