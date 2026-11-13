import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import {
  breedCooldownLeft, buyEgg, canBreed, chooseEgg, collectNestEgg, hatchEgg, incubateEgg, layEgg, releaseEgg, startBreeding,
  takeHatchedEgg, upgradeBuilding, warmEgg,
} from '../src/core/game';
import { attackElement, defenseMultiplier } from '../src/core/elements';
import { canLearn, learnedSkills } from '../src/core/loadout';
import { createBattle, resolveRound } from '../src/core/battle';
import { dragonBaseStats, hatchDragon, newRider } from '../src/core/characters';
import { breedEgg, canMix, eggName, elementLabel, hybridName, newEgg, plainEgg, releaseValue } from '../src/core/eggs';
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

describe('hybrids in battle', () => {
  const m = data.elements.multipliers;

  it('a hybrid takes the average of the matchups against its two elements', () => {
    // Tide beats Fire; Tide against Stone is neutral.
    expect(defenseMultiplier(data.elements, 'tide', { element: 'fire', element2: 'stone' })).toBeCloseTo((m.strong + m.neutral) / 2);
    expect(defenseMultiplier(data.elements, 'tide', { element: 'fire', element2: null })).toBe(m.strong);
  });

  it('a hybrid attacks with its better element, at reduced power', () => {
    const glacier = { element: 'tide' as const, element2: 'frost' as const };
    // Frost beats Verdant; Tide against Verdant is neutral.
    expect(attackElement(data.elements, 0.9, glacier, { element: 'verdant' })).toEqual({ element: 'frost', factor: 0.9 });
    expect(attackElement(data.elements, 0.9, { element: 'tide', element2: null }, { element: 'verdant' })).toEqual({ element: 'tide', factor: 1 });
  });

  it("a hybrid's breath puts on the status of the element it used", () => {
    let chill = 0;
    let soak = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const d = hatchDragon(data, createRng(9), {
        id: 'd', name: 'Floe', element: 'tide', element2: 'frost', colors: { primary: '#f00', secondary: '#000' }, now: 0,
      });
      let s = createBattle(data, { rider: newRider(data, 'Ash'), dragon: d, enemies: [{ enemyId: 'bramble-troll', level: 8 }], seed, canFlee: true });
      s = { ...s, breath: data.combat.breath.max };
      const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'breath', target: 'e0' } });
      for (const e of r.events) if (e.t === 'status' && e.target === 'e0') { if (e.status === 'chill') chill++; if (e.status === 'soak') soak++; }
    }
    expect(chill).toBeGreaterThan(0);
    expect(soak).toBe(0);
  });
});

describe('the Nesting Grounds', () => {
  const HOUR = 3600_000;
  function twoAdults(): SaveData {
    let s = hatched();
    s = upgradeBuilding(data, s, 'nesting', NOW);
    const adult = { ...s.dragons[0]!, stage: 'adult', level: 30 };
    return { ...s, dragons: [adult, { ...adult, id: 'second', name: 'Brook', element: 'tide' as const }] };
  }

  it('two adults make an egg after the building\'s hours', () => {
    let s = twoAdults();
    const lvl = data.roost.buildings.nesting.levels[0]!;
    const gold = s.rider.gold;
    const embers = s.embers;
    s = startBreeding(data, s, s.dragons[0]!.id, 'second', NOW);
    expect(s.rider.gold).toBe(gold - data.roost.breeding.cost.gold);
    expect(s.embers).toBe(embers - data.roost.breeding.cost.embers);
    expect(s.roost.nesting?.readyAt).toBe(NOW + lvl.hours * HOUR);
    expect(() => collectNestEgg(s, NOW + HOUR)).toThrow('Not ready');
    const out = collectNestEgg(s, NOW + lvl.hours * HOUR);
    expect(out.save.eggs).toEqual([out.egg]);
    expect(out.save.roost.nesting).toBeNull();
    expect(['fire', 'tide']).toContain(out.egg.element);
  });

  it('is the same egg however often the game is reloaded: it is rolled when nesting starts', () => {
    const s = twoAdults();
    const a = startBreeding(data, s, s.dragons[0]!.id, 'second', NOW);
    const b = startBreeding(data, s, s.dragons[0]!.id, 'second', NOW);
    expect(a.roost.nesting!.egg).toEqual(b.roost.nesting!.egg);
  });

  it('needs two different adults, rested, with the building built', () => {
    const s = twoAdults();
    const id = s.dragons[0]!.id;
    expect(canBreed(data, s, id, id, NOW)).toMatchObject({ ok: false, reason: 'Pick two different dragons' });
    const young = { ...s, dragons: [{ ...s.dragons[0]!, stage: 'juvenile' }, s.dragons[1]!] };
    expect(canBreed(data, young, id, 'second', NOW).ok).toBe(false);
    const unbuilt = { ...s, roost: { ...s.roost, levels: { ...s.roost.levels, nesting: 0 } } };
    expect(canBreed(data, unbuilt, id, 'second', NOW)).toMatchObject({ ok: false, reason: 'Build the Nesting Grounds first' });

    let bred = startBreeding(data, s, id, 'second', NOW);
    bred = collectNestEgg(bred, NOW + 24 * HOUR).save;
    const days = data.roost.buildings.nesting.levels[0]!.cooldownDays;
    expect(canBreed(data, bred, id, 'second', NOW + 24 * HOUR).ok).toBe(false);
    expect(breedCooldownLeft(data, bred, bred.dragons[0]!, NOW + 24 * HOUR)).toBe((days - 1) * 24 * HOUR);
    expect(canBreed(data, bred, id, 'second', NOW + days * 24 * HOUR).ok).toBe(true);
    // A clock set backwards never makes the wait longer than the cooldown.
    expect(breedCooldownLeft(data, bred, bred.dragons[0]!, NOW - 100 * 24 * HOUR)).toBe(days * 24 * HOUR);
  });

  it('a bred hybrid hatches as a hybrid', () => {
    let s = twoAdults();
    s = { ...s, egg: null, eggs: [{ ...plainEgg('fire'), element2: 'tide' }] };
    s = upgradeBuilding(data, s, 'hatchery', NOW);
    s = incubateEgg(data, s, 0, NOW);
    s = takeHatchedEgg(data, s, 0, NOW + 48 * HOUR);
    for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
    s = hatchEgg(data, { ...s, roost: { ...s.roost, levels: { ...s.roost.levels, nest: 3 } } }, 'Puff', { primary: '#fff', secondary: '#000' }, NOW + 49 * HOUR);
    const puff = s.dragons.find((d) => d.name === 'Puff')!;
    expect(puff).toMatchObject({ element: 'fire', element2: 'tide', breed: 'dragon' });
  });
});

describe('breeds', () => {
  it('a Wyvern hatches with its stat lean and knows Rake from the start', () => {
    const w = hatchDragon(data, createRng(1), { id: 'w', name: 'Zip', element: 'fire', breed: 'wyvern', colors: { primary: '#f00', secondary: '#000' }, now: 0 });
    const d = hatchDragon(data, createRng(1), { id: 'd', name: 'Pip', element: 'fire', colors: { primary: '#f00', secondary: '#000' }, now: 0 });
    expect(w.breed).toBe('wyvern');
    expect(w.stats.swift).toBe(d.stats.swift + 2);
    expect(w.stats.scale).toBe(d.stats.scale - 1);
    expect(learnedSkills(data, w).map((t) => t.id)).toEqual(['wyvern-rake']);
    expect(learnedSkills(data, d)).toEqual([]);
    expect(canLearn(data, { ...w, stage: 'adult', level: 30 }, 'wyvern-rake')).toMatchObject({ ok: false });
  });

  it('Rake is a skill in battle: two hits, then a cooldown', () => {
    const w = { ...hatchDragon(data, createRng(1), { id: 'w', name: 'Zip', element: 'fire', breed: 'wyvern', colors: { primary: '#f00', secondary: '#000' }, now: 0 }), level: 20, stage: 'juvenile' };
    const s = createBattle(data, { rider: newRider(data, 'Ash'), dragon: w, enemies: [{ enemyId: 'bramble-troll', level: 10 }], seed: 5, canFlee: true });
    expect(s.skills).toContain('wyvern-rake');
    const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'skill', skill: 'wyvern-rake', target: 'e0' } });
    const swings = r.events.filter((e) => (e.t === 'hit' || e.t === 'miss') && e.actor === 'dragon');
    expect(swings).toHaveLength(2);
    expect(r.state.cooldowns['wyvern-rake']).toBeGreaterThan(0);
  });

  it("Starglass Hollow's boss drops Wyvern eggs, and breeding passes the breed on", () => {
    expect(data.zones.find((z) => z.id === 'starglass-hollow')!.eggDrop!.breed).toBe('wyvern');
    const rng = createRng(4);
    const wyv = { element: 'fire' as const, element2: null, breed: 'wyvern', variant: null };
    const drg = { ...wyv, breed: 'dragon' };
    const breeds = new Set(Array.from({ length: 200 }, () => breedEgg(data, rng, wyv, drg).breed));
    expect([...breeds].sort()).toEqual(['dragon', 'wyvern']);
    expect(eggName(data, { ...plainEgg('aether'), breed: 'wyvern' })).toBe('Wyvern Starlit Egg');
  });
});

describe('the Wyrm', () => {
  it('leans to Spirit, fills its breath faster, and its Coil stops the target dodging', () => {
    const w = { ...hatchDragon(data, createRng(1), { id: 'w', name: 'Noodle', element: 'tide', breed: 'wyrm', colors: { primary: '#f00', secondary: '#000' }, now: 0 }), level: 20, stage: 'juvenile' };
    const d = hatchDragon(data, createRng(1), { id: 'd', name: 'Pip', element: 'tide', colors: { primary: '#f00', secondary: '#000' }, now: 0 });
    expect(w.stats.spirit).toBe(d.stats.spirit + 2);
    expect(w.stats.might).toBe(d.stats.might - 1);
    expect(learnedSkills(data, w).map((t) => t.id)).toEqual(['wyrm-coil']);
    let rooted = false;
    for (let seed = 1; seed <= 20 && !rooted; seed++) {
      const s = createBattle(data, { rider: newRider(data, 'Ash'), dragon: w, enemies: [{ enemyId: 'bramble-troll', level: 10 }], seed, canFlee: true });
      const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'skill', skill: 'wyrm-coil', target: 'e0' } });
      rooted = r.events.some((e) => e.t === 'status' && e.status === 'root' && e.target === 'e0');
    }
    expect(rooted).toBe(true);
    expect(data.zones.find((z) => z.id === 'voidmarch')!.eggDrop!.breed).toBe('wyrm');
  });
});
