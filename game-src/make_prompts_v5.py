# Voltworks image prompts v5: machines only, NO base plates or stands.
# - Parts that never turn, or only flip left/right: 30-degree front view (the game mirrors left/right itself).
# - Parts that turn in 4 directions: ONE straight top-down picture pointing RIGHT, so the game can rotate it
#   smoothly in 90-degree steps and it still looks right.
import re
src = open('make_prompts.py').read()
ns = {}
exec(src.split("# ---- direction variants")[0], ns)   # reuse the part descriptions from v4
P = ns['P']
STYLE = ("High-quality game asset for a futuristic sci-fi engineering puzzle game, premium mobile game style. "
         "Camera: front view looking down from about 30 degrees above, the object faces the camera squarely so its front face is parallel "
         "to the viewer and we also see some of its top surface; NOT isometric, NOT turned to show a corner. "
         "Materials: dark gunmetal and brushed steel armour panels with chamfered edges, a few bolts, semi-realistic painted look, plus the part's "
         "accent colour on its key panels and one or two glowing lights. Keep the design compact and simple, with a bold silhouette that reads "
         "clearly at small size; not too many small details. Lighting: cool electric-blue rim light from the left, warm orange rim light from the right.")
TOP = ("High-quality game asset for a futuristic sci-fi engineering puzzle game, premium mobile game style. "
       "Camera: straight TOP-DOWN view from directly above (90 degrees, like looking down at a floor plan), the object lying flat, centred, "
       "seen from above with soft shading that gives it depth. Lighting: soft even light from directly above with no strong side light and no "
       "cast shadow, so the picture still looks correct when it is rotated by 90, 180 or 270 degrees. "
       "Materials: dark gunmetal and brushed steel armour panels with chamfered edges, a few bolts, semi-realistic painted look, plus the part's "
       "accent colour and one or two glowing lights. Keep the design compact and simple, with a bold silhouette that reads clearly at small size. "
       "Its working end points straight to the RIGHT side of the image; the rest of the body is roughly centred so it rotates neatly around the middle.")
TECH = ("No base, no stand, no plinth, no pedestal, no platform and no floor under it: only the machine itself. "
        "Single object only, centred, it fills the middle 80% of the square image and nothing touches the edges. "
        "Flat pure #00FF00 green background with no shadow. No frame, no grid, no cables or wires attached, no scenery, no text, no letters, "
        "no numbers, no logos. Square 1024x1024 PNG.")
FACE = " The working end points to the RIGHT side of the image."
# remove references to bases/stands from the v4 descriptions
def strip_base(d):
    d = re.sub(r"\s*on (a|an|its) (short |small |heavy round |round )?(armoured )?(stand|base|turret base|pedestal)( base)?", "", d)
    d = d.replace(" on a heavy round pedestal, with empty power sockets on both sides of the pedestal", ", with empty power sockets on both sides")
    d = d.replace("a red power symbol glowing on the pedestal", "a red power symbol glowing on it")
    d = d.replace("A small dark metal top bar on a short post", "A small dark metal top bar")
    return d
TOPDOWN = {
 'fan.png': ('Electric Fan', "Accent colour: teal. A round armoured turbine fan seen from above: the circular housing with its protective grille facing RIGHT, the blade tips just visible inside the front ring, a compact motor block on its left side, and a glowing teal ring around the front opening."),
 'chargefan.png': ('Charger Fan', "Accent colour: teal with a green battery. The same kind of round teal turbine fan seen from above, grille facing RIGHT, with a battery pack bolted on its left side showing a four-bar green charge meter half full."),
 'laser.png': ('Laser Device', "Accent colour: white with red. A sleek armoured laser emitter seen from above: a long white body with cooling fins and a glowing red glass lens at its RIGHT end."),
 'drill.png': ('Drill Machine', "Accent colour: yellow and black. An armoured drilling machine seen from above: a yellow-and-black motor housing on the left and a long spiral steel drill bit pointing to the RIGHT."),
 'chargelight.png': ('Charger Flashlight', "Accent colour: amber with a green battery meter. A chunky armoured searchlight seen from above: a wide round glass lens with a soft yellow glow at its RIGHT end and a four-bar green charge meter on its body."),
}
out = ["# Voltworks: Image Prompts v5 (machines only, no bases)", "",
       "Each prompt is complete: copy the whole block into your image tool. Generate them in this order and attach your first good result as a style reference for the rest.",
       "",
       "**What changed:** no base plates or stands under any machine, simpler and more compact designs. The 5 parts that turn in 4 directions (Fan, Charger Fan, Laser, Drill, Charger Flashlight) now need only ONE picture each, drawn straight from above and pointing right; the game rotates it smoothly when you tap it. You no longer need any `_up` / `_down` pictures.",
       "",
       "**If your tool has a negative-prompt box:** base, stand, pedestal, platform, plinth, floor, shadow, isometric, corner view, tile background, frame, grid, cables, text.", ""]
n = 0
for f, t, d, right in P:
    n += 1
    if f in TOPDOWN:
        tt, dd = TOPDOWN[f]
        out += [f"## {n}. {tt} (top-down, turns in 4 directions)", f"Save as `{f}`", "", "```", f"{TOP} {dd} {TECH}", "```", ""]
        continue
    out += [f"## {n}. {t}", f"Save as `{f}`", "", "```", f"{STYLE} {strip_base(d)}{FACE if right else ''} {TECH}", "```", ""]
open('ART_PROMPTS_v5.md', 'w').write("\n".join(out))
print(n, 'prompts')
