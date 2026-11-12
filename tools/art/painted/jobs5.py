"""Fifth batch: Rustcliff Ruins (world plan W2). Backdrop, boss, enemy sheet, and their attack poses.
Run from the gen folder in two steps: `python3 v2/jobs5.py idle`, generate those, then `python3 v2/jobs5.py attack`
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
COLOSSUS = "the Cinderforge Colossus, the last guardian of a ruined fortress, a huge hulking stone giant built from weathered gray-tan fortress blocks held together with old brass bands and rivets, a square head with a cracked visor and two glowing orange eyes, an open iron furnace grate in its chest with orange-yellow fire glowing behind it, massive blocky stone fists, short thick legs, a little moss and a few ivy leaves on its shoulders, small puffs of smoke from its shoulder vents"

SHEET = ["Cog Crawler: a small clockwork beetle with a round brass shell made of gears, six thin metal legs, a big turning key on its back, one grumpy glowing amber eye",
         "Brass Sentry: a short old guard robot made of dented brass and bronze with a round helmet head and a slit visor, holding a long spear upright, very stiff polite posture, a patch of rust on one shoulder",
         "Boiler Bot: a round little copper boiler on two stubby legs, a tall whistle chimney on top puffing a small white steam cloud, a pressure gauge for a face with an angry needle, two small clamp hands",
         "Spark Hound: a clockwork dog made of dark iron plates and brass joints, a glowing orange coal visible in its chest grill, floppy metal ears, wagging gear tail, happy tongue made of copper",
         "Gargoyle Pup: a small chubby stone gargoyle in warm gray stone with stubby bat wings, little horns, a grumpy just-woke-up face, crouched on all fours, a few cracks and a tuft of moss",
         "Captain Clank: a tall old knight automaton in dented steel and brass armor with a plumed helmet (faded red plume), a big round shield with a worn crest, a halberd held proudly, mid-salute with one hand, much tougher looking than the others"]
SHEET_BODY = "SUBJECT: a sheet of six separate enemy creatures for a side-view battle game, arranged in a grid of 3 columns by 2 rows, evenly spaced. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size (the sixth is the mini-boss: make it look tougher, not larger than its cell). They are grumpy, funny, all-ages monsters from an old ruined fortress full of clockwork machines. Reading order, left to right, top row then bottom row:\n" + "\n".join(f"{i+1}) {t}." for i, t in enumerate(SHEET)) + "\n" + TAIL

BD = " COMPOSITION RULES: full-bleed scene to every edge, NO characters or creatures. The bottom quarter of the image is wide, flat, fairly empty ground where fighters will stand: calm and low in detail, with a soft pool of lighter color in the middle; props sit only near the far left and right edges. The middle band of the picture is calmer and lower in contrast than the top, so characters placed on it stand out. One clear light source (sun, moon or glow) sits in the upper middle of the sky. For this background, adapt the style: scenery is flat color shapes with two or three value steps and NO dark ink outlines (outlines are reserved for characters), distant layers lighter and hazier, colors a little softer and less saturated than the reference character. No text, no border."
RUINS = "Rustcliff Ruins, a ruined stone fortress on a cliff at golden late afternoon: a cracked flagstone courtyard as the ground, a broken stone archway and a toppled brass gear the size of a door at the left edge, a crumbling wall with a rusty old cannon and a few ivy vines at the right edge, distant broken towers and battlements fading into warm haze behind, a big soft orange sun low in the upper middle, a few birds."

SAME = " This is the SAME creature as the SECOND attached image: keep its exact design, colors, markings and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole creature inside the frame with a clear margin, nothing cropped. Do NOT draw any impact effects, speed lines, breath or projectiles. " + TAIL

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
if step == 'idle':
    job('bg-rustcliff-ruins', "SUBJECT: a battle backdrop. " + RUINS + BD)
    job('boss-cinderforge-colossus', "SUBJECT: " + COLOSSUS + ". " + BOSS)
    job('sheet-rustcliff-ruins', SHEET_BODY)
else:
    job('boss-cinderforge-colossus-attack', "SUBJECT: the boss in its ATTACK pose: throwing a huge forward punch with one stone fist fully extended in front, the other arm pulled back, leaning into it, furnace blazing brighter, eyes glaring." + SAME, ref='boss-cinderforge-colossus')
    job('sheet-rustcliff-ruins-attack', "SUBJECT: the SAME six creatures as the SECOND attached image, in the same grid of 3 columns by 2 rows, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open, spear, claw, fist, jaws or halberd thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (steam puffs, sparks) close to their creature. " + TAIL, ref='sheet-rustcliff-ruins')
print(sorted(os.listdir('v2/prompts')))
