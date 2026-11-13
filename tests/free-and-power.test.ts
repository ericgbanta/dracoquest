import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import {
  chooseEgg, freeBlocker, freeDragon, freeValue, GameError, hatchEgg, powerUpSpell, setSecond, startExpedition, startRun,
  upgradeBuilding, warmEgg,
} from '../src/core/game';
import { createBattle, resolveRound, type BattleSetup, type BattleState, type Orders } from '../src/core/battle';
import { hatchDragon, newRider } from '../src/core/characters';
import { createRng } from '../src/core/rng';
import { CURRENT_VERSION, newSave, parseSave, type SaveData } from '../src/core/save';
import { defaultLoadout, poweredSpell, spellById, spellPlusOf, spellUpgradeCost } from '../src/core/spells';
import { strongAgainst } from '../src/core/elements';
import type { DragonState, RiderState } from '../src/core/types';
import fixtureV11 from './fixtures/save-v11.json';

const data = gameData;
const NOW = 1794355200000;

function hatched(): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  s = hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
  return { ...s, rider: { ...s.rider, gold: 50_000, level: 30, materials: { ore: 20, crystal: 20, scale: 5 } }, embers: 100 };
}

function dragon(id: string, over: Partial<DragonState> = {}): DragonState {
  const d = hatchDragon(data, createRng(id.length), { id, name: id, element: 'tide', colors: { primary: '#f00', secondary: '#000' }, now: NOW });
  return { ...d, ...over };
}

/** A save with Pip (lead) and two more dragons, Mist and Glint. */
function three(): SaveData {
  const s = hatched();
  return { ...s, dragons: [...s.dragons, dragon('Mist'), dragon('Glint', { stage: 'adult', level: 20 })] };
}

describe('freeing a dragon', () => {
  it('pays embers by stage, with the egg extras for rare dragons', () => {
    const f = data.roost.freeEmbers;
    expect(freeValue(data, dragon('a'))).toBe(f.stages.hatchling);
    expect(freeValue(data, dragon('a', { stage: 'elder' }))).toBe(f.stages.elder);
    expect(freeValue(data, dragon('a', { stage: 'adult', element2: 'fire', breed: 'wyvern', variant: 'starry' })))
      .toBe(f.stages.adult + f.hybrid + f.breed + f.variant);
    // Older dragons are worth more than younger ones.
    expect(f.stages.hatchling).toBeLessThan(f.stages.juvenile);
    expect(f.stages.juvenile).toBeLessThan(f.stages.adult);
    expect(f.stages.adult).toBeLessThan(f.stages.elder);
  });

  it('removes the dragon, adds embers, empties its seat and returns its gear to the bag', () => {
    let s = three();
    s = { ...s, rider: { ...s.rider, level: 30, gear: [...s.rider.gear, 'rope-saddle'] } };
    const glint = s.dragons.find((d) => d.name === 'Glint')!;
    s = { ...s, dragons: s.dragons.map((d) => (d.id === glint.id ? { ...d, equipment: { saddle: 'rope-saddle' } } : d)) };
    s = setSecond(data, s, glint.id, NOW);
    expect(s.secondDragonId).toBe(glint.id);
    const before = s.embers;
    const out = freeDragon(data, s, glint.id);
    expect(out.embers).toBe(data.roost.freeEmbers.stages.adult);
    expect(out.save.embers).toBe(before + out.embers);
    expect(out.save.dragons.map((d) => d.name)).toEqual(['Pip', 'Mist']);
    expect(out.save.secondDragonId).toBeNull();
    // The saddle is still owned and free to put on another dragon.
    expect(out.save.rider.gear).toContain('rope-saddle');
    expect(out.save.dragons.some((d) => Object.values(d.equipment).includes('rope-saddle'))).toBe(false);
  });

  it('refuses the lead, the last dragon, a dragon away or nesting, and mid-run', () => {
    const s = three();
    const mist = s.dragons.find((d) => d.name === 'Mist')!;
    expect(freeBlocker(s, s.activeDragonId!)).toBe('Make another dragon your lead first');
    expect(() => freeDragon(data, s, s.activeDragonId!)).toThrow(GameError);
    expect(freeBlocker(hatched(), hatched().activeDragonId!)).toBe('You need at least one dragon');
    expect(freeBlocker(s, 'nobody')).toBe('No such dragon');

    const exp = upgradeBuilding(data, { ...s, rider: { ...s.rider, inventory: { ...s.rider.inventory } } }, 'expeditions', NOW);
    const away = startExpedition(data, exp, mist.id, data.roost.trips[0]!.id, NOW);
    expect(freeBlocker(away, mist.id)).toBe('Mist is away on an expedition');

    const nesting = { ...s, roost: { ...s.roost, nesting: { parents: [mist.id, 'x'] as [string, string], readyAt: NOW, egg: { element: 'fire' as const, element2: null, breed: 'dragon', variant: null } } } };
    expect(freeBlocker(nesting, mist.id)).toBe('Mist is nesting');

    const running = startRun(data, s, 'mossy-hollow');
    expect(freeBlocker(running, mist.id)).toBe('Finish your run first');
  });
});

describe('spell power-ups', () => {
  const arc = spellById(data, 'arc-bolt')!;
  const ward = spellById(data, 'bright-ward')!;
  const frost = spellById(data, 'frost-dart')!;

  it('each plus adds power and status chance; a buff gets cheaper instead', () => {
    const p = data.forge.spells;
    expect(poweredSpell(data, arc, 0)).toBe(arc);
    expect(poweredSpell(data, arc, 2).base).toBeCloseTo(arc.base * (1 + 2 * p.powerPct));
    expect(poweredSpell(data, arc, 2).name).toBe(arc.name);
    expect(poweredSpell(data, frost, 3).statusChance).toBeCloseTo(frost.statusChance! + 3 * p.statusChance);
    expect(poweredSpell(data, ward, 1).mp).toBe(ward.mp - p.buffMpCut);
    expect(poweredSpell(data, ward, 99).mp).toBe(1);
  });

  it('costs more for higher pluses and higher level spells', () => {
    const a1 = spellUpgradeCost(data, arc, 1)!;
    const a3 = spellUpgradeCost(data, arc, 3)!;
    const late = spellUpgradeCost(data, spellById(data, 'eventide')!, 1)!;
    expect(a3.gold).toBeGreaterThan(a1.gold);
    expect(late.gold).toBeGreaterThan(a1.gold);
    expect(a1.embers).toBe(0);
    expect(a3.embers).toBeGreaterThan(0);
    expect(a1.materials.crystal).toBe(1);
    expect(spellUpgradeCost(data, arc, 4)).toBeNull();
  });

  it('spends gold, materials and embers and raises the plus, up to +3', () => {
    let s = hatched();
    for (let plus = 1; plus <= 3; plus++) {
      const cost = spellUpgradeCost(data, arc, plus)!;
      const next = powerUpSpell(data, s, 'arc-bolt');
      expect(spellPlusOf(next.rider, 'arc-bolt')).toBe(plus);
      expect(next.rider.gold).toBe(s.rider.gold - cost.gold);
      expect(next.embers).toBe(s.embers - cost.embers);
      expect(next.rider.materials.crystal).toBe((s.rider.materials.crystal ?? 0) - cost.materials.crystal!);
      s = next;
    }
    expect(() => powerUpSpell(data, s, 'arc-bolt')).toThrow('Already at full power');
  });

  it('refuses a spell not learned, too little to pay, or mid-run', () => {
    const s = hatched();
    expect(() => powerUpSpell(data, s, 'eventide')).toThrow("isn't learned yet");
    const poor = { ...s, rider: { ...s.rider, materials: {} } };
    expect(() => powerUpSpell(data, poor, 'arc-bolt')).toThrow('Not enough materials');
    expect(() => powerUpSpell(data, startRun(data, s, 'mossy-hollow'), 'arc-bolt')).toThrow('mid-run');
  });

  it('hits harder in battle with the same seed', () => {
    const rider = (plus: number): RiderState => {
      const r = { ...newRider(data, 'Ash'), level: 10, mp: 999, stats: { strength: 10, agility: 10, arcana: 20, vigor: 10 } };
      return { ...r, spells: ['arc-bolt'], spellPlus: plus ? { 'arc-bolt': plus } : {} };
    };
    const setup = (r: RiderState, seed = 42): BattleSetup => ({
      rider: r, dragon: hatchDragon(data, createRng(9), { id: 'd', name: 'Pip', element: 'fire', colors: { primary: '#f00', secondary: '#000' }, now: 0 }),
      enemies: [{ enemyId: 'thornling', level: 8 }], seed, canFlee: true,
    });
    const cast: Orders = { rider: { type: 'spell', spell: 'arc-bolt', target: 'e0' }, dragon: { type: 'guard' } };
    // Total spell damage over the same 20 seeds.
    const dealt = (plus: number) => {
      let total = 0;
      for (let seed = 1; seed <= 20; seed++) {
        const b = createBattle(data, setup(rider(plus), seed));
        const hit = resolveRound(data, b, cast).events.find((e) => e.t === 'hit' && e.actor === 'rider');
        total += hit && hit.t === 'hit' ? hit.amount : 0;
      }
      return total;
    };
    expect(createBattle(data, setup(rider(2))).spellPlus).toEqual({ 'arc-bolt': 2 });
    expect(dealt(0)).toBeGreaterThan(0);
    expect(dealt(3)).toBeGreaterThan(dealt(0));
  });

  it('a fight saved before v12 (no spellPlus) still casts at base power', () => {
    const r = { ...newRider(data, 'Ash'), level: 10, mp: 999, spells: defaultLoadout(data, 10) };
    const b = createBattle(data, {
      rider: r, dragon: null, enemies: [{ enemyId: 'thornling', level: 5 }], seed: 1, canFlee: true,
    });
    const old: BattleState = { ...b };
    delete old.spellPlus;
    const out = resolveRound(data, old, { rider: { type: 'spell', spell: 'arc-bolt', target: 'e0' } });
    expect(out.events.some((e) => e.t === 'hit' && e.actor === 'rider')).toBe(true);
  });
});

describe('save v11 to v12', () => {
  it('adds empty spell power-ups and keeps everything else', () => {
    expect(fixtureV11.version).toBe(11);
    const s = parseSave(JSON.stringify(fixtureV11));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Eleven');
    expect(s.rider.gold).toBe(777);
    expect(s.rider.spellPlus).toEqual({});
    expect(s.thirdDragonId).toBeNull();
  });

  it('new saves start with no power-ups', () => {
    expect(newSave(NOW).rider.spellPlus).toEqual({});
  });
});

describe('weapon elements', () => {
  it('names what an element is strong against', () => {
    expect(strongAgainst(data.elements, 'fire')).toEqual(['Frost']);
    expect(strongAgainst(data.elements, 'light')).toEqual(['Shadow']);
  });

  it('every shop weapon either has a known element or none', () => {
    for (const g of Object.values(data.gear).filter((x) => x.slot === 'weapon')) {
      if (g.element) expect(data.elements.ids, g.id).toContain(g.element);
    }
  });
});

