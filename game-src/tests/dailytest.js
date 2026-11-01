const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => { if (!localStorage.getItem('dt.init')) { localStorage.setItem('dt.init', '1'); const pr = { done: {} }; for (let i = 0; i < 24; i++) pr.done[i] = 0; localStorage.setItem('voltworks.v1', JSON.stringify(pr)); } });   // a player who has met every machine
  await p.goto('file:///home/claude/eb/voltworks_test.html'); await p.waitForTimeout(1500);
  await p.screenshot({ path: 'shots/d_home.png' });
  await p.evaluate(() => document.querySelector('#dailyCard').click()); await p.waitForTimeout(6500);
  await p.screenshot({ path: 'shots/d_screen.png' });
  console.log('items', await p.evaluate(() => document.querySelectorAll('.dItem').length));
  await p.evaluate(() => document.querySelector('.dItem').click()); await p.waitForTimeout(600);
  await p.screenshot({ path: 'shots/d_play.png' });
  console.log('hud', await p.textContent('.lvK'), await p.textContent('#lvlNum'), 'banner', await p.evaluate(() => document.body.classList.contains('ads')));
  await p.evaluate(() => { const G = window.__VW; G.custom.sol.forEach((s, i) => G.placed.push({ uid: 900 + i, t: s[0], x: s[1], y: s[2], d: s[3] == null ? defaultDir(s[0]) : s[3], born: 0 })); document.querySelector('#resetBtn').click(); });
  await p.waitForTimeout(200); await p.evaluate(() => window.__VWpower()); for (let k = 0; k < 30 && !(await p.evaluate(() => !document.querySelector("#win").hidden)); k++) await p.waitForTimeout(1000);
  console.log('win shown', await p.evaluate(() => !document.querySelector('#win').hidden), await p.textContent('#winRibbon'), '|', await p.textContent('#winMsg'));
  await p.screenshot({ path: 'shots/d_win.png' });
  await p.evaluate(() => document.querySelector('#winLevels').click ? 0 : 0);
  await p.evaluate(() => { document.querySelector('#win').hidden = true; });
  await p.evaluate(() => document.querySelector('#tabbar .tab[data-tab="title"]').click()); await p.waitForTimeout(300);
  console.log('card', await p.textContent('#dcSub'), 'streak', await p.textContent('#dcStreak'));
  await p.evaluate(() => document.querySelector('#tabbar .tab[data-tab="leader"]').click()); await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('#lbSeg [data-k="day"]').click()); await p.waitForTimeout(1500);
  await p.screenshot({ path: 'shots/d_leader.png' });
  await p.evaluate(() => document.querySelector('#tabbar .tab[data-tab="awards"]').click()); await p.waitForTimeout(300);
  console.log('awards text has Daily Spark', await p.evaluate(() => document.querySelector('#awardsGrid').textContent.includes('Daily Spark')));
  console.log(errs.join('\n') || 'no errors'); await b.close();
})();
