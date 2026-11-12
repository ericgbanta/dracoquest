"""Recolor leftover key green inside a packed sprite (green the cutout could not reach, e.g. a glow inside a lantern).
Usage: python3 fix_green.py <file.webp> [hex color, default #5fcfb4]
Pixels close to pure #00ff00 become the given color, keeping their light and dark shading."""
import sys
import numpy as np
from PIL import Image

path = sys.argv[1]
target = np.array([int((sys.argv[2] if len(sys.argv) > 2 else '#5fcfb4').lstrip('#')[i:i + 2], 16) for i in (0, 2, 4)], dtype=float)
im = Image.open(path).convert('RGBA')
a = np.asarray(im).astype(float)
r, g, b = a[..., 0], a[..., 1], a[..., 2]
# "Key-like" green: green well above both red and blue.
mask = (g > 150) & (g - np.maximum(r, b) > 90) & (a[..., 3] > 0)
shade = (g / 255.0)[..., None]
a[..., :3] = np.where(mask[..., None], np.clip(target * (0.55 + 0.45 * shade), 0, 255), a[..., :3])
Image.fromarray(a.astype(np.uint8), 'RGBA').save(path, quality=86, method=6)
print(f'{path}: recolored {int(mask.sum())} pixels')
