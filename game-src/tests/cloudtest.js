// End-to-end test of accounts, cloud save, short-code publish and play, against an in-memory fake Firebase.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [], log = [];
  const users = {}, docs = {}; let uidN = 0;
  async function fake(route) {
    const req = route.request(), url = new URL(req.url()), body = req.postData() ? JSON.parse(req.postData()) : null;
    const J = (o, st) => route.fulfill({ status: st || 200, contentType: 'application/json', body: JSON.stringify(o) });
    if (url.host.startsWith('identitytoolkit')) {
      if (url.pathname.endsWith('signUp')) { if (users[body.email]) return J({ error: { message: 'EMAIL_EXISTS' } }, 400); users[body.email] = { pw: body.password, uid: 'u' + (++uidN) }; }
      const u = users[body.email]; if (!u || u.pw !== body.password) return J({ error: { message: 'INVALID_LOGIN_CREDENTIALS' } }, 400);
      return J({ localId: u.uid, email: body.email, idToken: 't-' + u.uid, refreshToken: 'r', expiresIn: '3600' });
    }
    const path = decodeURIComponent(url.pathname.split('/documents/')[1] || '');
    if (req.method() === 'GET') {
      if (docs[path]) return J({ fields: docs[path] });
      const kids = Object.keys(docs).filter(k => k.startsWith(path + '/') && k.split('/').length === path.split('/').length + 1);
      if (kids.length) return J({ documents: kids.map(k => ({ fields: docs[k] })) });
      return J({ error: { message: 'not found' } }, 404);
    }
    const id = url.searchParams.get('documentId'), key = id ? path + '/' + id : path;
    if (req.method() === 'POST' && docs[key]) return J({ error: { message: 'exists' } }, 409);
    docs[key] = body.fields; return J({ name: key, fields: body.fields });
  }
  const mk = async () => { const ctx = await b.newContext({ viewport: { width: 412, height: 915 } }); await ctx.route(/identitytoolkit|firestore|securetoken/, fake);
    const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.addInitScript(() => { window.VOLTWORKS_CLOUD = { apiKey: 'k', projectId: 'demo' }; }); return p; };
  // player A: first launch -> account screen -> create account -> make a level -> share (short code)
  const A = await mk();
  await A.goto('file://' + __dirname + '/voltworks_test.html'); await A.waitForTimeout(1400);
  log.push('A first launch shows account: ' + await A.isVisible('#account'));
  await A.click('#acctBtn'); await A.waitForTimeout(300);
  await A.fill('#acctName', 'Ravi'); await A.fill('#acctEmail', 'ravi@x.com'); await A.fill('#acctPass', 'secret1'); await A.click('#acctUp'); await A.waitForTimeout(600);
  log.push('A chip: ' + await A.textContent('#acctLabel'));
  // build a level via the code path used by the editor test: load an existing VW1 code into the editor
  await A.click('#editorBtn'); await A.waitForTimeout(400);
  const code = await A.evaluate(() => { const L = LEVELS[0]; return 'VW1.' + btoa(unescape(encodeURIComponent(JSON.stringify({ v: 1, n: 'Ravi First', h: '', w: L.w, H: L.h, m: L.map, f: L.fixed || [], i: L.inv, s: L.sol, ok: true })))); });
  await A.click('.edTab[data-tab=board]'); await A.click('#edImport'); await A.fill('#edCode', code); await A.click('#edGo'); await A.waitForTimeout(400);
  await A.click('#edSave'); await A.waitForTimeout(500);
  await A.click('#edShare'); await A.waitForTimeout(1500);
  const short = await A.inputValue('#edCode'); log.push('A short code: ' + short);
  log.push('cloud docs: ' + Object.keys(docs).join(', '));
  // player B on another device: skip sign-in, play the short code
  const B = await mk();
  await B.goto('file://' + __dirname + '/voltworks_test.html'); await B.waitForTimeout(1400);
  await B.click('#levelsBtn'); await B.waitForTimeout(400);
  await B.locator('.lv.newLv', { hasText: 'Play a code' }).click(); await B.waitForTimeout(300);
  await B.fill('#edCode', short); await B.click('#edGo'); await B.waitForTimeout(1200);
  log.push('B playing: ' + await B.textContent('#lvlName') + ' | screen ' + await B.evaluate(() => window.__VW.screen));
  // player A on a new device: sign in -> levels come back from the cloud
  const A2 = await mk();
  await A2.goto('file://' + __dirname + '/voltworks_test.html'); await A2.waitForTimeout(1400);
  await A2.click('#acctBtn'); await A2.waitForTimeout(300);
  await A2.fill('#acctEmail', 'ravi@x.com'); await A2.fill('#acctPass', 'secret1'); await A2.click('#acctIn'); await A2.waitForTimeout(1200);
  log.push('A2 synced levels: ' + await A2.evaluate(() => JSON.parse(localStorage.getItem('voltworks.custom') || '[]').map(l => l.name).join(',')));
  // wrong password message
  await A2.click('#acctBtn'); await A2.click('#acctOutBtn'); await A2.fill('#acctEmail', 'ravi@x.com'); await A2.fill('#acctPass', 'nope123'); await A2.click('#acctIn'); await A2.waitForTimeout(500);
  log.push('wrong pw msg: ' + await A2.textContent('#acctMsg'));
  console.log(log.join('\n')); console.log(errs.length ? errs.join('\n') : 'no errors'); await b.close();
})();
