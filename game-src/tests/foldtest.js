// For every level and several small / folded-phone screens: every tray part must be fully visible,
// or reachable by swiping with the "more parts" arrow showing. The board must keep a usable height.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const errs = []; let bad = 0;
  const sizes = [[344, 882, 'Z Fold cover'], [344, 700, 'Z Fold cover, bars shown'], [320, 640, 'small phone'], [360, 740, 'phone'], [412, 915, 'phone'], [748, 840, 'Z Fold open'], [882, 344, 'Z Fold cover sideways'], [1024, 768, 'tablet']];
  for (const [w, h, name] of sizes) {
    const p = await b.newPage({ viewport: { width: w, height: h } }); p.on('pageerror', e => errs.push(e.message));
    await p.addInitScript(() => { window.__VWnoIntro = true; });
    await p.goto('file://' + require('path').resolve(__dirname, '..') + '/voltworks_test.html'); await p.waitForTimeout(300);
    const n = await p.evaluate(() => LEVELS.length); const probs = [];
    for (let i = 0; i < n; i++) {
      await p.evaluate(i => window.__VWload(i), i); await p.waitForTimeout(450);
      const r = await p.evaluate(() => {
        const box = document.querySelector('#inv').getBoundingClientRect(), vh = innerHeight, vw = innerWidth;
        const cards = [...document.querySelectorAll('#inv .card')].map(c => c.getBoundingClientRect());
        const hidden = cards.filter(c => c.bottom > Math.min(vh, box.bottom) + 1 || c.right > Math.min(vw, box.right) + 1 || c.top < box.top - 1);
        const hint = !document.querySelector('#trayHint').hidden;
        const st = document.querySelector('#stage').getBoundingClientRect();
        const dock = document.querySelector('#dock').getBoundingClientRect();
        return { hidden: hidden.length, total: cards.length, hint, stageH: Math.round(st.height), dockOff: dock.bottom > vh + 1 };
      });
      if ((r.hidden && !r.hint) || r.dockOff || r.stageH < 120) probs.push('L' + (i + 1) + JSON.stringify(r));
    }
    console.log(name.padEnd(26), w + 'x' + h, probs.length ? 'PROBLEMS ' + probs.slice(0, 4).join(' ') : 'all ' + n + ' levels OK'); bad += probs.length;
    await p.close();
  }
  console.log(errs.length ? errs.join('\n') : 'no errors', bad ? '' : '| ALL SIZES OK'); await b.close();
})();
