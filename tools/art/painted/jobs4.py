"""Fourth batch: Whispering Fen (world plan W1). Backdrop, boss, enemy sheet, and their attack poses.
Run from the gen folder in two steps: `python3 v2/jobs4.py idle`, generate those, then `python3 v2/jobs4.py attack`
(the attack prompts attach the idle images as a second reference)."""
import os, shutil, sys
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly, so this looks like art from the same game. Do not copy its subject or its colors."
TAIL = "Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself (use dark, olive or teal greens if something must be green). No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."
os.makedirs('v2/prompts', exist_ok=True); os.makedirs('v2/out', exist_ok=True); os.makedirs('v2/refs', exist_ok=True)

def job(name, body, ref=None):
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name) + "\n\n" + body + "\n\n" + STYLE + "\n")
    if ref: shutil.copy(f'v2/out/{ref}.png', f'v2/refs/{name}.png')

BOSS = "Strict side profile facing RIGHT, full body, standing on the ground, whole creature inside the frame with a clear margin, nothing cropped. A big imposing boss enemy for a side-view battle: menacing and grumpy but still funny and all-ages. " + TAIL
WILLOW = "the Whisperwillow, an ancient walking willow tree spirit who drinks the marsh dry and complains about it. A huge hunched willow tree with a thick dark brown gnarled trunk that forms a grumpy face (heavy bark brows, two glowing pale-yellow eyes, a wide frowning mouth), long drooping curtains of dark olive and teal willow branches hanging like hair and arms, two thick root legs, a few pale lily flowers and dripping water drops on the branches"

SHEET = ["Murk Toad: a fat muddy-brown and teal toad with a pale belly, half sunk in a little puddle of mud on its back, wide grumpy mouth, sleepy half-closed eyes",
         "Will-o'-Whisper: a small floating old lantern with a pale yellow and soft teal glowing flame face inside it, tiny wispy arms, mysterious sly smile, a few drifting pale motes",
         "Reed Stalker: a tall thin heron-like marsh bird with blue-gray feathers, long yellow legs, a long spear-like beak, holding a cattail reed in front of itself as a very bad disguise",
         "Bogling: a small round mud goblin made of dark brown mud with big ears, a toothy mischievous grin, mossy olive tufts on its head, dripping mud",
         "Lily Snapper: a snapping turtle with a dark teal-green shell and a big olive lily pad worn on its back like a hat, a single pink lily flower on the pad, proud snapping jaw",
         "Old Croaker: a huge old dark olive and teal toad, much tougher looking than the others: warty back, droopy wise eyes with bags, a lily-flower crown, a gnarled walking stick held in one front leg"]
SHEET_BODY = "SUBJECT: a sheet of six separate enemy creatures for a side-view battle game, arranged in a grid of 3 columns by 2 rows, evenly spaced. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size (the sixth is the mini-boss: make it look tougher, not larger than its cell). They are grumpy, funny, all-ages monsters from a foggy marsh. Reading order, left to right, top row then bottom row:\n" + "\n".join(f"{i+1}) {t}." for i, t in enumerate(SHEET)) + "\n" + TAIL

BD = " COMPOSITION RULES: full-bleed scene to every edge, NO characters or creatures. The bottom quarter of the image is wide, flat, fairly empty ground where fighters will stand: calm and low in detail, with a soft pool of lighter color in the middle; props sit only near the far left and right edges. The middle band of the picture is calmer and lower in contrast than the top, so characters placed on it stand out. One clear light source (sun, moon or glow) sits in the upper middle of the sky. For this background, adapt the style: scenery is flat color shapes with two or three value steps and NO dark ink outlines (outlines are reserved for characters), distant layers lighter and hazier, colors a little softer and less saturated than the reference character. No text, no border."
FEN = "Whispering Fen, a foggy marsh at twilight: a flat mossy boardwalk and damp grassy ground in the foreground, still dark teal water with lily pads and reeds at the left and right edges, twisted willow trees drooping at the far edges, layers of soft pale fog and distant misty trees behind, a pale round moon glowing through the fog in the upper middle, a few small pale yellow wisp lights floating in the distance."

SAME = " This is the SAME creature as the SECOND attached image: keep its exact design, colors, markings and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole creature inside the frame with a clear margin, nothing cropped. Do NOT draw any impact effects, speed lines, breath or projectiles. " + TAIL

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
if step == 'idle':
    job('bg-whispering-fen', "SUBJECT: a battle backdrop. " + FEN + BD)
    job('boss-whisperwillow', "SUBJECT: " + WILLOW + ". " + BOSS)
    job('sheet-whispering-fen', SHEET_BODY)
else:
    job('boss-whisperwillow-attack', "SUBJECT: the boss in its ATTACK pose: lurching forward with two long branch arms whipping out in front, roots stepping forward, mouth wide open in a creaky roar." + SAME, ref='boss-whisperwillow')
    job('sheet-whispering-fen-attack', "SUBJECT: the SAME six creatures as the SECOND attached image, in the same grid of 3 columns by 2 rows, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open, tongue, beak, claw or stick thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (motes, mud drips) close to their creature. " + TAIL, ref='sheet-whispering-fen')
print(sorted(os.listdir('v2/prompts')))
