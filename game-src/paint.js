// ===== VOLTWORKS procedural art (all components drawn in unit space: cell = -0.5..0.5) =====
const TAU = Math.PI * 2;
const COL = { power: '#46e8ff', volt: '#ffd84a', light: '#ffcf5a', laser: '#ff3358', water: '#3fa9ff', steam: '#eaf3ff', fire: '#ff8a2a', music: '#ff6bd6', wifi: '#5dffa8', tp: '#b46bff', copper: '#c27d45', brass: '#ffb547' };

function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }
function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function box(c, x, y, w, h, r, top, bot, edge) {
  const g = c.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, top); g.addColorStop(1, bot);
  rr(c, x, y, w, h, r); c.fillStyle = g; c.fill(); c.lineWidth = 0.022; c.strokeStyle = edge || 'rgba(0,0,0,.6)'; c.stroke();
  rr(c, x + 0.025, y + 0.02, w - 0.05, h * 0.42, Math.max(0.005, r - 0.02)); c.fillStyle = 'rgba(255,255,255,.08)'; c.fill();
}
function steel(c, x, y, w, h, r) { box(c, x, y, w, h, r, '#6b7486', '#22272f', 'rgba(0,0,0,.85)'); }
function dark(c, x, y, w, h, r) { box(c, x, y, w, h, r, '#262b35', '#0c0f15', 'rgba(0,0,0,.85)'); }
function glowAt(c, x, y, r, color, a) {
  c.save(); c.globalCompositeOperation = 'lighter';
  const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, hexA(color, a)); g.addColorStop(1, hexA(color, 0));
  c.fillStyle = g; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); c.restore();
}
function circle(c, x, y, r, fill, stroke, lw) { c.beginPath(); c.arc(x, y, r, 0, TAU); if (fill) { c.fillStyle = fill; c.fill(); } if (stroke) { c.lineWidth = lw || 0.02; c.strokeStyle = stroke; c.stroke(); } }
function label(c, str, x, y, size, color) {
  c.save(); c.translate(x, y); const m = c.getTransform(); if (m.a < 0) c.scale(-1, 1);
  c.scale(0.01, 0.01); c.font = '700 ' + Math.round(size * 100) + 'px "Rajdhani", sans-serif'; c.fillStyle = color; c.textAlign = 'center'; c.fillText(str, 0, 0); c.restore();
}
function led(c, x, y, r, on, color) { circle(c, x, y, r, on ? color : '#20252e', 'rgba(0,0,0,.6)', 0.012); if (on) glowAt(c, x, y, r * 4, color, 0.55); }
function screw(c, x, y) { circle(c, x, y, 0.022, '#9aa8c4', 'rgba(0,0,0,.5)', 0.008); c.beginPath(); c.moveTo(x - 0.014, y - 0.006); c.lineTo(x + 0.014, y + 0.006); c.strokeStyle = 'rgba(0,0,0,.6)'; c.lineWidth = 0.008; c.stroke(); }
function boltPath(c, x, y, s) {
  c.beginPath(); c.moveTo(x + 0.05 * s, y - 0.5 * s); c.lineTo(x - 0.22 * s, y + 0.06 * s); c.lineTo(x - 0.02 * s, y + 0.06 * s);
  c.lineTo(x - 0.08 * s, y + 0.5 * s); c.lineTo(x + 0.22 * s, y - 0.08 * s); c.lineTo(x + 0.02 * s, y - 0.08 * s); c.closePath();
}
function bolt(c, x, y, s, on) { boltPath(c, x, y, s); c.fillStyle = on ? COL.volt : '#5a5230'; c.fill(); c.lineWidth = 0.015; c.strokeStyle = 'rgba(0,0,0,.5)'; c.stroke(); if (on) glowAt(c, x, y, s * 0.9, COL.volt, 0.45); }
function chev(c, x, y, s, color) { c.beginPath(); c.moveTo(x - s * 0.5, y - s); c.lineTo(x + s * 0.5, y); c.lineTo(x - s * 0.5, y + s); c.strokeStyle = color; c.lineWidth = 0.035; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke(); }
function meter(c, x, y, w, frac, color) {
  dark(c, x, y, w, 0.07, 0.02);
  const n = 4;
  for (let i = 0; i < n; i++) { const on = frac * n > i + 0.01; rr(c, x + 0.02 + i * (w - 0.04) / n, y + 0.018, (w - 0.04) / n - 0.012, 0.034, 0.008); c.fillStyle = on ? color : '#252b3d'; c.fill(); }
}
function treads(c, y, T, moving, w) {
  w = w || 0.74;
  dark(c, -w / 2, y, w, 0.14, 0.07);
  const off = moving ? (T * 0.6) % 0.08 : 0;
  c.save(); rr(c, -w / 2, y, w, 0.14, 0.07); c.clip();
  c.strokeStyle = 'rgba(160,175,205,.35)'; c.lineWidth = 0.015;
  for (let x = -w / 2 + off - 0.08; x < w / 2 + 0.08; x += 0.08) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 0.14); c.stroke(); }
  c.restore();
  for (const wx of [-w / 2 + 0.07, 0, w / 2 - 0.07]) circle(c, wx, y + 0.07, 0.045, '#4a5262', 'rgba(0,0,0,.5)', 0.01);
}
function eyes(c, x, y, on, color, T) {
  dark(c, x - 0.15, y - 0.055, 0.3, 0.11, 0.05);
  const blink = (Math.sin(T * 1.7) > 0.97) ? 0.2 : 1;
  for (const ex of [-0.07, 0.07]) {
    c.beginPath(); c.ellipse(x + ex, y, 0.028, 0.028 * blink, 0, 0, TAU); c.fillStyle = on ? color : '#56607a'; c.fill();
    if (on) glowAt(c, x + ex, y, 0.09, color, 0.5);
  }
}
function fanBlades(c, r, ang, color) {
  c.save(); c.rotate(ang);
  for (let i = 0; i < 4; i++) {
    c.rotate(TAU / 4);
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(r * 0.6, -r * 0.45, r, -r * 0.08); c.quadraticCurveTo(r * 0.55, r * 0.1, 0, 0);
    c.fillStyle = color; c.fill();
  }
  c.restore();
  circle(c, 0, 0, r * 0.22, '#8994ad', 'rgba(0,0,0,.5)', 0.012);
}

// Each painter draws an object facing RIGHT (dir 0). The caller rotates/flips.
const PAINT = {
  power(c, o, T) {
    steel(c, -0.42, -0.36, 0.84, 0.78, 0.08);
    dark(c, -0.32, -0.2, 0.42, 0.5, 0.05);
    bolt(c, -0.11, 0.05, 0.42, o.on);
    // lever
    dark(c, 0.16, -0.24, 0.16, 0.54, 0.06);
    const ky = o.on ? -0.12 : 0.18;
    c.beginPath(); c.moveTo(0.24, 0.03); c.lineTo(0.24, ky); c.strokeStyle = '#c5ccd8'; c.lineWidth = 0.04; c.stroke();
    circle(c, 0.24, ky, 0.065, o.on ? '#3dff9a' : '#ff4d5e', 'rgba(0,0,0,.6)', 0.015);
    if (o.on) {
      glowAt(c, 0.24, ky, 0.2, '#3dff9a', 0.5);
      glowAt(c, -0.11, 0.05, 0.42, COL.volt, 0.25 + 0.15 * Math.sin(T * 7));
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,240,170,.85)'; c.lineWidth = 0.012;
      if (Math.random() < 0.5) { c.beginPath(); let x = -0.3, y = -0.18 + Math.random() * 0.46; c.moveTo(x, y); while (x < 0.08) { x += 0.06; c.lineTo(x, -0.18 + Math.random() * 0.46); } c.stroke(); }
      c.restore();
    }
    screw(c, -0.36, -0.3); screw(c, 0.36, -0.3); screw(c, -0.36, 0.36); screw(c, 0.36, 0.36);
    label(c, o.on ? 'ON' : 'OFF', 0.24, 0.37, 0.085, o.on ? '#3dff9a' : '#ff8a95');
  },
  target(c, o, T) {
    const on = o.powered;
    steel(c, -0.4, 0.2, 0.8, 0.2, 0.05);
    circle(c, 0, -0.04, 0.36, '#1a2034', '#7d8aa6', 0.03);
    const pulse = 0.5 + 0.5 * Math.sin(T * 3);
    const g = c.createRadialGradient(0, -0.04, 0, 0, -0.04, 0.27);
    if (on) { g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, COL.power); g.addColorStop(1, '#0b6b8a'); }
    else { g.addColorStop(0, '#6f5aa8'); g.addColorStop(1, '#241a40'); }
    circle(c, 0, -0.04, 0.27, g);
    c.save(); c.translate(0, -0.04);
    for (let i = 0; i < 3; i++) {
      c.rotate((on ? T * 2.2 : T * 0.4) * (i % 2 ? -1 : 1) + i);
      c.beginPath(); c.arc(0, 0, 0.31, 0, 1.4); c.strokeStyle = on ? hexA(COL.power, 0.9) : 'rgba(170,140,255,.45)'; c.lineWidth = 0.025; c.stroke();
    }
    c.restore();
    if (on) glowAt(c, 0, -0.04, 0.75, COL.power, 0.55 + pulse * 0.2);
    else glowAt(c, 0, -0.04, 0.4, '#9b7bff', 0.15 + pulse * 0.12);
    led(c, -0.28, 0.3, 0.03, on, '#3dff9a'); led(c, 0.28, 0.3, 0.03, on, '#3dff9a');
  },
  block(c) {
    box(c, -0.45, -0.45, 0.9, 0.9, 0.06, '#4a505c', '#1a1d24', 'rgba(0,0,0,.9)');
    c.save(); rr(c, -0.45, -0.12, 0.9, 0.24, 0); c.clip();
    c.fillStyle = '#ff9b2f'; c.fillRect(-0.45, -0.12, 0.9, 0.24);
    c.fillStyle = '#1b1b1b';
    for (let x = -0.7; x < 0.6; x += 0.16) { c.beginPath(); c.moveTo(x, 0.12); c.lineTo(x + 0.08, 0.12); c.lineTo(x + 0.2, -0.12); c.lineTo(x + 0.12, -0.12); c.closePath(); c.fill(); }
    c.restore();
    screw(c, -0.37, -0.37); screw(c, 0.37, -0.37); screw(c, -0.37, 0.37); screw(c, 0.37, 0.37);
  },
  fan(c, o, T) {
    const on = o.t === 'chargefan' ? o.emitting : o.powered;
    circle(c, 0, 0, 0.4, '#11151c', '#7d8798', 0.04);
    if (on) {
      const g = c.createRadialGradient(0, 0, 0.05, 0, 0, 0.34); g.addColorStop(0, 'rgba(210,230,255,.35)'); g.addColorStop(1, 'rgba(210,230,255,.08)');
      circle(c, 0, 0, 0.34, g);
      for (let k = 0; k < 4; k++) { c.save(); c.globalAlpha = 0.22 + k * 0.12; fanBlades(c, 0.34, T * 26 - k * 0.09, '#dfeeff'); c.restore(); }
      c.save(); c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 0.012;
      for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0, 0, 0.12 + k * 0.08, T * 9 + k, T * 9 + k + 1.2); c.stroke(); } c.restore();
    } else fanBlades(c, 0.34, 0.3, '#9aa3b5');
    if (on) { c.save(); c.globalAlpha = 0.35; circle(c, 0, 0, 0.33, null, '#dff3ff', 0.02); c.restore(); }
    // front grille
    c.strokeStyle = '#aab6cf'; c.lineWidth = 0.02;
    for (let i = -2; i <= 2; i++) { c.beginPath(); c.moveTo(0.3, i * 0.08); c.lineTo(0.42, i * 0.08); c.stroke(); }
    chev(c, 0.44, 0, 0.07, on ? '#e7fbff' : '#7d8798');
    if (o.t === 'chargefan') meter(c, -0.3, 0.33, 0.6, o.charge / 4, '#3dff9a');
  },
  chargefan(c, o, T) { PAINT.fan(c, o, T); },
  generator(c, o, T) {
    const on = o.driven || o.src;
    steel(c, -0.42, -0.34, 0.84, 0.72, 0.08);
    circle(c, -0.12, 0, 0.25, '#0e1117', '#8a93a6', 0.025);
    c.save(); c.translate(-0.12, 0); c.rotate(on ? T * 14 : 0);
    for (let i = 0; i < 6; i++) { c.rotate(TAU / 6); c.beginPath(); c.moveTo(0.04, 0); c.lineTo(0.21, -0.05); c.lineTo(0.21, 0.04); c.closePath(); c.fillStyle = '#b8c3db'; c.fill(); }
    c.restore();
    if (on) { c.save(); c.globalAlpha = 0.35; circle(c, -0.12, 0, 0.21, 'rgba(220,235,255,.5)'); c.restore(); }
    circle(c, -0.12, 0, 0.05, '#e0e6f2');
    for (let i = 0; i < 5; i++) { rr(c, 0.18, -0.2 + i * 0.085, 0.17, 0.06, 0.02); c.fillStyle = i % 2 ? '#b8743d' : '#d68b4e'; c.fill(); }
    bolt(c, 0.27, 0.27, 0.13, o.src);
    if (o.src) {
      const pulse = 0.5 + 0.5 * Math.sin(T * 18);
      for (let i = 0; i < 5; i++) { rr(c, 0.18, -0.2 + i * 0.085, 0.17, 0.06, 0.02); c.fillStyle = 'rgba(120,230,255,' + (0.25 + 0.35 * pulse * ((i + Math.floor(T * 12)) % 2)) + ')'; c.fill(); }
      glowAt(c, 0.26, -0.03, 0.42, COL.power, 0.4 + 0.2 * pulse);
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(220,250,255,.9)'; c.lineWidth = 0.012;
      for (let k = 0; k < 2; k++) { c.beginPath(); let y = -0.22; c.moveTo(0.18 + Math.random() * 0.17, y); while (y < 0.2) { y += 0.06; c.lineTo(0.18 + Math.random() * 0.17, y); } c.stroke(); }
      c.restore();
    }
  },
  bulb(c, o, T) {
    const on = o.powered;
    dark(c, -0.16, 0.16, 0.32, 0.12, 0.03);
    for (let i = 0; i < 3; i++) { rr(c, -0.14, 0.17 + i * 0.04, 0.28, 0.025, 0.01); c.fillStyle = '#8b96ad'; c.fill(); }
    steel(c, -0.22, 0.3, 0.44, 0.12, 0.03);
    const g = c.createRadialGradient(0, -0.1, 0.02, 0, -0.08, 0.3);
    if (on) { g.addColorStop(0, '#fffbe6'); g.addColorStop(0.5, '#ffe58a'); g.addColorStop(1, 'rgba(255,190,60,.85)'); }
    else { g.addColorStop(0, 'rgba(220,235,255,.35)'); g.addColorStop(1, 'rgba(120,140,180,.25)'); }
    c.beginPath(); c.arc(0, -0.1, 0.25, Math.PI * 0.78, Math.PI * 2.22); c.lineTo(0.1, 0.16); c.lineTo(-0.1, 0.16); c.closePath();
    c.fillStyle = g; c.fill(); c.strokeStyle = on ? '#fff3c2' : 'rgba(200,215,240,.6)'; c.lineWidth = 0.02; c.stroke();
    c.beginPath(); c.moveTo(-0.05, 0.14); c.lineTo(-0.05, -0.06); c.lineTo(-0.02, -0.12); c.lineTo(0.02, -0.06); c.lineTo(0.05, -0.12); c.lineTo(0.05, 0.14);
    c.strokeStyle = on ? '#fff' : '#9a8f6a'; c.lineWidth = 0.015; c.stroke();
    c.beginPath(); c.arc(-0.09, -0.18, 0.08, Math.PI, Math.PI * 1.5); c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 0.02; c.stroke();
    if (on) glowAt(c, 0, -0.1, 0.6, COL.light, 0.35 + 0.05 * Math.sin(T * 9));
  },
  solar(c, o, T) {
    const on = o.lit;
    steel(c, -0.06, 0.18, 0.12, 0.2, 0.02);
    steel(c, -0.3, 0.32, 0.6, 0.1, 0.03);
    box(c, -0.44, -0.36, 0.88, 0.56, 0.04, '#cfd6e4', '#7a859c');
    const x0 = -0.4, y0 = -0.32, cw = 0.8 / 4, ch = 0.48 / 3;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const gx = x0 + i * cw + 0.008, gy = y0 + j * ch + 0.008;
      const g = c.createLinearGradient(gx, gy, gx + cw, gy + ch); g.addColorStop(0, on ? '#4fb6ff' : '#22407a'); g.addColorStop(1, on ? '#1d5fd6' : '#13244a');
      c.fillStyle = g; c.fillRect(gx, gy, cw - 0.016, ch - 0.016);
    }
    c.save(); rr(c, -0.4, -0.32, 0.8, 0.48, 0.02); c.clip();
    const sx = on ? ((T * 0.8) % 1.6) - 0.8 : -0.2;
    const g2 = c.createLinearGradient(sx - 0.2, 0, sx + 0.2, 0); g2.addColorStop(0, 'rgba(255,255,255,0)'); g2.addColorStop(0.5, on ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.12)'); g2.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g2; c.beginPath(); c.moveTo(sx - 0.1, -0.35); c.lineTo(sx + 0.1, -0.35); c.lineTo(sx - 0.1, 0.2); c.lineTo(sx - 0.3, 0.2); c.closePath(); c.fill();
    c.restore();
    led(c, 0.34, 0.37, 0.03, o.src, '#3dff9a');
    if (on) glowAt(c, 0, -0.08, 0.55, '#7cc8ff', 0.3);
  },
  kettle(c, o, T, flip) {
    const on = o.powered;
    // handle (back)
    c.beginPath(); c.moveTo(-0.28, -0.16); c.bezierCurveTo(-0.5, -0.16, -0.5, 0.18, -0.3, 0.16); c.strokeStyle = '#2a3249'; c.lineWidth = 0.07; c.stroke();
    c.strokeStyle = '#4a5262'; c.lineWidth = 0.035; c.stroke();
    // spout
    c.beginPath(); c.moveTo(0.18, 0.12); c.lineTo(0.44, -0.12); c.lineTo(0.46, -0.06); c.lineTo(0.24, 0.24); c.closePath();
    c.fillStyle = '#9fb0c9'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.018; c.stroke();
    // body
    c.beginPath(); c.moveTo(-0.22, -0.2); c.lineTo(0.22, -0.2); c.quadraticCurveTo(0.34, 0.36, 0.26, 0.38); c.lineTo(-0.26, 0.38); c.quadraticCurveTo(-0.34, 0.36, -0.22, -0.2); c.closePath();
    const g = c.createLinearGradient(-0.3, 0, 0.3, 0); g.addColorStop(0, '#8c2433'); g.addColorStop(0.45, '#e04a55'); g.addColorStop(1, '#7a1c2a');
    c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.02; c.stroke();
    c.beginPath(); c.moveTo(-0.1, -0.12); c.quadraticCurveTo(-0.16, 0.12, -0.12, 0.3); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.03; c.stroke();
    // lid
    const lid = o.boil ? Math.abs(Math.sin(T * 31)) * -0.035 : 0; c.save(); c.translate(0, lid); c.rotate(o.boil ? Math.sin(T * 23) * 0.06 : 0);
    c.beginPath(); c.ellipse(0, -0.21, 0.24, 0.06, 0, 0, TAU); c.fillStyle = '#c9d2e3'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.015; c.stroke();
    circle(c, 0, -0.29, 0.05, '#2b3248', 'rgba(0,0,0,.5)', 0.012); c.restore();
    if (o.boil) glowAt(c, 0, 0.3, 0.35, COL.fire, 0.25);
    steel(c, -0.3, 0.34, 0.6, 0.08, 0.03);
    led(c, flip ? 0.16 : -0.16, 0.14, 0.03, on, COL.water);
  },
  heater(c, o, T) {
    const on = o.powered;
    steel(c, -0.44, -0.08, 0.88, 0.48, 0.06);
    dark(c, -0.36, 0.0, 0.72, 0.3, 0.04);
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      for (let x = -0.32; x <= 0.32; x += 0.02) { const y = 0.05 + i * 0.09 + Math.sin(x * 40) * 0.015; if (x === -0.32) c.moveTo(x, y); else c.lineTo(x, y); }
      c.strokeStyle = on ? (i === 1 ? '#ffd27a' : '#ff6a2a') : '#5a3a30'; c.lineWidth = 0.03; c.stroke();
    }
    if (on) glowAt(c, 0, 0.15, 0.5, COL.fire, 0.4);
    // burner top
    steel(c, -0.38, -0.16, 0.76, 0.09, 0.03);
    if (o.fire) {
      for (let i = 0; i < 5; i++) {
        const fx = -0.28 + i * 0.14, ph = T * 9 + i * 1.7, hgt = 0.2 + 0.07 * Math.sin(ph);
        c.beginPath(); c.moveTo(fx - 0.06, -0.15); c.quadraticCurveTo(fx - 0.05, -0.15 - hgt * 0.6, fx + 0.01 * Math.sin(ph * 1.3), -0.15 - hgt);
        c.quadraticCurveTo(fx + 0.05, -0.15 - hgt * 0.6, fx + 0.06, -0.15); c.closePath();
        const g = c.createLinearGradient(0, -0.15, 0, -0.15 - hgt); g.addColorStop(0, '#fff2b0'); g.addColorStop(0.4, '#ffb03a'); g.addColorStop(1, 'rgba(255,60,20,0)');
        c.fillStyle = g; c.fill();
      }
      glowAt(c, 0, -0.25, 0.45, COL.fire, 0.45);
    }
  },
  steamdet(c, o, T) {
    const on = o.steamed || o.src;
    // intake funnel bottom
    c.beginPath(); c.moveTo(-0.26, 0.44); c.lineTo(0.26, 0.44); c.lineTo(0.12, 0.24); c.lineTo(-0.12, 0.24); c.closePath();
    c.fillStyle = '#7d8798'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.018; c.stroke();
    box(c, -0.32, -0.38, 0.64, 0.64, 0.12, '#6fd3c0', '#1f6b62');
    circle(c, 0, -0.07, 0.2, '#e9f1ee', '#173f3a', 0.03);
    for (let i = 0; i <= 6; i++) { const a = Math.PI * 0.8 + i * (Math.PI * 1.4 / 6); c.beginPath(); c.moveTo(Math.cos(a) * 0.15, -0.07 + Math.sin(a) * 0.15); c.lineTo(Math.cos(a) * 0.18, -0.07 + Math.sin(a) * 0.18); c.strokeStyle = '#173f3a'; c.lineWidth = 0.015; c.stroke(); }
    const na = on ? Math.PI * 1.9 + Math.sin(T * 12) * 0.08 : Math.PI * 0.85;
    c.beginPath(); c.moveTo(0, -0.07); c.lineTo(Math.cos(na) * 0.16, -0.07 + Math.sin(na) * 0.16); c.strokeStyle = '#d6263a'; c.lineWidth = 0.022; c.stroke();
    circle(c, 0, -0.07, 0.025, '#173f3a');
    led(c, 0, 0.18, 0.03, o.src, '#3dff9a');
    if (on) glowAt(c, 0, 0, 0.5, '#9ffff0', 0.25);
  },
  pushbot(c, o, T) {
    const on = o.latched;
    treads(c, 0.24, T, on);
    box(c, -0.32, -0.26, 0.6, 0.5, 0.1, '#ffb547', '#b8641c');
    eyes(c, -0.02, -0.06, on, '#7fffe0', T);
    // plow
    c.beginPath(); c.moveTo(0.3, -0.24); c.lineTo(0.44, -0.3); c.lineTo(0.44, 0.38); c.lineTo(0.3, 0.32); c.closePath();
    c.fillStyle = '#c6cfdf'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.02; c.stroke();
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(0.33, -0.15 + i * 0.17); c.lineTo(0.42, -0.17 + i * 0.17); c.strokeStyle = '#7d879c'; c.lineWidth = 0.015; c.stroke(); }
    label(c, 'PUSH', -0.02, 0.17, 0.1, '#4a2508');
  },
  pullbot(c, o, T) {
    const on = o.latched;
    treads(c, 0.24, T, on);
    box(c, -0.36, -0.26, 0.56, 0.5, 0.1, '#53e0a1', '#1b7a52');
    eyes(c, -0.08, -0.06, on, '#ffffff', T);
    // claw arm
    const ext = o.mode === 'pull' ? 0.05 : 0;
    steel(c, 0.18, -0.06, 0.16 + ext, 0.1, 0.03);
    c.strokeStyle = '#c6cfdf'; c.lineWidth = 0.045; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0.34 + ext, -0.01); c.quadraticCurveTo(0.46, -0.14, 0.38, -0.2); c.stroke();
    c.beginPath(); c.moveTo(0.34 + ext, -0.01); c.quadraticCurveTo(0.46, 0.12, 0.38, 0.18); c.stroke();
    label(c, 'PULL', -0.08, 0.17, 0.1, '#063a24');
  },
  carrierbot(c, o, T) {
    const on = o.latched;
    treads(c, 0.26, T, on, 0.84);
    box(c, -0.36, -0.08, 0.72, 0.36, 0.08, '#6aa8ff', '#2a4fa8');
    steel(c, -0.44, -0.2, 0.88, 0.1, 0.03);
    eyes(c, 0.12, 0.08, on, '#fff3a8', T);
    for (let i = 0; i < 3; i++) chev(c, -0.25 + i * 0.08, 0.1, 0.035, on ? '#fff3a8' : 'rgba(255,255,255,.35)');
  },
  helibot(c, o, T) {
    const on = o.latched;
    // rotor
    steel(c, -0.03, -0.38, 0.06, 0.12, 0.02);
    c.save(); c.translate(0, -0.38); c.scale(1, 0.18);
    const a = on ? T * 30 : 0.4;
    for (let i = 0; i < 2; i++) { c.save(); c.rotate(a + i * Math.PI); rr(c, 0, -0.04, 0.44, 0.08, 0.04); c.fillStyle = on ? 'rgba(200,215,240,.55)' : '#9aa6c0'; c.fill(); c.restore(); }
    c.restore();
    if (on) { c.save(); c.globalAlpha = 0.25; c.beginPath(); c.ellipse(0, -0.38, 0.44, 0.07, 0, 0, TAU); c.fillStyle = '#dbe6ff'; c.fill(); c.restore(); }
    box(c, -0.28, -0.28, 0.56, 0.44, 0.18, '#ff7a8a', '#a8283c');
    eyes(c, 0, -0.08, on, '#ffffff', T);
    // claw below
    c.strokeStyle = '#c6cfdf'; c.lineWidth = 0.04; c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0.16); c.lineTo(0, 0.28); c.stroke();
    const open = o.mode === 'pull' ? 0.06 : 0.12;
    c.beginPath(); c.moveTo(0, 0.28); c.quadraticCurveTo(-open - 0.08, 0.32, -open, 0.44); c.stroke();
    c.beginPath(); c.moveTo(0, 0.28); c.quadraticCurveTo(open + 0.08, 0.32, open, 0.44); c.stroke();
  },
  soundbot(c, o, T) {
    const on = o.latched;
    box(c, -0.34, -0.36, 0.68, 0.6, 0.14, '#c58bff', '#6a2fb0');
    const pulse = on ? 0.02 * Math.sin(T * 20) : 0;
    circle(c, 0, -0.06, 0.2 + pulse, '#24163a', '#e6d2ff', 0.025);
    circle(c, 0, -0.06, 0.09 + pulse, '#3a2560', '#e6d2ff', 0.02);
    circle(c, 0, -0.06, 0.035, on ? COL.music : '#7a5aa0');
    if (on) glowAt(c, 0, -0.06, 0.45, COL.music, 0.35);
    // push plate below
    steel(c, -0.3, 0.26, 0.6, 0.12, 0.03);
    chev(c, 0, 0.32, 0.04, '#33405e');
    c.save(); c.translate(0, 0.32); c.rotate(Math.PI / 2); chev(c, 0, 0, 0.04, on ? '#fff' : '#33405e'); c.restore();
  },
  spybot(c, o, T) {
    const on = o.powered;
    treads(c, 0.24, T, false, 0.66);
    box(c, -0.3, -0.24, 0.6, 0.48, 0.12, '#3a4058', '#161a28');
    // visor
    rr(c, -0.24, -0.12, 0.48, 0.12, 0.06); c.fillStyle = '#0b0e18'; c.fill();
    const sx = on ? Math.sin(T * 5) * 0.16 : 0;
    rr(c, sx - 0.06, -0.1, 0.12, 0.08, 0.04); c.fillStyle = on ? '#ff3b5c' : '#5a2030'; c.fill();
    if (on) glowAt(c, sx, -0.06, 0.15, '#ff3b5c', 0.6);
    // antenna + hat brim
    c.beginPath(); c.moveTo(0.14, -0.24); c.lineTo(0.22, -0.42); c.strokeStyle = '#c5ccd8'; c.lineWidth = 0.02; c.stroke();
    led(c, 0.22, -0.42, 0.03, on, '#ff3b5c');
    label(c, 'SPY', 0, 0.16, 0.09, '#9aa3b5');
    if (on) { c.save(); c.globalAlpha = 0.18 + 0.1 * Math.sin(T * 6); c.strokeStyle = '#ff3b5c'; c.lineWidth = 0.015; c.setLineDash([0.04, 0.04]); rr(c, -1.45, -1.45, 2.9, 2.9, 0.1); c.stroke(); c.restore(); }
  },
  laser(c, o, T) {
    const on = o.powered;
    steel(c, -0.42, -0.22, 0.2, 0.44, 0.05);
    box(c, -0.3, -0.15, 0.6, 0.3, 0.12, '#dfe5f0', '#6d7891');
    for (let i = 0; i < 3; i++) { rr(c, -0.18 + i * 0.1, -0.16, 0.04, 0.32, 0.01); c.fillStyle = '#4b5672'; c.fill(); }
    steel(c, 0.28, -0.1, 0.14, 0.2, 0.04);
    circle(c, 0.42, 0, 0.06, on ? '#ff5c78' : '#5a1a28', 'rgba(0,0,0,.6)', 0.015);
    if (on) glowAt(c, 0.42, 0, 0.3, COL.laser, 0.8);
    led(c, -0.32, 0.14, 0.025, on, '#ff3358');
  },
  feeder(c, o, T) {
    const on = o.lasered || o.src;
    steel(c, -0.3, -0.38, 0.6, 0.76, 0.08);
    for (const sx of [-1, 1]) {
      dark(c, sx > 0 ? 0.28 : -0.44, -0.12, 0.16, 0.24, 0.05);
      circle(c, sx * 0.4, 0, 0.07, on ? '#ff7a90' : '#b0182f', 'rgba(0,0,0,.6)', 0.015);
      circle(c, sx * 0.4, 0, 0.03, on ? '#fff' : '#ff3a55');
    }
    circle(c, 0, -0.04, 0.14, '#0e1117', '#8a93a6', 0.02);
    circle(c, 0, -0.04, 0.08, on ? COL.laser : '#3a1a24');
    if (on) glowAt(c, 0, -0.04, 0.4, COL.laser, 0.5);
    bolt(c, 0, 0.26, 0.12, o.src);
  },
  mirror(c, o, T) {
    // a clear diagonal mirror: d0 = "/" , d1 = "\"  (matches how the engine bounces the laser)
    c.save(); c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(0.03, 0.36, 0.3, 0.07, 0, 0, TAU); c.fill(); c.restore();
    // round pivot base
    let g = c.createRadialGradient(-0.05, -0.05, 0.02, 0, 0, 0.2); g.addColorStop(0, '#8b97ad'); g.addColorStop(1, '#262d3b');
    circle(c, 0, 0, 0.19, g, '#0b0f17', 0.02);
    circle(c, 0, 0, 0.12, '#141a25', 'rgba(120,200,255,.6)', 0.012);
    c.save(); if (o.d === 1) c.scale(-1, 1); c.rotate(-Math.PI / 4);
    // steel frame
    rr(c, -0.56, -0.1, 1.12, 0.2, 0.05); g = c.createLinearGradient(0, -0.1, 0, 0.1); g.addColorStop(0, '#c9d3e2'); g.addColorStop(0.5, '#5c677c'); g.addColorStop(1, '#232a37');
    c.fillStyle = g; c.fill(); c.lineWidth = 0.015; c.strokeStyle = '#0b0f17'; c.stroke();
    // glass face with a moving glint
    rr(c, -0.5, -0.06, 1.0, 0.12, 0.03); g = c.createLinearGradient(-0.5, 0, 0.5, 0); g.addColorStop(0, '#9fd4ff'); g.addColorStop(0.5, '#f2fbff'); g.addColorStop(1, '#9fd4ff');
    c.fillStyle = g; c.fill();
    const gx = ((T || 0) * 0.5 % 1.6) - 0.8; c.save(); rr(c, -0.5, -0.06, 1.0, 0.12, 0.03); c.clip();
    c.fillStyle = 'rgba(255,255,255,.9)'; c.beginPath(); c.moveTo(gx, -0.07); c.lineTo(gx + 0.12, -0.07); c.lineTo(gx + 0.06, 0.07); c.lineTo(gx - 0.06, 0.07); c.closePath(); c.fill(); c.restore();
    // glowing end caps so the direction reads instantly
    for (const ex of [-0.53, 0.53]) { glowAt(c, ex, 0, 0.12, '#5cc8ff', 0.6); circle(c, ex, 0, 0.035, '#bff3ff'); }
    c.restore();
    circle(c, 0, 0, 0.045, '#d6dde8', '#0b0f17', 0.01);
  },
  wsender(c, o, T) {
    const on = o.powered;
    steel(c, -0.3, 0.14, 0.6, 0.26, 0.05);
    c.beginPath(); c.moveTo(-0.12, 0.14); c.lineTo(0, -0.24); c.lineTo(0.12, 0.14); c.strokeStyle = '#c5ccd8'; c.lineWidth = 0.03; c.stroke();
    c.beginPath(); c.moveTo(-0.07, 0.0); c.lineTo(0.07, 0.0); c.moveTo(-0.04, -0.1); c.lineTo(0.04, -0.1); c.stroke();
    led(c, 0, -0.27, 0.045, on, COL.wifi);
    for (let i = 1; i <= 2; i++) {
      c.beginPath(); c.arc(0, -0.27, 0.09 * i + (on ? (T * 0.12 % 0.09) : 0), -Math.PI * 0.85, -Math.PI * 0.15);
      c.strokeStyle = on ? hexA(COL.wifi, 0.9 - i * 0.3) : 'rgba(150,170,200,.35)'; c.lineWidth = 0.025; c.stroke();
    }
    label(c, 'TX', 0, 0.31, 0.09, '#dfe6f3');
  },
  wreceiver(c, o, T) {
    const on = o.signal || o.src;
    steel(c, -0.3, 0.14, 0.6, 0.26, 0.05);
    c.beginPath(); c.moveTo(0, 0.14); c.lineTo(0, -0.02); c.strokeStyle = '#c5ccd8'; c.lineWidth = 0.035; c.stroke();
    c.save(); c.translate(0, -0.08); c.rotate(-0.5);
    c.beginPath(); c.ellipse(0, 0, 0.26, 0.1, 0, Math.PI, TAU); c.closePath();
    const g = c.createLinearGradient(0, -0.1, 0, 0); g.addColorStop(0, '#e9eef7'); g.addColorStop(1, '#8a96b0'); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.015; c.stroke();
    c.beginPath(); c.moveTo(0, -0.02); c.lineTo(0, -0.22); c.strokeStyle = '#c5ccd8'; c.lineWidth = 0.015; c.stroke();
    led(c, 0, -0.23, 0.03, on, COL.wifi);
    c.restore();
    label(c, 'RX', 0, 0.31, 0.09, '#dfe6f3');
    if (o.wl) led(c, 0.22, 0.27, 0.025, true, COL.wifi);
  },
  chime(c, o, T) {
    const on = o.ringing;
    steel(c, -0.36, -0.42, 0.72, 0.08, 0.03);
    const lens = [0.5, 0.62, 0.44, 0.56, 0.38];
    for (let i = 0; i < 5; i++) {
      const x = -0.28 + i * 0.14, sw = on ? Math.sin(T * 7 + i * 1.3) * 0.18 : 0;
      c.save(); c.translate(x, -0.34); c.rotate(sw);
      c.beginPath(); c.moveTo(0, 0); c.lineTo(0, 0.06); c.strokeStyle = '#7d879c'; c.lineWidth = 0.01; c.stroke();
      const g = c.createLinearGradient(-0.03, 0, 0.03, 0); g.addColorStop(0, '#8d7a3a'); g.addColorStop(0.5, '#ffe9a0'); g.addColorStop(1, '#a88a3c');
      rr(c, -0.028, 0.06, 0.056, lens[i], 0.02); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.01; c.stroke();
      c.restore();
    }
    if (on) glowAt(c, 0, 0.1, 0.55, COL.music, 0.25);
  },
  hamster(c, o, T) {
    const run = o.fed;
    steel(c, -0.3, 0.32, 0.6, 0.1, 0.03);
    c.beginPath(); c.moveTo(-0.16, 0.34); c.lineTo(0, 0.0); c.lineTo(0.16, 0.34); c.strokeStyle = '#4a5262'; c.lineWidth = 0.035; c.stroke();
    circle(c, 0, -0.02, 0.38, 'rgba(20,26,40,.6)', '#b9c4da', 0.035);
    c.save(); c.rotate(run ? -T * 9 : 0);
    for (let i = 0; i < 10; i++) { c.rotate(TAU / 10); c.beginPath(); c.moveTo(0.06, 0); c.lineTo(0.36, 0); c.strokeStyle = 'rgba(185,196,218,.45)'; c.lineWidth = 0.012; c.stroke(); }
    c.restore();
    circle(c, 0, -0.02, 0.05, '#9aa3b5');
    // hamster
    const bob = run ? Math.abs(Math.sin(T * 18)) * 0.03 : 0;
    c.save(); c.translate(0.02, 0.2 - bob);
    c.beginPath(); c.ellipse(0, 0, 0.17, 0.11, 0, 0, TAU); c.fillStyle = '#e39a52'; c.fill(); c.strokeStyle = '#7a4318'; c.lineWidth = 0.014; c.stroke();
    c.beginPath(); c.ellipse(0.02, 0.04, 0.1, 0.05, 0, 0, TAU); c.fillStyle = '#fbe3c4'; c.fill();
    circle(c, 0.13, -0.05, 0.075, '#e39a52', '#7a4318', 0.014);
    circle(c, 0.08, -0.12, 0.03, '#f6b9a8', '#7a4318', 0.01);
    circle(c, 0.16, -0.06, 0.016, '#111');
    circle(c, 0.205, -0.03, 0.012, '#d0566b');
    const lp = run ? Math.sin(T * 30) * 0.03 : 0;
    c.strokeStyle = '#7a4318'; c.lineWidth = 0.02;
    c.beginPath(); c.moveTo(-0.08, 0.09); c.lineTo(-0.08 + lp, 0.13); c.moveTo(0.08, 0.09); c.lineTo(0.08 - lp, 0.13); c.stroke();
    c.restore();
    if (run) {
      glowAt(c, 0, 0, 0.5, COL.volt, 0.18);
      c.save(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 0.014; c.lineCap = 'round';
      for (let k = 0; k < 3; k++) { const yy = 0.14 + k * 0.05, ph = (T * 5 + k * 0.3) % 1; c.beginPath(); c.moveTo(-0.18 - ph * 0.12, yy); c.lineTo(-0.26 - ph * 0.12, yy); c.stroke(); }
      c.restore();
    }
  },
  food(c, o, T) {
    c.beginPath(); c.ellipse(0, 0.3, 0.32, 0.08, 0, 0, TAU); c.fillStyle = '#c9d2e3'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.4)'; c.lineWidth = 0.015; c.stroke();
    c.beginPath(); c.moveTo(-0.26, 0.26); c.lineTo(0.26, 0.26); c.lineTo(0.18, -0.12); c.closePath();
    const g = c.createLinearGradient(0, -0.12, 0, 0.26); g.addColorStop(0, '#ffe27a'); g.addColorStop(1, '#f0b429'); c.fillStyle = g; c.fill();
    c.strokeStyle = '#a8761a'; c.lineWidth = 0.015; c.stroke();
    for (const [x, y, r] of [[-0.06, 0.16, 0.035], [0.1, 0.1, 0.03], [0.14, 0.2, 0.025], [0.04, 0.02, 0.02]]) circle(c, x, y, r, '#d69a1e');
  },
  balldrop(c, o, T) {
    steel(c, -0.42, -0.42, 0.84, 0.16, 0.04);
    c.beginPath(); c.moveTo(-0.36, -0.26); c.lineTo(0.36, -0.26); c.lineTo(0.14, 0.3); c.lineTo(-0.14, 0.3); c.closePath();
    const g = c.createLinearGradient(-0.36, 0, 0.36, 0); g.addColorStop(0, '#3a4562'); g.addColorStop(0.5, '#6f7d9e'); g.addColorStop(1, '#2a3248'); c.fillStyle = g; c.fill();
    c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.02; c.stroke();
    dark(c, -0.16, 0.28, 0.32, 0.14, 0.03);
    if (!o.fired) { const bg = c.createRadialGradient(-0.05, -0.1, 0.01, 0, -0.05, 0.16); bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.4, '#a6b0c4'); bg.addColorStop(1, '#3a4258'); circle(c, 0, -0.05, 0.15, bg); }
    led(c, 0.3, -0.34, 0.03, o.powered, COL.volt);
  },
  cannon(c, o, T) {
    // carriage
    box(c, -0.36, 0.06, 0.5, 0.2, 0.05, '#7a4e2c', '#3e2412');
    circle(c, -0.22, 0.3, 0.11, '#3e2412', '#c9a26a', 0.03); circle(c, 0.04, 0.3, 0.11, '#3e2412', '#c9a26a', 0.03);
    // barrel
    c.save(); c.translate(-0.12, 0.0); c.rotate(-0.12);
    const g = c.createLinearGradient(0, -0.14, 0, 0.14); g.addColorStop(0, '#5a6582'); g.addColorStop(0.4, '#c3cbdc'); g.addColorStop(1, '#2a3148');
    c.beginPath(); c.moveTo(-0.2, -0.13); c.lineTo(0.5, -0.1); c.lineTo(0.5, 0.1); c.lineTo(-0.2, 0.13); c.quadraticCurveTo(-0.32, 0, -0.2, -0.13); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.02; c.stroke();
    rr(c, 0.44, -0.13, 0.08, 0.26, 0.02); c.fillStyle = '#8b96ad'; c.fill();
    c.restore();
    if (o.fired) { c.save(); c.globalAlpha = 0.5; circle(c, 0.42, -0.12, 0.08 + 0.02 * Math.sin(T * 4), '#9aa3b5'); c.restore(); }
    led(c, -0.3, -0.18, 0.03, o.powered, COL.fire);
  },
  drill(c, o, T) {
    const on = o.powered && !o.done;
    box(c, -0.42, -0.24, 0.42, 0.48, 0.08, '#ffcf40', '#c48a10');
    dark(c, -0.36, -0.1, 0.2, 0.2, 0.04);
    led(c, -0.26, 0, 0.035, on, '#ff4d5e');
    steel(c, 0, -0.12, 0.08, 0.24, 0.03);
    c.save(); c.translate(0.08, 0);
    const jit = on ? (Math.random() - 0.5) * 0.02 : 0;
    c.translate(jit, 0);
    c.beginPath(); c.moveTo(0, -0.12); c.lineTo(0.38, 0); c.lineTo(0, 0.12); c.closePath();
    const g = c.createLinearGradient(0, -0.12, 0, 0.12); g.addColorStop(0, '#e3e8f2'); g.addColorStop(1, '#6f7a92'); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = 0.015; c.stroke();
    c.save(); c.clip();
    const off = on ? (T * 1.2) % 0.09 : 0;
    c.strokeStyle = 'rgba(40,50,70,.55)'; c.lineWidth = 0.02;
    for (let x = -0.1 + off; x < 0.4; x += 0.09) { c.beginPath(); c.moveTo(x, -0.14); c.lineTo(x + 0.06, 0.14); c.stroke(); }
    c.restore(); c.restore();
  },
  rotator(c, o, T) {
    const on = o.powered;
    steel(c, -0.4, 0.22, 0.8, 0.18, 0.05);
    c.save(); c.translate(0, -0.06); c.rotate(on ? T * 3 : 0);
    for (let i = 0; i < 10; i++) { c.rotate(TAU / 10); rr(c, 0.24, -0.04, 0.08, 0.08, 0.02); c.fillStyle = '#8a93a6'; c.fill(); }
    circle(c, 0, 0, 0.27, '#4a5574', 'rgba(0,0,0,.5)', 0.02);
    c.restore();
    c.save(); c.translate(0, -0.06);
    c.strokeStyle = on ? '#7fffe0' : '#c6cfdf'; c.lineWidth = 0.035; c.lineCap = 'round';
    c.beginPath(); c.arc(0, 0, 0.15, -2.6, -0.4); c.stroke();
    c.beginPath(); c.arc(0, 0, 0.15, 0.55, 2.75); c.stroke();
    c.fillStyle = on ? '#7fffe0' : '#c6cfdf';
    c.beginPath(); c.moveTo(0.18, -0.08); c.lineTo(0.08, -0.1); c.lineTo(0.16, 0.0); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-0.18, 0.08); c.lineTo(-0.08, 0.1); c.lineTo(-0.16, 0.0); c.closePath(); c.fill();
    c.restore();
    c.strokeStyle = 'rgba(200,210,230,.6)'; c.lineWidth = 0.02;
    chev(c, 0, -0.44, 0.04, 'rgba(0,0,0,0)');
  },
  tpsend(c, o, T) { PAINT._tp(c, o, T, '#ff7ad9', true); },
  tprecv(c, o, T) { PAINT._tp(c, o, T, '#8f7bff', false); },
  _tp(c, o, T, col, send) {
    const on = o.powered;
    steel(c, -0.42, 0.12, 0.84, 0.28, 0.08);
    c.beginPath(); c.ellipse(0, 0.12, 0.36, 0.1, 0, 0, TAU); c.fillStyle = '#12161e'; c.fill(); c.strokeStyle = col; c.lineWidth = 0.03; c.stroke();
    if (on) {
      for (let i = 0; i < 3; i++) {
        const k = ((T * 0.8 + i / 3) % 1);
        c.save(); c.globalAlpha = 1 - k;
        c.beginPath(); c.ellipse(0, 0.12 - (send ? k : 1 - k) * 0.5, 0.36 - k * 0.1, 0.1 - k * 0.03, 0, 0, TAU); c.strokeStyle = col; c.lineWidth = 0.02; c.stroke();
        c.restore();
      }
      glowAt(c, 0, -0.05, 0.5, col, 0.35);
    }
    c.fillStyle = on ? '#ffffff' : hexA(col, 0.7);
    c.beginPath();
    if (send) { c.moveTo(-0.08, -0.2); c.lineTo(0.08, -0.2); c.lineTo(0, -0.06); }
    else { c.moveTo(-0.08, -0.08); c.lineTo(0.08, -0.08); c.lineTo(0, -0.22); }
    c.closePath(); c.fill();
    label(c, send ? 'SEND' : 'RECV', 0, 0.35, 0.085, '#dfe6f3');
  },
  chargelight(c, o, T) {
    const on = o.emitting;
    box(c, -0.4, -0.13, 0.52, 0.26, 0.1, '#3d465f', '#161b2a');
    for (let i = 0; i < 4; i++) { rr(c, -0.34 + i * 0.1, -0.14, 0.04, 0.28, 0.01); c.fillStyle = '#596482'; c.fill(); }
    c.beginPath(); c.moveTo(0.1, -0.13); c.lineTo(0.38, -0.24); c.lineTo(0.38, 0.24); c.lineTo(0.1, 0.13); c.closePath();
    const g = c.createLinearGradient(0.1, 0, 0.38, 0); g.addColorStop(0, '#5a6582'); g.addColorStop(1, '#c3cbdc'); c.fillStyle = g; c.fill(); c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = 0.02; c.stroke();
    c.beginPath(); c.ellipse(0.39, 0, 0.04, 0.23, 0, 0, TAU); c.fillStyle = on ? '#fff8d8' : '#3a4258'; c.fill();
    if (on) glowAt(c, 0.4, 0, 0.45, COL.light, 0.7);
    meter(c, -0.36, 0.22, 0.48, o.charge / 4, '#3dff9a');
  },
  spring(c, o, T) {
    // drawn lying along x with a red bounce pad on each end; orient() stands it up
    const n = 6, l = -0.26, r = 0.26, amp = 0.24;
    c.beginPath(); c.moveTo(l, 0);
    for (let i = 0; i <= n * 2; i++) c.lineTo(l + (r - l) * i / (n * 2), i % 2 ? amp : -amp);
    c.lineTo(r, 0); c.lineJoin = 'round';
    c.strokeStyle = '#2a3148'; c.lineWidth = 0.08; c.stroke();
    c.strokeStyle = '#d3dbea'; c.lineWidth = 0.04; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 0.012; c.stroke();
    for (const x0 of [-0.42, 0.26]) {
      rr(c, x0, -0.4, 0.16, 0.8, 0.06); const g = c.createLinearGradient(x0, 0, x0 + 0.16, 0); g.addColorStop(0, '#ff6b5a'); g.addColorStop(1, '#b3261e');
      c.fillStyle = g; c.fill(); c.strokeStyle = '#3a0d0a'; c.lineWidth = 0.02; c.stroke();
    }
  },
  battery(c, o, T) {
    const on = o.charged;
    steel(c, -0.1, -0.42, 0.2, 0.08, 0.02);
    box(c, -0.3, -0.36, 0.6, 0.76, 0.08, '#2e3a58', '#12161e');
    const lvl = on ? 1 : o.charge / 4;
    for (let i = 0; i < 4; i++) {
      const filled = lvl * 4 > i + 0.01;
      rr(c, -0.22, 0.24 - i * 0.15, 0.44, 0.11, 0.03);
      c.fillStyle = filled ? (on ? '#3dff9a' : '#ffd84a') : '#222a3e'; c.fill();
    }
    if (on) glowAt(c, 0, 0, 0.5, '#3dff9a', 0.3 + 0.1 * Math.sin(T * 4));
    label(c, '+', 0, -0.2, 0.13, '#e6edf8');
  },
};

// octagonal steel pedestal: lights glow blue when the part has power, orange when it is making power
function pedestal(c, o, T) {
  const r = 0.47, k = 0.15;
  const oct = (rad, cut) => { c.beginPath(); c.moveTo(-rad + cut, -rad); c.lineTo(rad - cut, -rad); c.lineTo(rad, -rad + cut); c.lineTo(rad, rad - cut); c.lineTo(rad - cut, rad); c.lineTo(-rad + cut, rad); c.lineTo(-rad, rad - cut); c.lineTo(-rad, -rad + cut); c.closePath(); };
  c.save(); c.translate(0, 0.03); c.globalAlpha = 0.55; oct(r, k); c.fillStyle = '#000'; c.fill(); c.restore();
  oct(r, k); let g = c.createLinearGradient(0, -r, 0, r); g.addColorStop(0, '#3a414f'); g.addColorStop(0.5, '#1f242d'); g.addColorStop(1, '#0f1217'); c.fillStyle = g; c.fill();
  c.lineWidth = 0.02; c.strokeStyle = '#05070a'; c.stroke();
  oct(r - 0.06, k * 0.8); g = c.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#2b313c'); g.addColorStop(1, '#151920'); c.fillStyle = g; c.fill();
  c.strokeStyle = 'rgba(255,255,255,.10)'; c.lineWidth = 0.012; c.stroke();
  const make = !!o.src, has = !!(o.powered || o.latched || o.emitting || o.fed || o.ringing || o.driven || o.lit);
  const col = make ? '#ff9b2f' : has ? '#38d9ff' : null;
  for (const [x, y] of [[-0.33, -0.33], [0.33, -0.33], [-0.33, 0.33], [0.33, 0.33]]) {
    c.beginPath(); c.arc(x, y, 0.028, 0, TAU); c.fillStyle = col || '#2c323d'; c.fill();
    if (col) glowAt(c, x, y, 0.1, col, 0.7);
  }
  if (col) { c.save(); oct(r - 0.02, k); c.strokeStyle = hexA(col, 0.35 + 0.15 * Math.sin(T * 6)); c.lineWidth = 0.02; c.stroke(); c.restore(); }
}

// dark beveled base plate seen from a 30-degree look-down (like the reference art); rim light shows state
function plinth(c, o, T) {
  const w = 0.5, h = 0.2, cy = 0.3, th = 0.07, k = 0.36;
  const oct = (rw, rh, y) => { c.beginPath(); c.moveTo(-rw * (1 - k), y - rh); c.lineTo(rw * (1 - k), y - rh); c.lineTo(rw, y - rh * (1 - k * 1.4)); c.lineTo(rw, y + rh * (1 - k * 1.4)); c.lineTo(rw * (1 - k), y + rh); c.lineTo(-rw * (1 - k), y + rh); c.lineTo(-rw, y + rh * (1 - k * 1.4)); c.lineTo(-rw, y - rh * (1 - k * 1.4)); c.closePath(); };
  const make = !!o.src, has = !!(o.powered || o.latched || o.emitting || o.fed || o.ringing || o.driven || o.lit || o.charged || o.on);
  const col = make ? '#ff9b2f' : has ? '#38d9ff' : null;
  c.save(); c.globalAlpha = 0.6; oct(w + 0.03, h + 0.03, cy + th + 0.03); c.fillStyle = '#000'; c.fill(); c.restore();
  oct(w, h, cy + th); c.fillStyle = '#07090d'; c.fill();                          // side
  let g = c.createLinearGradient(0, cy - h, 0, cy + h); g.addColorStop(0, '#39414f'); g.addColorStop(0.55, '#20262f'); g.addColorStop(1, '#141820');
  oct(w, h, cy); c.fillStyle = g; c.fill(); c.lineWidth = 0.012; c.strokeStyle = 'rgba(190,205,230,.35)'; c.stroke();
  oct(w * 0.8, h * 0.72, cy); c.fillStyle = '#12161d'; c.fill(); c.strokeStyle = 'rgba(0,0,0,.6)'; c.stroke();
  // front rim light strip
  c.beginPath(); c.moveTo(-w * 0.55, cy + h + th * 0.5); c.lineTo(w * 0.55, cy + h + th * 0.5);
  c.lineWidth = 0.022; c.lineCap = 'round'; c.strokeStyle = col ? hexA(col, 0.75 + 0.25 * Math.sin(T * 5)) : 'rgba(60,80,110,.6)'; c.stroke();
  if (col) { glowAt(c, 0, cy + h + th * 0.5, 0.45, col, 0.35); c.save(); oct(w, h, cy); c.strokeStyle = hexA(col, 0.4); c.lineWidth = 0.018; c.stroke(); c.restore(); }
  for (const sx of [-1, 1]) { c.beginPath(); c.arc(sx * w * 0.86, cy, 0.018, 0, TAU); c.fillStyle = col || '#2c323d'; c.fill(); }
}

// Energy cloud around a powered machine (like the reference art): many fine glowing streaks orbiting in a
// flattened swirl, drifting sparks, and a soft haze. Drawn in cell units centred on the machine.
function energyAura(c, seed, T, rgb, strength, rgb2) {
  const k = strength == null ? 1 : strength;
  c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
  const hz = c.createRadialGradient(0, 0.05, 0, 0, 0.05, 0.95); hz.addColorStop(0, 'rgba(' + rgb + ',' + (0.22 * k) + ')'); hz.addColorStop(1, 'rgba(' + rgb + ',0)');
  c.fillStyle = hz; c.beginPath(); c.arc(0, 0.05, 0.95, 0, TAU); c.fill();
  for (let i = 0; i < 14; i++) {
    const r1 = ((seed * 9301 + i * 49297) % 233280) / 233280, r2 = ((seed * 7 + i * 1103) % 997) / 997;
    const rx = 0.42 + r1 * 0.38, ry = rx * (0.32 + r2 * 0.3), rot = (r2 - 0.5) * 0.7, sp = (0.6 + r1 * 1.4) * (i % 2 ? 1 : -1);
    const a = T * sp + i * 2.39, len = 0.6 + r2 * 1.4;
    c.strokeStyle = 'rgba(' + (rgb2 && i % 2 ? rgb2 : rgb) + ',' + ((0.25 + 0.35 * r1) * k) + ')'; c.lineWidth = 0.01 + r2 * 0.016;
    c.beginPath(); c.ellipse(0, 0.05 + (r1 - 0.5) * 0.2, rx, ry, rot, a, a + len); c.stroke();
  }
  for (let i = 0; i < 18; i++) {   // orbiting sparks
    const r1 = ((seed * 31 + i * 7919) % 1000) / 1000, a = T * (0.8 + r1) + i * 0.35 * TAU, rr = 0.35 + r1 * 0.5;
    const tw = 0.5 + 0.5 * Math.sin(T * 9 + i * 3);
    c.fillStyle = 'rgba(' + (rgb2 && i % 3 === 0 ? rgb2 : rgb) + ',' + (0.8 * tw * k) + ')';
    c.beginPath(); c.arc(Math.cos(a) * rr, 0.05 + Math.sin(a) * rr * 0.45, 0.012 + 0.012 * tw, 0, TAU); c.fill();
  }
  c.restore();
}
// Starburst for a lit bulb: bright core, soft halo and thin light spikes radiating out like a small sun.
function starburst(c, x, y, T, size, warm) {
  const col = warm || '255,190,70';
  c.save(); c.globalCompositeOperation = 'lighter'; c.translate(x, y);
  let g = c.createRadialGradient(0, 0, 0, 0, 0, size); g.addColorStop(0, 'rgba(255,250,230,.95)'); g.addColorStop(0.12, 'rgba(255,230,160,.8)');
  g.addColorStop(0.35, 'rgba(' + col + ',.35)'); g.addColorStop(1, 'rgba(' + col + ',0)');
  c.fillStyle = g; c.beginPath(); c.arc(0, 0, size, 0, TAU); c.fill();
  const n = 14;
  for (let i = 0; i < n; i++) {
    const a = i / n * TAU + T * 0.25 + (i % 2) * 0.1, L = size * (i % 2 ? 1.0 : 1.6) * (0.85 + 0.15 * Math.sin(T * 6 + i * 1.7));
    const sg = c.createLinearGradient(0, 0, Math.cos(a) * L, Math.sin(a) * L); sg.addColorStop(0, 'rgba(255,240,200,.9)'); sg.addColorStop(1, 'rgba(' + col + ',0)');
    c.strokeStyle = sg; c.lineWidth = size * (i % 2 ? 0.025 : 0.04); c.lineCap = 'round';
    c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * L, Math.sin(a) * L); c.stroke();
  }
  c.restore();
}
const NO_PEDESTAL = { block: 1, pushbot: 1, pullbot: 1, helibot: 1, carrierbot: 1, soundbot: 1, spybot: 1, food: 1 };
// how to orient a painter given direction
function orient(c, t, d) {
  const r = TYPES[t] && TYPES[t].rot;
  if (r === '4') c.rotate(d * Math.PI / 2);
  else if (r === 'axis') c.rotate((d % 2) * Math.PI / 2);
  else if (r === 'lr' && d === 2) c.scale(-1, 1);
}
// Artwork: art/<name>.webp files published next to the page. A part uses artwork once its picture has loaded;
// until then (or if one is missing) it keeps the procedural drawing.
const ART_SCALE = 0.9;
// look of the machines: 'flat' = compact modern shapes that fit one square (like the classic game), '3d' = detailed pictures
let STYLE = '3d'; try { STYLE = localStorage.getItem('voltworks.style2') || '3d'; } catch (e) {}
function setStyle(s) { STYLE = s; try { localStorage.setItem('voltworks.style2', s); } catch (e) {} }
const SPIN = new Map();   // animated facing angle per placed part
const ART_LIST = ['balldrop', 'battery_empty', 'battery_full', 'block', 'bulb_off', 'bulb_on', 'cannon', 'carrierbot', 'chargefan', 'chargelight', 'chime', 'drill', 'fan', 'feeder', 'food', 'generator', 'hamster', 'heater_off', 'heater_on', 'helibot', 'kettle', 'laser', 'mirror', 'power_off', 'power_on', 'pullbot', 'pushbot', 'rotator', 'solar', 'soundbot', 'spring', 'spybot', 'steamdet', 'target_off', 'target_on', 'tprecv', 'tpsend', 'wreceiver', 'wsender'];
const ART = {};
ART_LIST.forEach(t => { const im = new Image(); im.onload = () => { ART[t] = im; }; im.src = 'art/' + t + '.webp'; });
function isActive(o) { return !!(o.src || o.powered || o.driven || o.lit || o.fed || o.ringing || o.latched || o.emitting || o.charged); }
// on/off pictures
const ART_STATE = {
  power: o => o.on ? 'power_on' : 'power_off', target: o => o.powered ? 'target_on' : 'target_off',
  bulb: o => o.powered ? 'bulb_on' : 'bulb_off', heater: o => (o.powered || o.fire) ? 'heater_on' : 'heater_off',
  battery: o => o.charged ? 'battery_full' : 'battery_empty',
};
// picks the right picture for state + direction. 4-way parts use separate _up/_down pictures (never rotated,
// so the 30-degree look-down stays correct); LEFT uses _left if supplied, otherwise the RIGHT picture mirrored.
function artFor(o) {
  if (STYLE === 'flat') return null;
  let base = ART_STATE[o.t] ? ART_STATE[o.t](o) : o.t;
  if (!ART[base]) { if (ART[o.t]) base = o.t; else return null; }
  const rot = TYPES[o.t] && TYPES[o.t].rot;
  if (rot === 'axis') return { img: ART[base], rotate: (o.d % 2 ? 0 : 1) * Math.PI / 2, spin: true };   // spring picture stands upright; lying down = a quarter turn
  if (rot === '4') {
    // a single top-down picture (no _up/_down files): turn it in code, animated
    if (!ART[base + '_down'] && !ART[base + '_up']) return { img: ART[base], rotate: o.d * Math.PI / 2, spin: true };
    if (o.d === 1) return ART[base + '_down'] ? { img: ART[base + '_down'] } : { img: ART[base], rotate: Math.PI / 2 };
    if (o.d === 3) return ART[base + '_up'] ? { img: ART[base + '_up'] } : { img: ART[base], rotate: -Math.PI / 2 };
    if (o.d === 2) return ART[base + '_left'] ? { img: ART[base + '_left'] } : { img: ART[base], flip: true };
    return { img: ART[base] };
  }
  if (rot === 'lr' && o.d === 2) return { img: ART[base], flip: true };
  if (rot === 'mirror' && o.d === 1) return { img: ART[base], flip: true };
  return { img: ART[base] };
}
function paintObj(c, o, T) {
  const p = PAINT[o.t];
  if (!p) return;
  const art = artFor(o);
  if (art) {
    // machines are drawn about 15% smaller than a square so the board, grid and glowing wires breathe
    c.save(); c.scale(ART_SCALE, ART_SCALE);
    const base = !NO_PEDESTAL[o.t];
    let ang = art.rotate || 0;
    if (art.spin) {   // ease toward the new direction so a tap turns the part smoothly instead of snapping
      const now = (typeof performance !== 'undefined' ? performance.now() : 0) / 1000;
      const key = o.pid != null ? 'p' + o.pid : o.id != null ? 'i' + o.id : null;   // survives board rebuilds
      const st = key ? (SPIN.get(key) || { a: ang, t: now }) : { a: ang, t: now };
      const dtA = Math.min(0.05, Math.max(0, now - st.t)); st.t = now;
      const diff = ((ang - st.a) % TAU + TAU * 1.5) % TAU - Math.PI;
      st.a += Math.abs(diff) < 0.01 ? diff : diff * Math.min(1, dtA * 14);
      if (key) SPIN.set(key, st);
      ang = st.a;
    }
    c.save(); if (ang) c.rotate(ang); if (art.flip) c.scale(-1, 1);
    if (art.spin && o.t !== 'spring' && Math.cos(ang) < -0.01) c.scale(1, -1);   // pointing left: mirror instead of turning the picture upside down
    // low, wide pictures (sideways laser, drill, feeder) are lifted so their body sits centred on the wire line
    const lift = 0;
    void lift; void base; c.drawImage(art.img, -0.5, -0.5, 1, 1);   // compact: the whole machine sits inside its square
    c.restore();
    if (o.t === 'bulb' && o.powered) starburst(c, 0, -0.34, T, o.burstSize || 0.95, o.warm);
    else if (isActive(o) && !ART_STATE[o.t]) glowAt(c, 0, 0, 0.6, o.src ? COL.volt : COL.power, 0.3);
    c.restore();
    return;
  }
  // soft contact shadow so the flat machines sit on the board
  if (o.t !== 'block' && o.t !== 'mirror' && o.t !== 'helibot') { c.save(); c.globalAlpha = 0.32; c.fillStyle = '#000'; c.beginPath(); c.ellipse(0.02, 0.4, 0.34, 0.07, 0, 0, TAU); c.fill(); c.restore(); }
  if (isActive(o) && !['power', 'target', 'bulb'].includes(o.t)) glowAt(c, 0, 0, 0.55, o.src ? COL.volt : COL.power, 0.18);
  c.save(); orient(c, o.t, o.d);
  const flipped = TYPES[o.t] && TYPES[o.t].rot === 'lr' && o.d === 2;
  p(c, o, T, flipped);
  c.restore();
}
