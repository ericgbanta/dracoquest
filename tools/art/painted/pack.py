"""Cut the generated images out of their green backgrounds and pack them as WebP into src/art/painted.
Run from the gen folder: python3 v2/pack.py <repo>. Writes v2/packed.json with each image's size."""
import json, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

REPO = sys.argv[1]
OUT = f'{REPO}/src/art/painted'
ZONES = json.load(open('v2/zones.json'))
TIPS = ['fire', 'frost', 'verdant', 'stone', 'storm', 'tide', 'light', 'shadow']
TIPS2 = ['aether', 'void', 'blight', 'steel']  # tail-tips-2 and fx-breath-2 (jobs9.py): one row of four

def key(path):
    """RGBA image with the flat green background removed and green spill cleaned from the edges."""
    im = np.asarray(Image.open(path).convert('RGB')).astype(np.float32) / 255
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    dom = g - np.maximum(r, b)
    alpha = np.clip(1 - (dom - 0.10) / 0.30, 0, 1)
    bg = alpha < 0.5
    lab, n = ndi.label(bg)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    sizes = ndi.sum(bg, lab, range(1, n + 1))
    means = ndi.mean(dom, lab, range(1, n + 1))
    keep = np.zeros(n + 1, bool)
    for i in range(1, n + 1):
        # Enclosed pockets count as background only if they are the real key green, not a teal gem or a green hide.
        keep[i] = i in edge or (sizes[i - 1] > 12 and means[i - 1] > 0.6)
    outside = ndi.binary_dilation(keep[lab], iterations=3)
    alpha = np.where(outside, alpha, 1.0)
    spill = np.clip(g - np.maximum(r, b), 0, 1) * (outside | (alpha < 1))
    out = np.dstack([r, g - spill, b, alpha])
    img = Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')
    img.putalpha(img.getchannel('A').filter(ImageFilter.GaussianBlur(0.6)))
    return img

def crop(img, pad=3):
    bb = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
    return img.crop((max(0, bb[0] - pad), max(0, bb[1] - pad), min(img.width, bb[2] + pad), min(img.height, bb[3] + pad)))

def save(img, name, maxw=None, maxdim=None, q=86):
    if maxw and img.width > maxw: img = img.resize((maxw, round(img.height * maxw / img.width)), Image.LANCZOS)
    if maxdim and max(img.size) > maxdim:
        k = maxdim / max(img.size); img = img.resize((round(img.width * k), round(img.height * k)), Image.LANCZOS)
    os.makedirs(os.path.dirname(f'{OUT}/{name}'), exist_ok=True)
    img.save(f'{OUT}/{name}.webp', quality=q, method=6)
    return list(img.size)

def split(img, count, cols):
    """Split a sheet into `count` pieces in reading order. Small loose bits (sparkles, puffs) join the nearest big piece."""
    a = np.asarray(img.getchannel('A')) > 40
    lab, n = ndi.label(ndi.binary_dilation(a, iterations=4))
    sizes = ndi.sum(a, lab, range(1, n + 1))
    order = np.argsort(-sizes)
    seeds = [int(i) + 1 for i in order[:count]]
    boxes = {s: ndi.find_objects((lab == s).astype(int))[0] for s in seeds}
    cen = {s: ((boxes[s][1].start + boxes[s][1].stop) / 2, (boxes[s][0].start + boxes[s][0].stop) / 2) for s in seeds}
    owner = {s: s for s in seeds}
    for i in order[count:]:
        c = int(i) + 1
        if sizes[i] < 12: continue
        sl = ndi.find_objects((lab == c).astype(int))[0]
        cx, cy = (sl[1].start + sl[1].stop) / 2, (sl[0].start + sl[0].stop) / 2
        owner[c] = min(seeds, key=lambda s: (cen[s][0] - cx) ** 2 + (cen[s][1] - cy) ** 2)
    rows = sorted(seeds, key=lambda s: cen[s][1])
    ordered = []
    for r in range(0, count, cols): ordered += sorted(rows[r:r + cols], key=lambda s: cen[s][0])
    pieces = []
    arr = np.asarray(img).copy()
    for s in ordered:
        mine = np.isin(lab, [c for c, o in owner.items() if o == s])
        piece = arr.copy(); piece[..., 3] = np.where(mine, piece[..., 3], 0)
        pieces.append(crop(Image.fromarray(piece, 'RGBA')))
    return pieces

packed = {}
have = lambda n: os.path.exists(f'v2/out/{n}.png')
# Transparent margin (left, top, in packed pixels) so an element tail tip drawn at load has room.
PAD = {'juvenile': (70, 0), 'adult': (0, 24), 'elder': (84, 0)}
for stage in ['hatchling', 'juvenile', 'adult', 'elder']:
    if not have(f'dragon-{stage}'): continue
    im = crop(key(f'v2/out/dragon-{stage}.png'))
    im = im.resize((640, round(im.height * 640 / im.width)), Image.LANCZOS)
    l, t = PAD.get(stage, (0, 0))
    padded = Image.new('RGBA', (im.width + l, im.height + t), (0, 0, 0, 0)); padded.paste(im, (l, t))
    packed[f'dragon-{stage}'] = save(padded, f'dragon-{stage}', q=90)
for w in ['sword', 'bow', 'staff', 'mounted']:
    if have(f'rider-{w}'): packed[f'rider-{w}'] = save(crop(key(f'v2/out/rider-{w}.png')), f'rider-{w}', maxdim=460)
for z, v in ZONES.items():
    if have(f'boss-{v["boss"]}'): packed[v['boss']] = save(crop(key(f'v2/out/boss-{v["boss"]}.png')), f'enemies/{v["boss"]}', maxw=720)
    if have(f'sheet-{z}'):
        pieces = split(key(f'v2/out/sheet-{z}.png'), 6, 3)
        for eid, piece in zip(v['regular'], pieces): packed[eid] = save(piece, f'enemies/{eid}', maxdim=400)
if have('tail-tips'):
    for el, piece in zip(TIPS, split(key('v2/out/tail-tips.png'), 8, 4)): packed[f'tip-{el}'] = save(piece, f'tips/{el}', maxdim=160)
if have('tail-tips-2'):
    for el, piece in zip(TIPS2, split(key('v2/out/tail-tips-2.png'), 4, 4)): packed[f'tip-{el}'] = save(piece, f'tips/{el}', maxdim=160)
if have('fx'):
    for n, piece in zip(['puff', 'slash', 'spark'], split(key('v2/out/fx.png'), 3, 3)): packed[f'fx-{n}'] = save(piece, f'fx/{n}', maxdim=240)
for z in list(ZONES) + ['roost']:
    if have(f'bg-{z}'):
        bd = Image.open(f'v2/out/bg-{z}.png').convert('RGB')
        w = round(bd.height * 16 / 11); x = (bd.width - w) // 2
        bd = bd.crop((x, 0, x + w, bd.height)).resize((1280, 880), Image.LANCZOS)
        os.makedirs(f'{OUT}/backdrops', exist_ok=True)
        bd.save(f'{OUT}/backdrops/{z}.webp', quality=82, method=6); packed[f'bg-{z}'] = [1280, 880]
# ---- attack poses: the same character at the same drawing scale, placed relative to the idle image's box
# Sheets whose attack version came out unusable (wrong count or order) are listed here and keep idle art only.
SKIP_SHEET_POSES = set()
POSE_SCALE = {'rider-sword': 1.32, 'rider-staff': 1.22, 'rider-bow': 1.1, 'dragon-hatchling': 0.86,
              'thunder-goat': 1.2, 'granite-ram': 1.2, 'rust-sprite': 1.15, 'gull-bandit': 1.15, 'big-pincher': 1.15, 'thunderhead': 1.15, 'gale-hawk': 1.1}
def feet_center(img):
    a = np.asarray(img.getchannel('A')) > 40
    rows = a[int(a.shape[0] * 0.9):]
    xs = np.where(rows.any(axis=0))[0]
    return (xs.min() + xs.max()) / 2
def pose_imgs(idle, att, out_name, idle_w, pad=(0, 0), apad=(0, 0), scale=1.0):
    """Pack an attack pose scaled like its idle image, and record its box in fractions of the idle image as packed."""
    f = idle_w / idle.width                                   # the idle's resize factor
    iw, ih = idle.width * f + pad[0], idle.height * f + pad[1]   # the idle image as packed
    # scale: a correction for poses the model drew smaller or larger in the frame than the idle.
    aw, ah = att.width * f * scale, att.height * f * scale
    left = (pad[0] + feet_center(idle) * f) - feet_center(att) * f * scale
    top = ih - ah
    att = att.resize((round(aw), round(ah)), Image.LANCZOS)
    # apad: transparent margin (left, top) so a tail tip drawn at load has room; the box grows to match.
    out = Image.new('RGBA', (att.width + apad[0], att.height + apad[1]), (0, 0, 0, 0)); out.paste(att, apad)
    packed[f'{out_name}-attack'] = save(out, f'{out_name}-attack', q=88)
    packed[f'{out_name}-attack-box'] = [round((left - apad[0]) / iw, 4), round((top - apad[1]) / ih, 4), round(out.width / iw, 4), round(out.height / ih, 4)]
def pose(idle_name, out_name, idle_w, pad=(0, 0), apad=(0, 0), scale=1.0):
    if not (have(idle_name) and have(f'{idle_name}-attack')): return
    pose_imgs(crop(key(f'v2/out/{idle_name}.png')), crop(key(f'v2/out/{idle_name}-attack.png')), out_name, idle_w, pad, apad, scale)
for stage in ['hatchling', 'juvenile', 'adult', 'elder']:
    pose(f'dragon-{stage}', f'dragon-{stage}', 640, PAD.get(stage, (0, 0)), (80, 30), POSE_SCALE.get(f'dragon-{stage}', 1))
for w in ['sword', 'bow', 'staff']:
    if have(f'rider-{w}'):
        idle = crop(key(f'v2/out/rider-{w}.png')); k = min(1, 460 / max(idle.size))
        pose(f'rider-{w}', f'rider-{w}', idle.width * k, scale=POSE_SCALE.get(f'rider-{w}', 1))

# ---- enemy attack poses: bosses alone, the others from a second sheet in the same order as the first
for z, v in ZONES.items():
    b = v['boss']
    if have(f'boss-{b}') and have(f'boss-{b}-attack'):
        idle = crop(key(f'v2/out/boss-{b}.png'))
        pose_imgs(idle, crop(key(f'v2/out/boss-{b}-attack.png')), f'enemies/{b}', min(720, idle.width), scale=POSE_SCALE.get(b, 1))
    if have(f'sheet-{z}') and have(f'sheet-{z}-attack') and z not in SKIP_SHEET_POSES:
        idles = split(key(f'v2/out/sheet-{z}.png'), 6, 3); atts = split(key(f'v2/out/sheet-{z}-attack.png'), 6, 3)
        for eid, idle, att in zip(v['regular'], idles, atts):
            k = min(1, 400 / max(idle.size))
            pose_imgs(idle, att, f'enemies/{eid}', idle.width * k, scale=POSE_SCALE.get(eid, 1))

# ---- breath effects, one per element
if have('fx-breath'):
    for el, piece in zip(TIPS, split(key('v2/out/fx-breath.png'), 8, 4)): packed[f'fx-breath-{el}'] = save(piece, f'fx/breath-{el}', maxdim=240)
if have('fx-breath-2'):
    for el, piece in zip(TIPS2, split(key('v2/out/fx-breath-2.png'), 4, 4)): packed[f'fx-breath-{el}'] = save(piece, f'fx/breath-{el}', maxdim=240)

# ---- the egg: fitted to the old egg's spot on a 480 x 600 canvas (so the crack overlays line up), plus its two halves
if have('egg'):
    egg = crop(key('v2/out/egg.png'), pad=0)
    bw, bh = 376, 548                                         # the SVG egg spans x 13..107 and y 8..145 of 120 x 150
    k = min(bw / egg.width, bh / egg.height)
    egg = egg.resize((round(egg.width * k), round(egg.height * k)), Image.LANCZOS)
    canvas = Image.new('RGBA', (480, 600), (0, 0, 0, 0)); canvas.paste(egg, ((480 - egg.width) // 2, 580 - egg.height))
    os.makedirs(f'{REPO}/src/art/eggs', exist_ok=True)
    canvas.save(f'{REPO}/src/art/eggs/egg.webp', quality=90, method=6)
    yy, xx = np.mgrid[0:600, 0:480]
    zig = 300 + 26 * (2 * np.abs(((xx / 60) % 2) - 1) - 1)    # a zigzag crack line across the middle
    arr = np.asarray(canvas)
    for name, mask in [('egg-top', yy < zig), ('egg-bottom', yy >= zig)]:
        half = arr.copy(); half[..., 3] = np.where(mask, half[..., 3], 0)
        Image.fromarray(half, 'RGBA').save(f'{REPO}/src/art/eggs/{name}.webp', quality=90, method=6)
    packed['egg'] = [480, 600]

# ---- UI icons, cut from sheets
ICONS = {
 'icons-status': (4, ['status-blind', 'status-burn', 'status-chill', 'status-crack', 'status-fade', 'status-fury', 'status-harden', 'status-root', 'status-shock', 'status-soak', 'status-taunt', 'status-ward']),
 'icons-battle': (4, ['intent-attack', 'intent-big', 'intent-buff', 'intent-heal', 'intent-shift', 'item-potion', 'item-mana-tonic', 'item-dragon-treat', 'gold', 'ember', 'xp', 'bond']),
 'icons-care': (4, ['food-blossom-bun', 'food-char-pepper', 'food-cocoa-cake', 'food-harvest-pie', 'food-mossberry-tart', 'food-river-trout', 'food-sunfruit', 'food-sweetroot', 'feed', 'groom', 'rest', 'egg']),
 'icons-places': (4, ['building-expeditions', 'building-hatchery', 'building-nest', 'building-pantry', 'building-training', 'town', 'lock', 'event']),
}
for sheet, (cols, names) in ICONS.items():
    if not have(sheet): continue
    for n, piece in zip(names, split(key(f'v2/out/{sheet}.png'), len(names), cols)):
        k = 128 / max(piece.size); piece = piece.resize((max(1, round(piece.width * k)), max(1, round(piece.height * k))), Image.LANCZOS)
        sq = Image.new('RGBA', (136, 136), (0, 0, 0, 0)); sq.paste(piece, ((136 - piece.width) // 2, (136 - piece.height) // 2))
        os.makedirs(f'{REPO}/src/art/icons', exist_ok=True)
        sq.save(f'{REPO}/src/art/icons/{n}.webp', quality=88, method=6); packed[f'icon-{n}'] = [136, 136]
json.dump(packed, open('v2/packed.json', 'w'), indent=1)
print(len(packed), 'packed')
