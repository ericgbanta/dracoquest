import { describe, expect, it } from 'vitest';
import { DataError, gameData, validateCombat, validateElements } from '../src/core/data';

describe('data loader', () => {
  it('loads all data files', () => {
    expect(gameData.elements.ids).toHaveLength(8);
    expect(gameData.elements.ring).toEqual(['fire', 'frost', 'verdant', 'stone', 'storm', 'tide']);
    expect(gameData.elements.starters).toEqual(['fire', 'tide', 'verdant']);
    expect(gameData.elements.multipliers).toEqual({ strong: 1.5, neutral: 1, weak: 0.75, same: 0.5 });
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
      }),
    ).toThrow(/lava/);
  });
});
