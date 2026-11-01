const { Sim, solveLevel, verifySolution } = require('../../engine.js');
const { NEW_LEVELS } = require('./levels_new.js');
const want = process.argv.slice(2).map(Number);
NEW_LEVELS.forEach((L, i) => {
  if (want.length && !want.includes(i + 26)) return;
  const bad = L.map.findIndex(r => r.length !== L.w); if (bad >= 0 || L.map.length !== L.h) { console.log(i + 26, L.name, 'MAP SIZE WRONG row', bad); return; }
  const ok = verifySolution(L, L.sol);
  const t0 = Date.now(); let r; for (r of solveLevel(L, { maxWins: 30, limit: 150000 })) {}
  console.log(String(i + 26).padStart(2), L.name.padEnd(18), 'given sol:', ok ? 'WINS' : 'FAILS', '| solver wins found:', r.wins.length + (r.capped ? '+ (capped)' : ''), 'tried', r.tried, 'of', r.total, ((Date.now() - t0) / 1000).toFixed(1) + 's');
  if (r.wins.length && r.wins.length <= 6) r.wins.forEach(w => console.log('     ', JSON.stringify(w)));
});
