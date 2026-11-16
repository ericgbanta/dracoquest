import { describe, expect, it } from 'vitest';
import { gameData as data, validateLooks, DataError } from '../src/core/data';
import { GameError, randomRiderLook, setRiderLook } from '../src/core/game';
import { CURRENT_VERSION, exportSaveCode, importSaveCode, newSave, parseSave } from '../src/core/save';
import { colorFamily, recolorFamilies, recolorPixels, recolorRider, riderFamily } from '../src/ui/stage/tint';
import fixtureV16 from './fixtures/save-v16.json';

const NOW = 1_700_000_000_000;
const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
const pixels = (...colors: string[]) => new Uint8ClampedArray(colors.flatMap((c) => [...hex(c), 255]));
const at = (px: Uint8ClampedArray, i: number) => `#${[0, 1, 2].map((k) => px[i * 4 + k]!.toString(16).padStart(2, '0')).join('')}`;
const close = (a: string, b: string, by = 6) => hex(a).every((v, i) => Math.abs(v - hex(b)[i]!) <= by);

// Colors measured from the painted rider (the hair after rekey_rider.py).
const CAPE = '#e42c24';
const CAPE_SHADE = '#7c141c';
const TUNIC = '#248c74';
const TUNIC_SHADE = '#145c5c';
const TROUSERS = '#2c547c';
const SKIN = '#fcbc7c';
const SKIN_SHADE = '#e8a37f';
const HAIR_KEY = '#96eb28';
const LEATHER = '#8c3c24';
const LEATHER_LIGHT = '#b4642c';
const BUCKLE = '#f4b42c';
const STEEL = '#c4ccd4';
const INK = '#1d1a2b';
const GEM = '#8c4cdc';

describe('the rider\'s color families', () => {
  it('sorts the painted colors into cape, tunic, trousers, skin and hair', () => {
    const fam = (c: string) => riderFamily(...hex(c));
    expect([CAPE, CAPE_SHADE].map(fam)).toEqual([1, 1]);
    expect([TUNIC, TUNIC_SHADE].map(fam)).toEqual([2, 2]);
    expect(fam(TROUSERS)).toBe(3);
    expect([SKIN, SKIN_SHADE].map(fam)).toEqual([4, 4]);
    expect(fam(HAIR_KEY)).toBe(5);
  });

  it('leaves leather, buckles, steel, the outline and the staff gem alone', () => {
    expect([LEATHER, LEATHER_LIGHT, BUCKLE, STEEL, INK, GEM, '#ffffff'].map((c) => riderFamily(...hex(c)))).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it('recolors each family to the look and keeps shadows darker', () => {
    const px = pixels(CAPE, CAPE, CAPE, CAPE_SHADE, TUNIC, TUNIC, TROUSERS, SKIN, SKIN, HAIR_KEY, LEATHER, INK);
    const look = { cape: '#3f6fd8', tunic: '#7a54c8', trousers: '#6a6f80', skin: '#6e3d22', hair: '#f2dd9a' };
    recolorRider(px, look);
    expect(close(at(px, 0), look.cape)).toBe(true);
    expect(close(at(px, 4), look.tunic)).toBe(true);
    expect(close(at(px, 6), look.trousers)).toBe(true);
    expect(close(at(px, 7), look.skin)).toBe(true);
    expect(close(at(px, 9), look.hair)).toBe(true);
    // The cape's shadow is darker than its base, and untouched colors stay put.
    expect(hex(at(px, 3)).reduce((a, b) => a + b)).toBeLessThan(hex(at(px, 0)).reduce((a, b) => a + b));
    expect(at(px, 10)).toBe(LEATHER);
    expect(at(px, 11)).toBe(INK);
  });

  it('the default look brings the key-colored hair back to brown', () => {
    const px = pixels(HAIR_KEY, HAIR_KEY, SKIN);
    recolorRider(px, data.looks.default);
    expect(close(at(px, 0), data.looks.default.hair)).toBe(true);
    expect(close(at(px, 2), data.looks.default.skin)).toBe(true);
  });

  it('dragons recolor exactly as before through the shared code', () => {
    const art = ['#f83818', '#f83818', '#a81808', '#f8c818', '#f8c818', '#e88808', '#f8e8b8', '#080828'];
    const a = pixels(...art);
    const b = pixels(...art);
    recolorPixels(a, '#3f8fd8', '#7fc8f0');
    recolorFamilies(b, colorFamily, ['#3f8fd8', '#7fc8f0']);
    expect([...a]).toEqual([...b]);
    // Pinned bytes, so a change to the shared code that shifts dragon colors fails here.
    expect([0, 2, 3, 5, 6, 7].map((i) => at(a, i))).toEqual(['#3f8fd7', '#254f77', '#7fc8f0', '#5e93b2', '#f8e8b8', '#080828']);
  });
});

describe('looks data', () => {
  it('has five parts, six ready-made looks and a default made of listed swatches', () => {
    expect(data.looks.parts.map((p) => p.id)).toEqual(['skin', 'hair', 'tunic', 'trousers', 'cape']);
    expect(data.looks.presets).toHaveLength(6);
    expect(data.looks.presets[0]!.look).toEqual(data.looks.default);
  });

  it('rejects a look that uses a color outside the swatches', () => {
    const bad = JSON.parse(JSON.stringify(data.looks));
    bad.default.hair = '#123456';
    expect(() => validateLooks(bad)).toThrow(DataError);
  });
});

describe('changing the rider\'s look', () => {
  const look = data.looks.presets[2]!.look;

  it('sets the five colors', () => {
    expect(setRiderLook(data, newSave(NOW), look).rider.look).toEqual(look);
  });

  it('refuses a color that is not a swatch for that part', () => {
    // A cloth color is not a skin tone.
    expect(() => setRiderLook(data, newSave(NOW), { ...look, skin: '#3f6fd8' })).toThrow(GameError);
    expect(() => setRiderLook(data, newSave(NOW), { ...look, cape: 'red' })).toThrow(GameError);
  });

  it('a random look is made of swatches and repeats for the same seed', () => {
    const s = { ...newSave(NOW), seed: 42 };
    const a = randomRiderLook(data, s);
    expect(randomRiderLook(data, s).look).toEqual(a.look);
    expect(() => setRiderLook(data, a.save, a.look)).not.toThrow();
    expect(a.save.seed).not.toBe(s.seed);
  });

  it('survives an export and import', () => {
    const s = setRiderLook(data, newSave(NOW), look);
    expect(importSaveCode(exportSaveCode(s)).rider.look).toEqual(look);
  });
});

describe('save v17', () => {
  it('loads a version 16 save with the look the rider was painted in', () => {
    expect(fixtureV16.version).toBe(16);
    expect('look' in fixtureV16.rider).toBe(false);
    const s = parseSave(JSON.stringify(fixtureV16));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Sixteen');
    expect(s.rider.look).toEqual(data.looks.default);
  });

  it('new saves start with the default look', () => {
    expect(newSave(NOW).rider.look).toEqual(data.looks.default);
  });
});
