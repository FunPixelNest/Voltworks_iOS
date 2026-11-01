const E = require('./engine.js'); const { findShortcut } = require('./shortcut.js'); const { LEVELS } = require('./levels.js');
const from = +process.argv[2], to = +process.argv[3];
for (let n = from; n <= to; n++) {
  const L = LEVELS[n - 1], probs = [];
  if (!E.verifySolution(L, L.sol)) probs.push('solution fails');
  if (E.layoutWins(L, [])) probs.push('wins empty');
  const c = {}; L.sol.forEach(s => c[s[0]] = (c[s[0]] || 0) + 1);
  for (const t in L.inv) if (L.inv[t] !== (c[t] || 0)) probs.push('tray/solution mismatch ' + t);
  L.sol.forEach((s, i) => { const r = L.sol.filter((_, j) => j !== i); if (r.length ? E.verifySolution(L, r) : E.layoutWins(L, [])) probs.push(s[0] + ' not needed'); });
  let sc = null; for (let k = 0; k < 3 && !sc; k++) sc = findShortcut(L, 800);
  if (sc) probs.push('shortcut without ' + sc.removed + ' ' + JSON.stringify(sc.layout));
  console.log(String(n).padStart(3), L.name.padEnd(20), probs.length ? 'PROBLEM: ' + probs.join('; ') : 'ok');
}
