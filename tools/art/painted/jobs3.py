"""Third batch: breath effects per element, and attack poses for bosses and the other enemies. Run from the gen folder."""
import json, os, shutil
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly. Do not copy its subject."
TAIL = "Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself (use dark or olive greens if something must be green). No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."
os.makedirs('v2/refs', exist_ok=True)
def job(name, body, ref=None):
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name) + "\n\n" + body + "\n\n" + STYLE + "\n")
    if ref: shutil.copy(f'v2/out/{ref}.png', f'v2/refs/{name}.png')

job('fx-breath', "SUBJECT: a sheet of eight separate dragon-breath blast effects for a game, arranged in a grid of 4 columns by 2 rows, evenly spaced, each fully separate with wide green space around it; none touch. Each is a compact, roundish burst about the same size, readable when small, with NO dark outline (flat shapes only, two or three tones, brightest at the center). Reading order, left to right, top row first: 1) fire: a puffy fireball of orange and yellow flame tongues with a pale core; 2) frost: a burst of pale blue and white ice shards around a white core; 3) verdant: a swirl of dark green and yellow-olive leaves and a few petals; 4) stone: a cluster of chunky tan and brown rock fragments with dust puffs; 5) storm: a crackling violet and yellow ball of lightning with short forks; 6) tide: a splash of teal and light blue water with droplets and a foamy white center; 7) light: a radiant golden-white starburst with soft rays; 8) shadow: a dark violet and black smoky wisp cloud with a pale lilac edge. " + TAIL)

SAME = " This is the SAME creature as the SECOND attached image: keep its exact design, colors, markings and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole creature inside the frame with a clear margin, nothing cropped. Do NOT draw any impact effects, speed lines, breath or projectiles. " + TAIL
bosses = {
 'bramble-troll': "swinging its spiked club down hard in front of it with both hands, mouth open in a roar",
 'crab-king': "lunging forward with its biggest claw snapping wide open and thrust far out in front, eyes glaring",
 'magma-wyrm': "striking forward like a snake, neck stretched out and low, jaws wide open dripping lava",
 'storm-roc': "diving forward with wings swept up and back, talons thrust out in front, beak open in a screech",
 'glacier-hydra': "all three heads lunging forward with jaws wide open, necks stretched out, front leg stepping forward",
 'iron-golem': "throwing a huge forward punch with one fist fully extended in front, other arm pulled back, eye slit blazing",
 'eclipse-dragon': "lunging forward with the neck stretched out and low, jaws wide open roaring, wings flared up and back",
}
for k, v in bosses.items():
    job(f'boss-{k}-attack', f"SUBJECT: the boss in its ATTACK pose: {v}." + SAME, ref=f'boss-{k}')

zones = json.load(open('v2/zones.json'))
for z in zones:
    job(f'sheet-{z}-attack', "SUBJECT: the SAME six creatures as the SECOND attached image, in the same grid of 3 columns by 2 rows, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open or weapon, claw, beak or horn thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (sparks, puffs, dust) close to their creature. " + TAIL, ref=f'sheet-{z}')
print(sorted(f for f in os.listdir('v2/prompts') if 'attack' in f or 'breath' in f))
