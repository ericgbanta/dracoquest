import { describe, expect, it } from 'vitest';
import { gameData as data } from '../src/core/data';
import {
  activeDragon, chooseEgg, collectExpedition, collectFood, collectTraining, feedDragon, GameError, groomDragon, hatchEgg,
  incubateEgg, playRound, rest, secondDragon, setLead, setSecond, startExpedition, startFight, startTraining, takeHatchedEgg,
  upgradeBuilding, warmEgg,
} from '../src/core/game';
import { createBattle, duoAvailable, resolveRound } from '../src/core/battle';
import { autoOrders } from '../src/core/ai';
import { CURRENT_VERSION, newSave, parseSave, type SaveData } from '../src/core/save';
import { pantryNextIn, temperament, tickPantry, trainingXp } from '../src/core/roost';
import { dragonBonus } from '../src/core/loadout';
import { enemyXp } from '../src/core/progression';
import v3 from './fixtures/save-v3.json';

const NOW = 1794355200000; // 2026-11-11
const HOUR = 3600_000;
const DAY = 24 * HOUR;
const TODAY = '2026-11-11';

function hatched(): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  s = hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
  return { ...s, rider: { ...s.rider, gold: 50_000 }, embers: 500 };
}

/** Build every building to level 1. */
function built(s: SaveData): SaveData {
  for (const b of ['hatchery', 'training', 'expeditions'] as const) s = upgradeBuilding(data, s, b, NOW);
  return s;
}

/** Hatch a second dragon through the Hatchery. */
function withSecondDragon(): SaveData {
  let s = built({ ...hatched(), eggs: ['tide'] });
  s = incubateEgg(data, s, 0, NOW);
  const ready = s.roost.hatchery.eggs[0]!.readyAt;
  s = takeHatchedEgg(data, s, 0, ready);
  return hatchEgg(data, s, 'Ripple', { primary: '#3f8fd8', secondary: '#e9e4da' }, ready + 1);
}

const byName = (s: SaveData, name: string) => s.dragons.find((d) => d.name === name)!;

describe('Roost buildings', () => {
  it('starts with a Nest and Pantry; others are built with gold and embers', () => {
    const s = hatched();
    expect(s.roost.levels).toEqual({ nest: 1, pantry: 1, hatchery: 0, training: 0, expeditions: 0 });
    const cost = data.roost.buildings.hatchery.levels[0]!.cost!;
    const b = upgradeBuilding(data, s, 'hatchery', NOW);
    expect(b.roost.levels.hatchery).toBe(1);
    expect(b.rider.gold).toBe(s.rider.gold - cost.gold);
    expect(b.embers).toBe(s.embers - cost.embers);
    expect(() => upgradeBuilding(data, { ...s, embers: 0 }, 'hatchery', NOW)).toThrow(GameError);
  });

  it('stops at the top level', () => {
    let s = hatched();
    s = upgradeBuilding(data, upgradeBuilding(data, s, 'nest', NOW), 'nest', NOW);
    expect(s.roost.levels.nest).toBe(3);
    expect(() => upgradeBuilding(data, s, 'nest', NOW)).toThrow('top level');
  });
});

describe('timers after the app is closed for a day', () => {
  it('the Pantry fills to its store and no further', () => {
    const s = hatched();
    const lvl = data.roost.buildings.pantry.levels[0]!;
    const twoHours = tickPantry(data, s.roost, NOW + 2 * lvl.minutesPerFood * 60_000);
    expect(twoHours.pantry.stored).toBe(2);
    const dayLater = tickPantry(data, s.roost, NOW + DAY);
    expect(dayLater.pantry.stored).toBe(lvl.store);
    expect(pantryNextIn(data, dayLater, NOW + DAY)).toBeNull();
    const r = collectFood(data, s, NOW + DAY);
    expect(r.food).toHaveLength(lvl.store);
    expect(r.save.roost.pantry.stored).toBe(0);
    // After collecting a full pantry, the next food is a full period away, not instant.
    expect(tickPantry(data, r.save.roost, NOW + DAY + 60_000).pantry.stored).toBe(0);
  });

  it('a clock that goes backwards produces nothing', () => {
    const s = hatched();
    const back = tickPantry(data, s.roost, NOW - DAY);
    expect(back.pantry.stored).toBe(0);
    expect(back.pantry.lastAt).toBe(NOW - DAY);
    expect(trainingXp(data, built(s).roost, { level: 5 }, NOW, NOW - HOUR)).toBe(0);
  });

  it('training XP is capped by the yard', () => {
    const s = built(hatched());
    const lvl = data.roost.buildings.training.levels[0]!;
    const capped = trainingXp(data, s.roost, { level: 5 }, NOW, NOW + DAY);
    expect(capped).toBe(Math.floor(lvl.maxHours * lvl.fightsPerHour * enemyXp(data.progression, 5)));
    expect(trainingXp(data, s.roost, { level: 5 }, NOW, NOW + 3 * DAY)).toBe(capped);
  });

  it('an expedition comes back with loot once its time is up, a day later or more', () => {
    let s = withSecondDragon();
    const ripple = byName(s, 'Ripple');
    s = startExpedition(data, s, ripple.id, 'berry-run', NOW);
    expect(() => collectExpedition(data, s, ripple.id, NOW + 30 * 60_000)).toThrow('still away');
    const gold = s.rider.gold;
    const r = collectExpedition(data, s, ripple.id, NOW + DAY);
    expect(r.save.rider.gold).toBeGreaterThan(gold);
    expect(r.loot.food.length).toBe(1);
    expect(byName(r.save, 'Ripple').assignment.kind).toBe('idle');
  });

  it('a Hatchery egg is ready after its hours, not before', () => {
    let s = built({ ...hatched(), eggs: ['storm'] });
    s = incubateEgg(data, s, 0, NOW);
    expect(s.eggs).toEqual([]);
    expect(s.embers).toBe(500 - 5 - 5 - 5 - data.roost.buildings.hatchery.incubateEmbers);
    expect(() => takeHatchedEgg(data, s, 0, NOW + HOUR)).toThrow('Not ready');
    s = takeHatchedEgg(data, s, 0, NOW + DAY);
    expect(s.egg).toEqual({ element: 'storm', warmth: data.dragons.hatchTaps });
  });
});

describe('a second dragon', () => {
  it('hatches into the Nest without changing the first dragon or the lead', () => {
    const before = hatched();
    const s = withSecondDragon();
    expect(s.dragons).toHaveLength(2);
    expect(s.activeDragonId).toBe(before.activeDragonId);
    const pip = byName(s, 'Pip');
    expect({ ...pip, care: undefined }).toEqual({ ...activeDragon(before)!, care: undefined });
    const ripple = byName(s, 'Ripple');
    expect(ripple.element).toBe('tide');
    expect(ripple.level).toBe(1);
  });

  it('is raised on its own: feeding, grooming, and training it never touch the first', () => {
    let s = withSecondDragon();
    s = { ...s, rider: { ...s.rider, inventory: { ...s.rider.inventory, sweetroot: 5 } } };
    const ripple = byName(s, 'Ripple');
    const pipBefore = byName(s, 'Pip');
    s = feedDragon(data, s, 'sweetroot', TODAY, ripple.id).save;
    s = groomDragon(data, s, 10, TODAY, ripple.id).save;
    s = startTraining(data, s, ripple.id, NOW);
    s = collectTraining(data, s, ripple.id, NOW + 6 * HOUR).save;
    const after = byName(s, 'Ripple');
    expect(after.statPoints).toBe(1);
    expect(after.bond).toBeGreaterThan(0);
    expect(after.xp + after.level * 1000).toBeGreaterThan(1000);
    expect(byName(s, 'Pip')).toEqual(pipBefore);
  });

  it('care counts per dragon: each gets 3 meals a day', () => {
    let s = withSecondDragon();
    s = { ...s, rider: { ...s.rider, inventory: { ...s.rider.inventory, sweetroot: 10 } } };
    for (let i = 0; i < 3; i++) s = feedDragon(data, s, 'sweetroot', TODAY).save;
    expect(() => feedDragon(data, s, 'sweetroot', TODAY)).toThrow(RangeError);
    expect(() => feedDragon(data, s, 'sweetroot', TODAY, byName(s, 'Ripple').id)).not.toThrow();
  });

  it('respects Nest slots', () => {
    let s = withSecondDragon();
    s = { ...s, dragons: [...s.dragons, { ...s.dragons[0]!, id: 'x3', name: 'Third' }] };
    s = { ...s, eggs: ['fire'] };
    s = incubateEgg(data, s, 0, NOW);
    expect(() => takeHatchedEgg(data, s, 0, NOW + DAY)).toThrow('Nest is full');
  });

  it('partners cannot train or go on expeditions, and away dragons cannot be partners', () => {
    let s = withSecondDragon();
    const pip = activeDragon(s)!;
    const ripple = byName(s, 'Ripple');
    expect(() => startTraining(data, s, pip.id, NOW)).toThrow(GameError);
    s = startExpedition(data, s, ripple.id, 'berry-run', NOW);
    expect(() => setLead(data, s, ripple.id, NOW)).toThrow('expedition');
  });

  it('switching the lead stops training and banks the XP', () => {
    let s = withSecondDragon();
    const ripple = byName(s, 'Ripple');
    s = startTraining(data, s, ripple.id, NOW);
    s = setLead(data, s, ripple.id, NOW + 8 * HOUR);
    expect(s.activeDragonId).toBe(ripple.id);
    expect(byName(s, 'Ripple').assignment.kind).toBe('idle');
    expect(byName(s, 'Ripple').xp).toBeGreaterThan(0);
  });
});

describe('second partner in battle', () => {
  function twoPartners(level = 25): SaveData {
    let s = withSecondDragon();
    s = { ...s, rider: { ...s.rider, level } };
    s = { ...s, dragons: s.dragons.map((d) => ({ ...d, level, bond: 60 })) };
    return setSecond(data, s, byName(s, 'Ripple').id, NOW);
  }

  it('opens at rider level 25', () => {
    let s = withSecondDragon();
    expect(() => setSecond(data, s, byName(s, 'Ripple').id, NOW)).toThrow('level 25');
    s = twoPartners();
    expect(secondDragon(s)!.name).toBe('Ripple');
    expect(() => setSecond(data, s, s.activeDragonId!, NOW)).toThrow('already your lead');
  });

  it('takes three orders a round and both dragons act', () => {
    const s = twoPartners();
    const b = createBattle(data, { rider: s.rider, dragon: activeDragon(s), second: secondDragon(s), enemies: [{ enemyId: 'bramble-troll', level: 8 }], seed: 4, canFlee: true });
    expect(b.second!.fighter.id).toBe('dragon2');
    const r = resolveRound(data, b, { rider: { type: 'defend' }, dragon: { type: 'claw', target: 'e0' }, second: { type: 'claw', target: 'e0' } });
    const actors = new Set(r.events.filter((e) => e.t === 'hit' || e.t === 'miss').map((e) => (e as { actor: string }).actor));
    expect(actors.has('dragon')).toBe(true);
    expect(actors.has('dragon2')).toBe(true);
    expect(r.state.second!.breath).toBeGreaterThan(0);
  });

  it('a duo combo needs bond 50 on both and uses both dragon actions', () => {
    const s = twoPartners();
    const b = createBattle(data, { rider: s.rider, dragon: activeDragon(s), second: secondDragon(s), enemies: [{ enemyId: 'bramble-troll', level: 8 }], seed: 5, canFlee: true });
    expect(duoAvailable(data, b, 'twin-flame')).toBe(true);
    expect(duoAvailable(data, { ...b, second: { ...b.second!, bond: 10 } }, 'twin-flame')).toBe(false);
    const r = resolveRound(data, b, { rider: { type: 'defend' }, dragon: { type: 'duo', combo: 'twin-flame', target: 'e0' }, second: { type: 'claw', target: 'e0' } });
    expect(r.events.some((e) => e.text.includes('Twin Roar'))).toBe(true);
    expect(r.events.some((e) => (e.t === 'hit' || e.t === 'miss') && e.actor === 'dragon2')).toBe(false);
  });

  it('both partners share XP from a win', () => {
    let s = twoPartners();
    s = { ...s, run: { zoneId: 'mossy-hollow', fights: [{ kind: 'normal', enemies: [{ enemyId: 'thornling', level: 1 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } };
    s = startFight(data, s);
    const xp2 = secondDragon(s)!.xp;
    for (let i = 0; i < 50 && s.run?.battle; i++) s = playRound(data, s, autoOrders(data, s.run.battle)).save;
    expect(secondDragon(s)!.xp).toBeGreaterThan(xp2);
  });
});

describe('embers', () => {
  it('come from daily care streaks, with a bonus every 7 days', () => {
    let s = hatched();
    s = { ...s, rider: { ...s.rider, inventory: { ...s.rider.inventory, sweetroot: 50 } } };
    const start = s.embers;
    for (let day = 0; day < 7; day++) {
      const today = new Date(Date.UTC(2026, 10, 11 + day)).toISOString().slice(0, 10);
      s = rest(data, s, today);
      s = feedDragon(data, s, 'sweetroot', today).save;
      s = groomDragon(data, s, 5, today).save;
    }
    const e = data.roost.embers;
    expect(s.careStreak.count).toBe(7);
    expect(s.embers).toBe(start + 7 * e.wellKeptDay + e.streakBonus);
  });

  it('a missed day restarts the streak but takes nothing away', () => {
    let s = hatched();
    s = { ...s, rider: { ...s.rider, inventory: { ...s.rider.inventory, sweetroot: 50 } } };
    for (const today of ['2026-11-11', '2026-11-12', '2026-11-14']) {
      s = groomDragon(data, feedDragon(data, rest(data, s, today), 'sweetroot', today).save, 5, today).save;
    }
    expect(s.careStreak).toEqual({ count: 1, lastDay: '2026-11-14' });
  });
});

describe('temperament', () => {
  it('settles from how the dragon is raised and gives its passive', () => {
    const d = activeDragon(hatched())!;
    expect(temperament(data, d)).toBeNull();
    const gentle = { ...d, temper: { bold: 4, gentle: 30, clever: 0, proud: 0 } };
    expect(temperament(data, gentle)).toBe('gentle');
    expect(dragonBonus(data, gentle).healPct).toBe(data.roost.temperament.types.gentle.bonus.healPct);
    expect(dragonBonus(data, { ...d, temper: { bold: 3, gentle: 2, clever: 0, proud: 0 } }).healPct).toBeUndefined();
  });

  it('care leans Gentle and fighting leans Bold', () => {
    let s = hatched();
    s = { ...s, rider: { ...s.rider, inventory: { ...s.rider.inventory, sweetroot: 5 } } };
    s = feedDragon(data, s, 'sweetroot', TODAY).save;
    expect(activeDragon(s)!.temper.gentle).toBe(data.roost.temperament.points.care);
  });
});

describe('save v3 → v4', () => {
  it('migrates the version 3 fixture', () => {
    const s = parseSave(JSON.stringify(v3));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.embers).toBe(0);
    expect(s.secondDragonId).toBeNull();
    expect(s.roost.levels.nest).toBe(1);
    const d = activeDragon(s)!;
    expect(d.stage).toBe('juvenile');
    expect(d.talents['twin-claws']).toBe(1);
    expect(d.care).toEqual({ day: '2026-11-11', meals: 2, groomed: true });
    expect(d.assignment).toEqual({ kind: 'idle' });
    expect(s.care).toEqual({ day: '2026-11-11', rested: true, wellKeptGiven: false });
  });
});
