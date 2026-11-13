"""Find where a breed's tail ends in each packed stage image and preview the element tail tip drawn there.
Run from the repo root: python3 tools/content/find_tail_tips.py <breed> <preview.png> ['{"elder-attack": 0.2}']
It takes the topmost opaque pixel in the left 40 percent (30 for attack poses; the JSON narrows it per image).
That suits a tail that curls up (Wyvern); the Wyrm's tail points left, so its tips used the leftmost pixel instead."""
import sys, json, numpy as np
from PIL import Image
breed = sys.argv[1]; out = sys.argv[2]
res = {}
tip = Image.open('src/art/painted/tips/fire.webp').convert('RGBA')
sheet = []
for stage in ['hatchling', 'juvenile', 'adult', 'elder']:
    for kind in ['', '-attack']:
        p = f'src/art/painted/{breed}-{stage}{kind}.webp'
        im = Image.open(p).convert('RGBA'); a = np.asarray(im)[..., 3] > 100
        w, h = im.size; LIM = json.loads(sys.argv[3]) if len(sys.argv) > 3 else {}
        left = a[:, : int(w * LIM.get(f'{stage}{kind}', 0.4 if kind == '' else 0.3))]
        ys, xs = np.where(left)
        i = np.argmin(ys); x, y = xs[i], ys[i]
        width = 0.13 if kind == '' else 0.11
        at = [round(x / w - 0.02, 3), round(y / h + 0.06, 3)]
        res[f'{stage}{kind}'] = {"at": at, "width": width, "rotate": -10}
        # preview: tip bottom-left at `at`, `width` of the image wide
        tw = int(width * w); th = int(tw * tip.height / tip.width)
        t = tip.resize((tw, th)).rotate(10, expand=True)
        prev = Image.new('RGBA', im.size, (60, 50, 90, 255)); prev.alpha_composite(im)
        prev.alpha_composite(t, (max(0, int(at[0] * w)), max(0, int(at[1] * h) - t.height)))
        prev.thumbnail((320, 320)); sheet.append(prev)
o = Image.new('RGBA', (320 * 4, 320 * 2), (30, 30, 30, 255))
for k, im in enumerate(sheet): o.paste(im, ((k // 2) * 320, (k % 2) * 320))
o.save(out); print(json.dumps(res))
