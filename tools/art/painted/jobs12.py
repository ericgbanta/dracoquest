"""Twelfth batch: Sunken Spires (world plan W5, dragons plan chunk 4). Backdrop, boss, enemy sheet, and their attack poses.
Run from the gen folder in two steps: `python3 v2/jobs12.py idle`, generate those, then `python3 v2/jobs12.py attack`
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
TIDELORD = "the Tidelord, a huge proud sea-serpent king rising from the water on a coiled body: deep teal scales with a darker blue-green shadow tone and a pale aqua belly, a big fin-crested head with a crown of pink and white coral, long whiskers, glowing pale yellow eyes, small clawed front arms, and a long tail ending in a three-pronged trident fin, a haughty royal expression"

SHEET = ["Reef Stalker: a long sleek eel in dark teal with a pale belly and a small glowing lantern dangling from its head, toothy grin",
         "Storm Gull: a big scruffy white and gray seagull with crackling yellow sparks on its wingtips and a stolen fish in its beak, a rude stare",
         "Barnacle Brute: a hulking crab-like creature made of pale sea stone covered in barnacles and little seaweed tufts, one giant claw, grumpy",
         "Squall Sprite: a small round gray storm cloud with stubby arms, a scowl, and a tiny zigzag lightning tail, raindrops under it",
         "Drowned Sentry: a short waterlogged stone knight statue with a cracked helmet, seaweed hanging off it, holding a barnacled spear, glowing teal eyes",
         "Thunder Ray: a big manta ray in dark slate blue with a pale belly and glowing yellow lightning stripes along its wings, swooping, much tougher looking than the others"]
SHEET_BODY = "SUBJECT: a sheet of six separate enemy creatures for a side-view battle game, arranged in a grid of 3 columns by 2 rows, evenly spaced. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size (the sixth is the mini-boss: make it look tougher, not larger than its cell). They are grumpy, funny, all-ages creatures from a drowned city of storms. Reading order, left to right, top row then bottom row:\n" + "\n".join(f"{i+1}) {t}." for i, t in enumerate(SHEET)) + "\n" + TAIL

BD = " COMPOSITION RULES: full-bleed scene to every edge, NO characters or creatures. The bottom quarter of the image is wide, flat, fairly empty ground where fighters will stand: calm and low in detail, with a soft pool of lighter color in the middle; props sit only near the far left and right edges. The middle band of the picture is calmer and lower in contrast than the top, so characters placed on it stand out. One clear light source (sun, moon or glow) sits in the upper middle of the sky. For this background, adapt the style: scenery is flat color shapes with two or three value steps and NO dark ink outlines (outlines are reserved for characters), distant layers lighter and hazier, colors a little softer and less saturated than the reference character. No text, no border."
SPIRES = "the Sunken Spires, a drowned city in a storm: a flat wet pale stone plaza with shallow puddles and a lighter pool in the middle as the ground, a broken stone archway half under water at the far left edge, a leaning pale stone tower with a teal domed roof at the far right edge, more drowned towers rising out of a dark teal sea in the distance fading into rainy haze, dark blue-gray storm clouds with a bright pale moon breaking through in the upper middle and a thin lightning bolt off to one side."

SAME = " This is the SAME creature as the SECOND attached image: keep its exact design, colors, markings and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole creature inside the frame with a clear margin, nothing cropped. Do NOT draw any impact effects, speed lines, breath or projectiles. " + TAIL

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
if step == 'idle':
    job('bg-sunken-spires', "SUBJECT: a battle backdrop. " + SPIRES + BD)
    job('boss-tidelord', "SUBJECT: " + TIDELORD + ". " + BOSS)
    job('sheet-sunken-spires', SHEET_BODY)
else:
    job('boss-tidelord-attack', "SUBJECT: the boss in its ATTACK pose: rearing up and lunging its head forward to the right, jaws wide open, fin crest flared, eyes blazing, claws reaching forward." + SAME, ref='boss-tidelord')
    job('sheet-sunken-spires-attack', "SUBJECT: the SAME six creatures as the SECOND attached image, in the same grid of 3 columns by 2 rows, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open, horn, jaws, shield, claws, beak or wings thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (sparks, raindrops, seaweed) close to their creature. " + TAIL, ref='sheet-sunken-spires')
print(sorted(os.listdir('v2/prompts')))
