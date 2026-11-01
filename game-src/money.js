// =====================================================================
// ADS AND PURCHASES
// In the Android / iOS app this uses AdMob (banner + rewarded video) and the store's own billing
// (Google Play Billing / StoreKit) through Capacitor plugins. In the browser preview everything is
// simulated, so the flows can be tried without a store.
// =====================================================================
const MONEY_CONFIG = {
  // false = real ads (release). Set true while testing on your own phone so you never click your own live ads.
  testAds: false,
  ads: {
    // Circuit Forge (Android) in AdMob, app ID ca-app-pub-5089346574611451~3181167188
    android: { banner: 'ca-app-pub-5089346574611451/1354126370', rewarded: 'ca-app-pub-5089346574611451/6670032239', interstitial: 'ca-app-pub-5089346574611451/9091969417' },
    // Circuit Forge (iOS) in AdMob, app ID ca-app-pub-5089346574611451~6123839960
    ios: { banner: 'ca-app-pub-5089346574611451/5274239834', rewarded: 'ca-app-pub-5089346574611451/8528631122', interstitial: 'ca-app-pub-5089346574611451/1485756807' },
  },
  interstitialFromLevel: 6,   // full-screen ads between levels start after this level (1-based)
  interstitialEvery: 3,       // one after every 3 levels won
  interstitialGapSec: 90,     // and never closer than 90 seconds apart
  bannerFromLevel: 6,   // banner ads start on this level (1-based)
  freeHints: 3,         // free hints for the whole game; after that a hint costs one video ad or one bought hint
  // switches; Firebase Remote Config overrides these (see REMOTE_KEYS below)
  adsOn: true, bannerOn: true, interstitialOn: true, rewardedOn: true,
};
// Firebase Remote Config parameter → MONEY_CONFIG field. Change them in the Firebase console, no app update needed.
const REMOTE_KEYS = {
  ads_enabled: 'adsOn', ads_banner_enabled: 'bannerOn', ads_interstitial_enabled: 'interstitialOn', ads_rewarded_enabled: 'rewardedOn',
  ads_banner_from_level: 'bannerFromLevel', ads_interstitial_from_level: 'interstitialFromLevel', ads_interstitial_every: 'interstitialEvery',
  ads_interstitial_gap_sec: 'interstitialGapSec', free_hints: 'freeHints',
};
(function applyRemote(raw) {
  try { const c = raw || JSON.parse(localStorage.getItem('cf.remote') || '{}');
    for (const k in REMOTE_KEYS) if (c[k] != null && c[k] !== '') { const f = REMOTE_KEYS[k], v = c[k]; MONEY_CONFIG[f] = typeof MONEY_CONFIG[f] === 'boolean' ? String(v).toLowerCase() === 'true' : (+v || 0); }
  } catch (e) { }
  MONEY_CONFIG.applyRemote = applyRemote;
})();
// Store products. Create these IDs in Google Play Console and App Store Connect. The prices here are only
// shown in the browser preview: the app shows the store's own localised price.
const PRODUCTS = [
  { key: 'forge', id: 'cf_forge_pack', once: true, name: 'Forge Pack', desc: 'No ads, all 100 levels unlocked and 50 hints', price: '$6.99', hints: 50, noAds: true, all: true, tag: 'Best deal' },
  { key: 'noads', id: 'cf_remove_ads', once: true, name: 'Remove Ads', desc: 'No banners and no ads between levels, forever', price: '$2.99', noAds: true },
  { key: 'all', id: 'cf_unlock_levels', once: true, name: 'Unlock All Levels', desc: 'Play any of the 100 levels right away', price: '$3.99', all: true },
  { key: 'h5', id: 'cf_hints_5', name: '5 Hints', price: '$0.99', hints: 5 },
  { key: 'h15', id: 'cf_hints_15', name: '15 Hints', price: '$1.99', hints: 15, tag: 'Save 33%' },
  { key: 'h40', id: 'cf_hints_40', name: '40 Hints', price: '$3.99', hints: 40, tag: 'Save 50%' },
  { key: 'h100', id: 'cf_hints_100', name: '100 Hints', price: '$7.99', hints: 100, tag: 'Save 60%' },
];

const MONEY = (() => {
  const cap = window.Capacitor;
  const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  const plat = (cap && cap.getPlatform && cap.getPlatform()) || 'web';
  const plug = n => cap && cap.Plugins && cap.Plugins[n];
  let H = null, interLoaded = false, winsSinceAd = 0, lastAdAt = Date.now(), adsReady = false, bannerOn = false, bannerMade = false, rewardLoaded = false, rewardGot = false;
  const ids = () => MONEY_CONFIG.ads[plat === 'ios' ? 'ios' : 'android'];
  const st = () => H.progress();

  // ---- hint wallet: free hints first, then bought ones ----
  function wallet() { const p = st(); if (!p.wallet) p.wallet = { free: MONEY_CONFIG.freeHints, bought: 0 }; return p.wallet; }
  function hintsLeft() { const w = wallet(); return w.free + w.bought; }
  function spendHint() { const w = wallet(); if (w.free > 0) w.free--; else if (w.bought > 0) w.bought--; else return false; H.save(); H.changed(); return true; }
  function addHints(n) { wallet().bought += n; H.save(); H.changed(); }

  // ---- ownership ----
  function owned(prod) { const o = st().owned || {}; return !!(o[prod.key] || (o.forge && (prod.key === 'noads' || prod.key === 'all'))); }
  const adFree = () => !!st().noAds;
  function grant(prod, restoring) {
    const p = st(); p.owned = p.owned || {};
    if (prod.once) { if (p.owned[prod.key] && restoring) return false; p.owned[prod.key] = true; }
    if (prod.noAds) p.noAds = true;
    if (prod.all) p.all = true;
    if (prod.hints) wallet().bought += prod.hints;
    H.save(); H.changed(); return true;
  }

  // ---- start-up (app only): consent, AdMob, store prices, restore what was bought ----
  async function loadRemote() {
    const C = typeof CLOUD_CONFIG !== 'undefined' ? CLOUD_CONFIG : null;
    if (!C || !C.appId || !C.apiKey || !C.projectId) return;
    try {
      let iid = localStorage.getItem('cf.iid'); if (!iid) { iid = 'f' + Array.from({ length: 21 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.random() * 36 | 0]).join(''); localStorage.setItem('cf.iid', iid); }
      const r = await fetch('https://firebaseremoteconfig.googleapis.com/v1/projects/' + C.projectId + '/namespaces/firebase:fetch?key=' + C.apiKey,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ appId: C.appId, appInstanceId: iid }) });
      if (!r.ok) return;
      const j = await r.json(); const e = j.entries || {};
      localStorage.setItem('cf.remote', JSON.stringify(e)); MONEY_CONFIG.applyRemote(e);
      if (H) { bannerOn = null; banner(H.wantBanner()); H.changed(); }
    } catch (e) { }
  }
  async function init(hooks) {
    H = hooks; wallet(); loadRemote();
    if (!native) { H.changed(); return; }
    const AdMob = plug('AdMob');
    if (AdMob) {
      try {
        const ci = await AdMob.requestConsentInfo();
        if (ci && ci.isConsentFormAvailable && ci.status === 'REQUIRED') await AdMob.showConsentForm();
      } catch (e) { }
      if (plat === 'ios') { try { await AdMob.requestTrackingAuthorization(); } catch (e) { } }
      try {
        await AdMob.initialize({ initializeForTesting: MONEY_CONFIG.testAds });
        adsReady = true;
        AdMob.addListener('bannerAdSizeChanged', s => { document.documentElement.style.setProperty('--adH', Math.round((s && s.height) || 56) + 'px'); H.layout(); });
        AdMob.addListener('onRewardedVideoAdReward', () => { rewardGot = true; });
        preloadReward(); preloadInter();
      } catch (e) { console.warn('AdMob', e); }
    }
    const NP = plug('NativePurchases');
    if (NP) {
      try {
        const r = await NP.getProducts({ productIdentifiers: PRODUCTS.map(p => p.id), productType: 'inapp' });
        for (const pr of (r && r.products) || []) { const p = PRODUCTS.find(q => q.id === pr.identifier); if (p && pr.priceString) p.price = pr.priceString; }
      } catch (e) { console.warn('store prices', e); }
      await restore(true);
    }
    bannerOn = false; banner(H.wantBanner());   // re-apply now that AdMob is ready
    H.changed();
  }

  // ---- banner ----
  function banner(want) {
    want = !!want && !adFree() && MONEY_CONFIG.adsOn && MONEY_CONFIG.bannerOn;
    document.body.classList.toggle('ads', want);
    if (want === bannerOn) return; bannerOn = want; H.layout();
    const AdMob = plug('AdMob'); if (!native || !AdMob || !adsReady) return;
    if (want) {
      const p = bannerMade ? AdMob.resumeBanner() : AdMob.showBanner({ adId: ids().banner, adSize: 'ADAPTIVE_BANNER', position: 'BOTTOM_CENTER', margin: 0, isTesting: MONEY_CONFIG.testAds });
      bannerMade = true; p.catch(() => { bannerMade = false; });
    } else AdMob.hideBanner().catch(() => { });
  }

  // ---- rewarded video: resolves true when the player watched to the end ----
  async function preloadReward() {
    const AdMob = plug('AdMob'); if (!AdMob || !adsReady) return;
    try { await AdMob.prepareRewardVideoAd({ adId: ids().rewarded, isTesting: MONEY_CONFIG.testAds }); rewardLoaded = true; } catch (e) { rewardLoaded = false; }
  }
  const rewardedOn = () => MONEY_CONFIG.adsOn && MONEY_CONFIG.rewardedOn;
  async function watchAd() {
    if (!rewardedOn()) return false;
    if (!native) return webAd();
    const AdMob = plug('AdMob');
    if (!AdMob || !adsReady) { H.toast('Ads are not available right now. Try again in a moment.'); return false; }
    try {
      if (!rewardLoaded) await preloadReward();
      if (!rewardLoaded) { H.toast('No video is ready yet. Try again in a moment.'); return false; }
      rewardLoaded = false; rewardGot = false;
      const r = await AdMob.showRewardVideoAd();
      await new Promise(res => setTimeout(res, 250));
      preloadReward();
      return rewardGot || !!(r && r.amount != null);
    } catch (e) { preloadReward(); return false; }
  }

  // ---- interstitial between levels: call after a level is won, before the next one opens ----
  async function preloadInter() {
    const AdMob = plug('AdMob'); if (!AdMob || !adsReady) return;
    try { await AdMob.prepareInterstitial({ adId: ids().interstitial, isTesting: MONEY_CONFIG.testAds }); interLoaded = true; } catch (e) { interLoaded = false; }
  }
  async function afterWin(levelIndex) {
    if (adFree() || !MONEY_CONFIG.adsOn || !MONEY_CONFIG.interstitialOn || levelIndex + 1 < MONEY_CONFIG.interstitialFromLevel) return;
    winsSinceAd++;
    if (winsSinceAd < MONEY_CONFIG.interstitialEvery || Date.now() - lastAdAt < MONEY_CONFIG.interstitialGapSec * 1000) return;
    let shown = false;
    if (!native) { await webInter(); shown = true; }
    else {
      const AdMob = plug('AdMob');
      if (AdMob && adsReady && interLoaded) { interLoaded = false; try { await AdMob.showInterstitial(); shown = true; } catch (e) { } preloadInter(); }
      else preloadInter();
    }
    if (shown) { winsSinceAd = 0; lastAdAt = Date.now(); }
  }

  // ---- buying ----
  async function buy(key) {
    const prod = PRODUCTS.find(p => p.key === key); if (!prod) return 'fail';
    if (prod.once && owned(prod)) { H.toast('You already own ' + prod.name + '.'); return 'owned'; }
    if (!native) { const ok = await webBuy(prod); if (ok) { grant(prod); H.toast(prod.name + ' added. Thank you!'); } return ok ? 'ok' : 'cancel'; }
    const NP = plug('NativePurchases');
    if (!NP) { H.toast('The store is not available right now.'); return 'fail'; }
    try {
      await NP.purchaseProduct({ productIdentifier: prod.id, productType: 'inapp', isConsumable: !prod.once, quantity: 1 });
      grant(prod); H.toast(prod.name + ' added. Thank you!'); return 'ok';
    } catch (e) {
      const m = String((e && (e.message || e.code)) || e);
      if (/cancel/i.test(m)) return 'cancel';
      if (/pending/i.test(m)) { H.toast('Your payment is pending. It will be added when it completes.'); return 'fail'; }
      H.toast('The purchase did not go through. Please try again.'); return 'fail';
    }
  }
  async function restore(silent) {
    if (!native) { if (!silent) H.toast('Purchases are restored from your store account in the app.'); return; }
    const NP = plug('NativePurchases'); if (!NP) return;
    try {
      if (!silent) await NP.restorePurchases();
      const r = await NP.getPurchases({ productType: 'inapp' }); let n = 0;
      for (const t of (r && r.purchases) || []) {
        const prod = PRODUCTS.find(p => p.once && p.id === t.productIdentifier);
        if (prod && String(t.purchaseState || '').toUpperCase() !== 'PENDING' && grant(prod, true)) n++;
      }
      if (!silent) H.toast(n ? 'Purchases restored.' : 'Everything you bought is already here.');
    } catch (e) { if (!silent) H.toast('Could not reach the store. Check your connection.'); }
  }

  // ---- browser preview stand-ins ----
  function sheet(html) {
    const d = document.createElement('div'); d.className = 'mSheet'; d.innerHTML = '<div class="mCard">' + html + '</div>';
    document.body.appendChild(d); requestAnimationFrame(() => d.classList.add('on')); return d;
  }
  function webAd() {
    return new Promise(res => {
      let left = 5;
      const d = sheet('<div class="mAdTag">AD · PREVIEW</div><div class="mAdBox"><b>Video ad</b><span>In the app, a short rewarded video from AdMob plays here.</span></div><div class="mAdCount" id="mAdCount">Reward in 5s</div><button class="mBtn ghost" id="mAdClose" type="button">Close</button>');
      const close = ok => { clearInterval(iv); d.remove(); res(ok); };
      const iv = setInterval(() => { left--; const c = d.querySelector('#mAdCount'); if (left > 0) c.textContent = 'Reward in ' + left + 's'; else { close(true); } }, 1000);
      d.querySelector('#mAdClose').addEventListener('click', () => close(false));
    });
  }
  function webInter() {
    return new Promise(res => {
      let left = 3;
      const d = sheet('<div class="mAdTag">AD · PREVIEW</div><div class="mAdBox"><b>Full-screen ad</b><span>In the app, an AdMob interstitial shows here between levels. Remove Ads turns these off.</span></div><button class="mBtn ghost" id="mInClose" type="button" disabled>Close in 3s</button>');
      const b = d.querySelector('#mInClose');
      const iv = setInterval(() => { left--; if (left > 0) b.textContent = 'Close in ' + left + 's'; else { clearInterval(iv); b.disabled = false; b.textContent = 'Close'; } }, 1000);
      b.addEventListener('click', () => { if (b.disabled) return; d.remove(); res(); });
    });
  }
  function webBuy(prod) {
    return new Promise(res => {
      const d = sheet('<div class="mAdTag">STORE · PREVIEW</div><h3>' + prod.name + '</h3><p>' + (prod.desc || ('Adds ' + prod.hints + ' hints')) + '</p><p class="mNote">In the app this opens Google Play or the App Store. Here the purchase is simulated.</p><div class="mRow"><button class="mBtn ghost" data-a="0" type="button">Cancel</button><button class="mBtn" data-a="1" type="button">Buy ' + prod.price + '</button></div>');
      d.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { d.remove(); res(b.dataset.a === '1'); }));
    });
  }

  return { init, afterWin, native, rewardedOn, loadRemote, wallet, hintsLeft, spendHint, addHints, owned, adFree, banner, watchAd, buy, restore, products: () => PRODUCTS, sheet };
})();
