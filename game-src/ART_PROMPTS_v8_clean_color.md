# Circuit Forge: simple, colourful machine prompts (v8, rotation-safe)

These are simple, bright machines with one bold colour each, like Electric Box 2, made to look like clean, realistic product renders, **not cartoons**.

**Why this version changes the camera:** many parts turn in the game. The game takes **one** picture and rotates it 90°, 180° and 270°. So:

- no picture may have a base, stand, feet or floor, because these would end up on the side or upside down
- no picture may use a tilted or three-quarter camera, because a tilt looks wrong once it's turned

Every machine is drawn **perfectly flat-on, with the camera level with it and no perspective tilt**, like a technical side or front view.

## How to use

1. Paste the **style block** for the machine's group (A, B or C), then the machine's line after it.
2. Make each image **1:1 square, 1024×1024**, on a flat pure green background (#00FF00).
3. Save it with the file name in **bold**, then send me the images as a zip.

## Shared look (it's part of every style block below)

> Clean modern industrial design, rendered like a premium product photo. Simple shapes with few parts, smooth rounded edges and soft bevels. Glossy painted metal and matte plastic in ONE bold, saturated signature colour, with light grey or white secondary parts and small dark-grey details. Soft, even studio lighting with gentle reflections. Realistic materials, NOT cartoon: no black outlines, no faces, no eyes, no exaggerated proportions, no rust, no dirt, no text, no logos, no numbers. The object fills about 80% of the square, centred, fully inside the frame. Isolated on a flat pure green #00FF00 background, with no floor and no cast shadow.

---

## Group A: parts that turn to face all four directions

The game rotates these freely, so they must look right pointing right, down, left and up.

**Style block A (paste first):**
> A single game asset for a mobile puzzle game. STRICT flat SIDE VIEW, orthographic: the camera is exactly level with the machine, with no top-down angle, no three-quarter angle and no perspective. The machine lies horizontally and points to the RIGHT, its working end on the right edge. It is mirror-symmetrical top-to-bottom (the top half and bottom half look the same), so it still looks correct when rotated 90 degrees. Absolutely NO base, NO stand, NO feet, NO legs, NO mounting bracket, NO floor: it floats in empty space. [shared look]

| File | Machine line |
|---|---|
| **fan** | A compact motor pod lying horizontally, with an exposed three-blade propeller on its RIGHT end, seen side-on so the spinning blades stick out above and below the pod and are clearly visible. NOT enclosed in a housing or cage. Glossy sky-blue pod, white propeller blades and a chrome hub. |
| **chargefan** | The same motor pod with an exposed three-blade propeller on its RIGHT end, in glossy lime green, with a white battery band around the middle of the pod showing three glowing green bars (the same on top and bottom). |
| **laser** | A smooth cylindrical laser emitter lying horizontally, pointing RIGHT: a white body with magenta-pink rings and a glowing magenta lens on the right end. Perfectly round and symmetrical, nothing on top or bottom. |
| **drill** | A drilling machine lying horizontally, pointing RIGHT: a rounded glossy yellow motor cylinder on the left and a long spiral silver drill bit on the right. Symmetrical top-to-bottom, no handle. |
| **chargelight** | A cylindrical flashlight lying horizontally, pointing RIGHT: a glossy aqua-blue body, a wide clear glowing lens on the right end, and a ring of small green charge lights around the back (left) end. Symmetrical, nothing sticking up. |
| **spring** | A heavy coil spring standing upright: chunky chrome coils between two identical glossy red round pads, one on top and one on the bottom. Perfectly symmetrical top-to-bottom. The game turns it on its side when needed. |
| **mirror** | A long, thin, bright reflective mirror panel in a slim white frame, at an exact 45° "/" diagonal (bottom-left to top-right), with a small round pivot in the middle. Flat-on, no depth tilt. |

---

## Group B: parts that only flip left/right

The game only mirrors these left/right. They are never turned on their side, so wheels or tracks underneath are fine.

**Style block B (paste first):**
> A single game asset for a mobile puzzle game. STRICT flat SIDE VIEW, orthographic: the camera is exactly level with the object, with no top-down angle, no three-quarter angle and no perspective. The object faces RIGHT. No base, no platform and no floor under it: only its own wheels or tracks, if it has them. [shared look]

| File | Machine line |
|---|---|
| **kettle** | A modern electric kettle in side profile with its spout pointing RIGHT: a glossy cherry-red body, a white handle on the left and a chrome lid. |
| **pushbot** | A small tracked robot vehicle in side profile facing RIGHT, with a flat pusher plate on the front, a glossy tangerine-orange body, dark tracks, and a small sensor light instead of a face. |
| **pullbot** | A small tracked robot vehicle in side profile facing RIGHT, with a two-finger gripper claw reaching forward, a glossy emerald-green body and dark tracks. |
| **carrierbot** | A low, flat cargo robot in side profile on four small wheels, facing RIGHT, with a wide flat top deck, a white arrow light strip pointing right, and a glossy royal-blue body. |
| **hamster** | A transparent hamster wheel in side profile with a small realistic hamster inside, running toward the RIGHT, and a small glossy amber dynamo on the left. |
| **cannon** | A compact cannon in side profile facing RIGHT: a short, stubby, glossy bronze barrel on a small dark two-wheel carriage. |

---

## Group C: parts that never turn

These always appear upright. Draw them **straight-on from the front**, with no tilt.

**Style block C (paste first):**
> A single game asset for a mobile puzzle game. STRICT FRONT VIEW, orthographic: the camera is exactly level with the object and looks straight at its front face, with no top-down angle, no three-quarter angle and no perspective. No base, no platform, no floor, no stand unless described. [shared look]

| File | Machine line |
|---|---|
| **power_off** | A rounded square power box seen straight from the front, with a big round power button in the centre. A glossy cobalt-blue body with a white trim ring. The button is unlit grey. |
| **power_on** | The same blue power box. The power button glows bright warm orange, with a soft orange glow on the trim. |
| **target_off** | A rounded hexagonal energy core seen straight from the front: a round clear glass window in a white housing with four teal accents. The window is empty and dim. |
| **target_on** | The same core. The glass window is filled with bright glowing cyan energy, and the teal accents glow. |
| **block** | A solid rounded square block of heavy grey metal seen straight from the front, with two bold yellow-and-black diagonal hazard stripes. Clean and simple. |
| **generator** | A compact electric generator seen straight from the front, with NO fan, NO propeller and NO turbine blades, so it can't be mistaken for a fan. A chunky glossy bright-orange box, a big round copper coil drum across the middle (horizontal copper windings), two silver terminal posts on top, and a small glowing lightning-bolt light on the front. |
| **bulb_off** | A big classic light bulb seen straight from the front on a short chrome screw socket. Clear glass, thin unlit filament. |
| **bulb_on** | The same bulb, glowing bright warm yellow-orange from inside, with a soft halo. |
| **solar** | A square solar panel seen straight from the front, flat-on: deep blue glossy cells in a thin silver frame. No stand, no arm. |
| **heater_off** | A rounded square heater seen straight from the front: a glossy tomato-red body with a round coil grille in the centre. The coil is dark grey. |
| **heater_on** | The same heater with the coil glowing hot orange, plus a faint heat shimmer. No flames. |
| **steamdet** | A compact sensor box seen straight from the front: a round white gauge dial on the face, a small funnel opening on the BOTTOM edge, and a glossy turquoise body. |
| **feeder** | A square receiver box seen straight from the front: a round red glass crystal in the centre, with small white input ports on the LEFT and RIGHT edges only. Glossy white body with crimson trim. |
| **wsender** | A compact wireless transmitter seen straight from the front: a short white antenna tower with a glowing green tip and curved signal arcs on both sides, on a small glossy mint-green box. |
| **wreceiver** | A compact satellite dish receiver seen straight from the front: a small white dish facing the viewer on a short glossy mint-green box. |
| **chime** | A wind chime seen straight from the front: five glossy golden metal tubes of different lengths hanging from a short white bar. |
| **food** | A wedge of yellow cheese seen from the side on a small round white dish. Realistic, clean. |
| **balldrop** | A ball dispenser seen straight from the front: a rounded glass capsule holding a red ball, a glossy crimson housing, and a release gate on the BOTTOM. |
| **rotator** | A round rotating turntable seen straight from the front: a glossy purple disc with a white circular-arrow symbol and a geared silver rim. |
| **tpsend** | A round teleporter pad seen straight from the front: stacked glowing hot-pink rings floating above a glossy white pad, with a small downward arrow light. |
| **tprecv** | The same teleporter pad with glowing violet rings and a small upward arrow light. |
| **helibot** | A small round drone seen straight from the front: a twin rotor on top, a small claw hanging underneath, a glossy scarlet-red body and white rotor blades. |
| **soundbot** | A small boxy robot seen straight from the front: a big round speaker cone on its face, a glossy violet body with white trim, and a light bar instead of a face. |
| **spybot** | A small hovering scanner drone seen straight from the front: one large round glass lens, a short antenna, and a glossy charcoal body with a red lens. |
| **battery_empty** | An upright battery cell seen straight from the front: a glass window showing four empty charge bars, a glossy white body and a dark-grey top cap. |
| **battery_full** | The same battery with all four charge bars glowing bright green. |

---

## Checklist before you send them

- **Group A:** turn each picture 90° in your phone's photo viewer. It should still look correct, with nothing upside down.
- **No tilt anywhere:** you should not see the top surface of any machine.
- **No bases, stands or floors.** Group B can keep its own wheels or tracks.
- If one looks cartoony, add: *"realistic product render, no outlines, no faces"*.
- If one is too busy, add: *"simpler, fewer parts, one bold colour"*.
