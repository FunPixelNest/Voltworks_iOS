// node builddaily.js -> dailies.js (DAILY_POOL: 100 bundled daily challenges, grouped by weekday difficulty)
const fs = require('fs');
const { TYPES } = require('./engine.js');
const all = {};
for (const f of fs.readdirSync('.').filter(f => /^daily_\d+\.json$/.test(f))) Object.assign(all, JSON.parse(fs.readFileSync(f)));
const DIRW = ['right', 'down', 'left', 'up'];
const FLOW = { fan: 'wind', chargefan: 'wind', bulb: 'light', chargelight: 'a light beam', laser: 'a laser', kettle: 'falling water', steam: 'steam', wifi: 'wireless', music: 'music', air: 'wind', light: 'light', water: 'falling water', beam: 'a light beam' };
const exactTray = sol => { const inv = {}; for (const s of sol) inv[s[0]] = (inv[s[0]] || 0) + 1; return inv; };
const pool = [];
for (const k of Object.keys(all).map(Number).sort((a, b) => a - b)) {
  const { L, links, tier } = all[k];
  const solTypes = L.sol.map(s => s[0]);
  let nudge = 'The power has to make ' + links.length + ' jumps to reach the target: ' + links.map(l => FLOW[l] || l).join(', then ') + '.';
  if (solTypes.includes('drill') || solTypes.includes('balldrop')) nudge += ' Something is blocking one of the paths: clear it first.';
  const steps = L.sol.map(([t, x, y, d]) => {
    const r = TYPES[t].rot; let s = 'Put the ' + TYPES[t].name + ' at column ' + (x + 1) + ', row ' + (y + 1);
    if (r === '4' || r === 'lr') s += ', facing ' + DIRW[d];
    if (r === 'mirror') s += ', slanted ' + (d === 0 ? '/' : '\\');
    return s + '.';
  });
  steps.push('Tap the Power Box.');
  pool.push(Object.assign({}, L, { inv: exactTray(L.sol), hint: nudge, nudge, trick: '', steps, tier, daily: true }));
}
const tiers = [0, 1, 2, 3, 4, 5].map(t => pool.map((l, i) => l.tier === t ? i : -1).filter(i => i >= 0));
fs.writeFileSync('dailies.js', '// ===== bundled daily challenges (built by makedaily.js + builddaily.js, every one checked: solvable, every part needed, no shortcut) =====\nconst DAILY_POOL = ' + JSON.stringify(pool) + ';\nconst DAILY_TIER_IDX = ' + JSON.stringify(tiers) + ';\nif (typeof module !== \'undefined\') module.exports = { DAILY_POOL, DAILY_TIER_IDX };\n');
console.log('daily pool', pool.length, 'per tier', tiers.map(t => t.length).join(' '));
