# Daily Challenges

Every day the game offers **5 hard levels**. A new set starts at **00:00 UTC** (5:30 AM in India).

| Day | Difficulty | Points multiplier |
|---|---|---|
| Monday | Easy | × 1.0 |
| Tuesday | Medium | × 1.2 |
| Wednesday | Tricky | × 1.4 |
| Thursday | Hard | × 1.6 |
| Friday | Very hard | × 1.8 |
| Saturday, Sunday | Extreme | × 2.2 |

Inside each day the 5 challenges go from fewest to most parts.

- **Streak:** the number of days in a row with at least one daily solved. It shows on the Home card and on the Daily screen, with this week's progress from Monday to Sunday.
- **Rewards:** Daily Spark, Hot Streak (3 days), Week of Fire (7), Eternal Flame (30), Forge Legend (100), Perfect Day (all 5 in a day), Daily Master (10 perfect days), Weekend Warrior (10 extreme solves), Challenge Seeker (100 solves).
- **Points:** daily points count toward the trophy rank and the All time leaderboard.
- **Leaderboard:** the Ranking tab has **Today**, **This week** (Monday to Sunday, UTC) and **All time**. Today and This week count every point earned in that period, from levels and dailies.

## Unlocking
Daily challenges unlock once a player has finished levels 1–24, the last level that introduces a new machine. Until then the Home card shows a lock and their progress (for example "Unlocks after level 24 · 9/24 done"), and a message appears the moment it opens. Buying Unlock All Levels doesn't skip this, because the point is to know every machine first.

## Where the levels come from

1. **Your own set for a date (no app update needed).** The game reads the Firestore document `daily/{YYYY-MM-DD}`. If it exists, its levels are used for that day.
2. **The built-in pool.** If there's no document for the day, the game picks 5 levels from the 100 built-in daily levels, using that weekday's difficulty. The order rotates every week, so it takes about 3 weeks before a weekday repeats a level.

A built-in set is checked again every 30 minutes. So a set you publish later in the day still reaches every player who hasn't solved one of that day's challenges yet.

## Publishing a day's levels

### Step 1: make the levels in the game
1. Open **Create your own level**, build the level, then **test-play** it until you solve it. Solving it records the solution, which hints use.
2. Sign in, then **Share › Publish** to get a short code like `VW-7KQ2XM`.
3. Make up to 5 of these.

### Step 2a: Firebase console (easiest)
1. Go to Firestore Database › **Start collection** `daily`. The first time only; after that open the existing `daily` collection.
2. **Add document**, with Document ID = the date, for example `2026-11-07`.
3. Add these fields:
   - `codes` (string): `VW-AAAAAA VW-BBBBBB VW-CCCCCC VW-DDDDDD VW-EEEEEE`
   - `tier` (number, optional): 0 = Easy … 5 = Extreme. This sets the points multiplier. Leave it out to use the weekday's tier.
   - `title` (string, optional)

The console doesn't check your levels. The game quietly skips any code that doesn't decode or whose solution doesn't win, and fills that slot from the pool.

### Step 2b: script (checks every level first)
```
cd game-src/tools/daily
npm install firebase-admin
# Firebase console › Project settings › Service accounts › Generate new private key › save as service-account.json
node push_daily.js 2026-11-07 VW-AAAAAA VW-BBBBBB VW-CCCCCC VW-DDDDDD VW-EEEEEE --tier 5 --title "Halloween special"
```
The script stops if a code is missing or its solution doesn't win in the real game engine.

You can publish days in advance.

## Firestore rules
Publish the updated `firestore.rules`, which covers `daily` (read only) and `lb_day` / `lb_week` (each player writes only their own row).

## Making more built-in levels
`game-src/tools/makedaily.js <from> <to>` generates pool levels. Every one is checked: it's solvable, every part is needed, and no layout with fewer parts wins. `builddaily.js` then turns them into `dailies.js`. Pool slots by weekday: Monday 0–11, Tuesday 12–23, Wednesday 24–37, Thursday 38–51, Friday 52–67, weekend 68–99.
