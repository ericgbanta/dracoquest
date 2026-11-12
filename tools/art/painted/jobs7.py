"""Seventh batch: Gilded Wastes (world plan W4). Backdrop, boss, enemy sheet, and their attack poses.
Run from the gen folder in two steps: `python3 v2/jobs7.py idle`, generate those, then `python3 v2/jobs7.py attack`
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
BASILISK = "the Aurum Basilisk, a huge golden basilisk lizard-serpent that guards a desert treasure vault: a long heavy body with four short powerful legs, scales of rich gold with a warm bronze shadow tone and a pale cream belly, a big crested head with a tall golden crown-like frill, two huge glowing amber eyes, a few sapphire-blue gems set in its frill, a thick tail curling behind it, a smug greedy expression"

SHEET = ["Sand Scarab: a chunky beetle with a shiny gold shell and a dark bronze underside, a single curved horn, pushing a small ball of sand behind it, determined face",
         "Mirage Jackal: a lean sandy-gold jackal with big pointed ears, a pale cream chest, a sly grin, and a faint shimmering pale outline doubling its tail like a heat haze",
         "Glimmer Lizard: a small round desert lizard with pale yellow scales and glowing white sparkle spots on its back, a little frill, eyes half closed blissfully sunbathing",
         "Dune Sentinel: a short blocky sandstone statue warrior in tan and terracotta with a jackal-head helmet, holding a stone shield, sand trickling from its shoulders, glowing pale blue eyes",
         "Treasure Mimic: a wooden treasure chest with gold trim and a gold lock, lid open like a mouth showing big teeth and a long purple tongue, coins spilling out, on four stubby wooden legs",
         "Riddle Sphinx: a regal sphinx with a lion body in golden sand color, two feathered wings, a pharaoh-style striped headdress in blue and gold, a smug knowing smile, sitting tall, much tougher looking than the others"]
SHEET_BODY = "SUBJECT: a sheet of six separate enemy creatures for a side-view battle game, arranged in a grid of 3 columns by 2 rows, evenly spaced. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size (the sixth is the mini-boss: make it look tougher, not larger than its cell). They are grumpy, funny, all-ages creatures from a glittering treasure desert. Reading order, left to right, top row then bottom row:\n" + "\n".join(f"{i+1}) {t}." for i, t in enumerate(SHEET)) + "\n" + TAIL

BD = " COMPOSITION RULES: full-bleed scene to every edge, NO characters or creatures. The bottom quarter of the image is wide, flat, fairly empty ground where fighters will stand: calm and low in detail, with a soft pool of lighter color in the middle; props sit only near the far left and right edges. The middle band of the picture is calmer and lower in contrast than the top, so characters placed on it stand out. One clear light source (sun, moon or glow) sits in the upper middle of the sky. For this background, adapt the style: scenery is flat color shapes with two or three value steps and NO dark ink outlines (outlines are reserved for characters), distant layers lighter and hazier, colors a little softer and less saturated than the reference character. No text, no border."
DESERT = "the Gilded Wastes, a golden treasure desert at midday: flat pale gold sand ground with a lighter pool in the middle and a few glittering specks, a half-buried sandstone pillar with a jackal head carving and a small pile of gold coins at the far left edge, a tilted sandstone obelisk and a lone palm tree at the far right edge, rolling golden dunes and a distant pyramid-like ruin fading into warm haze behind, a big bright white-gold sun in the upper middle of a pale turquoise sky."

SAME = " This is the SAME creature as the SECOND attached image: keep its exact design, colors, markings and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole creature inside the frame with a clear margin, nothing cropped. Do NOT draw any impact effects, speed lines, breath or projectiles. " + TAIL

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
if step == 'idle':
    job('bg-gilded-wastes', "SUBJECT: a battle backdrop. " + DESERT + BD)
    job('boss-aurum-basilisk', "SUBJECT: " + BASILISK + ". " + BOSS)
    job('sheet-gilded-wastes', SHEET_BODY)
else:
    job('boss-aurum-basilisk-attack', "SUBJECT: the boss in its ATTACK pose: lunging forward with its head low and thrust out to the right, jaws wide open, frill fully flared, eyes blazing, front legs stepping forward." + SAME, ref='boss-aurum-basilisk')
    job('sheet-gilded-wastes-attack', "SUBJECT: the SAME six creatures as the SECOND attached image, in the same grid of 3 columns by 2 rows, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open, horn, jaws, shield, lid or paws thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (sand, coins, sparkles) close to their creature. " + TAIL, ref='sheet-gilded-wastes')
print(sorted(os.listdir('v2/prompts')))
