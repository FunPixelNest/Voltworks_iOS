// ===== VOLTWORKS simulation engine (pure logic, no rendering) =====
const DX = [1, 0, -1, 0], DY = [0, 1, 0, -1]; // 0 right, 1 down, 2 left, 3 up

const TYPES = {
  power:      { name: 'Main Power Supply', anchored: true, desc: 'Fixed. Tap it to switch ON/OFF. Powers the wire connected to it.' },
  target:     { name: 'Target', anchored: true, desc: 'Fixed. Get electricity here and keep it flowing to clear the level. Also acts as a block.' },
  block:      { name: 'Block', anchored: true, desc: 'Stops light, air, steam, water, bots and balls. Electricity still flows through wires under it.' },
  fan:        { name: 'Electric Fan', rot: '4', desc: 'Powered: blows air straight ahead. Air spins generators, rings chimes and bends steam. Tap to turn.' },
  generator:  { name: 'Power Generator', desc: 'Put it on a wire. Spun by air or falling water, it sends electricity into that wire.' },
  bulb:       { name: 'Light Bulb', desc: 'Powered: shines light in all four directions.' },
  solar:      { name: 'Solar Panel', desc: 'Put it on a wire. Light (bulb, flashlight or laser) makes it send electricity into that wire.' },
  kettle:     { name: 'Water Kettle', rot: 'lr', desc: 'Powered: pours water down from its spout. Sitting on a hot heater: steam rises from its top. Tap to flip.' },
  heater:     { name: 'Electric Heater', desc: 'Powered: makes fire. A kettle above it boils into steam; a cannon beside it fires.' },
  steamdet:   { name: 'Steam Detector', desc: 'Put it on a wire. Steam flowing into it sends electricity into that wire.' },
  pushbot:    { name: 'Push Bot', rot: 'lr', bot: true, desc: 'Once powered, drives forward and pushes one object ahead of it.' },
  pullbot:    { name: 'Puller Bot', rot: 'lr', bot: true, desc: 'Once powered, drives forward, grabs the first object it meets and pulls it back.' },
  helibot:    { name: 'Heli Bot', bot: true, desc: 'Once powered, flies down, grabs the first object below and lifts it up. It only ever lifts things up.' },
  carrierbot: { name: 'Carrier Bot', rot: 'lr', bot: true, desc: 'Once powered, drives forward carrying the object sitting on top of it.' },
  soundbot:   { name: 'Sound Bot', bot: true, desc: 'Woken up by music. Drives down and pushes an object down.' },
  spybot:     { name: 'Spy Bot', desc: 'Powered: scans the 3×3 area around it and transforms into the first bot it finds.' },
  laser:      { name: 'Laser Device', rot: '4', desc: 'Powered: fires a laser beam in one direction. Tap to turn.' },
  feeder:     { name: 'Laser Feeder', desc: 'Put it on a wire. A laser entering its left or right red port sends electricity into that wire.' },
  mirror:     { name: 'Mirror', rot: 'mirror', desc: 'Needs no power. Reflects laser 90°. Normal light passes through. Tap to flip.' },
  wsender:    { name: 'Wireless Sender', desc: 'Powered: transmits power to receivers within 3 cells.' },
  wreceiver:  { name: 'Wireless Receiver', desc: 'Picks up the wireless signal and produces power — keeps working even after being moved.' },
  chime:      { name: 'Wind Chime', desc: 'Needs no power. Air makes it play music to the 8 cells around it.' },
  hamster:    { name: 'Hamster Wheel', rot: 'lr', desc: 'No power needed. Food in front of its face, or music nearby, makes it run and generate electricity.' },
  food:       { name: 'Food', desc: 'A hamster snack. Place it in front of the hamster\'s face.' },
  balldrop:   { name: 'Ball Dropper', desc: 'Powered: drops a heavy metal ball that smashes everything below it.' },
  cannon:     { name: 'Cannon', rot: 'lr', desc: 'Powered, or next to a hot heater: fires once and clears its whole row. Tap to flip.' },
  drill:      { name: 'Drill Machine', rot: '4', desc: 'Powered: demolishes the object in front of it. Tap to turn.' },
  rotator:    { name: 'Rotating Tool', desc: 'Powered: flips the objects directly above and below it.' },
  tpsend:     { name: 'Teleporter Sender', desc: 'Powered: teleports the object above it to a powered receiver.' },
  tprecv:     { name: 'Teleporter Receiver', desc: 'Powered: teleported objects appear in the (empty) cell above it.' },
  chargefan:  { name: 'Charger Fan', rot: '4', desc: 'Powered: blows air and charges up. Once charged it keeps blowing even after the power is gone (power off, or a bot moves it off the wire).' },
  chargelight:{ name: 'Charger Flashlight', rot: '4', desc: 'Powered: shines a beam and charges up. Once charged it keeps shining even after the power is gone (power off, or a bot moves it off the wire).' },
  spring:     { name: 'Spring', anchored: true, rot: 'axis', desc: 'Needs no power. Standing up, anything that lands on it or hits it from below squashes it and bounces straight back. Tap to lay it on its side: then it bounces things coming from the left or right. From its sides it is just a wall.' },
  battery:    { name: 'Battery Pack', desc: 'Put it on a wire. A little power charges it; then it keeps that wire powered even after the main power is off.' },
};
const BOT_TYPES = ['pushbot', 'pullbot', 'helibot', 'carrierbot', 'soundbot'];
const CHARGE_MAX = 4;
const WIND_UP = 7;      // ticks a machine visibly charges up before it acts (~1 s), so players can follow what happens
const BOT_EVERY = 3;
const FLOW_CPT = 1.32;
const FLOW_MUL = { laser: 1.2 };   // laser beams travel 20% faster than other flows
const WIRE_CPT = 2;      // squares the electric current travels along a wire per tick   // squares a flow (wind, light, laser, water, steam) travels per tick; it only acts when it arrives    // bots move one square every 3 ticks
const WIFI_RANGE = 3;

function defaultDir(t) { return (t === 'helibot' || t === 'soundbot') ? 1 : t === 'spring' ? 3 : 0; }
// a spring works along its length: upright (d 1/3) it bounces anything moving up or down into it, laid sideways (d 0/2)
// anything moving left or right into it; whatever hits either end is sent straight back the way it came
function springBack(h, d) { return !!(h && h.t === 'spring' && (h.d % 2) === (d % 2)); }

class Sim {
  constructor(level, placed) {
    this.level = level;
    this.w = level.w; this.h = level.h;
    const N = this.w * this.h;
    this.wire = new Uint8Array(N);
    this.nobuild = new Uint8Array(N);
    this.live = new Uint8Array(N);
    this.grid = new Array(N).fill(null);
    this.objs = [];
    this.nid = 0;
    this.on = false; this.everOn = false;
    this.t = 0; this.proj = []; this.events = [];
    this.won = false; this.winTicks = 0;
    this.staticTicks = 0; this.lastSig = '';
    this.needsReset = false;
    this.flows = this.emptyFlows();
    level.map.forEach((row, y) => {
      for (let x = 0; x < this.w; x++) {
        const c = row[x] || '.';
        const i = y * this.w + x;
        if (c === 'x') this.nobuild[i] = 1;
        else if (c === '=' || (c >= 'a' && c <= 'z')) this.wire[i] = c.charCodeAt(0); // wire label: same letter = same cable
        else if (c === 'P') this.add('power', x, y, 0, true);
        else if (c === 'T') this.add('target', x, y, 0, true);
        else if (c === '#') this.add('block', x, y, 0, true);
      }
    });
    (level.fixed || []).forEach(f => this.add(f[0], f[1], f[2], f[3], true));
    (placed || []).forEach(p => this.add(p.t, p.x, p.y, p.d, false));
    this.buildPlugs();
  }
  // Electric Box rule: a part only works when it sits ON a wire. Wires join only with neighbours of the
  // same label (letter), so two different cables can run side by side without touching.
  buildPlugs() {}
  linked(i, j) { return this.wire[i] && this.wire[i] === this.wire[j]; }
  conn(x, y) { const i = this.idx(x, y); return this.wire[i] ? [i] : []; }
  emptyFlows() { return { air: [], light: [], laser: [], water: [], steam: [], music: [], wifi: [], fire: [] }; }
  idx(x, y) { return y * this.w + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.w && y < this.h; }
  at(x, y) { return this.inb(x, y) ? this.grid[this.idx(x, y)] : null; }
  add(t, x, y, d, fixed) {
    if (!this.inb(x, y) || this.at(x, y)) return null;
    const o = { id: ++this.nid, t, x, y, d: d == null ? defaultDir(t) : d, fixed: !!fixed,
      powered: false, prevPowered: false, src: false, charge: 0, charged: false, emitting: false,
      latched: false, mode: 'go', grab: 0, fired: false, done: false, drillT: 0,
      driven: false, lit: false, steamed: false, lasered: false, wl: false, signal: false,
      fed: false, ringing: false, fire: false, spied: false, dead: false };
    this.objs.push(o); this.grid[this.idx(x, y)] = o;
    return o;
  }
  anchored(o) { return !!(TYPES[o.t] && TYPES[o.t].anchored); }
  move(o, x, y) {
    this.grid[this.idx(o.x, o.y)] = null;
    this.events.push({ k: 'move', id: o.id, fx: o.x, fy: o.y, tx: x, ty: y });
    o.x = x; o.y = y; this.grid[this.idx(x, y)] = o;
    this.activity = true;
  }
  destroy(o, by) {
    this.grid[this.idx(o.x, o.y)] = null;
    o.dead = true;
    this.objs = this.objs.filter(q => q !== o);
    this.objs.forEach(q => { if (q.grab === o.id) { q.grab = 0; q.mode = 'stop'; } });
    this.events.push({ k: 'destroy', o, by });
    this.activity = true;
  }
  flip(o) {
    const r = TYPES[o.t] && TYPES[o.t].rot;
    if (r === 'lr') o.d = o.d === 0 ? 2 : 0;
    else if (r === '4') o.d = (o.d + 2) % 4;
    else if (r === 'mirror') o.d = o.d ^ 1;
    else return false;
    this.events.push({ k: 'flip', o });
    return true;
  }
  isSrc(o) {
    switch (o.t) {
      case 'power': return this.on;
      case 'generator': return o.driven;
      case 'solar': return o.lit;
      case 'steamdet': return o.steamed;
      case 'feeder': return o.lasered;
      case 'wreceiver': return o.signal;
      case 'battery': return o.charged;
      case 'hamster': return o.fed;
    }
    return false;
  }
  touches(arr, x, y) {
    if (this.inb(x, y) && arr[this.idx(x, y)]) return true;
    for (let k = 0; k < 4; k++) {
      const nx = x + DX[k], ny = y + DY[k];
      if (this.inb(nx, ny) && arr[this.idx(nx, ny)]) return true;
    }
    return false;
  }
  setPower(on) {
    this.on = on;
    if (on) this.everOn = true;
    this.staticTicks = 0;
  }

  tick() {
    const ev = this.events = [];
    this.activity = false;
    this.t++;
    const W = this.w;
    // ---- 1. sources from last tick
    for (const o of this.objs) o.src = this.isSrc(o);
    // ---- 2. electricity: flood live wires from sources
    // current travels along the wire at WIRE_CPT squares per tick from the moment its source switches on;
    // a wire square is live only once the current has actually reached it
    this.live.fill(0);
    const N = this.w * this.h;
    if (!this.arrive || this.arrive.length !== N) this.arrive = new Float32Array(N);
    const arr = this.arrive; arr.fill(Infinity);
    this.srcStart = this.srcStart || new Map(); const seenSrc = new Set();
    const q = [];
    const seed = (x, y, t0) => { if (this.inb(x, y)) { const i = this.idx(x, y); if (this.wire[i] && t0 < arr[i]) { arr[i] = t0; q.push(i); } } };
    for (const o of this.objs) {
      if (!o.src) continue;
      seenSrc.add(o.id); if (!this.srcStart.has(o.id)) this.srcStart.set(o.id, this.t);
      const t0 = this.srcStart.get(o.id);
      if (o.t === 'power') { for (let k = 0; k < 4; k++) seed(o.x + DX[k], o.y + DY[k], t0); continue; }
      for (const i of this.conn(o.x, o.y)) seed(i % W, (i / W) | 0, t0);
    }
    for (const k of [...this.srcStart.keys()]) if (!seenSrc.has(k)) this.srcStart.delete(k);
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % W, y = (i / W) | 0, nt = arr[i] + 1 / WIRE_CPT;
      for (let k = 0; k < 4; k++) { const nx = x + DX[k], ny = y + DY[k]; if (!this.inb(nx, ny)) continue; const j = this.idx(nx, ny); if (this.linked(i, j) && nt < arr[j]) { arr[j] = nt; q.push(j); } }
    }
    for (let i = 0; i < N; i++) if (arr[i] <= this.t + 1e-6) { this.live[i] = 1; } else if (arr[i] < Infinity) this.activity = true;
    for (const o of this.objs) {
      o.prevPowered = o.powered;
      if (o.t === 'power') { o.powered = this.on; continue; }
      if (o.t === 'target') { let p = false; for (let k = 0; k < 4; k++) { const nx = o.x + DX[k], ny = o.y + DY[k]; if (this.inb(nx, ny) && this.live[this.idx(nx, ny)]) p = true; } o.powered = p; continue; }
      o.powered = this.conn(o.x, o.y).some(i => this.live[i]);
    }
    // ---- 3. charge-based devices
    for (const o of this.objs) {
      if (o.t === 'battery' && !o.charged && o.powered) { o.charge++; if (o.charge >= CHARGE_MAX) { o.charged = true; ev.push({ k: 'charged', o }); } }
      if (o.t === 'chargefan' || o.t === 'chargelight') {
        if (o.powered) o.charge = Math.min(CHARGE_MAX, o.charge + 1);
        const was = o.emitting;
        o.emitting = o.powered || o.charge >= CHARGE_MAX;   // works on power right away; a full charge keeps it going after the power is gone
        if (o.emitting && !was) ev.push({ k: 'release', o });
      }
    }
    // ---- 4. flows
    this.computeFlows();
    // ---- 5. mechanics
    this.mechanics();
    // ---- 6. win check
    const tgts = this.objs.filter(o => o.t === 'target');
    if (!this.won && tgts.length && tgts.every(o => o.powered)) {
      this.winTicks++;
      if (this.winTicks >= 4) { this.won = true; ev.push({ k: 'win' }); }
    } else if (!this.won) this.winTicks = 0;
    // ---- 7. auto-reset detection when power is off and nothing changes
    if (!this.on && this.everOn && !this.won) {
      const sig = this.signature();
      if (sig === this.lastSig && !this.activity && !this.proj.length) this.staticTicks++; else this.staticTicks = 0;
      this.lastSig = sig;
      if (this.staticTicks >= 10) this.needsReset = true;
    } else { this.lastSig = this.signature(); this.staticTicks = 0; }
    return ev;
  }
  signature() {
    let s = '';
    for (const o of this.objs) s += o.id + ':' + o.x + ',' + o.y + (o.powered ? 'p' : '') + (o.src ? 's' : '') + (o.emitting ? 'e' : '') + (o.charge) + ';';
    return s;
  }

  ray(x, y, d, kind) {
    let cx = x, cy = y, hit = null;
    const cells = [];
    for (let i = 0; i < 80; i++) {
      cx += DX[d]; cy += DY[d];
      if (!this.inb(cx, cy)) break;
      const o = this.at(cx, cy);
      if (o && !(kind === 'light' && o.t === 'mirror')) { hit = o; break; }
      cells.push([cx, cy]);
    }
    const sx = x + 0.5 + DX[d] * 0.38, sy = y + 0.5 + DY[d] * 0.38;
    let ex, ey;
    if (hit) { ex = hit.x + 0.5 - DX[d] * 0.42; ey = hit.y + 0.5 - DY[d] * 0.42; }
    else { ex = cx + 0.5 - DX[d] * 0.5; ey = cy + 0.5 - DY[d] * 0.5; }
    return { kind, d, cells, hit, pts: [[sx, sy], [ex, ey]], len: cells.length };
  }

  computeFlows() {
    const F = this.flows = this.emptyFlows();
    const W = this.w, H = this.h;
    this.flowAge = this.flowAge || new Map(); const seen = new Set();
    const plen = pts => { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; };
    // how far a flow has travelled since it started; it takes effect only once it reaches what it hits
    const travel = (kind, src, d, r) => {
      const key = kind + ':' + src.id + ':' + d; seen.add(key);
      if (!this.flowAge.has(key)) this.flowAge.set(key, this.t);
      const len = Math.max(0, plen(r.pts) - 0.45), got = (this.t - this.flowAge.get(key) + 1) * FLOW_CPT * (FLOW_MUL[kind] || 1);
      r.len = plen(r.pts); r.reach = Math.min(r.len, got + 0.45); r.arrived = got >= len;
      if (!r.arrived) this.activity = true;
      return r.arrived;
    };
    for (const o of this.objs) { o.driven = o.lit = o.steamed = o.lasered = o.fed = o.ringing = o.fire = false; o.inMusic = false; }
    const airMap = new Int8Array(W * H).fill(-1);
    // AIR
    for (const o of this.objs) {
      if ((o.t === 'fan' && o.powered) || (o.t === 'chargefan' && o.emitting)) {
        const r = this.ray(o.x, o.y, o.d, 'air'); r.src = o;
        const ok = travel('air', o, o.d, r);
        r.cells.forEach(([x, y], k) => { if (k + 1 <= r.reach) airMap[y * W + x] = o.d; });
        F.air.push(r);
        if (r.hit && ok) { if (r.hit.t === 'generator') r.hit.driven = true; if (r.hit.t === 'chime') r.hit.ringing = true; }
      }
    }
    // LIGHT
    for (const o of this.objs) {
      const dirs = (o.t === 'bulb' && o.powered) ? [0, 1, 2, 3] : (o.t === 'chargelight' && o.emitting) ? [o.d] : [];
      for (const d of dirs) {
        const r = this.ray(o.x, o.y, d, 'light'); r.src = o; r.beam = o.t === 'chargelight';
        const ok = travel('light', o, d, r);
        F.light.push(r);
        if (ok && r.hit && r.hit.t === 'solar') r.hit.lit = true;
      }
    }
    // LASER
    for (const o of this.objs) {
      if (o.t !== 'laser' || !o.powered) continue;
      let cx = o.x, cy = o.y, d = o.d;
      const pts = [[o.x + 0.5 + DX[d] * 0.4, o.y + 0.5 + DY[d] * 0.4]];
      let hit = null, steps = 0;
      while (steps++ < 200) {
        cx += DX[d]; cy += DY[d];
        if (!this.inb(cx, cy)) { pts.push([cx + 0.5 - DX[d] * 0.5, cy + 0.5 - DY[d] * 0.5]); break; }
        const h = this.at(cx, cy);
        if (h && h.t === 'mirror') {
          pts.push([cx + 0.5, cy + 0.5]);
          d = h.d === 0 ? (3 - d) : (d ^ 1);
          continue;
        }
        if (h) { hit = h; pts.push([cx + 0.5 - DX[d] * 0.42, cy + 0.5 - DY[d] * 0.42]); break; }
      }
      const lr = { pts, hit, src: o, d };
      if (travel('laser', o, o.d, lr) && hit) {
        if (hit.t === 'feeder' && (d === 0 || d === 2)) hit.lasered = true;
        if (hit.t === 'solar') hit.lit = true;
      }
      F.laser.push(lr);
    }
    // HEATERS
    for (const o of this.objs) if (o.t === 'heater' && o.powered) { o.fire = true; F.fire.push(o); }
    // KETTLES: water + steam
    for (const o of this.objs) {
      if (o.t !== 'kettle') continue;
      if (o.powered) {
        const sx = o.x + DX[o.d], sy = o.y;
        const pts = [[o.x + 0.5 + DX[o.d] * 0.42, o.y + 0.38]];
        let hit = null;
        if (this.inb(sx, sy)) {
          const h0 = this.at(sx, sy);
          if (h0) { hit = h0; pts.push([sx + 0.5 - DX[o.d] * 0.4, sy + 0.45]); }
          else {
            pts.push([sx + 0.5, sy + 0.3]);
            let cy = sy;
            while (true) {
              cy++;
              if (!this.inb(sx, cy)) { pts.push([sx + 0.5, cy]); break; }
              const h = this.at(sx, cy);
              if (h) { hit = h; pts.push([sx + 0.5, cy + 0.1]); break; }
            }
          }
          const wr = { pts, hit, src: o };
          if (travel('water', o, o.d, wr) && hit && hit.t === 'generator') hit.driven = true;
          F.water.push(wr);
        }
      }
      const below = this.at(o.x, o.y + 1);
      if (below && below.t === 'heater' && below.fire) {
        let col = o.x, hit = null;
        const pts = [[o.x + 0.5, o.y + 0.15]];
        for (let r = o.y - 1; r >= 0; r--) {
          const h = this.at(col, r);
          if (h) { hit = h; pts.push([col + 0.5, r + 0.9]); break; }
          pts.push([col + 0.5, r + 0.5]);
          const a = airMap[r * W + col];
          if (a === 0 || a === 2) {
            const nc = col + DX[a];
            if (!this.inb(nc, r)) { pts.push([nc + 0.5 - DX[a] * 0.5, r + 0.5]); col = -1; break; }
            const h2 = this.at(nc, r);
            if (h2) { hit = h2; pts.push([nc + 0.5 - DX[a] * 0.42, r + 0.5]); col = -1; break; }
            col = nc; pts.push([col + 0.5, r + 0.5]);
          }
          if (r === 0) pts.push([col + 0.5, 0]);
        }
        const sr = { pts, hit, src: o };
        if (travel('steam', o, 0, sr) && hit && hit.t === 'steamdet') hit.steamed = true;
        F.steam.push(sr);
      }
    }
    // WIRELESS
    // a powered sender first scans its range for WIND_UP ticks, then links to receivers inside it
    for (const o of this.objs) if (o.t === 'wsender') { o.scanW = o.powered ? (o.scanW || 0) + 1 : 0; if (o.powered && o.scanW < WIND_UP) this.activity = true; }
    const senders = this.objs.filter(o => o.t === 'wsender' && o.powered);
    for (const r of this.objs) {
      if (r.t !== 'wreceiver') continue;
      for (const s of senders) {
        if (s.scanW >= WIND_UP && Math.max(Math.abs(s.x - r.x), Math.abs(s.y - r.y)) <= WIFI_RANGE) {
          const wr = { s, r, src: s, pts: [[s.x + 0.5, s.y + 0.25], [r.x + 0.5, r.y + 0.2]] };
          if (travel('wifi', s, r.id, wr)) { if (!r.wl) this.events.push({ k: 'link', o: r }); r.wl = true; }
          F.wifi.push(wr);
        }
      }
      r.signal = r.wl && senders.some(q => q.scanW >= WIND_UP);
    }
    senders.forEach(s => F.wifi.push({ s, r: null }));
    for (const k of [...this.flowAge.keys()]) if (!seen.has(k)) this.flowAge.delete(k);
    // MUSIC
    const music = new Uint8Array(W * H);
    for (const o of this.objs) {
      if (o.t === 'chime' && o.ringing) {
        F.music.push(o);
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const x = o.x + dx, y = o.y + dy; if (this.inb(x, y)) music[y * W + x] = 1; }
      }
    }
    this.musicMap = music;
    for (const o of this.objs) {
      o.inMusic = !!music[o.y * W + o.x];
      if (o.t === 'hamster') {
        const f = this.at(o.x + DX[o.d], o.y);
        o.fed = !!(f && f.t === 'food') || o.inMusic;
      }
      if (o.t === 'soundbot' && o.inMusic && !o.latched) { o.latched = true; this.events.push({ k: 'wake', o }); }
    }
  }

  mechanics() {
    const ev = this.events;
    const list = this.objs.slice();
    for (const o of list) {
      if (o.dead) continue;
      if (BOT_TYPES.includes(o.t) && o.t !== 'soundbot' && o.powered && !o.latched) { o.latched = true; ev.push({ k: 'wake', o }); }
      switch (o.t) {
        case 'spybot':
          if (o.powered && !o.spied && (o.scanT = (o.scanT || 0) + 1) < WIND_UP) { this.activity = true; break; }
          if (o.powered && !o.spied) {
            let found = null;
            for (let dy = -1; dy <= 1 && !found; dy++) for (let dx = -1; dx <= 1 && !found; dx++) {
              const n = this.at(o.x + dx, o.y + dy);
              if (n && n !== o && BOT_TYPES.includes(n.t)) found = n;
            }
            o.spied = true;
            if (found) {
              ev.push({ k: 'transform', o, from: 'spybot', to: found.t, src: found });
              o.t = found.t;
              if (o.t === 'helibot' || o.t === 'soundbot') o.d = 1; else o.d = found.d;
              o.latched = true; o.mode = 'go';
            } else ev.push({ k: 'scanfail', o });
          }
          break;
        case 'balldrop':
          if (o.powered && !o.fired && (o.arm = (o.arm || 0) + 1) < WIND_UP) { this.activity = true; break; }
          if (o.powered && !o.fired) { o.fired = true; this.proj.push({ kind: 'ball', x: o.x, y: o.y, d: 1, pause: 0, px: o.x, py: o.y }); ev.push({ k: 'fire', o }); this.activity = true; }
          break;
        case 'cannon': {
          let hot = false;
          for (const k of [0, 2]) { const n = this.at(o.x + DX[k], o.y); if (n && n.t === 'heater' && n.fire) hot = true; }
          if ((o.powered || hot) && !o.fired && (o.arm = (o.arm || 0) + 1) < WIND_UP) { this.activity = true; break; }
          if ((o.powered || hot) && !o.fired) { o.fired = true; this.proj.push({ kind: 'cannonball', x: o.x, y: o.y, d: o.d, pause: 0, px: o.x, py: o.y }); ev.push({ k: 'fire', o }); this.activity = true; }
          break;
        }
        case 'drill':
          if (o.powered && !o.done) {
            o.drillT++; this.activity = true;
            const tgt = this.at(o.x + DX[o.d], o.y + DY[o.d]);
            if (o.drillT >= WIND_UP + 1) {
              o.done = true;
              if (tgt && !this.anchored(tgt)) this.destroy(tgt, 'drill');
            }
          }
          break;
        case 'rotator':
          if (o.powered && !o.prevPowered) { o.rotT = WIND_UP; ev.push({ k: 'rotstart', o }); this.activity = true; }
          if (o.rotT > 0) {
            o.rotT--; this.activity = true;
            if (o.rotT === 0) {
              const a = this.at(o.x, o.y - 1), b = this.at(o.x, o.y + 1);
              ev.push({ k: 'rotate', o, flipped: [a, b].filter(Boolean) });
              if (a) this.flip(a);
              if (b) this.flip(b);
            }
          }
          break;
        case 'tpsend':
          if (o.powered) {
            const item = this.at(o.x, o.y - 1);
            const rc0 = item && !this.anchored(item) && this.objs.find(r => r.t === 'tprecv' && r.powered && this.inb(r.x, r.y - 1) && !this.at(r.x, r.y - 1));
            o.tpT = rc0 ? (o.tpT || 0) + 1 : 0;   // the beam builds up around the item before it jumps
            if (rc0) this.activity = true;
            if (item && !this.anchored(item) && o.tpT >= WIND_UP) {
              o.tpT = 0;
              const rc = rc0;
              if (rc) {
                const fx = item.x, fy = item.y;
                this.grid[this.idx(fx, fy)] = null; item.x = rc.x; item.y = rc.y - 1; this.grid[this.idx(item.x, item.y)] = item;
                ev.push({ k: 'teleport', id: item.id, fx, fy, tx: item.x, ty: item.y, o: item });
                this.activity = true;
              }
            }
          }
          break;
      }
    }
    // projectiles
    for (const p of this.proj) {
      p.px = p.x; p.py = p.y;
      if (p.pause > 0) { p.pause--; continue; }
      const nx = p.x + DX[p.d], ny = p.y + DY[p.d];
      if (!this.inb(nx, ny)) { p.gone = true; continue; }
      const h = this.at(nx, ny);
      if (h) {
        if (springBack(h, p.d)) { p.d = (p.d + 2) % 4; p.pause = 1; ev.push({ k: 'bounce', o: p, s: h }); this.activity = true; continue; }   // a ball hitting the pad bounces straight back
        if (this.anchored(h)) { p.gone = true; ev.push({ k: 'impact', x: nx, y: ny, p }); continue; }
        this.destroy(h, p.kind);
        p.pause = 2;   // a beat on every smash so it reads
      }
      p.x = nx; p.y = ny;
      if (p.kind === 'ball' && (p.n = (p.n || 0) + 1) < 3) p.pause = Math.max(p.pause, 1);   // falls slowly at first, then speeds up
    }
    if (this.proj.some(p => p.gone)) this.activity = true;
    this.proj = this.proj.filter(p => !p.gone);
    // bots move every BOT_EVERY ticks
    if (this.t % BOT_EVERY === 0) {
      for (const o of this.objs.slice()) {
        if (o.dead || !o.latched || !BOT_TYPES.includes(o.t) || o.mode === 'stop') continue;
        this.botStep(o);
      }
    }
  }

  movable(o) { return o && !this.anchored(o); }

  botStep(o) {
    const ev = this.events;
    const d = o.d, nx = o.x + DX[d], ny = o.y + DY[d];
    if (o.t === 'pushbot' || o.t === 'soundbot') {
      if (!this.inb(nx, ny)) return;
      const h = this.at(nx, ny);
      if (!h) { this.move(o, nx, ny); return; }
      if (h.t === 'spring') { if (springBack(h, d)) { o.d = (d + 2) % 4; ev.push({ k: 'bounce', o, s: h }); this.activity = true; } return; }
      if (this.movable(h)) {
        const bx = nx + DX[d], by = ny + DY[d];
        if (this.inb(bx, by) && !this.at(bx, by)) { this.move(h, bx, by); this.move(o, nx, ny); }
      }
      return;
    }
    if (o.t === 'pullbot' || o.t === 'helibot') {
      if (o.mode === 'go') {
        if (!this.inb(nx, ny)) { o.mode = 'stop'; return; }
        const h = this.at(nx, ny);
        if (!h) { this.move(o, nx, ny); return; }
        if (h.t === 'spring') { if (springBack(h, d)) { o.d = (d + 2) % 4; ev.push({ k: 'bounce', o, s: h }); this.activity = true; } else o.mode = 'stop'; return; }
        // a heli bot only ever lifts things UP: it grabs only while flying down; flying up (after a spring) it just stops
        if (this.movable(h) && !(o.t === 'helibot' && d === 3)) { o.mode = 'pull'; o.grab = h.id; ev.push({ k: 'grab', o, h }); this.activity = true; return; }
        o.mode = 'stop'; return;
      }
      if (o.mode === 'pull') {
        const g = this.objs.find(q => q.id === o.grab);
        if (!g) { o.mode = 'stop'; return; }
        const bx = o.x - DX[d], by = o.y - DY[d];
        if (!this.inb(bx, by) || this.at(bx, by)) { o.mode = 'stop'; ev.push({ k: 'release', o }); return; }
        const ox = o.x, oy = o.y;
        this.move(o, bx, by);
        this.move(g, ox, oy);
      }
      return;
    }
    if (o.t === 'carrierbot') {
      if (!this.inb(nx, ny)) return;
      const h = this.at(nx, ny);
      if (h) { if (springBack(h, d)) { o.d = (d + 2) % 4; ev.push({ k: 'bounce', o, s: h }); this.activity = true; } return; }   // a carrier bot bounces off a spring's pad
      const top = this.at(o.x, o.y - 1);
      const ox = o.x;
      this.move(o, nx, ny);
      if (top && this.movable(top) && this.inb(nx, o.y - 1) && !this.at(nx, o.y - 1)) this.move(top, nx, top.y);
      void ox;
    }
  }
}


// ---------------- SOLVER ----------------
// Tries every legal placement of the tray parts (each direction too) and reports the layouts that win.
// Parts that work without power may go on any free square; everything else is only useful on a wire square.
const OFFWIRE = { mirror: 1, chime: 1, spring: 1, food: 1, soundbot: 1, kettle: 1, cannon: 1, block: 1 };
function partDirs(t) { const r = TYPES[t] && TYPES[t].rot; return r === '4' ? [0, 1, 2, 3] : r === 'lr' ? [0, 2] : r === 'mirror' ? [0, 1] : r === 'axis' ? [3, 0] : [defaultDir(t)]; }
function layoutWins(L, placed) {
  const s = new Sim(L, placed); s.setPower(true);
  for (let i = 0; i < 160 && !s.won; i++) s.tick();
  if (s.won) return true;
  s.setPower(false);
  for (let i = 0; i < 120 && !s.won && !s.needsReset; i++) s.tick();
  return s.won;
}
// generator: yields {done, tried, total, wins:[...]} so a page can run it in slices without freezing
function* solveLevel(L, opts) {
  opts = opts || {};
  const maxWins = opts.maxWins || 1, limit = opts.limit || 400000;
  const items = []; for (const k in L.inv) for (let n = 0; n < L.inv[k]; n++) items.push(k);
  items.sort();
  const s0 = new Sim(L, []);
  const free = [], wires = [];
  for (let y = 0; y < L.h; y++) for (let x = 0; x < L.w; x++) {
    const i = s0.idx(x, y); if (s0.at(x, y) || s0.nobuild[i]) continue;
    free.push([x, y]); if (s0.wire[i]) wires.push([x, y]);
  }
  const cand = items.map(t => { const cs = OFFWIRE[t] ? free : wires; const out = []; for (const [x, y] of cs) for (const d of partDirs(t)) out.push({ t, x, y, d }); return out; });
  let total = 1; for (const c of cand) total *= Math.max(1, c.length);
  const wins = []; let tried = 0;
  const pick = [], used = new Set();
  function* rec(k, from) {
    if (tried >= limit || wins.length >= maxWins) return;
    if (k === items.length) {
      tried++;
      if (layoutWins(L, pick.map(p => Object.assign({}, p)))) wins.push(pick.map(p => [p.t, p.x, p.y, p.d]));
      if (tried % 40 === 0) yield { done: false, tried, total, wins };
      return;
    }
    // identical parts: keep them in increasing square order so each set is tried once
    const same = k > 0 && items[k] === items[k - 1];
    for (let j = same ? from : 0; j < cand[k].length; j++) {
      const c = cand[k][j], key = c.x + ',' + c.y; if (used.has(key)) continue;
      used.add(key); pick.push(c);
      yield* rec(k + 1, j + 1);
      pick.pop(); used.delete(key);
      if (tried >= limit || wins.length >= maxWins) return;
    }
  }
  yield* rec(0, 0);
  yield { done: true, tried, total, wins, capped: tried >= limit };
}
function verifySolution(L, sol) {
  if (!sol || !sol.length) return false;
  try { return layoutWins(L, sol.map(s => ({ t: s[0], x: s[1], y: s[2], d: s[3] == null ? defaultDir(s[0]) : s[3] }))); } catch (e) { return false; }
}

if (typeof module !== 'undefined') module.exports = { Sim, TYPES, BOT_TYPES, DX, DY, defaultDir, WIND_UP, BOT_EVERY, solveLevel, verifySolution, layoutWins, partDirs };
