# Circuit Forge: ads and in-app purchases setup

The game ships with **Google's test ad units** and the purchase flow wired to the product IDs below. Ads show "Test Ad" until you switch to your own IDs. Purchases work once the products exist in each store.

## How money is made in the game

| Where | What happens |
|---|---|
| Hints | 3 free hints for the whole game. After that each hint costs one bought hint, or the player watches a **rewarded video** for 1 hint. Showing the same part again in a level is free. Hints in player-made levels are always free. |
| Banner | Adaptive banner at the bottom of the gameplay screen from **level 6** onward. Never on menus. |
| Interstitial | A full-screen ad between levels from **level 6**: one after every **3** wins, never closer than **90 seconds** apart. |
| Win card | Optional "Watch a video · +1 hint" button (rewarded) when the player has fewer than 3 hints. |
| Shop | Home screen hint chip, Settings › Shop, the "Out of hints" popup and the Levels screen. |

**Remove Ads** turns off banners and interstitials. Rewarded videos stay available because the player chooses to watch them.

All of these numbers are in `game-src/money.js` (`MONEY_CONFIG`).

## Products (create these in both stores)

| Product ID | Type (Play / App Store) | What it gives | USD | India (INR) |
|---|---|---|---|---|
| `cf_hints_5` | Consumable / Consumable | 5 hints | $0.99 | ₹79 |
| `cf_hints_15` | Consumable / Consumable | 15 hints (save 33%) | $1.99 | ₹159 |
| `cf_hints_40` | Consumable / Consumable | 40 hints (save 50%) | $3.99 | ₹299 |
| `cf_hints_100` | Consumable / Consumable | 100 hints (save 60%) | $7.99 | ₹599 |
| `cf_remove_ads` | One-time / Non-consumable | No banners, no interstitials | $2.99 | ₹199 |
| `cf_unlock_levels` | One-time / Non-consumable | All 100 levels open | $3.99 | ₹299 |
| `cf_forge_pack` | One-time / Non-consumable | Remove Ads + all levels + 50 hints | $6.99 | ₹499 |

The game always shows the store's own localised price, so you can change prices in the consoles at any time without an app update.

### Google Play Console
1. Upload a build to an internal testing track first. Products can only be created after the app has a build that includes billing.
2. **Monetize › Products › In-app products** › Create each product ID above. All of them are "one-time products". The app consumes the hint packs itself.
3. Set the USD price and let Play convert it, then adjust India to the INR column.
4. **Setup › License testing**: add your Gmail so test purchases are free.

### App Store Connect
1. **Monetization › In-App Purchases** › create each product. Hint packs are *Consumable*. The other three are *Non-Consumable*.
2. Add a display name, description and review screenshot for each one (the Shop screen works).
3. In Xcode, **Signing & Capabilities** › **+ In-App Purchase**.
4. Test with a Sandbox tester (**Users and Access › Sandbox**).

A **Restore purchases** button is in Settings and in the Shop, as Apple requires.

## AdMob

1. Create an AdMob account, then add **two apps**: Circuit Forge Android and Circuit Forge iOS.
2. For each app, create three ad units: **Banner** (adaptive), **Rewarded** and **Interstitial**.
3. Put the IDs into the project:
   - App IDs (`ca-app-pub-XXXX~YYYY`):
     - Android: `android/app/src/main/res/values/strings.xml` › `admob_app_id`
     - iOS: `ios/App/App/Info.plist` › `GADApplicationIdentifier`
   - Ad unit IDs (`ca-app-pub-XXXX/ZZZZ`): `game-src/money.js` › `MONEY_CONFIG.ads.android` / `.ios`
   - Set `testAds: false` in `money.js`.
   - Run `python3 game-src/build_app.py` and `npx cap sync`.
4. **Privacy & messaging** in AdMob: create a **GDPR consent message** and a **US states message**. The app asks for consent on first launch before loading ads, through Google's UMP.
5. On iOS, the app shows the App Tracking Transparency prompt. The wording is in `Info.plist` › `NSUserTrackingUsageDescription`. Add Google's full SKAdNetwork ID list to `Info.plist` from the AdMob iOS quick-start page.
6. Publish an **app-ads.txt** file on your developer website (funpixelnest.com/app-ads.txt), using the line AdMob gives you.

Never tap your own live ads. Keep `testAds: true` on test phones, or add the phone as a test device in AdMob.

## Store listing declarations
- **Google Play › App content**: Ads = *Yes*. Data safety: the advertising ID and device identifiers are collected by AdMob for advertising and analytics. Purchase history is collected by Google Play.
- **App Store › App Privacy**: Identifiers (Device ID) and Usage Data are used for third-party advertising, and Purchases for app functionality. Answer *Yes* to tracking if ATT stays on.
- **Target audience**: set it to 13+ unless you want to join Google's Families program. Families needs `tagForChildDirectedTreatment` and certified ad networks only.

## Notes
- Hint balance and unlocks are saved on the device. Remove Ads, Unlock All and the Forge Pack come back automatically on a new phone through the store (restored at launch and with Restore purchases). Bought hint packs are consumables and do not carry over to another phone unless they are later saved to the player's cloud account.
- No server receipt check is done yet. Add one through Firebase Functions before you run big promotions.

## Current IDs (filled in)
- Package name: `com.funpixelnest.circuitforge`
- AdMob Android app: `ca-app-pub-5089346574611451~3181167188`
  - Banner `ca-app-pub-5089346574611451/1354126370`
  - Interstitial `ca-app-pub-5089346574611451/9091969417`
  - Rewarded `ca-app-pub-5089346574611451/6670032239`
- `testAds: false` (real ads). Add your phone as a test device in AdMob (Settings › Test devices) before you play the release build a lot.
- AdMob iOS app: `ca-app-pub-5089346574611451~6123839960`
  - Banner `ca-app-pub-5089346574611451/5274239834`
  - Interstitial `ca-app-pub-5089346574611451/1485756807`
  - Rewarded `ca-app-pub-5089346574611451/8528631122`

## Switching ads on and off (Firebase Remote Config)
Firebase console › Remote Config (project Voltworks). Change a value and press **Publish changes**. Players pick it up the next time they open the game. All values are strings.

| Parameter | Default | Meaning |
|---|---|---|
| `ads_enabled` | true | master switch for all ads |
| `ads_banner_enabled` | true | banner at the bottom of gameplay |
| `ads_interstitial_enabled` | true | full-screen ad between levels |
| `ads_rewarded_enabled` | true | "watch a video for a hint" (hides those buttons when false) |
| `ads_banner_from_level` | 6 | first level that shows the banner |
| `ads_interstitial_from_level` | 6 | between-level ads start after this level |
| `ads_interstitial_every` | 3 | one between-level ad every N wins |
| `ads_interstitial_gap_sec` | 90 | minimum seconds between two of them |
| `free_hints` | 3 | free hints a new player starts with |
