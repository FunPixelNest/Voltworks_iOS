const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const out = [];
  for (const [name, vp] of [['portrait 412x915', { width: 412, height: 915 }], ['small 360x740', { width: 360, height: 740 }], ['landscape 915x412', { width: 915, height: 412 }]]) {
    const ctx = await b.newContext({ viewport: vp, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const p = await ctx.newPage(); await p.addInitScript(() => { window.__VWnoIntro = true; }); await p.addInitScript(() => { window.__VWnoIntro = true; }); const errs = [];
    p.on('pageerror', e => errs.push(e.message));
    await p.goto('file://' + __dirname + '/voltworks_test.html'); await p.waitForTimeout(400);
    await p.evaluate(() => window.__VWload(1)); await p.waitForTimeout(600);
    const cdp = await ctx.newCDPSession(p);
    const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    async function drag(x0, y0, x1, y1) { await T('touchStart', [[x0, y0]]); for (let i = 1; i <= 14; i++) { await T('touchMove', [[x0 + (x1 - x0) * i / 14, y0 + (y1 - y0) * i / 14]]); await p.waitForTimeout(16); } await p.waitForTimeout(60); await T('touchEnd', []); await p.waitForTimeout(200); }
    const geo = async () => p.evaluate(() => { const r = document.querySelector('#board').getBoundingClientRect(); const L = window.__VWL; return { x: r.x, y: r.y, w: r.width, h: r.height, s: L.s, ox: L.ox, oy: L.oy }; });
    let g = await geo();
    const cell0 = g.s;
    const sol = await p.evaluate(() => LEVELS[1].sol);
    for (const [t, x, y] of sol) {
      g = await geo(); const off = Math.max(46, g.s * 0.75);
      const cb = await p.locator(`.card[data-t=${t}]`).boundingBox();
      const sp = await p.evaluate(([x, y]) => window.__VWscreen(x + .5, y + .5), [x, y]);
      await drag(cb.x + cb.width / 2, cb.y + cb.height / 2, sp.x, sp.y + off);
    }
    const placed = await p.evaluate(() => window.__VW.placed.map(q => q.t + '@' + q.x + ',' + q.y).join(' '));
    // pinch zoom out->in on an empty area
    g = await geo(); const r0 = await p.evaluate(() => { const L = window.__VWL, B = document.querySelector('#board').getBoundingClientRect(); const s = window.__VW.sim; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const q = window.__VWscreen(x + .5, y + .5); if (!s.at(x, y) && !s.wire[s.idx(x, y)] && q.y > B.y + 60 && q.y < B.y + B.height * 0.6 && q.x > 80 && q.x < innerWidth - 80) return q; } return window.__VWscreen(4, 0.5); }); const cx = r0.x, cy = r0.y;
    await T('touchStart', [[cx - 40, cy], [cx + 40, cy]]);
    for (let i = 1; i <= 10; i++) { await T('touchMove', [[cx - 40 - i * 8, cy], [cx + 40 + i * 8, cy]]); await p.waitForTimeout(16); }
    await T('touchEnd', []); await p.waitForTimeout(200);
    const z1 = await p.evaluate(() => window.__VWV.z.toFixed(2));
    // one-finger pan on an empty square
    g = await geo();
    const before = g.ox;
    const e0 = r0; // an empty square on screen
    await drag(e0.x, Math.max(10, e0.y), e0.x + 60, Math.max(10, e0.y));
    const after = (await geo()).ox;
    const fitVisible = await p.isVisible('#fitBtn');
    await p.evaluate(() => document.querySelector('#fitBtn').click()); await p.waitForTimeout(150);   // tilted board confuses Playwright's tap hit-test; the button itself is on top (checked with elementFromPoint)
    const z2 = await p.evaluate(() => window.__VWV.z.toFixed(2));
    // power on and check win
    await p.evaluate(() => window.__VWpower()); for (let k = 0; k < 40 && !(await p.evaluate(() => window.__VW.won)); k++) await p.waitForTimeout(100);
    const won = await p.evaluate(() => window.__VW.won);
    await p.evaluate(() => { document.querySelector('#win').hidden = true; });
    await p.screenshot({ path: `shots/z_${name.split(' ')[0]}.png` });
    out.push(`${name}: cell ${cell0.toFixed(0)}px | level 2: ${placed} won=${won} | pinch zoom ${z1}x | pan moved ${Math.round(after - before)}px | fit button ${fitVisible} -> zoom ${z2} | ${errs.join(';') || 'no errors'}`);
    await ctx.close();
  }
  console.log(out.join('\n')); await b.close();
})();
