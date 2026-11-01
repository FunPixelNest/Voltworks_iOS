const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 700, height: 1000 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file://' + __dirname + '/voltworks_test.html'); await p.waitForTimeout(600);
  await p.evaluate(() => { window.__VWload(99);
    const G = window.__VW; G.placed.length = 0; let u = 700;
    const rows = [['fan',0],['laser',0],['drill',0],['chargelight',0],['chargefan',0]];
    rows.forEach(([t], r) => [0,1,2,3].forEach(d => G.placed.push({ uid: u++, t, x: 1 + d * 2, y: 1 + r * 2, d, born: -9 })));
    G.placed.push({ uid: u++, t: 'spring', x: 1, y: 11, d: 3, born: -9 }, { uid: u++, t: 'spring', x: 3, y: 11, d: 0, born: -9 }, { uid: u++, t: 'mirror', x: 5, y: 11, d: 0, born: -9 }, { uid: u++, t: 'mirror', x: 7, y: 11, d: 1, born: -9 });
    document.querySelector('#resetBtn').click(); });
  await p.waitForTimeout(600);
  await p.screenshot({ path: 'shots/turns2.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
