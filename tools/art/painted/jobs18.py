"""Eighteenth batch (variety plan V8): Sunpetal Meadow, a low-level side area in The Wilds (backdrop, boss, enemy sheet
and their attack poses) and its map landmark, a sticker drawn under its pin. 6 generations. Run from the gen folder:
`python3 v2/jobs18.py idle`, generate, then `python3 v2/jobs18.py attack`. The landmark uses refs/map-wilds.png."""
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
 'sunpetal-meadow': {
  'bg': "Sunpetal Meadow, a bright sunny meadow of rolling green grass dotted with yellow, white and violet wildflowers, with a lighter sunny pool in the middle of the ground, a big old oak at the far left edge with a huge round golden beehive hanging from a low branch, a short wooden fence and two round hay bales at the far right edge, gentle green hills behind, and a few fluffy dark-gray storm clouds with tiny zigzag lightning far away on the horizon, a big warm sun in the upper middle of a clear blue sky as the light source.",
  'boss': ('thunderhoof', "Thunderhoof, the storm ram of the meadow: a huge burly ram whose thick wool is a dark-gray storm cloud with a few small yellow lightning zigzags crackling in it, two big curled horns of pale gold, a stern face with a white muzzle, sturdy dark hooves, grumpy but funny, all-ages", "rearing forward to the right and charging head-first with horns lowered, mouth open in a bellow, front hoof stamping, storm-cloud wool puffed up"),
  'theme': "a bright sunny meadow full of wildflowers, bees, hay and the odd thundercloud",
  'sheet': ["Buzzbee: a chubby round bee with black and yellow stripes where the yellow stripes are small lightning zigzags, tiny clear wings, a little stinger, cross eyes",
            "Dandelion Hare: a small cream hare with long ears, whose fluffy round tail is a white dandelion puff, cheeky look",
            "Clover Sprite: a tiny leaf-green sprite with four-leaf-clover wings and a clover leaf for a hat, holding a small twig wand",
            "Static Lamb: a small round lamb whose white wool stands straight up with static, tiny blue sparks around it, startled grumpy face",
            "Hay Golem: a little bundle of golden hay shaped like a stout person, tied with rope at the waist, two button eyes and a straw hat",
            "Queen Buzzbee: a large regal bee with black and gold stripes, a small gold crown, a short cape of petals and a bigger stinger, much tougher looking than the others"]},
}

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
    # The map landmark (a sticker drawn under the area's pin on the Wilds map), styled like the map itself.
    job('landmark-sunpetal-meadow', "SUBJECT: one small map landmark for a painted fantasy region map: a little sunny hill covered in yellow and white wildflowers with a big round golden beehive on a short wooden post at its top and two tiny bees, seen from slightly above like the landmarks on a board game map. The SECOND attached image is the map it goes on: match its drawing style, outline, colors and the scale of its landmarks (like the lighthouse or the willow trees) exactly. One single compact landmark, centered, fully separate with wide green space around it, nothing cropped, no ground around it, no path, no text. " + TAIL, ref='v2/refs/map-wilds.png')
print(sorted(f for f in os.listdir('v2/prompts') if 'sunpetal' in f or 'thunderhoof' in f))
