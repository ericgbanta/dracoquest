import { describe, expect, it } from 'vitest';
import { gameData as data } from '../src/core/data';
import {
  activeDragon, buyGear, buyItem, canLayEgg, chooseEgg, claimEventGift, eventGiftClaimed, GameError, growthStatus, hatchEgg,
  itemPrice, layEgg, learnDragonTalent, playRound, shopGear, startFight, warmEgg,
} from '../src/core/game';
import { activeEvent, eventKey } from '../src/core/events';
import { canLearn } from '../src/core/loadout';
import { autoOrders } from '../src/core/ai';
import { CURRENT_VERSION, newSave, parseSave, type SaveData } from '../src/core/save';
import { dragonMaxHp, riderMaxHp } from '../src/core/characters';
import type { DragonState } from '../src/core/types';
import v4 from './fixtures/save-v4.json';

const NOW = 1794355200000;

function hatched(): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  s = hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
  return { ...s, rider: { ...s.rider, gold: 50_000 }, embers: 100 };
}

const withDragon = (s: SaveData, patch: Partial<DragonState>): SaveData => ({ ...s, dragons: s.dragons.map((d) => ({ ...d, ...patch })) });

describe('the full world', () => {
  it('has 19 zones (7 main, 4 side areas, 3 Hidden Reach areas, 3 frontier areas, 2 Elder Wilds areas), 95 regular enemies, 19 bosses, and 50+ items', () => {
    expect(data.zones).toHaveLength(19);
    const regular = new Set(data.zones.flatMap((z) => z.encounters.flatMap((e) => e.enemies)));
    expect(regular.size).toBe(95);
    expect(data.zones.map((z) => data.enemies[z.boss.enemy]!.boss)).toEqual(Array(19).fill(true));
    expect(Object.keys(data.gear).length + data.items.length + data.foods.length).toBeGreaterThanOrEqual(60);
    expect(data.zones.at(-1)!.maxLevel).toBe(data.progression.levelCap);
  });

  it('every talent tree has 8 talents, the last a capstone', () => {
    for (const tree of data.talents.trees) {
      const list = data.talents.talents.filter((t) => t.tree === tree.id);
      expect(list).toHaveLength(8);
      expect(list.at(-1)!.requiresStage).toBe('elder');
    }
  });
});

describe('the Elder stage', () => {
  it('needs level 39, bond 90, and The Elder Flight', () => {
    const d = activeDragon(withDragon(hatched(), { stage: 'adult', level: 39, bond: 89 }))!;
    expect(growthStatus(data, d)).toMatchObject({ levelOk: true, bondOk: false, ready: false });
    const ready = { ...d, bond: 90 };
    expect(growthStatus(data, ready).ready).toBe(true);
    expect(growthStatus(data, ready).next!.quest).toBe('elder-flight');
  });

  it('capstones need an Elder and 12 points in the tree', () => {
    let s = withDragon(hatched(), { stage: 'adult', level: 39 });
    const plan = ['sharp-claws', 'sharp-claws', 'sharp-claws', 'keen-eye', 'keen-eye', 'keen-eye', 'twin-claws', 'ferocity', 'ferocity', 'ferocity', 'pounce', 'rending-strike'];
    for (const id of plan) s = learnDragonTalent(data, s, id);
    expect(canLearn(data, activeDragon(s)!, 'thousand-claws')).toEqual({ ok: false, reason: 'Capstones need an Elder dragon' });
    s = withDragon(s, { stage: 'elder', level: 40 });
    expect(canLearn(data, activeDragon(s)!, 'thousand-claws')).toEqual({ ok: true });
  });

  it('an Elder lays one egg of its element, once', () => {
    let s = hatched();
    const id = activeDragon(s)!.id;
    expect(canLayEgg(data, s, id)).toMatchObject({ ok: false });
    s = withDragon(s, { stage: 'elder', level: 40 });
    s = layEgg(data, s, id);
    expect(s.eggs.map((e) => e.element)).toEqual(['fire']);
    expect(s.embers).toBe(100 - data.dragons.eggLaying.cost.embers);
    expect(() => layEgg(data, s, id)).toThrow('already laid');
  });

  it('the Eclipse Dragon drops a Light or Shadow egg', () => {
    let s = withDragon(hatched(), { stage: 'elder', level: 50, stats: { might: 120, scale: 90, swift: 40, spirit: 60 } });
    s = { ...s, rider: { ...s.rider, level: 50, stats: { strength: 90, agility: 30, arcana: 60, vigor: 90 } } };
    s = { ...s, rider: { ...s.rider, hp: riderMaxHp(data, s.rider), mp: 200 } };
    s = withDragon(s, { hp: dragonMaxHp(data, activeDragon(s)!) });
    s = { ...s, run: { zoneId: 'eclipse-peak', fights: [{ kind: 'boss', enemies: [{ enemyId: 'eclipse-dragon', level: 50 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } };
    s = startFight(data, s, { ride: true });
    for (let i = 0; i < 200 && s.run?.battle; i++) s = playRound(data, s, autoOrders(data, s.run.battle)).save;
    expect(s.bossesDefeated).toContain('eclipse-peak');
    expect(['light', 'shadow']).toContain(s.eggs[0]?.element);
  });
});

describe('seasonal events', () => {
  it('finds the event for a date, including one that wraps past New Year', () => {
    expect(activeEvent(data, '2026-11-11')?.id).toBe('harvest-fair');
    expect(activeEvent(data, '2026-12-31')?.id).toBe('frostfall');
    expect(activeEvent(data, '2027-01-03')?.id).toBe('frostfall');
    expect(activeEvent(data, '2027-02-14')).toBeNull();
    // January days of Frostfall belong to the run that started in December.
    const frostfall = data.events.find((e) => e.id === 'frostfall')!;
    expect(eventKey(frostfall, '2027-01-03')).toBe('frostfall-2026');
    expect(eventKey(frostfall, '2026-12-20')).toBe('frostfall-2026');
  });

  it('gives its gift once per year', () => {
    let s = hatched();
    expect(eventGiftClaimed(data, s, '2026-11-11')).toBe(false);
    s = claimEventGift(data, s, '2026-11-11');
    expect(s.embers).toBe(110);
    expect(s.rider.inventory['harvest-pie']).toBe(3);
    expect(() => claimEventGift(data, s, '2026-11-20')).toThrow('Already claimed');
    expect(() => claimEventGift(data, s, '2026-12-01')).toThrow('No event');
    expect(() => claimEventGift(data, s, '2027-11-11')).not.toThrow();
  });

  it('sells event items only while the event runs', () => {
    expect(shopGear(data, '2026-11-11')).toContain('harvest-lantern');
    expect(shopGear(data, '2026-12-01')).not.toContain('harvest-lantern');
    expect(itemPrice(data, 'harvest-pie', '2026-11-11')).toBe(45);
    expect(itemPrice(data, 'harvest-pie', '2026-12-01')).toBeNull();
    const s = hatched();
    expect(() => buyGear(data, s, 'harvest-lantern', '2026-12-01')).toThrow(GameError);
    expect(buyGear(data, s, 'harvest-lantern', '2026-11-11').rider.gear).toContain('harvest-lantern');
    expect(() => buyItem(data, s, 'cocoa-cake', 1, '2026-11-11')).toThrow(GameError);
  });
});

describe('save v4 → v5', () => {
  it('migrates the version 4 fixture', () => {
    const s = parseSave(JSON.stringify(v4));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.eventsClaimed).toEqual([]);
    expect(s.dragons.every((d) => d.laidEgg === false)).toBe(true);
    expect(s.dragons.map((d) => d.name)).toEqual(['Blaze', 'Ripple', 'Fern']);
    expect(s.roost.levels.hatchery).toBe(1);
    expect(s.secondDragonId).toBe('dragon-2');
  });
});
