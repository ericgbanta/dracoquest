"""Sixth batch: Moonwell Woods (world plan W3). Backdrop, boss, enemy sheet, and their attack poses.
Run from the gen folder in two steps: `python3 v2/jobs6.py idle`, generate those, then `python3 v2/jobs6.py attack`
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
WYRM = "the Moonwell Wyrm, a long wingless serpent-dragon made of night sky that lives in a glowing well and steals dreams. Its body is deep midnight blue and violet with small white star speckles and a pale silver-blue belly, coiled with its front half rising up, a slender dragon head with long swept-back pale silver horns like crescent moons, sleepy-sly glowing pale blue eyes, a wispy silver mane, a few frosty pale blue crystals along its back ridge"

SHEET = ["Hoot Shade: an owl made of night shadow, deep indigo-violet feathers with a pale lilac face disc, huge round glowing pale yellow eyes, small tufted ears, perched upright, spooky but cute",
         "Frostcap Shroom: a stout mushroom creature with a big pale icy-blue glowing cap with white frost spots, a cream stem body with a grumpy little face, stubby feet, a few tiny ice crystals",
         "Snickerbark: a small walking tree stump in dark bark with two twig arms, a carved-looking face giggling wickedly, a few dark violet leaves on top, little root feet",
         "Shadow Fox: a slim fox made of dark violet shadow with a long fluffy pale silver moonlit tail and pale ear tips, sly grin, a striped sock dangling from its mouth",
         "Rimeback Badger: a stocky grumpy badger with a white face stripe and pale icy-blue frosty fur on its back with a few small ice spikes, big digging claws, very bad mood",
         "Duskhorn: a great proud stag in deep indigo with a pale silver chest, huge branching antlers with small glowing white stars caught in them, calm stern eyes, standing tall, much tougher looking than the others"]
SHEET_BODY = "SUBJECT: a sheet of six separate enemy creatures for a side-view battle game, arranged in a grid of 3 columns by 2 rows, evenly spaced. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size (the sixth is the mini-boss: make it look tougher, not larger than its cell). They are grumpy, funny, all-ages creatures from a magical forest at night. Reading order, left to right, top row then bottom row:\n" + "\n".join(f"{i+1}) {t}." for i, t in enumerate(SHEET)) + "\n" + TAIL

BD = " COMPOSITION RULES: full-bleed scene to every edge, NO characters or creatures. The bottom quarter of the image is wide, flat, fairly empty ground where fighters will stand: calm and low in detail, with a soft pool of lighter color in the middle; props sit only near the far left and right edges. The middle band of the picture is calmer and lower in contrast than the top, so characters placed on it stand out. One clear light source (sun, moon or glow) sits in the upper middle of the sky. For this background, adapt the style: scenery is flat color shapes with two or three value steps and NO dark ink outlines (outlines are reserved for characters), distant layers lighter and hazier, colors a little softer and less saturated than the reference character. No text, no border."
WOODS = "Moonwell Woods, a magical forest clearing at night: a soft mossy blue-green ground with a pale pool of moonlight in the middle, tall dark blue-violet tree trunks framing the far left and right, a small round stone well glowing pale blue at the far right edge, a few hanging paper lanterns glowing warm yellow on branches at the left edge, layers of misty blue trees fading behind, a big pale full moon in the upper middle of a deep indigo sky with a few stars, small glowing fireflies."

SAME = " This is the SAME creature as the SECOND attached image: keep its exact design, colors, markings and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole creature inside the frame with a clear margin, nothing cropped. Do NOT draw any impact effects, speed lines, breath or projectiles. " + TAIL

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
if step == 'idle':
    job('bg-moonwell-woods', "SUBJECT: a battle backdrop. " + WOODS + BD)
    job('boss-moonwell-wyrm', "SUBJECT: " + WYRM + ". " + BOSS)
    job('sheet-moonwell-woods', SHEET_BODY)
else:
    job('boss-moonwell-wyrm-attack', "SUBJECT: the boss in its ATTACK pose: striking forward like a snake, neck stretched out and low toward the right, jaws wide open, eyes blazing, mane streaming back." + SAME, ref='boss-moonwell-wyrm')
    job('sheet-moonwell-woods-attack', "SUBJECT: the SAME six creatures as the SECOND attached image, in the same grid of 3 columns by 2 rows, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open, talons, cap, branch arms, jaws, claws or antlers thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (stars, frost sparkles) close to their creature. " + TAIL, ref='sheet-moonwell-woods')
print(sorted(os.listdir('v2/prompts')))
