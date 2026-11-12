"""Cut the app icon emblem out of its green background and save it for scripts/icons.mjs.
Run from the gen folder: python3 v2/icon_cut.py <repo>. Reads v2/out/app-icon-hatch.png."""
import sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

def key(path):
    """Same keying as pack.py: remove the flat green, keep enclosed shapes, clean green spill from the edges."""
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
        keep[i] = i in edge or (sizes[i - 1] > 12 and means[i - 1] > 0.6)
    outside = ndi.binary_dilation(keep[lab], iterations=3)
    alpha = np.where(outside, alpha, 1.0)
    spill = np.clip(g - np.maximum(r, b), 0, 1) * (outside | (alpha < 1))
    out = np.dstack([r, g - spill, b, alpha])
    img = Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')
    img.putalpha(img.getchannel('A').filter(ImageFilter.GaussianBlur(0.6)))
    return img

img = key('v2/out/app-icon-hatch.png')
bb = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
img = img.crop(bb)
side = max(img.size)  # center on a square canvas so the icon script can place it by its middle
sq = Image.new('RGBA', (side, side))
sq.paste(img, ((side - img.width) // 2, (side - img.height) // 2))
sq = sq.resize((640, 640), Image.LANCZOS)
sq.save(f'{sys.argv[1]}/scripts/icons/emblem.webp', quality=90, method=6)
print('emblem.webp', sq.size, 'art', img.size)
