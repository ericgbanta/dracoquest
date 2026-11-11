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
        keep[i] = i in edge or (sizes[i - 1] > 300 and means[i - 1] > 0.6)
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
if have('fx'):
    for n, piece in zip(['puff', 'slash', 'spark'], split(key('v2/out/fx.png'), 3, 3)): packed[f'fx-{n}'] = save(piece, f'fx/{n}', maxdim=240)
for z in list(ZONES) + ['roost']:
    if have(f'bg-{z}'):
        bd = Image.open(f'v2/out/bg-{z}.png').convert('RGB')
        w = round(bd.height * 16 / 11); x = (bd.width - w) // 2
        bd = bd.crop((x, 0, x + w, bd.height)).resize((1280, 880), Image.LANCZOS)
        os.makedirs(f'{OUT}/backdrops', exist_ok=True)
        bd.save(f'{OUT}/backdrops/{z}.webp', quality=82, method=6); packed[f'bg-{z}'] = [1280, 880]
json.dump(packed, open('v2/packed.json', 'w'), indent=1)
print(len(packed), 'packed')
