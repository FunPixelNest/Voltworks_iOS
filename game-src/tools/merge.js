// node merge.js -> folds gen_*.json (levels 26..100) into levels.js, with written hints for each
const fs = require('fs');
const { TYPES } = require('./engine.js');
const all = {};
for (const f of fs.readdirSync('.').filter(f => /^gen_(\d+|[a-z]\d+)\.json$/.test(f)).sort()) Object.assign(all, JSON.parse(fs.readFileSync(f)));
const DIRW = ['right', 'down', 'left', 'up'];
const FLOW = { fan: 'wind', chargefan: 'wind', bulb: 'light', chargelight: 'a light beam', laser: 'a laser', kettle: 'falling water', steam: 'steam', wifi: 'wireless', music: 'music' };
const DES = require('./designs.js');
// fixed spare machines on the board (off-wire red herrings), each one checked by distract.js
const DIST = {}; for (const f of fs.readdirSync('.').filter(f => /^dist_\d+\.json$/.test(f))) Object.assign(DIST, JSON.parse(fs.readFileSync(f)));
const out = [];
// the tray holds exactly the parts the solution uses: no spare decoy parts, every part has a job
const exactTray = sol => { const inv = {}; for (const s of sol) inv[s[0]] = (inv[s[0]] || 0) + 1; return inv; };
for (let n = 26; n <= 100; n++) {
  if (DES[n]) { const d = DES[n]; out.push(Object.assign({}, d, { inv: exactTray(d.sol), hint: d.nudge, designed: true })); continue; }
  const b = all[n]; if (!b) { console.error('missing level', n); process.exit(1); }
  const L = b.L, links = b.links;
  const solTypes = L.sol.map(s => s[0]);
  const decoys = Object.entries(L.inv).reduce((a, [t, c]) => a + c, 0) - L.sol.length;
  const hasDrill = solTypes.includes('drill'), hasBall = solTypes.includes('balldrop');
  let nudge = 'The power has to make ' + links.length + ' jump' + (links.length > 1 ? 's' : '') + ' to reach the target: ' + links.map(l => FLOW[l] || l).join(', then ') + '.';
  if (hasDrill || hasBall) nudge += ' Something is blocking one of the paths: clear it first.';
  void decoys;
  const first = links[0];
  const trick = {
    fan: 'Start with wind: a fan on the power wire blowing straight at a generator.',
    chargefan: 'Start with wind: a fan on the power wire blowing straight at a generator.',
    bulb: 'Start with light: a bulb on the power wire, in line with a solar panel.',
    chargelight: 'Start with a light beam: the flashlight on the power wire pointing at a solar panel.',
    laser: 'Start with the laser: it only enters a feeder from the left or right, so use mirrors to turn it.',
    kettle: 'Start with water: a kettle on the power wire pours down next to its spout, onto a generator.',
    steam: 'Start with steam: a heater on the power wire with a kettle on top sends steam straight up.',
    wifi: 'Start with wireless: a sender on the power wire reaches a receiver up to 3 squares away.',
    music: 'Start with music: wind on a wind chime makes the hamster next to it run.',
  }[first] || '';
  const steps = L.sol.map(([t, x, y, d]) => {
    const r = TYPES[t].rot; let s = 'Put the ' + TYPES[t].name + ' at column ' + (x + 1) + ', row ' + (y + 1);
    if (r === '4' || r === 'lr') s += ', facing ' + DIRW[d];
    if (r === 'mirror') s += ', slanted ' + (d === 0 ? '/' : '\\');
    return s + '.';
  });
  steps.push('Tap the Power Box.');
  out.push(Object.assign({}, L, { fixed: L.fixed.concat(DIST[n] || []), inv: exactTray(L.sol), hint: nudge, nudge, trick, steps, gen: true }));
}
let src = fs.readFileSync('levels.js', 'utf8');
src = src.replace(/\n\/\/ ===== generated levels 26-100 =====[\s\S]*?\/\/ ===== end generated =====\n/, '\n');
const block = '\n// ===== generated levels 26-100 =====\n// built by gen.js/make.js and checked with the engine: solvable, every tray part is needed, no spare parts,\n// and no layout with fewer parts wins.\nLEVELS.splice(25);\nLEVELS.push(...' + JSON.stringify(out) + ');\n// ===== end generated =====\n';
src = src.replace("if (typeof module !== 'undefined') module.exports = { LEVELS };", block + "if (typeof module !== 'undefined') module.exports = { LEVELS };");
fs.writeFileSync('levels.js', src);
console.log('levels now', require('./levels.js').LEVELS.length);
