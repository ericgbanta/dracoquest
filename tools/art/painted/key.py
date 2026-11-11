"""Cut a character out of a flat green background: soft alpha from green dominance, then remove green spill."""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert('RGB')).astype(np.float32) / 255
r, g, b = im[..., 0], im[..., 1], im[..., 2]
dom = g - np.maximum(r, b)              # how much greener than anything else
alpha = np.clip(1 - (dom - 0.10) / 0.30, 0, 1)
# Only pixels connected to the border background may go transparent (keeps green-ish details inside the body).
from scipy import ndimage as ndi
bg = alpha < 0.5
lab, n = ndi.label(bg)
edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
sizes = ndi.sum(bg, lab, range(1, n + 1))
keep = np.zeros(n + 1, bool)
for i in range(1, n + 1):
    keep[i] = i in edge or sizes[i - 1] > 400   # enclosed pockets of background (between legs, under wings)
outside = ndi.binary_dilation(keep[lab], iterations=3)
alpha = np.where(outside, alpha, 1.0)
# Despill: cap green at the larger of red and blue wherever the edge is partly transparent or green-tinted.
spill = np.clip(g - np.maximum(r, b), 0, 1) * (outside | (alpha < 1))
g2 = g - spill
out = np.dstack([r, g2, b, alpha])
img = Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA')
a = img.getchannel('A').filter(ImageFilter.GaussianBlur(0.6))
img.putalpha(a)
bbox = img.getchannel('A').point(lambda v: 255 if v > 8 else 0).getbbox()
print('bbox', bbox, 'size', img.size)
img.save(dst)
