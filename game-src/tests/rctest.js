const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 412, height: 915 } }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.addInitScript(() => localStorage.setItem('cf.remote', JSON.stringify({ ads_banner_enabled: 'false', ads_rewarded_enabled: 'false' })));
  await p.goto('file:///home/claude/eb/voltworks_test.html'); await p.waitForTimeout(600);
  await p.evaluate(() => window.__VWload(20)); await p.waitForTimeout(300);
  console.log('banner with remote off:', await p.evaluate(() => document.body.classList.contains('ads')), 'rewarded:', await p.evaluate(() => MONEY.rewardedOn()));
  console.log(errs.join('\n') || 'no errors'); await b.close(); })();
