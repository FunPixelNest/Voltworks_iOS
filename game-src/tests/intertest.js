const { chromium } = require('playwright');
(async () => { const b = await chromium.launch(); const p = await b.newPage(); const errs=[]; p.on('pageerror', e => errs.push(e.message));
  await p.goto('file:///home/claude/eb/voltworks_test.html'); await p.waitForTimeout(500);
  const r = await p.evaluate(async () => { MONEY_CONFIG.interstitialGapSec = 0; const out = [];
    for (const li of [2, 6, 7, 8]) { const t = Date.now(); const pr = MONEY.afterWin(li); await new Promise(r => setTimeout(r, 50)); const shown = !!document.querySelector('.mSheet.on'); out.push(li + 1 + ':' + (shown ? 'AD' : '-'));
      if (shown) { await new Promise(r => setTimeout(r, 3200)); document.querySelector('#mInClose').click(); } await pr; }
    return out.join(' '); });
  console.log('interstitials after wins:', r, errs.join(' ') || 'no errors'); await b.close(); })();
