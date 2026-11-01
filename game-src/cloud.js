// ---------------- CLOUD: optional accounts, cloud saves and short share codes ----------------
// Works with a free Firebase project through its REST APIs (no SDK needed, so it runs the same in the
// web page, the Android app and the iOS app). Fill in CLOUD_CONFIG to switch it on; while it is empty the
// game runs in guest mode only and everything is kept on the device.
const CLOUD_CONFIG = Object.assign({
  apiKey: 'AIzaSyDsfqTa88vjW_7UBKopDRg_6MbtM_aaGI4',      // Firebase console → Project settings → General → Web API key
  projectId: 'voltworks-a1b37',   // Firebase console → Project settings → General → Project ID
  // Firebase console → Authentication → Sign-in method → Google → Web SDK configuration → Web client ID
  googleWebClientId: '124527238256-qj6b7k3gtcitpl801vgvc01h3a9p2dsb.apps.googleusercontent.com',
  // Firebase console → Project settings → General → Your apps → Web app → App ID (1:…:web:…). Used for Remote Config.
  appId: '1:124527238256:web:6aa3c05926df192089a8b5',
}, (typeof window !== 'undefined' && window.VOLTWORKS_CLOUD) || {});
const Cloud = (() => {
  const KEY = 'voltworks.account';
  const on = () => !!(CLOUD_CONFIG.apiKey && CLOUD_CONFIG.projectId);
  let acct = null;   // { uid, email, name, idToken, refreshToken, exp }
  try { acct = JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { acct = null; }
  const save = () => { try { acct ? localStorage.setItem(KEY, JSON.stringify(acct)) : localStorage.removeItem(KEY); } catch (e) { } };
  const AUTH = 'https://identitytoolkit.googleapis.com/v1/accounts:';
  const DB = () => 'https://firestore.googleapis.com/v1/projects/' + CLOUD_CONFIG.projectId + '/databases/(default)/documents/';
  const errText = m => ({
    EMAIL_EXISTS: 'That email already has an account. Sign in instead.',
    EMAIL_NOT_FOUND: 'No account with that email. Create one instead.',
    INVALID_PASSWORD: 'Wrong password.', INVALID_LOGIN_CREDENTIALS: 'Wrong email or password.',
    INVALID_EMAIL: 'That email address does not look right.',
    'WEAK_PASSWORD : Password should be at least 6 characters': 'Use a password of at least 6 characters.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Too many tries. Wait a minute and try again.',
  })[m] || ('Could not sign in (' + m + ').');
  async function post(url, body) {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(errText(j.error && j.error.message || r.status));
    return j;
  }
  async function auth(kind, email, password, name) {
    if (!on()) throw new Error('Online accounts are not switched on in this build yet.');
    const j = await post(AUTH + (kind === 'up' ? 'signUp' : 'signInWithPassword') + '?key=' + CLOUD_CONFIG.apiKey, { email, password, returnSecureToken: true });
    acct = { uid: j.localId, email: j.email, name: name || (j.displayName || email.split('@')[0]), idToken: j.idToken, refreshToken: j.refreshToken, exp: Date.now() + (+j.expiresIn - 60) * 1000, at: Date.now() };
    save(); return acct;
  }
  // Google / Apple: the phone's own sign-in hands us an ID token, Firebase turns it into a game account
  async function signInIdp(providerId, idToken, rawNonce, nameHint) {
    if (!on()) throw new Error('Online accounts are not switched on in this build yet.');
    let pb = 'id_token=' + encodeURIComponent(idToken) + '&providerId=' + providerId;
    if (rawNonce) pb += '&nonce=' + encodeURIComponent(rawNonce);
    const j = await post(AUTH + 'signInWithIdp?key=' + CLOUD_CONFIG.apiKey, { postBody: pb, requestUri: 'http://localhost', returnSecureToken: true, returnIdpCredential: true });
    const email = j.email || '';
    const name = (nameHint && nameHint.trim()) || j.displayName || j.fullName || j.firstName || (email ? email.split('@')[0] : 'Player');
    acct = { uid: j.localId, email, name, provider: providerId, idToken: j.idToken, refreshToken: j.refreshToken, exp: Date.now() + (+j.expiresIn - 60) * 1000, at: Date.now() };
    save(); return acct;
  }
  async function token() {
    if (!acct) throw new Error('Not signed in.');
    if (Date.now() < acct.exp) return acct.idToken;
    const r = await fetch('https://securetoken.googleapis.com/v1/token?key=' + CLOUD_CONFIG.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'grant_type=refresh_token&refresh_token=' + encodeURIComponent(acct.refreshToken) });
    const j = await r.json(); if (!r.ok) { acct = null; save(); throw new Error('Please sign in again.'); }
    acct.idToken = j.id_token; acct.refreshToken = j.refresh_token; acct.exp = Date.now() + (+j.expires_in - 60) * 1000; save();
    return acct.idToken;
  }
  const S = v => ({ stringValue: String(v) });
  const I = v => ({ integerValue: String(Math.max(0, Math.round(+v || 0))) });
  async function req(method, path, body, needAuth) {
    const h = { 'Content-Type': 'application/json' }; if (needAuth) h.Authorization = 'Bearer ' + await token();
    const r = await fetch(DB() + path, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error((j.error && j.error.message) || ('Server error ' + r.status)); e.status = r.status; throw e; }
    return j;
  }
  // levels I made (private to my account)
  async function saveMyLevel(l, code) {
    await req('PATCH', 'users/' + acct.uid + '/levels/' + encodeURIComponent(l.id), { fields: { code: S(code), name: S(l.name), updated: S(new Date().toISOString()) } }, true);
  }
  async function myLevels() {
    let j; try { j = await req('GET', 'users/' + acct.uid + '/levels?pageSize=300', null, true); } catch (e) { if (e.status === 404) return []; throw e; }
    return (j.documents || []).map(d => d.fields && d.fields.code && d.fields.code.stringValue).filter(Boolean);
  }
  async function saveProgressCloud(p) { await req('PATCH', 'users/' + acct.uid, { fields: { progress: S(JSON.stringify(p)), name: S(acct.name) } }, true); }
  async function loadProgressCloud() { try { const j = await req('GET', 'users/' + acct.uid, null, true); return j.fields && j.fields.progress ? JSON.parse(j.fields.progress.stringValue) : null; } catch (e) { if (e.status === 404) return null; throw e; } }
  // leaderboard: one public row per signed-in player, ranked by a single 'score' number
  async function submitScore(e) {
    await req('PATCH', 'leaderboard/' + acct.uid, { fields: { name: S(acct.name), stars: I(e.stars), levels: I(e.levels), time: I(e.time), awards: I(e.awards), score: I(e.score), updated: S(new Date().toISOString()) } }, true);
  }
  async function topScores(n) {
    const url = 'https://firestore.googleapis.com/v1/projects/' + CLOUD_CONFIG.projectId + '/databases/(default)/documents:runQuery';
    const body = { structuredQuery: { from: [{ collectionId: 'leaderboard' }], orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit: n || 50 } };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => []);
    if (!r.ok) { const m = (j && j[0] && j[0].error && j[0].error.message) || (j.error && j.error.message) || ('Server error ' + r.status); throw new Error(m); }
    const num = f => f ? +(f.integerValue || f.doubleValue || 0) : 0;
    return (j || []).filter(x => x.document).map(x => { const f = x.document.fields || {}; return { uid: x.document.name.split('/').pop(), name: f.name ? f.name.stringValue : 'Player', stars: num(f.stars), levels: num(f.levels), time: num(f.time), awards: num(f.awards), score: num(f.score) }; });
  }
  // Today / This week boards: one row per player under lb_day/{YYYY-MM-DD}/scores and lb_week/{YYYY-Www}/scores
  async function submitPeriod(kind, id, score) {
    await req('PATCH', kind + '/' + id + '/scores/' + acct.uid, { fields: { name: S(acct.name), score: I(score), updated: S(new Date().toISOString()) } }, true);
  }
  async function topPeriod(kind, id, n) {
    const url = DB().replace(/\/$/, '') + '/' + kind + '/' + id + ':runQuery';
    const body = { structuredQuery: { from: [{ collectionId: 'scores' }], orderBy: [{ field: { fieldPath: 'score' }, direction: 'DESCENDING' }], limit: n || 50 } };
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => []);
    if (!r.ok) { const m = (j && j[0] && j[0].error && j[0].error.message) || (j.error && j.error.message) || ('Server error ' + r.status); throw new Error(m); }
    return (j || []).filter(x => x.document).map(x => { const f = x.document.fields || {}; return { uid: x.document.name.split('/').pop(), name: f.name ? f.name.stringValue : 'Player', score: f.score ? +(f.score.integerValue || 0) : 0 }; });
  }
  // daily challenges published from the Firebase console: daily/{YYYY-MM-DD} with a 'codes' text field
  // (level share codes VW-XXXXXX or full VW1. codes, separated by spaces, commas or new lines) and an optional 'tier' (0-5)
  async function getDaily(date) {
    if (!on()) return null;
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
    try {
      const r = await fetch(DB() + 'daily/' + date, { signal: ctl.signal });
      if (r.status === 404) return null;
      const j = await r.json(); if (!r.ok) return null;
      const f = j.fields || {};
      return { codes: f.codes ? f.codes.stringValue : '', tier: f.tier ? +(f.tier.integerValue || f.tier.doubleValue || 0) : null, title: f.title ? f.title.stringValue : '' };
    } catch (e) { return null; } finally { clearTimeout(t); }
  }
  // ---- level packs published online (levels 101-1000, no app update needed): level_packs/{id} with start, title, sub, codes
  async function listPacks() {
    if (!on()) return null;
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 6000);
    try {
      const r = await fetch(DB() + 'level_packs?pageSize=100', { signal: ctl.signal });
      if (r.status === 404) return []; if (!r.ok) return null;
      const j = await r.json(); const num = f => f ? +(f.integerValue || f.doubleValue || 0) : 0, str = f => f ? f.stringValue || '' : '';
      return (j.documents || []).map(d => { const f = d.fields || {}; return { id: d.name.split('/').pop(), start: num(f.start), title: str(f.title), sub: str(f.sub), codes: str(f.codes) }; });
    } catch (e) { return null; } finally { clearTimeout(t); }
  }
  // ---- anonymous player stats: players/{installId} (no names, no account ids)
  async function reportPlayer(id, f) {
    if (!on()) return;
    const fields = {};
    for (const k in f) fields[k] = typeof f[k] === 'boolean' ? { booleanValue: f[k] } : typeof f[k] === 'number' ? { integerValue: String(Math.max(0, Math.round(f[k]))) } : { stringValue: String(f[k]) };
    await fetch(DB() + 'players/' + encodeURIComponent(id), { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ fields }), keepalive: true });
  }
  // count players matching simple filters, e.g. [['maxLevel','>=',24]] (one field per query: no composite index needed)
  async function countPlayers(filters) {
    const OP = { '>=': 'GREATER_THAN_OR_EQUAL', '<=': 'LESS_THAN_OR_EQUAL', '==': 'EQUAL', '>': 'GREATER_THAN', '<': 'LESS_THAN' };
    const val = v => typeof v === 'boolean' ? { booleanValue: v } : typeof v === 'number' ? { integerValue: String(v) } : { stringValue: v };
    const fl = (filters || []).map(([f, o, v]) => ({ fieldFilter: { field: { fieldPath: f }, op: OP[o], value: val(v) } }));
    const where = fl.length === 1 ? fl[0] : fl.length ? { compositeFilter: { op: 'AND', filters: fl } } : undefined;
    const body = { structuredAggregationQuery: { structuredQuery: Object.assign({ from: [{ collectionId: 'players' }] }, where ? { where } : {}), aggregations: [{ alias: 'n', count: {} }] } };
    const r = await fetch(DB().replace(/\/$/, '') + ':runAggregationQuery', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => []);
    if (!r.ok) throw new Error((j && j[0] && j[0].error && j[0].error.message) || (j.error && j.error.message) || ('Server error ' + r.status));
    const x = (j || []).find(q => q.result); return x ? +x.result.aggregateFields.n.integerValue : 0;
  }
  // ---- delete the account and everything stored with it (App Store rule 5.1.1(v)) ----
  // Firebase only deletes an account shortly after its owner signed in, so the game asks to sign in again first
  // when the last sign-in is older than a few minutes (needsReauth). Levels already published by short code stay
  // public, without the account behind them.
  const needsReauth = () => !acct || !acct.at || Date.now() - acct.at > 4 * 60 * 1000;
  async function deleteAccount(periods) {
    if (!acct) throw new Error('Not signed in.');
    const uid = acct.uid, del = path => req('DELETE', path, null, true).catch(e => { if (e.status !== 404) throw e; });
    let page = '';
    do {
      let j; try { j = await req('GET', 'users/' + uid + '/levels?pageSize=300' + (page ? '&pageToken=' + encodeURIComponent(page) : ''), null, true); } catch (e) { if (e.status === 404) break; throw e; }
      for (const d of j.documents || []) await del(d.name.split('/documents/')[1]);
      page = j.nextPageToken || '';
    } while (page);
    await del('users/' + uid);
    await del('leaderboard/' + uid);
    for (const [kind, id] of periods || []) await del(kind + '/' + id + '/scores/' + uid);
    const r = await fetch(AUTH + 'delete?key=' + CLOUD_CONFIG.apiKey, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ idToken: await token() }) });
    if (!r.ok) {
      const j = await r.json().catch(() => ({})); const m = (j.error && j.error.message) || String(r.status);
      if (/CREDENTIAL_TOO_OLD|TOKEN_EXPIRED/.test(m)) { acct.at = 0; save(); throw new Error('REAUTH'); }
      if (!/USER_NOT_FOUND/.test(m)) throw new Error('Could not delete the account (' + m + ').');
    }
    acct = null; save();
  }
  // published levels: anyone can read them by short code
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const shortCode = () => 'VW-' + Array.from({ length: 6 }, () => ABC[(Math.random() * ABC.length) | 0]).join('');
  async function publish(l, code) {
    for (let k = 0; k < 4; k++) {
      const sc = shortCode();
      try { await req('POST', 'levels?documentId=' + sc, { fields: { code: S(code), name: S(l.name), author: S(acct.name), uid: S(acct.uid), created: S(new Date().toISOString()) } }, true); return sc; }
      catch (e) { if (e.status !== 409) throw e; }
    }
    throw new Error('Could not create a short code, try again.');
  }
  async function fetchShort(sc) {
    const id = sc.trim().toUpperCase().replace(/^VW-?/, 'VW-');
    const j = await req('GET', 'levels/' + encodeURIComponent(id), null, false);
    return j.fields.code.stringValue;
  }
  return {
    enabled: on, user: () => acct, signIn: (e, p) => auth('in', e, p), signUp: (e, p, n) => auth('up', e, p, n), signInIdp, config: CLOUD_CONFIG,
    signOut: () => { acct = null; save(); }, deleteAccount, needsReauth, saveMyLevel, myLevels, saveProgressCloud, loadProgressCloud, publish, fetchShort, submitScore, topScores, submitPeriod, topPeriod, getDaily, listPacks, reportPlayer, countPlayers,
    isShort: s => /^\s*VW-?[A-Z0-9]{6}\s*$/i.test(s),
  };
})();
