"""Spell effects (docs/SPELLS_PLAN.md): a painted effect for each of the 21 rider spells, a cast flare, a
magic-weapon orb and a hit burst, and a big second piece for the five late spells. Three sheets.
Run from the gen folder: python3 v2/jobs21.py, then ./v2/run.sh fx-spells-1 fx-spells-2 fx-spells-finish
Effects have no outline, like the breath bursts. Three pieces (orb, cast flare, hit burst) are painted in the
dragon key colors, red and gold, because the game recolors them per element."""
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its flat two-tone cel shading, shape language and level of simplicity exactly. Do not copy its subject."
FX = " Every effect is a bold, simple, flat graphic shape with NO dark outline at all (flat shapes only, two or three tones, brightest at the center), readable when small, like effects in a 2D animated series. Keep any small loose bits (sparkles, droplets, shards) very close to their effect. Each effect is fully separate with wide green space around it; none touch."
TAIL = " Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright or light green anywhere in the artwork itself (use dark forest or olive greens if something must be green). No characters, no ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."

def sheet(name, intro, items):
    body = intro + FX + " Reading order, left to right, top row first:\n" + "\n".join(f"{i + 1}) {t}" for i, t in enumerate(items))
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name) + "\n\n" + body + TAIL + "\n\n" + STYLE + "\n")

RIGHT = "It flies to the RIGHT: its head or point is at the right and any tail trails to the left, lying flat and horizontal."
sheet('fx-spells-1', "SUBJECT: a sheet of 12 separate magic spell effects for a game, arranged in a grid of 4 columns by 3 rows, evenly spaced, each filling about the same area.", [
 f"Arc bolt: a crackling ball of violet and white arcane energy with a short comet tail. {RIGHT}",
 f"Rot spit: a glob of sickly mustard-yellow and olive slime with a few droplets trailing behind. {RIGHT}",
 f"Frost dart: a sharp pale-blue and white icicle dart with a short frosty trail. {RIGHT}",
 f"Static lash: a jagged zigzag lightning bolt, bright yellow with a violet edge. {RIGHT}",
 f"Ember lance: a long slim spear made of orange and yellow flame with a pale yellow core. {RIGHT}",
 f"Steel needles: three thin silver-gray steel needles side by side in a tight fan, with short speed streaks. {RIGHT}",
 f"Umbral bolt: a bolt of dark violet and black shadow with a pale lilac edge and a wispy tail. {RIGHT}",
 f"Radiant lance: a long slim spear of golden-white light with a bright white core. {RIGHT}",
 f"Comet shard: a pointed crystal shard, pink and white, with a sparkling pale-pink tail. {RIGHT}",
 "Magic orb: a simple round ball of energy. Paint it in exactly two colors: the outer body bright pure RED-ORANGE with a darker red rim, and the core bright GOLDEN YELLOW. No other colors.",
 "Cast flare: a starburst of eight short pointed rays around a small ring, like a spell being cast. Paint it in exactly two colors: the rays bright pure RED-ORANGE, the ring and center bright GOLDEN YELLOW. No other colors.",
 "Ward: a rounded kite shield made of warm golden light with a white four-point star in its middle and a pale cream rim, seen from the front.",
])
UP = "It stands upright: wide flat base at the bottom, pointing straight UP."
sheet('fx-spells-2', "SUBJECT: a sheet of 12 separate magic spell effects for a game, arranged in a grid of 4 columns by 3 rows, evenly spaced, each filling about the same area.", [
 f"Shale spike: a cluster of three jagged tan and brown rock spikes bursting out of the ground, with a few small rock chips at the base. {UP}",
 f"Void spike: one tall jagged crystal spike of deep indigo and black with a pale violet edge and two small shards at the base. {UP}",
 f"Thorn snare: thick dark forest-green thorny vines twisting upward into a round cage shape, with dark red thorns. {UP}",
 "Tide surge: a tall curling ocean wave of teal and light blue water with a white foam crest, rolling to the RIGHT, flat along its bottom.",
 "Inferno: a wide rolling wall of fire, tall orange and yellow flames with a pale yellow core, leaning and moving to the RIGHT, flat along its bottom.",
 "Eventide: a low sweeping wave of dark violet and black shadow with curled crescent tips and three tiny pale stars in it, rolling to the RIGHT, flat along its bottom.",
 "Tempest: a tall vertical forked lightning bolt, bright yellow with a violet edge, striking straight DOWN from a small dark gray storm cloud at its top.",
 "Daybreak: a tall vertical beam of golden-white light coming straight DOWN, narrow at the top and wider at the bottom, with a few short rays beside it.",
 f"Astral nova: a falling five-point star, pink and white with a pale blue glow shape and a long sparkling tail. {RIGHT}",
 "Mend: three small rose-pink hearts and four white four-point sparkles in a loose rising cluster.",
 "Greater mend: one large rose-pink heart with two small white feathered wings, a thin golden halo ring above it and a few white sparkles.",
 "Hit burst: a spiky impact star with eight uneven points. Paint it in exactly two colors: the points bright pure RED-ORANGE, the center bright GOLDEN YELLOW. No other colors.",
])
sheet('fx-spells-finish', "SUBJECT: a sheet of 5 separate, large, dramatic magic spell finishing effects for a game: 3 in the top row and 2 in the bottom row, evenly spaced, each filling about the same large area.", [
 "Tempest: a huge burst of branching lightning, six thick forked bolts radiating out from a white-hot center in all directions, bright yellow with violet edges.",
 "Inferno: a towering explosion of fire, a tall pillar of orange and yellow flame that mushrooms out at the top, with a pale yellow core, flat along its bottom.",
 "Astral nova: a giant starburst, a white center with a ring of long pink and pale blue pointed rays and a thin outer ring of tiny stars.",
 "Daybreak: a rising sun, the top half of a big golden disc with a white center and broad alternating gold and pale yellow rays fanning upward, flat along its bottom.",
 "Eventide: a large dark crescent moon, deep violet with a lilac edge, wrapped in a swirl of black shadow and a few pale stars.",
])
print('fx-spells-1 fx-spells-2 fx-spells-finish')
