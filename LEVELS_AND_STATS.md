# More levels online, and player stats

## Levels 101–1000 without an app update
The app ships with 100 levels and has room for up to **1000**. New levels arrive as **level packs** in Firestore (`level_packs/{id}`). The game checks for packs on launch, at most every 6 hours. Each pack becomes a new chapter after level 100, and the Levels screen ends with a "More levels coming soon" card.

Each pack has these fields:
- `start` (number): the first level number in the pack. The first pack is 101. Each pack must follow on straight after the previous one: if 101 had 25 levels, the next starts at 126.
- `title` (string): the chapter name, for example "Night Shift".
- `sub` (string): a one-line subtitle.
- `codes` (string): level codes, one per line. These are short codes `VW-XXXXXX` from the editor's Publish button, or full `VW1.` codes.

The game checks every level before showing it. It skips any level whose recorded solution doesn't win. Hints work automatically, with step-by-step placements taken from the solution.

Publishing (script, checks every level first):
```
cd game-src/tools/levels
npm install firebase-admin              # once; also needs ../daily/service-account.json
node push_pack.js --start 101 --title "Night Shift" --sub "Bigger chains" VW-AAAAAA VW-BBBBBB ...
node push_pack.js --start 101 --title "Night Shift" --gen ../daily_50.json   # straight from the level generator
```
Levels for packs can come from the in-game level editor (design → test-play to record the solution → Publish), or from the generator (`tools/makedaily.js`, all checked by `tools/dailyaudit.js`).

Unlock All Levels covers online levels too.

## Player stats (anonymous)
Every install sends one small record to `players/{installId}`:
- the highest level finished
- levels done
- dailies solved
- daily streak
- total points
- whether daily challenges are unlocked
- platform and app version
- first and last time played

No names, emails or account IDs are sent.

**Studio Stats screen:** go to Settings, then tap the line **"Circuit Forge 1.0 · FunPixelNest"** at the bottom **7 times**. It shows:
- players: all time, and active in the last 24 hours, 7 days and 30 days
- Android, iOS and web
- how many reached level 1, 10, 25 (dailies open), 50, 75, 100, and the last level
- daily challenge players, and players with a 7+ day streak

When 5% or more of players have reached the last level, it says it's time to publish more levels.

You can also browse the `players` collection in the Firebase console.

**Privacy policy:** mention that anonymous gameplay statistics (level progress, platform, app version) are stored in Google Firebase. In Play's Data safety form, list them under "App activity: other actions", used for analytics, not linked to the user.

## Firestore rules
Publish the latest `firestore.rules`. It adds `level_packs` (read only) and `players` (each install writes its own row, with checked fields). It also raises the leaderboard limits to 1000 levels.
