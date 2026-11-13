"""Tenth batch (dragons plan E4): the Wyvern breed. All four life stages on one sheet, then the same sheet in attack poses,
to save generations (two instead of eight). Painted in the dragon key colors so the game recolors it per player.
Run from the gen folder: `python3 v2/jobs10.py idle`, generate, then `python3 v2/jobs10.py attack`.
The second reference for the idle sheet is the original adult dragon (refs/dragon-colors.png), for colors only."""
import os, shutil, sys
STYLE = open('v2/style.txt').read().strip()
HEAD = "Use your built-in image generation tool to create one image and save it as ./v2/out/{name}.png (landscape, about 1536x1024). Do not write code to draw it; generate it with the image tool. The FIRST attached image is the STYLE reference only: match its line weight, flat two-tone cel shading, shape language and level of simplicity exactly, so this looks like art from the same game."
TAIL = "Perfectly flat solid #00ff00 background everywhere outside the artwork. Do not use bright green anywhere in the artwork itself. No ground, no cast shadows, no text, no labels, no numbers, no borders, no frames."
KEYS = "Colors are fixed for every one of them: body pure red-orange with a darker red shadow tone; belly plates, wing membranes and back spines golden yellow with an orange-gold shadow tone; horns and claws cream; eye white with a dark brown iris. Use no other reds, oranges or yellows anywhere. Every tail ends in a plain tapered point (no flame, no ornament)."
os.makedirs('v2/prompts', exist_ok=True); os.makedirs('v2/out', exist_ok=True); os.makedirs('v2/refs', exist_ok=True)

def job(name, body, ref=None):
    open(f'v2/prompts/{name}.txt', 'w').write(HEAD.format(name=name) + "\n\n" + body + "\n\n" + STYLE + "\n")
    if ref: shutil.copy(ref, f'v2/refs/{name}.png')

WYVERN = ("a WYVERN, a different kind of dragon from the reference: it stands on two strong hind legs, and its wings ARE its front limbs (big wing-arms with a small clawed thumb at each wrist; when standing it leans forward and rests on the folded wing-wrists like a bat), "
          "a long slim neck, a narrow head with two swept-back horns and a small frill, a slim body, and a very long whip-like tail held up behind it. Lean, fast and agile looking, friendly and a little cocky.")
STAGES = ("Reading order, left to right, top row then bottom row: 1) HATCHLING: a tiny baby wyvern, big head and big eyes, stubby wing-arms, small nub horns, about half the height of the elder; "
          "2) JUVENILE: a lanky young wyvern, longer neck and tail, small horns; 3) ADULT: a full grown wyvern, sleek and strong; "
          "4) ELDER: the largest, a proud old wyvern with long curved horns, a bigger frill and a few extra spikes along the tail. Each stage is clearly bigger than the one before.")
GRID = "Arrange them in a grid of 2 columns by 2 rows, evenly spaced. Each one is fully separate with wide green space around it; none touch or overlap. Every one is in strict side profile facing RIGHT, full body, nothing cropped."

step = sys.argv[1] if len(sys.argv) > 1 else 'idle'
if step == 'idle':
    job('wyvern-stages', "SUBJECT: a sheet of the SAME " + WYVERN + " at four life stages. " + GRID + " " + STAGES + " " + KEYS +
        " The SECOND attached image is the existing dragon from the same game: copy its colors, outline and finish exactly, but NOT its body shape (that one has four legs; this is a two-legged wyvern). " + TAIL,
        ref='v2/refs/dragon-colors.png')
else:
    job('wyvern-stages-attack', "SUBJECT: the SAME four wyverns as the SECOND attached image, in the same grid of 2 columns by 2 rows, in the same order and at the same sizes, each now in an ATTACK pose: lunging forward to the right, neck stretched out and low, mouth wide open roaring, wing-arms flared up and back. Keep each one's exact design, colors and proportions; only the pose changes. " + KEYS + " Inside of the mouth dark maroon with a pink tongue and cream teeth. Do NOT draw any fire, breath, smoke or effects. Each one fully separate with wide green space; none touch. Strict side profile facing RIGHT, full body, nothing cropped. " + TAIL,
        ref='v2/out/wyvern-stages.png')
print(sorted(f for f in os.listdir('v2/prompts') if f.startswith('wyvern')))
