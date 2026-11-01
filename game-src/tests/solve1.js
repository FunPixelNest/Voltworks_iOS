// quick check: does the in-game solver find a winning layout (first one) for each level?
const { solveLevel } = require('../engine.js');
const { LEVELS } = require('../levels.js');
const want = process.argv.slice(2).map(Number);
LEVELS.forEach((L, i) => {
  if (want.length && !want.includes(i + 1)) return;
  const t0 = Date.now(); let r; for (r of solveLevel(L, { maxWins: 1, limit: 20000 })) {}
  console.log(String(i + 1).padStart(2), L.name.padEnd(20), r.wins.length ? 'SOLVED' : (r.capped ? 'not found (capped)' : 'NO SOLUTION'), 'tried', r.tried, 'of', r.total, ((Date.now() - t0) / 1000).toFixed(1) + 's');
});
