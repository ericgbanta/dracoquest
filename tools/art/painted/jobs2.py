"""Second batch: the egg, UI icons, and attack poses. Run from the gen folder."""
import os, shutil
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png ({size}). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly. Do not copy its subject."
TAIL = "Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself (use dark or olive greens if something must be green). No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."
os.makedirs('v2/refs', exist_ok=True)
def job(name, size, body, ref=None):
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name, size=size) + "\n\n" + body + "\n\n" + STYLE + "\n")
    if ref: shutil.copy(f'v2/out/{ref}.png', f'v2/refs/{name}.png')
L, P = "landscape, about 1536x1024", "portrait, about 1024x1536"

job('egg', P, "SUBJECT: one large dragon egg standing upright, centered, filling most of the frame with a clear margin. A smooth chunky egg shape. Colors are fixed: the shell is pure red-orange with a darker red shadow tone on one side; it has five or six big round golden-yellow spots and one wavy golden-yellow band around its middle. Use no other colors except the dark outline and one small pale highlight. " + TAIL)

SHEET = "SUBJECT: a sheet of {n} separate game UI icons arranged in a grid of {c} columns by {r} rows, evenly spaced, each one fully separate with wide green space around it; none touch. Each icon is a single bold, simple object with a thick dark outline, drawn to read clearly at 24 pixels, all roughly the same size. Reading order, left to right, top row first:\n{items}\n" + TAIL
def sheet(name, cols, rows, items):
    job(name, L, SHEET.format(n=len(items), c=cols, r=rows, items="\n".join(f"{i+1}) {t}." for i, t in enumerate(items))))
sheet('icons-status', 4, 3, [
 "Blind: an eye with a dark slash across it", "Burn: a small orange flame", "Chill: a pale blue snowflake", "Crack: a gray shield split by a jagged crack",
 "Fade: a violet ghostly wisp fading at the bottom", "Fury: a red angry face mark, a fist with anger lines", "Harden: a solid gray stone block shield", "Root: brown roots and a dark olive vine wrapped in a knot",
 "Shock: a yellow lightning bolt", "Soak: a blue water droplet", "Taunt: a red megaphone-like horn with sound lines", "Ward: a golden shield with a small star"])
sheet('icons-battle', 4, 3, [
 "Attack: two crossed steel swords", "Big attack: a red and yellow spiky warning burst with an exclamation shape made of two dots", "Buff: a bold golden arrow pointing up", "Heal: a pink-red heart with a white plus",
 "Shift: two curved arrows chasing each other in a circle, violet and teal", "Potion: a round glass bottle of red liquid with a cork", "Mana tonic: a tall glass bottle of blue liquid with a cork", "Dragon treat: a bone-shaped biscuit, golden brown",
 "Gold: a small stack of three gold coins", "Ember: a glowing orange ember gem shaped like a teardrop flame", "XP: a bright yellow five-point star", "Bond: a red heart with a tiny dragon horn pair on top"])
sheet('icons-care', 4, 3, [
 "Blossom bun: a round pink steamed bun with a flower stamp", "Char pepper: a red chili pepper with a small flame at its tip", "Cocoa cake: a slice of dark brown chocolate cake", "Harvest pie: a golden pie with a lattice crust",
 "Mossberry tart: a small tart with dark purple berries", "River trout: a blue-silver fish", "Sunfruit: a round orange fruit with a leaf, glowing like a sun", "Sweetroot: a tan root vegetable like a parsnip with leafy top",
 "Feed: a filled food bowl", "Groom: a wooden brush with bristles", "Rest: a crescent moon with a small star", "Egg: a cream dragon egg with violet spots"])
sheet('icons-places', 4, 2, [
 "Expeditions: a rolled treasure map with a red X", "Hatchery: a straw nest holding one spotted egg under a warm lamp", "Nest: a big round straw nest", "Pantry: a wooden shelf with jars and a loaf",
 "Training yard: a straw training dummy on a post", "Town: a small cottage shop with a red roof", "Lock: a gold padlock", "Event: a red paper lantern"])

DR = " This is the SAME dragon as the SECOND attached image: keep its exact design, colors, markings, horn shape and proportions, drawn at the same size in the frame. Colors are fixed: body pure red-orange with a darker red shadow tone; belly plates, wing membranes and back spines golden yellow with an orange-gold shadow tone; horns and claws cream; inside of the mouth dark maroon with a pink tongue and cream teeth. The tail ends in a plain tapered point. Do NOT draw any fire, breath, smoke or effects. Strict side profile facing RIGHT, full body, all four feet on the same ground line as in the reference, whole dragon inside the frame with a clear margin, nothing cropped. " + TAIL
for st, extra in [('hatchling', "a tiny fierce squeak-roar"), ('juvenile', "an eager lunge"), ('adult', "a powerful roar"), ('elder', "a mighty commanding roar")]:
    job(f'dragon-{st}-attack', L, f"SUBJECT: the {st} dragon in its ATTACK pose, {extra}: leaning forward with the neck stretched out and low, mouth wide open roaring, eyes fierce, wings flared up and back, front leg stepping forward." + DR, ref=f'dragon-{st}')
RD = " This is the SAME hero as the SECOND attached image: keep the exact design, face, hair, outfit, colors and proportions, drawn at the same size in the frame. Strict side profile facing RIGHT, full body, feet on the same ground line, whole figure and weapon inside the frame with a clear margin, nothing cropped. Do NOT draw any slash, glow trail or effects. " + TAIL
job('rider-sword-attack', P, "SUBJECT: the hero in an ATTACK pose: a deep forward lunge, front knee bent, sword swung all the way forward and down in front at arm's length, cape flying back, fierce shout." + RD, ref='rider-sword')
job('rider-bow-attack', P, "SUBJECT: the hero in an ATTACK pose: bow raised and fully drawn, aiming straight to the right, arrow nocked, back elbow high, steady focused face, cape flying back." + RD, ref='rider-bow')
job('rider-staff-attack', P, "SUBJECT: the hero in an ATTACK pose: lunging forward and thrusting the staff out to the right with both hands, the violet crystal tip pointed forward, cape flying back, fierce shout." + RD, ref='rider-staff')
