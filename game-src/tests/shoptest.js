const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/eb/voltworks_test.html'); await p.waitForTimeout(800);
  const log = (...a) => console.log(...a);
  log('home chip', await p.textContent('#shopHints'));
  await p.screenshot({ path: 'shots/s_home.png' });
  await p.evaluate(() => window.__VWload(24)); await p.waitForTimeout(400);
  log('banner on level 7', await p.evaluate(() => document.body.classList.contains('ads')), 'badge', await p.textContent('#hintBadge'));
  await p.screenshot({ path: 'shots/s_play.png' });
  const sol = await p.evaluate(() => LEVELS[24].sol.length); log('parts', sol);
  for (let k = 0; k < 4; k++) {
    await p.evaluate(() => document.querySelector('#hintBtn').click()); await p.waitForTimeout(150);
    const pop = await p.evaluate(() => !document.querySelector('#hintPop').hidden);
    log('hint', k + 1, 'badge', await p.textContent('#hintBadge'), 'popup', pop);
    if (pop) break;
    await p.evaluate(k => { const G = window.__VW, s = LEVELS[24].sol[k]; G.placed.push({ uid: 500 + k, t: s[0], x: s[1], y: s[2], d: s[3] == null ? defaultDir(s[0]) : s[3], born: 0 }); document.querySelector('#resetBtn').click(); }, k);
  }
  await p.screenshot({ path: 'shots/s_pop.png' });
  await p.evaluate(() => document.querySelector('#hpWatch').click()); await p.waitForTimeout(800);
  await p.screenshot({ path: 'shots/s_ad.png' });
  await p.waitForTimeout(5200);
  log('after video badge', await p.textContent('#hintBadge'), 'hintStep', await p.evaluate(() => window.__VW.hintStep));
  await p.evaluate(() => { document.querySelector('#hintPop').hidden = true; window.__VW.shopBack = 'play'; });
  await p.evaluate(() => document.querySelector('#tabbar .tab[data-tab="title"]').click());
  await p.evaluate(() => document.querySelector('#shopChip').click()); await p.waitForTimeout(300);
  await p.screenshot({ path: 'shots/s_shop.png', fullPage: false });
  await p.evaluate(() => document.querySelector('#shop .wrap').scrollTo(0, 9999)); 
  await p.evaluate(() => document.querySelector('.sBuy[data-k="h15"]').click()); await p.waitForTimeout(300);
  await p.screenshot({ path: 'shots/s_buy.png' });
  await p.evaluate(() => [...document.querySelectorAll('.mSheet [data-a="1"]')].pop().click()); await p.waitForTimeout(300);
  log('after buying 15', await p.textContent('#shopHints'));
  await p.evaluate(() => document.querySelector('.sBuy[data-k="noads"]').click()); await p.waitForTimeout(200);
  await p.evaluate(() => [...document.querySelectorAll('.mSheet [data-a="1"]')].pop().click()); await p.waitForTimeout(200);
  await p.evaluate(() => window.__VWload(8)); await p.waitForTimeout(300);
  log('banner after Remove Ads', await p.evaluate(() => document.body.classList.contains('ads')));
  // interstitial: reset ad-free, zero gap
  const inter = await p.evaluate(async () => { const pr = JSON.parse(localStorage.getItem('voltworks.v1')); return 0; });
  await p.evaluate(() => document.querySelector('#tabbar .tab[data-tab="levels"]') && 0);
  log(errs.join('\n') || 'no errors'); await b.close();
})();
