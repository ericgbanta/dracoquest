import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { beats, elementMultiplier, matchup, weaknessesOf } from '../src/core/elements';

const E = gameData.elements;
const M = E.multipliers;

describe('elements', () => {
  it('follows the ring Fire > Frost > Verdant > Stone > Storm > Tide > Fire', () => {
    expect(beats(E, 'fire', 'frost')).toBe(true);
    expect(beats(E, 'frost', 'verdant')).toBe(true);
    expect(beats(E, 'verdant', 'stone')).toBe(true);
    expect(beats(E, 'stone', 'storm')).toBe(true);
    expect(beats(E, 'storm', 'tide')).toBe(true);
    expect(beats(E, 'tide', 'fire')).toBe(true);
    expect(beats(E, 'fire', 'verdant')).toBe(false);
    expect(beats(E, 'frost', 'fire')).toBe(false);
  });

  it('makes Light and Shadow beat only each other', () => {
    expect(beats(E, 'light', 'shadow')).toBe(true);
    expect(beats(E, 'shadow', 'light')).toBe(true);
    expect(beats(E, 'light', 'fire')).toBe(false);
    expect(beats(E, 'fire', 'light')).toBe(false);
    expect(matchup(E, 'light', 'shadow')).toBe('strong');
  });

  it('uses the multipliers from elements.json', () => {
    expect(elementMultiplier(E, 'fire', 'frost')).toBe(M.strong);
    expect(elementMultiplier(E, 'frost', 'fire')).toBe(M.weak);
    expect(elementMultiplier(E, 'fire', 'stone')).toBe(M.neutral);
    expect(elementMultiplier(E, 'fire', 'fire')).toBe(M.same);
    expect(elementMultiplier(E, null, 'fire')).toBe(M.neutral);
    expect(elementMultiplier(E, 'fire', null)).toBe(M.neutral);
  });

  it('lets a resist override replace the matchup', () => {
    expect(elementMultiplier(E, 'verdant', 'stone', { verdant: 1.25 })).toBe(1.25);
    expect(elementMultiplier(E, 'fire', 'stone', { verdant: 1.25 })).toBe(M.neutral);
  });

  it('lists weaknesses', () => {
    expect(weaknessesOf(E, 'verdant')).toEqual(['frost']);
    expect(weaknessesOf(E, 'shadow')).toEqual(['light']);
  });
});
