// Publish a pack of extra levels (101-1000) without an app update.
//
//   node push_pack.js --start 101 --title "Night Shift" --sub "25 new machines puzzles" VW-AAAAAA VW-BBBBBB ...
//   node push_pack.js --start 101 --title "Night Shift" --gen ../daily_0.json        (levels straight from the generator)
//
// Setup once: npm install firebase-admin, and save a service-account key as ../daily/service-account.json
// (Firebase console > Project settings > Service accounts > Generate new private key). Never commit it.
//
// Rules the game follows: a pack's first level must come right after the last one players have (101 first,
// then 126 if that pack had 25 levels, ...). Every level is checked here: it must decode and its recorded
// solution must win in the real engine. Packs show up in the game within 6 hours (or on next launch after that).
const path = require('path'), fs = require('fs');
const admin = require('firebase-admin');
const E = require(path.join(__dirname, '../../engine.js'));
const a = process.argv.slice(2); let start = 0, title = '', sub = '', gen = null; const codes = [];
for (let i = 0; i < a.length; i++) { if (a[i] === '--start') start = +a[++i]; else if (a[i] === '--title') title = a[++i]; else if (a[i] === '--sub') sub = a[++i]; else if (a[i] === '--gen') gen = a[++i]; else codes.push(a[i]); }
if (!(start > 100 && start <= 1000)) { console.error('--start must be a level number between 101 and 1000'); process.exit(1); }
const enc = L => 'VW1.' + Buffer.from(JSON.stringify({ v: 1, n: L.name, h: L.hint || '', w: L.w, H: L.h, m: L.map, f: L.fixed || [], i: L.inv, s: L.sol, ok: true }), 'utf8').toString('base64');
const exactTray = sol => { const inv = {}; for (const s of sol) inv[s[0]] = (inv[s[0]] || 0) + 1; return inv; };
if (gen) { const j = JSON.parse(fs.readFileSync(gen)); for (const k of Object.keys(j).sort((x, y) => x - y)) { const L = j[k].L || j[k]; L.inv = exactTray(L.sol); codes.push(enc(L)); } }
if (!codes.length) { console.error('No levels given.'); process.exit(1); }
if (start - 1 + codes.length > 1000) { console.error('That would go past level 1000.'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(path.join(__dirname, '../daily/service-account.json'))) });
const db = admin.firestore();
const dec = code => { const o = JSON.parse(Buffer.from(code.trim().replace(/^VW1\./, ''), 'base64').toString('utf8')); return { name: o.n, w: o.w, h: o.H, map: o.m, fixed: o.f || [], inv: o.i || {}, sol: o.s || [] }; };
(async () => {
  const full = [];
  for (const c of codes) {
    let code = c;
    if (/^VW-?[A-Z0-9]{6}$/i.test(c)) { const d = await db.collection('levels').doc(c.toUpperCase().replace(/^VW-?/, 'VW-')).get(); if (!d.exists) { console.error(c, ': no published level'); process.exit(1); } code = d.get('code'); }
    let L; try { L = dec(code); } catch (e) { console.error(c.slice(0, 20), ': not a valid level code'); process.exit(1); }
    if (!L.sol.length || !E.verifySolution(L, L.sol)) { console.error(L.name, ': its solution does not win'); process.exit(1); }
    if (E.layoutWins(L, [])) { console.error(L.name, ': wins with an empty board'); process.exit(1); }
    full.push(code); console.log('ok  level', start - 1 + full.length, (L.name || '').padEnd(20), L.sol.length, 'parts');
  }
  const id = 'p' + String(start).padStart(4, '0');
  await db.collection('level_packs').doc(id).set({ start, title: title || ('Levels ' + start + '–' + (start - 1 + full.length)), sub: sub || 'New levels', codes: full.join('\n'), count: full.length, updated: new Date().toISOString() });
  console.log('Published level_packs/' + id + ': levels ' + start + '–' + (start - 1 + full.length) + '. The next pack starts at ' + (start + full.length) + '.');
  process.exit(0);
})();
