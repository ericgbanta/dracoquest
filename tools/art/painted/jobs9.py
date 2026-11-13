"""Ninth batch (dragons plan E2): tail tips and breath bursts for the four new elements (Aether, Void, Blight, Steel),
Starglass Hollow (backdrop, boss, enemy sheet and their attack poses) and the Hidden Reach region map.
Run from the gen folder: `python3 v2/jobs9.py idle`, generate those, then `python3 v2/jobs9.py attack`."""
import os, shutil, sys
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly, so this looks like art from the same game. Do not copy its subject or its colors."
MAPHEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (portrait, about 1024x1536). Do not write code to draw it; generate it with the image tool. The attached image is the STYLE reference only: match its flat two-tone cel shading, simple chunky shapes and friendly look, so this looks like art from the same game. Do not copy its subject."
TAIL = "Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself (use dark, olive or teal greens if something must be green). No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."
os.makedirs('v2/prompts', exist_ok=True); os.makedirs('v2/out', exist_ok=True); os.makedirs('v2/refs', exist_ok=True)

def job(name, body, ref=None, head=HEAD):
    open(f'v2/prompts/{name}.txt', 'w').write(head.format(name=name) + "\n\n" + body + "\n\n" + STYLE + "\n")
    if ref: shutil.copy(f'v2/out/{ref}.png', f'v2/refs/{name}.png')

TIPS = ("SUBJECT: a row of four small tail-tip ornaments for dragons, arranged in a single row of 4 columns, evenly spaced, each one fully separate with wide green space around it, none touching. "
        "Each is drawn as if attached at its bottom-left, sweeping up and to the right, roughly the same size, matching a set of tail tips that already exists (a flame, ice crystals, leaves, a rock club). Left to right: "
        "1) aether: a small cluster of glowing star-shaped crystal shards in pale pink-lilac and white with a tiny four-point star sparkle; "
        "2) void: a curling hollow ring of dark indigo with a black empty center and a thin pale violet rim, like a tiny swirl of nothing; "
        "3) blight: a drooping sickly spore pod in murky olive and mustard yellow with purple spots and one drip; "
        "4) steel: a polished spearhead blade in cool silver and blue-gray with two rivets at its base. " + TAIL)
BREATH = ("SUBJECT: a row of four separate dragon-breath blast effects for a game, arranged in a single row of 4 columns, evenly spaced, each fully separate with wide green space around it; none touch. "
          "Each is a compact, roundish burst about the same size, readable when small, with NO dark outline (flat shapes only, two or three tones, brightest at the center), matching an existing set (a fireball, an ice burst, a leaf swirl, a rock spray). Left to right: "
          "1) aether: a twinkling burst of pale pink-lilac and white stardust with small four-point stars; "
          "2) void: a swirling dark indigo vortex ring with a black center and a pale violet rim; "
          "3) blight: a puffy cloud of murky olive and mustard-yellow spores with purple flecks; "
          "4) steel: a spray of silver and blue-gray metal shards with a few white sparks. " + TAIL)

BOSS = "Strict side profile facing RIGHT, full body, standing on the ground, whole creature inside the frame with a clear margin, nothing cropped. A big imposing boss enemy for a side-view battle: menacing and grumpy but still funny and all-ages. " + TAIL
WARDEN = "the Starwarden, a huge proud owl-griffin that guards a valley of fallen stars: a big round owl head with two tall feather tufts and enormous glowing pale-cyan eyes, a body of deep night-blue feathers dotted with a few tiny white star specks, big folded wings edged with pale ice-crystal plates, four sturdy taloned legs, a short fan tail of lilac feathers, and a small glowing star-crystal set in its chest, a stern self-important expression"
SHEET = ["Shardling: a small round hedgehog whose quills are pale blue and lilac star-glass crystals, a tiny pink nose, cheerful but prickly",
         "Frostwing Moth: a fluffy white and pale blue moth with big rounded icy wings patterned with simple snowflake shapes, little feathery antennae, sleepy eyes",
         "Comet Pup: a small fox-like pup in deep violet with a big glowing pale-pink comet tail streaming behind it and a white star on its forehead, playful grin",
         "Glass Golem: a short chunky golem of clear pale-blue ice glass blocks with a frosty white core visible inside, stubby arms, two dark bead eyes",
         "Astral Owlet: a tiny round owl chick in night-blue fluff dotted with white star specks, huge pale-cyan eyes, a small crystal on its head, tottering",
         "Prism Stag: a proud stag in pale silver-blue fur with huge branching antlers made of lilac and cyan crystal prisms, a white starry mane, much tougher looking than the others"]
SHEET_BODY = "SUBJECT: a sheet of six separate enemy creatures for a side-view battle game, arranged in a grid of 3 columns by 2 rows, evenly spaced. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size (the sixth is the mini-boss: make it look tougher, not larger than its cell). They are grumpy, funny, all-ages creatures from a cold valley where stars have fallen and turned to crystal. Reading order, left to right, top row then bottom row:\n" + "\n".join(f"{i+1}) {t}." for i, t in enumerate(SHEET)) + "\n" + TAIL

BD = " COMPOSITION RULES: full-bleed scene to every edge, NO characters or creatures. The bottom quarter of the image is wide, flat, fairly empty ground where fighters will stand: calm and low in detail, with a soft pool of lighter color in the middle; props sit only near the far left and right edges. The middle band of the picture is calmer and lower in contrast than the top, so characters placed on it stand out. One clear light source (sun, moon or glow) sits in the upper middle of the sky. For this background, adapt the style: scenery is flat color shapes with two or three value steps and NO dark ink outlines (outlines are reserved for characters), distant layers lighter and hazier, colors a little softer and less saturated than the reference character. No text, no border."
VALLEY = "Starglass Hollow, a cold snowy valley at dusk where fallen stars have turned into crystals: flat pale snowy ground tinted lilac with a lighter pool in the middle, a cluster of tall glowing pale-cyan and lilac crystal spires at the far left edge, a frosted pine and a half-buried glowing star crystal at the far right edge, soft snowy hills and distant icy cliffs fading into haze behind, a deep violet-blue sky full of simple four-point stars with a big pale glowing falling star in the upper middle."

MAP = (" COMPOSITION RULES: an illustrated fantasy adventure map of one region, seen from high above at a gentle angle like a board-game map, full bleed to every edge."
       " Each landmark is a small, clear, chunky vignette with plenty of plain ground around it, so a round marker can sit on it. Landmarks are connected by a winding dirt path."
       " For this map, adapt the style: scenery is flat color shapes with two or three value steps and soft dark outlines only on the landmarks, terrain colors soft and slightly desaturated."
       " ABSOLUTELY NO text, letters, labels, numbers, compass rose, legend, banners, frame or border, and no characters or creatures.")
HIDDEN = ("SUBJECT: the map of The Hidden Reach, a strange hidden valley behind the mountains where odd new elements leak into the world. Landmarks, at these exact positions (fractions of width and height from the top-left):"
          " (0.30, 0.80) Starglass Hollow, a snowy hollow with a cluster of glowing pale-cyan and lilac star crystals and a few tiny stars above it;"
          " (0.70, 0.54) Voidmarch, a broken rocky plateau with a dark round chasm of empty indigo nothingness in it and floating rock shards;"
          " (0.32, 0.27) Rotroot Thicket, a dark tangled swampy forest of twisted trees with murky olive water and purple mushrooms;"
          " (0.50, 0.96) a narrow mountain pass entering the map from the bottom edge."
          " Leave open plain ground at (0.72, 0.84) and (0.70, 0.18) for places added later. Misty hills, scattered pale crystals and dark pines fill the rest, cool blues and violets with a few warm glints.")

SAME = " This is the SAME creature as the SECOND attached image: keep its exact design, colors, markings and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole creature inside the frame with a clear margin, nothing cropped. Do NOT draw any impact effects, speed lines, breath or projectiles. " + TAIL

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
if step == 'idle':
    job('tail-tips-2', TIPS)
    job('fx-breath-2', BREATH)
    job('bg-starglass-hollow', "SUBJECT: a battle backdrop. " + VALLEY + BD)
    job('boss-starwarden', "SUBJECT: " + WARDEN + ". " + BOSS)
    job('sheet-starglass-hollow', SHEET_BODY)
    job('map-hidden-reach', HIDDEN + MAP, head=MAPHEAD)
else:
    job('boss-starwarden-attack', "SUBJECT: the boss in its ATTACK pose: lunging forward with its head low and thrust out to the right, beak wide open, wings half raised and spread, eyes blazing, front talons reaching forward." + SAME, ref='boss-starwarden')
    job('sheet-starglass-hollow-attack', "SUBJECT: the SAME six creatures as the SECOND attached image, in the same grid of 3 columns by 2 rows, in the same order and at the same size, each one now in an ATTACK pose: lunging or leaning forward to the right, mouth open, quills, wings, tail, fists or antlers thrust forward, fierce expression. Keep every creature's exact design, colors and proportions; only the pose changes. Each creature is fully separate with wide green space around it; none touch or overlap. All in strict side profile facing RIGHT, full body, nothing cropped. Do NOT draw any impact effects, speed lines or projectiles, and keep any small loose bits (sparkles, snow) close to their creature. " + TAIL, ref='sheet-starglass-hollow')
print(sorted(os.listdir('v2/prompts')))
