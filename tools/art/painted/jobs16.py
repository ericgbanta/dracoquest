"""Sixteenth batch (dragons plan chunk 9): Starfall Summit and Dragonsrest (backdrop, boss, enemy sheet and their attack
poses) and the Behemoth breed (four life stages on one sheet, then the attack sheet). No map: Beyond the Peak and the
Elder Wilds already paint both. Run from the gen folder: `python3 v2/jobs16.py idle`, generate, then
`python3 v2/jobs16.py attack`. The Behemoth sheet uses refs/dragon-colors.png (the original adult dragon) for colors."""
import os, shutil, sys
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly, so this looks like art from the same game. Do not copy its subject or its colors unless told to."
TAIL = "Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself (use dark, olive or teal greens if something must be green). No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."
KEYS = "Colors are fixed for every one of them: body pure red-orange with a darker red shadow tone; belly plates, wing membranes, back armor plates and back spines golden yellow with an orange-gold shadow tone; horns and claws cream; eye white with a dark brown iris. Use no other reds, oranges or yellows anywhere. Every tail ends in a plain tapered point (no flame, no club, no ornament)."
os.makedirs('v2/prompts', exist_ok=True); os.makedirs('v2/out', exist_ok=True); os.makedirs('v2/refs', exist_ok=True)

def job(name, body, ref=None):
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name) + "\n\n" + body + "\n\n" + STYLE + "\n")
    if ref: shutil.copy(ref, f'v2/refs/{name}.png')

BOSS = "Strict side profile facing RIGHT, full body, standing on the ground, whole creature inside the frame with a clear margin, nothing cropped. A big imposing boss enemy for a side-view battle: menacing and grumpy but still funny and all-ages. " + TAIL
BD = " COMPOSITION RULES: full-bleed scene to every edge, NO characters or creatures. The bottom quarter of the image is wide, flat, fairly empty ground where fighters will stand: calm and low in detail, with a soft pool of lighter color in the middle; props sit only near the far left and right edges. The middle band of the picture is calmer and lower in contrast than the top, so characters placed on it stand out. One clear light source (sun, moon or glow) sits in the upper middle of the sky. For this background, adapt the style: scenery is flat color shapes with two or three value steps and NO dark ink outlines (outlines are reserved for characters), distant layers lighter and hazier, colors a little softer and less saturated than the reference character. No text, no border."
SAME = " This is the SAME creature as the SECOND attached image: keep its exact design, colors, markings and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole creature inside the frame with a clear margin, nothing cropped. Do NOT draw any impact effects, speed lines, breath or projectiles. " + TAIL

def sheet(theme, items):
    return ("SUBJECT: a sheet of six separate enemy creatures for a side-view battle game, arranged in a grid of 3 columns by 2 rows, evenly spaced. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size (the sixth is the mini-boss: make it look tougher, not larger than its cell). They are grumpy, funny, all-ages creatures from " + theme + ". Reading order, left to right, top row then bottom row:\n"
            + "\n".join(f"{i+1}) {t}." for i, t in enumerate(items)) + "\n" + TAIL)
def sheet_attack():
    return ("SUBJECT: the SAME six creatures as the SECOND attached image, in the same grid of 3 columns by 2 rows, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open, claws, horns, wings or weapons thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (sparkles, spores, floating stars) close to their creature. " + TAIL)

AREAS = {
 'starfall-summit': {
  'bg': "Starfall Summit, the highest mountain top in the world where falling stars land: a flat pale lilac-gray stone plateau above a sea of soft clouds, with a lighter pool in the middle and a few small glowing pale-gold star fragments half buried in the ground near the edges, a broken ring of old standing stones (an ancient stargazing arch) at the far left edge, a big glowing pale-gold crystal of a fallen star leaning at the far right edge, the sky split softly between deep indigo night full of a few big simple stars on the left and a warm golden dawn on the right, a huge bright falling star with a short glowing trail in the upper middle as the light source.",
  'boss': ('vesperax', "Vesperax, the Star That Fell, a colossal celestial wolf-like beast and the final boss of the game: a huge powerful four-legged body that is deep indigo night sky with a few big simple pale stars on it, a darker navy shadow tone, a great flowing mane of pale golden light shaped like sun rays around its neck, four short pale-gold horns like a crown of star points, long pale-gold claws, a long bushy tail of night sky tipped with gold, glowing white eyes, a proud ancient scowl", "lunging forward to the right with both front paws raised and claws spread, mouth wide open in a roar, golden mane flaring forward, tail lashing"),
  'theme': "the top of the world where falling stars land, half made of starlight and half of night",
  'sheet': ["Star Sprite: a small chubby five-pointed star creature, pale gold with a warmer gold shadow tone, stubby arms and legs, big cheerful-angry eyes",
            "Dusk Moth: a fat fuzzy dark purple moth with big wings marked with pale crescent moon shapes, sleepy grumpy eyes and feathery antennae",
            "Meteor Tortoise: a stocky gray tortoise whose shell is a cooled meteorite rock with glowing pale-gold cracks, a stern old face",
            "Nightcap Owl: a round dark indigo owl wearing a floppy blue-gray nightcap with a little gold star on the tip, huge yellow eyes, small wings",
            "Comet Ferret: a long slim white ferret with a pale-gold comet-shaped tail that glows, a cheeky grin, fast looking",
            "Eclipse Sentinel: a tall stone guardian statue in a long carved robe holding a tall stone spear, its round face half pale gold and half dark purple like an eclipse, a gold ring halo behind its head, much tougher looking than the others"]},
 'dragonsrest': {
  'bg': "Dragonsrest, a quiet hidden valley where the very first dragons lived: soft flat mossy ground in muted olive and gray-green with a lighter pool in the middle, a huge ancient stone statue of a sleeping dragon's head, worn and covered in moss, at the far left edge, a big round nest of old stones holding three large pale eggs at the far right edge, tall misty cliffs dotted with round cave nests behind, a soft pale violet and teal aurora ribbon across a deep blue evening sky, a large soft pale moon in the upper middle as the light source.",
  'boss': ('ossarion', "Ossarion, the Old Guardian of Dragonsrest, a huge ancient heavy dragon (not in red or gold): a broad low stocky body like a giant tortoise-dragon with thick elephant-like legs, weathered steel-blue-gray armor plates along its back and head, olive-green moss and a few little brown mushrooms growing on the plates, short stubby wings folded on its back, a long white beard and bushy white eyebrows, two thick curved pale horns, glowing pale violet eyes, a grumpy old grandfather scowl", "lunging forward to the right with its huge head lowered like a charging bull, mouth wide open roaring, front foot stomping forward, stubby wings flared"),
  'theme': "a quiet ancient valley where the first dragons lived, full of old steel relics, moss and mold, pale starlight and dark hollows",
  'sheet': ["Wisp Drake: a small floating see-through-looking pale lavender ghost of a baby dragon with tiny wings and a wispy tail, curious face",
            "Rustback Beetle: a big stocky beetle with a dented iron shell covered in orange-brown rust patches, steel-gray legs and big pincers",
            "Moldwing Bat: a round olive-green bat with mottled yellow-olive mold patches and two small brown mushrooms growing on its head",
            "Hush Fox: a slim dark indigo fox with a finger on its lips pose, its fluffy tail tip a round black hole with a pale violet rim, sly eyes",
            "Relic Golem: a small boxy golem of riveted steel plates with one big glowing pale lavender star rune on its chest and stubby arms",
            "Mossback Keeper: a huge old tortoise with a dented steel-plated shell covered in olive moss and mushrooms, carrying a little lantern of pale violet light on a stick, much tougher looking than the others"]},
}

BEHEMOTH = ("a BEHEMOTH, a different kind of dragon from the reference: a huge heavy stocky body low to the ground, four thick strong legs like an elephant's, broad overlapping armor plates along its back, short stubby wings, a short thick neck, a broad blunt head with a heavy jaw and two thick curved horns, and a short thick tail. Strong, solid, calm and steady looking, like a friendly tank.")
STAGES = ("Reading order, left to right, top row then bottom row: 1) HATCHLING: a tiny round baby behemoth, big head and big eyes, tiny wing nubs, about half the length of the elder; "
          "2) JUVENILE: a young behemoth, chunkier, small horns and the first armor plates; 3) ADULT: a full grown behemoth; "
          "4) ELDER: the largest, an old behemoth with long curved horns, heavier armor plates and a few extra spines. Each stage is clearly bigger than the one before.")
GRID = "Arrange them in a grid of 2 columns by 2 rows, evenly spaced. Each one is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped."

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
for z, a in AREAS.items():
    b, desc, pose = a['boss']
    if step == 'idle':
        job(f'bg-{z}', "SUBJECT: a battle backdrop. " + a['bg'] + BD)
        job(f'boss-{b}', "SUBJECT: " + desc + ". " + BOSS)
        job(f'sheet-{z}', sheet(a['theme'], a['sheet']))
    else:
        job(f'boss-{b}-attack', "SUBJECT: the boss in its ATTACK pose: " + pose + "." + SAME, ref=f'v2/out/boss-{b}.png')
        job(f'sheet-{z}-attack', sheet_attack(), ref=f'v2/out/sheet-{z}.png')
if step == 'idle':
    job('behemoth-stages', "SUBJECT: a sheet of the SAME " + BEHEMOTH + " at four life stages. " + GRID + " " + STAGES + " " + KEYS +
        " The SECOND attached image is the existing dragon from the same game: copy its colors, outline and finish exactly, but NOT its body shape (this one is a heavy armored behemoth). " + TAIL, ref='v2/refs/dragon-colors.png')
else:
    job('behemoth-stages-attack', "SUBJECT: the SAME four behemoths as the SECOND attached image, in the same grid of 2 columns by 2 rows, in the same order and at the same sizes, each now in an ATTACK pose: head lowered and thrust forward to the right like a charging bull, mouth wide open roaring, front foot stomping forward, stubby wings flared. Keep each one's exact design, colors and proportions; only the pose changes. " + KEYS + " Inside of the mouth dark maroon with a pink tongue and cream teeth. Do NOT draw any fire, breath, smoke or effects. Each one fully separate with wide green space; none touch. Strict side profile facing RIGHT, full body, nothing cropped. " + TAIL, ref='v2/out/behemoth-stages.png')
print(sorted(f for f in os.listdir('v2/prompts') if any(k in f for k in list(AREAS) + ['vesperax', 'ossarion', 'behemoth'])))
