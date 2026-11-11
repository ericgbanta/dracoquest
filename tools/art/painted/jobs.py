"""Writes one prompt file per image for the cel-style art set. Run from the gen folder."""
import os
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png ({size}). Do not write code to draw it; generate it with the image tool. The attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly, so this looks like art from the same game. Do not copy its subject or its colors unless told to."
CHAR_TAIL = "Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself. No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."
os.makedirs('v2/prompts', exist_ok=True); os.makedirs('v2/out', exist_ok=True)
def job(name, size, body):
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name, size=size) + "\n\n" + body + "\n\n" + STYLE + "\n")
L, P = "landscape, about 1536x1024", "portrait, about 1024x1536"

# ---- dragons (red body = player's main color, golden belly and membranes = second color)
DR = "Colors are fixed: body pure red-orange with a darker red shadow tone; belly plates, wing membranes and back spines golden yellow with an orange-gold shadow tone; horns and claws cream; eye white with a dark brown iris. Use no other reds, oranges or yellows anywhere. The tail ends in a plain tapered point (no flame, no ornament). Strict side profile facing RIGHT, full body, whole dragon inside the frame with a clear margin on every side, nothing cropped. " + CHAR_TAIL
job('dragon-hatchling', L, "SUBJECT: a baby dragon hatchling, the same species as the reference dragon at a few weeks old. Tiny, round and adorable: oversized head, huge eye, stubby legs, tiny wing nubs held up, short tail, two little horn buds, sitting-up alert puppy-like stance on all fours. " + DR)
job('dragon-juvenile', L, "SUBJECT: a juvenile dragon, the same species as the reference dragon as a lanky teenager. Slimmer body, longer legs and neck, wings a bit too big for it and half raised, short horns, eager energetic stance on all fours, playful confident expression. " + DR)
job('dragon-adult', L, "SUBJECT: redraw the reference adult dragon itself: same design, same pose, same proportions, standing on all four legs with wings half raised and the tail curling up behind, but with slightly more margin around it so nothing is near the frame edge, and with the tail ending in a plain tapered point. " + DR)
job('dragon-elder', L, "SUBJECT: an elder dragon, the same species as the reference dragon in majestic old age. Larger and more massive, huge fully raised wings, long swept-back horns with a second smaller pair, a row of tall back spines, a beard-like chin frill, long powerful tail, proud regal stance on all fours with head held high, wise stern expression. " + DR)
job('tail-tips', L, "SUBJECT: a sheet of eight small tail-tip ornaments for dragons, arranged in a grid of 4 columns by 2 rows, evenly spaced, each one fully separate with wide green space around it, none touching. Each is drawn as if attached at its bottom-left, sweeping up and to the right, roughly the same size. Reading order, left to right, top row then bottom row: 1) a lively fire flame (orange and yellow); 2) a cluster of pale blue ice crystals; 3) a sprout of two green leaves with a small bud; 4) a chunky brown rock club with a gray stone spike; 5) a jagged yellow and violet lightning spark; 6) a teal-blue water fin shaped like a curling wave; 7) a golden sun-star with short rays; 8) a dark violet crescent wisp of shadow with a pale edge. " + CHAR_TAIL)

# ---- rider
RD = "the player's hero, a young dragon keeper: short tousled brown hair, friendly determined face, teal-green adventurer's tunic with a leather belt and shoulder strap, dark blue trousers, brown boots and bracers, a short crimson cape. Slightly stylized heroic proportions (about four and a half heads tall). Strict side profile facing RIGHT, whole figure inside the frame with a clear margin, nothing cropped. " + CHAR_TAIL
job('rider-sword', P, "SUBJECT: " + RD.replace("Strict side", "Standing in a ready fighting stance holding a steel longsword upright in the front hand. Strict side"))
job('rider-bow', P, "SUBJECT: " + RD.replace("Strict side", "Standing in a ready stance holding a wooden longbow in the front hand at their side, bowstring toward the body, a quiver of arrows on the back. Strict side"))
job('rider-staff', P, "SUBJECT: " + RD.replace("Strict side", "Standing in a ready stance holding a tall wooden wizard's staff upright in the front hand, topped with a glowing violet crystal. Strict side"))
job('rider-mounted', P, "SUBJECT: " + RD.replace("Strict side", "Shown riding: seated as if astride a saddle with knees bent and legs hanging down, leaning slightly forward, front hand gripping reins held forward, back hand raised in a fist, cape streaming behind. There is NO mount and NO saddle in the image, only the rider in the seated pose. Strict side"))

# ---- bosses
B = "Strict side profile facing RIGHT, full body, standing on the ground, whole creature inside the frame with a clear margin, nothing cropped. A big imposing boss enemy for a side-view battle: menacing and grumpy but still funny and all-ages. " + CHAR_TAIL
bosses = {
 'bramble-troll': "the Bramble Troll, guardian of a mossy forest who mostly guards his nap spot. A huge hunched green troll with mossy shoulders, small leaves and thorny bramble vines growing from his back, a big underbite with two tusks, heavy sleepy-angry brow, holding a spiked wooden club made from a tree stump over one shoulder, a patchwork brown hide loincloth.",
 'crab-king': "the Crab King, ruler of a sandy shore. A giant deep-blue crab with a pale blue underside, two enormous claws (one bigger than the other) raised, eyes on stalks with a haughty glare, a few barnacles, and a crown that is obviously a dented golden bottle cap.",
 'magma-wyrm': "the Magma Wyrm, a serpent that is mostly volcano. A huge thick wingless serpent-dragon rearing up from a coil, body of dark charcoal rock plates with bright orange-yellow lava glowing in the cracks between them, a blunt horned head with molten glowing eyes and a mouth dripping lava, small smoke puffs from its nostrils.",
 'storm-roc': "the Storm Roc, a bird so big it has its own weather. A giant thunderbird standing tall on two thick yellow taloned legs, huge wings raised behind it in a threatening display, hooked golden beak, fierce yellow eye under a heavy brow, a crest of jagged yellow lightning-bolt feathers, deep indigo and storm-blue plumage in a few big simple feather shapes with pale violet under-feathers.",
 'glacier-hydra': "the Glacier Hydra: three heads, three opinions. A bulky four-legged ice-blue hydra with three long necks and three dragon-like heads, each with a different expression (one angry, one smug, one sleepy), pale icy-white belly, back and neck ridges made of jagged translucent blue ice crystals, frosty breath curling from one mouth.",
 'iron-golem': "the Iron Golem, built to guard the deepest mine and still guarding. A massive broad-shouldered humanoid machine of riveted dark gray iron plates with rusty orange patches, huge blocky fists, a small helmet-like head with one glowing teal eye slit, a glowing teal crystal core in its chest, short sturdy legs.",
 'eclipse-dragon': "the Eclipse Dragon, the oldest dragon in the world, half sun and half moon. A grand ancient winged dragon standing on four legs with huge raised wings, body deep midnight violet, the front half and one wing edged and patterned in radiant gold like the sun, the back half and other wing in pale silver-blue like the moon, long curved horns (one gold, one silver), a glowing golden eye, stern unimpressed expression. Much more regal and angular than the reference dragon.",
}
for k, v in bosses.items(): job('boss-' + k, L, "SUBJECT: " + v + " " + B)

# ---- regular enemies: one sheet per zone, six creatures each
SH = "SUBJECT: a sheet of six separate enemy creatures for a side-view battle game, arranged in a grid of 3 columns by 2 rows, evenly spaced. Each creature is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped, drawn at a similar size (the sixth is the mini-boss: make it look tougher, not larger than its cell). They are grumpy, funny, all-ages monsters. Reading order, left to right, top row then bottom row:\n{items}\n" + CHAR_TAIL
sheets = {
 'mossy-hollow': ["Thornling: a small walking shrub with a grudge, leafy green body, two twig arms with very pointy thorn elbows, angry little eyes, brown root feet",
  "Bog Hopper: a fat teal-blue toad the size of a footstool with a pale green belly, wide mouth, hungry stare, crouched to jump",
  "Barkback Boar: a stocky brown wild boar whose back is plates of bark and rock, small tusks, very bad mood",
  "Spore Puffer: a round cream-colored mushroom creature with a red spotted cap, puffed cheeks about to sneeze, tiny feet",
  "Moss Wisp: a glowing floating puff of bright green moss with two bright eyes and a small sharp beak, a few drifting sparkles",
  "Elder Thornling: an older, bigger dark-green shrub creature with a crown of twisted branches, bushy leaf eyebrows, thick thorny arms folded, brown root feet"],
 'saltmarsh-shore': ["Pincher Crab: a small bright blue crab with a pale underside and yellow claw tips, walking sideways with a grudge",
  "Gull Bandit: a white seagull wearing a black bandit eye mask, yellow beak, smug look, a stolen sandwich under one wing",
  "Brine Slime: a turquoise jelly blob with a pale glossy highlight, salt crystals stuck on top, a salty frown",
  "Kelp Lurker: a hunched heap of dark green seaweed with two angry yellow eyes peering out and long kelp frond arms",
  "Shell Knight: an orange hermit crab wearing a purple-gray knight's helmet as its shell, holding a tiny spear, very polite posture",
  "Big Pincher: a larger dark navy-blue crab with spikes on its shell and one huge red-orange claw raised, scarred and tough"],
 'cinder-pass': ["Ember Imp: a small red-orange imp with tiny dark horns, a pointed tail, a big toothy laugh, standing on two legs",
  "Ash Lizard: a low gray lizard with pale underside and glowing orange ember spots along its back, basking smugly",
  "Cinder Beetle: a dark charcoal beetle with a glowing coal for a back and a short horn",
  "Smog Bat: a gray-purple bat with orange inner ears, mid-cough with a little smog puff, wings spread",
  "Lava Toad: a red toad with an orange belly and yellow glowing lava cracks on its back, crouched",
  "Imp Chieftain: a bigger dark-red imp with a golden-orange belly wearing a tall crown made of stacked little hats, arms crossed, bossy"],
 'thunderspire': ["Spark Sprite: a tiny floating ball of violet static with a pale yellow core, big attitude eyes, little zigzag sparks around it",
  "Thunder Goat: a sturdy blue-violet mountain goat with pale lavender chest and yellow lightning-shaped horns, chewing a tin can",
  "Cliff Harpy: a purple bird-woman monster with wings for arms, wild pale-pink hair, golden talons, mouth wide open screaming",
  "Gale Hawk: a sleek blue hawk with pale chest and a swept-back crest, golden beak, the smuggest expression",
  "Granite Ram: a gray-tan ram with cream wool and big curled horns made of literal chunky rock, proud stance",
  "Thunderhead: a grumpy dark gray-violet storm cloud with a scowling face, heavy cloud eyebrows, two small yellow lightning bolts held like fists"],
 'frostmere': ["Frostbite Hare: a fluffy white snow hare with pale blue ear tips and big front teeth, mid-hop, mean little eyes",
  "Ice Wraith: a floating pale-blue ghostly wisp with a hooded shape, icicles hanging from its arms, hollow darker blue eyes",
  "Glacier Turtle: a slow teal-green turtle with a chunk of pale blue glacier ice for a shell, patient stubborn face",
  "Yeti Cub: a chubby white-furred baby yeti with a blue-gray face, hands and feet, standing on two legs, small but tough",
  "Rime Wolf: a lean gray-blue wolf with a pale underside and frosty fur tips, snarling, looking a bit lost",
  "Rime Alpha: a larger dark steel-blue wolf with a pale icy-blue mane and a scar over one eye, commanding stance"],
 'deepstone-mines': ["Tunnel Mole: a plump purple-gray mole with a big pink star-shaped nose, tiny squinting eyes, large digging claws",
  "Crystal Crawler: a spider with a body and legs made of faceted violet gemstones, eight legs, furious little eyes",
  "Lantern Gnome: a short gnome miner with a cream beard, purple-blue coat, pointed hat, carrying a pickaxe and a glowing orange lantern, disappointed face",
  "Gemback Lizard: a brown lizard with a pale underside and a row of big turquoise gems along its back, vain expression",
  "Rust Sprite: a small floating rusty-orange spark creature made of rusty bolts and cogs with a pale orange glow",
  "Foreman Golem: a blocky gray stone golem wearing a yellow hard hat and holding a clipboard, stern safety-inspector look"],
 'eclipse-peak': ["Dawn Sprite: a tiny floating golden-yellow sun creature with short rays, wide-awake cheerful-annoying face",
  "Dusk Bat: a dark violet bat with lavender wing membranes and a pale yellow crescent-moon mark on its chest, wings spread",
  "Sun Knight: a short knight in polished silver armor with gold trim and a sun crest on the helmet, holding a sword, polishing cloth tucked in belt",
  "Shade Stalker: a tall thin shadowy figure in a deep purple hooded cloak, only two pale violet eyes visible, wispy lower body",
  "Twilight Moth: a big fuzzy moth with wings half sunset-orange and half dusk-purple, yellow antennae, a trail of dust",
  "Eclipse Herald: a robed figure in a dark violet hood with lavender trim, blowing a long golden horn, a small sun-and-moon emblem on the chest"],
}
for z, items in sheets.items(): job('sheet-' + z, L, SH.format(items="\n".join(f"{i+1}) {t}." for i, t in enumerate(items))))

# ---- backdrops
BD = " COMPOSITION RULES: full-bleed scene to every edge, NO characters or creatures. The bottom quarter of the image is wide, flat, fairly empty ground where fighters will stand: calm and low in detail, with a soft pool of lighter color in the middle; props sit only near the far left and right edges. The middle band of the picture is calmer and lower in contrast than the top, so characters placed on it stand out. One clear light source (sun, moon or glow) sits in the upper middle of the sky. For this background, adapt the style: scenery is flat color shapes with two or three value steps and NO dark ink outlines (outlines are reserved for characters), distant layers lighter and hazier, colors a little softer and less saturated than the reference character. No text, no border."
drops = {
 'mossy-hollow': "Mossy Hollow, a soft green forest clearing in morning light: giant mossy tree trunks framing left and right, hanging vines, mushrooms and ferns at the edges, misty layers of trees behind, sunbeams, a few glowing motes, a mossy green forest floor.",
 'saltmarsh-shore': "Saltmarsh Shore, a bright sandy beach by a marsh: pale sand ground, gentle teal sea and a low horizon, grassy dunes, reeds and driftwood at the edges, a distant lighthouse rock, puffy clouds, a warm afternoon sun.",
 'cinder-pass': "Cinder Pass, a mountain road through volcanic rock at sunset: dark warm-gray stone ground with a few glowing cracks at the edges, jagged black rocks, a smoking volcano in the distance with a ribbon of lava, an orange-red sky with ash clouds, drifting embers.",
 'thunderspire': "Thunderspire, a high rocky plateau at dusk under a stormy violet sky: layered jagged ridges fading into pink-orange haze, one tall needle-like stone spire right of center struck by lightning at its tip, a few small floating rock islands, a pale full moon high in the middle, storm clouds in the top corners, small glowing violet crystals at the edges, a gray-violet stone ground.",
 'frostmere': "Frostmere, a frozen lake under a pale winter sky: snowy ice ground with a few cracks, snow-laden pine trees and ice boulders at the edges, pale blue mountains behind, a low white sun with a halo, soft falling snow.",
 'deepstone-mines': "Deepstone Mines, a large underground cavern: packed earth and stone floor, wooden mine supports and a mine cart on rails at the edges, hanging lanterns giving a warm glow, clusters of teal and violet gems in the walls, a bright shaft of light falling from a hole in the cave roof in the upper middle, tunnels receding into blue-gray darkness.",
 'eclipse-peak': "Eclipse Peak, a mountaintop where the sun and moon share the sky: an eclipse (dark moon disc with a golden corona) high in the middle, the left half of the sky warm gold and rose like dawn and the right half deep violet with stars like dusk, ancient broken stone pillars at the edges, a pale stone summit ground.",
 'roost': "The Roost, a cozy dragon aerie on a sunny cliff ledge: a wide flat stone ledge as the ground, big straw nests and a wooden perch post at the edges, a string of small colorful bunting flags across the top, a cliff wall with vines on the right, rolling green hills and far mountains behind, blue sky with puffy clouds and a bright sun. Cheerful and homey.",
}
for z, v in drops.items(): job('bg-' + z, L, "SUBJECT: a battle backdrop. " + v + BD)

# ---- effects
job('fx', L, "SUBJECT: a sheet of three separate game visual effects in a row, evenly spaced, each fully separate with wide green space around it. Left: a round puffy breath cloud blob with a scalloped edge, pure red-orange with a golden-yellow center and a small pale cream core. Middle: a white crescent sword-slash swoosh with a pale blue trailing edge. Right: a white and pale yellow eight-point starburst impact spark. These three have NO dark outline, just flat shapes. " + CHAR_TAIL)
print(len(os.listdir('v2/prompts')), 'prompts')
