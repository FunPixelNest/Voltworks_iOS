// counts winning layouts of only the solution parts, then random-samples the full tray (with decoys) for shortcuts
const E = require('./engine.js'); const D = require('./designs.js'); const G = require('./gen.js');
for (const n of Object.keys(D).filter(k => !process.argv[2] || process.argv.slice(2).includes(k))) {
  const L = Object.assign({}, D[n]); const inv0 = {}; L.sol.forEach(s => inv0[s[0]] = (inv0[s[0]] || 0) + 1);
  let res; const t0 = Date.now(); for (res of E.solveLevel(Object.assign({}, L, { inv: inv0 }), { maxWins: 200, limit: 200000 })) {}
  const err = G.check(L, 1500);
  console.log(n, L.name, 'core wins', res.wins.length, 'of', res.tried, res.capped ? 'CAPPED' : '', 'check:', err || 'OK', ((Date.now() - t0) / 1000).toFixed(1) + 's');
  if (res.wins.length <= 6) res.wins.forEach(w => console.log('   ', JSON.stringify(w)));
}
