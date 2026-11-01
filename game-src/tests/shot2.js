const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/eb/voltworks_test.html'); await p.waitForTimeout(900);
  await p.screenshot({ path: 'shots/n_home.png' });
  const lv = +(process.env.LV || 10);
  await p.evaluate(lv => window.__VWload(lv), lv); await p.waitForTimeout(200);
  await p.evaluate(lv => { const G = window.__VW; LEVELS[lv].sol.forEach((s, i) => G.placed.push({ uid: 900 + i, t: s[0], x: s[1], y: s[2], d: s[3] == null ? defaultDir(s[0]) : s[3], born: 0 })); }, lv);
  await p.evaluate(() => document.querySelector('#resetBtn').click()); await p.waitForTimeout(100); await p.evaluate(() => window.__VWpower && window.__VWpower()); await p.waitForTimeout(1500);
  await p.screenshot({ path: 'shots/n_play.png' });
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
