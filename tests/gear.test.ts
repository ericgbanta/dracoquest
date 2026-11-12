import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gameData } from '../src/core/data';
import { autoOrders } from '../src/core/ai';
import { createRng } from '../src/core/rng';
import { equippedSets, riderBonus, setOf, setSize } from '../src/core/loadout';
import { riderMaxHp } from '../src/core/characters';
import { getZone, rollGear } from '../src/core/run';
import { parseSave, type SaveData } from '../src/core/save';
import { playRound, startFight, startRun, type FightReport } from '../src/core/game';

const data = gameData;
const mossy = getZone(data, 'mossy-hollow');

describe('gear data', () => {
  it('has the new shop choices, sets and trophies', () => {
    expect(Object.keys(data.gear)).toHaveLength(149);
    expect(data.sets).toHaveLength(data.zones.length);
    expect(data.shop.stock).toHaveLength(98);
  });

  it('sells every ring element among the weapons of each tier from level 5 to 36', () => {
    for (const level of [5, 10, 16, 22, 29, 36]) {
      const els = new Set(data.shop.stock.map((id) => data.gear[id]!).filter((g) => g.slot === 'weapon' && g.level === level).map((g) => g.element));
      if (level === 22 || level === 29) expect(els.size, `level ${level}`).toBeGreaterThanOrEqual(4);
      else for (const el of data.elements.ring) expect(els.has(el), `level ${level} ${el}`).toBe(true);
    }
  });

  it('each zone has a set: three weapons from regular fights, armor from the boss, a trinket from the mini-boss', () => {
    for (const zone of data.zones) {
      const set = data.sets.find((s) => s.zone === zone.id)!;
      expect(set, zone.id).toBeDefined();
      expect(setSize(data, set)).toBe(3);
      expect(data.gear[zone.boss.trophy!.gear]!.slot).toBe('armor');
      expect(data.gear[zone.miniBoss.trophy!.gear]!.slot).toBe('trinket');
      expect(zone.gearDrops!.gear.map((id) => data.gear[id]!.weaponType).sort()).toEqual(['magic', 'melee', 'ranged']);
      for (const id of [zone.boss.trophy!.gear, zone.miniBoss.trophy!.gear, ...zone.gearDrops!.gear]) {
        expect(set.pieces).toContain(id);
        expect(data.shop.stock).not.toContain(id);
      }
    }
  });
});

describe('set bonuses', () => {
  const rider = { equipment: { weapon: 'bramblewarden-melee', armor: 'padded-vest', trinket: 'lucky-pebble' } };

  it('one piece gives no set bonus', () => {
    expect(equippedSets(data, rider.equipment)[0]).toMatchObject({ count: 1, bonuses: [] });
    expect(riderBonus(data, rider).riderHp ?? 0).toBe(0);
  });

  it('two pieces give the first tier, three give both', () => {
    const two = { equipment: { ...rider.equipment, trinket: 'bramblewarden-trinket' } };
    // Trinket's own +10 HP plus the 2-piece +10 HP.
    expect(riderBonus(data, two).riderHp).toBe(20);
    expect(riderBonus(data, two).healPct ?? 0).toBe(0);
    const three = { equipment: { ...two.equipment, armor: 'bramblewarden-armor' } };
    const b = riderBonus(data, three);
    expect(b.healPct).toBeCloseTo(0.1);
    expect(b.vigor).toBe(1 + 2);
    expect(equippedSets(data, three.equipment)[0]!.count).toBe(3);
  });

  it('raises max HP through the usual stat path', () => {
    const base = { level: 5, stats: { strength: 5, agility: 5, arcana: 5, vigor: 5 } };
    const plain = riderMaxHp(data, { ...base, equipment: { weapon: 'ash-blade' } });
    const set = riderMaxHp(data, { ...base, equipment: { weapon: 'bramblewarden-melee', armor: 'bramblewarden-armor', trinket: 'bramblewarden-trinket' } });
    expect(set).toBeGreaterThan(plain);
    expect(setOf(data, 'bramblewarden-armor')?.name).toBe('Bramblewarden');
    expect(setOf(data, 'ash-blade')).toBeUndefined();
  });
});

describe('gear drops', () => {
  const none = new Set<string>();

  it('a boss or mini-boss always drops its trophy on the first kill', () => {
    expect(rollGear(mossy, 'boss', none, true, createRng(1))).toEqual(['bramblewarden-armor']);
    expect(rollGear(mossy, 'mini', none, true, createRng(1))).toEqual(['bramblewarden-trinket']);
  });

  it('never drops what the rider owns', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(rollGear(mossy, 'boss', new Set(['bramblewarden-armor']), true, createRng(seed))).toEqual([]);
      const owned = new Set(mossy.gearDrops!.gear);
      expect(rollGear(mossy, 'normal', owned, false, createRng(seed))).toEqual([]);
    }
  });

  it('repeat kills drop the trophy about a quarter of the time (fixed seeds)', () => {
    let hits = 0;
    for (let seed = 1; seed <= 400; seed++) hits += rollGear(mossy, 'boss', none, false, createRng(seed)).length;
    expect(hits / 400).toBeGreaterThan(0.18);
    expect(hits / 400).toBeLessThan(0.32);
  });

  it('regular fights sometimes drop one zone weapon; quests never drop gear', () => {
    let hits = 0;
    for (let seed = 1; seed <= 1000; seed++) {
      const got = rollGear(mossy, 'normal', none, false, createRng(seed));
      expect(got.length).toBeLessThanOrEqual(1);
      for (const id of got) expect(mossy.gearDrops!.gear).toContain(id);
      hits += got.length;
      expect(rollGear(mossy, 'quest', none, true, createRng(seed))).toEqual([]);
    }
    expect(hits / 1000).toBeGreaterThan(0.03);
    expect(hits / 1000).toBeLessThan(0.09);
  });

  it('a first mini-boss kill puts the trophy in the bag and the fight report', () => {
    let s: SaveData = parseSave(readFileSync('e2e/fixtures/juvenile.json', 'utf8'));
    s = startRun(data, s, 'mossy-hollow');
    // This rider meets the boss at the end of a run, so plan the mini-boss fight directly.
    const fights = [{ kind: 'mini' as const, enemies: [{ enemyId: mossy.miniBoss.enemy, level: 8 }] }];
    s = startFight(data, { ...s, run: { ...s.run!, fights, index: 0 } });
    let report: FightReport | null = null;
    for (let i = 0; i < 60 && !report; i++) {
      const r = playRound(data, s, autoOrders(data, s.run!.battle!));
      s = r.save;
      report = r.report;
    }
    expect(report?.outcome).toBe('won');
    expect(report?.rewards?.gear).toEqual(['bramblewarden-trinket']);
    expect(s.rider.gear).toContain('bramblewarden-trinket');
    // Mini-bosses also give Forge materials.
    expect(report?.rewards?.materials).toEqual(data.forge.miniBossMaterials);
    expect(s.rider.materials.ore).toBe(data.forge.miniBossMaterials.ore);
  });
});
