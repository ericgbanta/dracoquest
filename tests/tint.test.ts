import { describe, expect, it } from 'vitest';
import { applyFinish, colorFamily, familyMap, recolorPixels } from '../src/ui/stage/tint';

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const pixels = (...colors: string[]) => new Uint8ClampedArray(colors.flatMap((c) => [...hex(c), 255]));
const at = (px: Uint8ClampedArray, i: number) => `#${[0, 1, 2].map((k) => px[i * 4 + k]!.toString(16).padStart(2, '0')).join('')}`;

// Colors measured from the painted Adult dragon.
const RED = '#f83818';
const RED_SHADE = '#a81808';
const GOLD = '#f8c818';
const GOLD_SHADE = '#e88808';
const CREAM = '#f8e8b8';
const CREAM_SHADE = '#e8b888';
const INK = '#080828';

describe('player colors on painted dragon art', () => {
  it('sorts the art colors into body, second color and everything else', () => {
    expect([RED, RED_SHADE].map((c) => colorFamily(...(hex(c) as [number, number, number])))).toEqual([1, 1]);
    expect([GOLD, GOLD_SHADE].map((c) => colorFamily(...(hex(c) as [number, number, number])))).toEqual([2, 2]);
    expect([CREAM, CREAM_SHADE, INK, '#ffffff'].map((c) => colorFamily(...(hex(c) as [number, number, number])))).toEqual([0, 0, 0, 0]);
  });

  it('turns the base tones into the player colors and keeps shadows darker', () => {
    // Three base pixels per family so the base tone is the most common one.
    const px = pixels(RED, RED, RED, RED_SHADE, GOLD, GOLD, GOLD, GOLD_SHADE, CREAM, INK);
    recolorPixels(px, '#3f8fd8', '#7fc8f0');
    const close = (a: string, b: string) => hex(a).every((v, i) => Math.abs(v - hex(b)[i]!) <= 6);
    expect(close(at(px, 0), '#3f8fd8')).toBe(true);
    expect(close(at(px, 4), '#7fc8f0')).toBe(true);
    const sum = (h: string) => hex(h).reduce((a, b) => a + b, 0);
    expect(sum(at(px, 3))).toBeLessThan(sum(at(px, 0)));
    expect(sum(at(px, 7))).toBeLessThan(sum(at(px, 4)));
    // The shadow stays blue, not gray: blue is still its strongest channel.
    expect(hex(at(px, 3))[2]).toBeGreaterThan(hex(at(px, 3))[0]!);
    // Horns and the outline are untouched.
    expect(at(px, 8)).toBe(CREAM);
    expect(at(px, 9)).toBe(INK);
  });

  it('leaves transparent pixels alone', () => {
    const px = new Uint8ClampedArray([...hex(RED), 0, ...hex(RED), 255]);
    recolorPixels(px, '#00ff00', '#0000ff');
    expect(at(px, 0)).toBe(RED);
  });
});

describe('rare finishes', () => {
  const px4 = () => pixels(RED, RED, GOLD, CREAM);

  it('Ghost makes every pixel see-through and paler', () => {
    const px = px4();
    const fam = familyMap(px);
    recolorPixels(px, '#3f8fd8', '#7fc8f0');
    const before = Array.from(px);
    applyFinish(px, 4, fam, 'ghost');
    for (let i = 0; i < 4; i++) {
      expect(px[i * 4 + 3]).toBeLessThan(255);
      expect(px[i * 4]!).toBeGreaterThanOrEqual(before[i * 4]!);
    }
  });

  it('Ember-eyed warms only the second color', () => {
    const px = px4();
    const fam = familyMap(px);
    expect(Array.from(fam)).toEqual([1, 1, 2, 0]);
    recolorPixels(px, '#3f8fd8', '#7fc8f0');
    const before = Array.from(px);
    applyFinish(px, 4, fam, 'ember-eyed');
    expect(Array.from(px.slice(0, 8))).toEqual(before.slice(0, 8));
    expect(Array.from(px.slice(12, 16))).toEqual(before.slice(12, 16));
    expect(px[8]!).toBeGreaterThan(before[8]!); // more red: toward ember orange
  });

  it('Starry speckles land in the same places every time', () => {
    const big = () => pixels(...Array.from({ length: 64 * 64 }, () => RED));
    const a = big();
    const b = big();
    const fa = familyMap(a);
    applyFinish(a, 64, fa, 'starry');
    applyFinish(b, 64, familyMap(b), 'starry');
    expect(Array.from(a)).toEqual(Array.from(b));
    const changed = Array.from({ length: 64 * 64 }, (_, i) => a[i * 4] !== hex(RED)[0]).filter(Boolean).length;
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThan(64 * 64 * 0.2);
  });

  it('Shimmer brightens bands and leaves outlines alone', () => {
    const px = pixels(...Array.from({ length: 32 * 4 }, (_, i) => (i % 32 === 0 ? INK : RED)));
    const fam = familyMap(px);
    const before = Array.from(px);
    applyFinish(px, 32, fam, 'shimmer');
    expect(px[0]).toBe(before[0]); // the ink outline pixel
    expect(Array.from(px).some((v, i) => v > before[i]!)).toBe(true);
  });
});
