// Usage: in game-src run `python3 -m http.server 8765`, then `node tests/make_icon.js`.
// App icon: a mini game board - grid, neon blue/orange wires and small working machines.
const { chromium } = require('playwright'); const fs = require('fs');
(async () => { const b = await chromium.launch(); const p = await b.newPage();
 await p.goto('http://localhost:8765/voltworks.html'); await p.waitForTimeout(1500);
 const url = await p.evaluate(() => {
  const N = 1024, cv = document.createElement('canvas'); cv.width = cv.height = N; const c = cv.getContext('2d'), TAU = Math.PI * 2;
  const n = 7, S = N / n, P = (x, y) => [(x + 0.5) * S, (y + 0.5) * S];
  c.fillStyle = '#03070e'; c.fillRect(0, 0, N, N);
  let g = c.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N * 0.72); g.addColorStop(0, '#132a52'); g.addColorStop(0.65, '#0a1630'); g.addColorStop(1, '#03070e'); c.fillStyle = g; c.fillRect(0, 0, N, N);
  // atmosphere: blue haze on the blue side, orange haze on the orange side
  for (const [x, y, r, col, a] of [[0.15, 0.35, 0.55, '40,140,255', .22], [0.2, 0.75, 0.45, '40,140,255', .16], [0.8, 0.3, 0.5, '255,140,30', .2], [0.75, 0.8, 0.45, '255,140,30', .2]]) {
    const hg = c.createRadialGradient(x * N, y * N, 0, x * N, y * N, r * N); hg.addColorStop(0, 'rgba(' + col + ',' + a + ')'); hg.addColorStop(1, 'rgba(' + col + ',0)'); c.fillStyle = hg; c.fillRect(0, 0, N, N); }
  // blueprint grid like the reference: fine square cells, slightly brighter every few lines
  const g2 = N / 14; c.lineWidth = 1.5;
  for (let k = 0; k <= 14; k++) { c.strokeStyle = k % 2 ? 'rgba(110,160,230,.10)' : 'rgba(120,175,240,.18)'; c.beginPath(); c.moveTo(k * g2, 0); c.lineTo(k * g2, N); c.stroke(); c.beginPath(); c.moveTo(0, k * g2); c.lineTo(N, k * g2); c.stroke(); }
  const BLUE = ['40,150,255', '110,205,255', '225,248,255'], ORANGE = ['255,135,25', '255,185,70', '255,240,200'];
  const wire = (cells, [glow, core, hot]) => {
    const pts = cells.map(q => P(q[0], q[1]));
    const path = () => { c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); };
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    path(); c.strokeStyle = 'rgba(' + glow + ',.08)'; c.lineWidth = 46; c.stroke();
    path(); c.strokeStyle = 'rgba(' + glow + ',.32)'; c.lineWidth = 18; c.stroke();
    path(); c.strokeStyle = 'rgba(' + core + ',1)'; c.lineWidth = 8; c.stroke();
    path(); c.strokeStyle = 'rgba(' + hot + ',1)'; c.lineWidth = 3.5; c.stroke();
    c.setLineDash([12, 70]); path(); c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 6; c.stroke(); c.setLineDash([]);
    for (let i = 1; i < pts.length; i++) {   // crackle along each run
      const a = pts[i - 1], bq = pts[i], len = Math.hypot(bq[0] - a[0], bq[1] - a[1]); if (len < 60) continue;
      const nx = -(bq[1] - a[1]) / len, ny = (bq[0] - a[0]) / len;
      const cnt = Math.round(len / 11);
      for (let t2 = 0; t2 < cnt; t2++) {
        const sd = Math.random() < 0.5 ? -1 : 1, f0 = Math.random() * 0.85, f1 = Math.min(1, f0 + 0.08 + Math.random() * 0.25), amp = 6 + Math.random() * 34, K = 8;
        c.beginPath(); let lx = 0, ly = 0;
        for (let s2 = 0; s2 <= K; s2++) { const f = f0 + (f1 - f0) * s2 / K, o = sd * amp * Math.sin(s2 / K * Math.PI) * (0.5 + Math.random() * 0.8); lx = a[0] + (bq[0] - a[0]) * f + nx * o; ly = a[1] + (bq[1] - a[1]) * f + ny * o; s2 ? c.lineTo(lx, ly) : c.moveTo(lx, ly); }
        c.strokeStyle = 'rgba(' + core + ',' + (0.35 + Math.random() * 0.45) + ')'; c.lineWidth = 0.8 + Math.random() * 1.4; c.stroke();
        if (Math.random() < 0.35) { c.beginPath(); c.moveTo(lx, ly); c.lineTo(lx + (Math.random() - 0.5) * 40, ly + (Math.random() - 0.5) * 40); c.strokeStyle = 'rgba(' + hot + ',.5)'; c.lineWidth = 1; c.stroke(); }
      }
    }
    c.restore();
    for (let i = 1; i < cells.length - 1; i++) { const [x, y] = pts[i]; c.beginPath(); c.arc(x, y, 12, 0, TAU); c.fillStyle = '#0d1422'; c.fill(); c.beginPath(); c.arc(x, y, 7, 0, TAU); c.fillStyle = '#fff'; c.fill(); }
  };
  // circuit: power -> fan (blue); fan blows on generator; generator -> target and -> bulb (orange)
  wire([[-0.6, 1], [1, 1], [1, 4]], BLUE);
  wire([[3, 4], [3, 2], [5, 2], [5, 1]], ORANGE);
  wire([[3, 4], [3, 5.5], [5, 5.5], [6.6, 5.5]], ORANGE);
  // wind between fan and generator
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  const [fx, fy] = P(1, 4), [gx] = P(3, 4);
  for (let l = 0; l < 4; l++) { const off = (l - 1.5) * 16; const gr = c.createLinearGradient(fx + 50, 0, gx - 50, 0); gr.addColorStop(0, 'rgba(220,242,255,0)'); gr.addColorStop(0.5, 'rgba(220,242,255,.7)'); gr.addColorStop(1, 'rgba(220,242,255,0)');
    c.strokeStyle = gr; c.lineWidth = 5; c.beginPath(); for (let s = 0; s <= 20; s++) { const x = fx + 50 + (gx - fx - 100) * s / 20, y = fy + off + Math.sin(s * 0.7 + l) * 9; s ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  c.restore();
  // swirling energy ribbons around the live circuit (as in gameplay)
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  const rib = [[1, 2.5, BLUE], [1, 1, BLUE], [3, 3, ORANGE], [4, 2, ORANGE], [3, 5, ORANGE], [4.5, 5.5, ORANGE], [2, 4, BLUE]];
  for (const [x, y, col] of rib) for (let k = 0; k < 9; k++) {
    const [px, py] = P(x, y), r = S * (0.5 + Math.random() * 0.8), a0 = Math.random() * TAU;
    c.strokeStyle = 'rgba(' + col[1] + ',' + (0.2 + Math.random() * 0.25) + ')'; c.lineWidth = 0.8 + Math.random() * 1.8;
    c.beginPath(); c.ellipse(px, py, r, r * (0.4 + Math.random() * 0.4), Math.random() * TAU, a0, a0 + 1 + Math.random() * 1.8); c.stroke();
  }
  // glowing sparks drifting off the wires
  for (let k = 0; k < 220; k++) { const w = rib[k % rib.length], [px, py] = P(w[0], w[1]); const x = px + (Math.random() - 0.5) * S * 1.6, y = py + (Math.random() - 0.5) * S * 1.6;
    c.fillStyle = 'rgba(' + w[2][2] + ',' + (0.4 + Math.random() * 0.5) + ')'; c.beginPath(); c.arc(x, y, 0.8 + Math.random() * 2.2, 0, TAU); c.fill(); }
  c.restore();
  // machines, each with its glow
  const M = [['power', 1, 1, '#3fb8ff', { on: true }], ['fan', 1, 4, '#3fb8ff', { powered: true }], ['generator', 3, 4, '#ffa030', { src: true }],
             ['target', 5, 1, '#46c8ff', { powered: true }], ['bulb', 5, 5.5, '#ff9420', { powered: true, warm: '255,140,30', burstSize: 0.5 }]];
  for (const [t, x, y, col, st] of M) { const [px, py] = P(x, y); glowAt(c, px, py, S * 0.95, col, t === 'bulb' ? 0.2 : 0.3); }
  for (const [t, x, y, col] of M) { const [px, py] = P(x, y); c.save(); c.translate(px, py + 10); c.scale(S * 1.45, S * 1.45);
    energyAura(c, x * 17 + y * 5, 1.3, col === '#ff9420' || col === '#ffa030' ? '255,150,40' : '63,184,255', 1.3); c.restore(); }
  // bulb light rays
  { const [bx, by] = P(5, 5.5); c.save(); c.globalCompositeOperation = 'lighter'; for (const [dx, dy] of [[0, -1], [-1, 0]]) { const gr = c.createLinearGradient(bx, by, bx + dx * S * 1.6, by + dy * S * 1.6); gr.addColorStop(0, 'rgba(255,170,70,.85)'); gr.addColorStop(1, 'rgba(255,140,40,0)'); c.strokeStyle = gr; c.lineWidth = 6; c.beginPath(); c.moveTo(bx, by - 20); c.lineTo(bx + dx * S * 1.6, by - 20 + dy * S * 1.6); c.stroke(); } c.restore(); }
  for (const [t, x, y, col, st] of M) { const [px, py] = P(x, y); c.save(); c.translate(px, py + 8); c.scale(S * 1.45, S * 1.45); plinth(c, Object.assign({ t, id: 1 }, st), 1); c.translate(0, -0.08); paintObj(c, Object.assign({ t, d: 0, id: x * 10 + y }, st), 1); c.restore(); }
  // bloom: isolate the brightest pixels (self-multiply), blur them and add them back
  const bt = document.createElement('canvas'); bt.width = bt.height = N; const bc = bt.getContext('2d');
  bc.drawImage(cv, 0, 0); bc.globalCompositeOperation = 'multiply'; bc.drawImage(bt, 0, 0); bc.drawImage(bt, 0, 0);
  c.save(); c.globalCompositeOperation = 'lighter';
  c.filter = 'blur(10px)'; c.globalAlpha = 0.5; c.drawImage(bt, 0, 0);
  c.filter = 'blur(32px)'; c.globalAlpha = 0.5; c.drawImage(bt, 0, 0);
  c.filter = 'blur(80px)'; c.globalAlpha = 0.4; c.drawImage(bt, 0, 0);
  c.restore(); c.filter = 'none';
  // soft vignette
  g = c.createRadialGradient(N / 2, N / 2, N * 0.42, N / 2, N / 2, N * 0.75); g.addColorStop(0, 'rgba(3,7,14,0)'); g.addColorStop(1, 'rgba(3,7,14,.55)'); c.fillStyle = g; c.fillRect(0, 0, N, N);
  return cv.toDataURL('image/png');
 });
 fs.writeFileSync(process.argv[2] || require('path').resolve(__dirname, '../art/app_icon.png'), Buffer.from(url.split(',')[1], 'base64')); await b.close(); })();
