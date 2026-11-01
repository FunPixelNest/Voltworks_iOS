# Voltworks image prompts v4: 30-degree look-down, facing camera squarely, one shared material family
# (dark gunmetal + blue/orange lighting, like the approved energy-core image), one accent colour per part,
# and every picture shows what the part DOES.
STYLE = ("High-quality game asset for a futuristic sci-fi engineering puzzle game, in the same style as a premium mobile game. "
         "Camera: front view looking down from about 30 degrees above, the object faces the camera squarely so its front face is "
         "parallel to the viewer and we also see some of its top surface; NOT isometric, NOT turned to show a corner, NOT rotated sideways. "
         "Materials: dark gunmetal and brushed steel armour panels with chamfered edges, bolts and rivets, semi-realistic painted look, "
         "plus the part's accent colour on its key panels and lights. Lighting: cool electric-blue rim light from the left, warm orange rim light "
         "from the right, soft glow from its lights. Bold chunky silhouette that is still easy to recognise at small size.")
TECH = ("The object stands on a low dark octagonal steel base plate that is part of the object. Single object only, centered, it fills the "
        "middle 80% of the square image and nothing touches the edges. Transparent background (if transparency is not possible: a flat pure "
        "#00FF00 green background with no shadow). No tile, no frame, no rounded app-icon square, no grid, no floor, no cables or wires attached, "
        "no scenery, no text, no letters, no numbers, no logos. Square 1024x1024 PNG.")
FACE = " The working end points to the RIGHT side of the image."
P = []
def add(f, t, d, right=False): P.append((f, t, d, right))
# ---- fixed level parts
add('power_off.png','Main Power Supply (OFF)',"Accent colour: red. A heavy power cabinet with red armour panels and a big white power symbol on its front, a thick lever switch on its right side pointing DOWN, a small red warning light. The power symbol is dim and nothing glows: it is clearly switched off.")
add('power_on.png','Main Power Supply (ON)',"Accent colour: red. The same heavy red power cabinet, same pose. The lever is UP, the white power symbol glows brightly, blue electricity crackles from the vents on top and small sparks fly: it is clearly switched on and full of power.")
add('target_off.png','Target (OFF)',"Accent colour: cyan. An energy core reactor: a large glass sphere held by four armoured claws on a heavy round pedestal, with empty power sockets on both sides of the pedestal. The sphere is dark and empty with a faint violet shimmer: it is waiting for power.")
add('target_on.png','Target (ON)',"Accent colour: cyan. The same energy core reactor, same pose. The glass sphere is filled with blazing blue-white energy and branching lightning, the claws' light strips glow cyan and orange: it is fully powered.")
add('block.png','Block',"Accent colour: yellow-and-black hazard stripes. A heavy armoured steel crate with reinforced corner caps, rivets and hazard stripes on its front. It must look solid, heavy and impossible to move or pass through.")
# ---- air, water, heat, steam
add('fan.png','Electric Fan',"Accent colour: teal. A round armoured turbine fan with teal panels, its spinning blades visible behind a protective grille on its front, a motor on its back, and three bright white wind streaks blowing out of its front toward the right, so it clearly blows air to the right.", True)
add('chargefan.png','Charger Fan',"Accent colour: teal with a green battery. The same kind of round teal turbine fan, plus a battery pack bolted underneath with a four-bar green charge meter half full. White wind streaks blow out of its front toward the right.", True)
add('generator.png','Power Generator',"Accent colour: copper and orange. A turbine generator: a round turbine wheel with curved vanes on its LEFT side (where wind or water hits it and spins it) connected to a block of glowing copper coil windings on its right side, with small orange sparks jumping across the coils and a lightning-bolt light on top, so it clearly turns spinning motion into electricity.")
add('kettle.png','Water Kettle',"Accent colour: white enamel with chrome and a blue water window. A futuristic armoured kettle with a long curved spout pointing to the right and downward, a drop of blue water falling from the spout tip, a steam vent on its lid and a glowing blue water-level window on its side.", True)
add('heater_off.png','Electric Heater (OFF)',"Accent colour: orange-red. A low, wide armoured hotplate with a flat metal grill on top (made for a kettle to sit on) and heating coils visible through a front window. The coils are dark red and cold, nothing glows.")
add('heater_on.png','Electric Heater (ON)',"Accent colour: orange-red. The same low hotplate, same pose. The coils glow bright orange-hot, small flames dance on the grill on top and heat shimmer rises from it.")
add('steamdet.png','Steam Detector',"Accent colour: mint green. A pressure sensor unit with a large round pressure gauge on its front, a wide funnel-shaped steam intake opening on its BOTTOM with soft white steam wisps curling into it, and a small lightning-bolt light, so it clearly catches steam from below and makes power.")
add('chime.png','Wind Chime',"Accent colour: polished brass. A wind chime: a small dark metal top bar on a short post, with five shiny brass tubes of different lengths hanging and swinging slightly, and a few small glowing music notes floating beside it.")
# ---- light & laser
add('bulb_off.png','Light Bulb (OFF)',"Accent colour: yellow. A big industrial light bulb with a thick glass globe and a zigzag filament, screwed into an armoured socket. The glass is clear and the filament grey: it is switched off.")
add('bulb_on.png','Light Bulb (ON)',"Accent colour: yellow. The same big industrial light bulb, same pose. It glows bright warm yellow-white, with short light rays shining out to the up, down, left and right.")
add('solar.png','Solar Panel',"Accent colour: deep blue with gold trim. A solar panel tilted up toward the viewer on a short armoured stand, made of a 4 by 3 grid of shiny deep-blue cells in a gold frame, a bright light glint across the cells and a small lightning-bolt light on the stand, so it clearly turns light into power.")
add('laser.png','Laser Device',"Accent colour: white with red. A sleek armoured laser emitter lying horizontally, white panels with cooling fins, a glowing red glass lens at its right end and a short red laser flash just leaving the lens.", True)
add('feeder.png','Laser Feeder',"Accent colour: white with red. An upright armoured receiver box with two round red glass lens ports, one on its LEFT side and one on its RIGHT side, a dark energy core in its middle and a small lightning-bolt light, so it clearly catches a laser from either side.")
add('mirror.png','Mirror',"Accent colour: silver and chrome. A tall flat mirror panel in a dark metal frame, tilted at 45 degrees from bottom-left to top-right on a pivot joint, its surface bright and reflective.")
add('chargelight.png','Charger Flashlight',"Accent colour: amber with a green battery meter. A chunky armoured searchlight lying horizontally with a wide glass lens on its right end giving a soft yellow glow, and a four-bar green charge meter on its body.", True)
# ---- power storage & wireless
add('battery_empty.png','Battery Pack (EMPTY)',"Accent colour: mint green. A fat armoured battery block with two chunky terminals on top (one red cap, one black cap) and a four-bar charge window on its front. All four bars are dark: it is empty.")
add('battery_full.png','Battery Pack (FULL)',"Accent colour: mint green. The same fat battery block, same pose. All four charge bars glow bright green and a small electric spark arcs between the terminals: it is full of power.")
add('wsender.png','Wireless Sender',"Accent colour: cyan-green. A compact transmitter: a lattice antenna mast on an armoured base, its tip glowing, with three curved glowing signal waves radiating outward from the tip.")
add('wreceiver.png','Wireless Receiver',"Accent colour: cyan-green. A compact satellite dish on an armoured base, the dish pointing up and to the left, with a glowing tip on its feed antenna and one incoming curved signal wave just reaching it.")
# ---- bots (no base plate for these)
add('pushbot.png','Push Bot',"Accent colour: yellow and black. A small armoured bulldozer robot on caterpillar treads with two glowing cyan eyes and a wide steel push blade on its right side, ready to shove things.", True)
add('pullbot.png','Puller Bot',"Accent colour: mint green. A small armoured robot on caterpillar treads with two glowing cyan eyes and a mechanical arm reaching out to its right that ends in an open grabber claw.", True)
add('carrierbot.png','Carrier Bot',"Accent colour: deep blue. A low, wide armoured robot truck on caterpillar treads with a flat empty cargo deck on top and two glowing eyes at its front (right side).", True)
add('helibot.png','Heli Bot',"Accent colour: red-orange. A small armoured flying drone robot with a spinning rotor on top, two glowing eyes, and a mechanical grabber claw hanging DOWN on a short arm underneath.")
add('soundbot.png','Sound Bot',"Accent colour: purple. A boxy armoured robot whose whole front is one big round loudspeaker cone with glowing purple rings, small music notes coming out of it, and a flat push plate underneath pointing down.")
add('spybot.png','Spy Bot',"Accent colour: black with red. A sleek matte-black stealth robot on small treads with a glowing red scanning visor sweeping a thin red scan line, and a thin antenna with a red tip.", True)
# ---- tools
add('balldrop.png','Ball Dropper',"Accent colour: silver and steel. An armoured funnel-shaped hopper holding a heavy shiny chrome ball, with its release chute opening pointing straight DOWN and a clamp at the chute.")
add('cannon.png','Cannon',"Accent colour: dark iron with an orange muzzle ring. A short fat armoured cannon on a turret base, its barrel pointing to the right, a small puff of smoke at the muzzle.", True)
add('drill.png','Drill Machine',"Accent colour: yellow and black. An armoured drilling machine with a motor housing at its back and a long spiral steel drill bit pointing to the right, tiny sparks at the drill tip.", True)
add('rotator.png','Rotating Tool',"Accent colour: violet. A round actuator on a base: a heavy gear ring around a dark disc showing two curved glowing violet arrows chasing each other around in a circle, so it clearly flips and turns things.")
add('tpsend.png','Teleporter Sender',"Accent colour: magenta. A round armoured teleporter pad with a glowing magenta energy ring and a swirling magenta beam of light pouring DOWN into the pad.")
add('tprecv.png','Teleporter Receiver',"Accent colour: violet. A round armoured teleporter pad with a glowing violet energy ring and a bright violet beam of light shooting UP out of the pad.")
add('spring.png','Spring',"Accent colour: chrome with red end caps. A big shiny chrome coil spring standing upright between a red metal cap on top and a red metal cap at the bottom, looking bouncy.")
# ---- hamster & food
add('hamster.png','Hamster Wheel',"Accent colour: silver wheel with an orange hamster. A cute chubby orange-and-cream hamster running happily inside a silver exercise wheel on an armoured stand, with a small dynamo and lightning-bolt light on the side, the hamster facing right.", True)
add('food.png','Food',"Accent colour: yellow. A wedge of yellow cheese with holes on a small dark metal dish.")

# ---- direction variants: parts that turn in 4 directions need their own UP and DOWN pictures
# (LEFT is made automatically by mirroring the RIGHT picture; optional _left files are used if supplied)
VERT = {
 'fan': ('Electric Fan', "Accent colour: teal. The same round armoured teal turbine fan as fan.png, same materials and lighting, but mounted on a short swivel bracket on its base plate and turned so its grille faces {DIR}: its spinning blades and three bright white wind streaks blow toward the {EDGE} of the image."),
 'chargefan': ('Charger Fan', "Accent colour: teal with a green battery. The same teal turbine fan with the green battery meter as chargefan.png, mounted on a short swivel bracket and turned so its grille faces {DIR}: white wind streaks blow toward the {EDGE} of the image."),
 'laser': ('Laser Device', "Accent colour: white with red. The same sleek white laser emitter as laser.png, mounted on a short swivel bracket on its base plate and turned so its glowing red lens points {DIR}, with a short red laser flash leaving the lens toward the {EDGE} of the image."),
 'drill': ('Drill Machine', "Accent colour: yellow and black. The same yellow-and-black drilling machine as drill.png, mounted on a short swivel bracket on its base plate and turned so its long spiral drill bit points {DIR}, with tiny sparks at the tip toward the {EDGE} of the image."),
 'chargelight': ('Charger Flashlight', "Accent colour: amber with a green battery meter. The same chunky searchlight as chargelight.png, mounted on a short swivel bracket on its base plate and turned so its wide glowing lens points {DIR}, toward the {EDGE} of the image."),
}
for key, (title, tmpl) in VERT.items():
    for dname, d, edge in [('up', 'straight UP', 'top'), ('down', 'straight DOWN', 'bottom')]:
        add(f'{key}_{dname}.png', f'{title} (pointing {dname.upper()})', tmpl.format(DIR=d, EDGE=edge) + " Keep the base plate at the bottom of the image exactly as in the right-facing version; only the machine on top is turned.")
NO_BASE = {'pushbot.png','pullbot.png','carrierbot.png','helibot.png','soundbot.png','spybot.png','food.png'}
out = ["# Voltworks: Image Prompts (one complete prompt per image)", "",
       "Each prompt below is complete. Copy the whole block into your image tool as-is; no other text is needed.",
       "**Look:** front view from about 30° above, every part facing the camera squarely (never corner-on), all in one family: dark gunmetal armour with blue and orange lighting, plus one accent colour per part.",
       "**If your tool has a separate negative-prompt box, put:** isometric, corner view, rotated, side view, tile background, rounded square frame, grid, cables, text.",
       "**Turning parts:** the Fan, Charger Fan, Laser, Drill and Charger Flashlight can face 4 ways, so each has a RIGHT picture plus separate UP and DOWN pictures (make the UP/DOWN ones with the RIGHT one attached as reference). LEFT is made automatically by mirroring the RIGHT picture. Parts that only face left/right, and the mirror, are mirrored automatically.",
       "**Order:** generate the Electric Fan first, pick your favourite and attach it as a style reference for every other prompt. For OFF/ON and EMPTY/FULL pairs, attach the first image when making the second so the shape stays identical.", ""]
n = 0
for f, t, d, right in P:
    n += 1
    tech = TECH if f not in NO_BASE else TECH.replace("The object stands on a low dark octagonal steel base plate that is part of the object. ", "No base plate. ")
    full = f"{STYLE} {d}{FACE if right else ''} {tech}"
    out += [f"## {n}. {t}", f"Save as `{f}`", "", "```", full, "```", ""]
n += 1
out += [f"## {n}. App Icon", "Save as `app_icon.png`", "", "```",
        "Premium mobile game app icon, square 1024x1024 PNG, no transparency, full-bleed square artwork with no rounded corners and no frame (the phone rounds the corners itself). Front view looking down from about 30 degrees: a heavy armoured energy-core reactor with a large glass sphere full of blazing blue-white energy and branching lightning, held by four armoured claws with cyan and orange light strips, a red power symbol glowing on the pedestal, blue and orange lightning arcs around it, dark navy background with a faint blueprint grid and a soft glow. Dark gunmetal and brushed steel, semi-realistic painted look, cool blue rim light from the left, warm orange rim light from the right. No text, no letters, no numbers, no logos.",
        "```", ""]
n += 1
out += [f"## {n}. Title Screen Background", "Save as `title_bg.png`", "", "```",
        "Wide cinematic background for a futuristic sci-fi engineering puzzle game title screen, 1920x1080 PNG, no transparency. Front view looking down from about 30 degrees at a dark navy blueprint-grid workbench at night, with heavy armoured machines on octagonal steel bases connected by glowing cables: a red power cabinet with a white power symbol, a teal turbine fan blowing white wind streaks, a copper generator sparking, a glowing yellow light bulb and a blue-white energy core reactor crackling with lightning. Blue current flows in some cables and orange current in others, soft smoke and light haze. Dark gunmetal materials, cool blue rim light from the left, warm orange from the right. The centre third is darker and empty for the game logo. No text, no letters, no numbers, no logos.",
        "```", ""]
open('ART_PROMPTS.md', 'w').write("\n".join(out))
print(n, 'prompts')
