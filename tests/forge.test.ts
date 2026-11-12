import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { forgedGear, maxPlus, upgradeBlocker, upgradeCostFor } from '../src/core/forge';
import { riderBonus, riderWeapon } from '../src/core/loadout';
import { createBattle } from '../src/core/battle';
import { newRider } from '../src/core/characters';
import { CURRENT_VERSION, newSave, parseSave, type SaveData } from '../src/core/save';
import { collectExpedition, forgeCraft, forgeUpgrade, GameError, sellGear, startExpedition, upgradeBuilding } from '../src/core/game';
import { rollTripLoot } from '../src/core/roost';
import { createRng } from '../src/core/rng';
import { hatchDragon } from '../src/core/characters';
import fixtureV7 from './fixtures/save-v7.json';

const data = gameData;
const NOW = 1794355200000;

/** A level 30 rider with a level 3 Forge and plenty of everything. */
function rich(): SaveData {
  const s = newSave(NOW);
  return {
    ...s,
    embers: 500,
    rider: {
      ...s.rider, level: 30, gold: 100_000, gear: [...s.rider.gear, 'magma-maul'],
      equipment: { weapon: 'magma-maul', armor: 'padded-vest' }, materials: { ore: 100, crystal: 100, scale: 100 },
    },
    roost: { ...s.roost, levels: { ...s.roost.levels, forge: 3 } },
  };
}

describe('forged gear', () => {
  it('adds damage and bonuses per plus, and names the plus', () => {
    const maul = data.gear['magma-maul']!;
    const p2 = forgedGear(data, maul, 2);
    expect(p2.name).toBe('Magma Maul +2');
    expect(p2.damage).toBe(maul.damage! + 2 * Math.max(1, Math.round(maul.damage! * data.forge.effect.weaponDamagePct)));
    expect(p2.bonus.strength).toBe(3 + 2);
    expect(p2.bonus.riderCrit).toBeCloseTo(0.02 * (1 + 2 * data.forge.effect.bonusPct));
    expect(forgedGear(data, maul, 0)).toBe(maul);
  });

  it('costs more for later pluses and higher-level gear', () => {
    const low = data.gear['bramble-saber']!;
    const high = data.gear['dawnbreaker']!;
    const c1 = upgradeCostFor(data, low, 1)!;
    const c3 = upgradeCostFor(data, low, 3)!;
    expect(c3.gold).toBeGreaterThan(c1.gold);
    expect(c3.materials.scale).toBeGreaterThan(0);
    expect(c1.materials.scale ?? 0).toBe(0);
    expect(upgradeCostFor(data, high, 1)!.materials.ore).toBeGreaterThan(c1.materials.ore!);
    expect(upgradeCostFor(data, low, 4)).toBeNull();
  });

  it('counts in battle: an upgraded weapon hits harder and bonuses grow', () => {
    const r = { ...newRider(data, 'Ash'), equipment: { weapon: 'magma-maul' }, gear: ['magma-maul'] };
    const up = { ...r, upgrades: { 'magma-maul': 3 } };
    expect(riderWeapon(data, up).damage).toBeGreaterThan(riderWeapon(data, r).damage!);
    expect(riderBonus(data, up).strength).toBeGreaterThan(riderBonus(data, r).strength!);
    const d = hatchDragon(data, createRng(1), { id: 'd', name: 'Pip', element: 'fire', colors: { primary: '#f00', secondary: '#000' }, now: 0 });
    const setup = { dragon: d, enemies: [{ enemyId: 'thornling', level: 1 }], seed: 1, canFlee: true };
    expect(createBattle(data, { ...setup, rider: up }).weapon.damage).toBeGreaterThan(createBattle(data, { ...setup, rider: r }).weapon.damage);
  });
});

describe('Forge actions', () => {
  it('needs the Forge built, and its level caps the plus', () => {
    const s = rich();
    const unbuilt = { ...s, roost: { ...s.roost, levels: { ...s.roost.levels, forge: 0 } } };
    expect(() => forgeUpgrade(data, unbuilt, 'magma-maul')).toThrow(GameError);
    const lv1 = { ...s, roost: { ...s.roost, levels: { ...s.roost.levels, forge: 1 } } };
    expect(maxPlus(data, lv1.roost)).toBe(1);
    const once = forgeUpgrade(data, lv1, 'magma-maul');
    expect(once.rider.upgrades['magma-maul']).toBe(1);
    expect(upgradeBlocker(data, once.rider, once.embers, once.roost, 'magma-maul')).toBe('Upgrade the Forge to reach +2');
  });

  it('spends gold, materials and embers, and stops at +3', () => {
    let s = rich();
    for (let plus = 1; plus <= 3; plus++) {
      const cost = upgradeCostFor(data, data.gear['magma-maul']!, plus)!;
      const next = forgeUpgrade(data, s, 'magma-maul');
      expect(next.rider.gold).toBe(s.rider.gold - cost.gold);
      expect(next.embers).toBe(s.embers - cost.embers);
      expect(next.rider.materials.ore).toBe(s.rider.materials.ore! - cost.materials.ore!);
      s = next;
    }
    expect(s.rider.upgrades['magma-maul']).toBe(3);
    expect(() => forgeUpgrade(data, s, 'magma-maul')).toThrow('Already at the highest plus');
  });

  it('refuses dragon gear, gear not owned, too few materials, and mid-run', () => {
    const s = rich();
    expect(() => forgeUpgrade(data, { ...s, rider: { ...s.rider, gear: [...s.rider.gear, 'rope-saddle'] } }, 'rope-saddle')).toThrow('rider gear only');
    expect(() => forgeUpgrade(data, s, 'dawnbreaker')).toThrow('do not own');
    expect(() => forgeUpgrade(data, { ...s, rider: { ...s.rider, materials: {} } }, 'magma-maul')).toThrow('Not enough');
    expect(() => forgeUpgrade(data, { ...s, run: { zoneId: 'mossy-hollow', fights: [], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } }, 'magma-maul')).toThrow('mid-run');
  });

  it('selling an upgraded piece drops its upgrade', () => {
    let s = forgeUpgrade(data, rich(), 'magma-maul');
    s = { ...s, rider: { ...s.rider, equipment: { armor: 'padded-vest' } } };
    expect(sellGear(data, s, 'magma-maul').rider.upgrades['magma-maul']).toBeUndefined();
  });

  it('crafts a recipe once, at the right Forge level', () => {
    const s = rich();
    const crafted = forgeCraft(data, s, 'starforged-blade');
    expect(crafted.rider.gear).toContain('starforged-blade');
    expect(() => forgeCraft(data, crafted, 'starforged-blade')).toThrow('already have');
    const lv2 = { ...s, roost: { ...s.roost, levels: { ...s.roost.levels, forge: 2 } } };
    expect(() => forgeCraft(data, lv2, 'starforged-blade')).toThrow('level 3 Forge');
    expect(forgeCraft(data, lv2, 'forgeheart-amulet').rider.gear).toContain('forgeheart-amulet');
  });

  it('the Forge is built like any other building', () => {
    const s = { ...newSave(NOW), embers: 100, rider: { ...newSave(NOW).rider, gold: 10_000 } };
    expect(upgradeBuilding(data, s, 'forge', NOW).roost.levels.forge).toBe(1);
  });
});

describe('materials', () => {
  it('long expeditions bring back materials (fixed seeds)', () => {
    const roost = { ...newSave(NOW).roost, levels: { ...newSave(NOW).roost.levels, expeditions: 1 } };
    let ore = 0, scale = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const loot = rollTripLoot(data, roost, 'long-haul', { level: 30 }, createRng(seed));
      ore += loot.materials.ore ?? 0;
      scale += loot.materials.scale ?? 0;
    }
    expect(ore).toBeGreaterThan(100);
    expect(scale).toBeGreaterThan(5);
  });

  it('collecting an expedition puts its materials in the bag', () => {
    let s = parseSave(JSON.stringify(fixtureV7));
    const bench = s.dragons.find((d) => d.id !== s.activeDragonId && d.id !== s.secondDragonId && d.assignment.kind === 'idle')
      ?? s.dragons.find((d) => d.id !== s.activeDragonId)!;
    s = { ...s, secondDragonId: s.secondDragonId === bench.id ? null : s.secondDragonId, dragons: s.dragons.map((d) => d.id === bench.id ? { ...d, assignment: { kind: 'idle' } } : d) };
    // Ash Scavenge always brings back 2 or 3 ore.
    s = startExpedition(data, s, bench.id, 'ash-scavenge', NOW);
    const r = collectExpedition(data, s, bench.id, NOW + 5 * 3600_000);
    expect(r.loot.materials.ore).toBeGreaterThanOrEqual(2);
    expect(r.save.rider.materials.ore).toBe(r.loot.materials.ore);
  });
});

describe('save v7 to v8', () => {
  it('migrates the version 7 fixture: no materials, no upgrades, Forge not built', () => {
    expect(fixtureV7.version).toBe(7);
    const s = parseSave(JSON.stringify(fixtureV7));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Seven');
    expect(s.rider.spells).toEqual(['arc-bolt', 'mend', 'frost-dart', 'greater-mend']);
    expect(s.rider.materials).toEqual({});
    expect(s.rider.upgrades).toEqual({});
    expect(s.roost.levels.forge).toBe(0);
    expect(s.roost.levels.nest).toBe(fixtureV7.roost.levels.nest);
  });
});
