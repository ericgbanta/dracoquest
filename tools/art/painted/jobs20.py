"""Looks plan, fifth icon sheet: the two Roost buildings and the three Forge materials that had no painted icon.
Run from the gen folder: python3 v2/jobs20.py, then ./v2/run.sh icons-forge
These are painted in their final colors (they are never recolored), like the other UI icons."""
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly. Do not copy its subject."
BODY = """SUBJECT: a sheet of 5 separate game UI icons: 3 in the top row and 2 in the bottom row, evenly spaced, each one fully separate with wide green space around it; none touch. Each icon is a single bold, simple, chunky object with a thick dark navy outline, drawn to read clearly at 24 pixels, all filling about the same square area. Reading order, left to right, top row first:
1) Forge: a small stone blacksmith's forge hut with a round chimney and a glowing orange fire in its open arched doorway, with a dark steel anvil in front of it.
2) Nesting grounds: a big round nest woven from brown twigs lined with pale straw, holding two large speckled dragon eggs side by side, one teal and one rose-pink, with a small red heart floating just above them.
3) Iron ore: a chunky lump of dark gray rock with three bright rust-orange and silver ore veins on its faces.
4) Sky crystal: a cluster of three tall pointed crystals, light sky blue with white highlights, on a small gray stone base.
5) Dragonscale: one large shield-shaped dragon scale, deep teal with a lighter teal ridge down the middle and a pale rim.
Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself. No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames, no background tiles behind the icons."""
open('v2/prompts/icons-forge.txt', 'w').write(HEAD.format(name='icons-forge') + "\n\n" + BODY + "\n\n" + STYLE + "\n")
print('icons-forge')
