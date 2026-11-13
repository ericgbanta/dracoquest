import palette from '../../art/palette.json';
import type { VariantId } from '../../core/types';

/**
 * Player colors for painted dragon art. The art is drawn with a red body and a gold belly and
 * wings (docs/ART_STYLE.md); this swaps those two color families for a dragon's own colors, once,
 * when the image loads. Each pixel keeps its tone, so the flat shadow shapes survive.
 * Pure: it works on a pixel array, so it runs under Vitest.
 */

const K = palette.paintedKeys;

/** Which family a pixel belongs to: 1 the body color, 2 the second color, 0 neither. */
export function colorFamily(r: number, g: number, b: number): 0 | 1 | 2 {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const chroma = max - min;
  if (chroma < K.minChroma) return 0;
  const hue = (max === r ? ((g - b) / chroma + 6) % 6 : max === g ? (b - r) / chroma + 2 : (r - g) / chroma + 4) * 60;
  if (hue < K.primaryHueMax || hue >= K.primaryHueWrap) return 1;
  // Gold, but not the cream of horns and claws, which is paler (a high darkest channel).
  if (hue >= K.secondaryHue[0]! && hue < K.secondaryHue[1]! && (chroma >= K.secondaryChroma || min < K.creamMin)) return 2;
  return 0;
}

const lum = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

/** The brightness of a family's flat base tone: the most common brightness among its pixels. */
function baseTone(px: Uint8ClampedArray, family: 1 | 2): number {
  const bins = new Uint32Array(64);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3]! > 128 && colorFamily(px[i]!, px[i + 1]!, px[i + 2]!) === family) bins[Math.min(63, Math.floor(lum(px[i]!, px[i + 1]!, px[i + 2]!) / 4))]!++;
  }
  let best = -1;
  let at = 0;
  // Ties go to the brighter tone: the base is lighter than its shadow.
  bins.forEach((n, i) => { if (n > 0 && n >= best) { best = n; at = i; } });
  return best > 0 ? at * 4 + 2 : 0;
}

/** Recolor RGBA pixels in place: the body family to `primary`, the second family to `secondary`. */
export function recolorPixels(px: Uint8ClampedArray, primary: string, secondary: string): void {
  const to = [rgb(primary), rgb(secondary)] as const;
  const base = [baseTone(px, 1), baseTone(px, 2)] as const;
  const dark = rgb(palette.outline);
  for (let i = 0; i < px.length; i += 4) {
    if (px[i + 3] === 0) continue;
    const fam = colorFamily(px[i]!, px[i + 1]!, px[i + 2]!);
    if (fam === 0 || base[fam - 1] === 0) continue;
    const tone = lum(px[i]!, px[i + 1]!, px[i + 2]!) / base[fam - 1]!;
    const c = to[fam - 1]!;
    for (let k = 0; k < 3; k++) {
      // Darker than the base: scale the color down and lean a little toward the outline color.
      // Lighter: mix toward white.
      const v = tone <= 1
        ? c[k]! * tone + (dark[k]! - c[k]! * tone) * (1 - tone) * K.shadowTowardOutline
        : c[k]! + (255 - c[k]!) * Math.min(1, (tone - 1) * K.highlightGain);
      px[i + k] = Math.round(Math.max(0, Math.min(255, v)));
    }
  }
}

const F = palette.finishes;

/** Each pixel's color family (see colorFamily), worked out before recoloring so finishes know the body from the belly. */
export function familyMap(px: Uint8ClampedArray): Uint8Array {
  const out = new Uint8Array(px.length / 4);
  for (let i = 0; i < px.length; i += 4) if (px[i + 3]! > 0) out[i / 4] = colorFamily(px[i]!, px[i + 1]!, px[i + 2]!);
  return out;
}

const mix = (px: Uint8ClampedArray, i: number, to: [number, number, number], t: number) => {
  for (let k = 0; k < 3; k++) px[i + k] = Math.round(px[i + k]! + (to[k]! - px[i + k]!) * t);
};

/** A small repeatable hash in 0..1 for a grid cell, so speckles land in the same places every load. */
const hash = (x: number, y: number) => {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/**
 * Draw a rare finish on recolored dragon pixels, in place. `family` comes from familyMap before
 * recoloring. Shimmer: diagonal bands of sheen. Starry: speckles on the body. Ghost: see-through
 * and paler. Ember-eyed: the second color glows hot. (Glows around the outline are drawn by the caller.)
 */
export function applyFinish(px: Uint8ClampedArray, width: number, family: Uint8Array, finish: VariantId): void {
  const white: [number, number, number] = [255, 255, 255];
  const n = px.length / 4;
  for (let p = 0; p < n; p++) {
    const i = p * 4;
    if (px[i + 3] === 0) continue;
    const x = p % width;
    const y = Math.floor(p / width);
    const fam = family[p]!;
    switch (finish) {
      case 'shimmer': {
        if (!fam) break;
        const band = ((x + y) / (width * F.shimmer.bandWidth)) % 1;
        const sheen = Math.max(0, 1 - Math.abs(band - 0.5) * 4);
        if (sheen > 0) mix(px, i, white, sheen * F.shimmer.strength);
        break;
      }
      case 'starry': {
        if (fam !== 1) break;
        const c = F.starry.cell;
        if (hash(Math.floor(x / c), Math.floor(y / c)) < F.starry.density) mix(px, i, rgb(F.starry.color), 0.9);
        break;
      }
      case 'ghost':
        px[i + 3] = Math.round(px[i + 3]! * F.ghost.alpha);
        mix(px, i, white, F.ghost.lighten);
        break;
      case 'ember-eyed':
        if (fam === 2) mix(px, i, rgb(F['ember-eyed'].color), F['ember-eyed'].strength);
        break;
    }
  }
}

/** The glow drawn around the whole dragon for a finish, if it has one. */
export function finishGlow(finish: VariantId | null | undefined): { color: string; blur: number } | null {
  if (finish === 'ghost') return { color: F.ghost.glow, blur: F.ghost.glowBlur };
  if (finish === 'ember-eyed') return { color: F['ember-eyed'].glow, blur: F['ember-eyed'].glowBlur };
  return null;
}
