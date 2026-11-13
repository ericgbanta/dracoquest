"""Fourteenth batch (dragons plan chunk 7): Skyreach Isles and Twilight Rift (backdrop, boss, enemy sheet and their
attack poses). No map: Beyond the Peak and the Elder Wilds already paint both. Run from the gen folder:
`python3 v2/jobs14.py idle`, generate, then `python3 v2/jobs14.py attack`."""
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
 'skyreach-isles': {
  'bg': "Skyreach Isles, floating islands high above the clouds on a bright windy day: the bottom quarter is the flat grassy top of a floating island in soft olive and sandy tones with a lighter pool in the middle, a small white lighthouse on a rocky outcrop at the far left edge, a wooden dock post with a rolled sail and rope at the far right edge, several small floating islands with waterfalls spilling off their edges drifting in the pale blue sky behind, fluffy white clouds below and between them, a big warm golden sun in the upper middle with soft rays.",
  'boss': ('aurelith', "Aurelith, a huge friendly-grumpy sky whale swimming through the air: a long rounded body in deep slate blue with a pale cream belly with grooves, a big tail fluke, long flippers like wings, small golden-yellow lightning marks along her sides, a little grassy floating island with two tiny trees sitting on her back, wisps of white cloud trailing from her, a tired grumpy eye", "surging forward to the right with her huge mouth wide open, tail fluke curled up behind, flippers swept forward, little yellow sparks crackling along her sides"),
  'theme': "floating islands of sun and wind high above the clouds",
  'sheet': ["Gust Sprite: a small swirling whirlwind of pale blue-white air with two cheeky eyes, wearing a stack of three stolen hats",
            "Sunwing Moth: a big fluffy moth with wide warm golden-yellow wings with pale cream eye spots and a fuzzy white body",
            "Cloud Ram: a stocky ram whose fleece is a dark gray thundercloud with small yellow lightning flickers, curled cream horns",
            "Prism Hawk: a sleek hawk with pale white and soft pink feathers that shine like glass, a gold hooked beak and sharp eyes",
            "Sky Eel: a long slim eel in deep purple-blue with a pale yellow belly and little fins like wings, small sparks along its back",
            "Sunscale Griffin: a proud griffin with a golden eagle head and wings and a cream lion body, a fluffy chest, much tougher looking than the others"]},
 'twilight-rift': {
  'bg': "Twilight Rift, a crack in the world at dusk where starlight and emptiness meet: flat dusky violet rocky ground with a few glowing pink crystal pebbles and a lighter pool in the middle, a tall leaning stone pillar wrapped in pink starlight at the far left edge, a small broken stone archway at the far right edge, a huge jagged tear in the sky behind, its left side full of pink and gold stars and its right side a deep indigo nothing, floating rocks drifting near the tear, a soft pale lilac glow in the upper middle.",
  'boss': ('nyxaris', "Nyxaris, a huge ancient dragon of starlight and nothing: a deep indigo body with a lighter lavender shadow tone, a pale pink belly, small pink and gold stars speckled on her scales, two long swept-back cream horns, big wings with membranes like a starry night sky, a long tail ending in a little crescent moon shape, calm glowing pale pink eyes, an old stern expression", "rearing forward to the right with her neck stretched out low, jaws wide open, starry wings flared up high, front claws reaching forward"),
  'theme': "a crack in the sky where starlight and emptiness meet",
  'sheet': ["Star Mote: a tiny round fallen star in warm gold with five stubby points, two cross little eyes and a small sparkle trail",
            "Null Hound: a dog-shaped silhouette of deep indigo nothing with a pale lilac outline glow, two white eyes and a wagging tail",
            "Comet Lizard: a slim fast lizard in pale pink with a long streaming tail of gold sparkles behind it",
            "Empty Coat: a long floating dark purple coat with a high collar and nobody inside, two white eyes glowing in the empty collar, empty sleeves raised",
            "Orbit Jelly: a floating round jellyfish in soft lavender with trailing tentacles and three tiny pale moons circling it",
            "Gloam Stalker: a big prowling panther made of deep indigo darkness with a faint starry sheen, glowing pale pink eyes, much tougher looking than the others"]},
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
print(sorted(f for f in os.listdir('v2/prompts') if any(k in f for k in list(AREAS) + ['aurelith', 'nyxaris'])))
