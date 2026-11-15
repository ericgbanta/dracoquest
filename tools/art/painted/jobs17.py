"""Seventeenth batch (variety plan V7): three more regular enemies for each of the first four zones, one sheet of three
per zone, then its attack sheet. 8 generations. Run from the gen folder: `python3 v2/jobs17.py idle`, generate, then
`python3 v2/jobs17.py attack` and generate again. pack.py packs `sheet-<zone>-more` with the ids in v2/zones.json `more`."""
import os, shutil, sys
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly, so this looks like art from the same game. Do not copy its subject or its colors unless told to."
TAIL = "Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself (use dark, olive or teal greens if something must be green). No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."
os.makedirs('v2/prompts', exist_ok=True); os.makedirs('v2/out', exist_ok=True); os.makedirs('v2/refs', exist_ok=True)

def job(name, body, ref=None):
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name) + "\n\n" + body + "\n\n" + STYLE + "\n")
    if ref: shutil.copy(ref, f'v2/refs/{name}.png')

def sheet(theme, items):
    return ("SUBJECT: a sheet of three separate enemy creatures for a side-view battle game, in one row of 3, evenly spaced across the image. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size. They are grumpy, funny, all-ages creatures from " + theme + ". Left to right:\n"
            + "\n".join(f"{i+1}) {t}." for i, t in enumerate(items)) + "\n" + TAIL)
def sheet_attack():
    return ("SUBJECT: the SAME three creatures as the SECOND attached image, in the same single row of 3, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open, claws, fins, beaks or weapons thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (sparks, spores, bubbles) close to their creature. " + TAIL)

AREAS = {
 'mossy-hollow': ("a soft mossy forest hollow full of ferns, mushrooms and puddles", [
   "Acorn Knight: a small round brown beetle standing on its back legs, wearing an acorn cap as a helmet and holding a twig as a lance, very serious little face",
   "Toadstool Tumbler: a chubby mushroom creature with a big dark red cap with cream spots, stubby legs and arms, cheeks puffed out, ready to bounce",
   "Puddle Newt: a small slick blue newt with a big lily pad on its head like a hat, a curly tail and a smug grin"]),
 'saltmarsh-shore': ("a sandy salt marsh beach with tide pools and seashells", [
   "Teacup Hermit: a grumpy hermit crab living in a big chipped white teacup instead of a shell, one big claw raised",
   "Spiny Puffer: a round pale yellow pufferfish covered in short spines, hopping on its fins, wearing a little blue bandana",
   "Zap Jelly: a floating pale purple jellyfish with a round bell, short wavy tentacles and small zigzag lightning marks on its bell, annoyed eyes"]),
 'whispering-fen': ("a misty swamp fen with reeds, lily pads and will-o-wisps", [
   "Fog Heron: a tall thin gray-blue heron with long legs and a long sharp beak, a wisp of pale fog curling around its neck, haughty look",
   "Croak Shaman: a stout olive frog standing upright in a cloak of big leaves, holding a crooked reed staff with a small glowing teal bead on top",
   "Peat Golem: a small lumpy golem made of dark brown peat bricks and tangled roots, with two small glowing amber eyes and a sprout on its head"]),
 'cinder-pass': ("a volcanic mountain pass with ash, cooled lava rock and hot vents", [
   "Magma Snail: a big slow snail with a dark gray body and a shell shaped like a tiny volcano with glowing orange lava cracks, sleepy cranky face",
   "Soot Mole: a chunky dark gray mole covered in soot, wearing tiny round goggles and holding a small chimney sweep brush",
   "Storm Crow: a scruffy black crow with ruffled feathers and small bright yellow zigzag lightning marks on its wings, mean beady eyes"]),
}

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
for z, (theme, items) in AREAS.items():
    if step == 'idle': job(f'sheet-{z}-more', sheet(theme, items))
    else: job(f'sheet-{z}-more-attack', sheet_attack(), ref=f'v2/out/sheet-{z}-more.png')
print(sorted(f for f in os.listdir('v2/prompts') if f.endswith('-more.txt') or f.endswith('-more-attack.txt')))
