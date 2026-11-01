// Publish a day's 5 daily challenges without an app update.
//
//   1. In the game's level editor: build a level, test-play it until it is solved (that records the
//      solution), then Share → Publish to get a short code like VW-7KQ2XM. Make 5 of them.
//   2. Firebase console → Project settings → Service accounts → Generate new private key → save it here
//      as service-account.json (never commit this file).
//   3. npm install firebase-admin   (once, in this folder)
//   4. node push_daily.js 2026-11-07 VW-AAAAAA VW-BBBBBB VW-CCCCCC VW-DDDDDD VW-EEEEEE [--tier 5] [--title "Halloween special"]
//
// Every code is checked first: it must exist, decode, and its recorded solution must win in the real game engine.
// Tier (0 easy … 5 extreme) sets the points multiplier; leave it out to use the weekday's normal tier.
// Fewer than 5 codes is fine: the game fills the rest from its built-in pool.
const path = require('path');
const admin = require('firebase-admin');
const E = require(path.join(__dirname, '../../engine.js'));
const args = process.argv.slice(2);
const date = args.shift();
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) { console.error('First argument must be a date like 2026-11-07 (UTC day).'); process.exit(1); }
let tier = null, title = ''; const codes = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--tier') tier = +args[++i];
  else if (args[i] === '--title') title = args[++i];
  else codes.push(args[i]);
}
if (!codes.length || codes.length > 5) { console.error('Give 1 to 5 level codes.'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(require(path.join(__dirname, 'service-account.json'))) });
const db = admin.firestore();
function decode(code) {
  const o = JSON.parse(Buffer.from(code.trim().replace(/^VW1\./, ''), 'base64').toString('utf8'));
  return { name: o.n, w: o.w, h: o.H, map: o.m, fixed: o.f || [], inv: o.i || {}, sol: o.s || [] };
}
(async () => {
  for (const c of codes) {
    let full = c;
    if (/^VW-?[A-Z0-9]{6}$/i.test(c)) {
      const id = c.toUpperCase().replace(/^VW-?/, 'VW-'); const d = await db.collection('levels').doc(id).get();
      if (!d.exists) { console.error(c, ': no published level with this code'); process.exit(1); }
      full = d.get('code');
    }
    let L; try { L = decode(full); } catch (e) { console.error(c, ': not a valid level code'); process.exit(1); }
    if (!L.sol.length || !E.verifySolution(L, L.sol)) { console.error(c, ': its solution does not win. Test-play it in the editor until you solve it, then publish again.'); process.exit(1); }
    console.log('ok  ', c.padEnd(12), (L.name || '').padEnd(20), L.w + 'x' + L.h, L.sol.length, 'parts');
  }
  const doc = { codes: codes.join(' '), updated: new Date().toISOString() };
  if (tier != null && !isNaN(tier)) doc.tier = Math.max(0, Math.min(5, Math.round(tier)));
  if (title) doc.title = title;
  await db.collection('daily').doc(date).set(doc);
  console.log('Published daily/' + date + '. Players get it the next time they open the Daily Challenge on that UTC day.');
  process.exit(0);
})();
