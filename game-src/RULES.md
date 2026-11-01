# Voltworks — Game Rules & Component Review

Working title **Voltworks** (FunPixelNest). Playable prototype: the "Voltworks" artifact (HTML5 canvas, 25 levels, all 31 components from *Electric_Box_Game.docx* plus Food).

## 1. Review of the component document

**Conflicts found and how the prototype resolves them**

| # | Issue | Resolution in prototype |
|---|---|---|
| 1 | The ChatGPT summary says **top-down**; your component list only works **side-view with gravity** (water drops, steam rises, ball falls, Heli Bot goes down). | Side view with gravity, like Electric Box 2. |
| 2 | The ChatGPT summary invents parts that are not in your list (motor, gear, boiler, pump, prism, conveyor, city/greenhouse targets). | Followed **your list** only. Those can be added later. |
| 3 | "Board resets after switching off" vs. charge-based parts that keep working after the power is cut. | Switching OFF keeps the simulation running. The board auto-resets once nothing changes for ~1.4 s and the target is still unpowered. |
| 4 | Electric Fan text says "direction of water kettle can be changed" (copy-paste). | Fan turns in 4 directions on tap. |
| 5 | Wireless range "383 grid" is unreadable. | Range = 3 cells in every direction (a 7×7 square). |
| 6 | Hamster needs Food, but Food isn't in the list. | Added **Food** as a level object. |
| 7 | How devices get power isn't defined. | **Electric Box rule:** a part works only when it sits ON a wire square. Separate cables can run side by side without joining (each cable has its own label in the level file). Power-making parts send power into the wire they sit on. |
| 8 | Can bots move level-fixed objects? | Yes. Players can't drag fixed objects, but bots, balls and teleporters can move or destroy them. Power supply, Target, Block and Spring are immovable. |
| 9 | "Detaches", "clears everything" undefined. | Ball and cannonball **destroy** any movable object in their path and stop at Power, Target, Block, Spring or the edge. |
| 10 | Mirror "no effect on other light". | Bulb/flashlight light passes straight through mirrors; only lasers reflect. |

## 2. Simulation rules (as implemented)

Turn-based ticks (220 ms). Machines that act once (ball dropper, cannon, drill, rotating tool, teleporter, spy bot) visibly charge up for about 1 s before acting; bots move one square every 3 ticks and glide between squares; smashed parts crumble over 0.6 s. Each tick: sources → electricity → charging → flows → mechanics → win check.

- **Electricity**: wires are floor tiles and parts sit on them. A cable is live when the main power box touches it or an active power-making part sits on it. Consumers do **not** pass power on. Blue current = main supply, orange current = power made by your machines.
- **Sources**: Main Power (when ON), Generator (air/water), Solar (light/laser), Steam Detector, Laser Feeder (horizontal laser), Wireless Receiver, charged Battery, fed Hamster.
- **Flows** stop at the first object (except light through mirrors). Steam crossing a sideways air stream shifts one column.
- **Bots** latch on once powered and keep going after leaving the wire (1 cell per 2 ticks), gliding smoothly between squares.
- **Spring**: anything falling onto it (a bot driving down, a dropped ball) squashes it and is bounced straight back up. From the side it is just a wall.
- **Charger devices** (Charger Fan, Charger Flashlight) work as soon as they are powered and charge in 4 ticks; once charged they keep working after the power is gone (switched off, or moved off the wire by a bot).
- **Win**: target powered for 4 consecutive ticks.

## 3. Level list (8 wide × 12 tall boards; all verified solvable by automated test; each has very few winning layouts)

Board size: 8 × 12 fits an upright phone at ~45 pt squares (~38 pt on small phones). Pinch to zoom, drag an empty square to move the board, double-tap to zoom in/out, FIT button to see the whole board; used mainly with the phone sideways.

1 First Light · 2 Wind Turbine · 3 Laser Line · 4 Waterfall · 5 Full Steam · 6 Crosswind · 7 Through the Wall · 8 Charge & Release · 9 Flash Charge · 10 Push It · 11 Backup Power · 12 Hungry Hamster · 13 Wind Music · 14 Heavy Drop · 15 Broadside · 16 Drill Down · 17 Twist · 18 Heli Lift · 19 Boing! · 20 Pull Back · 21 Special Delivery · 22 Beam Me Up · 23 Drop the Beat · 24 Undercover · 25 Power Plant

- Onboarding: level 1 opens a 9-step spotlight walkthrough (skippable, remembered; replay from Title → HOW TO PLAY). The first time a level brings in a new part, a card explains what it does and how to use it.
- Wireless: a powered sender scans its 7×7 range (3 squares each way) for about a second, then locks on and power arcs across to the receiver.

- Mega Grid (levels 26–35): 10×14 to 14×18 boards that open zoomed in on the power box; drag to explore, pinch or FIT to see all. Every level is checked by the built-in solver (exhaustive where small, random sampling of thousands of layouts where large) so none can be won by accident.
- Level sharing: a level can only be shared once proven solvable (built-in solver, or the creator's test-play solution re-simulated). Codes are re-verified when loaded. Levels → My Levels → Play a code.
- Accounts: optional email sign-in (Firebase, free plan) with Skip; signed-in players keep levels and stars in the cloud and share with short codes (VW-XXXXXX). Off until a Firebase project is added in game-src/cloud.js.
- Apps: Android (android/) and iOS (ios/) from the same game code.

## 4. Decisions still open

- Final name and branding: Voltworks is a placeholder. "Electric Box" is not recommended: Funtank LLC (Candystand) filed ELECTRIC BOX trademarks (serials 85272699, 85272702), and both app stores reject copycat names. Check USPTO/WIPO status of any final name before launch.
- Artwork v5 prompts (ART_PROMPTS_v5.md): machines only, no bases; the 5 four-way parts use one top-down picture each that the game rotates (animated). Current art: 49 part pictures + title background + app icon are in the game (green screen removed, 256 px WebP). Wireless sender/receiver files were swapped and fixed; bulb_on glass tinted yellow. Cables are drawn in code as armoured glowing hoses to match the title art.
- Engine: the prototype is HTML5. The rules port directly to Unity C# (the engine is ~450 lines, no rendering code).
- Level count for launch, and harder multi-chain levels after the 24 tutorials.
- Scoring for Skillz-style competition: a fixed puzzle has one shareable answer, so cash competition would need timed or procedurally generated boards.
- Level editor: built in (Title → EDITOR, or Levels → My Levels → +). Draw 4 colours of cable, place power/target/blocks/no-build squares and any fixed part, set the player's tray, size the board, test-play (beating it records the solution), save to My Levels on the device, share/load as a VW1 code.
- Hints: tapping the bulb plays an animated hand that drags the next part from the tray (or from a wrong square) to its square and taps it to turn it if needed; an outline marks the square. 3 stars with no hints, 2 with one hint, 1 with more. Full walkthrough with pictures is published separately.
