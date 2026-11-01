const { findShortcut } = require('./shortcut.js'); const { LEVELS } = require('./levels.js');
const from = +process.argv[2], to = +process.argv[3];
for (let n = from; n <= to; n++) { let r = null; for (let k = 0; k < 3 && !r; k++) r = findShortcut(LEVELS[n - 1], 800);
  console.log(String(n).padStart(3), LEVELS[n - 1].name.padEnd(20), r ? 'SHORTCUT without ' + r.removed + ' ' + JSON.stringify(r.layout) : 'ok'); }
