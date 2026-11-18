# Looks plan L0 (docs/LOOKS_PLAN.md): mark the rider's hair in a key color so the game can recolor it.
# The hair is painted the same brown as the leather, bow and staff, so hue alone can't find it. It is,
# though, the one big brown patch at the top of every rider image. This repaints that patch a yellow-green
# no other part of the rider uses, keeping each pixel's tone. The game then recolors by hue (riderKeys in
# src/art/palette.json, recolorFamilies in src/ui/stage/tint.ts).
# Usage: python3 tools/art/painted/rekey_rider.py <repo>. Needs numpy, scipy and Pillow.
# Run once on freshly packed rider art; an image that already has key-colored hair is skipped.
import sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi

REPO = sys.argv[1].rstrip('/')
NAMES = ['rider-sword', 'rider-sword-attack', 'rider-bow', 'rider-bow-attack', 'rider-staff', 'rider-staff-attack', 'rider-mounted']
KEY = np.array([150, 235, 40], float)   # hue about 86; the rider art has nothing between hue 60 and 140
TOP = 0.45                              # the hair's center is in the top 45 percent of the image

def hue_chroma(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx = a[..., :3].max(-1); mn = a[..., :3].min(-1); c = mx - mn
    h = np.zeros_like(mx); m = c > 0
    rm = m & (mx == r); gm = m & (mx == g) & ~rm; bm = m & ~rm & ~gm
    h[rm] = ((g - b)[rm] / c[rm]) % 6; h[gm] = (b - r)[gm] / c[gm] + 2; h[bm] = (r - g)[bm] / c[bm] + 4
    return h * 60, c

for name in NAMES:
    path = f'{REPO}/src/art/painted/{name}.webp'
    a = np.array(Image.open(path).convert('RGBA')).astype(float)
    h, c = hue_chroma(a)
    solid = a[..., 3] > 40
    if (solid & (c > 60) & (h >= 70) & (h < 130)).sum() > 500:
        print(name, 'already keyed, skipped'); continue
    lum = 0.299 * a[..., 0] + 0.587 * a[..., 1] + 0.114 * a[..., 2]
    # Warm browns. The hair's shadow tone leans red (hue near 5); it is told from the cape by its weak chroma.
    warm = solid & (((h >= 10) & (h < 46)) | (((h < 10) | (h >= 350)) & (c < 80)))
    brown = warm & (c > 30) & (lum < 150)
    lab, n = ndi.label(brown)
    best, size = 0, 0
    for i in range(1, n + 1):
        m = lab == i
        if m.sum() > size and ndi.center_of_mass(m)[0] / a.shape[0] < TOP: best, size = i, int(m.sum())
    hair = lab == best
    # Lighter streaks enclosed by the hair, and the soft edge pixels next to it.
    hair |= ndi.binary_fill_holes(hair) & warm & (c > 30)
    hair |= ndi.binary_dilation(hair, iterations=2) & warm & (c > 14) & (lum < 150)
    # The hair's flat base tone: its most common brightness.
    bins = np.bincount((lum[hair] / 4).astype(int), minlength=64)
    base = np.argmax(bins) * 4 + 2
    tone = (lum[hair] / base)[:, None]
    a[hair, :3] = np.clip(np.where(tone <= 1, KEY * tone, KEY + (255 - KEY) * np.minimum(1, (tone - 1) * 1.2)), 0, 255)
    Image.fromarray(a.astype('uint8')).save(path, quality=90, method=6)
    print(name, 'hair pixels', int(hair.sum()))
