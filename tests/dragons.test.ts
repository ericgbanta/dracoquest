import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { chooseEgg, hatchEgg, incubateEgg, layEgg, releaseEgg, takeHatchedEgg, upgradeBuilding, warmEgg, buyEgg } from '../src/core/game';
import { breedEgg, canMix, eggName, elementLabel, hybridName, newEgg, plainEgg, releaseValue } from '../src/core/eggs';
import { dragonBaseStats } from '../src/core/characters';
import { createRng } from '../src/core/rng';
import { CURRENT_VERSION, newSave, parseSave, type SaveData } from '../src/core/save';
import type { EggSpec } from '../src/core/types';
import fixtureV9 from './fixtures/save-v9.json';

const data = gameData;
const NOW = 1794355200000; // 2026-11-11

function hatched(): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  s = hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
  return { ...s, rider: { ...s.rider, gold: 50_000 }, embers: 500 };
}

describe('save v9 to v10', () => {
  it('turns egg counts into egg objects and gives dragons a breed', () => {
    expect(fixtureV9.version).toBe(9);
    const s = parseSave(JSON.stringify(fixtureV9));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Nine');
    expect(s.eggs).toEqual([plainEgg('storm'), plainEgg('tide')]);
    expect(s.roost.hatchery.eggs).toEqual([{ ...plainEgg('fire'), readyAt: 1763000000000 }]);
    expect(s.roost.levels.nesting).toBe(0);
    expect(s.roost.nesting).toBeNull();
    for (const d of s.dragons) {
      expect(d).toMatchObject({ breed: 'dragon', element2: null, variant: null, lastBredAt: 0 });
    }
    expect(s.embers).toBe(12);
  });

  it('keeps a migrated egg playable: incubate it, hatch it, and it becomes a dragon', () => {
    let s = parseSave(JSON.stringify(fixtureV9));
    s = { ...s, embers: 50, roost: { ...s.roost, hatchery: { eggs: [] } } };
    s = incubateEgg(data, s, 0, NOW);
    s = takeHatchedEgg(data, s, 0, NOW + 48 * 3600_000);
    expect(s.egg).toMatchObject({ element: 'storm', breed: 'dragon', variant: null });
  });
});

describe('eggs', () => {
  it('names eggs from their element, mix, breed and finish', () => {
    expect(eggName(data, plainEgg('fire'))).toBe('Ember Egg');
    expect(eggName(data, { ...plainEgg('fire'), element2: 'tide' })).toBe('Steam Egg');
    expect(eggName(data, { ...plainEgg('tide'), variant: 'shimmer' })).toBe('Shimmer Tidepool Egg');
  });

  it('returning an egg to the wild pays embers, more for rarer eggs', () => {
    const r = data.roost.releaseEmbers;
    expect(releaseValue(data, plainEgg('fire'))).toBe(r.base);
    expect(releaseValue(data, { ...plainEgg('fire'), element2: 'tide' })).toBe(r.base + r.hybrid);
    expect(releaseValue(data, { ...plainEgg('fire'), variant: 'ghost' })).toBe(r.base + r.variant);
    // A plain egg pays about what incubating one costs, so hatching is always worth more.
    expect(r.base).toBeLessThanOrEqual(data.roost.buildings.hatchery.incubateEmbers);

    const s = { ...hatched(), embers: 7, eggs: [plainEgg('storm'), { ...plainEgg('tide'), variant: 'starry' as const }] };
    const out = releaseEgg(data, s, 1);
    expect(out.embers).toBe(r.base + r.variant);
    expect(out.save.embers).toBe(7 + r.base + r.variant);
    expect(out.save.eggs).toEqual([plainEgg('storm')]);
    expect(() => releaseEgg(data, s, 5)).toThrow('No such egg');
  });

  it('gives a rare finish to about 1 in 50 new eggs, and 1 in 10 when a parent has one', () => {
    const rng = createRng(42);
    let plain = 0;
    let inherited = 0;
    const n = 20_000;
    for (let i = 0; i < n; i++) if (newEgg(data, rng, 'fire').variant) plain++;
    const parent = { element: 'fire' as const, element2: null, breed: 'dragon', variant: 'ghost' as const };
    for (let i = 0; i < n; i++) if (breedEgg(data, rng, parent, { ...parent, variant: null }).variant) inherited++;
    expect(plain / n).toBeCloseTo(data.dragons.variants.chance, 2);
    expect(inherited / n).toBeCloseTo(data.dragons.variants.inheritedChance, 2);
  });

  it('shop eggs and Elder eggs are egg objects', () => {
    let s = buyEgg(data, hatched(), 'verdant');
    expect(s.eggs[0]).toMatchObject({ element: 'verdant', element2: null, breed: 'dragon' });
    s = { ...s, embers: 50, dragons: s.dragons.map((d) => ({ ...d, stage: 'elder', level: 45, element2: 'tide' as const })) };
    s = layEgg(data, s, s.dragons[0]!.id);
    expect(s.eggs[1]).toMatchObject({ element: 'fire', element2: 'tide', breed: 'dragon' });
  });
});

describe('hybrids', () => {
  it('mixes any two elements except the same one or an opposed pair', () => {
    expect(canMix(data.elements, 'fire', 'tide')).toBe(true);
    expect(canMix(data.elements, 'fire', 'fire')).toBe(false);
    expect(canMix(data.elements, 'light', 'shadow')).toBe(false);
    expect(canMix(data.elements, 'shadow', 'light')).toBe(false);
  });

  it('has a name for every mix of the elements in the game', () => {
    const ids = data.elements.ids;
    for (const a of ids) for (const b of ids) {
      if (!canMix(data.elements, a, b)) continue;
      expect(hybridName(data.elements, a, b)).not.toContain('-');
      expect(hybridName(data.elements, a, b)).toBe(hybridName(data.elements, b, a));
    }
    const names = Object.values(data.elements.hybrids);
    expect(new Set(names).size).toBe(names.length);
    expect(elementLabel(data.elements, { element: 'stone', element2: 'fire' })).toBe('Magma');
  });

  it('a hybrid gets half of each element\'s stat bonus', () => {
    const base = data.dragons.baseStats;
    expect(dragonBaseStats(data, 'fire')).toEqual({ ...base, might: base.might + 2 });
    expect(dragonBaseStats(data, 'fire', 'stone')).toEqual({ ...base, might: base.might + 1, scale: base.scale + 1 });
  });
});

describe('breeding rolls', () => {
  const fire = { element: 'fire' as const, element2: null, breed: 'dragon', variant: null };
  const tide = { ...fire, element: 'tide' as const };

  it('takes an element from a parent most of the time, and sometimes mixes them', () => {
    const rng = createRng(7);
    const counts: Record<string, number> = {};
    const n = 10_000;
    for (let i = 0; i < n; i++) {
      const egg: EggSpec = breedEgg(data, rng, fire, tide);
      const key = egg.element2 ? 'hybrid' : egg.element;
      counts[key] = (counts[key] ?? 0) + 1;
    }
    expect(counts.hybrid! / n).toBeCloseTo(data.roost.breeding.hybridChance, 1);
    expect(counts.fire! / n).toBeCloseTo((1 - data.roost.breeding.hybridChance) / 2, 1);
    expect(counts.tide! / n).toBeCloseTo((1 - data.roost.breeding.hybridChance) / 2, 1);
  });

  it('never mixes an opposed pair or one element with itself', () => {
    const rng = createRng(8);
    const light = { ...fire, element: 'light' as const };
    const shadow = { ...fire, element: 'shadow' as const };
    for (let i = 0; i < 2000; i++) {
      expect(breedEgg(data, rng, light, shadow).element2).toBeNull();
      expect(breedEgg(data, rng, fire, fire).element2).toBeNull();
    }
  });

  it('a hybrid parent passes on one of its elements or its own mix', () => {
    const rng = createRng(9);
    const steam = { ...fire, element2: 'tide' as const };
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const egg = breedEgg(data, rng, steam, { ...fire, element: 'stone' as const });
      seen.add(egg.element2 ? `${egg.element}+${egg.element2}` : egg.element);
    }
    expect([...seen].sort()).toEqual(['fire', 'fire+tide', 'stone', 'tide']);
  });
});

describe('the Nest', () => {
  it('grows to 10 dragons', () => {
    let s = { ...hatched(), rider: { ...hatched().rider, gold: 1e6 }, embers: 1e4 };
    for (let i = 1; i < data.roost.buildings.nest.levels.length; i++) s = upgradeBuilding(data, s, 'nest', NOW);
    expect(data.roost.buildings.nest.levels.map((l) => l.slots)).toEqual([3, 4, 6, 8, 10]);
  });
});
