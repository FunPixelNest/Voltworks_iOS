const { Sim, TYPES } = require('../engine.js');
const { LEVELS } = require('../levels.js');
function run(L, placed) {
  const s = new Sim(L, placed);
  s.setPower(true);
  for (let i = 0; i < 200 && !s.won; i++) s.tick();
  if (s.won) return 'on';
  s.setPower(false);
  for (let i = 0; i < 200 && !s.won && !s.needsReset; i++) s.tick();
  return s.won ? 'off' : (s.needsReset ? 'reset' : 'fail');
}
let bad = 0;
const used = new Set();
LEVELS.forEach((L, i) => {
  L.map.forEach((r, y) => { if (r.length !== L.w) { console.log('ROW LEN', i + 1, y); bad++; } });
  if (L.map.length !== L.h) { console.log('H mismatch', i + 1); bad++; }
  const placed = L.sol.map(s => ({ t: s[0], x: s[1], y: s[2], d: s[3] }));
  const solCount = {}; placed.forEach(p => solCount[p.t] = (solCount[p.t] || 0) + 1);
  for (const k in solCount) if ((L.inv[k] || 0) < solCount[k]) { console.log('inv short', i + 1, k); bad++; }
  // check placement cells empty
  const s0 = new Sim(L, []);
  placed.forEach(p => { if (s0.at(p.x, p.y)) { console.log('occupied', i + 1, p); bad++; } });
  const r = run(L, placed);
  const r0 = run(L, []);
  Object.keys(L.inv).forEach(k => used.add(k)); (L.fixed || []).forEach(f => used.add(f[0]));
  const ok = r !== 'fail' && r !== 'reset' && r0 !== 'on' && r0 !== 'off';
  if (!ok) bad++;
  console.log(String(i + 1).padStart(2), L.name.padEnd(18), 'solution:', r.padEnd(5), 'empty:', r0, ok ? '' : '  <-- PROBLEM');
});
const missing = Object.keys(TYPES).filter(t => !used.has(t) && !['power', 'target', 'block'].includes(t));
console.log('components not used in any level:', missing);
console.log(bad ? bad + ' problems' : 'ALL GOOD');
