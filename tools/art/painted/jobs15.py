"""Fifteenth batch (dragons plan chunk 8): Hollow Crown and The Confluence (backdrop, boss, enemy sheet and their attack
poses). The Confluence's creatures are hybrids, each drawn as two elements at once. No map: Beyond the Peak and the Elder
Wilds already paint both. Run from the gen folder: `python3 v2/jobs15.py idle`, generate, then `python3 v2/jobs15.py attack`."""
import os, shutil, sys
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly, so this looks like art from the same game. Do not copy its subject or its colors."
MAPHEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (portrait, about 1024x1536). Do not write code to draw it; generate it with the image tool. The attached image is the STYLE reference only: match its flat two-tone cel shading, simple chunky shapes and friendly look, so this looks like art from the same game. Do not copy its subject."
TAIL = "Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself (use dark, olive or teal greens if something must be green). No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."
os.makedirs('v2/prompts', exist_ok=True); os.makedirs('v2/out', exist_ok=True); os.makedirs('v2/refs', exist_ok=True)

def job(name, body, ref=None, head=HEAD):
    open(f'v2/prompts/{name}.txt', 'w').write(head.format(name=name) + "\n\n" + body + "\n\n" + STYLE + "\n")
    if ref: shutil.copy(f'v2/out/{ref}.png', f'v2/refs/{name}.png')

BOSS = "Strict side profile facing RIGHT, full body, standing on the ground, whole creature inside the frame with a clear margin, nothing cropped. A big imposing boss enemy for a side-view battle: menacing and grumpy but still funny and all-ages. " + TAIL
BD = " COMPOSITION RULES: full-bleed scene to every edge, NO characters or creatures. The bottom quarter of the image is wide, flat, fairly empty ground where fighters will stand: calm and low in detail, with a soft pool of lighter color in the middle; props sit only near the far left and right edges. The middle band of the picture is calmer and lower in contrast than the top, so characters placed on it stand out. One clear light source (sun, moon or glow) sits in the upper middle of the sky. For this background, adapt the style: scenery is flat color shapes with two or three value steps and NO dark ink outlines (outlines are reserved for characters), distant layers lighter and hazier, colors a little softer and less saturated than the reference character. No text, no border."
SAME = " This is the SAME creature as the SECOND attached image: keep its exact design, colors, markings and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole creature inside the frame with a clear margin, nothing cropped. Do NOT draw any impact effects, speed lines, breath or projectiles. " + TAIL

def sheet(theme, items):
    return ("SUBJECT: a sheet of six separate enemy creatures for a side-view battle game, arranged in a grid of 3 columns by 2 rows, evenly spaced. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size (the sixth is the mini-boss: make it look tougher, not larger than its cell). They are grumpy, funny, all-ages creatures from " + theme + ". Reading order, left to right, top row then bottom row:\n"
            + "\n".join(f"{i+1}) {t}." for i, t in enumerate(items)) + "\n" + TAIL)
def sheet_attack(ref):
    return ("SUBJECT: the SAME six creatures as the SECOND attached image, in the same grid of 3 columns by 2 rows, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open, claws, horns, vines or wings thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (spores, sparks, embers) close to their creature. " + TAIL)

AREAS = {
 'hollow-crown': {
  'bg': "Hollow Crown, the grand throne hall of a lost underground kingdom: flat worn gray flagstone floor with a faded purple carpet runner and a lighter pool in the middle, a tall carved stone pillar with an unlit iron torch bracket at the far left edge, a toppled stone statue of a crowned king at the far right edge, huge dim stone arches and cave walls with glittering gem veins fading into deep purple-blue darkness behind, a single shaft of warm golden light falling from a crack in the cave ceiling in the upper middle.",
  'boss': ('hollow-king', "the Hollow King, a huge stone giant king: a heavy body of carved gray stone with a darker slate shadow tone, a long royal robe carved in stone with purple gem buttons, a big gold crown floating above empty shoulders with nothing underneath it except two glowing pale yellow eyes in the dark where a head should be, a stone scepter with a purple gem in one fist, a stern proud bearing", "lunging forward to the right with his stone scepter swung forward, robe swinging, the empty space under his crown glaring, one huge stone foot stomping forward"),
  'theme': "a lost underground stone kingdom",
  'sheet': ["Crown Mole: a chubby dark brown mole with big pink digging claws, tiny eyes and a bottle cap worn as a crown",
            "Lantern Wraith: a small floating pale gray ghost with a wispy tail, holding an old iron lantern that glows with dark purple light",
            "Gemback Armadillo: a stocky gray armadillo whose banded shell is studded with chunky purple, blue and yellow gems",
            "Shadow Jester: the dark purple-black shadow of a court jester, a floppy three-pointed hat with little bells, a wide grin and white eyes",
            "Pillar Knight: a tall suit of gray stone armor with a pillar-shaped helmet and a stone halberd, moss on its shoulders, nobody visible inside",
            "Shadow Chancellor: a tall thin figure made of a long dark purple cloak and a high collar, two white eyes, holding a quill and a scroll, much tougher looking than the others"]},
 'the-confluence': {
  'bg': "The Confluence, a wild shore where lava runs into the sea: flat dark brown volcanic rock shore with steaming cracks and a lighter pool in the middle, a small smoking black rock cone dribbling orange lava at the far left edge, a big pink and orange coral rock with seaweed at the far right edge, a bright blue sea on the right and glowing orange lava rivers on the left meeting in the middle distance in great soft white clouds of steam, hazy volcanoes and sea stacks far behind, a hazy warm sun glowing through the steam in the upper middle.",
  'boss': ('seethe', "Seethe, a huge two-headed sea serpent rising up: a long coiled body that is dark charcoal rock with glowing orange lava cracks on the left half and deep blue scales with a pale aqua belly on the right half, two long necks with two heads facing right, the upper head made of glowing orange-red lava with a fiery crest and the lower head made of blue sea water with a frilly fin crest, wisps of white steam rising where the two halves meet, both heads scowling at each other", "rearing forward to the right with both heads lunging forward together, both mouths wide open, coils tensed, steam puffing from the join"),
  'theme': "a wild shore where fire and water and stone and storm all mix together; every creature is clearly made of TWO elements at once",
  'sheet': ["Scald Puff: a small round cloud of white steam with a kettle's spout and lid, red-hot orange cheeks and an angry face, half fiery and half watery",
            "Magma Crab: a crab with a shell of black cooling rock with glowing orange lava cracks and big stone-gray pincers",
            "Glacier Seal: a round pale blue-gray seal with a small white and icy-blue iceberg growing on its back, sleepy eyes",
            "Monsoon Heron: a tall dripping slate-blue heron with a dark rain cloud above its head and small yellow lightning sparks on its wing tips",
            "Brimstone Newt: a small mustard-yellow newt with orange fire spots and a wisp of yellow-olive smoke curling off its back",
            "Coral Colossus: a big hulking giant made of pink, orange and purple coral and dark gray rock, with tiny fish around it and seaweed draped on its shoulders, much tougher looking than the others"]},
}

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
for z, a in AREAS.items():
    b, desc, pose = a['boss']
    if step == 'idle':
        job(f'bg-{z}', "SUBJECT: a battle backdrop. " + a['bg'] + BD)
        job(f'boss-{b}', "SUBJECT: " + desc + ". " + BOSS)
        job(f'sheet-{z}', sheet(a['theme'], a['sheet']))
    else:
        job(f'boss-{b}-attack', "SUBJECT: the boss in its ATTACK pose: " + pose + "." + SAME, ref=f'boss-{b}')
        job(f'sheet-{z}-attack', sheet_attack(f'sheet-{z}'), ref=f'sheet-{z}')
print(sorted(f for f in os.listdir('v2/prompts') if any(k in f for k in list(AREAS) + ['hollow-king', 'seethe'])))
