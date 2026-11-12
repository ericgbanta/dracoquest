import { describe, expect, it } from 'vitest';
import assets from '../src/art/assets.json';
import { DataError, gameData, validateCombat, validateElements } from '../src/core/data';

describe('data loader', () => {
  it('loads all data files', () => {
    expect(gameData.elements.ids).toHaveLength(8);
    expect(gameData.elements.ring).toEqual(['fire', 'frost', 'verdant', 'stone', 'storm', 'tide']);
    expect(gameData.elements.starters).toEqual(['fire', 'tide', 'verdant']);
    expect(gameData.elements.multipliers.strong).toBe(1.5);
    expect(gameData.elements.multipliers.neutral).toBe(1);
    expect(gameData.combat.critMultiplier).toBe(1.5);
    expect(gameData.progression.levelCap).toBe(50);
    expect(gameData.progression.secondPartnerRiderLevel).toBe(25);
  });

  it('rejects a missing number', () => {
    expect(() => validateCombat({ statDivisor: 50 })).toThrow(DataError);
  });

  it('rejects an unknown element id', () => {
    expect(() =>
      validateElements({
        ids: ['fire'],
        ring: ['fire', 'lava'],
        pairs: [],
        starters: [],
        multipliers: { strong: 1.5, neutral: 1, weak: 0.75, same: 0.5 },
        info: {},
      }),
    ).toThrow(/lava/);
  });
});

describe('content', () => {
  it('has the Mossy Hollow zone with 5 regular enemies and the Bramble Troll', () => {
    const zone = gameData.zones.find((z) => z.id === 'mossy-hollow')!;
    const regular = new Set(zone.encounters.flatMap((e) => e.enemies));
    expect(regular.size).toBe(5);
    expect(zone.boss.enemy).toBe('bramble-troll');
    expect(gameData.enemies['bramble-troll']!.boss).toBe(true);
  });

  it('gives every element a status and an info entry', () => {
    for (const id of gameData.elements.ids) {
      expect(gameData.statuses[gameData.elements.info[id].status]).toBeDefined();
    }
  });
});

describe('region maps', () => {
  it('give every area in a mapped region a pin on the map', () => {
    for (const r of gameData.regions.regions) {
      if (!r.map) continue;
      expect(Object.keys(assets.backdrops), r.id).toContain(r.map.art);
      for (const id of r.zones) {
        const pin = r.map.pins[id];
        expect(pin, `${r.id}: ${id}`).toBeDefined();
        for (const v of pin!) expect(v).toBeGreaterThanOrEqual(0);
        for (const v of pin!) expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});
