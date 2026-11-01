# Circuit Forge — iOS project (Capacitor)

The iPhone and iPad version of Circuit Forge. It is the same game as the Android app
([Voltworks_Android](https://github.com/FunPixelNest/Voltworks_Android)): the game itself is web code in `game-src/`,
wrapped in a native iOS app by Capacitor. Ads (AdMob), in-app purchases (StoreKit), Sign in with Apple,
haptics and the Firebase cloud saves all work on iOS.

## Run it on an iPhone
Needs a Mac with **Xcode 16 or newer** and an Apple Developer account.
1. Clone this repo, then open `ios/App/App.xcodeproj` in Xcode. The first time, Xcode downloads the iOS libraries
   through Swift Package Manager (Capacitor, Google Mobile Ads and the plugins); wait for it to finish.
2. Select the **App** target → **Signing & Capabilities** → pick your team. Keep **Automatically manage signing** on.
   The bundle id is `com.funpixelnest.circuitforge` (same as the Android package name).
3. Still in **Signing & Capabilities**, check that **Sign in with Apple** is listed, and add **In-App Purchase** with **+ Capability**.
4. Pick your iPhone (or a simulator) at the top and press **Run ▶**.

You do not need Node.js to build: the plugin code Xcode needs is committed under `node_modules/`, and the built
game is already in `ios/App/App/public`.

## Update the game code
The game source is in `game-src/` (engine.js = rules, levels.js = levels + hints, paint.js = drawing, app.js =
screens and effects, money.js = ads and purchases, cloud.js = accounts, template.html = layout/CSS).
After changing it:
```
python3 game-src/build_app.py   # builds the game into www/ and copies it into ios/App/App/public
```
`game-src/voltworks.html` (made by the build) runs directly in a desktop browser for quick testing.
Tests: `cd game-src/tests && node test.js` checks every level is solvable.

If you add or update a Capacitor plugin: `npm install`, then `npx cap sync ios`.

Keep the two repos in step: game changes made here should also go into the Android repo, and the other way round.

## What is different from the Android app
- **Sign in with Apple** on the title screen instead of Google (Apple requires it next to other sign-in options). Email sign-in works on both.
- **Delete account** on the account screen (App Store rule 5.1.1(v)). It deletes the Firebase account, cloud saves,
  private levels and leaderboard rows. Publish the updated `firestore.rules` (see below) so leaderboard rows can be deleted.
- The App Tracking Transparency prompt appears before ads load (wording in `Info.plist` › `NSUserTrackingUsageDescription`).
- Full screen with the home bar auto-hidden, swipes at the top and bottom edges go to the game first, and the screen stays awake.
- Portrait only, iPhone and iPad.
- `ios/App/App/PrivacyInfo.xcprivacy`: the app privacy manifest Apple requires.

## Before you submit to the App Store
1. **App Store Connect** › **Apps** › **+** › New App: platform iOS, bundle id `com.funpixelnest.circuitforge`, name "Circuit Forge".
2. **AdMob**: add an iOS app called Circuit Forge iOS and create Banner (adaptive), Rewarded and Interstitial units. Then put:
   - the iOS **app ID** (`ca-app-pub-…~…`) into `ios/App/App/Info.plist` › `GADApplicationIdentifier` (it is still Google's test ID);
   - the three **ad unit IDs** into `game-src/money.js` › `MONEY_CONFIG.ads.ios` (still Google's test units), then run `python3 game-src/build_app.py`.
   - Optionally paste Google's full SKAdNetwork list (AdMob iOS quick-start page) into `Info.plist` › `SKAdNetworkItems`. Google's own ID is already there.
3. **In-app purchases**: create the 7 products from [STORE_SETUP.md](STORE_SETUP.md) (4 consumable hint packs, 3 non-consumable).
   Product IDs must match exactly. Each needs a display name, description and a review screenshot (the Shop screen works).
4. **Sign in with Apple through Firebase**: Firebase console › Authentication › Sign-in method › **Apple** › Enable.
   For the native iOS app, the bundle id is the only thing Firebase needs; leave the Services ID fields empty unless you also sign in with Apple on the web.
5. **Firestore rules**: Firebase console › Firestore › Rules, paste `firestore.rules` from this repo and **Publish**.
   This adds the delete permission the Delete account button needs; Android keeps working unchanged.
6. **App Privacy** (App Store Connect): Device ID and Advertising Data used for third-party advertising and tracking;
   Product Interaction for analytics; Purchase History for app functionality; Email, Name and Gameplay Content
   (only with an account) linked to the user for app functionality. This matches `PrivacyInfo.xcprivacy`.
7. **Screenshots**: 6.9" iPhone (1320 × 2868) and 13" iPad (2064 × 2752) are the required sizes. The Play Store shots in `store/` are not the right size.
8. **Age rating**: answer the questionnaire; with ads and no mature content it comes out at 4+.
9. In Xcode: set the build number (**General** › **Build**) higher for every upload, then **Product › Archive › Distribute App › App Store Connect**.
10. Test purchases first with a **Sandbox** tester (Users and Access › Sandbox) through TestFlight.

## Online accounts, ads and level packs
- Firebase setup, accounts and cloud saves: as in the Android project (the config is in `game-src/cloud.js`; both apps share the same Firebase project).
- Ads, purchases and Remote Config switches: [STORE_SETUP.md](STORE_SETUP.md).
- Online level packs and player stats: [LEVELS_AND_STATS.md](LEVELS_AND_STATS.md). Daily challenges: [DAILY_CHALLENGES.md](DAILY_CHALLENGES.md).
