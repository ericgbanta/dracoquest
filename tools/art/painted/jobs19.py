"""Looks plan L2: gear icons, four sheets of twelve. Run from the gen folder: python3 v2/jobs19.py, then
./v2/run.sh icons-gear-melee icons-gear-ranged-magic icons-gear-armor icons-gear-trinkets
Each icon is painted with a RED accent and GOLD trim so the game can recolor them (the dragon key colors):
the accent becomes the weapon's element color and the trim the tier color for the piece's level."""
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly. Do not copy its subject."
GRID = "SUBJECT: a sheet of 12 separate game inventory icons arranged in a grid of 4 columns by 3 rows, evenly spaced, each one fully separate with wide green space around it; none touch. Each icon is a single bold, simple, chunky object with a thick dark navy outline, drawn to read clearly at 32 pixels, all filling about the same square area. {tilt}"
COLORS = " STRICT COLOR RULES, the same for every icon: each object has exactly ONE accent part painted bright pure RED-ORANGE (with a darker red shadow) and ONE trim part painted bright GOLDEN YELLOW (with an orange-gold shadow). Everything else is neutral: steel is light blue-gray, wood is brown, leather is dark brown, cloth is cream or gray. Use NO other reds, oranges, yellows, pinks or purples anywhere, and no glows or sparkles. For each icon the accent and the trim are named below."
TAIL = " Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself. No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames, no background tiles behind the icons."
DIAG = "Long weapons lie on a diagonal from bottom-left to top-right so they fill their square."

SHEETS = {
 'icons-gear-melee': (DIAG, [
  "Sword: a straight one-handed sword, steel blade; red wrapped grip, gold crossguard and pommel.",
  "Saber: a curved single-edged cutlass, steel blade; red grip, gold knuckle guard.",
  "Greatsword: a very wide, heavy two-handed sword, steel blade; red gem set in the middle of the crossguard, gold crossguard.",
  "Axe: a single-bladed battle axe, steel head, brown wooden haft; red cloth wrap under the head, gold band at the butt.",
  "Cleaver: a broad rectangular chopping blade with a hole in the corner, steel; red grip, gold collar where blade meets grip.",
  "Hammer: a big blocky warhammer, gray stone-steel head, brown haft; red band around the head, gold end caps on the head.",
  "Club: a knobbly wooden club thicker at the top; red cloth wrap on the handle, three gold studs near the top.",
  "Polearm: a glaive, a long brown pole with a curved steel blade on the end; red tassel under the blade, gold socket.",
  "Trident: a three-pronged steel fork on a long pole; red ribbon tied under the prongs, gold socket.",
  "Sickle: a hooked crescent steel blade on a short handle; red grip, gold collar.",
  "Pickaxe: a miner's pickaxe with a steel head pointed at both ends, brown haft; red cloth wrap on the haft, gold band at the head.",
  "Training stick: a plain wooden practice sword carved from one piece of pale wood; red cloth wrap on the grip, one gold twine tie at the guard.",
 ]),
 'icons-gear-ranged-magic': (DIAG, [
  "Bow: a simple short wooden bow with a pale string, standing upright; red grip wrap in the middle, gold tips at both ends.",
  "Longbow: a tall slim wooden bow with a pale string, standing upright, clearly taller and thinner than the first; red grip wrap, gold tips, and one arrow nocked across it with a steel head.",
  "Horn bow: a strongly double-curved recurve bow made of dark horn, standing upright; red grip wrap, gold curled tips.",
  "Crossbow: a wooden crossbow seen from the side with a steel bow arm and a bolt loaded; red stock inlay, gold trigger and fittings.",
  "Repeater: a chunky boxy repeating crossbow with a square magazine on top; red magazine box, gold fittings.",
  "Sling: a leather sling, a dark brown pouch with two cords looped, holding one round gray stone; red tassel on a cord, gold ring at the cord's end.",
  "Blowgun: a straight bamboo tube with a feathered dart beside it; red dart feathers, gold bands around the tube.",
  "Staff: a tall brown wooden wizard's staff with a curled top holding a crystal; red crystal, gold claw setting.",
  "Wand: a short slim tapered wooden wand; red star-shaped tip gem, gold handle band.",
  "Scepter: a short metal rod with a round head, like a royal scepter; red orb head, gold rod and collar.",
  "Orb: a crystal ball sitting on a small three-legged stand; red glass ball, gold stand.",
  "Tome: a thick closed spellbook seen at a three-quarter angle with a clasp; red cover, gold corners and clasp, cream pages.",
 ]),
 'icons-gear-armor': ("Armor pieces are shown from the front, empty, as if on an invisible stand.", [
  "Plate armor: a heavy steel breastplate with round shoulder guards; red enamel panel on the chest, gold rim.",
  "Chain mail: a mail shirt with short sleeves, gray with a simple diamond pattern; red collar, gold hem band.",
  "Coat: a hip-length traveler's coat with a row of buttons, cream-gray cloth; red lapels, gold buttons.",
  "Robe: a long flowing wizard's robe with wide sleeves, gray cloth; red sash at the waist, gold hem trim.",
  "Cloak: a hooded cloak hanging open, gray cloth; red inner lining showing, gold round clasp at the neck.",
  "Leathers: a sleeveless dark brown leather vest with stitching and a belt; red neckerchief, gold belt buckle.",
  "Wraps: a simple wrapped cloth tunic made of cream bandage-like strips; red sash, gold toggle.",
  "Apron: a sturdy brown leather blacksmith's apron with a pocket; red pocket patch, gold rivets.",
  "Dragon saddle: a brown leather riding saddle with a high pommel and one stirrup, side view; red saddle blanket under it, gold stirrup and studs.",
  "Horn cap: a pointed metal cap that fits over the tip of a dragon's horn, a steel cone on a short piece of cream horn; red gem on the cone, gold band at its base.",
  "Dragon charm: a single large teardrop-shaped dragon scale hanging from a cord; red scale, gold cap and ring.",
  "Empty slot: a plain round empty wooden peg hook on a small square wooden plaque, nothing hanging on it; small red dot of paint on the plaque, gold nail in the peg.",
 ]),
 'icons-gear-trinkets': ("Small treasures, each shown large in its square.", [
  "Charm: a small lucky charm, a flat round token on a short cord loop; red token with a simple paw-print dent, gold rim.",
  "Pendant: an oval locket on a chain; red oval gem face, gold frame and chain.",
  "Ring: a chunky finger ring seen at an angle; red square gem, gold band.",
  "Gem: one large loose faceted gemstone, no setting, sitting on a tiny gold dish; red gem, gold dish.",
  "Sigil: a shield-shaped badge with a simple chevron on it; red field, gold border and chevron.",
  "Heart: a stylized heart-shaped stone in a metal cage; red heart, gold cage bands.",
  "Lantern: a small hand lantern with a ring handle and glass panes; red flame-colored glass, gold frame.",
  "Crown: a small circlet crown with three points; red gem in the center point, gold crown.",
  "Feather: one large feather with a bound quill; red feather vane, gold quill binding.",
  "Fang: one big curved cream fang hung on a cord; red cord wrap at the top, gold cap.",
  "Flower: a single open flower with five round petals on a short stem with one dark olive leaf; red petals, gold center.",
  "Keepsake: a small drawstring pouch tied at the neck, gray cloth; red ribbon tie, gold star stitched on the front.",
 ]),
}
for name, (tilt, icons) in SHEETS.items():
    body = GRID.format(tilt=tilt) + COLORS + " Reading order, left to right, top row first:\n" + "\n".join(f"{i + 1}) {t}" for i, t in enumerate(icons))
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name) + "\n\n" + body + TAIL + "\n\n" + STYLE + "\n")
print(sorted(SHEETS))
