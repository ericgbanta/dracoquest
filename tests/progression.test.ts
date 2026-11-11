import { describe, expect, it } from 'vitest';
import { gameData as data } from '../src/core/data';
import { addBond, allocateDragon, allocateRider, enemyXp, giveDragonXp, giveRiderXp, xpToNext } from '../src/core/progression';
import { dragonMaxHp, hatchDragon, newRider, riderMaxHp } from '../src/core/characters';
import { createRng } from '../src/core/rng';

const dragon = () => hatchDragon(data, createRng(1), { id: 'd', name: 'Pip', element: 'fire', colors: { primary: '#f00', secondary: '#000' }, now: 0 });

describe('leveling', () => {
  it('uses 50 x level^1.6 from progression.json', () => {
    expect(xpToNext(data.progression, 1)).toBe(50);
    expect(xpToNext(data.progression, 2)).toBe(Math.round(50 * 2 ** 1.6));
    expect(xpToNext(data.progression, 10)).toBe(Math.round(50 * 10 ** 1.6));
  });

  it('levels up and grants 3 stat points per level', () => {
    const r = giveRiderXp(data, newRider(data, 'Ash'), 50);
    expect(r.state.level).toBe(2);
    expect(r.state.xp).toBe(0);
    expect(r.state.statPoints).toBe(3);
    expect(r.levelsGained).toBe(1);
  });

  it('handles several levels at once and keeps leftover XP', () => {
    const need = xpToNext(data.progression, 1) + xpToNext(data.progression, 2);
    const r = giveRiderXp(data, newRider(data, 'Ash'), need + 7);
    expect(r.state.level).toBe(3);
    expect(r.state.xp).toBe(7);
    expect(r.state.statPoints).toBe(6);
  });

  it('caps a hatchling at level 9 without losing XP past the threshold', () => {
    const r = giveDragonXp(data, dragon(), 10_000_000);
    expect(r.state.level).toBe(9);
    expect(r.state.xp).toBe(xpToNext(data.progression, 9) - 1);
  });

  it('caps the rider at the level cap', () => {
    const r = giveRiderXp(data, newRider(data, 'Ash'), 1e12);
    expect(r.state.level).toBe(data.progression.levelCap);
  });

  it('spends stat points and refuses to overspend', () => {
    const r = { ...newRider(data, 'Ash'), statPoints: 2 };
    const spent = allocateRider(r, 'vigor', 2);
    expect(spent.stats.vigor).toBe(r.stats.vigor + 2);
    expect(spent.statPoints).toBe(0);
    expect(() => allocateRider(spent, 'vigor')).toThrow(RangeError);
    expect(() => allocateDragon(dragon(), 'might')).toThrow(RangeError);
  });

  it('raises max HP from Vigor and Scale', () => {
    const r = newRider(data, 'Ash');
    expect(riderMaxHp(data, { ...r, stats: { ...r.stats, vigor: r.stats.vigor + 1 } })).toBe(riderMaxHp(data, r) + data.combat.rider.hpPerVigor);
    const d = dragon();
    expect(dragonMaxHp(data, { ...d, stats: { ...d.stats, scale: d.stats.scale + 1 } })).toBe(dragonMaxHp(data, d) + data.combat.dragon.hpPerScale);
  });

  it('scales enemy XP with level', () => {
    expect(enemyXp(data.progression, 4)).toBeGreaterThan(enemyXp(data.progression, 3));
    expect(enemyXp(data.progression, 2, 2)).toBe(Math.round(data.progression.enemyXpBase * 2 ** data.progression.enemyXpExponent * 2));
  });

  it('keeps bond between 0 and 100', () => {
    expect(addBond(data, dragon(), 500).bond).toBe(100);
    expect(addBond(data, dragon(), -5).bond).toBe(0);
  });

  it('applies the element bonus and hides a favorite food at hatching', () => {
    const d = dragon();
    expect(d.stats.might).toBe(data.dragons.baseStats.might + 2);
    expect(data.foods.map((f) => f.id)).toContain(d.favoriteFood);
    expect(d.hp).toBe(dragonMaxHp(data, d));
  });
});
