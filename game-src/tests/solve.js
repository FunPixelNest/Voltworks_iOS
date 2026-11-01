// node solve.js [levelNumbers...]  -> counts winning layouts with the in-game solver (all wins, no cap)
const { solveLevel, verifySolution } = require('../engine.js');
const { LEVELS } = require('../levels.js');
const want = process.argv.slice(2).map(Number);
LEVELS.forEach((L, i) => {
  if (want.length && !want.includes(i + 1)) return;
  const t0 = Date.now(); let r; for (r of solveLevel(L, { maxWins: 1e9, limit: 3e6 })) {}
  console.log(String(i + 1).padStart(2), L.name.padEnd(20), 'wins', r.wins.length, 'of', r.tried, r.capped ? '(capped)' : '', 'given sol ok:', verifySolution(L, L.sol), ((Date.now() - t0) / 1000).toFixed(1) + 's');
});
