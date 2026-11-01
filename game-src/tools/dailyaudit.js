// every bundled daily: solution wins (before and after the extra rows), empty board loses, every part needed, no fewer-part shortcut
const E = require('./engine.js'); const { findShortcut } = require('./shortcut.js'); const { padLevel } = require('./levels.js'); const { DAILY_POOL } = require('./dailies.js');
let bad = 0;
DAILY_POOL.forEach((L0, i) => {
  const L = padLevel(JSON.parse(JSON.stringify(L0))), p = [];
  if (!E.verifySolution(L0, L0.sol)) p.push('solution fails'); if (!E.verifySolution(L, L.sol)) p.push('solution fails padded');
  if (E.layoutWins(L, [])) p.push('wins empty');
  L.sol.forEach((s, k) => { const r = L.sol.filter((_, j) => j !== k); if (r.length ? E.verifySolution(L, r) : E.layoutWins(L, [])) p.push(s[0] + ' not needed'); });
  const sc = findShortcut(L0, 500); if (sc) p.push('shortcut');
  if (p.length) { bad++; console.log(i, L.name, p.join('; ')); }
});
console.log('daily pool', DAILY_POOL.length, bad ? bad + ' with problems' : 'all OK');
