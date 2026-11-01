// ===== VOLTWORKS game: rendering, input, UI, audio =====
(function () {
  const TICK = 220; // ms per simulation tick (slow enough to follow every step)
  const $ = s => document.querySelector(s);
  const cv = $('#board'), ctx = cv.getContext('2d');
  let DPR = 1, CW = 0, CH = 0;
  const L = { s: 60, ox: 0, oy: 0 };
  const G = {
    screen: 'title', li: 0, placed: [], uid: 0, sim: null, acc: 0, sel: null, hintStep: 0, ghosts: [],
    fx: true, parts: [], drag: null, hover: null, won: false, time: 0, shake: 0, sweep: 0, lastNote: 0, prevTarget: false,
  };
  let progress = { done: {} };
  try { const p = JSON.parse(localStorage.getItem('voltworks.v1')); if (p && p.done) progress = p; } catch (e) { }
  function saveProgress() { try { localStorage.setItem('voltworks.v1', JSON.stringify(progress)); } catch (e) { } }
  // ---- POINTS (like Candy Crush): every level scores points for finishing, speed and not using hints;
  // stars come from the points, total points decide your trophy rank and leaderboard place
  function levelParts(i) { const lv = LEVELS[i]; return lv ? Object.values(lv.inv || {}).reduce((s, n) => s + n, 0) : 1; }
  function parTime(i) { return 15 + 10 * levelParts(i); }   // seconds a good solve takes
  function levelScore(i, secs, hints) { return scoreFor(levelParts(i), secs, hints); }
  function scoreFor(parts, secs, hints) {
    const par = 15 + 10 * parts;
    const base = 1000, partsPts = 200 * parts;
    const speed = Math.max(0, Math.min(1, (3 * par - secs) / (2 * par)));   // full bonus at or under par, nothing at 3x par
    const timeBonus = Math.round(1500 * speed);
    const mult = Math.max(0.25, 1 - 0.25 * hints);
    const score = Math.round((base + partsPts + timeBonus) * mult / 10) * 10;
    const max = base + partsPts + 1500;
    const stars = score >= max * 0.85 ? 3 : score >= max * 0.6 ? 2 : 1;
    return { score, base, partsPts, timeBonus, mult, max, stars, par };
  }
  function bestStars(i) {
    if (progress.st && progress.st[i] != null) return progress.st[i];
    const u = progress.done[i]; return u == null ? 0 : u === 0 ? 3 : u <= 1 ? 2 : 1;   // saves from before points existed
  }
  function totalPoints() { return Object.keys(progress.pts || {}).filter(k => LEVELS[k]).reduce((s, k) => s + progress.pts[k], 0) + dailyPoints(); }
  const TROPHY_TIERS = [
    { name: 'Rookie', min: 0, col: '#8fa3bf' }, { name: 'Bronze', min: 5000, col: '#e39a5a' }, { name: 'Silver', min: 25000, col: '#dfe8f5' },
    { name: 'Gold', min: 75000, col: '#ffcf4d' }, { name: 'Platinum', min: 150000, col: '#8ff3ff' }, { name: 'Diamond', min: 250000, col: '#b48cff' },
    { name: 'Legend', min: 320000, col: '#ff6b9d' }];
  function trophyTier(p) { let t = TROPHY_TIERS[0]; for (const x of TROPHY_TIERS) if (p >= x.min) t = x; return t; }
  function nextTier(p) { return TROPHY_TIERS.find(x => x.min > p) || null; }

  // ---------------- AUDIO ----------------
  const AU = { ctx: null, muted: false };
  // background music: a soft, generated loop (warm pads, a gentle arpeggio and a little bass) that never repeats exactly
  const MUS = { on: true, timer: 0, next: 0, step: 0, out: null };
  try { MUS.on = localStorage.getItem('voltworks.music') !== '0'; } catch (e) { }
  let VIBE = true; try { VIBE = localStorage.getItem('voltworks.vibe') !== '0'; } catch (e) { }
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const CHORDS = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65], [50, 53, 57, 60], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 67]];
  function musicStart() {
    const a = AU.ctx; if (!a || MUS.timer) return;
    if (!MUS.out) { MUS.out = a.createGain(); MUS.out.gain.value = 0; const lp = a.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.connect(MUS.out); MUS.lp = lp; MUS.out.connect(a.destination); }
    MUS.next = a.currentTime + 0.15; MUS.timer = setInterval(musicTick, 200); musicLevel();
  }
  function musicStop() { clearInterval(MUS.timer); MUS.timer = 0; musicLevel(); }
  function musicLevel() { if (!MUS.out || !AU.ctx) return; const v = MUS.on ? (G.screen === 'play' || G.screen === 'edit' ? 0.05 : 0.09) : 0; MUS.out.gain.setTargetAtTime(v, AU.ctx.currentTime, 0.8); }
  function musicTick() { const a = AU.ctx; if (!a || document.hidden) return; while (MUS.next < a.currentTime + 0.7) { musicNote(MUS.step, MUS.next); MUS.next += 0.5; MUS.step++; } }
  function musicNote(step, t) {
    const a = AU.ctx, ch = CHORDS[Math.floor(step / 8) % CHORDS.length], s = step % 8;
    const voice = (type, f, g0, att, hold, rel, det) => { const o = a.createOscillator(), g = a.createGain(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(g0, t + att); g.gain.setValueAtTime(g0, t + att + hold); g.gain.exponentialRampToValueAtTime(0.0001, t + att + hold + rel);
      o.connect(g); g.connect(MUS.lp); o.start(t); o.stop(t + att + hold + rel + 0.05); };
    if (s === 0) { for (const n of ch) { voice('sine', mtof(n), 0.05, 1.2, 2.2, 1.8, 0); voice('triangle', mtof(n), 0.018, 1.4, 2, 1.8, 7); } voice('sine', mtof(ch[0] - 12), 0.11, 0.05, 0.6, 2.2, 0); }
    if (s === 4) voice('sine', mtof(ch[0] - 12), 0.07, 0.05, 0.3, 1.6, 0);
    const pat = [0, 2, 1, 3, 2, 1, 3, 2], skip = (step * 7919) % 11 === 0;
    if (!skip) voice('triangle', mtof(ch[pat[s]] + 12), 0.045, 0.01, 0.05, 0.9, 0);
    if (s === 6 && (step >> 3) % 2) voice('sine', mtof(ch[3] + 24), 0.02, 0.02, 0.05, 1.4, 0);
  }
  document.addEventListener('visibilitychange', () => { if (!AU.ctx) return; if (document.hidden) AU.ctx.suspend().catch(() => {}); else AU.ctx.resume().catch(() => {}); });
  try { AU.muted = localStorage.getItem('voltworks.muted') === '1'; } catch (e) { }
  function actx() {
    if (!AU.ctx) { try { AU.ctx = new (window.AudioContext || window.webkitAudioContext)(); AU.master = AU.ctx.createGain(); AU.master.gain.value = AU.muted ? 0 : 0.35; AU.master.connect(AU.ctx.destination); } catch (e) { } }
    if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume().catch(() => {});
    if (AU.ctx && MUS.on && !MUS.timer) musicStart();
    if (AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume();
    return AU.ctx;
  }
  function tone(type, f0, f1, dur, vol, delay) {
    const a = AU.ctx; if (!a || AU.muted) return;
    const t = a.currentTime + (delay || 0);
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AU.master); o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, q, delay) {
    const a = AU.ctx; if (!a || AU.muted) return;
    const t = a.currentTime + (delay || 0);
    const b = a.createBuffer(1, Math.max(1, a.sampleRate * dur), a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = a.createBufferSource(); s.buffer = b;
    const f = a.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq || 1200; f.Q.value = q || 0.8;
    const g = a.createGain(); g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(AU.master); s.start(t);
  }
  const SFX = {
    pick() { tone('sine', 520, 700, 0.07, 0.25); },
    place() { tone('sine', 240, 90, 0.12, 0.5); noise(0.05, 0.25, 900); },
    rotate() { tone('triangle', 600, 900, 0.08, 0.25); },
    remove() { tone('sine', 400, 160, 0.12, 0.25); },
    bad() { tone('square', 160, 120, 0.14, 0.12); },
    on() { tone('sawtooth', 70, 260, 0.35, 0.18); noise(0.06, 0.4, 3000); },
    off() { tone('sawtooth', 260, 60, 0.3, 0.14); },
    zap() { noise(0.18, 0.5, 2600, 2); tone('square', 900, 1800, 0.08, 0.06); },
    boom() { noise(0.45, 0.9, 220, 0.6); tone('sine', 120, 40, 0.35, 0.5); },
    crash() { noise(0.25, 0.7, 700, 0.7); tone('square', 110, 60, 0.15, 0.15); },
    tp() { tone('sine', 300, 1600, 0.25, 0.25); tone('sine', 450, 2200, 0.25, 0.12, 0.05); },
    boing() { tone('sine', 300, 700, 0.18, 0.3); tone('sine', 700, 350, 0.2, 0.15, 0.12); },
    beep() { tone('square', 1200, 0, 0.05, 0.08); tone('square', 1600, 0, 0.05, 0.08, 0.07); },
    charge() { tone('triangle', 400, 1200, 0.2, 0.2); },
    note(f) { tone('sine', f, 0, 0.9, 0.18); tone('sine', f * 2.01, 0, 0.5, 0.05); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => { tone('triangle', f, 0, 0.5, 0.25, i * 0.09); tone('sine', f / 2, 0, 0.6, 0.12, i * 0.09); }); },
    reset() { tone('sine', 500, 200, 0.2, 0.15); },
  };
  function sfx(n, a) { if (AU.ctx) SFX[n](a); }
  // ---- continuous machine sound bed: electric hum, crackle, air, water, steam, motors
  function loopNoise(a) { const b = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const n = a.createBufferSource(); n.buffer = b; n.loop = true; n.start(); return n; }
  function bed() {
    const a = AU.ctx; if (!a || AU.bed) return AU.bed;
    const mk = (src, type, f, q) => { const fl = a.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q || 0.7; const g = a.createGain(); g.gain.value = 0; src.connect(fl); fl.connect(g); g.connect(AU.master); return { g, fl }; };
    const hum1 = a.createOscillator(); hum1.type = 'sawtooth'; hum1.frequency.value = 100; hum1.start();
    const hum2 = a.createOscillator(); hum2.type = 'square'; hum2.frequency.value = 150; hum2.start();
    const hm = a.createGain(); hm.gain.value = 0.5; hum1.connect(hm); hum2.connect(hm);
    const mot = a.createOscillator(); mot.type = 'sawtooth'; mot.frequency.value = 48; mot.start();
    const lfo = a.createOscillator(); lfo.frequency.value = 7; const lg = a.createGain(); lg.gain.value = 6; lfo.connect(lg); lg.connect(mot.frequency); lfo.start();
    AU.bed = {
      hum: mk(hm, 'lowpass', 420, 1.2), crackle: mk(loopNoise(a), 'bandpass', 3800, 3),
      air: mk(loopNoise(a), 'bandpass', 700, 0.6), water: mk(loopNoise(a), 'bandpass', 1600, 1.4),
      steam: mk(loopNoise(a), 'highpass', 4500, 0.7), motor: mk(mot, 'lowpass', 260, 1),
    };
    return AU.bed;
  }
  function machineAudio(s) {
    const b = AU.ctx && bed(); if (!b) return;
    const t = AU.ctx.currentTime, set = (n, v) => b[n].g.gain.setTargetAtTime(AU.muted || G.screen !== 'play' ? 0 : v, t, 0.12);
    let live = 0; for (let i = 0; i < s.live.length; i++) live += s.live[i];
    const F = s.flows, on = s.everOn;
    const motors = on ? s.objs.filter(o => running(o) >= 0.4).length : 0;
    set('hum', on ? Math.min(0.05, live * 0.006) : 0);
    set('crackle', on ? Math.min(0.05, live * 0.004) * (Math.random() < 0.3 ? 1.6 : 0.4) : 0);
    set('air', on ? Math.min(0.22, F.air.length * 0.12) : 0);
    set('water', on ? Math.min(0.2, F.water.length * 0.12) * (0.8 + 0.4 * Math.random()) : 0);
    set('steam', on ? Math.min(0.12, F.steam.length * 0.08) : 0);
    set('motor', on ? Math.min(0.09, motors * 0.025) : 0);
  }
  document.addEventListener('visibilitychange', () => { if (!AU.ctx) return; if (document.hidden) AU.ctx.suspend(); else AU.ctx.resume(); });
  // ---- haptics (native app via Capacitor, browser vibrate otherwise)
  function haptic(kind) {
    if (!VIBE) return;
    try {
      const H = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics;
      if (H) { if (kind === 'success') H.notification({ type: 'SUCCESS' }); else H.impact({ style: kind === 'heavy' ? 'HEAVY' : kind === 'medium' ? 'MEDIUM' : 'LIGHT' }); return; }
      if (navigator.vibrate) navigator.vibrate(kind === 'heavy' ? 40 : kind === 'success' ? [30, 60, 30] : kind === 'medium' ? 20 : 8);
    } catch (e) { }
  }

  // ---------------- LEVEL / BOARD ----------------
  function level() { return G.screen === 'edit' && ED.lv ? ED.lv : (G.custom || LEVELS[G.li]); }
  function rebuild() {
    const s = new Sim(level(), []);
    G.placed.forEach(p => { const o = s.add(p.t, p.x, p.y, p.d, false); if (o) { o.pid = p.uid; o.born = p.born; } });
    s.objs.forEach(o => { o.rx = o.x; o.ry = o.y; });
    G.sim = s; G.won = false; G.pendingWin = null; G.acc = 0; G.prevTarget = false; G.dist = null;
    $('#win').hidden = true;
    updatePanel();
  }
  function editable() { return G.sim && !G.sim.everOn && !G.won; }
  function loadLevel(i) {
    G.custom = null; G.daily = null; G.testing = false;
    startView();
    G.li = i; G.levelT0 = G.time; markDay(); G.placed = []; G.hintStep = 0; G.hintShow = null; G.ghosts = []; G.sel = null; G.parts = []; G.idle = 0; G.tutStep = 0;
    rebuild();
    buildInventory();
    const lv = level();
    $('#lvlNum').textContent = String(i + 1);
    $('#lvlName').textContent = lv.name; $('.lvK').textContent = 'LEVEL';
    $('#app').classList.remove('editing', 'testing');
    if (i === 0) setTip(null, 'HOW TO PLAY', 'Parts work only on wires', 'Drag a part onto a wire square. Light, air, water and steam travel across empty squares. Tap a part to turn it, then tap the Power Box to switch on.');
    else if (lv.intro) setTip(lv.intro[0], 'NEW PART', TYPES[lv.intro[0]].name, TYPES[lv.intro[0]].desc + (lv.intro.length > 1 ? ' Also new: ' + lv.intro.slice(1).map(m => TYPES[m].name).join(', ') + '.' : ''));
    else setTip(null, lv.w * lv.h > 96 ? 'BIG BOARD' : 'CHALLENGE', lv.name, lv.hint || 'Combine everything you have learned. Stuck? Tap the light bulb.');
    showScreen('play');
    requestAnimationFrame(() => { resize(); G.sweep = 1; });
    levelIntro(i);
  }
  function resetBoard(msg) {
    rebuild();
    G.sweep = 1;
    sfx('reset');
    if (msg) toast(msg);
  }
  function togglePower() {
    actx(); G.idle = 0;
    if (!G.sim || G.won) return;
    // switching OFF before the level is solved puts every part back where you placed it straight away,
    // so you can move things immediately (no waiting for the board to settle)
    if (G.sim.on && !G.pendingWin) { sfx('off'); haptic('medium'); rebuild(); G.sweep = 1; updatePanel(); return; }
    G.sim.setPower(!G.sim.on);
    sfx(G.sim.on ? 'on' : 'off'); haptic('medium');
    if (G.sim.on) { G.acc = TICK; G.sel = null; }
    const p = G.sim.objs.find(o => o.t === 'power');
    if (p) burst(p.x + 0.5, p.y + 0.5, G.sim.on ? '#3dff9a' : '#ff4d5e', 14, 3);
    updatePanel();
  }

  // ---------------- PANEL / UI ----------------
  const CAT = { bulb: 'light', solar: 'light', laser: 'light', feeder: 'light', mirror: 'light', chargelight: 'light',
    fan: 'air', chargefan: 'air', generator: 'air', chime: 'air',
    kettle: 'heat', heater: 'heat', steamdet: 'heat',
    battery: 'elec', wsender: 'elec', wreceiver: 'elec', tpsend: 'elec', tprecv: 'elec',
    pushbot: 'bot', pullbot: 'bot', helibot: 'bot', carrierbot: 'bot', soundbot: 'bot', spybot: 'bot',
    balldrop: 'tool', cannon: 'tool', drill: 'tool', rotator: 'tool', spring: 'tool', food: 'tool', hamster: 'tool' };
  function invLeft(t) { const lv = level(); return (lv.inv[t] || 0) - G.placed.filter(p => p.t === t).length; }
  function iconCanvas(t, px, cls) {
    const ic = document.createElement('canvas'); ic.width = px; ic.height = px; if (cls) ic.className = cls;
    const c = ic.getContext('2d'); c.translate(px / 2, px / 2); c.scale(px * 0.86, px * 0.86);
    paintObj(c, fakeObj(t), 0.8); return ic;
  }
  // a glowing arrow at the tray edge whenever more parts are hidden off to the side, so nothing is ever missed
  function trayHint() {
    const box = $('#inv'), hint = $('#trayHint'); if (!hint) return;
    const ax = trayAxis();
    const more = ax === 'x' ? box.scrollLeft + box.clientWidth < box.scrollWidth - 6 : ax === 'y' ? box.scrollTop + box.clientHeight < box.scrollHeight - 6 : false;
    hint.hidden = !more; hint.classList.toggle('down', ax === 'y');
  }
  function buildInventory() {
    const box = $('#inv'); box.innerHTML = ''; box.scrollLeft = 0; box.scrollTop = 0; box.style.setProperty('--rows', 1); requestAnimationFrame(trayHint);
    Object.keys(level().inv).forEach(t => {
      const b = document.createElement('button');
      b.className = 'card c-' + (CAT[t] || 'elec'); b.dataset.t = t; b.type = 'button';
      b.setAttribute('aria-label', TYPES[t].name);
      const well = document.createElement('span'); well.className = 'well'; well.appendChild(iconCanvas(t, 128, 'icon'));
      const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = TYPES[t].name;
      const ct = document.createElement('span'); ct.className = 'ct';
      b.append(well, nm, ct);
      b.addEventListener('pointerdown', e => cardDown(e, t, b));
      b.addEventListener('click', e => e.preventDefault());
      box.appendChild(b);
    });
    updatePanel();
  }
  function fakeObj(t) { return { t, d: defaultDir(t), powered: false, charge: 0, mode: 'go' }; }
  function updatePanel() {
    document.querySelectorAll('#inv .card').forEach(b => {
      const t = b.dataset.t, n = invLeft(t);
      b.querySelector('.ct').textContent = n;
      b.classList.toggle('empty', n <= 0);
      b.classList.toggle('sel', G.sel === t);
    });
    const on = G.sim && G.sim.on;
    const pb = $('#powerBtn');
    pb.classList.toggle('on', !!on);
    pb.setAttribute('aria-pressed', on ? 'true' : 'false');
    $('#powerState').textContent = on ? 'ON' : 'POWER';
    $('#app').classList.toggle('running', !!(G.sim && G.sim.everOn));
  }
  function setTip(t, tag, title, text) {
    $('#tipTag').textContent = tag; $('#tipTitle').textContent = title; $('#tipText').textContent = text;
    const ic = $('#tipIcon'), c = ic.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 96, 96);
    c.translate(48, 48); c.scale(80, 80);
    if (t) paintObj(c, fakeObj(t), 0.8);
    else { glowAt(c, 0, 0, 0.6, COL.volt, 0.5); bolt(c, 0, 0, 0.7, true); }
  }
  function setInfo(t, tag) { setTip(t, tag, TYPES[t].name, TYPES[t].desc); }
  let toastTimer = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.hidden = false; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 2400); }
  function showScreen(s) {
    if (s !== 'edit') $('#app').classList.remove('editing');
    if (s === 'play' || s === 'edit') G.lastGame = s;
    G.screen = s;
    document.body.classList.toggle('inGame', s === 'play' || s === 'edit');
    $('#title').hidden = s !== 'title';
    $('#levels').hidden = s !== 'levels';
    $('#account').hidden = s !== 'account';
    $('#awards').hidden = s !== 'awards'; $('#leader').hidden = s !== 'leader'; $('#settings').hidden = s !== 'settings'; $('#shop').hidden = s !== 'shop'; $('#daily').hidden = s !== 'daily'; $('#stats').hidden = s !== 'stats';
    const menu = ['title', 'levels', 'awards', 'leader', 'settings', 'shop', 'daily', 'stats'].includes(s);
    document.body.classList.toggle('menu', menu);
    document.querySelectorAll('#tabbar .tab').forEach(b => b.classList.toggle('on', b.dataset.tab === s));
    if (s === 'title') updateHome(); if (s === 'settings') updateSettings();
    if (typeof musicLevel === 'function') musicLevel();
    if (s === 'awards') buildAwards(); if (s === 'leader') buildLeader(); if (s === 'title') updateTrophyBadge();
    if (s === 'levels') buildLevelGrid();
    if (s === 'shop') buildShop();
    if (s === 'daily') buildDaily();
    if (s === 'stats') buildStats();
    if (s === 'title') updateDailyCard();
    refreshBanner(); updateMoneyUI();
    if (s === 'title') { updateAcctChip(); if (typeof updateSignRow === 'function') updateSignRow(); }
  }
  const CHAPTERS = [
    { name: 'Power Lab', sub: 'Light, wind, water and steam', from: 0, to: 9, cls: 'c-elec' },
    { name: 'Bot Garage', sub: 'Robots, springs and music', from: 10, to: 13, cls: 'c-bot' },
    { name: 'Demolition Yard', sub: 'Balls, cannons and drills', from: 14, to: 17, cls: 'c-heat' },
    { name: 'Machine Works', sub: 'Lifters, teleporters and spies', from: 18, to: 24, cls: 'c-tool' },
    { name: 'Chain Reaction', sub: 'Two and three jumps of power', from: 25, to: 39, cls: 'c-elec' },
    { name: 'Obstacle Course', sub: 'Clear the way, ignore the decoys', from: 40, to: 59, cls: 'c-heat' },
    { name: 'Power Grid', sub: 'Bigger boards: pinch to zoom, drag to explore', from: 60, to: 79, cls: 'c-tool' },
    { name: 'Overload', sub: 'The hardest machines ever built', from: 80, to: 99, cls: 'c-bot' },
  ];
  function unlockedUpTo() { if (progress.all) return LEVELS.length - 1; let i = 0; while (i < LEVELS.length && progress.done[i] != null) i++; return Math.min(LEVELS.length - 1, i); }
  function starsFor(i) { return bestStars(i); }
  function buildLevelGrid() {
    const sc = $('#lvlScroll'); sc.innerHTML = '';
    const open = unlockedUpTo();
    if (customs.length) sc.appendChild(buildMyLevels());
    CHAPTERS.forEach(ch => {
      const sec = document.createElement('section'); sec.className = 'chap ' + ch.cls;
      sec.innerHTML = '<h3></h3><div class="lvGrid"></div>';
      sec.querySelector('h3').innerHTML = ch.name + ' <small></small>'; sec.querySelector('small').textContent = ch.sub;
      const g = sec.querySelector('.lvGrid');
      for (let i = ch.from; i <= ch.to; i++) {
        const b = document.createElement('button'); b.type = 'button';
        const locked = i > open, st = starsFor(i);
        b.className = 'lv ' + ch.cls + (locked ? ' locked' : '') + (i === open && progress.done[i] == null && !progress.all ? ' next' : '');
        b.innerHTML = '<span class="tile"></span><span class="stars"></span><span class="nm"></span>';
        if (locked) b.querySelector('.tile').innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="#3d5a80" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>';
        else b.querySelector('.tile').textContent = String(i + 1);
        b.querySelector('.stars').innerHTML = locked ? '' : [0, 1, 2].map(k => '<span class="' + (k < st ? '' : 'off') + '">★</span>').join('');
        b.querySelector('.nm').textContent = LEVELS[i].name;
        b.addEventListener('click', () => { actx(); if (locked) { sfx('bad'); toast('Finish level ' + (open + 1) + ' to unlock this one, or unlock all levels in the Shop.'); return; } sfx('pick'); loadLevel(i); });
        g.appendChild(b);
      }
      sc.appendChild(sec);
    });
    if (LEVELS.length < MAX_LEVELS) { const more = document.createElement('div'); more.className = 'sCard moreSoon'; more.innerHTML = '<div class="sIc">⚡</div><div class="sTx"><b>More levels coming soon</b><span>New levels arrive online. No update needed.</span></div>'; sc.appendChild(more); }
    if (!customs.length) sc.appendChild(buildMyLevels());
    if (!progress.all) {
      const card = document.createElement('div'); card.className = 'sCard unlockCard';
      card.innerHTML = '<div class="sIc">' + ICON_LOCK + '</div><div class="sTx"><b>Unlock all 100 levels</b><span>Jump to any level, no waiting</span></div><button class="sBuy" type="button">' + priceOf('all') + '</button>';
      card.querySelector('.sBuy').addEventListener('click', () => { actx(); sfx('pick'); MONEY.buy('all').then(r => { if (r === 'ok') buildLevelGrid(); }); });
      sc.insertBefore(card, sc.firstChild);
    }
    if (window.__VWdev) {
      const dev = document.createElement('div'); dev.className = 'devRow';
      dev.innerHTML = '<button id="unlockAll" type="button"></button>';
      const ub = dev.querySelector('button'); ub.textContent = progress.all ? 'Lock levels again' : 'Unlock all levels (testing)';
      ub.addEventListener('click', () => { progress.all = !progress.all; saveProgress(); buildLevelGrid(); });
      sc.appendChild(dev);
    }
  }
  function showWin() {
    if (G.daily) return showDailyWin();
    if (G.custom) return showCustomWin();
    const used = G.hintStep;
    const dailyWasOpen = dailyOpen();
    const prev = progress.done[G.li];
    progress.done[G.li] = prev == null ? used : Math.min(prev, used);
    const secs = Math.max(1, Math.round(G.time - (G.levelT0 || G.time)));
    progress.time = progress.time || {}; progress.time[G.li] = progress.time[G.li] ? Math.min(progress.time[G.li], secs) : secs;
    const sc = levelScore(G.li, secs, used), prevPts = (progress.pts || {})[G.li] || 0, tierBefore = trophyTier(totalPoints());
    progress.pts = progress.pts || {}; progress.st = progress.st || {};
    if (sc.score > prevPts) { progress.pts[G.li] = sc.score; addPeriodPoints(sc.score - prevPts); }
    progress.st[G.li] = Math.max(progress.st[G.li] || 0, sc.stars);
    G.lastSolve = { li: G.li, secs, used, sc, newBest: sc.score > prevPts, prevPts, tierBefore };
    const fresh = checkAwards(true);
    saveProgress(); if (Cloud.user() && Cloud.enabled()) Cloud.saveProgressCloud(progress).catch(() => {});
    pushScore(); reportStats(true);
    if (!dailyWasOpen && dailyOpen()) setTimeout(() => toast('🔥 Daily Challenges unlocked! 5 new hard puzzles every day, on the Home screen.'), 1400);
    showWinAwards(fresh, secs);
    const stars = G.lastSolve.sc.stars;
    const st = $('#winStars').children;
    for (let k = 0; k < 3; k++) { st[k].className = ''; void st[k].offsetWidth; if (k < stars) st[k].className = 'on'; }
    $('#winRibbon').textContent = 'CIRCUIT COMPLETE';
    $('#winName').textContent = 'Level ' + (G.li + 1) + ' · ' + level().name;
    const last = G.li >= LEVELS.length - 1;
    $('#winNext').hidden = last; $('#winLevels').hidden = !last;
    $('#winMsg').textContent = last ? 'You finished every level in this build!' : (stars < 3 ? (used ? 'Used ' + used + ' hint' + (used > 1 ? 's' : '') + '. Solve it faster without hints for 3 stars.' : 'Solve it faster for 3 stars: par is ' + fmtTime(G.lastSolve.sc.par) + '.') : used ? 'Great solve!' : 'Perfect: fast and no hints!');
    $('#winVideo').hidden = MONEY.hintsLeft() >= 3 || !MONEY.rewardedOn();
    $('#win').hidden = false;
    [0, 1, 2].forEach(k => { if (k < stars) setTimeout(() => sfx('note', 784 + k * 200), 180 * k + 120); });
  }
  // Hint ladder: 1 gentle nudge -> 2 the key trick -> 3+ outline each part's square, one per tap
  // Hint = an animated hand that shows the next part to place: it drags the part from the tray (or from
  // the wrong square) to the right square, then taps it to turn it if it has to face another way.
  function hint() {
    actx(); G.idle = 0;
    const lv = level();
    if (G.sim.everOn) resetBoard();
    const ok = s => G.placed.some(p => p.t === s[0] && p.x === s[1] && p.y === s[2] && p.d === (s[3] == null ? defaultDir(s[0]) : s[3]));
    const s = lv.sol.find(q => !ok(q));
    if (!s) { toast('All parts are in place. Tap the Power Box!'); G.hintShow = { power: true, until: G.time + 6 }; return; }
    // hints cost one from the wallet (3 free for the whole game, then bought ones or a video ad);
    // showing the same part again in this level is free, and your own levels always have free hints
    if ((!G.custom || G.daily) && !G.testing) {
      const key = (G.daily ? 'd' + G.daily.date + G.daily.k : G.li) + ':' + lv.sol.indexOf(s);
      G.paidHints = G.paidHints || new Set();
      if (!G.paidHints.has(key)) {
        if (!MONEY.spendHint()) { openHintPop(); return; }
        G.paidHints.add(key);
      }
    }
    G.hintStep++;
    G.hintShow = { s, until: G.time + 9 };
    G.ghosts = G.ghosts.filter(g => !(g.x === s[1] && g.y === s[2])); G.ghosts.push({ t: s[0], x: s[1], y: s[2], d: s[3] == null ? defaultDir(s[0]) : s[3] });
    setTip(s[0], 'HINT', TYPES[s[0]].name, 'Watch the hand.');
    sfx('beep');
  }
  // ---------------- INPUT ----------------
  // One pointer gesture model for mouse and touch:
  //  * tray: swipe along the tray scrolls it; move toward the board (or long-press) picks the part up
  //  * the picked-up part floats above your finger; it lands in the square under the floating part
  //  * board: tap a part to turn it, drag it to move it, drag it off the board to return it
  function cellAt(px, py) {
    const x = Math.floor((px - L.ox) / L.s), y = Math.floor((py - L.oy) / L.s);
    return { x, y, inb: !!(G.sim && G.sim.inb(x, y)) };
  }
  function canPlace(x, y, ignore) {
    const s = G.sim; if (!s.inb(x, y)) return false;
    if (s.nobuild[s.idx(x, y)]) return false;
    const o = s.at(x, y); return !o || o === ignore;
  }
  // The board canvas is tilted back in 3D (CSS perspective + rotateX around the bottom-centre of the play area).
  // toScreen maps canvas pixels to screen pixels; boardPt does the reverse for touches.
  const TILT = { a: 0, p: 1000, ox: 0, oy: 0 };
  function toScreen(px, py) {
    const X = px - TILT.ox, Y = py - TILT.oy, sa = Math.sin(TILT.a), ca = Math.cos(TILT.a);
    const s = TILT.p / (TILT.p - Y * sa);
    return { x: TILT.ox + X * s, y: TILT.oy + Y * ca * s };
  }
  function boardPt(clientX, clientY) {
    const X = clientX - TILT.ox, Y = clientY - TILT.oy, sa = Math.sin(TILT.a), ca = Math.cos(TILT.a);
    const y = Y * TILT.p / (TILT.p * ca + Y * sa), s = TILT.p / (TILT.p - y * sa);
    return { x: TILT.ox + X / s, y: TILT.oy + y };
  }
  function lockedMsg() { toast(G.won ? 'Level complete!' : 'Turn the power OFF to change the machine.'); sfx('bad'); haptic('light'); }
  const inv = $('#inv'), ghostEl = $('#dragGhost'), ghostCv = ghostEl.querySelector('canvas'), ghostLbl = ghostEl.querySelector('.lbl');
  const portraitMQ = window.matchMedia('(max-aspect-ratio: 11/10)');
  function trayAxis() { // portrait: one swipeable row (drag parts UP); landscape: a column (drag parts LEFT)
    if (portraitMQ.matches) return inv.scrollWidth > inv.clientWidth + 2 ? 'x' : null;
    return inv.scrollHeight > inv.clientHeight + 2 ? 'y' : null;
  }
  let gest = null, inertia = null;
  function cardDown(e, t, el) {
    actx(); G.idle = 0; e.preventDefault();
    inertia = null;
    gest = { kind: 'card', t, el, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, mode: 'pending', touch: e.pointerType !== 'mouse',
      sl: inv.scrollLeft, st: inv.scrollTop, hist: [[e.clientX, e.clientY, performance.now()]] };
    try { el.setPointerCapture(e.pointerId); } catch (err) { }
    gest.timer = setTimeout(() => { if (gest && gest.mode === 'pending') beginDrag(gest, true); }, 260);
    el.classList.add('lift');
  }
  function beginDrag(g, longPress) {
    clearTimeout(g.timer);
    if (g.el) g.el.classList.remove('lift');
    if (!editable()) { g.mode = 'dead'; lockedMsg(); return; }
    if (g.kind === 'card' && invLeft(g.t) <= 0) { g.mode = 'dead'; toast('No more ' + TYPES[g.t].name + ' left. Drag one off the board to reuse it.'); sfx('bad'); return; }
    g.mode = 'drag'; G.sel = null; updatePanel();
    G.drag = { kind: g.kind, t: g.t, d: g.d != null ? g.d : defaultDir(g.t), uid: g.uid, moved: true };
    setInfo(g.t, 'PART');
    sfx('pick'); haptic(longPress ? 'medium' : 'light');
    ghostEl.hidden = false; ghostEl.style.opacity = '1';
    moveGhost(g);
  }
  function ghostPoint(g) { return { x: g.x, y: g.y - (g.touch ? Math.max(46, L.s * 0.75) : 0) }; }
  function moveGhost(g) {
    const gp = ghostPoint(g);
    const sz = Math.max(76, Math.min(130, L.s * 1.25));
    ghostEl.style.width = ghostEl.style.height = sz + 'px'; ghostEl.style.margin = (-sz / 2) + 'px 0 0 ' + (-sz / 2) + 'px';
    ghostEl.style.transform = 'translate3d(' + gp.x + 'px,' + gp.y + 'px,0)';
    const bp = boardPt(gp.x, gp.y);
    G.pointer = bp; G.hover = cellAt(bp.x, bp.y);
    const off = !G.hover.inb;
    ghostLbl.hidden = !off; if (off) ghostLbl.textContent = g.kind === 'board' ? 'Release to put back' : 'Drop on the board';
  }
  function drawGhostCanvas(T) {
    if (ghostEl.hidden || !G.drag) return;
    const c = ghostCv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 220, 220);
    c.translate(110, 110); c.scale(170, 170);
    glowAt(c, 0, 0, 0.62, '#ffffff', 0.22);
    paintObj(c, { t: G.drag.t, d: G.drag.d, powered: false, charge: 0, mode: 'go' }, T);
  }
  window.addEventListener('pointermove', e => {
    if (G.screen !== 'play') return;
    if (!gest || e.pointerId !== gest.id) { if (!gest && e.pointerType === 'mouse') { const bp = boardPt(e.clientX, e.clientY); G.pointer = bp; G.hover = cellAt(bp.x, bp.y); } return; }
    gest.x = e.clientX; gest.y = e.clientY; gest.hist.push([e.clientX, e.clientY, performance.now()]); if (gest.hist.length > 6) gest.hist.shift();
    const dx = e.clientX - gest.sx, dy = e.clientY - gest.sy, dist = Math.hypot(dx, dy);
    if (gest.kind === 'pan') {
      if (pinch) return;
      if (gest.mode === 'pending' && dist > 8) gest.mode = 'pan';
      if (gest.mode === 'pan') { VIEW.px = gest.px0 + dx; VIEW.py = gest.py0 + dy; applyView(); }
      return;
    }
    if (gest.mode === 'pending' && dist > 7) {
      const ax = gest.kind === 'card' ? trayAxis() : null;
      const along = ax === 'x' ? Math.abs(dx) : ax === 'y' ? Math.abs(dy) : 0, across = ax === 'x' ? Math.abs(dy) : ax === 'y' ? Math.abs(dx) : dist;
      if (ax && along > across * 1.1) { gest.mode = 'scroll'; clearTimeout(gest.timer); gest.el && gest.el.classList.remove('lift'); }
      else beginDrag(gest, false);
    }
    if (gest.mode === 'scroll') { if (trayAxis() === 'x') inv.scrollLeft = gest.sl - dx; else inv.scrollTop = gest.st - dy; trayHint(); }
    if (gest.mode === 'drag') moveGhost(gest);
  });
  function endGesture(e, cancelled) {
    const g = gest; if (!g || (e && e.pointerId !== g.id)) return;
    gest = null; clearTimeout(g.timer); if (g.el) g.el.classList.remove('lift');
    ghostEl.hidden = true;
    const d = G.drag; G.drag = null;
    if (G.screen !== 'play' || cancelled) return;
    if (g.mode === 'scroll') { // fling
      const h = g.hist, a = h[0], b = h[h.length - 1], dt = Math.max(16, b[2] - a[2]);
      inertia = { vx: (b[0] - a[0]) / dt * 16, vy: (b[1] - a[1]) / dt * 16 };
      return;
    }
    if (g.kind === 'pan') { if (g.mode === 'pending') tapEmpty(g); return; }
    if (g.mode === 'pending') { // tap
      if (g.kind === 'card') {
        if (!editable()) { lockedMsg(); return; }
        G.sel = G.sel === g.t ? null : g.t; updatePanel(); setInfo(g.t, 'PART');
        if (G.sel) toast('Now tap a square to place it, or drag it there.');
        sfx('pick'); haptic('light');
      } else if (g.kind === 'board') tapBoardPart(g);
      return;
    }
    if (g.mode !== 'drag' || !d) return;
    const gp = ghostPoint(g), bp = boardPt(gp.x, gp.y), c = cellAt(bp.x, bp.y);
    G.dropFrom = { x: (bp.x - L.ox) / L.s - 0.5, y: (bp.y - L.oy) / L.s - 0.5, t: G.time };
    if (d.kind === 'card') {
      if (c.inb && canPlace(c.x, c.y) && invLeft(d.t) > 0) place(d.t, c.x, c.y, d.d);
      else { sfx('bad'); if (c.inb) toast('That square is taken.'); }
      return;
    }
    const pl = G.placed.find(q => q.uid === d.uid); if (!pl) return;
    if (c.inb) {
      const self = G.sim.objs.find(q => q.pid === pl.uid);
      if (canPlace(c.x, c.y, self)) { wireWarn(pl.t, c.x, c.y); pl.x = c.x; pl.y = c.y; pl.born = G.time; G.placed = G.placed.filter(q => q !== pl).concat([pl]); rebuild(); sfx('place'); haptic('light'); dust(c.x + 0.5, c.y + 0.5); }
      else { sfx('bad'); rebuild(); }
    } else { G.placed = G.placed.filter(q => q !== pl); rebuild(); sfx('remove'); haptic('light'); }
  }
  window.addEventListener('pointerup', e => endGesture(e, false));
  window.addEventListener('pointercancel', e => endGesture(e, true));
  // iOS / in-app viewers: never let the page itself scroll while playing
  const stopScroll = e => { if (e.target.closest && e.target.closest('#editDock, #edModal')) return; if ((G.screen === 'play' || G.screen === 'edit') && e.cancelable) e.preventDefault(); };
  ['#board', '#inv', '#dock', '#hud', '#tip'].forEach(sel => $(sel).addEventListener('touchmove', stopScroll, { passive: false }));
  document.addEventListener('touchmove', e => { if (gest && e.cancelable) e.preventDefault(); }, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault());

  const touches = new Map(); let pinch = null, lastTap = 0;
  function startPinch() {
    const [a, b] = [...touches.values()];
    pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: VIEW.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
  }
  cv.addEventListener('pointerdown', e => {
    actx(); G.idle = 0; inertia = null;
    if (G.screen !== 'play' && G.screen !== 'edit') return;
    const p = boardPt(e.clientX, e.clientY);
    touches.set(e.pointerId, p);
    if (touches.size === 2) { // second finger: cancel whatever the first finger was doing and pinch
      if (gest) { clearTimeout(gest.timer); if (gest.el) gest.el.classList.remove('lift'); gest = null; G.drag = null; ghostEl.hidden = true; }
      startPinch(); return;
    }
    if (touches.size > 2) return;
    if (G.screen === 'edit') { edDown(e, p); return; }
    const c = cellAt(p.x, p.y);
    const o = c.inb ? G.sim.at(c.x, c.y) : null;
    if (!o) { // empty square or margin: tap to place, drag to move the board, double-tap to zoom
      gest = { kind: 'pan', id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, mode: 'pending', px0: VIEW.px, py0: VIEW.py, cell: c, hist: [] };
      try { cv.setPointerCapture(e.pointerId); } catch (err) { }
      return;
    }
    if (o && o.t === 'power') { togglePower(); return; }
    if (o) {
      setInfo(o.t, o.fixed ? 'FIXED PART · BOTS CAN MOVE IT' : 'YOUR PART · TAP TO TURN');
      if (!o.fixed) {
        if (!editable()) { lockedMsg(); return; }
        gest = { kind: 'board', t: o.t, d: o.d, uid: o.pid, id: e.pointerId, sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, mode: 'pending', touch: e.pointerType !== 'mouse', hist: [] };
        try { cv.setPointerCapture(e.pointerId); } catch (err) { }
        gest.timer = setTimeout(() => { if (gest && gest.mode === 'pending') beginDrag(gest, true); }, 320);
      } else { sfx('pick'); }
      return;
    }
  });
  cv.addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, boardPt(e.clientX, e.clientY));
    if (pinch && touches.size >= 2) {
      const [a, b] = [...touches.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      zoomAt(pinch.mx, pinch.my, pinch.z0 * d / pinch.d0);
      VIEW.px += mx - pinch.mx; VIEW.py += my - pinch.my; applyView();
      pinch.mx = mx; pinch.my = my; pinch.z0 = VIEW.z; pinch.d0 = d;
    }
  });
  const touchEnd = e => { touches.delete(e.pointerId); if (touches.size < 2) pinch = null; };
  cv.addEventListener('pointerup', touchEnd); cv.addEventListener('pointercancel', touchEnd);
  cv.addEventListener('wheel', e => { if (G.screen !== 'play') return; e.preventDefault(); const p = boardPt(e.clientX, e.clientY); zoomAt(p.x, p.y, VIEW.z * Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
  function tapEmpty(g) {
    const now = performance.now(), c = g.cell;
    // the Power Box on the board is the switch: tap it to turn the power on or off
    if (c && c.inb && G.sim) { const o = G.sim.at(c.x, c.y); if (o && o.t === 'power') { lastTap = 0; togglePower(); return; } }
    if (now - lastTap < 320) { lastTap = 0; const p = boardPt(g.x, g.y); if (VIEW.z > 1.03) resetView(); else zoomAt(p.x, p.y, 2); sfx('pick'); return; }
    lastTap = now;
    if (c && c.inb && G.sel && editable()) {
      if (invLeft(G.sel) > 0 && canPlace(c.x, c.y)) place(G.sel, c.x, c.y, defaultDir(G.sel));
      else sfx('bad');
    }
  }
  function tapBoardPart(g) {
    const pl = G.placed.find(q => q.uid === g.uid); if (!pl) return;
    if (TYPES[pl.t].rot) {
      pl.d = nextDir(pl.t, pl.d); rebuild(); sfx('rotate'); haptic('light');
      const no = G.sim.objs.find(q => q.pid === pl.uid); if (no) no.spin = G.time;
    } else { sfx('pick'); toast(TYPES[pl.t].name + ' has no direction. Drag it to move it.'); }
  }
  function nextDir(t, d) { const r = TYPES[t].rot; if (r === '4') return (d + 1) % 4; if (r === 'lr') return d === 0 ? 2 : 0; if (r === 'mirror') return d ^ 1; if (r === 'axis') return d % 2 ? 0 : 3; return d; }
  const PASSIVE = { mirror: 1, chime: 1, spring: 1, food: 1, soundbot: 1, kettle: 1, block: 1 };
  function wireWarn(t, x, y) { if (!PASSIVE[t] && !G.sim.wire[G.sim.idx(x, y)]) toast(TYPES[t].name + ' is not on a wire, so it gets no power.'); }
  function place(t, x, y, d) {
    wireWarn(t, x, y);
    G.placed.push({ uid: ++G.uid, t, x, y, d, born: G.time });
    G.ghosts = G.ghosts.filter(g => !(g.x === x && g.y === y && g.t === t));
    rebuild(); sfx('place'); haptic('light'); dust(x + 0.5, y + 0.5); burst(x + 0.5, y + 0.5, '#ffffff', 8, 1.5);
    if (invLeft(t) <= 0 && G.sel === t) { G.sel = null; updatePanel(); }
  }
  function stepInertia() {
    if (!inertia) return;
    if (trayAxis() === 'x') inv.scrollLeft -= inertia.vx; else inv.scrollTop -= inertia.vy; trayHint();
    inertia.vx *= 0.93; inertia.vy *= 0.93;
    if (Math.abs(inertia.vx) + Math.abs(inertia.vy) < 0.3) inertia = null;
  }
  window.addEventListener('wheel', e => { if (G.screen === 'play' && e.target.closest && e.target.closest('#inv')) { if (trayAxis() === 'x') inv.scrollLeft += e.deltaY + e.deltaX; else inv.scrollTop += e.deltaY; } }, { passive: true });
  window.addEventListener('keydown', e => {
    if (G.screen !== 'play') return;
    if (e.key === ' ' || e.key === 'Enter') { if (document.activeElement && document.activeElement.tagName === 'BUTTON') return; e.preventDefault(); togglePower(); }
    if (e.key === 'r' || e.key === 'R') resetBoard();
    if (e.key === 'h' || e.key === 'H') hint();
  });



  // ---------------- REWARDS (achievements) ----------------
  const ICONS = {
    bolt: 'M13 2L4 14h7l-1 8 9-12h-7z',
    star: 'M12 2.5l2.9 6.2 6.8.8-5 4.6 1.4 6.7L12 17.4l-6.1 3.4 1.4-6.7-5-4.6 6.8-.8z',
    bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.8 10.6c.6.5.8 1.2.8 1.9V16h6v-.5c0-.7.2-1.4.8-1.9A6 6 0 0 0 12 3z',
    watch: 'M9 2h6M12 2v3M12 9v4l3 2M19 13a7 7 0 1 1-14 0 7 7 0 0 1 14 0z',
    trophy: 'M8 21h8M12 16v5M7 3h10v6a5 5 0 0 1-10 0V3zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3',
    medal: 'M8 2l4 6 4-6M18 15a6 6 0 1 1-12 0 6 6 0 0 1 12 0zM12 12v6M9.5 14.5L12 12l2.5 2.5',
    crown: 'M3 19h18M4 7l4.5 5L12 5l3.5 7L20 7l-1.5 10h-13z',
    wrench: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',
    share: 'M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4',
    flame: 'M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z',
    shield: 'M12 2l8 4v6c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z M8.5 12l2.5 2.5 4.5-5',
    podium: 'M3 21v-7h6v7M9 21V8h6v13M15 21v-5h6v5M3 21h18',
  };
  const svgIcon = (k, cls) => '<svg class="' + (cls || 'ic') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + ICONS[k] + '"/></svg>';
  const starsOf = i => bestStars(i);
  const nDone = () => Object.keys(progress.done).filter(k => LEVELS[k]).length;
  const nThree = () => Object.keys(progress.done).filter(k => LEVELS[k] && bestStars(+k) === 3).length;
  const nNoHint = () => Object.keys(progress.done).filter(k => LEVELS[k] && progress.done[k] === 0).length;
  const totalStars = () => LEVELS.reduce((s, _, i) => s + starsOf(i), 0);
  const fastCount = lim => Object.values(progress.time || {}).filter(v => v <= lim).length;
  const chapterDone = ch => { for (let i = ch.from; i <= ch.to; i++) if (progress.done[i] == null) return false; return true; };
  const chapterPerfect = ch => { for (let i = ch.from; i <= ch.to; i++) if (bestStars(i) !== 3) return false; return true; };
  function streak() {
    const days = (progress.days || []).slice().sort(); if (!days.length) return 0;
    let best = 1, run = 1;
    for (let k = 1; k < days.length; k++) { const a = new Date(days[k - 1]), b = new Date(days[k]); const diff = Math.round((b - a) / 86400000); run = diff === 1 ? run + 1 : diff === 0 ? run : 1; best = Math.max(best, run); }
    return best;
  }
  function markDay() { const d = new Date(), k = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); progress.days = progress.days || []; if (!progress.days.includes(k)) { progress.days.push(k); progress.days = progress.days.slice(-60); saveProgress(); checkAwards(false); } }
  function bumpStat(k) { progress.stats = progress.stats || {}; progress.stats[k] = (progress.stats[k] || 0) + 1; saveProgress(); checkAwards(false); }
  const AWARDS = [
    { id: 'first', name: 'First Spark', desc: 'Finish your first level.', icon: 'bolt', tier: 1, prog: () => [Math.min(1, nDone()), 1] },
    { id: 'ten', name: 'Wired Up', desc: 'Finish 10 levels.', icon: 'bolt', tier: 1, prog: () => [Math.min(10, nDone()), 10] },
    { id: 'fifty', name: 'Power Grid', desc: 'Finish 50 levels.', icon: 'bolt', tier: 2, prog: () => [Math.min(50, nDone()), 50] },
    { id: 'all', name: 'Circuit Master', desc: 'Finish all ' + LEVELS.length + ' levels.', icon: 'trophy', tier: 3, prog: () => [nDone(), LEVELS.length] },
    { id: 'hat', name: 'Hat Trick', desc: 'Get 3 stars on 10 levels.', icon: 'star', tier: 1, prog: () => [Math.min(10, nThree()), 10] },
    { id: 'brains', name: 'Bright Spark', desc: 'Solve 25 levels without a hint.', icon: 'bulb', tier: 2, prog: () => [Math.min(25, nNoHint()), 25] },
    { id: 'starlord', name: 'Star Collector', desc: 'Collect 150 stars.', icon: 'star', tier: 3, prog: () => [Math.min(150, totalStars()), 150] },
    { id: 'pts10', name: 'Point Maker', desc: 'Score 10,000 points in total.', icon: 'bolt', tier: 1, prog: () => [Math.min(10000, totalPoints()), 10000] },
    { id: 'pts100', name: 'High Voltage', desc: 'Score 100,000 points in total.', icon: 'bolt', tier: 2, prog: () => [Math.min(100000, totalPoints()), 100000] },
    { id: 'gold', name: 'Gold Trophy', desc: 'Reach the Gold trophy rank (75,000 points).', icon: 'trophy', tier: 3, prog: () => [Math.min(75000, totalPoints()), 75000] },
    { id: 'quick', name: 'Quick Fingers', desc: 'Solve a level in 15 seconds or less.', icon: 'watch', tier: 1, prog: () => [Math.min(1, fastCount(15)), 1] },
    { id: 'speed', name: 'Lightning Speed', desc: 'Solve 10 levels in 30 seconds or less each.', icon: 'watch', tier: 2, prog: () => [Math.min(10, fastCount(30)), 10] },
    ...CHAPTERS.map((ch, k) => ({ id: 'ch' + k, name: ch.name, desc: 'Clear every level in ' + ch.name + '.', icon: 'medal', tier: k < 4 ? 1 : 2, prog: () => { let n = 0; for (let i = ch.from; i <= ch.to; i++) if (progress.done[i] != null) n++; return [n, ch.to - ch.from + 1]; } })),
    { id: 'perfect', name: 'Perfectionist', desc: 'Get 3 stars on every level of one chapter.', icon: 'crown', tier: 2, prog: () => [CHAPTERS.some(chapterPerfect) ? 1 : 0, 1] },
    { id: 'daily1', name: 'Daily Spark', desc: 'Solve your first daily challenge.', icon: 'flame', tier: 1, prog: () => [Math.min(1, dailyTotalSolved()), 1] },
    { id: 'dstreak3', name: 'Hot Streak', desc: 'Solve a daily challenge 3 days in a row.', icon: 'flame', tier: 1, prog: () => [Math.min(3, bestDailyStreak()), 3] },
    { id: 'dstreak7', name: 'Week of Fire', desc: 'Solve a daily challenge 7 days in a row.', icon: 'flame', tier: 2, prog: () => [Math.min(7, bestDailyStreak()), 7] },
    { id: 'dstreak30', name: 'Eternal Flame', desc: 'Solve a daily challenge 30 days in a row.', icon: 'flame', tier: 3, prog: () => [Math.min(30, bestDailyStreak()), 30] },
    { id: 'dstreak100', name: 'Forge Legend', desc: 'Solve a daily challenge 100 days in a row.', icon: 'crown', tier: 3, prog: () => [Math.min(100, bestDailyStreak()), 100] },
    { id: 'dperfect', name: 'Perfect Day', desc: 'Solve all 5 daily challenges in one day.', icon: 'star', tier: 2, prog: () => [Math.min(1, perfectDays()), 1] },
    { id: 'dperfect10', name: 'Daily Master', desc: 'Have 10 perfect days.', icon: 'crown', tier: 3, prog: () => [Math.min(10, perfectDays()), 10] },
    { id: 'dextreme', name: 'Weekend Warrior', desc: 'Solve 10 extreme weekend challenges.', icon: 'shield', tier: 2, prog: () => [Math.min(10, extremeSolved()), 10] },
    { id: 'd100', name: 'Challenge Seeker', desc: 'Solve 100 daily challenges.', icon: 'trophy', tier: 3, prog: () => [Math.min(100, dailyTotalSolved()), 100] },
    { id: 'streak3', name: 'On a Roll', desc: 'Play on 3 days in a row.', icon: 'flame', tier: 1, prog: () => [Math.min(3, streak()), 3] },
    { id: 'streak7', name: 'Unstoppable', desc: 'Play on 7 days in a row.', icon: 'flame', tier: 2, prog: () => [Math.min(7, streak()), 7] },
    { id: 'maker', name: 'Inventor', desc: 'Save a level you made in the editor.', icon: 'wrench', tier: 1, prog: () => [Math.min(1, (progress.stats || {}).saved || 0), 1] },
    { id: 'sharer', name: 'Broadcaster', desc: 'Share a level code with a friend.', icon: 'share', tier: 1, prog: () => [Math.min(1, (progress.stats || {}).shared || 0), 1] },
    { id: 'linked', name: 'Connected', desc: 'Sign in so your progress is saved.', icon: 'shield', tier: 1, prog: () => [Cloud.user() ? 1 : 0, 1] },
  ];
  const TIER = ['', 'bronze', 'silver', 'gold'];
  // returns the rewards unlocked just now; pops them up unless the win card will show them
  function checkAwards(quiet) {
    progress.awards = progress.awards || {}; const fresh = [];
    for (const A of AWARDS) { if (progress.awards[A.id]) continue; const [n, of] = A.prog(); if (n >= of) { progress.awards[A.id] = Date.now(); fresh.push(A); } }
    if (fresh.length) { saveProgress(); if (!quiet) fresh.forEach((A, k) => setTimeout(() => awardPop(A), 400 + k * 2600)); updateTrophyBadge(); }
    return fresh;
  }
  function awardPop(A) {
    const el = $('#awardPop'); el.className = 'tier-' + TIER[A.tier];
    el.innerHTML = '<div class="apIcon">' + svgIcon(A.icon) + '</div><div><b>REWARD UNLOCKED</b><span>' + A.name + '</span></div>';
    el.hidden = false; void el.offsetWidth; el.classList.add('show'); sfx('charge'); haptic('success');
    clearTimeout(el._t); el._t = setTimeout(() => { el.classList.remove('show'); setTimeout(() => { el.hidden = true; }, 400); }, 2400);
  }
  function showWinAwards(fresh, secs) {
    const box = $('#winAwards'); box.innerHTML = '';
    const S = G.lastSolve, sc = S.sc;
    const p = document.createElement('div'); p.className = 'winPts';
    p.innerHTML = '<div class="wpBig"><span class="wpNum">0</span><small>POINTS</small></div>' +
      (S.newBest ? '<div class="wpBest">NEW BEST' + (S.prevPts ? ' · was ' + S.prevPts.toLocaleString() : '') + '</div>' : '<div class="wpBest dim">Best ' + (progress.pts[G.li] || 0).toLocaleString() + '</div>') +
      '<div class="wpRows"><span>Level cleared</span><b>+' + (sc.base + sc.partsPts).toLocaleString() + '</b>' +
      '<span>' + svgIcon('watch') + ' Time ' + fmtTime(secs) + ' <i>(par ' + fmtTime(sc.par) + ')</i></span><b>+' + sc.timeBonus.toLocaleString() + '</b>' +
      (S.used ? '<span>' + svgIcon('bulb') + ' Hints used: ' + S.used + '</span><b class="neg">× ' + sc.mult.toFixed(2) + '</b>' : '<span>' + svgIcon('bulb') + ' No hints</span><b>× 1.00</b>') + '</div>';
    box.appendChild(p);
    const num = p.querySelector('.wpNum'), t0 = performance.now(), goal = sc.score;
    (function tick() { const k = Math.min(1, (performance.now() - t0) / 1100), e = 1 - Math.pow(1 - k, 3); num.textContent = Math.round(goal * e).toLocaleString(); if (k < 1) requestAnimationFrame(tick); })();
    const tierNow = trophyTier(totalPoints());
    if (tierNow.name !== S.tierBefore.name) { const d = document.createElement('div'); d.className = 'winAward'; d.style.animationDelay = '0.9s';
      d.innerHTML = '<div class="apIcon" style="background:radial-gradient(circle at 35% 30%,#fff,' + tierNow.col + ');color:#1a2133">' + svgIcon('trophy') + '</div><div><b>NEW TROPHY RANK</b><span>' + tierNow.name + '</span></div>'; box.appendChild(d); }
    fresh.forEach((A, k) => { const d = document.createElement('div'); d.className = 'winAward tier-' + TIER[A.tier]; d.style.animationDelay = (0.6 + k * 0.25) + 's';
      d.innerHTML = '<div class="apIcon">' + svgIcon(A.icon) + '</div><div><b>NEW REWARD</b><span>' + A.name + '</span></div>'; box.appendChild(d); });
    if (fresh.length) setTimeout(() => { sfx('charge'); haptic('success'); }, 700);
  }
  const fmtTime = s => s >= 3600 ? Math.floor(s / 3600) + 'h ' + Math.floor(s % 3600 / 60) + 'm' : s >= 60 ? Math.floor(s / 60) + 'm ' + String(s % 60).padStart(2, '0') + 's' : s + 's';
  function updateTrophyBadge() { const t = trophyTier(totalPoints()); const b = $('#awardsCount'); if (b) { b.textContent = t.name.toUpperCase(); b.parentNode.style.color = t.col; } }
  function buildAwards() {
    checkAwards(true);
    const box = $('#awardsGrid'); box.innerHTML = '';
    const got = progress.awards || {};
    $('#awardsSum').textContent = trophyTier(totalPoints()).name + ' rank · ' + totalPoints().toLocaleString() + ' points · ' + totalStars() + ' ★ · ' + Object.keys(got).length + '/' + AWARDS.length + ' rewards';
    for (const A of AWARDS.slice().sort((p, q) => (got[q.id] ? 1 : 0) - (got[p.id] ? 1 : 0))) {
      const [n, of] = A.prog(), on = !!got[A.id];
      const d = document.createElement('div'); d.className = 'award ' + (on ? 'on tier-' + TIER[A.tier] : 'off');
      d.innerHTML = '<div class="apIcon">' + svgIcon(A.icon) + '</div><div class="awTx"><b>' + A.name + '</b><span>' + A.desc + '</span>' +
        (on ? '<em>Unlocked</em>' : '<div class="awBar"><i style="width:' + Math.round(100 * Math.min(1, n / of)) + '%"></i></div><em>' + n + ' / ' + of + '</em>') + '</div>';
      box.appendChild(d);
    }
  }
  // ---------------- LEADERBOARD ----------------
  function myScore() {
    const stars = totalStars(), levels = nDone(), time = Object.values(progress.time || {}).reduce((s, v) => s + v, 0), awards = Object.keys(progress.awards || {}).length;
    return { stars, levels, time, awards, score: totalPoints() };
  }
  let lastPush = 0;
  function periodPts(kind) { const d = utcDate(); return kind === 'day' ? ((progress.dayPts || {})[d] || 0) : ((progress.weekPts || {})[weekId(d)] || 0); }
  function pushPeriods() { const d = utcDate(); if (periodPts('day')) Cloud.submitPeriod('lb_day', d, periodPts('day')).catch(() => {}); if (periodPts('week')) Cloud.submitPeriod('lb_week', weekId(d), periodPts('week')).catch(() => {}); }
  function pushScore() { if (!Cloud.user() || !Cloud.enabled()) return; const now = Date.now(); if (now - lastPush < 3000) return; lastPush = now; Cloud.submitScore(myScore()).catch(() => {}); pushPeriods(); }
  let lbKind = 'all';
  async function buildLeader() {
    const list = $('#leaderList'), me = Cloud.user(), mine = myScore();
    const myTier = trophyTier(mine.score), nt = nextTier(mine.score);
    $('#leaderMe').innerHTML = '<span class="lbRank">' + svgIcon('star') + '</span><span class="lbName">' + (me ? me.name : 'You (guest)') + '</span><span class="lbTier" style="color:' + myTier.col + '">' + svgIcon('trophy') + myTier.name + '</span><span class="lbPts">' + mine.score.toLocaleString() + '</span>';
    $('#leaderNext').textContent = nt ? (nt.min - mine.score).toLocaleString() + ' points to ' + nt.name : 'Top trophy rank reached!';
    $('#leaderSign').hidden = !!me;
    list.innerHTML = '<div class="lbMsg">Loading the leaderboard…</div>';
    if (!Cloud.enabled()) { list.innerHTML = '<div class="lbMsg">The online leaderboard is not switched on in this build.</div>'; return; }
    document.querySelectorAll('#lbSeg button').forEach(b => b.classList.toggle('on', b.dataset.k === lbKind));
    if (lbKind !== 'all') {
      const d = utcDate(), mineP = periodPts(lbKind);
      { const mp = $('#leaderMe .lbPts'); if (mp) mp.textContent = mineP.toLocaleString(); const mt = $('#leaderMe .lbTier'); if (mt) mt.style.visibility = 'hidden'; }
      $('#leaderNext').textContent = (lbKind === 'day' ? 'Today' : 'This week') + ': ' + mineP.toLocaleString() + ' points · resets ' + (lbKind === 'day' ? 'in ' + fmtLeft() : 'on Monday');
      try {
        if (me) { if (lbKind === 'day' && mineP) await Cloud.submitPeriod('lb_day', d, mineP).catch(() => {}); if (lbKind === 'week' && mineP) await Cloud.submitPeriod('lb_week', weekId(d), mineP).catch(() => {}); }
        const rows = await Cloud.topPeriod(lbKind === 'day' ? 'lb_day' : 'lb_week', lbKind === 'day' ? d : weekId(d), 50);
        if (G.screen !== 'leader') return;
        if (!rows.length) { list.innerHTML = '<div class="lbMsg">No scores yet ' + (lbKind === 'day' ? 'today' : 'this week') + '. Solve a level or a daily challenge while signed in to take first place!</div>'; return; }
        list.innerHTML = '';
        rows.forEach((r, k) => { const el = document.createElement('div'); el.className = 'lbRow' + (me && r.uid === me.uid ? ' me' : '') + (k < 3 ? ' top' + (k + 1) : '');
          el.innerHTML = '<span class="lbRank">' + (k < 3 ? svgIcon('crown') : '') + '<i>' + (k + 1) + '</i></span><span class="lbName"></span><span class="lbPts">' + r.score.toLocaleString() + '</span>';
          el.querySelector('.lbName').textContent = r.name; list.appendChild(el); });
        if (me) { const k = rows.findIndex(r => r.uid === me.uid); $('#leaderMe .lbRank').innerHTML = k >= 0 ? '<i>' + (k + 1) + '</i>' : '<i>50+</i>'; }
      } catch (e) { list.innerHTML = '<div class="lbMsg">' + (/permission/i.test(e.message) ? 'This leaderboard is not open yet. Check back soon!' : 'Could not load the leaderboard. Check your connection and try again.') + '</div>'; }
      return;
    }
    { const mt = $('#leaderMe .lbTier'); if (mt) mt.style.visibility = ''; }
    try {
      if (me) await Cloud.submitScore(mine).catch(() => {});
      const rows = await Cloud.topScores(50);
      if (!rows.length) { list.innerHTML = '<div class="lbMsg">No scores yet. Finish a level while signed in to be the first!</div>'; return; }
      list.innerHTML = '';
      rows.forEach((r, k) => { const d = document.createElement('div'); d.className = 'lbRow' + (me && r.uid === me.uid ? ' me' : '') + (k < 3 ? ' top' + (k + 1) : '');
        const tr = trophyTier(r.score);
        d.innerHTML = '<span class="lbRank">' + (k < 3 ? svgIcon('crown') : '') + '<i>' + (k + 1) + '</i></span><span class="lbName"></span><span class="lbTier" style="color:' + tr.col + '">' + svgIcon('trophy') + tr.name + '</span><span class="lbPts">' + r.score.toLocaleString() + '</span>';
        d.querySelector('.lbName').textContent = r.name; list.appendChild(d); });
      if (me) { const k = rows.findIndex(r => r.uid === me.uid); $('#leaderMe .lbRank').innerHTML = k >= 0 ? '<i>' + (k + 1) + '</i>' : '<i>50+</i>'; }
    } catch (e) { list.innerHTML = '<div class="lbMsg">' + (/permission/i.test(e.message) ? 'The leaderboard is not open yet. Check back soon!' : 'Could not load the leaderboard. Check your connection and try again.') + '</div>'; }
  }

  // ---------------- ACCOUNT (optional) ----------------
  // First launch offers sign-in with a Skip. Signed-in players keep levels and stars in the cloud and get
  // short share codes; guests keep everything on the device.
  let acctBack = 'title';
  function updateAcctChip() {
    const u = Cloud.user(); $('#acctLabel').textContent = u ? u.name.toUpperCase().slice(0, 14) : 'GUEST';
    $('#acctBtn').querySelector('i').textContent = u ? u.name[0].toUpperCase() : '?';
  }
  function openAccount(back) {
    acctBack = back || 'title'; const u = Cloud.user();
    $('#acctOut').hidden = !!u; $('#acctInView').hidden = !u;
    $('#acctTitle').textContent = u ? 'Signed in' : 'Save your levels';
    $('#acctWho').textContent = u ? 'Signed in as ' + u.name + ' (' + u.email + '). Your levels and stars are kept in your account.' : '';
    $('#acctSkip').textContent = u ? 'Back' : 'Skip for now';
    $('#acctMsg').textContent = Cloud.enabled() ? '' : 'Online accounts are not switched on in this build yet, so you can play as a guest: everything is saved on this device.';
    showScreen('account');
  }
  async function acctDo(kind) {
    actx(); const e = $('#acctEmail').value.trim(), p = $('#acctPass').value, n = $('#acctName').value.trim();
    if (!e || p.length < 6) { $('#acctMsg').textContent = 'Enter your email and a password of at least 6 characters.'; sfx('bad'); return; }
    $('#acctMsg').textContent = kind === 'up' ? 'Creating your account…' : 'Signing in…';
    try {
      await (kind === 'up' ? Cloud.signUp(e, p, n) : Cloud.signIn(e, p));
      $('#acctPass').value = ''; sfx('charge'); toast('Welcome, ' + Cloud.user().name + '!');
      await cloudSync(); markAcctSeen(); checkAwards(false); pushScore(); showScreen(acctBack);
    } catch (err) { $('#acctMsg').textContent = err.message; sfx('bad'); }
  }
  // merge cloud and device: levels by id (cloud adds what the device lacks), stars keep the best result
  async function cloudSync(quiet) {
    if (!Cloud.user() || !Cloud.enabled()) return;
    try {
      const codes = await Cloud.myLevels(); let added = 0;
      for (const c of codes) { try { const l = decodeLevelKeepId(c); if (!customs.some(x => x.id === l.id)) { customs.push(l); added++; } } catch (e) { } }
      if (added) saveCustoms();
      for (const l of customs) await Cloud.saveMyLevel(l, encodeLevel(l, true));
      const cp = await Cloud.loadProgressCloud();
      if (cp && cp.done) for (const k in cp.done) { const v = cp.done[k]; if (progress.done[k] == null || v < progress.done[k]) progress.done[k] = v; }
      if (cp) for (const key of ['pts', 'st']) if (cp[key]) { progress[key] = progress[key] || {}; for (const k in cp[key]) progress[key][k] = Math.max(progress[key][k] || 0, cp[key][k]); }
      if (cp && cp.time) { progress.time = progress.time || {}; for (const k in cp.time) progress.time[k] = progress.time[k] ? Math.min(progress.time[k], cp.time[k]) : cp.time[k]; }
      saveProgress(); await Cloud.saveProgressCloud(progress);
      if (!quiet) toast('Synced ✓ ' + customs.length + ' level' + (customs.length === 1 ? '' : 's') + ' in your account.');
    } catch (e) { if (!quiet) toast('Sync failed: ' + e.message); }
  }
  function markAcctSeen() { try { localStorage.setItem('voltworks.acctAsked', '1'); } catch (e) { } }
  function acctAsked() { try { return localStorage.getItem('voltworks.acctAsked') === '1'; } catch (e) { return true; } }
  $('#acctBtn').addEventListener('click', () => { actx(); sfx('pick'); openAccount('title'); });
  // ---- one-tap sign-in on the title screen: Google on Android (and the web), Apple on iPhone/iPad
  const PLATFORM = (window.Capacitor && window.Capacitor.getPlatform && window.Capacitor.getPlatform()) || 'web';
  const SSO = PLATFORM === 'ios' ? 'apple' : 'google';
  function updateSignRow() {
    const u = Cloud.user(), b = $('#ssoBtn'), done = $('#ssoDone');
    b.classList.toggle('apple', SSO === 'apple'); b.classList.toggle('google', SSO === 'google');
    b.querySelector('.ssoIc').textContent = SSO === 'apple' ? '' : 'G';
    b.querySelector('.ssoTx').textContent = SSO === 'apple' ? 'Sign in with Apple' : 'Sign in with Google';
    b.hidden = !!u; done.hidden = !u;
    if (u) $('#ssoWho').textContent = 'Signed in as ' + u.name + ' · progress saved';
    $('#signNote').textContent = u ? '' : 'Or just tap Play as a guest';
    $('#signNote').hidden = !!u;
  }
  // SHA-256 (hex) for the Apple nonce; works even where crypto.subtle is missing
  function sha256hex(str) {
    const K = [], H = [], isP = n => { for (let f = 2; f * f <= n; f++) if (n % f === 0) return false; return true; };
    const fr = x => ((x - Math.floor(x)) * 4294967296) | 0;
    for (let n = 2, k = 0; k < 64; n++) if (isP(n)) { if (k < 8) H[k] = fr(Math.pow(n, 1 / 2)); K[k++] = fr(Math.pow(n, 1 / 3)); }
    const bytes = unescape(encodeURIComponent(str)), l = bytes.length, words = [];
    for (let i = 0; i < l; i++) words[i >> 2] |= bytes.charCodeAt(i) << ((3 - i % 4) * 8);
    words[l >> 2] |= 0x80 << ((3 - l % 4) * 8); words[((l + 8) >> 6) * 16 + 15] = l * 8;
    const r = (x, n) => (x >>> n) | (x << (32 - n));
    for (let j = 0; j < words.length; j += 16) {
      const w = []; for (let i = 0; i < 16; i++) w[i] = words[j + i] | 0; let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        if (i >= 16) { const s0 = r(w[i - 15], 7) ^ r(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = r(w[i - 2], 17) ^ r(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0; }
        const t1 = (h + (r(e, 6) ^ r(e, 11) ^ r(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + (w[i] | 0)) | 0, t2 = ((r(a, 2) ^ r(a, 13) ^ r(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + c) | 0; H[3] = (H[3] + d) | 0; H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(x => ('00000000' + (x >>> 0).toString(16)).slice(-8)).join('');
  }
  let ssoReady = false;
  // the phone's own sign-in (Apple on iPhone/iPad, Google on Android) → Firebase account
  async function ssoAuth() {
    const SL = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialLogin;
    if (!SL || PLATFORM === 'web') throw new Error('Sign-in with ' + (SSO === 'apple' ? 'Apple' : 'Google') + ' works in the app only.');
    const cfg = Cloud.config;
    if (!ssoReady) { await SL.initialize(SSO === 'google' ? { google: { webClientId: cfg.googleWebClientId } } : { apple: {} }); ssoReady = true; }
    let token, name = '', raw = null;
    if (SSO === 'google') {
      const r = await SL.login({ provider: 'google', options: {} });
      token = r.result && r.result.idToken; name = (r.result && r.result.profile && (r.result.profile.givenName || r.result.profile.name)) || '';
      if (!token) throw new Error('No sign-in token came back.');
      await Cloud.signInIdp('google.com', token, null, name);
    } else {
      raw = Array.from({ length: 32 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[(Math.random() * 36) | 0]).join('');
      const r = await SL.login({ provider: 'apple', options: { scopes: ['email', 'name'], nonce: sha256hex(raw) } });
      token = r.result && r.result.idToken; const p = (r.result && r.result.profile) || {};
      name = [p.givenName, p.familyName].filter(Boolean).join(' ');
      if (!token) throw new Error('No sign-in token came back.');
      await Cloud.signInIdp('apple.com', token, raw, name);
    }
  }
  async function ssoSignIn() {
    actx(); sfx('pick');
    const SL = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.SocialLogin;
    if (!SL || PLATFORM === 'web') { toast('Sign-in with ' + (SSO === 'apple' ? 'Apple' : 'Google') + ' works in the app. In the browser you can use email.'); openAccount('title'); return; }
    if (!Cloud.enabled()) { toast('Online accounts are not switched on in this build yet.'); return; }
    const cfg = Cloud.config;
    if (SSO === 'google' && !cfg.googleWebClientId) { toast('Google sign-in is not set up in this build yet.'); return; }
    const b = $('#ssoBtn'); b.disabled = true;
    try {
      await ssoAuth();
      markAcctSeen(); sfx('charge'); toast('Welcome, ' + Cloud.user().name + '! Your progress is saved.'); checkAwards(false); pushScore();
      await cloudSync(true); updateAcctChip(); updateSignRow();
    } catch (err) {
      const m = String(err && (err.message || err)) || '';
      if (/cancel/i.test(m)) toast('Sign-in cancelled. You can keep playing as a guest.'); else toast('Could not sign in: ' + m);
    } finally { b.disabled = false; }
  }
  $('#ssoBtn').addEventListener('click', ssoSignIn);
  $('#awardsBtn').addEventListener('click', () => { actx(); sfx('pick'); showScreen('awards'); });
  $('#leaderBtn').addEventListener('click', () => { actx(); sfx('pick'); showScreen('leader'); });
  $('#awBack').addEventListener('click', () => { sfx('pick'); showScreen('title'); });
  $('#lbBack').addEventListener('click', () => { sfx('pick'); showScreen('title'); });
  $('#leaderSign').addEventListener('click', () => { if (SSO && PLATFORM !== 'web') ssoSignIn(); else openAccount('leader'); });
  updateTrophyBadge(); checkAwards(false);
  $('#ssoDone').addEventListener('click', () => { actx(); sfx('pick'); openAccount('title'); });
  updateSignRow();
  $('#acctIn').addEventListener('click', () => acctDo('in'));
  $('#acctUp').addEventListener('click', () => acctDo('up'));
  $('#acctSkip').addEventListener('click', () => { sfx('pick'); markAcctSeen(); showScreen(acctBack); });
  $('#acctOutBtn').addEventListener('click', () => { Cloud.signOut(); sfx('pick'); toast('Signed out. Your levels stay on this device.'); openAccount(acctBack); });
  // ---- delete account (App Store rule 5.1.1(v)): removes the online account and its cloud data; play on this device continues as a guest
  function deleteAccountFlow() {
    const u = Cloud.user(); if (!u) return;
    actx(); sfx('pick');
    const sso = (u.provider === 'apple.com' && SSO === 'apple') || (u.provider === 'google.com' && SSO === 'google');
    const ssoName = u.provider === 'apple.com' ? 'Apple' : 'Google';
    const pw = !u.provider;   // email accounts confirm with their password
    const d = MONEY.sheet('<h3>Delete account?</h3><p>This permanently deletes your account (' + (u.email || u.name).replace(/[<>&]/g, '') + '), your cloud saves, your private levels and your leaderboard places. It cannot be undone.</p>'
      + '<p class="mNote">Levels you already shared by code stay playable. Your progress on this device stays. Purchases belong to your store account and can be restored at any time.</p>'
      + (pw ? '<input id="delPass" type="password" autocomplete="current-password" placeholder="Password to confirm" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:0;font:600 16px/1.2 var(--body,system-ui)">' : '')
      + (sso ? '<p class="mNote">You will confirm with Sign in with ' + ssoName + ' first.</p>' : '')
      + '<p class="mNote" id="delMsg" style="color:#ffd2a8;min-height:1.2em"></p>'
      + '<div class="mRow"><button class="mBtn ghost" data-a="0" type="button">Cancel</button><button class="mBtn danger" data-a="1" type="button">Delete</button></div>');
    const msg = t => { d.querySelector('#delMsg').textContent = t; };
    const close = () => d.remove();
    d.querySelector('[data-a="0"]').addEventListener('click', () => { sfx('pick'); close(); });
    const go = d.querySelector('[data-a="1"]');
    go.addEventListener('click', async () => {
      go.disabled = true;
      try {
        if (pw) {
          const p = d.querySelector('#delPass').value;
          if (!p) { msg('Enter your password to confirm.'); go.disabled = false; return; }
          msg('Checking…'); await Cloud.signIn(u.email, p);
        } else if (Cloud.needsReauth()) {
          if (!sso) { msg('Sign out, sign in again with ' + ssoName + ', then delete the account.'); go.disabled = false; return; }
          msg('Confirm with ' + ssoName + '…'); await ssoAuth();
          if (!Cloud.user() || Cloud.user().uid !== u.uid) { msg('That was a different account. Nothing was deleted.'); go.disabled = false; return; }
        }
        msg('Deleting…');
        const day = utcDate();
        await Cloud.deleteAccount([['lb_day', day], ['lb_week', weekId(day)]]);
        close(); sfx('pick'); toast('Your account was deleted. You can keep playing as a guest.');
        updateAcctChip(); updateSignRow(); openAccount(acctBack);
      } catch (err) {
        const m = String((err && err.message) || err || '');
        if (m === 'REAUTH') msg(pw ? 'Please enter your password again.' : 'Please confirm with ' + ssoName + ' again.');
        else if (/cancel/i.test(m)) msg('Cancelled. Nothing was deleted.');
        else msg(m);
        go.disabled = false;
      }
    });
  }
  $('#acctDel').addEventListener('click', deleteAccountFlow);
  $('#acctSync').addEventListener('click', async () => { $('#acctMsg').textContent = 'Syncing…'; await cloudSync(); $('#acctMsg').textContent = ''; });

  // ---------------- NEW PART POP-UP ----------------
  // The first time a level brings in new parts, a card explains each one: what it does and how to use it.
  const USE = {
    bulb: 'Drop it on a wire. When powered it shines light up, down, left and right.',
    solar: 'Drop it on a wire where light or a laser beam will hit it.',
    fan: 'Drop it on a wire. Tap it to turn it so it blows the way you need.',
    generator: 'Drop it on a wire, in the path of moving air or falling water.',
    laser: 'Drop it on a wire. Tap it to turn the beam up, down, left or right.',
    mirror: 'Needs no wire. Put it in a laser beam and tap it to flip which way it bounces the beam.',
    feeder: 'Drop it on a wire so a laser hits its left or right side.',
    kettle: 'Drop it on a powered wire to pour water, or on top of a hot heater to make steam. Tap it to flip the spout.',
    heater: 'Drop it on a wire. Put a kettle right on top of it to make steam.',
    steamdet: 'Drop it on a wire where rising steam will flow into it.',
    wsender: 'Drop it on a powered wire. It scans the squares around it and powers any receiver it finds.',
    wreceiver: 'Drop it on the wire you want to power, within 3 squares of a sender. Walls do not block the signal.',
    chargefan: 'Drop it on a wire and tap it to aim. It blows while powered and keeps blowing on its charge later.',
    chargelight: 'Drop it on a wire and tap it to aim. It shines while powered and keeps shining on its charge later.',
    pushbot: 'Drop it on a wire facing the way to go (tap to flip). Once powered it drives off and pushes things.',
    battery: 'Drop it on a wire to charge it. Once full it powers whatever wire it sits on, even if moved.',
    hamster: 'Drop it on a wire. Put food right in front of its face, or play music nearby, to make it run.',
    food: 'Needs no wire. Place it right in front of the hamster\'s face.',
    chime: 'Needs no wire. Put it in the wind and it plays music to the squares around it.',
    balldrop: 'Drop it on a wire above what you want to smash. It drops one heavy ball when powered.',
    cannon: 'Drop it on a wire (tap to flip its aim), or next to a hot heater. It fires once and clears the path.',
    drill: 'Drop it on a wire next to the object to break, and tap it to aim the drill.',
    rotator: 'Drop it on a wire. When powered it flips the parts directly above and below it.',
    helibot: 'Drop it on a wire. Once powered it flies down, grabs the first thing below and lifts it.',
    spring: 'Needs no wire. Stand it up under something that falls, or lay it on its side in a bot\'s path: whatever hits an end bounces straight back.',
    pullbot: 'Drop it on a wire facing the thing to pull (tap to flip). It grabs it and drags it back.',
    carrierbot: 'Drop it on a wire (tap to flip). Once powered it drives off carrying whatever sits on top.',
    tpsend: 'Drop it on a wire under the object you want to send.',
    tprecv: 'Drop it on a wire. Teleported objects appear on the square above it.',
    soundbot: 'Needs no wire. Music wakes it up, then it drives down pushing things below it.',
    spybot: 'Drop it on a wire next to another bot. Once powered it copies that bot.',
  };
  function partTags(t) {
    const T0 = TYPES[t] || {}, tags = [];
    tags.push(PASSIVE[t] ? 'Goes anywhere' : 'Goes on a wire');
    if (T0.rot === '4' || T0.rot === 'axis') tags.push('Tap to turn'); else if (T0.rot === 'lr' || T0.rot === 'mirror') tags.push('Tap to flip');
    if (['mirror', 'chime', 'spring', 'food', 'hamster', 'soundbot'].includes(t)) tags.push('No power needed');
    if (BOT_TYPES.includes(t)) tags.push('Moves by itself');
    return tags;
  }
  let ppQueue = [], ppDone = null;
  const seenParts = (() => { try { return new Set(JSON.parse(localStorage.getItem('voltworks.seenParts') || '[]')); } catch (e) { return new Set(); } })();
  function showPartPops(list, done) {
    ppQueue = list.slice(); ppDone = done || null; ppTotal = ppQueue.length; nextPartPop();
  }
  let ppTotal = 0;
  function nextPartPop() {
    const t = ppQueue.shift();
    if (!t) { $('#partPop').hidden = true; if (ppDone) { const d = ppDone; ppDone = null; d(); } return; }
    seenParts.add(t); try { localStorage.setItem('voltworks.seenParts', JSON.stringify([...seenParts])); } catch (e) {}
    $('#ppName').textContent = TYPES[t].name;
    $('#ppDoes').textContent = TYPES[t].desc;
    $('#ppUse').textContent = USE[t] || 'Drop it on a wire square.';
    $('#ppTags').innerHTML = partTags(t).map(s => '<span>' + s + '</span>').join('');
    const idx = ppTotal - ppQueue.length; $('#ppDots').innerHTML = ppTotal > 1 ? Array.from({ length: ppTotal }, (_, i) => '<i class="' + (i < idx ? 'on' : '') + '"></i>').join('') : '';
    $('#ppNext').textContent = ppQueue.length ? 'Next part' : 'Got it';
    const cvp = $('#ppIcon'), c = cvp.getContext('2d'); c.clearRect(0, 0, cvp.width, cvp.height);
    c.save(); c.translate(cvp.width / 2, cvp.height / 2); glowAt(c, 0, 0, cvp.width * 0.45, '#3fb8ff', 0.35);
    c.scale(cvp.width * 0.82, cvp.width * 0.82); const fo = fakeObj(t); fo.powered = true; fo.on = true; paintObj(c, fo, G.time); c.restore();
    $('#partPop').hidden = false; sfx('pick');
  }
  $('#ppNext').addEventListener('click', () => { sfx('beep'); nextPartPop(); });
  function introParts(lv) { return (lv.intro || []).filter(t => !seenParts.has(t)); }

  // ---------------- LEVEL 1 WALKTHROUGH ----------------
  // Spotlight steps that explain what everything does. Skippable; remembered once finished or skipped.
  let coachI = 0, coachSteps = [], coachDone = null;
  const cellRect = (x, y, w, h) => { const a = toScreen(L.ox + x * L.s, L.oy + y * L.s), b = toScreen(L.ox + (x + (w || 1)) * L.s, L.oy + (y + (h || 1)) * L.s); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; };
  const elRect = sel => { const e = $(sel); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; };
  function coachStepsFor() {
    const s = G.sim, find = t => s.objs.find(o => o.t === t);
    const wires = () => { let x0 = 99, y0 = 99, x1 = -1, y1 = -1; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.wire[s.idx(x, y)]) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return x1 < 0 ? null : cellRect(x0, y0, x1 - x0 + 1, y1 - y0 + 1); };
    return [
      { title: 'Welcome to Circuit Forge', text: 'Your job on every level: get electricity to the Energy Core. Here is a quick tour of how it works.' },
      { title: 'The Power Box', text: 'This is your main power and its switch. Tap it to turn it on: it sends blue current into the wire next to it. Tap it again to switch off.', rect: () => { const p = find('power'); return p && cellRect(p.x, p.y); } },
      { title: 'The Energy Core', text: 'This is the goal. Keep it powered for a moment and you win the level.', rect: () => { const p = find('target'); return p && cellRect(p.x, p.y); } },
      { title: 'Wires', text: 'Current only travels along wires. Blue wires come from the Power Box, orange wires are powered by your machines. A machine only works when it sits ON a wire square.', rect: wires },
      { title: 'Your Parts', text: 'Drag a part from here onto a wire square. Tap a placed part to turn it. Drag it off the board to put it back.', rect: () => elRect('#inv') },
      { title: 'Energy Can Jump', text: 'Light, wind, water, steam, lasers and wireless signals travel across empty squares from one machine to another. That is how you link separate wires.', rect: () => cellRect(0, 0, s.w, s.h) },
      { title: 'Power On', text: 'When your parts are placed, tap the Power Box on the board. If the core lights up and stays lit, you win.', rect: () => { const p = find('power'); return p && cellRect(p.x, p.y); } },
      { title: 'Stuck?', text: 'Tap the bulb and a hand shows you where the next part goes. Use fewer hints to earn more stars.', rect: () => elRect('#hintBtn') },
      { title: 'Move Around', text: 'Pinch to zoom, drag an empty spot to move the board, double-tap to zoom in or out. FIT shows the whole board.', next: "Let's play" },
    ];
  }
  function startCoach(done) { coachSteps = coachStepsFor(); coachI = 0; coachDone = done || null; $('#coach').hidden = false; showCoach(); }
  function endCoach() {
    $('#coach').hidden = true; try { localStorage.setItem('voltworks.tutDone', '1'); } catch (e) {}
    if (coachDone) { const d = coachDone; coachDone = null; d(); }
  }
  function showCoach() {
    const st = coachSteps[coachI]; if (!st) return endCoach();
    $('#coachStep').textContent = 'STEP ' + (coachI + 1) + ' OF ' + coachSteps.length;
    $('#coachTitle').textContent = st.title; $('#coachText').textContent = st.text;
    $('#coachNext').textContent = st.next || 'Next';
    $('#coachSkip').hidden = coachI === coachSteps.length - 1;
    const r = st.rect && st.rect(), hole = $('#coachHole'), card = $('#coachCard'), vw = window.innerWidth, vh = window.innerHeight, pad = 8;
    if (r) { hole.classList.remove('none'); Object.assign(hole.style, { left: (r.x - pad) + 'px', top: (r.y - pad) + 'px', width: (r.w + pad * 2) + 'px', height: (r.h + pad * 2) + 'px' }); }
    else { hole.classList.add('none'); Object.assign(hole.style, { left: vw / 2 + 'px', top: vh / 2 + 'px', width: '0px', height: '0px' }); }
    requestAnimationFrame(() => {
      const cw = card.offsetWidth, ch = card.offsetHeight;
      let x = vw / 2 - cw / 2, y = vh / 2 - ch / 2;
      if (r) {
        x = Math.min(vw - cw - 12, Math.max(12, r.x + r.w / 2 - cw / 2));
        const below = r.y + r.h + pad + 14, above = r.y - pad - 14 - ch;
        y = below + ch < vh - 8 ? below : above > 8 ? above : Math.max(8, vh / 2 - ch / 2);
        if (r.h > vh * 0.55) y = Math.max(8, r.y + 12);   // big spotlight: sit the card inside its top
      }
      card.style.left = x + 'px'; card.style.top = y + 'px';
    });
  }
  $('#coachNext').addEventListener('click', () => { sfx('beep'); coachI++; showCoach(); });
  $('#coachSkip').addEventListener('click', () => { sfx('pick'); endCoach(); });
  window.addEventListener('resize', () => { if (!$('#coach').hidden) showCoach(); });
  function tutDone() { try { return localStorage.getItem('voltworks.tutDone') === '1'; } catch (e) { return true; } }
  // what happens when a level opens: walkthrough on level 1 (first time), then cards for any new parts
  function levelIntro(i) {
    if (window.__VWnoIntro) return;   // automated tests
    const lv = level(), parts = introParts(lv);
    const pops = () => { if (parts.length) showPartPops(parts); };
    if (i === 0 && !tutDone()) setTimeout(() => startCoach(pops), 450);
    else if (parts.length) setTimeout(pops, 350);
  }

  // ---------------- TUTORIAL HAND (levels 1–3) ----------------
  // Shows a finger dragging the next correct part from the tray to its square, then tapping POWER.
  const handEl = $('#hand');
  function tutorial(dt) {
    G.idle = (G.idle || 0) + dt;
    const lv = level();
    let hs = G.hintShow && G.time < G.hintShow.until ? G.hintShow : null;
    const dirOf = s => s[3] == null ? defaultDir(s[0]) : s[3];
    if (hs && hs.s && G.placed.some(p => p.t === hs.s[0] && p.x === hs.s[1] && p.y === hs.s[2] && p.d === dirOf(hs.s))) { G.hintShow = hs = null; }
    const auto = !G.custom && G.li <= 2 && G.idle > (G.placed.length ? 4 : 1.2);
    const show = G.screen === 'play' && editable() && !gest && $('#win').hidden && $('#coach').hidden && $('#partPop').hidden && (hs || auto);
    if (!show) { handEl.hidden = true; G.tutT = 0; G.tutGhost = null; return; }
    const need = hs ? hs.s : (hs && hs.power ? null : lv.sol.find(s => !G.placed.some(p => p.t === s[0] && p.x === s[1] && p.y === s[2] && p.d === dirOf(s))));
    G.tutT = (G.tutT || 0) + dt;
    const T = G.tutT % 2.6;
    let x0, y0, x1, y1, part = null, tap = false;
    if (need) {
      const at = G.placed.find(p => p.t === need[0] && p.x === need[1] && p.y === need[2]);
      const cellS = toScreen(L.ox + (need[1] + 0.5) * L.s, L.oy + (need[2] + 0.5) * L.s);
      if (at) { x0 = x1 = cellS.x; y0 = y1 = cellS.y; tap = true; }                 // right square, wrong way round: tap to turn
      else if (invLeft(need[0]) > 0) {
        const card = inv.querySelector('.card[data-t="' + need[0] + '"]'); if (!card) { handEl.hidden = true; return; }
        const cr = card.getBoundingClientRect(); x0 = cr.left + cr.width / 2; y0 = cr.top + cr.height * 0.45; x1 = cellS.x; y1 = cellS.y; part = need[0];
      } else {
        const wrong = G.placed.find(p => p.t === need[0] && !lv.sol.some(s => s[0] === p.t && s[1] === p.x && s[2] === p.y));
        if (!wrong) { handEl.hidden = true; return; }
        const ws = toScreen(L.ox + (wrong.x + 0.5) * L.s, L.oy + (wrong.y + 0.5) * L.s); x0 = ws.x; y0 = ws.y; x1 = cellS.x; y1 = cellS.y; part = need[0];
      }
    } else {
      const pw = G.sim.objs.find(o => o.t === 'power'); const ps = pw ? toScreen(L.ox + (pw.x + 0.5) * L.s, L.oy + (pw.y + 0.5) * L.s) : { x: innerWidth / 2, y: innerHeight / 2 }; x0 = x1 = ps.x; y0 = y1 = ps.y;
    }
    const k = T < 0.35 ? 0 : T < 1.65 ? (T - 0.35) / 1.3 : 1, e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
    const x = x0 + (x1 - x0) * e, y = y0 + (y1 - y0) * e - (tap ? 0 : Math.sin(e * Math.PI) * 60);
    const press = tap ? (Math.sin(T * 7.5) > 0.3 ? 0.84 : 1) : (T < 0.35 || (T > 1.65 && T < 2.0)) ? 0.86 : 1;
    handEl.hidden = false; handEl.style.opacity = T > 2.2 ? String(Math.max(0, (2.6 - T) / 0.4)) : '1';
    handEl.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + press + ')';
    G.tutGhost = part && T > 0.35 && T < 1.9 ? { t: part, x, y, d: dirOf(need) } : null;
  }
  function drawTutGhost(c, T) {
    const g = G.tutGhost; if (!g || handEl.hidden) return;
    const bp = boardPt(g.x, g.y - 18);
    c.save(); c.globalAlpha = 0.75; c.translate(bp.x, bp.y); c.scale(L.s * 0.9, L.s * 0.9);
    const fo = fakeObj(g.t); if (g.d != null) fo.d = g.d; paintObj(c, fo, T); c.restore();
  }

  // ---------------- PARTICLES ----------------
  function P(x, y, vx, vy, life, color, size, kind) { if (G.parts.length < 500) G.parts.push({ x, y, vx, vy, life, max: life, color, size, kind }); }
  function burst(x, y, color, n, sp) { for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, v = (0.5 + Math.random()) * (sp || 2); P(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.4 + Math.random() * 0.4, color, 0.04 + Math.random() * 0.05, 'spark'); } }
  function dust(x, y) { for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2; P(x + Math.cos(a) * 0.3, y + Math.sin(a) * 0.3, Math.cos(a) * 0.8, Math.sin(a) * 0.8, 0.35, '#9fb3d9', 0.06, 'smoke'); } }
  function debris(x, y) {
    const cols = ['#8592b0', '#c9d2e3', '#5d6d8f', '#ffb547', '#2c3550'];
    for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 3; P(x, y, Math.cos(a) * v, Math.sin(a) * v - 2, 0.7 + Math.random() * 0.5, cols[i % 5], 0.05 + Math.random() * 0.07, 'debris'); }
    for (let i = 0; i < 10; i++) P(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, -0.4 - Math.random() * 0.5, 0.9, '#7c869c', 0.15 + Math.random() * 0.1, 'smoke');
    burst(x, y, '#ffd84a', 12, 3);
  }
  function confetti() { // energy discharge from the target instead of party confetti
    const t = G.sim.objs.find(o => o.t === 'target'); if (!t) return;
    const x = t.x + 0.5, y = t.y + 0.45, cols = ['#38d9ff', '#bff3ff', '#ff9b2f', '#ffd6a0'];
    for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, v = 1 + Math.random() * 5; P(x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 0.9, cols[i % 4], 0.025 + Math.random() * 0.04, 'spark'); }
    for (let k = 0; k < 3; k++) P(x, y, 0, 0, 0.7 + k * 0.35, k % 2 ? '#ff9b2f' : '#38d9ff', 0.3 + k * 0.2, 'ring');
  }


  // ---------------- SIM EVENTS ----------------
  function handle(evs) {
    const s = G.sim;
    for (const e of evs) {
      switch (e.k) {
        case 'destroy': G.dying.push({ o: Object.assign({}, e.o), t: G.time }); debris(e.o.x + 0.5, e.o.y + 0.5); sfx('crash'); haptic('heavy'); G.shake = 0.5; break;
        case 'fire': sfx('boom'); haptic('heavy'); G.shake = 0.6; burst(e.o.x + 0.5, e.o.y + 0.5, '#ffb547', 18, 3); break;
        case 'impact': burst(e.x + 0.5, e.y + 0.5, '#ffd84a', 14, 2.5); sfx('crash'); break;
        case 'win': G.pendingWin = { li: G.li, sim: G.sim }; break;
        case 'charged': burst(e.o.x + 0.5, e.o.y + 0.5, '#3dff9a', 16, 2); sfx('charge'); break;
        case 'release': burst(e.o.x + 0.5, e.o.y + 0.5, '#ffd84a', 12, 2); sfx('charge'); break;
        case 'transform': burst(e.o.x + 0.5, e.o.y + 0.5, '#ff3b5c', 24, 2.5); sfx('tp'); toast('Spy Bot copied the ' + TYPES[e.to].name + '!'); break;
        case 'scanfail': toast('Spy Bot found no bot to copy.'); sfx('bad'); break;
        case 'teleport': { const o = e.o; G.dying.push({ o: Object.assign({}, o, { x: e.fx, y: e.fy, rx: e.fx, ry: e.fy }), t: G.time, tp: true }); burst(e.fx + 0.5, e.fy + 0.5, COL.tp, 20, 2); burst(e.tx + 0.5, e.ty + 0.5, COL.tp, 20, 2); o.rx = o.x; o.ry = o.y; o.born = G.time; sfx('tp'); break; }
        case 'bounce': e.s.bounceT = G.time; sfx('boing'); break;
        case 'rotstart': e.o.rotStart = G.time; sfx('rotate'); break;
        case 'rotate': burst(e.o.x + 0.5, e.o.y + 0.5, '#7fffe0', 10, 1.5); (e.flipped || []).forEach(f => { f.spin = G.time; }); break;
        case 'flip': e.o.spin = G.time; break;
        case 'link': sfx('beep'); burst(e.o.x + 0.5, e.o.y + 0.5, COL.wifi, 10, 1.5); break;
        case 'wake': sfx('beep'); break;
        case 'grab': sfx('rotate'); break;
      }
    }
    const t = s.objs.find(o => o.t === 'target');
    if (t && t.powered && !G.prevTarget) { sfx('zap'); haptic('medium'); burst(t.x + 0.5, t.y + 0.5, COL.power, 26, 3); P(t.x + 0.5, t.y + 0.46, 0, 0, 0.7, '#bff8ff', 0.3, 'ring'); P(t.x + 0.5, t.y + 0.46, 0, 0, 1.0, '#46e8ff', 0.2, 'ring'); G.shake = Math.max(G.shake, 0.25); }
    G.prevTarget = !!(t && t.powered);
    if (s.flows.music.length && G.time - G.lastNote > 0.32) {
      const scale = [523, 587, 659, 784, 880, 1047];
      sfx('note', scale[(Math.random() * scale.length) | 0]); G.lastNote = G.time;
    }
    if (s.needsReset) { resetBoard('Board reset. The target never got power.'); }
  }

  // ---------------- RENDER ----------------
  let bgCache = null;
  // portrait: size the stage to the board so the board sits centred between the tip and the dock
  function fitPortrait() {
    const app = $('#app'), st = $('#stage');
    if (!window.matchMedia('(max-aspect-ratio: 11/10)').matches || !level()) { st.style.height = ''; app.classList.remove('fit'); return; }
    app.classList.add('fit');
    const lv = level(), cs = getComputedStyle(app);
    const inner = app.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    const gap = parseFloat(cs.rowGap) || 8;
    // short screens (folded phones, big system fonts): drop the tray to one swipeable row so the board keeps room
    st.style.height = '1px';   // measure the other rows at their natural size, not squeezed by the last board size
    const box = $('#inv'), want = 1;
    box.style.setProperty('--rows', want);
    let used = $('#hud').offsetHeight + $('#tip').offsetHeight + $('#dock').offsetHeight + gap * 5;
    if (want > 1 && inner - used < Math.max(220, inner * 0.38)) { box.style.setProperty('--rows', 1); used = $('#hud').offsetHeight + $('#tip').offsetHeight + $('#dock').offsetHeight + gap * 5; }
    if (inner - used < 160) { $('#tip').classList.add('mini'); used = $('#hud').offsetHeight + $('#tip').offsetHeight + $('#dock').offsetHeight + gap * 5; } else $('#tip').classList.remove('mini');
    requestAnimationFrame(trayHint);
    const pad = 12, w = st.clientWidth;
    const ideal = (w - pad * 2) * lv.h / lv.w + pad * 2;
    const h = Math.round(Math.max(140, Math.min(inner - used, ideal)));
    if (Math.abs((parseFloat(st.style.height) || 0) - h) > 1) st.style.height = h + 'px';
  }
  function resize() {
    fitPortrait();
    // the canvas fills the whole screen behind the controls; the #stage box is where the board is framed
    const st = $('#stage').getBoundingClientRect();
    DPR = Math.min(2, window.devicePixelRatio || 1);
    CW = Math.max(100, window.innerWidth); CH = Math.max(100, window.innerHeight);
    ST.x = st.left; ST.y = st.top; ST.w = Math.max(100, st.width); ST.h = Math.max(100, st.height);
    cv.width = Math.round(CW * DPR); cv.height = Math.round(CH * DPR);
    cv.style.width = CW + 'px'; cv.style.height = CH + 'px';
    TILT.a = (G.screen === 'edit' ? 0 : TILT_DEG) * Math.PI / 180; TILT.p = Math.max(900, CH * 2.2);
    TILT.ox = ST.x + ST.w / 2; TILT.oy = ST.y + ST.h;
    cv.style.transformOrigin = TILT.ox + 'px ' + TILT.oy + 'px';
    cv.style.transform = TILT.a ? 'perspective(' + TILT.p + 'px) rotateX(' + (TILT.a * 180 / Math.PI) + 'deg)' : 'none';
    // the tilt makes the far rows look shorter, so lay the board out on a taller virtual stage whose tilted top
    // lands exactly on the real top of the play area: the grid then fills all the space
    if (TILT.a) { const sa = Math.sin(TILT.a), ca = Math.cos(TILT.a), dv = ST.h * TILT.p / (TILT.p * ca - ST.h * sa); if (dv > ST.h && dv < ST.h * 2) { ST.y = ST.y + ST.h - dv; ST.h = dv; } }
    const lv = level(); if (!lv) return;
    const pad = window.matchMedia('(max-aspect-ratio: 11/10)').matches ? 4 : 26;
    VIEW.pad = pad;
    VIEW.s0 = Math.min((ST.w - pad * 2) / lv.w, (ST.h - pad * 2) / lv.h, 110);
    VIEW.zmax = Math.max(2.6, 92 / VIEW.s0);   // pinch zoom and drag work on every board
    if (VIEW.start) {
      VIEW.start = false;
      if (G.sim && VIEW.s0 < 22) {   // big board: start close up on the power box, explore by dragging
        const p = G.sim.objs.find(o => o.t === 'power') || { x: lv.w / 2, y: lv.h / 2 };
        VIEW.zmax = Math.max(VIEW.zmax, 46 / VIEW.s0);
        VIEW.z = Math.min(VIEW.zmax, 44 / VIEW.s0); const s1 = VIEW.s0 * VIEW.z;
        VIEW.px = (lv.w / 2 - (p.x + 2)) * s1; VIEW.py = (lv.h / 2 - (p.y + 2)) * s1;
        if (!G.bigHinted) { G.bigHinted = true; setTimeout(() => toast('Big board! Drag an empty spot to explore, pinch or tap FIT to see it all.'), 900); }
      } else if (VIEW.s0 < 70 && G.sim) startZoom(lv); // open zoomed in on the machines (like before); the empty rows around stay reachable by dragging
    }
    applyView();
    if (VIEW.s0 < 32 && !G.zoomHinted && !window.matchMedia('(max-aspect-ratio: 11/10)').matches) { G.zoomHinted = true; setTimeout(() => toast('Pinch to zoom in. Drag an empty square to move the board.'), 600); }
  }
  // ---- movable, zoomable board: z = zoom (1 = whole board fits), px/py = pan in CSS px
  const ST = { x: 0, y: 0, w: 100, h: 100 };
  const SQ_TARGET = 55;
  const TILT_DEG = 9;   // gentle tilt: the far rows stay almost as big as the near ones
  const VIEW = { z: 1, px: 0, py: 0, s0: 40, zmax: 2, pad: 20 };
  function applyView() {
    const lv = level(); if (!lv) return;
    VIEW.z = Math.max(1, Math.min(VIEW.zmax, VIEW.z));
    const s = VIEW.s0 * VIEW.z, bw = lv.w * s, bh = lv.h * s;
    const mx = Math.max(0, (bw - (ST.w - VIEW.pad * 2)) / 2), my = Math.max(0, (bh - (ST.h - VIEW.pad * 2)) / 2);
    VIEW.px = Math.max(-mx, Math.min(mx, VIEW.px)); VIEW.py = Math.max(-my, Math.min(my, VIEW.py));
    L.s = s; L.ox = ST.x + (ST.w - bw) / 2 + VIEW.px; L.oy = ST.y + (ST.h - bh) / 2 + VIEW.py;
    buildBg();
    const fb = $('#fitBtn'); if (fb) fb.hidden = VIEW.z < 1.03;
  }
  function zoomAt(fx, fy, z) {
    const lv = level(); if (!lv) return;
    const bx = (fx - L.ox) / L.s, by = (fy - L.oy) / L.s;
    VIEW.z = Math.max(1, Math.min(VIEW.zmax, z));
    const s = VIEW.s0 * VIEW.z;
    VIEW.px = fx - bx * s - ST.x - (ST.w - lv.w * s) / 2; VIEW.py = fy - by * s - ST.y - (ST.h - lv.h * s) / 2;
    applyView();
  }
  function resetView() { VIEW.z = 1; VIEW.px = 0; VIEW.py = 0; applyView(); }
  // start a level slightly zoomed in so the machines read big; FIT / double-tap shows the whole board
  // zoom in on the part of the board that is in use (never cutting anything off); FIT shows everything
  function startZoom(lv) {
    const s = G.sim; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const add = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1); };
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) if (s.wire[s.idx(x, y)] || s.at(x, y)) add(x, y);
    if (x1 < x0) return;
    x0 = Math.max(0, x0 - 0.1); y0 = Math.max(0, y0 - 0.6); x1 = Math.min(lv.w, x1 + 0.1); y1 = Math.min(lv.h, y1 + 0.4);
    let z = Math.min(1.35, (ST.w - VIEW.pad * 2) / ((x1 - x0) * VIEW.s0), (ST.h - VIEW.pad * 2) / ((y1 - y0) * VIEW.s0));
    // big squares: at least ~55 px on a phone (wider boards then pan sideways), but always 7 or more columns in view
    const want = Math.min(SQ_TARGET, (ST.w - VIEW.pad * 2) / 7) / VIEW.s0;
    if (z * VIEW.s0 < 46) z = Math.min(VIEW.zmax, Math.max(z, want));   // if the machines all fit with big-enough squares, show them all
    if (z < 1.05) return;
    const s1 = VIEW.s0 * z;
    VIEW.z = z; VIEW.px = (lv.w / 2 - (x0 + x1) / 2) * s1; VIEW.py = (lv.h / 2 - (y0 + y1) / 2) * s1;
  }
  function startView() { VIEW.z = 1; VIEW.px = 0; VIEW.py = 0; VIEW.start = true; }
  function buildBg() {
    const lv = level(); const s = G.sim;
    bgCache = document.createElement('canvas'); bgCache.width = cv.width; bgCache.height = cv.height;
    const c = bgCache.getContext('2d'); c.scale(DPR, DPR);
    const S = L.s, W = lv.w * S, H = lv.h * S, ox = L.ox, oy = L.oy;
    // the navy grid fills the whole play area edge to edge; the level's own squares are a touch lighter with a faint rim
    let g = c.createLinearGradient(0, 0, 0, CH); g.addColorStop(0, '#142b68'); g.addColorStop(0.5, '#0f2257'); g.addColorStop(1, '#0a1842');
    c.fillStyle = g; c.fillRect(0, 0, CW, CH);
    g = c.createRadialGradient(CW / 2, CH * 0.35, 0, CW / 2, CH * 0.35, Math.max(CW, CH) * 0.7); g.addColorStop(0, 'rgba(90,160,255,.12)'); g.addColorStop(1, 'rgba(90,160,255,0)'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
    c.fillStyle = 'rgba(120,180,255,.035)'; c.fillRect(ox, oy, W, H);
    for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) if ((x + y) % 2) { c.fillStyle = 'rgba(255,255,255,.02)'; c.fillRect(ox + x * S, oy + y * S, S, S); }
    const gx0 = ox - Math.ceil(ox / S) * S, gy0 = oy - Math.ceil(oy / S) * S;
    for (const [lw, al] of [[Math.max(3, S * 0.08), 0.03], [1, 0.075]]) {
      c.strokeStyle = 'rgba(80,175,255,' + al + ')'; c.lineWidth = lw; c.beginPath();
      for (let x = gx0; x <= CW + 1; x += S) { const px = Math.round(x) + 0.5; c.moveTo(px, 0); c.lineTo(px, CH); }
      for (let y = gy0; y <= CH + 1; y += S) { const py = Math.round(y) + 0.5; c.moveTo(0, py); c.lineTo(CW, py); }
      c.stroke();
    }
    c.save(); c.lineWidth = Math.max(1.5, S * 0.035); c.strokeStyle = 'rgba(170,215,255,.22)'; c.beginPath(); c.roundRect ? c.roundRect(ox, oy, W, H, Math.max(4, S * 0.12)) : c.rect(ox, oy, W, H); c.stroke(); c.restore();
    const r = Math.max(1, S * 0.025);
    for (let y = gy0; y <= CH + 1; y += S) for (let x = gx0; x <= CW + 1; x += S) {
      const inB = x > ox && x < ox + W && y > oy && y < oy + H;
      c.fillStyle = inB ? 'rgba(190,230,255,.35)' : 'rgba(190,230,255,.14)'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
    }
    // no-build squares keep a red hatch
    for (let y = 0; y < lv.h; y++) for (let x = 0; x < lv.w; x++) {
      const px = ox + x * S, py = oy + y * S;
      if (s.nobuild[s.idx(x, y)]) { c.save(); c.beginPath(); c.rect(px + 3, py + 3, S - 6, S - 6); c.clip(); c.fillStyle = 'rgba(255,60,60,.07)'; c.fillRect(px, py, S, S); c.strokeStyle = 'rgba(255,90,90,.22)'; c.lineWidth = 2; for (let k = -S; k < S; k += 9) { c.beginPath(); c.moveTo(px + k, py + S); c.lineTo(px + k + S, py); c.stroke(); } c.restore(); }
    }
    void 0;
  }
  const X = x => L.ox + x * L.s, Y = y => L.oy + y * L.s;

  // ---------- ELECTRICITY RENDERING ----------
  // Distance field from the power sources through live wire, so current visibly flows AWAY from its source,
  // plus a surge front that races down the cable when a network first becomes live.
  const SURGE = 0.108; // seconds per cell for the surge front (current visibly travels along the wire)
  function wireField(T) {
    const s = G.sim, N = s.w * s.h;
    if (!G.dist || G.dist.length !== N) { G.dist = new Float32Array(N); G.liveSince = new Float32Array(N).fill(-1); G.cls = new Uint8Array(N); }
    const dist = G.dist, cls = G.cls; dist.fill(1e9);
    const q = [];
    for (const o of s.objs) { // seeds: blue = main supply, orange = power made by your machines
      if (!o.src) continue;
      const c0 = o.t === 'power' ? 0 : 1;
      const cells = o.t === 'power' ? [0, 1, 2, 3].map(k => [o.x + DX[k], o.y + DY[k]]) : [[o.x, o.y]];
      for (const [x, y] of cells) { if (!s.inb(x, y)) continue; const i = s.idx(x, y); if (s.arrive && s.arrive[i] < Infinity && s.wire[i] && dist[i] > 0) { dist[i] = 0; cls[i] = c0; q.push(i); } }
    }
    for (let h = 0; h < q.length; h++) {
      const i = q[h], x = i % s.w, y = (i / s.w) | 0;
      for (let k = 0; k < 4; k++) { const nx = x + DX[k], ny = y + DY[k]; if (!s.inb(nx, ny)) continue; const j = s.idx(nx, ny); if (s.arrive && s.arrive[j] < Infinity && s.linked(i, j) && dist[j] > dist[i] + 1) { dist[j] = dist[i] + 1; cls[j] = cls[i]; q.push(j); } }
    }
    for (let i = 0; i < N; i++) { if (s.live[i]) { if (G.liveSince[i] < 0) G.liveSince[i] = T; } else G.liveSince[i] = -1; }
  }
  function charge(i, T) {
    const s = G.sim, a = s.arrive ? s.arrive[i] : Infinity; if (!(a < Infinity)) return 0;
    const now = s.t + (s.everOn && !G.won ? Math.min(1, G.acc / TICK) : 1);   // current's front, smoothly between game ticks
    return Math.max(0, Math.min(1, (now - a) * WIRE_CPT));
  }
  function jag(c, x0, y0, x1, y1, amp, n) {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
    c.beginPath(); c.moveTo(x0, y0);
    for (let i = 1; i < n; i++) { const f = i / n, o = (Math.random() - 0.5) * 2 * amp * Math.sin(f * Math.PI); c.lineTo(x0 + dx * f + nx * o, y0 + dy * f + ny * o); }
    c.lineTo(x1, y1); c.stroke();
  }
  function wireSegments() {
    const s = G.sim, segs = [];
    const isPT = o => o && (o.t === 'power' || o.t === 'target');
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const i = s.idx(x, y); if (!s.wire[i]) continue;
      let links = 0;
      for (let k = 0; k < 4; k++) {
        const nx = x + DX[k], ny = y + DY[k]; if (!s.inb(nx, ny)) continue;
        const j = s.idx(nx, ny), o = s.at(nx, ny);
        if (s.linked(i, j)) { links++; if (j > i) segs.push({ a: i, b: j, ax: x, ay: y, bx: nx, by: ny, kind: 'w' }); }
        else if (isPT(o)) { links++; segs.push({ a: i, ax: x, ay: y, bx: x + DX[k] * 0.5, by: y + DY[k] * 0.5, kind: o.t, o }); }
      }
      if (!links) segs.push({ a: i, ax: x - 0.25, ay: y, bx: x + 0.25, by: y, kind: 'stub' });
    }
    return segs;
  }
  const ECOL = [{ glow: '40,150,255', core: '110,205,255', hot: '225,248,255', node: '#d6f6ff', hex: '#3fb8ff' },
                { glow: '255,135,25', core: '255,185,70', hot: '255,240,200', node: '#ffe6b8', hex: '#ffa030' }];
  // each cable gets a colour: blue if it touches the main power box, orange if machines feed it
  function cableColours() {
    const s = G.sim, N = s.w * s.h;
    const cc = new Uint8Array(N).fill(1), seen = new Uint8Array(N);
    for (let i = 0; i < N; i++) {
      if (!s.wire[i] || seen[i]) continue;
      const comp = [i]; seen[i] = 1; let blue = false;
      for (let h = 0; h < comp.length; h++) {
        const k = comp[h], x = k % s.w, y = (k / s.w) | 0;
        for (let d = 0; d < 4; d++) {
          const nx = x + DX[d], ny = y + DY[d]; if (!s.inb(nx, ny)) continue;
          const j = s.idx(nx, ny), o = s.at(nx, ny);
          if (o && o.t === 'power') blue = true;
          if (!seen[j] && s.wire[j] && s.linked(k, j)) { seen[j] = 1; comp.push(j); }
        }
      }
      for (const k of comp) cc[k] = blue ? 0 : 1;
    }
    G.ccKey = s; G.ccls = cc; return cc;
  }
  function drawWires(c, T) {
    const s = G.sim, S = L.s;
    wireField(T);
    const segs = wireSegments();
    c.lineCap = 'round'; c.lineJoin = 'round';
    const P = (x, y) => [X(x + 0.5), Y(y + 0.5)];
    // neon conduit: slim dark tube with a light filament; live current = white-hot core, coloured glow, lightning
    const chan = new Path2D();
    for (const g of segs) { const [x0, y0] = P(g.ax, g.ay), [x1, y1] = P(g.bx, g.by); chan.moveTo(x0, y0); chan.lineTo(x1, y1); }
    c.strokeStyle = 'rgba(0,0,0,.5)'; c.lineWidth = S * 0.1; c.stroke(chan);
    c.strokeStyle = '#1c2840'; c.lineWidth = S * 0.05; c.stroke(chan);
    // dormant neon in the cable's own colour (blue = main power cable, orange = machine-fed cable)
    const cc = cableColours();
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const g of segs) {
      const col = ECOL[cc[g.a]]; const [x0, y0] = P(g.ax, g.ay), [x1, y1] = P(g.bx, g.by);
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1);
      c.strokeStyle = 'rgba(' + col.glow + ',.10)'; c.lineWidth = S * 0.3; c.stroke();
      c.strokeStyle = 'rgba(' + col.glow + ',.28)'; c.lineWidth = S * 0.13; c.stroke();
      c.strokeStyle = 'rgba(' + col.core + ',.85)'; c.lineWidth = Math.max(1.6, S * 0.045); c.stroke();
      c.strokeStyle = 'rgba(' + col.hot + ',.45)'; c.lineWidth = Math.max(0.8, S * 0.016); c.stroke();
    }
    c.restore();
    if (G.screen === 'edit') for (const g of segs) {
      const [x0, y0] = P(g.ax, g.ay), [x1, y1] = P(g.bx, g.by);
      c.strokeStyle = CABLE_COL[String.fromCharCode(s.wire[g.a])] || '#38d9ff'; c.lineWidth = S * 0.06;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    const v = S * 2.16;
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const g of segs) {
      const ea = charge(g.a, T), eb = g.b != null ? charge(g.b, T) : ea;
      if (ea <= 0 && eb <= 0) continue;
      const col = ECOL[G.cls[g.a]] || ECOL[0];
      let [x0, y0] = P(g.ax, g.ay), [x1, y1] = P(g.bx, g.by);
      let d0 = G.dist[g.a], d1 = g.b != null ? G.dist[g.b] : (g.kind === 'power' ? d0 - 0.5 : d0 + 0.5);
      if (d1 < d0) { [x0, y0, x1, y1] = [x1, y1, x0, y0]; [d0, d1] = [d1, d0]; }
      const e = Math.min(1, Math.max(ea, eb)), fx = ea > 0 && eb > 0 ? 1 : e;
      const ex = x0 + (x1 - x0) * fx, ey = y0 + (y1 - y0) * fx, len = Math.hypot(x1 - x0, y1 - y0);
      const line = (w, st) => { c.strokeStyle = st; c.lineWidth = w; c.beginPath(); c.moveTo(x0, y0); c.lineTo(ex, ey); c.stroke(); };
      // thin crisp neon: soft outer haze, coloured glow, bright core, white-hot centre
      line(S * 0.34, 'rgba(' + col.glow + ',' + (0.06 * e) + ')');
      line(S * 0.14, 'rgba(' + col.glow + ',' + (0.28 * e) + ')');
      line(Math.max(1.6, S * 0.05), 'rgba(' + col.core + ',' + (0.95 * e) + ')');
      line(Math.max(0.9, S * 0.02), 'rgba(' + col.hot + ',' + e + ')');
      c.setLineDash([S * 0.1, S * 0.4]); c.lineDashOffset = d0 * S - T * v; line(Math.max(1.4, S * 0.04), 'rgba(255,255,255,' + (0.7 * e) + ')'); c.setLineDash([]);
      // lightning: jagged arcs leaping off the line
      const nx = -(y1 - y0) / (len || 1), ny = (x1 - x0) / (len || 1);
      for (let t = 0; t < 5; t++) {
        if (Math.random() > 0.6) continue;
        const side = Math.random() < 0.5 ? 1 : -1, amp = S * (0.06 + Math.random() * 0.2);
        const f0 = Math.random() * 0.5 * fx, f1 = Math.min(fx, f0 + 0.3 + Math.random() * 0.5);
        c.strokeStyle = 'rgba(' + col.core + ',' + (0.6 * e) + ')'; c.lineWidth = Math.max(0.6, S * 0.008);
        c.beginPath();
        for (let k = 0; k <= 7; k++) { const f = f0 + (f1 - f0) * k / 7, w = side * amp * Math.sin(k / 7 * Math.PI) * (0.5 + Math.random() * 0.7); const px = x0 + (x1 - x0) * f + nx * w, py = y0 + (y1 - y0) * f + ny * w; k ? c.lineTo(px, py) : c.moveTo(px, py); }
        c.stroke();
        if (Math.random() < 0.3) { c.strokeStyle = 'rgba(' + col.hot + ',' + (0.6 * e) + ')'; c.lineWidth = Math.max(0.6, S * 0.008); c.stroke(); }
      }
      if (e < 1 || (ea > 0 && eb === 0)) glowAt(c, ex, ey, S * 0.55, col.hex, 0.85);
    }
    c.restore();
    // electric crackle: short jagged sparks that flicker along live wires
    G.cracks = G.cracks || [];
    const liveCells = []; for (let i = 0; i < s.live.length; i++) if (s.live[i] && s.wire[i] && charge(i, T) > 0.9) liveCells.push(i);
    if (liveCells.length && G.cracks.length < 3 + liveCells.length / 4 && Math.random() < 0.35) {
      const i = liveCells[(Math.random() * liveCells.length) | 0], cx = i % s.w + 0.5, cy = ((i / s.w) | 0) + 0.5;
      const horiz = (i % s.w + 1 < s.w && s.linked(i, i + 1)) || (i % s.w > 0 && s.linked(i, i - 1));
      const ang = (horiz ? 0 : Math.PI / 2) + (Math.random() - 0.5) * 0.9, len = 0.35 + Math.random() * 0.5;
      const pts = [], n = 5 + ((Math.random() * 3) | 0);
      for (let k = 0; k <= n; k++) { const u = k / n - 0.5, off = (k === 0 || k === n) ? 0 : (Math.random() - 0.5) * 0.22; pts.push([cx + Math.cos(ang) * u * len - Math.sin(ang) * off, cy + Math.sin(ang) * u * len + Math.cos(ang) * off]); }
      const br = Math.random() < 0.4 ? pts[(n / 2) | 0] : null;
      G.cracks.push({ pts, br, bang: ang + (Math.random() < 0.5 ? 1 : -1) * (0.8 + Math.random() * 0.6), t: 0, life: 0.09 + Math.random() * 0.14, col: (ECOL[G.cls[i]] || ECOL[0]).core, cell: i });
    }
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    G.cracks = G.cracks.filter(k => (k.t += 1 / 60) < k.life && s.live[k.cell]);
    for (const k of G.cracks) {
      const f = (Math.random() < 0.25 ? 0.4 : 1) * (1 - k.t / k.life * 0.5);
      const path = () => { c.beginPath(); k.pts.forEach((p, n) => n ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1])));
        if (k.br) { c.moveTo(X(k.br[0]), Y(k.br[1])); c.lineTo(X(k.br[0] + Math.cos(k.bang) * 0.2), Y(k.br[1] + Math.sin(k.bang) * 0.2)); } };
      path(); c.strokeStyle = 'rgba(' + k.col + ',' + (0.35 * f) + ')'; c.lineWidth = Math.max(2, S * 0.07); c.stroke();
      path(); c.strokeStyle = 'rgba(255,255,255,' + (0.9 * f) + ')'; c.lineWidth = Math.max(0.8, S * 0.018); c.stroke();
    }
    c.restore();
    // glowing plug-in points where a live wire enters a machine, and a faint coloured haze over live circuits
    c.save(); c.globalCompositeOperation = 'lighter';
    for (let i = 0; i < s.live.length; i++) if (s.live[i] && s.wire[i] && charge(i, T) > 0.9 && (i % 2 === 0)) {
      const col = ECOL[G.cls[i]] || ECOL[0]; glowAt(c, X(i % s.w + 0.5), Y(((i / s.w) | 0) + 0.5), S * 1.7, col.hex, 0.045);
    }
    c.restore();
    for (const o of s.objs) {
      if (o.t === 'power' || o.t === 'target') continue;
      const i = s.idx(o.x, o.y); if (!s.wire[i] || charge(i, T) < 0.9) continue;
      const col = ECOL[G.cls[i]] || ECOL[0];
      for (let k = 0; k < 4; k++) {
        const nx = o.x + DX[k], ny = o.y + DY[k]; if (!s.inb(nx, ny) || !s.linked(i, s.idx(nx, ny))) continue;
        const px = X(o.x + 0.5 + DX[k] * 0.34), py = Y(o.y + 0.5 + DY[k] * 0.34);
        glowAt(c, px, py, S * 0.22, col.hex, 0.9);
        c.beginPath(); c.arc(px, py, Math.max(2, S * 0.045), 0, TAU); c.fillStyle = '#ffffff'; c.fill();
      }
    }
    // small glowing joints at bends and junctions only
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const i = s.idx(x, y); if (!s.wire[i]) continue;
      let h = 0, vv = 0;
      for (let k = 0; k < 4; k++) { const nx = x + DX[k], ny = y + DY[k]; if (!s.inb(nx, ny)) continue; const o = s.at(nx, ny); if (s.linked(i, s.idx(nx, ny)) || (o && (o.t === 'power' || o.t === 'target'))) { if (k % 2 === 0) h++; else vv++; } }
      if ((h && !vv) || (vv && !h)) continue;
      const e = charge(i, T), [cx, cy] = P(x, y), col = ECOL[G.cls[i]] || ECOL[0];
      c.beginPath(); c.arc(cx, cy, S * 0.06, 0, TAU); c.fillStyle = '#0d1422'; c.fill(); c.strokeStyle = '#3a4d6a'; c.lineWidth = 1.2; c.stroke();
      c.beginPath(); c.arc(cx, cy, S * 0.032, 0, TAU); c.fillStyle = e > 0.5 ? '#ffffff' : ECOL[cc[i]].hex; c.fill();
      if (e > 0.5) glowAt(c, cx, cy, S * 0.22, col.hex, 0.6 + 0.2 * Math.sin(T * 13 + x * 2 + y));
    }
  }
  // power-making parts flare into the wire they stand on
  function drawFeedArcs(c, T) {
    const s = G.sim, S = L.s;
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    for (const o of s.objs) {
      if (!o.src || o.t === 'power' || !s.wire[s.idx(o.x, o.y)] || Math.random() > 0.35) continue;
      const cx = X(o.rx + 0.5), cy = Y(o.ry + 0.5), a = Math.random() * TAU;
      c.strokeStyle = 'rgba(255,200,120,.9)'; c.lineWidth = 1.3;
      jag(c, cx + Math.cos(a) * S * 0.3, cy + Math.sin(a) * S * 0.3, cx + Math.cos(a) * S * 0.55, cy + Math.sin(a) * S * 0.55, S * 0.05, 4);
    }
    c.restore();
  }
  function polyLen(pts) { let l = 0; for (let i = 1; i < pts.length; i++) l += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return l; }
  function along(pts, u) {
    let target = u * polyLen(pts);
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (target <= l || i === pts.length - 1) { const k = l ? Math.min(1, target / l) : 0; return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, (b[0] - a[0]) / (l || 1), (b[1] - a[1]) / (l || 1)]; }
      target -= l;
    }
    return [pts[0][0], pts[0][1], 1, 0];
  }
  function strokePts(c, pts) { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(X(p[0]), Y(p[1])) : c.moveTo(X(p[0]), Y(p[1]))); c.stroke(); }

  // Flows (air, light, laser, water, steam) grow out from their machine at FLOW_SPEED squares per second,
  // so the player sees the wind / beam / water travel instead of it appearing all at once.
  const FLOW_SPEED = 6;   // squares per second, matches the engine's FLOW_CPT per tick
  function trimPts(pts, L) {
    const out = [pts[0]]; let left = L;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l <= left) { out.push(b); left -= l; continue; }
      const k = l ? left / l : 0; out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k]); break;
    }
    return out;
  }
  // draw each flow only as far as it has travelled in the game (engine reach), smoothly between ticks
  function revealFlows(F, T) {
    const frac = Math.min(1, G.acc / TICK), out = {};
    for (const kind in F) {
      out[kind] = F[kind].map(r => {
        if (!r.pts || r.reach == null || r.arrived) return r;
        const shown = Math.min(r.len, r.reach + frac * FLOW_SPEED * TICK / 1000);
        if (shown >= r.len) return r;
        return Object.assign({}, r, { pts: trimPts(r.pts, Math.max(0.05, shown)), hit: null, growing: true });
      });
    }
    return out;
  }
  function drawFlowsUnder(c, T) {
    const F = revealFlows(G.sim.flows, T), S = L.s;
    for (const o of G.sim.objs) {
      if (o.t === 'heater' && o.fire) glowAt(c, X(o.rx + 0.5), Y(o.ry + 0.3), S * 1.6, '#ff8a2a', 0.14 + 0.05 * Math.random());
      if (o.t === 'target' && o.powered) glowAt(c, X(o.rx + 0.5), Y(o.ry + 0.45), S * 2.4, '#46e8ff', 0.18);
    }
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    // light: no band, just a bright ray with flickering side rays and sparkles of light travelling along it
    for (const r of F.light) {
      const [a0, b0] = r.pts, ax = X(a0[0]), ay = Y(a0[1]), bx = X(b0[0]), by = Y(b0[1]);
      const len = Math.hypot(bx - ax, by - ay) || 1, nx = -(by - ay) / len, ny = (bx - ax) / len;
      const fl = 0.85 + 0.15 * Math.sin(T * 23 + a0[0] * 3);
      const ray = (off, w, al) => {
        const g = c.createLinearGradient(ax, ay, bx, by); g.addColorStop(0, 'rgba(255,236,170,' + al + ')'); g.addColorStop(1, 'rgba(255,220,130,' + (al * 0.25) + ')');
        c.strokeStyle = g; c.lineWidth = w; c.beginPath(); c.moveTo(ax + nx * off, ay + ny * off); c.lineTo(bx + nx * off, by + ny * off); c.stroke();
      };
      ray(0, Math.max(1.5, S * 0.04), 0.8 * fl);
      ray(0, S * 0.12, 0.16 * fl);
      for (const sd of [-1, 1]) ray(sd * S * (0.1 + 0.03 * Math.sin(T * 5 + sd)), Math.max(0.7, S * 0.012), 0.3 * (0.6 + 0.4 * Math.sin(T * 9 + sd * 2)));
      const n = Math.max(3, Math.round(len / S * 2.2));
      for (let k = 0; k < n; k++) {
        const u = (T * (r.beam ? 0.66 : 0.48) + k / n + (k * 0.37) % 0.2) % 1, side = Math.sin(k * 12.9 + T * 2) * S * 0.09;
        const px = ax + (bx - ax) * u + nx * side, py = ay + (by - ay) * u + ny * side, tw = Math.sin(u * Math.PI) * (0.6 + 0.4 * Math.sin(T * 17 + k));
        c.fillStyle = 'rgba(255,240,190,' + (0.85 * tw) + ')'; c.beginPath(); c.arc(px, py, Math.max(0.9, S * 0.025), 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,210,120,' + (0.25 * tw) + ')'; c.beginPath(); c.arc(px, py, S * 0.08, 0, TAU); c.fill();
      }
      if (r.hit) { const e = r.pts[1]; c.restore(); glowAt(c, X(e[0]), Y(e[1]), S * 0.4, COL.light, 0.45 * fl); c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; }
    }
    // air: a soft rolling current. Undulating wind ribbons that taper in and out, travel with the flow,
    // and fan out a little with distance, plus drifting dust motes that ride the gusts.
    c.restore();
    const now = T, fdt = Math.min(0.05, Math.max(0, now - (G.lastFlowT || now))); G.lastFlowT = now;
    G.airMotes = G.airMotes || [];
    for (const r of F.air) {
      const [a, b] = r.pts; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.01) continue;
      const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len, nx = -uy, ny = ux;
      const pt = (u, o) => [X(a[0] + ux * u + nx * o), Y(a[1] + uy * u + ny * o)];
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
      // rolling wind ribbons: each one a single smooth curve that fades in and out along its length
      const lanes = 5, spacing = 1.4;
      for (let lane = 0; lane < lanes; lane++) {
        const base = (lane - (lanes - 1) / 2) * 0.1, ph = lane * 0.71, sp = 1.56 + (lane % 3) * 0.24;
        for (let k = -1; k < len / spacing + 1; k++) {
          const u0 = Math.max(0.15, k * spacing + ((T * sp + ph) % spacing)), u1 = Math.min(len, k * spacing + ((T * sp + ph) % spacing) + 0.9);
          if (u1 - u0 < 0.08) continue;
          const N = 14, P0 = pt(u0, 0), P1 = pt(u1, 0);
          const g2 = c.createLinearGradient(P0[0], P0[1], P1[0], P1[1]);
          const tail = Math.min(1, (len - u0) * 1.2);
          g2.addColorStop(0, 'rgba(220,242,255,0)'); g2.addColorStop(0.5, 'rgba(220,242,255,' + (0.38 * tail) + ')'); g2.addColorStop(1, 'rgba(220,242,255,0)');
          c.strokeStyle = g2; c.lineWidth = Math.max(1, S * 0.028);
          c.beginPath();
          for (let s = 0; s <= N; s++) {
            const u = u0 + (u1 - u0) * s / N, spread = 1 + u * 0.12;
            const o = base * spread + Math.sin(u * 2.6 - T * 4.5 + lane * 1.9) * 0.07;
            const p = pt(u, o); s ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]);
          }
          c.stroke();
        }
      }
      c.restore();
      if (Math.random() < 0.5) G.airMotes.push({ r, u: 0.2, o: (Math.random() - 0.5) * 0.45, v: 1.92 + Math.random() * 1.08, ph: Math.random() * TAU, s: 0.5 + Math.random() });
    }
    G.airMotes = G.airMotes.filter(m => F.air.includes(m.r));
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const m of G.airMotes) {
      const [a, b] = m.r.pts; const len = Math.hypot(b[0] - a[0], b[1] - a[1]); const ux = (b[0] - a[0]) / len, uy = (b[1] - a[1]) / len;
      m.u += m.v * fdt; m.o += Math.sin(T * 5 + m.ph) * 0.25 * fdt;
      if (m.u > len) { m.dead = true; continue; }
      const al = Math.min(1, m.u * 2, (len - m.u) * 2) * 0.55;
      c.fillStyle = 'rgba(230,248,255,' + al + ')';
      c.beginPath(); c.arc(X(a[0] + ux * m.u - uy * m.o), Y(a[1] + uy * m.u + ux * m.o), Math.max(0.8, S * 0.022 * m.s), 0, TAU); c.fill();
    }
    c.restore();
    G.airMotes = G.airMotes.filter(m => !m.dead);
    // water: a glassy stream that thins and speeds up as it falls, with a wobbling surface,
    // highlights sliding down it, droplets breaking off and a splash where it lands
    for (const r of F.water) {
      const k0 = r.src, dir = k0 && k0.d === 2 ? -1 : 1, e0 = r.pts[r.pts.length - 1];
      const sx = k0 ? k0.rx + 0.5 + dir * 0.46 : r.pts[0][0], sy = k0 ? k0.ry + 0.36 : r.pts[0][1];
      const colx = e0[0], ey = e0[1], N = Math.max(14, Math.ceil((ey - sy) * 14));
      const pts = [];
      for (let s = 0; s <= N; s++) {
        const f = s / N, yy = sy + (ey - sy) * f;
        // leaves the spout sideways and curves into a vertical fall (parabola), then a gentle wobble
        const arc = Math.min(1, (yy - sy) / 0.55), xx = sx + (colx - sx) * (1 - (1 - arc) * (1 - arc));
        const wob = Math.sin(yy * 7 - T * 12) * 0.018 * f;
        pts.push([X(xx + wob), Y(yy), f]);
      }
      const ribbon = (wmul, style) => {
        c.strokeStyle = style;
        for (let s = 1; s < pts.length; s++) { const f = pts[s][2]; c.lineWidth = S * wmul * (1.1 - 0.5 * f); c.beginPath(); c.moveTo(pts[s - 1][0], pts[s - 1][1]); c.lineTo(pts[s][0], pts[s][1]); c.stroke(); }
      };
      c.save(); c.lineCap = 'round';
      ribbon(0.26, 'rgba(20,70,140,.35)');
      ribbon(0.18, 'rgba(50,130,210,.55)');
      ribbon(0.08, 'rgba(120,190,245,.45)');
      for (let h = 0; h < 6; h++) {   // highlights accelerate as they fall
        const t0 = ((T * 1.02 + h / 6) % 1), f0 = t0 * t0, f1 = Math.min(1, f0 + 0.06 + 0.12 * t0);
        const i0 = Math.floor(f0 * N), i1 = Math.floor(f1 * N);
        if (i1 <= i0) continue;
        c.strokeStyle = 'rgba(215,240,255,' + (0.55 * Math.sin(t0 * Math.PI)) + ')'; c.lineWidth = Math.max(1, S * 0.025);
        c.beginPath(); c.moveTo(pts[i0][0] - S * 0.035, pts[i0][1]); for (let s = i0 + 1; s <= i1; s++) c.lineTo(pts[s][0] - S * 0.035, pts[s][1]); c.stroke();
      }
      c.restore();
      const e = r.pts[r.pts.length - 1];
      // splash ring + spray
      const sk = (T * 2.5) % 1;
      c.save(); c.strokeStyle = 'rgba(150,215,255,' + (0.5 * (1 - sk)) + ')'; c.lineWidth = 1.5;
      c.beginPath(); c.ellipse(X(e[0]), Y(e[1]), S * (0.12 + sk * 0.3), S * (0.04 + sk * 0.08), 0, 0, TAU); c.stroke(); c.restore();
      if (Math.random() < 0.7) P(e[0] + (Math.random() - 0.5) * 0.2, e[1] - 0.05, (Math.random() - 0.5) * 2.4, -1.2 - Math.random() * 1.6, 0.5, '#8fd2ff', 0.035 + Math.random() * 0.03, 'drop');
      if (Math.random() < 0.15) { const q = along(r.pts, 0.5 + Math.random() * 0.4); P(q[0] + (Math.random() - 0.5) * 0.1, q[1], (Math.random() - 0.5) * 0.4, 1.5, 0.35, '#a8dcff', 0.03, 'drop'); }
    }
  }
  function drawFlowsOver(c, T) {
    const F = revealFlows(G.sim.flows, T), S = L.s;
    // steam
    for (const r of F.steam) {
      const len = polyLen(r.pts); const n = Math.max(4, Math.ceil(len * 5));
      for (let i = 0; i < n; i++) {
        const u = ((i / n) + T * 0.24) % 1;
        const q = along(r.pts, u);
        const rad = S * (0.1 + 0.16 * u + 0.03 * Math.sin(i * 3.1));
        const wx = Math.sin(T * 2 + i * 1.7) * 0.06;
        c.beginPath(); c.arc(X(q[0] + wx), Y(q[1]), rad, 0, TAU);
        c.fillStyle = 'rgba(235,243,255,' + (0.38 * (1 - u * 0.7)) + ')'; c.fill();
      }
    }
    // laser
    for (const r of F.laser) {
      c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
      const fl = 0.85 + Math.random() * 0.15;
      c.strokeStyle = 'rgba(255,40,80,' + (0.22 * fl) + ')'; c.lineWidth = S * 0.26; strokePts(c, r.pts);
      c.strokeStyle = 'rgba(255,60,100,' + (0.8 * fl) + ')'; c.lineWidth = S * 0.08; strokePts(c, r.pts);
      c.strokeStyle = '#ffe6ec'; c.lineWidth = S * 0.025; strokePts(c, r.pts);
      c.restore();
      const e = r.pts[r.pts.length - 1];
      glowAt(c, X(e[0]), Y(e[1]), S * 0.3, COL.laser, 0.7);
      if (r.hit && Math.random() < 0.35) P(e[0], e[1], (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 0.25, '#ff8aa0', 0.03, 'spark');
    }
    // wireless: the sender sweeps its range like a radar, locks on to a receiver, then power arcs across
    const linked = new Set(F.wifi.filter(w => w.r).map(w => w.s));
    for (const w of F.wifi) {
      const sx = X(w.s.x + 0.5), sy = Y(w.s.y + 0.25), R = WIFI_RANGE, scanning = !linked.has(w.s);
      if (!w.r) {
        const x0 = X(w.s.x - R), y0 = Y(w.s.y - R), side = S * (2 * R + 1);
        // range frame with glowing corner brackets
        c.save(); c.strokeStyle = hexA(COL.wifi, scanning ? 0.35 : 0.15); c.lineWidth = 1; c.setLineDash([4, 6]); c.strokeRect(x0, y0, side, side); c.setLineDash([]);
        c.strokeStyle = hexA(COL.wifi, scanning ? 0.9 : 0.4); c.lineWidth = 2.5; const bl = S * 0.45;
        for (const [cx, cy, dx, dy] of [[x0, y0, 1, 1], [x0 + side, y0, -1, 1], [x0, y0 + side, 1, -1], [x0 + side, y0 + side, -1, -1]]) { c.beginPath(); c.moveTo(cx + dx * bl, cy); c.lineTo(cx, cy); c.lineTo(cx, cy + dy * bl); c.stroke(); }
        // radar sweep (fast while searching, slow idle once locked)
        const ang = T * (scanning ? 3.2 : 1.2);
        c.beginPath(); c.rect(x0, y0, side, side); c.clip();
        c.globalCompositeOperation = 'lighter';
        const rr = side * 0.75;
        for (let k = 0; k < 14; k++) {
          const a0 = ang - k * 0.06; c.fillStyle = hexA(COL.wifi, (scanning ? 0.16 : 0.06) * (1 - k / 14));
          c.beginPath(); c.moveTo(sx, sy); c.arc(sx, sy, rr, a0 - 0.06, a0); c.closePath(); c.fill();
        }
        c.strokeStyle = hexA(COL.wifi, scanning ? 0.8 : 0.3); c.lineWidth = 2; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(ang) * rr, sy + Math.sin(ang) * rr); c.stroke();
        // squares light up as the beam passes over them
        for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
          if (!dx && !dy) continue;
          const cx = X(w.s.x + dx + 0.5), cy = Y(w.s.y + dy + 0.5), ca = Math.atan2(cy - sy, cx - sx);
          const lag = ((ang - ca) % TAU + TAU) % TAU; if (lag > 1.2) continue;
          c.fillStyle = hexA(COL.wifi, (scanning ? 0.22 : 0.08) * (1 - lag / 1.2)); c.fillRect(cx - S * 0.45, cy - S * 0.45, S * 0.9, S * 0.9);
        }
        // pulse rings from the antenna
        for (let k = 0; k < 2; k++) { const u = ((T * 0.9) + k * 0.5) % 1; c.strokeStyle = hexA(COL.wifi, 0.4 * (1 - u)); c.lineWidth = 2; c.beginPath(); c.arc(sx, sy, S * (0.3 + u * R), 0, TAU); c.stroke(); }
        c.restore();
      } else {
        const rx = X(w.r.x + 0.5), ry = Y(w.r.y + 0.2);
        // lock-on reticle on the receiver
        c.save(); c.translate(rx, ry + S * 0.2); c.rotate(T * 1.5); c.strokeStyle = hexA(COL.wifi, 0.85); c.lineWidth = 2;
        for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.beginPath(); c.arc(0, 0, S * 0.55, -0.35, 0.35); c.stroke(); }
        c.restore();
        // power arcing through the air: glowing curved beam, travelling energy orbs and crackle
        const mx = (sx + rx) / 2, my = Math.min(sy, ry) - S * (0.6 + 0.15 * Math.sin(T * 3));
        const grow = w.arrived || w.len == null ? 1 : Math.min(1, (w.reach + Math.min(1, G.acc / TICK) * FLOW_CPT) / w.len);
        const q = t => [(1 - t) * (1 - t) * sx + 2 * (1 - t) * t * mx + t * t * rx, (1 - t) * (1 - t) * sy + 2 * (1 - t) * t * my + t * t * ry];
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
        const curve = () => { c.beginPath(); for (let k = 0; k <= 24; k++) { const [px, py] = q(grow * k / 24); k ? c.lineTo(px, py) : c.moveTo(px, py); } };
        curve(); c.strokeStyle = hexA(COL.wifi, 0.12); c.lineWidth = S * 0.3; c.stroke();
        curve(); c.strokeStyle = hexA(COL.wifi, 0.45); c.lineWidth = S * 0.08; c.stroke();
        curve(); c.strokeStyle = 'rgba(220,255,235,.85)'; c.lineWidth = Math.max(1.2, S * 0.022); c.stroke();
        for (let k = 0; k < 5; k++) {
          const t = ((T * 0.8) + k / 5) % 1 * grow, [px, py] = q(t);
          glowAt(c, px, py, S * 0.25, COL.wifi, 0.8); c.fillStyle = '#eafff2'; c.beginPath(); c.arc(px, py, Math.max(1.5, S * 0.04), 0, TAU); c.fill();
        }
        if (Math.random() < 0.5) {
          c.strokeStyle = hexA(COL.wifi, 0.8); c.lineWidth = 1; c.beginPath();
          for (let k = 0; k <= 12; k++) { const t = k / 12, [px, py] = q(t); const j = (Math.random() - 0.5) * S * 0.18 * Math.sin(t * Math.PI); k ? c.lineTo(px + j, py + j) : c.moveTo(px, py); }
          c.stroke();
        }
        c.restore();
        glowAt(c, rx, ry + S * 0.1, S * 0.6, COL.wifi, 0.4 + 0.15 * Math.sin(T * 8));
      }
    }
    // music: rings pulse out on every beat, notes hop out in time with it
    const BEAT = 0.55;
    for (const m of F.music) {
      const cx = X(m.x + 0.5), cy = Y(m.y + 0.4), bt = (T % BEAT) / BEAT, kick = Math.exp(-bt * 6);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let r = 0; r < 3; r++) {
        const u = ((T / BEAT + r / 3) % 1);
        c.strokeStyle = hexA(COL.music, 0.55 * (1 - u)); c.lineWidth = Math.max(1, S * 0.03 * (1 - u));
        c.beginPath(); c.arc(cx, cy, S * (0.35 + u * 1.15), 0, TAU); c.stroke();
      }
      glowAt(c, cx, cy, S * (0.5 + 0.25 * kick), COL.music, 0.25 + 0.3 * kick);
      c.restore();
      c.save(); c.textAlign = 'center'; c.textBaseline = 'middle';
      for (let i = 0; i < 6; i++) {
        const u = (T / BEAT / 3 + i / 6) % 1, ang = i * 1.05 + 0.4, hop = Math.abs(Math.sin((T / BEAT) * Math.PI)) * 0.12;
        const x = m.x + 0.5 + Math.cos(ang) * (0.45 + u * 0.8), y = m.y + 0.4 + Math.sin(ang) * (0.45 + u * 0.8) - u * 0.25 - hop;
        const sz = S * (0.26 + 0.08 * kick);
        c.font = '700 ' + Math.round(sz) + 'px "Exo 2", sans-serif';
        c.globalAlpha = Math.sin(u * Math.PI);
        c.fillStyle = i % 2 ? COL.music : '#ffd1f3'; c.shadowColor = COL.music; c.shadowBlur = 8;
        c.fillText(i % 3 ? '♪' : '♫', X(x), Y(y));
      }
      c.restore();
    }
    // woken sound bots and music-fed hamsters pulse to the beat
    for (const o of G.sim.objs) if ((o.t === 'soundbot' && o.latched) || (o.t === 'hamster' && o.inMusic)) {
      const bt = (T % BEAT) / BEAT;
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = hexA(COL.music, 0.5 * (1 - bt)); c.lineWidth = 2;
      c.beginPath(); c.arc(X(o.rx + 0.5), Y(o.ry + 0.4), S * (0.3 + bt * 0.4), 0, TAU); c.stroke(); c.restore();
    }
  }
  function drawProj(c, frac) {
    const S = L.s, dt = G.frameDt || 0.016;
    for (const p of G.sim.proj) {
      // follow the game position smoothly: the ball accelerates as it falls and never stops-and-starts
      const tx = p.px + (p.x - p.px) * frac + 0.5, ty = p.py + (p.y - p.py) * frac + 0.5;
      if (p.vx == null) { p.vx = tx; p.vy = ty; p.sp = 0; }
      const dx = tx - p.vx, dy = ty - p.vy, dist = Math.hypot(dx, dy);
      p.sp = Math.min(14, Math.max(p.sp + dt * 18, dist * 6));
      const mv = Math.min(dist, p.sp * dt); if (dist > 0) { p.vx += dx / dist * mv; p.vy += dy / dist * mv; }
      if (dist > 2) { p.vx = tx; p.vy = ty; }
      const x = p.vx, y = p.vy;
      c.save(); c.globalAlpha = 0.35; c.fillStyle = '#000'; c.beginPath(); c.ellipse(X(x + 0.04), Y(y + 0.2), S * 0.18, S * 0.05, 0, 0, TAU); c.fill(); c.restore();
      const g = c.createRadialGradient(X(x - 0.07), Y(y - 0.08), S * 0.01, X(x), Y(y), S * 0.21);
      if (p.kind === 'ball') { g.addColorStop(0, '#ff9a8a'); g.addColorStop(0.25, '#e8322a'); g.addColorStop(0.7, '#a3140f'); g.addColorStop(1, '#4a0606'); }
      else { g.addColorStop(0, '#9aa3b5'); g.addColorStop(0.5, '#3a4258'); g.addColorStop(1, '#0d1018'); }
      c.beginPath(); c.arc(X(x), Y(y), S * 0.2, 0, TAU); c.fillStyle = g; c.fill();
      c.strokeStyle = 'rgba(40,0,0,.6)'; c.lineWidth = 1; c.stroke();
      if (p.kind === 'cannonball' && Math.random() < 0.8) P(x - DX[p.d] * 0.25, y, -DX[p.d] * 0.3, -0.2, 0.6, '#8d95a8', 0.12, 'smoke');
    }
  }

  function powerCue(c, T) {
    const s = G.sim; if (!s || s.on || G.won || G.screen !== 'play') return;
    const p = s.objs.find(o => o.t === 'power'); if (!p) return;
    const S = L.s, cx = X(p.x + 0.5), cy = Y(p.y + 0.5), k = (T * 0.9) % 1, ready = level() && Object.keys(level().inv).every(t => invLeft(t) <= 0);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const off of [0, 0.5]) { const u = (k + off) % 1; c.strokeStyle = 'rgba(255,170,60,' + ((ready ? 0.75 : 0.4) * (1 - u)) + ')'; c.lineWidth = Math.max(1.5, S * 0.05); c.beginPath(); c.arc(cx, cy, S * (0.45 + u * 0.55), 0, TAU); c.stroke(); }
    c.restore();
    if (ready) { c.save(); c.font = '800 ' + Math.max(10, S * 0.24) + 'px ' + (getComputedStyle(document.body).getPropertyValue('--display').trim() || 'sans-serif'); c.textAlign = 'center'; c.fillStyle = '#ffd08a'; c.shadowColor = '#ff8a1f'; c.shadowBlur = 10;
      c.fillText('TAP', cx, cy - S * 0.62 - Math.abs(Math.sin(T * 4)) * S * 0.08); c.restore(); }
  }
  function drawObjects(c, T, dt) {
    powerCue(c, T);
    const s = G.sim, S = L.s;
    const k = 1 - Math.exp(-dt * 13);
    const dragging = G.drag && G.drag.moved && G.drag.kind === 'board' ? G.drag.uid : null;
    const list = s.objs.slice().sort((a, b) => a.ry - b.ry);
    for (const o of list) {
      if (o.rx == null) { o.rx = o.x; o.ry = o.y; if (G.dropFrom && G.time - G.dropFrom.t < 0.3 && Math.hypot(G.dropFrom.x - o.x, G.dropFrom.y - o.y) < 1.2 && o.pid && G.placed.length && o.pid === G.placed[G.placed.length - 1].uid) { o.rx = G.dropFrom.x; o.ry = G.dropFrom.y; o.settle = true; G.dropFrom = null; } }
      if (o.settle) { o.rx += (o.x - o.rx) * Math.min(1, dt * 14); o.ry += (o.y - o.ry) * Math.min(1, dt * 14); if (Math.abs(o.x - o.rx) + Math.abs(o.y - o.ry) < 0.01) { o.rx = o.x; o.ry = o.y; o.settle = false; } }
      // glide at the bots' own pace (one square per two ticks) so movement is continuous, not square-to-square hops
      const step = dt * 1000 / (TICK * BOT_EVERY) * 1.08;
      for (const [p, r] of [['x', 'rx'], ['y', 'ry']]) {
        const d = o[p] - o[r];
        if (Math.abs(d) > 1.6) o[r] = o[p];          // teleports jump straight there
        else o[r] += Math.sign(d) * Math.min(Math.abs(d), step);
      }
      if (o.pid && o.pid === dragging) continue;
      if (o.t === 'power') o.on = s.on;
      const cx = X(o.rx + 0.5), cy = Y(o.ry + 0.5);
      // fixed plate
      if (o.fixed && !(TYPES[o.t] && TYPES[o.t].anchored)) {
        // fixed parts: just four faint corner ticks (no tile behind the machine)
        c.save(); c.strokeStyle = 'rgba(160,200,255,.35)'; c.lineWidth = 1.5; const h = S * 0.46, k = S * 0.12;
        for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.beginPath(); c.moveTo(cx + sx * h, cy + sy * (h - k)); c.lineTo(cx + sx * h, cy + sy * h); c.lineTo(cx + sx * (h - k), cy + sy * h); c.stroke(); }
        c.restore();
      }
      let sc = 1;
      if (o.born != null && T - o.born < 0.35) { const u = (T - o.born) / 0.35; const s1 = 1.70158; sc = 1 + (s1 + 1) * Math.pow(u - 1, 3) + s1 * Math.pow(u - 1, 2); }
      let rot = 0;
      if (o.spin != null && T - o.spin < 0.25) rot = (1 - (T - o.spin) / 0.25) * -0.6;
      const below = s.at(o.x, o.y + 1);
      o.boil = o.t === 'kettle' && below && below.t === 'heater' && below.fire;
      const run = running(o);
      c.save(); c.translate(cx, cy);
      if (run) { const a = run * Math.max(0.6, S / 70); c.translate(Math.sin(T * 61 + o.id) * a, Math.cos(T * 53 + o.id * 2) * a * 0.6); }
      if (o.t === 'drill' && o.powered && !o.done) c.translate((Math.random() - 0.5) * 2, 0);
      emit(o, T, dt);
      c.rotate(rot); c.scale(S * sc, S * sc);
      if (o.t === 'spring' && o.bounceT != null && T - o.bounceT < 0.9) {   // squash, then spring back with a wobble
        const t = T - o.bounceT, q = t < 0.09 ? t / 0.09 : Math.exp(-(t - 0.09) * 5) * Math.cos((t - 0.09) * 20);
        const ra = (o.d % 2) * Math.PI / 2; c.rotate(ra); c.scale(1 - 0.3 * q, 1 + 0.12 * q); c.rotate(-ra);   // squash along its length
      }
      // no bases: each machine is drawn straight on the board and fills its square
      else { c.save(); const sg = c.createRadialGradient(0, 0.42, 0, 0, 0.42, 0.34); sg.addColorStop(0, 'rgba(0,0,0,.28)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = sg; c.beginPath(); c.ellipse(0, 0.42, 0.34, 0.07, 0, 0, TAU); c.fill(); c.restore(); }   // soft contact shadow only
      if (artFor(o) && !NO_PEDESTAL[o.t] && isActive(o)) aura(c, o, T);
      paintObj(c, o, T);
      c.restore();
      windUpFx(c, o, T, cx, cy);
      if (o.t === 'target' && o.powered) arcs(c, cx, cy, S, T);
    }
  }
  // swirling blue and gold energy rings around every working machine
  function aura(c, o, T) {
    energyAura(c, o.id * 13 + 7, T, '63,184,255', 1.6, '255,190,60');
    if (Math.random() < 0.05) burst(o.x + 0.5 + (Math.random() - 0.5) * 0.8, o.y + 0.3, o.src ? '#ffc070' : '#9fe8ff', 2, 1.2);
  }
  // visible build-up before a machine acts, so nothing happens "instantly"
  function windUpFx(c, o, T, cx, cy) {
    const S = L.s;
    if ((o.t === 'balldrop' || o.t === 'cannon') && o.arm && !o.fired) {
      const k = Math.min(1, o.arm / WIND_UP + G.acc / TICK / WIND_UP);
      glowAt(c, cx, cy, S * (0.4 + 0.5 * k), '#ffb547', 0.25 + 0.5 * k);
      c.save(); c.strokeStyle = 'rgba(255,190,80,' + (0.8 * k) + ')'; c.lineWidth = 3;
      c.beginPath(); c.arc(cx, cy, S * 0.46, -Math.PI / 2, -Math.PI / 2 + TAU * k); c.stroke(); c.restore();
    }
    if (o.t === 'tpsend' && o.tpT > 0) {
      const k = Math.min(1, (o.tpT + G.acc / TICK) / WIND_UP), ix = cx, iy = cy - S;
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) {
        const u = ((T * 1.6 + i / 4) % 1);
        c.strokeStyle = hexA(COL.tp, 0.6 * k * (1 - u)); c.lineWidth = 2;
        c.beginPath(); c.ellipse(ix, iy + S * 0.4 - u * S * 0.8, S * 0.42, S * 0.12, 0, 0, TAU); c.stroke();
      }
      glowAt(c, ix, iy, S * 0.7, COL.tp, 0.5 * k); c.restore();
    }
    if (o.t === 'spybot' && o.scanT && !o.spied) {
      const a = T * 6;
      c.save(); c.globalCompositeOperation = 'lighter';
      c.strokeStyle = 'rgba(255,60,90,.35)'; c.lineWidth = 1.5; c.strokeRect(cx - S * 1.5, cy - S * 1.5, S * 3, S * 3);
      const g = c.createRadialGradient(cx, cy, 0, cx, cy, S * 1.5); g.addColorStop(0, 'rgba(255,60,90,.35)'); g.addColorStop(1, 'rgba(255,60,90,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(cx, cy); c.arc(cx, cy, S * 1.5, a, a + 0.7); c.closePath(); c.fill(); c.restore();
    }
    if (o.t === 'rotator' && o.rotT > 0) {
      const k = 1 - o.rotT / WIND_UP;
      c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(127,255,224,.7)'; c.lineWidth = 2.5;
      for (const dy of [-1, 1]) { c.beginPath(); c.arc(cx, cy + dy * S, S * 0.48, T * 5, T * 5 + TAU * k); c.stroke(); }
      c.restore();
    }
  }
  // things that were smashed crumble (shake, shrink, fade); teleported things dissolve in purple
  function drawDying(c, T) {
    const S = L.s;
    G.dying = G.dying.filter(d => T - d.t < 0.6);
    for (const d of G.dying) {
      const k = (T - d.t) / 0.6, o = d.o;
      c.save(); c.translate(X(o.x + 0.5) + (d.tp ? 0 : (Math.random() - 0.5) * 4 * (1 - k)), Y(o.y + 0.5));
      c.globalAlpha = 1 - k;
      const sc = d.tp ? 1 - 0.3 * k : 1 - 0.55 * k;
      c.scale(S * sc * (d.tp ? 1 - 0.6 * k : 1), S * sc * (d.tp ? 1 + 0.8 * k : 1));
      if (!d.tp) c.rotate((k * 0.6) * (o.id % 2 ? 1 : -1));
      paintObj(c, o, T); c.restore();
      if (d.tp) glowAt(c, X(o.x + 0.5), Y(o.y + 0.5), S * 0.8, COL.tp, 0.6 * (1 - k));
    }
  }
  function running(o) {
    switch (o.t) {
      case 'fan': return o.powered ? 0.5 : 0;
      case 'chargefan': return o.emitting ? 0.5 : 0;
      case 'generator': return o.src ? 0.8 : 0;
      case 'kettle': return o.boil ? 0.9 : (o.powered ? 0.3 : 0);
      case 'heater': return o.powered ? 0.25 : 0;
      case 'drill': return 0;
      case 'balldrop': case 'cannon': return o.arm && !o.fired ? 0.15 + 0.85 * o.arm / WIND_UP : 0;
      case 'spybot': return o.scanT && !o.spied ? 0.3 : 0;
      case 'rotator': return o.rotT > 0 ? 0.25 : 0;
      case 'hamster': return o.fed ? 0.4 : 0;
      case 'power': return o.on ? 0.15 : 0;
      case 'laser': return o.powered ? 0.12 : 0;
      case 'soundbot': return o.latched ? 0.7 : 0;
    }
    if (o.latched && BOT_TYPES.includes(o.t) && o.mode !== 'stop') return 0.45;
    return 0;
  }
  function emit(o, T, dt) {
    const x = o.rx + 0.5, y = o.ry + 0.5, r = Math.random, f = dt * 60;
    if (o.t === 'generator' && o.src && r() < 0.25 * f) P(x + 0.18 + r() * 0.15, y + (r() - 0.5) * 0.3, (r() - 0.5) * 1.5, -0.5 - r(), 0.3, '#bff8ff', 0.025, 'spark');
    if (o.t === 'heater' && o.fire && r() < 0.35 * f) P(x + (r() - 0.5) * 0.6, y - 0.3, (r() - 0.5) * 0.3, -0.8 - r() * 0.8, 0.7, r() < 0.5 ? '#ffb03a' : '#ff6a2a', 0.022, 'spark');
    if (o.boil && r() < 0.2 * f) P(x + (o.d === 0 ? 0.45 : -0.45), y - 0.12, (o.d === 0 ? 0.4 : -0.4), -0.6, 0.8, '#eef4ff', 0.06, 'smoke');
    const moving = Math.abs(o.rx - o.x) + Math.abs(o.ry - o.y) > 0.05;
    if (BOT_TYPES.includes(o.t) && moving && r() < 0.5 * f) {
      if (o.t === 'helibot') P(x + (r() - 0.5) * 0.6, y - 0.35, (r() - 0.5) * 1.2, 0.2, 0.4, '#c9d6f0', 0.03, 'smoke');
      else if (o.t === 'soundbot') P(x + (r() - 0.5) * 0.4, y - 0.4, (r() - 0.5) * 0.4, -0.4, 0.6, '#ff9be6', 0.03, 'spark');
      else { const back = o.d === 0 ? -1 : 1; P(x + back * 0.35, y + 0.36, back * (0.5 + r()), -0.3 - r() * 0.4, 0.5, '#8d95a8', 0.05, 'smoke'); }
    }
    if (o.t === 'drill' && o.powered && !o.done && r() < 0.8 * f) { const tx = x + DX[o.d] * 0.48, ty = y + DY[o.d] * 0.48; P(tx, ty, (r() - 0.5) * 4, (r() - 0.5) * 4 - 1, 0.3, r() < 0.5 ? '#ffd84a' : '#ffffff', 0.025, 'spark'); }
    if (o.t === 'laser' && o.powered && r() < 0.08 * f) P(x + DX[o.d] * 0.42, y + DY[o.d] * 0.42, (r() - 0.5), (r() - 0.5), 0.2, '#ff8aa0', 0.02, 'spark');
    if ((o.t === 'generator' && o.src || o.t === 'power' && o.on || o.t === 'heater' && o.fire) && r() < 0.05 * f) P(x + (r() - 0.5) * 0.3, y - 0.42, (r() - 0.5) * 0.2, -0.35 - r() * 0.2, 1.6, '#8b95a6', 0.09, 'smoke');
    if (o.t === 'battery' && o.charged && r() < 0.06 * f) P(x + (r() - 0.5) * 0.4, y - 0.4, 0, -0.6, 0.5, '#3dff9a', 0.02, 'spark');
  }
  function arcs(c, cx, cy, S, T) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(160,245,255,.8)'; c.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      const a = Math.random() * TAU, r = S * (0.5 + Math.random() * 0.25);
      c.beginPath(); c.moveTo(cx, cy - S * 0.04);
      for (let j = 1; j <= 5; j++) { const f = j / 5; c.lineTo(cx + Math.cos(a) * r * f + (Math.random() - 0.5) * S * 0.12, cy - S * 0.04 + Math.sin(a) * r * f + (Math.random() - 0.5) * S * 0.12); }
      c.stroke();
    }
    c.restore();
  }
  function drawParticles(c, dt) {
    const S = L.s;
    for (const p of G.parts) {
      p.life -= dt;
      if (p.kind === 'debris' || p.kind === 'drop') p.vy += 9 * dt;
      if (p.kind === 'confetti') { p.vx += Math.sin(p.life * 6) * dt; }
      if (p.kind === 'smoke') { p.vx = p.vx * 0.97 + Math.sin(p.life * 3 + p.x) * dt * 0.3; p.vy *= 0.985; p.size += dt * 0.2; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      const a = Math.max(0, p.life / p.max);
      c.globalAlpha = p.kind === 'smoke' ? a * 0.35 : a;
      if (p.kind === 'ring') { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = p.color; c.lineWidth = Math.max(1.5, S * 0.06 * a); c.beginPath(); c.arc(X(p.x), Y(p.y), S * (p.size + (1 - a) * 2.2), 0, TAU); c.stroke(); c.restore(); }
      else if (p.kind === 'spark') { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = p.color; c.beginPath(); c.arc(X(p.x), Y(p.y), S * p.size, 0, TAU); c.fill(); c.restore(); }
      else if (p.kind === 'confetti' || p.kind === 'debris') { c.save(); c.translate(X(p.x), Y(p.y)); c.rotate(p.life * 8); c.fillStyle = p.color; c.fillRect(-S * p.size, -S * p.size * 0.5, S * p.size * 2, S * p.size); c.restore(); }
      else { c.fillStyle = p.color; c.beginPath(); c.arc(X(p.x), Y(p.y), S * p.size, 0, TAU); c.fill(); }
    }
    c.globalAlpha = 1;
    G.parts = G.parts.filter(p => p.life > 0 && p.y < level().h + 3);
  }
  function drawGhost(c, t, d, cx, cy, S, alpha, T) {
    c.save(); c.globalAlpha = alpha; c.translate(cx, cy); c.scale(S, S);
    paintObj(c, { t, d, powered: false, charge: 0, mode: 'go' }, T); c.restore();
  }
  function drawOverlay(c, T) {
    const S = L.s, s = G.sim;
    // hint ghosts
    for (const g of G.ghosts) {
      const pulse = 0.5 + 0.5 * Math.sin(T * 4);
      c.save(); rr(c, X(g.x) + 3, Y(g.y) + 3, S - 6, S - 6, S * 0.12); c.strokeStyle = 'rgba(255,181,71,' + (0.5 + pulse * 0.5) + ')'; c.lineWidth = 2.5; c.setLineDash([6, 5]); c.lineDashOffset = -T * 20; c.stroke(); c.restore();
      if (!s.at(g.x, g.y)) drawGhost(c, g.t, g.d, X(g.x + 0.5), Y(g.y + 0.5), S, 0.35 + pulse * 0.15, T);
    }
    // hover / placement preview
    const drag = G.drag && G.drag.moved ? G.drag : null;
    const h = G.hover;
    if (editable() && h && h.inb && (drag || G.sel)) {
      const t = drag ? drag.t : G.sel;
      const self = drag && drag.kind === 'board' ? s.objs.find(q => q.pid === drag.uid) : null;
      const ok = canPlace(h.x, h.y, self) && (drag && drag.kind === 'board' ? true : invLeft(t) > 0);
      const pulse = 0.5 + 0.5 * Math.sin(T * 10);
      c.save(); rr(c, X(h.x) + 2, Y(h.y) + 2, S - 4, S - 4, S * 0.16);
      const nw = ok && !PASSIVE[t] && !s.wire[s.idx(h.x, h.y)];
      c.fillStyle = !ok ? 'rgba(255,77,94,.18)' : nw ? 'rgba(255,155,47,.16)' : 'rgba(56,217,255,' + (0.14 + pulse * 0.12) + ')'; c.fill();
      c.strokeStyle = !ok ? '#ff6b8a' : nw ? '#ff9b2f' : '#7fe6ff'; c.lineWidth = 3; c.stroke(); c.restore();
      if (ok) { c.save(); c.font = '700 ' + Math.max(10, Math.round(S * 0.16)) + 'px Rajdhani, sans-serif'; c.textAlign = 'center'; c.fillStyle = nw ? '#ffb46a' : '#9fefff'; c.fillText(nw ? 'NO POWER' : (PASSIVE[t] ? '' : 'ON WIRE'), X(h.x + 0.5), Y(h.y) - 4); c.restore(); }
      if (ok && !drag) drawGhost(c, t, defaultDir(t), X(h.x + 0.5), Y(h.y + 0.5), S, 0.4, T);   // while dragging, only the square lights up; the part stays under your finger
    }
    if (editable() && (drag || G.sel)) {
      const pulse = 0.5 + 0.5 * Math.sin(T * 5);
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
        if (!s.wire[s.idx(x, y)] || s.at(x, y)) continue;
        c.save(); c.strokeStyle = 'rgba(56,217,255,' + (0.25 + pulse * 0.35) + ')'; c.lineWidth = 1.5; c.setLineDash([4, 4]);
        rr(c, X(x) + 4, Y(y) + 4, S - 8, S - 8, S * 0.12); c.stroke(); c.restore();
      }
    }
    drawTutGhost(c, T);
  }
  // ambient dust motes drifting in the light of the lab
  function drawMotes(c, T, dt) {
    const lv = level();
    if (!G.motes || G.motes.li !== G.li) { G.motes = []; G.motes.li = G.li; for (let i = 0; i < 36; i++) G.motes.push({ x: Math.random() * lv.w, y: Math.random() * lv.h, v: 0.05 + Math.random() * 0.1, p: Math.random() * 6 }); }
    c.save(); c.globalCompositeOperation = 'lighter';
    for (const m of G.motes) {
      m.y -= m.v * dt; m.x += Math.sin(T * 0.5 + m.p) * 0.05 * dt; if (m.y < 0) { m.y = lv.h; m.x = Math.random() * lv.w; }
      c.globalAlpha = 0.25 + 0.2 * Math.sin(T * 2 + m.p);
      c.fillStyle = m.p > 3 ? '#ffb46a' : '#7fd6ff'; c.beginPath(); c.arc(X(m.x), Y(m.y), Math.max(0.6, L.s * 0.012), 0, TAU); c.fill();
    }
    c.restore();
  }
  // bloom: keep only the brightest pixels (x^4 via self-multiply), blur by down/up sampling, add back
  const B1 = document.createElement('canvas'), B2 = document.createElement('canvas'), B3 = document.createElement('canvas'), B4 = document.createElement('canvas');
  const b1 = B1.getContext('2d'), b2 = B2.getContext('2d'), b3 = B3.getContext('2d'), b4 = B4.getContext('2d');
  function bloom() {
    const w = Math.max(1, cv.width >> 2), h = Math.max(1, cv.height >> 2);
    if (B1.width !== w || B1.height !== h) { B1.width = B2.width = w; B1.height = B2.height = h; B3.width = Math.max(1, w >> 1); B3.height = Math.max(1, h >> 1); B4.width = Math.max(1, w >> 2); B4.height = Math.max(1, h >> 2); }
    b1.globalCompositeOperation = 'copy'; b1.drawImage(cv, 0, 0, w, h);
    for (let i = 0; i < 3; i++) { b2.globalCompositeOperation = 'copy'; b2.drawImage(B1, 0, 0); b1.globalCompositeOperation = 'multiply'; b1.drawImage(B2, 0, 0); }
    b3.globalCompositeOperation = 'copy'; b3.drawImage(B1, 0, 0, B3.width, B3.height);
    b4.globalCompositeOperation = 'copy'; b4.drawImage(B3, 0, 0, B4.width, B4.height);
    const c = ctx; c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'lighter'; c.imageSmoothingEnabled = true;
    c.globalAlpha = 0.45; c.drawImage(B1, 0, 0, cv.width, cv.height);
    c.globalAlpha = 0.7; c.drawImage(B3, 0, 0, cv.width, cv.height);
    c.globalAlpha = 0.8; c.drawImage(B4, 0, 0, cv.width, cv.height);
    c.restore();
  }
  function drawBackdrop(c, T) { c.clearRect(0, 0, CW, CH); }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; G.frameDt = dt;
    G.time += dt; const T = G.time;
    const s = G.sim;
    if (s && s.everOn && !G.won) {
      G.acc += dt * 1000;
      let n = 0;
      while (G.acc >= TICK && n < 4) { G.acc -= TICK; handle(s.tick()); n++; }
      if (G.sim !== s) { requestAnimationFrame(frame); return; }
    } else if (s && G.won) {
      G.acc += dt * 1000; if (G.acc >= TICK) { G.acc -= TICK; s.tick(); }
    }
    const c = ctx;
    c.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawBackdrop(c, T);
    if (s && bgCache) {
      c.save();
      let shx = 0, shy = 0;
      if (G.shake > 0) { G.shake = Math.max(0, G.shake - dt * 1.5); shx = (Math.random() - 0.5) * G.shake * 10; shy = (Math.random() - 0.5) * G.shake * 10; }
      c.setTransform(1, 0, 0, 1, shx * DPR, shy * DPR);
      c.drawImage(bgCache, 0, 0);
      c.setTransform(DPR, 0, 0, DPR, shx * DPR, shy * DPR);
      const lv = level();
      c.save();
      drawWires(c, T);
      drawFlowsUnder(c, T);
      drawObjects(c, T, dt);
      drawDying(c, T);
      drawFeedArcs(c, T);
      drawFlowsOver(c, T);
      drawMotes(c, T, dt);
      drawProj(c, Math.min(1, G.acc / TICK));
      drawParticles(c, dt);
      if (G.sweep > 0) {
        G.sweep = Math.max(0, G.sweep - dt * 1.6);
        const sx = L.ox + (1 - G.sweep) * lv.w * L.s * 1.4 - lv.w * L.s * 0.2;
        // a soft scan line sweeping the board as a level loads: thin bright edge, faint fading trail, soft top and bottom
        const top = L.oy, hgt = lv.h * L.s, fadeV = c.createLinearGradient(0, top, 0, top + hgt);
        fadeV.addColorStop(0, 'rgba(120,220,255,0)'); fadeV.addColorStop(0.15, 'rgba(120,220,255,.55)'); fadeV.addColorStop(0.85, 'rgba(120,220,255,.55)'); fadeV.addColorStop(1, 'rgba(120,220,255,0)');
        const gr = c.createLinearGradient(sx - 60, 0, sx, 0); gr.addColorStop(0, 'rgba(70,200,255,0)'); gr.addColorStop(1, 'rgba(70,200,255,.07)');
        c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = gr; c.fillRect(sx - 60, top, 60, hgt);
        c.fillStyle = fadeV; c.fillRect(sx - 1, top, 2, hgt); c.restore();
      }
      c.restore();
      c.restore();
      if (G.fx) bloom();
      c.save(); c.setTransform(DPR, 0, 0, DPR, 0, 0);
      drawOverlay(c, T);
      c.restore();
      machineAudio(s);
      if (G.pendingWin && G.pendingWin.sim === s && G.dist) {
        const tg = s.objs.find(o => o.t === 'target');
        let ready = !tg;
        if (tg) for (let k = 0; k < 4; k++) { const nx = tg.x + DX[k], ny = tg.y + DY[k]; if (s.inb(nx, ny) && s.wire[s.idx(nx, ny)] && s.live[s.idx(nx, ny)] && charge(s.idx(nx, ny), T) >= 1) ready = true; }
        if (ready || T - (G.pendingWin.t0 || (G.pendingWin.t0 = T)) > 4) {
          const pw = G.pendingWin; G.pendingWin = null;
          G.won = true; sfx('win'); haptic('success'); confetti(); G.shake = 0.3; updatePanel();
          setTimeout(() => { if (G.won && G.li === pw.li && G.sim === pw.sim) showWin(); }, 1500);
        }
      }
    }
    tutorial(dt); stepInertia(); drawGhostCanvas(T);
    if (gest && gest.mode === 'drag') {
      if (VIEW.z > 1.03 && G.pointer) {
        const m = 46, v = 9; let dxp = 0, dyp = 0;
        const px = G.pointer.x - ST.x, py = G.pointer.y - ST.y;
        if (px < m) dxp = v; else if (px > ST.w - m) dxp = -v;
        if (py < m && py > -40) dyp = v; else if (py > ST.h - m && py < ST.h + 40) dyp = -v;
        // only scroll after the finger rests at the edge, so dragging up from the tray doesn't move the board
        if (dxp || dyp) { G.edgeT = (G.edgeT || 0) + 1; if (G.edgeT > 20) { VIEW.px += dxp; VIEW.py += dyp; applyView(); } } else G.edgeT = 0;
      }
      moveGhost(gest);
    }
    requestAnimationFrame(frame);
  }

  // ---------------- TITLE BACKDROP ----------------
  // Clean dark game-style screen: a faint dot grid and thin circuit traces round the edges with little pulses of current,
  // and the logo's outline jitters like live electricity (its noise seed changes a few times a second).
  const tcv = $('#titleFx'), tctx = tcv.getContext('2d'), zapNoise = document.getElementById('zapNoise');
  let zapT = 0;
  // Home background: the calm gradient comes from CSS; this adds slow, soft bokeh lights drifting upward
  function homeBg(c, w, h, T, d) {
    // soft light rays turning slowly behind the logo, like the app icon, plus a few drifting bokeh lights
    const br = document.querySelector('#title .brand'), cr = tcv.getBoundingClientRect();
    let cx = w / 2, cy = h * 0.3;
    if (br) { const r = br.getBoundingClientRect(); if (r.width) { cx = (r.left + r.width / 2 - cr.left) * d; cy = (r.top + r.height / 2 - cr.top) * d; } }
    const R = Math.hypot(w, h);
    c.save(); c.translate(cx, cy); c.rotate(T * 0.04);
    const rg = c.createRadialGradient(0, 0, 0, 0, 0, R * 0.6); rg.addColorStop(0, 'rgba(255,255,255,.10)'); rg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = rg;
    for (let k = 0; k < 16; k++) { c.rotate(TAU / 16); c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, R, -0.085, 0.085); c.closePath(); c.fill(); }
    c.restore();
    const gl = c.createRadialGradient(cx, cy, 0, cx, cy, Math.min(w, h) * 0.55); gl.addColorStop(0, 'rgba(140,210,255,.28)'); gl.addColorStop(1, 'rgba(140,210,255,0)'); c.fillStyle = gl; c.fillRect(0, 0, w, h);
    if (!G.bokeh || G.bokeh.w !== w) { G.bokeh = { w, dots: Array.from({ length: 22 }, (_, k) => ({ x: (k * 0.618) % 1, y: (k * 0.377) % 1, r: (10 + (k * 37) % 46) * d, v: 0.006 + ((k * 13) % 7) * 0.002, col: k % 3 === 0 ? '255,200,110' : '190,230,255', a: 0.05 + ((k * 7) % 5) * 0.02 })) }; }
    for (const b of G.bokeh.dots) {
      const y = ((b.y - T * b.v) % 1 + 1) % 1, x = b.x + Math.sin(T * 0.2 + b.r) * 0.02;
      const gx = x * w, gy = (y * 1.2 - 0.1) * h, g = c.createRadialGradient(gx, gy, 0, gx, gy, b.r);
      g.addColorStop(0, 'rgba(' + b.col + ',' + b.a + ')'); g.addColorStop(1, 'rgba(' + b.col + ',0)'); c.fillStyle = g; c.beginPath(); c.arc(gx, gy, b.r, 0, TAU); c.fill();
    }
  }
  // Opening page background: electric blue on the left, bright orange-gold on the right, split straight down the middle
  // by a living energy seam. A circuit grid runs across both halves, and along the bottom a line of glowing
  // high-voltage towers carries power lines full of travelling current, insulator sparks and big shocks.
  function titleBg(c, w, h, T, d) {
    let B = G.tbg;
    const mid = w / 2;
    if (!B || B.w !== w || B.h !== h) {
      const cv2 = document.createElement('canvas'); cv2.width = w; cv2.height = h; const g = cv2.getContext('2d');
      const tall = h > w, cell = Math.round(Math.min(w, h) / (tall ? 9 : 11));
      let gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#2b8cff'); gr.addColorStop(0.5, '#0f4fd6'); gr.addColorStop(1, '#061f7a');
      g.fillStyle = gr; g.fillRect(0, 0, mid, h);
      gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffc23a'); gr.addColorStop(0.45, '#ff8c0a'); gr.addColorStop(1, '#c84400');
      g.fillStyle = gr; g.fillRect(mid, 0, w - mid, h);
      // soft inner shading toward the seam so each half has depth
      for (const [x0, x1, col] of [[mid - w * 0.18, mid, 'rgba(120,200,255,'], [mid + w * 0.18, mid, 'rgba(255,240,180,']]) {
        const sh = g.createLinearGradient(x0, 0, x1, 0); sh.addColorStop(0, col + '0)'); sh.addColorStop(1, col + '.35)'); g.fillStyle = sh; g.fillRect(Math.min(x0, x1), 0, Math.abs(x1 - x0), h);
      }
      // circuit grid
      g.save(); g.globalCompositeOperation = 'overlay';
      for (let x = 0; x <= w; x += cell) { g.fillStyle = (x / cell) % 3 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.32)'; g.fillRect(x, 0, Math.max(1, d), h); }
      for (let y = 0; y <= h; y += cell) { g.fillStyle = (y / cell) % 3 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.32)'; g.fillRect(0, y, w, Math.max(1, d)); }
      g.restore();
      g.save(); g.globalAlpha = 0.06; g.fillStyle = '#fff';
      for (let x = 0; x <= w; x += cell / 4) g.fillRect(x, 0, 1, h);
      for (let y = 0; y <= h; y += cell / 4) g.fillRect(0, y, w, 1);
      g.restore();
      // circuit traces
      const traces = [], cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
      let seed = 7; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      for (let k = 0; k < (tall ? 18 : 22); k++) {
        let cx = (rnd() * cols) | 0, cy = (rnd() * rows * 0.62) | 0, dir = (rnd() * 4) | 0; const pts = [[cx * cell, cy * cell]];
        const n = 5 + ((rnd() * 8) | 0);
        for (let s = 0; s < n; s++) { if (rnd() < 0.35) dir = (dir + (rnd() < 0.5 ? 1 : 3)) % 4; cx += [1, 0, -1, 0][dir]; cy += [0, 1, 0, -1][dir]; pts.push([cx * cell, cy * cell]); }
        traces.push({ pts, gold: pts[0][0] > mid, sp: 0.18 + rnd() * 0.3, off: rnd() });
      }
      g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
      for (const t of traces) {
        g.beginPath(); t.pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
        g.strokeStyle = t.gold ? 'rgba(110,30,0,.35)' : 'rgba(0,15,70,.4)'; g.lineWidth = 4 * d; g.stroke();
        g.strokeStyle = t.gold ? 'rgba(255,236,170,.45)' : 'rgba(170,220,255,.45)'; g.lineWidth = 1.4 * d; g.stroke();
        for (const p of [t.pts[0], t.pts[t.pts.length - 1]]) { g.beginPath(); g.arc(p[0], p[1], 3.2 * d, 0, TAU); g.fillStyle = t.gold ? '#ffe9a8' : '#bfe6ff'; g.fill(); }
      }
      g.restore();
      // high-voltage towers along the bottom: a far row (small, faint) and a near row (big, glowing)
      const towers = [], lines = [];
      const rowDefs = [{ n: tall ? 4 : 6, base: h * (tall ? 0.86 : 0.84), H: h * (tall ? 0.17 : 0.24), a: 0.45, wl: 1.2 }, { n: tall ? 3 : 4, base: h * 1.01, H: h * (tall ? 0.3 : 0.44), a: 1, wl: 2.2 }];
      for (const R of rowDefs) {
        const row = [];
        for (let k = 0; k < R.n; k++) {
          const x = w * ((k + 0.5) / R.n) + (R.a < 1 ? w / R.n * 0.5 : 0) - (R.a < 1 ? w / R.n * 0.25 : 0);
          row.push(pylon(g, x, R.base, R.H, x < mid ? '#9fe2ff' : '#ffe2a8', x < mid ? '#3fb8ff' : '#ff9a1f', R.a, d));
        }
        // power lines hang between neighbouring towers, from each insulator to the matching one
        for (let k = 0; k < row.length - 1; k++) for (let q = 0; q < row[k].length; q++) {
          const p0 = row[k][q], p1 = row[k + 1][q], sag = (p1[0] - p0[0]) * 0.12, pts = [];
          for (let s = 0; s <= 24; s++) { const f = s / 24; pts.push([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f + Math.sin(f * Math.PI) * sag]); }
          lines.push({ pts, a: R.a, wl: R.wl, sp: 0.35 + rnd() * 0.5, off: rnd() });
          g.save(); g.lineCap = 'round'; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]));
          g.strokeStyle = 'rgba(0,10,40,' + (0.55 * R.a) + ')'; g.lineWidth = R.wl * 2.2 * d; g.stroke();
          g.strokeStyle = 'rgba(230,245,255,' + (0.55 * R.a) + ')'; g.lineWidth = R.wl * 0.8 * d; g.stroke(); g.restore();
        }
        towers.push(...row.map(r => ({ tips: r, a: R.a })));
      }
      // gentle vignette at the top so the logo and buttons stand out
      const vg = g.createRadialGradient(w / 2, h * 0.4, Math.min(w, h) * 0.2, w / 2, h * 0.45, Math.max(w, h) * 0.75);
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,8,30,.35)'); g.fillStyle = vg; g.fillRect(0, 0, w, h);
      B = G.tbg = { w, h, cv: cv2, traces, cell, towers, lines, shocks: [] };
    }
    c.drawImage(B.cv, 0, 0);
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
    const along = (pts, s) => { const n = pts.length - 1, f = Math.max(0, Math.min(n, s * n)), i = Math.min(n - 1, f | 0), u = f - i; return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * u, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * u, i]; };
    // pulses of current on the circuit traces
    for (const t of B.traces) {
      const u = ((T * t.sp + t.off) % 1.6) / 1.2; if (u > 1.15) continue;
      const segs = []; let L = 0; for (let i = 1; i < t.pts.length; i++) { const l = Math.hypot(t.pts[i][0] - t.pts[i - 1][0], t.pts[i][1] - t.pts[i - 1][1]); segs.push(l); L += l; }
      const head = Math.min(L, u * L), tail = Math.max(0, head - B.cell * 2), col = t.gold ? '255,214,120' : '120,210,255';
      const at = s => { let acc = 0; for (let i = 0; i < segs.length; i++) { if (acc + segs[i] >= s) { const f = (s - acc) / segs[i]; return [t.pts[i][0] + (t.pts[i + 1][0] - t.pts[i][0]) * f, t.pts[i][1] + (t.pts[i + 1][1] - t.pts[i][1]) * f, i]; } acc += segs[i]; } const e = t.pts[t.pts.length - 1]; return [e[0], e[1], segs.length]; };
      const a0 = at(tail), a1 = at(head);
      c.beginPath(); c.moveTo(a0[0], a0[1]); for (let i = a0[2] + 1; i <= a1[2] && i < t.pts.length; i++) c.lineTo(t.pts[i][0], t.pts[i][1]); c.lineTo(a1[0], a1[1]);
      c.strokeStyle = 'rgba(' + col + ',.9)'; c.lineWidth = 2 * d; c.stroke();
      glowAt(c, a1[0], a1[1], 12 * d, t.gold ? '#ffd27a' : '#7fd4ff', 0.8);
    }
    // power lines: a constant hum glow plus bright packets of current racing from tower to tower
    for (const ln of B.lines) {
      const blue = ln.pts[0][0] < mid, col = blue ? '120,215,255' : '255,200,110';
      const hum = 0.25 + 0.15 * Math.sin(T * 7 + ln.off * 9);
      c.beginPath(); ln.pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1]));
      c.strokeStyle = 'rgba(' + col + ',' + (hum * ln.a) + ')'; c.lineWidth = ln.wl * 3.5 * d; c.stroke();
      for (let k = 0; k < 2; k++) {
        const s = ((T * ln.sp + ln.off + k * 0.5) % 1), s0 = Math.max(0, s - 0.22);
        const p0 = along(ln.pts, s0), p1 = along(ln.pts, s);
        c.beginPath(); c.moveTo(p0[0], p0[1]); for (let i = p0[2] + 1; i <= p1[2]; i++) c.lineTo(ln.pts[i][0], ln.pts[i][1]); c.lineTo(p1[0], p1[1]);
        c.strokeStyle = 'rgba(255,255,255,' + (0.9 * ln.a) + ')'; c.lineWidth = ln.wl * 1.2 * d; c.stroke();
        glowAt(c, p1[0], p1[1], 16 * d * ln.wl * 0.6, blue ? '#7fd4ff' : '#ffc070', 0.9 * ln.a);
      }
    }
    // insulator sparks: tiny crackling arcs on the tower arms
    for (const tw of B.towers) for (const p of tw.tips) {
      if (Math.random() < 0.06 * tw.a) {
        const blue = p[0] < mid; c.strokeStyle = blue ? 'rgba(200,240,255,.95)' : 'rgba(255,235,190,.95)'; c.lineWidth = 1.2 * d;
        c.beginPath(); let x = p[0], y = p[1]; c.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (Math.random() - 0.5) * 14 * d; y -= Math.random() * 9 * d; c.lineTo(x, y); } c.stroke();
        glowAt(c, p[0], p[1], 18 * d, blue ? '#7fd4ff' : '#ffb040', 0.9);
      }
    }
    // big shocks: now and then a jagged bolt leaps between two power lines or tower tops
    if (Math.random() < 0.035 && B.lines.length > 1) {
      const l1 = B.lines[(Math.random() * B.lines.length) | 0], l2 = B.lines[(Math.random() * B.lines.length) | 0];
      const s = 0.2 + Math.random() * 0.6; const a = along(l1.pts, s), b = along(l2.pts, Math.min(1, s + (Math.random() - 0.5) * 0.3));
      if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 20 * d) B.shocks.push({ a, b, t: T, blue: a[0] < mid });
    }
    B.shocks = B.shocks.filter(s => T - s.t < 0.3);
    for (const s of B.shocks) {
      const f = 1 - (T - s.t) / 0.3, n = 9, pts = [[s.a[0], s.a[1]]];
      for (let k = 1; k < n; k++) { const u = k / n; pts.push([s.a[0] + (s.b[0] - s.a[0]) * u + (Math.random() - 0.5) * 26 * d, s.a[1] + (s.b[1] - s.a[1]) * u + (Math.random() - 0.5) * 26 * d]); }
      pts.push([s.b[0], s.b[1]]);
      const col = s.blue ? '140,215,255' : '255,200,110';
      const path = () => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); };
      path(); c.strokeStyle = 'rgba(' + col + ',' + (0.35 * f) + ')'; c.lineWidth = 12 * d; c.stroke();
      path(); c.strokeStyle = 'rgba(255,255,255,' + f + ')'; c.lineWidth = 2.2 * d; c.stroke();
      glowAt(c, s.a[0], s.a[1], 30 * d, s.blue ? '#7fd4ff' : '#ffb040', f); glowAt(c, s.b[0], s.b[1], 30 * d, s.blue ? '#7fd4ff' : '#ffb040', f);
    }
    // the seam: a vertical column of living energy between blue and gold
    const n = 30, pts = [];
    for (let k = 0; k <= n; k++) pts.push([mid + (k === 0 || k === n ? 0 : (Math.random() - 0.5) * 9 * d), h * k / n]);
    const sp = () => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); };
    sp(); c.strokeStyle = 'rgba(255,255,255,.12)'; c.lineWidth = 30 * d; c.stroke();
    sp(); c.strokeStyle = 'rgba(200,235,255,.4)'; c.lineWidth = 8 * d; c.stroke();
    sp(); c.strokeStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 2 * d; c.stroke();
    c.restore();
  }
  // a lattice transmission tower drawn as a neon outline; returns the insulator tips where power lines hang
  function pylon(g, x, base, H, core, glow, alpha, d) {
    const wb = H * 0.42, wt = H * 0.1, yt = base - H * 0.78, peak = base - H;
    const L = f => [x - wb / 2 + (wb - wt) / 2 * f, base - (base - yt) * f], R = f => [x + wb / 2 - (wb - wt) / 2 * f, base - (base - yt) * f];
    g.save(); g.globalAlpha = alpha; g.lineCap = 'round'; g.lineJoin = 'round';
    const draw = (lw, col, blur) => {
      g.strokeStyle = col; g.lineWidth = lw; g.shadowColor = glow; g.shadowBlur = blur;
      g.beginPath(); g.moveTo(...L(0)); g.lineTo(...L(1)); g.lineTo(x, peak); g.lineTo(...R(1)); g.lineTo(...R(0)); g.stroke();
      g.beginPath(); for (let k = 0; k < 6; k++) { const f0 = k / 6, f1 = (k + 1) / 6; g.moveTo(...L(f0)); g.lineTo(...R(f1)); g.moveTo(...R(f0)); g.lineTo(...L(f1)); g.moveTo(...L(f1)); g.lineTo(...R(f1)); } g.stroke();
      for (const [fy, span] of [[0.72, 0.62], [0.88, 0.44]]) {
        const y = base - H * fy; g.beginPath(); g.moveTo(x - H * span / 2, y); g.lineTo(x + H * span / 2, y);
        g.moveTo(x - H * span / 2, y); g.lineTo(x - wt / 2, y - H * 0.05); g.moveTo(x + H * span / 2, y); g.lineTo(x + wt / 2, y - H * 0.05); g.stroke();
      }
    };
    draw(3.2 * d, 'rgba(0,10,40,.55)', 0);
    draw(1.4 * d, core, 10 * d);
    const tips = [];
    for (const [fy, span] of [[0.72, 0.62], [0.88, 0.44]]) {
      const y = base - H * fy;
      for (const sx of [-1, 1]) {
        const tx = x + sx * H * span / 2 * 0.92, ty = y + H * 0.055;
        g.beginPath(); g.moveTo(tx, y); g.lineTo(tx, ty); g.strokeStyle = '#ffffff'; g.lineWidth = 2.2 * d; g.shadowBlur = 8 * d; g.stroke();
        tips.push([tx, ty]);
      }
    }
    g.restore();
    return tips;
  }
  function titleFx() {
    if (G.screen === 'title') {
      const r = tcv.getBoundingClientRect(); const d = Math.min(2, window.devicePixelRatio || 1);
      if (tcv.width !== Math.round(r.width * d) || tcv.height !== Math.round(r.height * d)) { tcv.width = Math.round(r.width * d); tcv.height = Math.round(r.height * d); }
      const c = tctx, w = tcv.width, h = tcv.height, T = G.time;
      c.clearRect(0, 0, w, h);
      homeBg(c, w, h, T, d);
      // big lightning: every couple of seconds a branching bolt strikes from the top of the sky toward the horizon,
      // with a flash that lights the whole sky, then fades out over a few frames
      G.bolts = G.bolts || []; G.nextBolt = G.nextBolt || T + 0.6;
      if (false && T > G.nextBolt) {
        G.nextBolt = T + 1.4 + Math.random() * 2.2;
        const gold = Math.random() < 0.4, x0 = w * (0.08 + Math.random() * 0.84), segs = [];
        const grow = (x, y, ang, len, width, depth) => {
          let px = x, py = y; const pts = [[px, py]];
          const n = 10 + (depth ? 0 : 8);
          for (let k = 0; k < n && py < h * 0.78; k++) {
            ang = ang * 0.6 + (Math.random() - 0.5) * 1.4; const step = len / n * (0.5 + Math.random() * 0.9);
            px += Math.sin(ang) * step; py += Math.cos(ang) * step; pts.push([px, py]);
            if (depth < 2 && Math.random() < 0.22) grow(px, py, ang + (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.6), len * 0.45, width * 0.55, depth + 1);
          }
          segs.push({ pts, width });
        };
        grow(x0, -10 * d, (Math.random() - 0.5) * 0.4, h * (0.55 + Math.random() * 0.25), 3.6 * d, 0);
        G.bolts.push({ segs, t: T, gold });
      }
      G.bolts = G.bolts.filter(b => T - b.t < 0.55);
      for (const b of G.bolts) {
        const age = T - b.t, flick = age < 0.08 ? 1 : age < 0.14 ? 0.35 : age < 0.2 ? 0.9 : Math.max(0, 1 - (age - 0.2) / 0.35);
        const col = b.gold ? '255,200,90' : '140,215,255';
        if (age < 0.25) { c.fillStyle = 'rgba(' + col + ',' + (0.16 * flick) + ')'; c.fillRect(0, 0, w, h); }
        c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round'; c.lineJoin = 'round';
        for (const s of b.segs) {
          const path = () => { c.beginPath(); s.pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); };
          path(); c.strokeStyle = 'rgba(' + col + ',' + (0.25 * flick) + ')'; c.lineWidth = s.width * 5; c.stroke();
          path(); c.strokeStyle = 'rgba(' + col + ',' + (0.7 * flick) + ')'; c.lineWidth = s.width * 1.8; c.stroke();
          path(); c.strokeStyle = 'rgba(255,255,255,' + flick + ')'; c.lineWidth = s.width * 0.6; c.stroke();
        }
        c.restore();
      }
      // the painted background image sits behind this canvas; add rising energy particles on top of it
      c.save(); c.globalCompositeOperation = 'lighter';
      for (let k = 0; k < 40; k++) {
        const u = (T * (0.03 + (k % 5) * 0.01) + k * 0.173) % 1, x = ((k * 0.618) % 1) * w + Math.sin(T + k) * 10 * d, y = h - u * h;
        c.fillStyle = (k % 3 ? 'rgba(220,240,255,' : 'rgba(255,225,150,') + (Math.sin(u * Math.PI) * 0.5) + ')';
        c.beginPath(); c.arc(x, y, (1 + (k % 3)) * d, 0, TAU); c.fill();
      }
      c.restore();
      // machines floating: half drift up, half drift down, each bobbing and gently tilting, glowing blue or gold
      if (!G.floaters || !G.floaters.v2) {
        const ts = ['power', 'fan', 'generator', 'bulb', 'solar', 'kettle', 'laser', 'battery', 'hamster', 'helibot', 'target', 'rotator', 'cannon', 'pushbot'];
        G.floaters = ts.map((t, i) => ({ t, x: (i % 2 ? 0.55 : 0.04) + ((i * 0.37) % 0.41), y: (i * 0.41) % 1, dir: i % 2 ? 1 : -1, v: 0.018 + ((i * 7) % 5) * 0.004, s: 0.75 + ((i * 3) % 4) * 0.12, p: i * 1.3 }));
        G.floaters.v2 = true;
      }
      const tall = h > w, unit = Math.min(w, h) * (tall ? 0.14 : 0.12), dt0 = Math.min(0.05, T - (G.flT || T)); G.flT = T;
      for (const f of G.floaters) {
        f.y += f.dir * f.v * dt0; if (f.y < -0.12) { f.y = 1.12; } if (f.y > 1.12) { f.y = -0.12; }
        let x = f.x * w + Math.sin(T * 0.6 + f.p) * unit * 0.25, y = f.y * h + Math.sin(T * 1.6 + f.p) * unit * 0.15;
        // keep the logo and buttons clear: machines inside that box slide out to the nearer side
        const card = document.querySelector('.titleCard').getBoundingClientRect(), crr = tcv.getBoundingClientRect();
        const bx0 = (card.left - crr.left) * d - unit * 0.55, bx1 = (card.right - crr.left) * d + unit * 0.55, by0 = (card.top - crr.top) * d - unit * 0.5, by1 = (card.bottom - crr.top) * d + unit * 0.5;
        if (x > bx0 && x < bx1 && y > by0 && y < by1) { if (bx0 > unit * 0.4 || w - bx1 > unit * 0.4) x = (x - bx0 < bx1 - x && bx0 > unit * 0.4) || w - bx1 <= unit * 0.4 ? Math.min(x, bx0) : Math.max(x, bx1); else y = y - by0 < by1 - y ? by0 : by1; }
        const gold = f.dir > 0, sc = unit * f.s;
        const edge = Math.max(0, Math.min(1, (y - 90 * d) / (80 * d), (h - 90 * d - y) / (80 * d)));
        if (edge <= 0) continue;
        // a soft drop shadow under each glossy machine so it floats in front of the blue
        c.save(); c.globalAlpha = 0.22 * edge; c.fillStyle = '#04154d'; c.beginPath(); c.ellipse(x, y + sc * 0.5, sc * 0.34, sc * 0.08, 0, 0, TAU); c.fill(); c.restore();
        c.globalAlpha = 0.9 * edge;
        const o = { t: f.t, d: 0, powered: true, on: true, src: gold, lit: true, fed: true, ringing: true, latched: true, charged: true, fire: true, id: f.p, burstSize: 0.5 };
        c.save(); c.translate(x, y); c.rotate(Math.sin(T * 0.9 + f.p) * 0.12); c.scale(sc, sc); paintObj(c, o, T); c.restore(); c.globalAlpha = 1;
      }
      // a few lightning arcs crackling off the logo
      const lg = document.querySelector('.logo2');
      if (lg && Math.random() < 0.2) {
        const lr = lg.getBoundingClientRect(), cr = tcv.getBoundingClientRect();
        const lx = (lr.left - cr.left) * d, ly = (lr.top - cr.top) * d, lw = lr.width * d, lh = lr.height * d;
        const x0 = lx + lw * (0.05 + Math.random() * 0.9), top = Math.random() < 0.5, y0 = ly + lh * (top ? 0.12 : 0.88), blue = x0 < lx + lw * 0.42;
        c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = blue ? 'rgba(170,225,255,.85)' : 'rgba(255,210,140,.85)'; c.lineWidth = 1.2 * d;
        c.shadowColor = blue ? '#3fb8ff' : '#ffa030'; c.shadowBlur = 8 * d; c.beginPath(); c.moveTo(x0, y0);
        let x = x0, y = y0; for (let s = 0; s < 6; s++) { x += (Math.random() - 0.5) * 24 * d; y += (top ? -1 : 1) * (4 + Math.random() * 8) * d; c.lineTo(x, y); }
        c.stroke(); c.restore();
      }
      if (zapNoise && T - zapT > 0.09) { zapT = T; zapNoise.setAttribute('seed', String((Math.random() * 1000) | 0)); }
    }
    requestAnimationFrame(titleFx);
  }


  // =====================================================================
  // LEVEL EDITOR
  // Draw cables (4 colours = 4 separate circuits), place fixed pieces, fill the player's parts tray,
  // test-play (beating it records the solution), save to "My Levels", share as a copy/paste code.
  // =====================================================================
  const CABLE_COL = { a: '#38d9ff', b: '#ff9b2f', c: '#5dff8a', d: '#ff5fd2', '=': '#38d9ff' };
  const ED = { lv: null, tool: 'a', tab: 'cables', data: null, painting: false, last: null };
  let customs = [];
  try { customs = JSON.parse(localStorage.getItem('voltworks.custom')) || []; } catch (e) { customs = []; }
  function saveCustoms() { try { localStorage.setItem('voltworks.custom', JSON.stringify(customs)); } catch (e) { toast('Could not save on this device (storage is blocked). Use Share to keep a copy.'); } }
  const PART_TYPES = Object.keys(TYPES).filter(t => !['power', 'target', 'block'].includes(t));
  function blankLevel(w, h) { return { id: 'c' + Date.now().toString(36), name: 'My Level', hint: '', w, h, grid: Array.from({ length: h }, () => Array(w).fill('.')), fixed: [], inv: {}, sol: [], verified: false }; }
  function toLevel(d) { // editor data -> playable level object
    return { id: d.id, name: d.name || 'My Level', hint: d.hint || 'Designed in the level editor.', w: d.w, h: d.h, map: d.grid.map(r => r.join('')),
      fixed: d.fixed.map(f => f.slice()), inv: Object.fromEntries(Object.entries(d.inv).filter(([, n]) => n > 0)), sol: (d.sol || []).map(s => s.slice()), custom: true, verified: !!d.verified };
  }
  function fromLevel(l) {
    return { id: l.id || ('c' + Date.now().toString(36)), name: l.name, hint: l.hint === 'Designed in the level editor.' ? '' : (l.hint || ''), w: l.w, h: l.h,
      grid: l.map.map(r => r.split('')), fixed: (l.fixed || []).map(f => f.slice()), inv: Object.assign({}, l.inv), sol: (l.sol || []).map(s => s.slice()), verified: !!l.verified };
  }
  function edChanged(resized) {
    ED.data.verified = false; ED.data.sol = [];
    ED.lv = toLevel(ED.data); G.placed = []; rebuild(); updateEdStatus();
    if (resized) { VIEW.z = 1; VIEW.px = 0; VIEW.py = 0; resize(); }
  }
  function openEditor(lvl) {
    ED.data = lvl ? fromLevel(lvl) : blankLevel(8, 12);
    if (!lvl) { const g = ED.data.grid; g[11][0] = 'P'; g[0][7] = 'T'; }
    G.custom = null; G.testing = false; G.placed = []; G.ghosts = []; G.hintStep = 0;
    ED.lv = toLevel(ED.data);
    showScreen('edit');
    $('#app').classList.add('editing'); $('#app').classList.remove('testing');
    $('.lvK').textContent = 'LEVEL EDITOR'; $('#lvlNum').textContent = '✎';
    rebuild(); buildEditDock(); setTool(ED.tool); updateEdStatus();
    $('#win').hidden = true;
    VIEW.z = 1; VIEW.px = 0; VIEW.py = 0;
    requestAnimationFrame(() => { resize(); G.sweep = 1; });
  }
  function updateEdStatus() {
    $('#lvlName').textContent = ED.data.name || 'My Level';
    const st = $('#edStatus'); if (st) { st.textContent = ED.data.verified ? 'Tested ✓' : 'Not tested'; st.classList.toggle('ok', !!ED.data.verified); }
    if (G.screen === 'edit') $('#lvlNum').textContent = ED.data.verified ? '✓' : '✎';
  }
  const TOOL_HELP = {
    a: 'Drag across squares to draw the cyan cable. Squares only connect to the same colour.', b: 'Drag to draw the orange cable, a separate circuit from the others.',
    c: 'Drag to draw the green cable, a separate circuit.', d: 'Drag to draw the pink cable, a separate circuit.',
    erase: 'Tap or drag to erase cables and pieces.', P: 'Tap a square to place a main power box. It powers any cable next to it.',
    T: 'Tap a square to place a target. Any cable next to it can power it.', '#': 'Tap or drag to place blocks. They stop light, air, steam, water, bots and balls.',
    x: 'Tap or drag to mark squares where the player cannot place parts.',
  };
  function setTool(t) {
    ED.tool = t;
    document.querySelectorAll('#editDock .tool').forEach(b => b.classList.toggle('sel', b.dataset.tool === t));
    if (TOOL_HELP[t]) setTip(null, 'EDITOR TOOL', toolName(t), TOOL_HELP[t]);
    else if (TYPES[t]) setTip(t, 'FIXED PART', TYPES[t].name, 'Tap a square to place it as a fixed part. Tap it again to turn it. ' + TYPES[t].desc);
  }
  function toolName(t) { return ({ a: 'Cyan cable', b: 'Orange cable', c: 'Green cable', d: 'Pink cable', erase: 'Eraser', P: 'Main power', T: 'Target', '#': 'Block', x: 'No-build square' })[t] || (TYPES[t] && TYPES[t].name) || t; }
  function edApply(cx, cy, first) {
    const d = ED.data; if (cx < 0 || cy < 0 || cx >= d.w || cy >= d.h) return;
    const key = cx + ',' + cy; if (!first && ED.last === key) return; ED.last = key;
    const t = ED.tool, fi = d.fixed.findIndex(f => f[1] === cx && f[2] === cy);
    if (t === 'erase') { if (fi >= 0) d.fixed.splice(fi, 1); else d.grid[cy][cx] = '.'; sfx('remove'); }
    else if ('abcd'.includes(t)) { if ('PT#x'.includes(d.grid[cy][cx])) d.grid[cy][cx] = '.'; d.grid[cy][cx] = t; }
    else if (t === 'P' || t === 'T' || t === '#' || t === 'x') { if (fi >= 0) d.fixed.splice(fi, 1); d.grid[cy][cx] = t; if (first) sfx('place'); }
    else if (TYPES[t]) {
      if (!first) return;
      if ('PT#'.includes(d.grid[cy][cx])) { toast('That square already holds a ' + toolName(d.grid[cy][cx]) + '.'); sfx('bad'); return; }
      const turns = TYPES[t].rot;
      if (fi >= 0 && d.fixed[fi][0] === t) {
        if (!turns) { toast(toolName(t) + ' always faces one way, so it does not turn.'); sfx('bad'); return; }
        d.fixed[fi][3] = nextDir(t, d.fixed[fi][3] == null ? defaultDir(t) : d.fixed[fi][3]); sfx('rotate');
      }
      else {
        if (fi >= 0) d.fixed.splice(fi, 1); d.fixed.push([t, cx, cy, defaultDir(t)]); sfx('place'); dust(cx + 0.5, cy + 0.5);
        if (turns && !ED.turnTold) { ED.turnTold = true; toast('Tap it again with the same part selected to turn it.'); }
      }
    }
    haptic('light'); edChanged(false);
  }
  function edDown(e, p) {
    if (!ED.data) return;
    const c = cellAt(p.x, p.y); if (!c.inb) return;
    ED.painting = { id: e.pointerId }; ED.last = null;
    try { cv.setPointerCapture(e.pointerId); } catch (err) { }
    edApply(c.x, c.y, true);
  }
  cv.addEventListener('pointermove', e => {
    if (G.screen !== 'edit' || !ED.painting || ED.painting.id !== e.pointerId || pinch) return;
    const t = ED.tool; if (!('abcd'.includes(t) || t === 'erase' || t === '#' || t === 'x')) return;
    const p = boardPt(e.clientX, e.clientY), c = cellAt(p.x, p.y); if (c.inb) edApply(c.x, c.y, false);
  });
  const edUp = () => { ED.painting = false; ED.last = null; };
  window.addEventListener('pointerup', edUp); window.addEventListener('pointercancel', edUp);

  function toolBtn(tool, label, iconFn) {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'tool'; b.dataset.tool = tool; b.setAttribute('aria-label', label);
    const ic = document.createElement('canvas'); ic.width = 96; ic.height = 96;
    const c = ic.getContext('2d'); c.translate(48, 48); c.scale(80, 80); iconFn(c);
    const nm = document.createElement('span'); nm.textContent = label;
    b.append(ic, nm); b.addEventListener('click', () => { setTool(tool); sfx('pick'); }); return b;
  }
  function cableIcon(col) { return c => { c.lineCap = 'round'; c.strokeStyle = '#0d141f'; c.lineWidth = 0.26; c.beginPath(); c.moveTo(-0.38, 0.2); c.lineTo(0, 0.2); c.lineTo(0, -0.3); c.lineTo(0.38, -0.3); c.stroke(); c.strokeStyle = col; c.lineWidth = 0.1; c.stroke(); glowAt(c, 0, 0, 0.5, col, 0.25); }; }
  function buildEditDock() {
    const dock = $('#editDock'); const body = $('#edBody');
    dock.querySelectorAll('.edTab').forEach(t => t.classList.toggle('sel', t.dataset.tab === ED.tab));
    body.innerHTML = '';
    if (ED.tab === 'cables') {
      const g = document.createElement('div'); g.className = 'toolGrid';
      [['a', 'Cyan cable'], ['b', 'Orange cable'], ['c', 'Green cable'], ['d', 'Pink cable']].forEach(([k, n]) => g.appendChild(toolBtn(k, n, cableIcon(CABLE_COL[k]))));
      g.appendChild(toolBtn('P', 'Power', c => paintObj(c, { t: 'power', d: 0, on: true }, 0)));
      g.appendChild(toolBtn('T', 'Target', c => paintObj(c, { t: 'target', d: 0, powered: true }, 0)));
      g.appendChild(toolBtn('#', 'Block', c => paintObj(c, { t: 'block', d: 0 }, 0)));
      g.appendChild(toolBtn('x', 'No-build', c => { c.strokeStyle = '#ff5a6a'; c.lineWidth = 0.06; rr(c, -0.38, -0.38, 0.76, 0.76, 0.08); c.stroke(); for (let k = -0.3; k <= 0.3; k += 0.15) { c.beginPath(); c.moveTo(k - 0.08, 0.36); c.lineTo(k + 0.08, -0.36); c.stroke(); } }));
      g.appendChild(toolBtn('erase', 'Eraser', c => { c.rotate(-0.6); rr(c, -0.36, -0.16, 0.72, 0.32, 0.06); c.fillStyle = '#ff6b8a'; c.fill(); rr(c, 0.06, -0.16, 0.3, 0.32, 0.06); c.fillStyle = '#e8eef8'; c.fill(); }));
      body.appendChild(g);
    } else if (ED.tab === 'parts') {
      const g = document.createElement('div'); g.className = 'toolGrid';
      PART_TYPES.forEach(t => g.appendChild(toolBtn(t, TYPES[t].name, c => paintObj(c, fakeObj(t), 0.8))));
      body.appendChild(g);
      const n = document.createElement('p'); n.className = 'edNote'; n.textContent = 'Fixed parts are locked for the player, but bots can still move them. Tap a placed part again to turn it.'; body.appendChild(n);
    } else if (ED.tab === 'tray') {
      const n = document.createElement('p'); n.className = 'edNote'; n.textContent = 'Parts the player gets to place. Keep it small: the fewer parts, the better the puzzle.'; body.appendChild(n);
      const g = document.createElement('div'); g.className = 'trayGrid';
      PART_TYPES.forEach(t => {
        const row = document.createElement('div'); row.className = 'invRow' + ((ED.data.inv[t] || 0) > 0 ? ' on' : '');
        const ic = document.createElement('canvas'); ic.width = 72; ic.height = 72; const c = ic.getContext('2d'); c.translate(36, 36); c.scale(60, 60); paintObj(c, fakeObj(t), 0.8);
        const nm = document.createElement('span'); nm.className = 'nm'; nm.textContent = TYPES[t].name;
        const minus = document.createElement('button'); minus.type = 'button'; minus.textContent = '−'; minus.setAttribute('aria-label', 'One less ' + TYPES[t].name);
        const ct = document.createElement('span'); ct.className = 'ct'; ct.textContent = ED.data.inv[t] || 0;
        const plus = document.createElement('button'); plus.type = 'button'; plus.textContent = '+'; plus.setAttribute('aria-label', 'One more ' + TYPES[t].name);
        const set = v => { ED.data.inv[t] = Math.max(0, Math.min(9, v)); ct.textContent = ED.data.inv[t]; row.classList.toggle('on', ED.data.inv[t] > 0); edChanged(false); sfx('pick'); };
        minus.addEventListener('click', () => set((ED.data.inv[t] || 0) - 1)); plus.addEventListener('click', () => set((ED.data.inv[t] || 0) + 1));
        row.append(ic, nm, minus, ct, plus); g.appendChild(row);
      });
      body.appendChild(g);
    } else {
      const d = ED.data;
      body.innerHTML = '<div class="edForm">' +
        '<label for="edName">Level name</label><input id="edName" maxlength="28" autocomplete="off">' +
        '<label for="edHint">Hint for players</label><textarea id="edHint" rows="2" maxlength="160" placeholder="A gentle nudge, shown when the player taps the bulb"></textarea>' +
        '<div class="steps"><span>Width</span><button type="button" data-k="w" data-v="-1" aria-label="Narrower">−</button><b id="edW"></b><button type="button" data-k="w" data-v="1" aria-label="Wider">+</button>' +
        '<span>Height</span><button type="button" data-k="h" data-v="-1" aria-label="Shorter">−</button><b id="edH"></b><button type="button" data-k="h" data-v="1" aria-label="Taller">+</button></div>' +
        '<p class="edNote">8 wide × 12 tall fits phones best.</p>' +
        '<div class="edBtns"><button type="button" id="edClear">Clear board</button><button type="button" id="edImport">Load a code</button><button type="button" id="edNew">New level</button></div></div>';
      $('#edName').value = d.name; $('#edHint').value = d.hint || '';
      $('#edW').textContent = d.w; $('#edH').textContent = d.h;
      $('#edName').addEventListener('input', e => { d.name = e.target.value; ED.lv.name = d.name; updateEdStatus(); });
      $('#edHint').addEventListener('input', e => { d.hint = e.target.value; ED.lv.hint = d.hint || 'Designed in the level editor.'; });
      body.querySelectorAll('.steps button').forEach(b => b.addEventListener('click', () => {
        const k = b.dataset.k, v = +b.dataset.v, nw = k === 'w' ? Math.max(4, Math.min(12, d.w + v)) : d.w, nh = k === 'h' ? Math.max(4, Math.min(14, d.h + v)) : d.h;
        if (nw === d.w && nh === d.h) return;
        d.grid = Array.from({ length: nh }, (_, y) => Array.from({ length: nw }, (_, x) => (d.grid[y] && d.grid[y][x]) || '.'));
        d.fixed = d.fixed.filter(f => f[1] < nw && f[2] < nh); d.w = nw; d.h = nh;
        $('#edW').textContent = nw; $('#edH').textContent = nh; edChanged(true); sfx('pick');
      }));
      $('#edClear').addEventListener('click', () => { d.grid = Array.from({ length: d.h }, () => Array(d.w).fill('.')); d.fixed = []; edChanged(false); sfx('remove'); toast('Board cleared.'); });
      $('#edImport').addEventListener('click', () => openModal('import'));
      $('#edNew').addEventListener('click', () => { openEditor(null); toast('New level started.'); });
    }
  }
  document.querySelectorAll('#editDock .edTab').forEach(t => t.addEventListener('click', () => { ED.tab = t.dataset.tab; buildEditDock(); if (ED.tab === 'cables' || ED.tab === 'parts') setTool(ED.tab === 'parts' && !TYPES[ED.tool] ? 'fan' : (ED.tab === 'cables' && TYPES[ED.tool] && !'PT#x'.includes(ED.tool) ? 'a' : ED.tool)); sfx('pick'); }));

  function validate(d) {
    const flat = d.grid.flat();
    if (!flat.includes('P')) return 'Add a main power box first (Cables tab → Power).';
    if (!flat.includes('T')) return 'Add a target first (Cables tab → Target).';
    return null;
  }
  function testLevel() {
    const err = validate(ED.data); if (err) { toast(err); sfx('bad'); return; }
    G.custom = toLevel(ED.data); G.daily = null; G.testing = true;
    startCustom();
    $('#app').classList.add('testing');
    $('.lvK').textContent = 'TEST PLAY'; $('#lvlNum').textContent = '▶';
    setTip(null, 'TEST PLAY', 'Solve your own level', 'Beat it once to record the solution and mark it as tested. Tap ✎ to go back to editing.');
  }
  function startCustom() {
    VIEW.z = 1; VIEW.px = 0; VIEW.py = 0; VIEW.start = true;
    G.placed = []; G.hintStep = 0; G.ghosts = []; G.sel = null; G.parts = []; G.idle = 0;
    G.screen = 'play'; $('#app').classList.remove('editing');
    rebuild(); buildInventory();
    $('#lvlName').textContent = G.custom.name; $('.lvK').textContent = 'MY LEVEL'; $('#lvlNum').textContent = '★';
    setTip(null, 'MY LEVEL', G.custom.name, G.custom.hint);
    showScreen('play');
    requestAnimationFrame(() => { resize(); G.sweep = 1; });
  }
  function playCustom(l) { G.custom = Object.assign({}, l); G.daily = null; G.testing = false; startCustom(); $('#app').classList.remove('testing'); }
  function showCustomWin() {
    const st = $('#winStars').children; for (let k = 0; k < 3; k++) { st[k].className = ''; void st[k].offsetWidth; st[k].className = 'on'; }
    $('#winRibbon').textContent = G.testing ? 'LEVEL TESTED' : 'CIRCUIT COMPLETE';
    $('#winName').textContent = G.custom.name;
    if (G.testing) {
      ED.data.sol = G.placed.map(p => [p.t, p.x, p.y, p.d]); ED.data.verified = verifySolution(toLevel(ED.data), ED.data.sol);
      $('#winMsg').textContent = 'Solution recorded. Your level can be saved and shared.';
    } else $('#winMsg').textContent = 'You solved a custom level!';
    $('#winNext').hidden = true; $('#winLevels').hidden = true; $('#winEdit').hidden = !G.testing;
    $('#win').hidden = false;
  }
  function backToEditor() { $('#win').hidden = true; const d = ED.data; ED.lv = toLevel(d); G.custom = null; G.testing = false; G.placed = []; showScreen('edit'); $('#app').classList.add('editing'); $('#app').classList.remove('testing'); $('.lvK').textContent = 'LEVEL EDITOR'; $('#lvlNum').textContent = '✎'; rebuild(); buildEditDock(); setTool(ED.tool); updateEdStatus(); VIEW.z = 1; VIEW.px = 0; VIEW.py = 0; requestAnimationFrame(resize); }
  function saveLevel() {
    const err = validate(ED.data); if (err) { toast(err); sfx('bad'); return; }
    const l = toLevel(ED.data);
    const i = customs.findIndex(c => c.id === l.id);
    if (i >= 0) customs[i] = l; else customs.push(l);
    saveCustoms(); sfx('charge'); haptic('success'); bumpStat('saved');
    if (Cloud.user() && Cloud.enabled()) Cloud.saveMyLevel(l, encodeLevel(l, true)).catch(() => toast('Saved on this device. Cloud save failed, it will retry on the next sync.'));
    toast(l.verified ? 'Saved to My Levels ✓ (solvable).' : 'Saved as a draft. Tap Share to check it can be solved before sending it to anyone.');
  }
  function encodeLevel(l, withId) { const s = JSON.stringify({ v: 1, n: l.name, h: l.hint, w: l.w, H: l.h, m: l.map, f: l.fixed, i: l.inv, s: l.sol, ok: l.verified, id: withId ? l.id : undefined }); return 'VW1.' + btoa(unescape(encodeURIComponent(s))); }
  function decodeLevelKeepId(code) { const l = decodeLevel(code); try { const o = JSON.parse(decodeURIComponent(escape(atob(code.trim().replace(/^VW1\./, ''))))); if (o.id) l.id = o.id; } catch (e) { } return l; }
  function decodeLevel(code) {
    const raw = code.trim().replace(/^VW1\./, '');
    const o = JSON.parse(decodeURIComponent(escape(atob(raw))));
    if (!o.m || !o.w || !o.H) throw new Error('bad');
    const l = { id: 'c' + Date.now().toString(36), name: String(o.n || 'Shared level').slice(0, 28), hint: String(o.h || ''), w: o.w, h: o.H, map: o.m.map(String), fixed: o.f || [], inv: o.i || {}, sol: o.s || [], custom: true };
    l.verified = verifySolution(l, l.sol);   // never trust the flag inside a code: re-simulate its solution
    return l;
  }
  function openModal(mode) {
    const m = $('#edModal'); m.hidden = false; $('#edCode').hidden = false;
    const ta = $('#edCode'), go = $('#edGo');
    if (mode === 'share') {
      $('#edModalTitle').textContent = 'Share this level';
      $('#edModalText').textContent = 'Copy this code and send it to anyone. They paste it in Level editor → Board → Load a code.';
      ta.value = encodeLevel(toLevel(ED.data)); ta.readOnly = true; go.textContent = 'Copy code';
      if (Cloud.user() && Cloud.enabled()) {
        $('#edModalText').textContent = 'Getting a short code…';
        Cloud.publish(toLevel(ED.data), ta.value).then(sc => { ta.value = sc; $('#edModalText').textContent = 'Send this short code to anyone. They tap Levels → My Levels → Play a code and type it in.'; })
          .catch(() => { $('#edModalText').textContent = 'Could not get a short code right now, so here is the full code. It works just the same: Levels → My Levels → Play a code.'; });
      } else $('#edModalText').textContent = 'Copy this code and send it to anyone. They tap Levels → My Levels → Play a code and paste it. Sign in to get a short code instead.';
      go.onclick = () => { ta.select(); const done = () => { toast('Code copied.'); }; if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(done, () => { ta.select(); toast('Select the code and copy it.'); }); else toast('Select the code and copy it.'); };
    } else if (mode === 'play') {
      $('#edModalTitle').textContent = 'Play a friend\'s level';
      $('#edModalText').textContent = 'Type the short code (like VW-7KQ2XM) or paste the full code you were sent, then tap Play.';
      ta.value = ''; ta.readOnly = false; go.textContent = 'Play';
      go.onclick = () => {
        let l, raw = ta.value;
        if (Cloud.isShort(raw)) {
          if (!Cloud.enabled()) { toast('Short codes need online accounts, which are not switched on in this build.'); sfx('bad'); return; }
          go.textContent = 'Loading…';
          Cloud.fetchShort(raw).then(code => { ta.value = code; go.textContent = 'Play'; go.onclick(); }).catch(() => { go.textContent = 'Play'; toast('No level with that code. Check the letters and try again.'); sfx('bad'); });
          return;
        }
        try { l = decodeLevel(raw); } catch (e) { toast('That code is not valid. Check that you copied all of it.'); sfx('bad'); return; }
        if (!l.verified) { toast('This level could not be verified as solvable, so it cannot be played.'); sfx('bad'); return; }
        m.hidden = true; if (!customs.some(c => c.name === l.name && JSON.stringify(c.map) === JSON.stringify(l.map))) { customs.push(l); saveCustoms(); }
        playCustom(l); toast('Playing: ' + l.name);
      };
    } else {
      $('#edModalTitle').textContent = 'Load a level code';
      $('#edModalText').textContent = 'Paste a level code you were sent, then tap Load.';
      ta.value = ''; ta.readOnly = false; go.textContent = 'Load';
      go.onclick = () => { try { const l = decodeLevel(ta.value); m.hidden = true; openEditor(l); toast('Level loaded: ' + l.name); } catch (e) { toast('That code is not valid. Check that you copied all of it.'); sfx('bad'); } };
    }
    setTimeout(() => ta.focus(), 50);
  }
  $('#edModalClose').addEventListener('click', () => { $('#edModal').hidden = true; });
  $('#edTest').addEventListener('click', () => { actx(); sfx('pick'); testLevel(); });
  $('#edSave').addEventListener('click', () => { actx(); saveLevel(); });
  $('#edShare').addEventListener('click', () => { actx(); const err = validate(ED.data); if (err) { toast(err); sfx('bad'); return; } proveSolvable(() => { openModal('share'); bumpStat('shared'); }); });
  // A level can only be shared once it is proven solvable: either a recorded test-play solution that still
  // wins when re-simulated, or the built-in solver finding a winning layout.
  function proveSolvable(onOk) {
    const L = toLevel(ED.data);
    if (ED.data.verified && verifySolution(L, ED.data.sol)) return onOk();
    ED.data.verified = false; updateEdStatus();
    const m = $('#edModal'); m.hidden = false;
    $('#edModalTitle').textContent = 'Checking your level…';
    $('#edModalText').textContent = 'The solver is trying every way to place the parts in your tray. Only levels that can be solved can be shared.';
    const ta = $('#edCode'); ta.value = ''; ta.readOnly = true; ta.hidden = true;
    const go = $('#edGo'); go.textContent = 'Stop'; let stop = false; go.onclick = () => { stop = true; };
    const it = solveLevel(L, { maxWins: 1, limit: 40000 });
    const step = () => {
      if (stop) { finish(null, true); return; }
      const t0 = performance.now(); let r;
      while (performance.now() - t0 < 30) { r = it.next().value; if (!r || r.done) break; }
      if (r && !r.done) { $('#edModalText').textContent = 'Checking… ' + r.tried.toLocaleString() + ' layouts tried. Only levels that can be solved can be shared.'; setTimeout(step, 0); return; }
      finish(r, false);
    };
    const finish = (r, stopped) => {
      ta.hidden = false;
      if (r && r.wins.length) {
        ED.data.sol = r.wins[0]; ED.data.verified = true; updateEdStatus(); m.hidden = true; sfx('charge'); toast('Solvable ✓ Solution found and saved.'); onOk(); return;
      }
      $('#edModalTitle').textContent = stopped ? 'Check stopped' : (r && r.capped ? 'Too many combinations to check' : 'No solution found');
      $('#edModalText').textContent = stopped || (r && r.capped)
        ? 'Prove it yourself instead: tap ▶ Test and solve your level once. Your winning layout is recorded and the level can then be shared.'
        : 'No way to place the tray parts wins this level, so it cannot be shared yet. Check the wires, the parts in the tray and where the target is, then try again.';
      go.textContent = 'Test-play it'; go.onclick = () => { m.hidden = true; testLevel(); };
      sfx('bad');
    };
    setTimeout(step, 30);
  }
  $('#edBack').addEventListener('click', () => { sfx('pick'); backToEditor(); });
  $('#winEdit').addEventListener('click', () => { sfx('pick'); backToEditor(); });

  function buildMyLevels() {
    const sec = document.createElement('section'); sec.className = 'chap c-mine';
    sec.innerHTML = '<h3>My Levels <small>Built in the level editor and saved on this device</small></h3><div class="lvGrid"></div>';
    const g = sec.querySelector('.lvGrid');
    const nb = document.createElement('button'); nb.type = 'button'; nb.className = 'lv newLv';
    nb.innerHTML = '<span class="tile">+</span><span class="stars"></span><span class="nm">New level</span>';
    nb.addEventListener('click', () => { actx(); sfx('pick'); openEditor(null); });
    g.appendChild(nb);
    const pb = document.createElement('button'); pb.type = 'button'; pb.className = 'lv newLv';
    pb.innerHTML = '<span class="tile">⌨</span><span class="stars"></span><span class="nm">Play a code</span>';
    pb.addEventListener('click', () => { actx(); sfx('pick'); openModal('play'); });
    g.appendChild(pb);
    customs.forEach((l, i) => {
      const w = document.createElement('div'); w.className = 'lv mine';
      w.innerHTML = '<button type="button" class="tile"></button><span class="stars"></span><span class="nm"></span><span class="myBtns"><button type="button" class="ed">Edit</button><button type="button" class="del">Delete</button></span>';
      w.querySelector('.tile').textContent = 'M' + (i + 1); w.querySelector('.tile').setAttribute('aria-label', 'Play ' + l.name);
      w.querySelector('.stars').textContent = l.verified ? 'TESTED' : 'UNTESTED';
      w.querySelector('.nm').textContent = l.name;
      w.querySelector('.tile').addEventListener('click', () => { actx(); sfx('pick'); playCustom(l); });
      w.querySelector('.ed').addEventListener('click', () => { actx(); sfx('pick'); openEditor(l); });
      const del = w.querySelector('.del');
      del.addEventListener('click', () => {
        if (del.dataset.armed) { customs.splice(i, 1); saveCustoms(); buildLevelGrid(); toast('Level deleted.'); return; }
        del.dataset.armed = '1'; del.textContent = 'Sure?'; setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; del.textContent = 'Delete'; } }, 2500);
      });
      g.appendChild(w);
    });
    return sec;
  }

  // ---------------- WIRING UP ----------------
  $('#playBtn').addEventListener('click', () => { actx(); sfx('pick'); const next = LEVELS.findIndex((_, i) => progress.done[i] == null); loadLevel(next < 0 ? LEVELS.length - 1 : next); });
  $('#levelsBtn').addEventListener('click', () => { actx(); sfx('pick'); showScreen(G.daily ? 'daily' : 'levels'); });
  $('#editorBtn').addEventListener('click', () => { actx(); sfx('pick'); openEditor(null); });
  $('#menuBtn').addEventListener('click', () => { sfx('pick'); if (G.testing) { backToEditor(); return; } showScreen(G.daily ? 'daily' : 'levels'); });
  $('#lvBack').addEventListener('click', () => { sfx('pick'); if (G.lastGame === 'edit' && ED.data) { backToEditor(); return; } if (G.sim) showScreen('play'); else showScreen('title'); });
  $('#powerBtn').addEventListener('click', togglePower);
  window.__VWpower = togglePower;
  $('#resetBtn').addEventListener('click', () => { actx(); resetBoard(); });
  $('#clearBtn').addEventListener('click', () => { actx(); if (!editable()) resetBoard(); G.placed = []; rebuild(); sfx('remove'); toast('All parts returned to the tray.'); });
  $('#hintBtn').addEventListener('click', hint);
  $('#winNext').addEventListener('click', async () => { sfx('pick'); if (G.daily) { $('#win').hidden = true; await MONEY.afterWin(999); const left = DAILY.set ? DAILY.set.findIndex((_, q) => !dRec(DAILY.date, q)) : -1; if (left >= 0 && DAILY.date === utcDate()) playDaily(left); else showScreen('daily'); return; } if (G.custom) { $('#win').hidden = true; showScreen('levels'); return; } const done = G.li; await MONEY.afterWin(done); loadLevel(Math.min(LEVELS.length - 1, done + 1)); });
  $('#winReplay').addEventListener('click', () => { sfx('pick'); G.levelT0 = G.time; resetBoard(); });
  $('#winLevels').addEventListener('click', () => { sfx('pick'); $('#win').hidden = true; showScreen(G.daily ? 'daily' : 'levels'); });
  const muteBtn = $('#muteBtn');
  function syncMute() { muteBtn.querySelector('.w1').style.display = muteBtn.querySelector('.w2').style.display = AU.muted ? 'none' : ''; if (AU.muted) muteBtn.querySelector('.x').removeAttribute('hidden'); else muteBtn.querySelector('.x').setAttribute('hidden', ''); muteBtn.setAttribute('aria-pressed', AU.muted ? 'false' : 'true'); }
  muteBtn.addEventListener('click', () => { actx(); AU.muted = !AU.muted; if (AU.master) AU.master.gain.value = AU.muted ? 0 : 0.35; try { localStorage.setItem('voltworks.muted', AU.muted ? '1' : '0'); } catch (e) { } syncMute(); });
  syncMute();
  new ResizeObserver(() => { if (G.sim) resize(); }).observe($('#stage'));
  window.addEventListener('resize', () => { if (G.sim) resize(); });

  try {
    const App = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App;
    if (App) App.addListener('backButton', () => {
      if (!$('#hintPop').hidden) { $('#hintPop').hidden = true; }
      else if (!$('#win').hidden) { $('#win').hidden = true; showScreen('levels'); }
      else if (G.screen === 'shop') $('#shopBack').click();
      else if (G.screen === 'daily') showScreen('title');
      else if (G.screen === 'play' && G.daily) showScreen('daily');
      else if (G.screen === 'play' && G.testing) backToEditor();
      else if (G.screen === 'play' || G.screen === 'edit') showScreen('levels');
      else if (G.screen === 'levels') showScreen('title');
      else App.exitApp();
    });
  } catch (e) { }
  // =====================================================================
  // DAILY CHALLENGES
  // Five hard levels a day (UTC date), Monday easiest, the weekend extreme. Today's set comes from the
  // Firebase doc daily/{date} when you publish one (no app update needed), otherwise from the bundled pool.
  // =====================================================================
  const DAILY_TIERS = [
    { name: 'Easy', col: '#5fe08a', mult: 1.0 }, { name: 'Medium', col: '#7fd4ff', mult: 1.2 }, { name: 'Tricky', col: '#ffd36b', mult: 1.4 },
    { name: 'Hard', col: '#ff9b3d', mult: 1.6 }, { name: 'Very hard', col: '#ff6b6b', mult: 1.8 }, { name: 'Extreme', col: '#d58cff', mult: 2.2 }];
  const WEEKDAY_TIER = [5, 0, 1, 2, 3, 4, 5];   // Sun..Sat
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function utcDate(d) { return (d || new Date()).toISOString().slice(0, 10); }
  function dayNum(date) { return Math.floor(Date.parse(date + 'T00:00:00Z') / 86400000); }
  function dateOf(n) { return new Date(n * 86400000).toISOString().slice(0, 10); }
  function weekId(date) {   // ISO week, e.g. 2026-W44 (weeks start on Monday)
    const d = new Date(date + 'T00:00:00Z'), wd = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - wd + 3);
    const y = d.getUTCFullYear(), w1 = new Date(Date.UTC(y, 0, 4)); return y + '-W' + String(1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getUTCDay() + 6) % 7)) / 7)).padStart(2, '0');
  }
  function dTierOf(date) { return [5, 0, 1, 2, 3, 4, 5][new Date(date + 'T00:00:00Z').getUTCDay()]; }
  function poolSet(date) {
    const T = typeof DAILY_TIER_IDX !== 'undefined' ? DAILY_TIER_IDX : [];
    let t = dTierOf(date); for (let dd = 1; !(T[t] && T[t].length) && dd < 6; dd++) t = T[t - dd] && T[t - dd].length ? t - dd : T[t + dd] && T[t + dd].length ? t + dd : t;   // nearest tier that has levels
    const idx = T[t] || [], wk = Math.floor((dayNum(date) + 3) / 7);
    if (!idx.length) return [];
    const sun = new Date(date + 'T00:00:00Z').getUTCDay() === 0, off = t === 5 ? wk * 10 + (sun ? 5 : 0) : wk * 5, out = [];
    for (let j = 0; j < 5 && j < idx.length; j++) out.push(DAILY_POOL[idx[(off + j) % idx.length]]);
    return out.map(l => JSON.parse(JSON.stringify(l)));
  }
  const DAILY = { date: null, set: null, src: 'pool', loading: null };
  async function loadDaily(force) {
    const date = utcDate();
    if (DAILY.date === date && DAILY.set && !force) return DAILY.set;
    if (DAILY.loading) return DAILY.loading;
    DAILY.loading = (async () => {
      let set = null, src = 'pool', tier = dTierOf(date);
      let at = 0;
      try { const c = JSON.parse(localStorage.getItem('cf.daily.' + date)); if (c && c.set && c.set.length === 5) { set = c.set; src = c.src; tier = c.tier; at = c.at || 0; } } catch (e) { }
      // a built-in set is re-checked every 30 minutes, so a set you publish later still reaches players who haven't started today
      if (set && src === 'pool' && Date.now() - at > 1800000 && dSolvedOn(date) === 0) force = true;
      if (!set || force) {
        const had = set; set = null;
        const remote = await Cloud.getDaily(date).catch(() => null);
        if (remote && remote.codes) {
          if (remote.tier != null) tier = Math.max(0, Math.min(5, remote.tier));
          const got = [];
          for (const c of remote.codes.split(/[\s,;]+/).filter(Boolean).slice(0, 5)) {
            try { const code = Cloud.isShort(c) ? await Cloud.fetchShort(c) : c; const l = decodeLevel(code); if (l.verified && l.sol.length) got.push(Object.assign(l, { custom: false })); } catch (e) { }
          }
          if (got.length) { const fill = poolSet(date); set = got.concat(fill.slice(got.length)).slice(0, 5); src = 'live'; }
        }
        if (!set && had && src === 'pool') set = had;
        if (!set) { set = poolSet(date); src = 'pool'; }
        set.forEach((l, k) => { padLevel(l); l.dTier = l.tier != null && src === 'pool' ? l.tier : tier; l.name = l.name || ('Challenge ' + (k + 1)); });
        // easiest first: fewer parts first
        set.sort((a, b) => a.sol.length - b.sol.length);
        try { localStorage.setItem('cf.daily.' + date, JSON.stringify({ set, src, tier, at: Date.now() })); for (const k of Object.keys(localStorage)) if (k.startsWith('cf.daily.') && k < 'cf.daily.' + dateOf(dayNum(date) - 3)) localStorage.removeItem(k); } catch (e) { }
      }
      DAILY.date = date; DAILY.set = set; DAILY.src = src; DAILY.tier = tier; DAILY.loading = null;
      return set;
    })();
    return DAILY.loading;
  }
  const dRec = (date, k) => ((progress.daily || {})[date] || {})[k];
  function dSolvedOn(date) { return Object.keys((progress.daily || {})[date] || {}).length; }
  function dailyStreak() {   // days in a row (up to today, or up to yesterday if today isn't played yet) with at least one daily solved
    const D = progress.daily || {}; let n = 0, d = dayNum(utcDate());
    if (!D[dateOf(d)]) d--;
    while (D[dateOf(d)] && Object.keys(D[dateOf(d)]).length) { n++; d--; }
    return n;
  }
  function bestDailyStreak() { return Math.max((progress.dstreakBest || 0), dailyStreak()); }
  function dailyTotalSolved() { return Object.values(progress.daily || {}).reduce((s, o) => s + Object.keys(o).length, 0); }
  function dailyPoints() { return Object.values(progress.daily || {}).reduce((s, o) => s + Object.values(o).reduce((a, r) => a + (r.pts || 0), 0), 0); }
  function perfectDays() { return Object.values(progress.daily || {}).filter(o => Object.keys(o).length >= 5).length; }
  function extremeSolved() { return Object.entries(progress.daily || {}).reduce((s, [d, o]) => s + (dTierOf(d) === 5 ? Object.keys(o).length : 0), 0); }
  // points earned per day and per week feed the Today / This week leaderboards
  function addPeriodPoints(delta) {
    if (delta <= 0) return; const d = utcDate(), w = weekId(d);
    progress.dayPts = progress.dayPts || {}; progress.weekPts = progress.weekPts || {};
    progress.dayPts = Object.fromEntries(Object.entries(progress.dayPts).filter(([k]) => k >= dateOf(dayNum(d) - 8)));
    progress.weekPts = Object.fromEntries(Object.entries(progress.weekPts).filter(([k]) => k >= weekId(dateOf(dayNum(d) - 21))));
    progress.dayPts[d] = (progress.dayPts[d] || 0) + delta; progress.weekPts[w] = (progress.weekPts[w] || 0) + delta;
  }
  function playDaily(k) {
    const l = DAILY.set && DAILY.set[k]; if (!l) return;
    G.custom = JSON.parse(JSON.stringify(l)); G.daily = { date: DAILY.date, k, tier: l.dTier }; G.testing = false;
    G.levelT0 = G.time; G.paidHints = new Set(); markDay();
    startCustom();
    $('#app').classList.remove('testing');
    $('.lvK').textContent = 'DAILY · ' + DAILY_TIERS[l.dTier].name.toUpperCase(); $('#lvlNum').textContent = (k + 1) + '/5';
    setTip(null, 'DAILY CHALLENGE', l.name, l.hint || 'A hard one. Think it through: every part in the tray has a job.');
    refreshBanner(); updateMoneyUI();
  }
  function showDailyWin() {
    const used = G.hintStep, secs = Math.max(1, Math.round(G.time - (G.levelT0 || G.time)));
    const { date, k, tier } = G.daily, l = G.custom, T = DAILY_TIERS[tier];
    const parts = l.sol.length, base = scoreFor(parts, secs, used), pts = Math.round(base.score * T.mult / 10) * 10;
    progress.daily = progress.daily || {}; progress.daily[date] = progress.daily[date] || {};
    const prev = progress.daily[date][k], prevPts = prev ? prev.pts : 0, tierBefore = trophyTier(totalPoints());
    const firstToday = dSolvedOn(date) === 0;
    if (!prev || pts > prev.pts) progress.daily[date][k] = { pts, secs, hints: used, name: l.name };
    addPeriodPoints(pts - prevPts); setTimeout(() => reportStats(true), 50);
    progress.dstreakBest = bestDailyStreak();
    const fresh = checkAwards(true);
    saveProgress(); if (Cloud.user() && Cloud.enabled()) Cloud.saveProgressCloud(progress).catch(() => {});
    pushScore();
    const st = $('#winStars').children; for (let q = 0; q < 3; q++) { st[q].className = ''; void st[q].offsetWidth; if (q < base.stars) st[q].className = 'on'; }
    $('#winRibbon').textContent = 'DAILY ' + (k + 1) + '/5 SOLVED';
    $('#winName').textContent = l.name + ' · ' + T.name;
    const solved = dSolvedOn(date), left = DAILY.set ? DAILY.set.findIndex((_, q) => !dRec(date, q)) : -1;
    $('#winMsg').textContent = (firstToday ? '🔥 Streak: ' + dailyStreak() + ' day' + (dailyStreak() === 1 ? '' : 's') + '. ' : '') + solved + ' of 5 solved today' + (solved === 5 ? '. Perfect day!' : '.');
    G.lastSolve = { li: -1, secs, used, sc: Object.assign({}, base, { score: pts, mult: base.mult * T.mult }), newBest: pts > prevPts, prevPts, tierBefore, daily: true };
    showWinAwards(fresh, secs);
    $('#winNext').hidden = false; $('#winNext').textContent = left >= 0 ? 'Next challenge ▸' : 'Daily ▸';
    $('#winLevels').hidden = true; $('#winEdit').hidden = true;
    $('#winVideo').hidden = MONEY.hintsLeft() >= 3 || !MONEY.rewardedOn();
    $('#win').hidden = false;
    [0, 1, 2].forEach(q => { if (q < base.stars) setTimeout(() => sfx('note', 784 + q * 200), 180 * q + 120); });
  }
  function fmtLeft() { const now = Date.now(), next = (dayNum(utcDate()) + 1) * 86400000, s = Math.max(0, Math.round((next - now) / 1000)); return Math.floor(s / 3600) + 'h ' + String(Math.floor(s % 3600 / 60)).padStart(2, '0') + 'm'; }
  // daily challenges unlock once every machine has been met: all levels up to the last one that introduces a new part
  function dailyUnlockLevel() { let m = 0; LEVELS.forEach((L, i) => { if (L.intro && L.intro.length) m = i; }); return m; }
  function dailyLearned() { const last = dailyUnlockLevel(); let n = 0; for (let i = 0; i <= last; i++) if (progress.done[i] != null) n++; return [n, last + 1]; }
  function dailyOpen() { const [n, of] = dailyLearned(); return n >= of; }
  function updateDailyCard() {
    const c0 = $('#dailyCard');
    if (!dailyOpen()) {
      const [n, of] = dailyLearned();
      if (c0) { c0.classList.add('locked'); c0.classList.remove('done'); }
      const sub0 = $('#dcSub'); if (sub0) sub0.textContent = 'Unlocks after level ' + of + ' · ' + n + '/' + of + ' done';
      const fl = c0 && c0.querySelector('.dcFlame'); if (fl) fl.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>';
      return;
    }
    if (c0 && c0.classList.contains('locked')) { c0.classList.remove('locked'); const fl = c0.querySelector('.dcFlame'); if (fl) fl.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c4 0 7-3 7-7 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-5 5-5 8 0 4 3 7 7 7z"/></svg><b id="dcStreak">0</b>'; }
    const date = utcDate(), n = dSolvedOn(date), t = DAILY_TIERS[DAILY.date === date && DAILY.tier != null ? DAILY.tier : dTierOf(date)];
    const sub = $('#dcSub'); if (sub) sub.innerHTML = n + '/5 solved · <span style="color:' + t.col + '">' + DAY_NAMES[new Date(date + 'T00:00:00Z').getUTCDay()] + ' · ' + t.name + '</span>';
    const s = $('#dcStreak'); if (s) s.textContent = dailyStreak();
    const c = $('#dailyCard'); if (c) c.classList.toggle('done', n >= 5);
  }
  async function buildDaily() {
    const date = utcDate(), wd = new Date(date + 'T00:00:00Z').getUTCDay();
    $('#dHero').innerHTML = '<div class="dhFlame">' + svgIcon('flame') + '<b>' + dailyStreak() + '</b><small>day streak</small></div><div class="dhTx"><b>' + DAY_NAMES[wd] + '</b><span>Best streak ' + bestDailyStreak() + ' · ' + dailyTotalSolved() + ' solved in total</span><span class="dhLeft">New challenges in ' + fmtLeft() + '</span></div>';
    // this week, Monday..Sunday
    const mon = dayNum(date) - ((wd + 6) % 7); let wk = '';
    for (let q = 0; q < 7; q++) { const d = dateOf(mon + q), n = ((progress.daily || {})[d] ? Object.keys(progress.daily[d]).length : 0), T = DAILY_TIERS[WEEKDAY_TIER[(q + 1) % 7]];
      wk += '<div class="dwDay' + (d === date ? ' today' : '') + (n ? ' on' : '') + (n >= 5 ? ' full' : '') + '"><i>' + 'MTWTFSS'[q] + '</i><b style="border-color:' + T.col + '">' + (n >= 5 ? '★' : n ? n : '') + '</b></div>'; }
    $('#dWeek').innerHTML = wk;
    const list = $('#dList'); list.innerHTML = '<div class="lbMsg">Loading today’s challenges…</div>';
    const set = await loadDaily();
    if (G.screen !== 'daily') return;
    list.innerHTML = '';
    if (!set.length) { list.innerHTML = '<div class="lbMsg">No challenges today. Check back soon!</div>'; return; }
    set.forEach((l, k) => {
      const r = dRec(date, k), T = DAILY_TIERS[l.dTier], d = document.createElement('button'); d.type = 'button'; d.className = 'dItem' + (r ? ' solved' : '');
      const bolts = Math.min(5, 1 + Math.floor((l.sol.length - 3) / 2));
      d.innerHTML = '<span class="diNum" style="background:' + T.col + '">' + (r ? '✓' : k + 1) + '</span><span class="diTx"><b></b><small>' + '<i style="color:' + T.col + '">' + '⚡'.repeat(Math.max(1, bolts)) + '</i> ' + l.sol.length + ' parts · ×' + T.mult.toFixed(1) + ' points</small></span><span class="diR">' + (r ? '<b>' + r.pts.toLocaleString() + '</b><small>' + fmtTime(r.secs) + '</small>' : '<em>Play</em>') + '</span>';
      d.querySelector('b').textContent = l.name;
      d.addEventListener('click', () => { actx(); sfx('pick'); playDaily(k); });
      list.appendChild(d);
    });
    $('#dNote').textContent = DAILY.src === 'live' ? 'Today’s set was hand-picked by FunPixelNest.' : 'Monday is the easiest day. Every day after gets harder, and the weekend is extreme.';
  }
  // =====================================================================
  // MORE LEVELS ONLINE (101-1000) AND ANONYMOUS PLAYER STATS
  // Level packs are Firestore docs level_packs/{id}: start (first level number, e.g. 101), title, sub and
  // codes (level share codes). They are appended after the built-in levels, so no app update is needed.
  // =====================================================================
  const MAX_LEVELS = 1000, APP_VERSION = '1.0';
  const BUILTIN_LEVELS = LEVELS.length;
  const PACK_CLS = ['c-elec', 'c-heat', 'c-tool', 'c-bot'];
  const DIRW = ['right', 'down', 'left', 'up'];
  function stepsFor(L) {
    const st = L.sol.map(([t, x, y, d]) => { const r = TYPES[t] && TYPES[t].rot; let s = 'Put the ' + (TYPES[t] ? TYPES[t].name : t) + ' at column ' + (x + 1) + ', row ' + (y + 1);
      if (r === '4' || r === 'lr') s += ', facing ' + DIRW[d]; if (r === 'mirror') s += ', slanted ' + (d === 0 ? '/' : '\\'); return s + '.'; });
    st.push('Tap the Power Box.'); return st;
  }
  function applyPacks(packs) {
    if (!packs || !packs.length) return 0;
    let added = 0;
    for (const pk of packs.slice().sort((a, b) => a.start - b.start)) {
      if (!pk.levels || !pk.levels.length || pk.start - 1 !== LEVELS.length) continue;   // packs must follow on with no gap
      const from = LEVELS.length;
      for (const l of pk.levels) {
        if (LEVELS.length >= MAX_LEVELS) break;
        const L = padLevel(JSON.parse(JSON.stringify(l)));
        L.hint = L.hint || 'Every part in the tray has a job. Follow the power from the Power Box to the core.'; L.nudge = L.nudge || L.hint; L.steps = L.steps || stepsFor(L); L.online = true;
        LEVELS.push(L); added++;
      }
      if (LEVELS.length > from) CHAPTERS.push({ name: pk.title || ('Levels ' + (from + 1) + '–' + LEVELS.length), sub: pk.sub || 'New levels', from, to: LEVELS.length - 1, cls: PACK_CLS[(CHAPTERS.length) % 4], online: true });
    }
    return added;
  }
  async function decodePack(pk) {
    const levels = [];
    for (const c of (pk.codes || '').split(/[\s,;]+/).filter(Boolean)) {
      try { const code = Cloud.isShort(c) ? await Cloud.fetchShort(c) : c; const l = decodeLevel(code); if (l.verified && l.sol.length) { delete l.custom; delete l.id; levels.push(l); } } catch (e) { }
    }
    return { start: pk.start, title: pk.title, sub: pk.sub, levels };
  }
  // cached packs show straight away; the list is refreshed from Firebase every 6 hours
  try { const c = JSON.parse(localStorage.getItem('cf.packs') || 'null'); if (c && c.packs) applyPacks(c.packs); } catch (e) { }
  (async () => {
    let at = 0; try { at = (JSON.parse(localStorage.getItem('cf.packs') || 'null') || {}).at || 0; } catch (e) { }
    if (Date.now() - at < 6 * 3600 * 1000) return;
    const list = await Cloud.listPacks(); if (!list) return;
    const packs = []; for (const pk of list) if (pk.start > BUILTIN_LEVELS && pk.codes) packs.push(await decodePack(pk));
    try { localStorage.setItem('cf.packs', JSON.stringify({ at: Date.now(), packs })); } catch (e) { }
    if (applyPacks(packs) && G.screen === 'levels') buildLevelGrid();
    if (G.screen === 'title') updateHome();
  })().catch(() => { });

  // anonymous player stats: how far each install got (no names, no account ids)
  function installId() { let id = null; try { id = localStorage.getItem('cf.iid'); if (!id) { id = 'f' + Array.from({ length: 21 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.random() * 36 | 0]).join(''); localStorage.setItem('cf.iid', id); } } catch (e) { id = 'fsession' + (Math.random() * 1e9 | 0); } return id; }
  let lastReport = 0;
  function reportStats(force) {
    if (!Cloud.enabled() || (!force && Date.now() - lastReport < 20000)) return; lastReport = Date.now();
    let maxLevel = 0; for (const k in progress.done) if (LEVELS[k] && +k + 1 > maxLevel) maxLevel = +k + 1;
    progress.first = progress.first || Date.now();
    Cloud.reportPlayer(installId(), { maxLevel, done: nDone(), dailies: dailyTotalSolved(), streak: dailyStreak(), pts: totalPoints(), dailyOpen: dailyOpen(),
      platform: PLATFORM, ver: APP_VERSION, first: progress.first, last: Date.now(), levels: LEVELS.length }).catch(() => { });
  }
  setTimeout(() => reportStats(true), 4000);

  // hidden Studio Stats screen: tap the line at the bottom of Settings 7 times
  async function buildStats() {
    const box = $('#statsBody'); box.innerHTML = '<div class="lbMsg">Counting players…</div>';
    if (!Cloud.enabled()) { box.innerHTML = '<div class="lbMsg">Firebase is not switched on in this build.</div>'; return; }
    const now = Date.now(), N = LEVELS.length;
    const Q = [
      ['Players (all time)', []], ['Active in the last 24 hours', [['last', '>=', now - 864e5]]], ['Active in the last 7 days', [['last', '>=', now - 7 * 864e5]]], ['Active in the last 30 days', [['last', '>=', now - 30 * 864e5]]],
      ['Android', [['platform', '==', 'android']]], ['iOS', [['platform', '==', 'ios']]], ['Web', [['platform', '==', 'web']]],
      ['Finished level 1+', [['maxLevel', '>=', 1]]], ['Level 10+', [['maxLevel', '>=', 10]]], ['Level 25+ (dailies open)', [['maxLevel', '>=', 25]]], ['Level 50+', [['maxLevel', '>=', 50]]], ['Level 75+', [['maxLevel', '>=', 75]]],
      ['Level 100+ (all built-in levels)', [['maxLevel', '>=', 100]]], ['At the last level (' + N + ')', [['maxLevel', '>=', N]]], ['Play daily challenges', [['dailies', '>=', 1]]], ['Daily streak 7+ days', [['streak', '>=', 7]]]];
    try {
      const vals = await Promise.all(Q.map(q => Cloud.countPlayers(q[1])));
      if (G.screen !== 'stats') return;
      const all = vals[0] || 1;
      box.innerHTML = '';
      const sect = t => { const h = document.createElement('div'); h.className = 'shopH'; h.textContent = t; box.appendChild(h); };
      Q.forEach(([label], k) => {
        if (k === 0) sect('Players'); if (k === 4) sect('Platform'); if (k === 7) sect('How far they got'); if (k === 14) sect('Daily challenges');
        const d = document.createElement('div'); d.className = 'stRow';
        d.innerHTML = '<span></span><b>' + vals[k].toLocaleString() + '</b>' + (k ? '<i style="width:' + Math.round(100 * vals[k] / all) + '%"></i>' : '');
        d.querySelector('span').textContent = label; box.appendChild(d);
      });
      const tip = document.createElement('p'); tip.className = 'shopNote';
      const share = vals[13] / all;
      tip.textContent = (share >= 0.05 ? 'Time for more levels: ' + Math.round(share * 100) + '% of players have reached the last level. ' : '') + 'Levels in the game: ' + N + ' (' + (N - BUILTIN_LEVELS) + ' added online). Updated ' + new Date().toLocaleTimeString() + '.';
      box.appendChild(tip);
    } catch (e) { box.innerHTML = '<div class="lbMsg">' + (/permission/i.test(e.message) ? 'Stats are not open yet: publish the latest Firestore rules.' : 'Could not load stats: ' + e.message) + '</div>'; }
  }
  // ads and store first, so the wallet and banner are ready before the first screen shows
  MONEY.init({ progress: () => progress, save: saveProgress, toast, changed: updateMoneyUI, layout: () => { if (G.sim && G.screen === 'play') resize(); }, wantBanner });
  function start(data) {
    if (data && data.li != null && data.placed) { loadLevel(data.li); G.placed = data.placed; G.uid = 1000; rebuild(); }
    else showScreen('title');
    requestAnimationFrame(frame); requestAnimationFrame(titleFx);
  }
  try { window.claude && window.claude.hot && window.claude.hot.snapshot && window.claude.hot.snapshot(() => (G.sim ? { li: G.li, placed: G.placed } : {})); } catch (e) { }
  if (window.claude && window.claude.hot && window.claude.hot.ready) window.claude.hot.ready(start);
  else start((window.claude && window.claude.hot && window.claude.hot.data) || {});
  // ---- ADS, HINTS AND SHOP (store logic lives in money.js)
  const ICON_BULB = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/></svg>';
  const ICON_LOCK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 7.5-2"/></svg>';
  const ICON_NOADS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><path d="M7 15l2-6 2 6M7.6 13.2h2.8M14 9h1.5a3 3 0 0 1 0 6H14z"/><path d="M3 3l18 18"/></svg>';
  const ICON_STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.3 6.9.7-5.2 4.6 1.5 6.8L12 17l-6.1 3.4 1.5-6.8L2.2 9l6.9-.7z"/></svg>';
  const priceOf = key => { const p = MONEY.products().find(q => q.key === key); return p ? p.price : ''; };
  function wantBanner() { return G.screen === 'play' && !G.testing && (G.daily ? true : !G.custom && G.li >= MONEY_CONFIG.bannerFromLevel - 1); }
  function refreshBanner() { MONEY.banner(wantBanner()); }
  function updateMoneyUI() {
    const n = MONEY.hintsLeft(), b = $('#hintBadge');
    if (b) { const free = (G.custom && !G.daily) || G.testing; b.textContent = free ? '' : n > 0 ? String(n) : 'AD'; b.classList.toggle('ad', !free && n <= 0); }
    const sh = $('#shopHints'); if (sh) sh.textContent = n;
    const ss = $('#setShopSub'); if (ss) ss.textContent = n + ' hint' + (n === 1 ? '' : 's') + (MONEY.adFree() ? ' · no ads' : '') + (progress.all ? ' · all levels open' : '');
    if (G.screen === 'shop') buildShop();
  }
  function buildShop() {
    const n = MONEY.hintsLeft(), w = MONEY.wallet();
    $('#shopWallet').innerHTML = ICON_BULB + '<span>You have <b>' + n + '</b> hint' + (n === 1 ? '' : 's') + (w.free > 0 ? ' (' + w.free + ' free)' : '') + '</span>';
    const P = MONEY.products(), body = $('#shopBody'); body.innerHTML = '';
    const buyBtn = p => { const own = p.once && MONEY.owned(p); return '<button class="sBuy' + (own ? ' owned' : '') + '" type="button" data-k="' + p.key + '">' + (own ? 'Owned' : p.price) + '</button>'; };
    const card = (p, ic, cls) => { const d = document.createElement('div'); d.className = 'sCard ' + (cls || ''); d.innerHTML = (p.tag ? '<span class="sTag">' + p.tag + '</span>' : '') + '<div class="sIc">' + ic + '</div><div class="sTx"><b>' + p.name + '</b><span>' + p.desc + '</span></div>' + buyBtn(p); return d; };
    const forge = P.find(p => p.key === 'forge');
    if (!MONEY.owned(forge) && !(MONEY.adFree() && progress.all)) body.appendChild(card(forge, ICON_STAR, 'hero'));
    const vid = document.createElement('div'); vid.className = 'sCard video'; vid.hidden = !MONEY.rewardedOn();
    vid.innerHTML = '<div class="sIc">▶</div><div class="sTx"><b>Free hint</b><span>Watch a short video to get 1 hint</span></div><button class="sBuy" type="button" data-k="video">Watch</button>';
    body.appendChild(vid);
    const h1 = document.createElement('div'); h1.className = 'shopH'; h1.textContent = 'Hint packs'; body.appendChild(h1);
    const grid = document.createElement('div'); grid.className = 'hintGrid';
    for (const p of P.filter(q => !q.once)) {
      const t = document.createElement('div'); t.className = 'hTile';
      t.innerHTML = (p.tag ? '<span class="sTag">' + p.tag + '</span>' : '') + '<div class="hN">' + ICON_BULB + p.hints + '</div><div class="hL">hints</div>' + buyBtn(p);
      grid.appendChild(t);
    }
    body.appendChild(grid);
    const h2 = document.createElement('div'); h2.className = 'shopH'; h2.textContent = 'Upgrades'; body.appendChild(h2);
    body.appendChild(card(P.find(p => p.key === 'noads'), ICON_NOADS));
    body.appendChild(card(P.find(p => p.key === 'all'), ICON_LOCK));
    body.querySelectorAll('.sBuy:not(.owned)').forEach(b => b.addEventListener('click', async () => {
      actx(); sfx('pick'); haptic('light');
      if (b.dataset.k === 'video') { if (await MONEY.watchAd()) { MONEY.addHints(1); sfx('win'); toast('+1 hint'); } return; }
      const r = await MONEY.buy(b.dataset.k); if (r === 'ok') { sfx('win'); refreshBanner(); }
    }));
    $('#shopNote').textContent = MONEY.native ? 'Payments are handled by ' + (PLATFORM === 'ios' ? 'the App Store' : 'Google Play') + '. Bought hints never expire.' : 'Browser preview: purchases and video ads are simulated here. In the app they go through Google Play or the App Store.';
  }
  function openHintPop() { sfx('beep'); $('#hpWatch').hidden = !MONEY.rewardedOn(); $('#hintPop').hidden = false; }
  $('#hpClose').addEventListener('click', () => { $('#hintPop').hidden = true; });
  $('#winVideo').addEventListener('click', async () => { actx(); if (await MONEY.watchAd()) { MONEY.addHints(1); sfx('win'); toast('+1 hint saved for later'); $('#winVideo').hidden = true; } });
  $('#hpShop').addEventListener('click', () => { $('#hintPop').hidden = true; G.shopBack = G.screen; showScreen('shop'); });
  $('#hpWatch').addEventListener('click', async () => { $('#hintPop').hidden = true; if (await MONEY.watchAd()) { MONEY.addHints(1); hint(); } else toast('Watch the whole video to get the hint.'); });
  $('#dailyCard').addEventListener('click', () => {
    actx();
    if (!dailyOpen()) {
      const [n, of] = dailyLearned(); sfx('bad');
      toast('Daily challenges open after level ' + of + ', once you have met every machine. ' + (of - n) + ' to go!');
      return;
    }
    sfx('pick'); haptic('light'); showScreen('daily');
  });
  { let taps = 0, tt = 0; const ft = document.querySelector('#settings .setFoot'); if (ft) ft.addEventListener('click', () => { const n = Date.now(); taps = n - tt < 1500 ? taps + 1 : 1; tt = n; if (taps >= 7) { taps = 0; sfx('pick'); showScreen('stats'); } }); }
  $('#stBack').addEventListener('click', () => { sfx('pick'); showScreen('settings'); });
  $('#stRefresh').addEventListener('click', () => { sfx('pick'); buildStats(); });
  $('#dBack').addEventListener('click', () => { sfx('pick'); showScreen('title'); });
  document.querySelectorAll('#lbSeg button').forEach(b => b.addEventListener('click', () => { actx(); sfx('pick'); lbKind = b.dataset.k; buildLeader(); }));
  setInterval(() => { if (G.screen === 'daily') { const el = document.querySelector('.dhLeft'); if (el) el.textContent = 'New challenges in ' + fmtLeft(); if (DAILY.date && DAILY.date !== utcDate()) buildDaily(); } if (G.screen === 'title') updateDailyCard(); }, 30000);
  loadDaily().then(updateDailyCard).catch(() => {});
  $('#shopChip').addEventListener('click', () => { actx(); sfx('pick'); G.shopBack = 'title'; showScreen('shop'); });
  $('#setShop').addEventListener('click', () => { actx(); sfx('pick'); G.shopBack = 'settings'; showScreen('shop'); });
  $('#setRestore').addEventListener('click', () => { actx(); MONEY.restore(false); });
  $('#shopRestore').addEventListener('click', () => { actx(); MONEY.restore(false); });
  $('#shopBack').addEventListener('click', () => { sfx('pick'); const b = G.shopBack; if (b === 'play' && G.sim) showScreen('play'); else showScreen(b && b !== 'shop' ? b : 'title'); });
  document.body.classList.toggle('native', MONEY.native);
  try { if (screen.orientation && screen.orientation.lock) screen.orientation.lock('portrait').catch(() => {}); } catch (e) { }
  // ---- bottom tabs, home summary and settings
  document.querySelectorAll('#tabbar .tab').forEach(b => b.addEventListener('click', () => { actx(); sfx('pick'); haptic('light'); showScreen(b.dataset.tab); }));
  $('#rankChip').addEventListener('click', () => { actx(); sfx('pick'); showScreen('awards'); });
  function updateHome() {
    const next = LEVELS.findIndex((_, i) => progress.done[i] == null);
    $('#playSub').textContent = next < 0 ? 'All levels done · replay for points' : 'Level ' + (next + 1);
    let st = 0; for (let i = 0; i < LEVELS.length; i++) st += starsFor(i);
    $('#hsStars').textContent = '★ ' + st;
    const pts = Object.keys(progress.pts || {}).filter(k => LEVELS[k]).reduce((s, k) => s + progress.pts[k], 0);
    $('#hsPts').textContent = pts.toLocaleString() + ' points';
    if (typeof updateTrophyBadge === 'function') updateTrophyBadge();
  }
  function updateSettings() {
    $('#setMusic').checked = MUS.on; $('#setSfx').checked = !AU.muted; $('#setVibe').checked = VIBE;
    document.querySelectorAll('#setStyle button').forEach(b => b.classList.toggle('on', b.dataset.style === STYLE));
    const u = Cloud.user(); $('#setWho').textContent = u ? 'Signed in as ' + u.name : 'Playing as a guest'; $('#setAcct').textContent = u ? 'Account' : 'Sign in';
  }
  $('#setMusic').addEventListener('change', e => { actx(); MUS.on = e.target.checked; try { localStorage.setItem('voltworks.music', MUS.on ? '1' : '0'); } catch (err) { } if (MUS.on) musicStart(); else musicStop(); });
  $('#setSfx').addEventListener('change', e => { actx(); AU.muted = !e.target.checked; if (AU.master) AU.master.gain.value = AU.muted ? 0 : 0.35; try { localStorage.setItem('voltworks.muted', AU.muted ? '1' : '0'); } catch (err) { } if (typeof syncMute === 'function') syncMute(); sfx('pick'); });
  $('#setVibe').addEventListener('change', e => { VIBE = e.target.checked; try { localStorage.setItem('voltworks.vibe', VIBE ? '1' : '0'); } catch (err) { } haptic('medium'); });
  document.querySelectorAll('#setStyle button').forEach(b => b.addEventListener('click', () => { actx(); sfx('pick'); setStyle(b.dataset.style); updateSettings(); }));
  $('#setAcct').addEventListener('click', () => { actx(); sfx('pick'); if (!Cloud.user() && typeof SSO !== 'undefined' && PLATFORM !== 'web') ssoSignIn(); else openAccount('settings'); });
  G.dying = G.dying || []; $('#howBtn').addEventListener('click', () => { actx(); try { localStorage.removeItem('voltworks.tutDone'); } catch (e) {} loadLevel(0); });
  updateAcctChip();
  // fit the logo's viewBox to the real width of the letters once the font has loaded
  const fitLogo = () => { const s = document.querySelector('.logo2'); if (!s) return; try { const bb = s.querySelector('.lgRim').getBBox(); if (bb.width > 10) s.setAttribute('viewBox', (bb.x - 16) + ' ' + (bb.y - 14) + ' ' + (bb.width + 32) + ' ' + (bb.height + 34)); } catch (e) { } };
  fitLogo(); if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLogo); setTimeout(fitLogo, 1200);
  if (Cloud.user()) cloudSync(true);
  window.__VW = G; window.__VWload = loadLevel; window.__VWL = L; window.__VWST = ST; window.__VWV = VIEW; window.__VWscreen = (x, y) => toScreen(L.ox + x * L.s, L.oy + y * L.s);
  $('#fitBtn').addEventListener('click', () => { resetView(); sfx('pick'); });
})();
