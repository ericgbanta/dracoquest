"""Thirteenth batch (dragons plan chunks 5 and 6): Rotroot Thicket, Emberwild and The Steelspine Range (backdrop, boss,
enemy sheet and their attack poses) and the Elder Wilds region map. Run from the gen folder:
`python3 v2/jobs13.py idle`, generate, then `python3 v2/jobs13.py attack`."""
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
 'rotroot-thicket': {
  'bg': "Rotroot Thicket, a sick swampy forest at dusk: flat damp dark-olive ground with a few murky puddles and a lighter pool in the middle, a huge twisted hollow tree with purple mushrooms at the far left edge, a fallen rotting log with drooping moss at the far right edge, twisted dark trees with hanging moss fading into a murky yellow-olive haze behind, a dim sickly yellow sun glowing through the haze in the upper middle.",
  'boss': ('rotroot-queen', "the Rotroot Queen, a huge gnarled hollow tree-beast that walks on thick twisted roots: dark brown bark with an olive shadow tone, a hollow face in the trunk with two glowing sickly yellow eyes and a wide grumpy mouth, branches like antlers draped with olive moss, clusters of purple mushrooms growing on her shoulders, drips of olive sap", "leaning forward with her branch-arms reaching out to the right, hollow mouth wide open, roots stepping forward, eyes blazing"),
  'theme': "a sick swampy forest where the plants are rotting",
  'sheet': ["Rot Grub: a fat round larva in murky olive with purple spots and a little drooling mouth, very pleased with itself",
            "Thornvine Creeper: a walking bundle of dark green twisted vines with sharp cream thorns and two beady yellow eyes, no face otherwise",
            "Spore Toad: a lumpy mustard-and-olive toad with a cluster of purple spore pods on its back, puffing its cheeks",
            "Mire Lurker: a low swamp crocodile in dark teal covered in olive moss, a long snout, lazy half-closed eyes",
            "Gloomcap Walker: a tall purple mushroom with a pale stalk, little root legs and two grumpy eyes under its cap",
            "Rotwood Ent: a hulking sickly tree giant with a mossy olive bark body, glowing yellow eyes and branch fists, much tougher looking than the others"]},
 'emberwild': {
  'bg': "Emberwild, a volcanic jungle at sunset: flat warm brown jungle floor with glowing orange cracks and a lighter pool in the middle, a big red-leafed jungle tree with hanging vines at the far left edge, a smoking stone vent and broad dark-teal leaves at the far right edge, a dense jungle of red, orange and dark teal leaves fading into smoky haze behind, a volcano with a soft orange glow in the distance, a big low orange sun in the upper middle.",
  'boss': ('volcanadon', "Volcanadon, a huge armored four-legged dinosaur with a small smoking volcano growing out of its back: dark charcoal rock-plated hide with orange glowing seams, a heavy horned head with a beak, a thick clubbed tail, tufts of dark teal jungle plants growing between the plates, a stubborn grumpy face", "lunging forward to the right with its head low, beak wide open, the volcano on its back puffing, front legs stomping forward"),
  'theme': "a volcanic jungle of red leaves and glowing rivers",
  'sheet': ["Cinder Monkey: a cheeky orange monkey with a tail that burns like a little torch at the tip and sooty gray hands",
            "Flame Lily: a big snapping carnivorous flower with fiery orange and red petals, a teal stalk with leaves and a toothy mouth in the middle",
            "Magma Tortoise: a stocky tortoise whose shell is dark rock with glowing orange cracks, slow and grumpy",
            "Jungle Raptor: a small fast dinosaur in dark teal with orange stripes and a feathery crest, sharp grin",
            "Ember Parrot: a loud red and yellow parrot with glowing ember-orange wing tips and a curved black beak",
            "Vine Tyrant: a big jungle gorilla in dark brown fur wrapped in teal vines with red leaves, huge fists, much tougher looking than the others"]},
 'steelspine-range': {
  'bg': "The Steelspine Range, iron mountains in a thunderstorm: flat dark slate-gray rock ground with a few iron nuggets and a lighter pool in the middle, a jagged iron-gray rock spire with a metal lightning rod at the far left edge, a rusty old metal bridge post at the far right edge, tall sharp blue-gray mountain ridges like a steel spine fading into rainy haze behind, dark storm clouds with a bright yellow lightning-lit gap glowing in the upper middle.",
  'boss': ('ferrovane', "Ferrovane, a huge old dragon with scales of polished steel: blue-gray metal plates with a darker steel shadow tone, rivets along its neck, two tall horns like lightning rods with yellow sparks crackling at the tips, big folded metal-ribbed wings, glowing pale yellow eyes, a heavy armored tail, a proud stern expression", "rearing forward to the right with its neck stretched out low, jaws wide open, metal wings flared up, sparks crackling on its horns, front claws reaching forward"),
  'theme': "iron mountains where lightning strikes every few seconds",
  'sheet': ["Rivet Beetle: a round beetle with a shiny steel shell held together with big rivets and two small horn prongs",
            "Thunder Hound: a lean dog in dark purple-gray fur with a yellow lightning-bolt stripe and sparks in its fur, howling look",
            "Iron Hawk: a sharp hawk with steel-gray feathers like metal blades, a yellow hooked beak and fierce eyes",
            "Static Ferret: a fluffy cream ferret puffed up with static, fur standing on end, tiny yellow sparks around it",
            "Scrap Wolf: a wolf in dark gray fur wearing bits of rusty steel armor plates, one ear notched, snarling",
            "Lightning Lynx: a big lynx in pale silver fur with black-tipped ears crackling with yellow lightning, long legs, much tougher looking than the others"]},
}
MAP = (" COMPOSITION RULES: an illustrated fantasy adventure map of one region, seen from high above at a gentle angle like a board-game map, full bleed to every edge."
       " Each landmark is a small, clear, chunky vignette with plenty of plain ground around it, so a round marker can sit on it. Landmarks are connected by a winding dirt path."
       " For this map, adapt the style: scenery is flat color shapes with two or three value steps and soft dark outlines only on the landmarks, terrain colors soft and slightly desaturated."
       " ABSOLUTELY NO text, letters, labels, numbers, compass rose, legend, banners, frame or border, and no characters or creatures.")
ELDER = ("SUBJECT: the map of The Elder Wilds, ancient wild lands at the edge of the world where the oldest dragons live. Landmarks, at these exact positions (fractions of width and height from the top-left):"
         " (0.30, 0.80) The Steelspine Range, a jagged ridge of iron-gray mountains like a spine with a small yellow lightning bolt above it;"
         " (0.70, 0.58) Twilight Rift, a glowing tear in the ground and sky, half pink starlight and half dark indigo nothing;"
         " (0.30, 0.37) The Confluence, two small volcano craters beside a steaming lake where red lava meets blue water;"
         " (0.62, 0.13) Dragonsrest, a huge ancient nest of stone and branches on a tall mountain top with three giant eggs in it;"
         " (0.50, 0.97) a narrow mountain pass entering the map from the bottom edge."
         " Old forests, windswept cliffs, giant ancient bones half buried in the hills, and a few distant dragon silhouettes in the sky fill the rest, warm golds and deep greens with misty blue peaks.")

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
if step == 'idle': job('map-elder-wilds', ELDER + MAP, head=MAPHEAD)
print(sorted(f for f in os.listdir('v2/prompts') if any(k in f for k in list(AREAS) + ['elder', 'rotroot-queen', 'volcanadon', 'ferrovane'])))
