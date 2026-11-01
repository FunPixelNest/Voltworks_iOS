const { Sim, defaultDir } = require('../../engine.js');
const { NEW_LEVELS } = require('./levels_new.js');
const n = +process.argv[2], L = NEW_LEVELS[n - 26];
const s = new Sim(L, L.sol.map(q => ({ t: q[0], x: q[1], y: q[2], d: q[3] == null ? defaultDir(q[0]) : q[3] })));
s.setPower(true); let t = 0; for (; t < 160 && !s.won; t++) s.tick();
console.log(L.name, 'won', s.won, 'ticks', t);
for (const o of s.objs) console.log(' ', o.t.padEnd(10), o.x + ',' + o.y, 'd' + o.d, o.powered ? 'POWERED' : '', o.src ? 'SRC' : '', o.lit ? 'lit' : '', o.driven ? 'driven' : '', o.fed ? 'fed' : '', o.inMusic ? 'music' : '', o.ringing ? 'ringing' : '');
const F = s.flows; for (const k in F) if (F[k].length) console.log('  flow', k, F[k].map(f => JSON.stringify((f.pts || []).map(p => p.map(v => +v.toFixed(1))))).join(' | ').slice(0, 300));
let rows = []; for (let y = 0; y < s.h; y++) { let r = ''; for (let x = 0; x < s.w; x++) { const o = s.at(x, y), i = s.idx(x, y); r += o ? o.t[0].toUpperCase() : s.wire[i] ? (s.live[i] ? '*' : '-') : '.'; } rows.push(r); } console.log(rows.join('\n'));
