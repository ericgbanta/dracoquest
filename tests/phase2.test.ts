import { describe, expect, it } from 'vitest';
import { gameData as data } from '../src/core/data';
import {
  activeDragon, buyEgg, buyGear, buyItem, canEquip, canRide, chooseEgg, equip, GameError, growDragon, growthStatus, hatchEgg,
  learnDragonTalent, playRound, respecTalents, sellGear, shopEggs, startFight, startGrowthQuest, startRun, unequip, warmEgg, zoneLock,
} from '../src/core/game';
import { createBattle, resolveRound, skillReady, type BattleState } from '../src/core/battle';
import { autoOrders } from '../src/core/ai';
import { canLearn, dragonBonus, effectiveRiderStats, respecCost, talentPointsEarned, talentPointsLeft } from '../src/core/loadout';
import { dragonMaxHp, riderMaxHp } from '../src/core/characters';
import { newSave, type SaveData } from '../src/core/save';
import { xpToNext } from '../src/core/progression';
import type { DragonState } from '../src/core/types';

const NOW = 1794355200000;

function hatched(): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  return hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
}

function withDragon(s: SaveData, patch: Partial<DragonState>): SaveData {
  return { ...s, dragons: s.dragons.map((d) => ({ ...d, ...patch })) };
}

function rich(s: SaveData, gold = 100_000, level = 30): SaveData {
  return { ...s, rider: { ...s.rider, gold, level } };
}

describe('eggs in the shop', () => {
  it('sells a Verdant egg for gold, into the Bag, as many times as you can pay', () => {
    const price = data.shop.eggs!.verdant!;
    expect(shopEggs(data)).toEqual([{ element: 'verdant', price }]);
    let s = rich(hatched(), price * 2 + 10);
    s = buyEgg(data, s, 'verdant');
    s = buyEgg(data, s, 'verdant');
    expect(s.eggs.filter((e) => e === 'verdant')).toHaveLength(2);
    expect(s.rider.gold).toBe(10);
    expect(() => buyEgg(data, s, 'verdant')).toThrow('Not enough gold');
  });

  it('refuses eggs it does not stock, and leaves the save alone', () => {
    const s = rich(hatched());
    expect(() => buyEgg(data, s, 'storm')).toThrow(GameError);
    expect(s.eggs).toEqual(hatched().eggs);
  });

  it('only sells elements no boss drops', () => {
    const dropped = new Set(data.zones.flatMap((z) => (z.eggDrop ? [z.eggDrop.element, ...(z.eggDrop.elements ?? [])] : [])));
    for (const { element } of shopEggs(data)) expect(dropped.has(element)).toBe(false);
  });
});

describe('gear and shop', () => {
  it('buys, equips, and applies gear bonuses', () => {
    let s = rich(hatched());
    s = buyGear(data, s, 'brawlers-band');
    expect(s.rider.gold).toBe(100_000 - data.gear['brawlers-band']!.price);
    const before = riderMaxHp(data, s.rider);
    s = equip(data, s, 'brawlers-band');
    expect(effectiveRiderStats(data, s.rider).strength).toBe(s.rider.stats.strength + 2);
    expect(riderMaxHp(data, s.rider)).toBe(before + data.combat.rider.hpPerVigor);
    expect(() => buyGear(data, s, 'brawlers-band')).toThrow(GameError);
  });

  it('enforces level requirements and gold', () => {
    let s = { ...hatched(), rider: { ...hatched().rider, gold: 5000 } };
    s = buyGear(data, s, 'thunder-glaive');
    expect(canEquip(data, s, 'thunder-glaive')).toEqual({ ok: false, reason: 'Needs rider level 22' });
    expect(() => buyGear(data, { ...s, rider: { ...s.rider, gold: 0 } }, 'magma-maul')).toThrow('Not enough gold');
  });

  it('uses the weapon type stat and element in battle', () => {
    let s = rich(hatched());
    s = equip(data, buyGear(data, s, 'ember-rod'), 'ember-rod');
    const b = createBattle(data, { rider: s.rider, dragon: activeDragon(s), enemies: [{ enemyId: 'thornling', level: 1 }], seed: 1, canFlee: true });
    expect(b.weapon).toEqual({ name: 'Ember Rod', damage: 12, element: 'fire', type: 'magic' });
    expect(b.rider.power).toBe(effectiveRiderStats(data, s.rider).arcana);
  });

  it('dragon gear needs an Adult dragon', () => {
    let s = rich(hatched());
    s = buyGear(data, s, 'rope-saddle');
    expect(canEquip(data, s, 'rope-saddle').ok).toBe(false);
    s = withDragon(s, { stage: 'adult', level: 25 });
    s = equip(data, s, 'rope-saddle');
    expect(activeDragon(s)!.equipment.saddle).toBe('rope-saddle');
    expect(dragonMaxHp(data, activeDragon(s)!)).toBe(dragonMaxHp(data, { ...activeDragon(s)!, equipment: {} }) + 30);
    s = unequip(data, s, 'saddle');
    expect(activeDragon(s)!.equipment.saddle).toBeUndefined();
  });

  it('sells unequipped gear for half price and buys items and food', () => {
    let s = rich(hatched(), 1000);
    s = buyGear(data, s, 'lucky-pebble');
    s = sellGear(data, s, 'lucky-pebble');
    expect(s.rider.gold).toBe(1000 - 30 + 15);
    expect(() => sellGear(data, s, 'ash-blade')).toThrow('Unequip it first');
    s = buyItem(data, s, 'potion', 2);
    s = buyItem(data, s, 'char-pepper');
    expect(s.rider.inventory.potion).toBe(data.progression.startingInventory.potion! + 2);
    expect(s.rider.inventory['char-pepper']).toBe(1);
  });

  it('cannot unequip the weapon', () => {
    expect(() => unequip(data, hatched(), 'weapon')).toThrow(GameError);
  });
});

describe('talents', () => {
  const juvenile = (level = 15) => withDragon(hatched(), { stage: 'juvenile', level });

  it('gives no talent points to a hatchling and one per level from 10', () => {
    expect(talentPointsEarned(data, activeDragon(hatched())!)).toBe(0);
    expect(talentPointsEarned(data, activeDragon(juvenile(10))!)).toBe(1);
    expect(talentPointsEarned(data, activeDragon(juvenile(15))!)).toBe(6);
  });

  it('gates tiers by points spent in the tree', () => {
    let s = juvenile(15);
    expect(canLearn(data, activeDragon(s)!, 'taunting-roar')).toMatchObject({ ok: false });
    s = learnDragonTalent(data, s, 'thick-hide');
    s = learnDragonTalent(data, s, 'thick-hide');
    expect(canLearn(data, activeDragon(s)!, 'taunting-roar')).toEqual({ ok: true });
    s = learnDragonTalent(data, s, 'taunting-roar');
    expect(() => learnDragonTalent(data, s, 'taunting-roar')).toThrow('Already at max rank');
    expect(talentPointsLeft(data, activeDragon(s)!)).toBe(3);
    expect(dragonBonus(data, activeDragon(s)!).dragonDefense).toBe(3);
  });

  it('a hatchling cannot learn talents', () => {
    expect(() => learnDragonTalent(data, hatched(), 'thick-hide')).toThrow(RangeError);
  });

  it('gives one free respec per stage, then charges gold', () => {
    let s = rich(juvenile(12), 10_000);
    s = learnDragonTalent(data, s, 'sharp-claws');
    expect(respecCost(data, activeDragon(s)!)).toBe(0);
    s = respecTalents(data, s);
    expect(activeDragon(s)!.talents).toEqual({});
    expect(s.rider.gold).toBe(10_000);
    s = learnDragonTalent(data, s, 'sharp-claws');
    const cost = data.talents.respec.goldPerDragonLevel * 12;
    expect(respecCost(data, activeDragon(s)!)).toBe(cost);
    s = respecTalents(data, s);
    expect(s.rider.gold).toBe(10_000 - cost);
    // Growing up resets the free respec.
    expect(growDragon(data, activeDragon(s)!).freeRespecsUsed).toBe(0);
  });

  it('uses an active talent skill and puts it on cooldown', () => {
    let s = juvenile(15);
    s = learnDragonTalent(data, learnDragonTalent(data, s, 'sharp-claws'), 'sharp-claws');
    s = learnDragonTalent(data, s, 'twin-claws');
    let b = createBattle(data, { rider: s.rider, dragon: activeDragon(s), enemies: [{ enemyId: 'bramble-troll', level: 8 }], seed: 3, canFlee: true });
    expect(b.skills).toContain('twin-claws');
    const r = resolveRound(data, b, { rider: { type: 'defend' }, dragon: { type: 'skill', skill: 'twin-claws', target: 'e0' } });
    expect(r.events.filter((e) => (e.t === 'hit' || e.t === 'miss') && e.text.includes('Twin Claws')).length).toBe(2);
    b = r.state;
    expect(skillReady(b, 'twin-claws')).toBe(false);
    b = resolveRound(data, b, { rider: { type: 'defend' }, dragon: { type: 'guard' } }).state;
    expect(skillReady(b, 'twin-claws')).toBe(false);
    b = resolveRound(data, b, { rider: { type: 'defend' }, dragon: { type: 'guard' } }).state;
    expect(skillReady(b, 'twin-claws')).toBe(true);
  });

  it('Taunting Roar makes every enemy attack the dragon', () => {
    let s = juvenile(15);
    s = learnDragonTalent(data, learnDragonTalent(data, s, 'thick-hide'), 'thick-hide');
    s = learnDragonTalent(data, s, 'taunting-roar');
    for (let seed = 1; seed <= 20; seed++) {
      let b = createBattle(data, { rider: s.rider, dragon: activeDragon(s), enemies: [{ enemyId: 'thornling', level: 5 }], seed, canFlee: true });
      b = { ...b, dragon: { ...b.dragon!, statuses: [{ id: 'taunt', turns: 2 }] } };
      const r = resolveRound(data, b, { rider: { type: 'defend' }, dragon: { type: 'guard' } });
      expect(r.state.rider.hp).toBe(b.rider.hp);
    }
  });
});

describe('life stages and growth quests', () => {
  it('needs the stage level cap and the bond score', () => {
    const d = activeDragon(hatched())!;
    expect(growthStatus(data, d)).toMatchObject({ ready: false, levelOk: false, bondOk: false });
    expect(growthStatus(data, { ...d, level: 9, bond: 29 })).toMatchObject({ ready: false, levelOk: true, bondOk: false });
    expect(growthStatus(data, { ...d, level: 9, bond: 30 }).ready).toBe(true);
  });

  it('grows a hatchling into a Juvenile by finishing First Flight', () => {
    let s = withDragon(rich(hatched(), 0, 9), { level: 9, xp: xpToNext(data.progression, 9) - 1, bond: 30 });
    s = { ...s, rider: { ...s.rider, hp: riderMaxHp(data, s.rider) } };
    s = withDragon(s, { stage: 'hatchling', statPoints: 0, stats: { might: 30, scale: 30, swift: 15, spirit: 15 } });
    s = { ...s, rider: { ...s.rider, stats: { strength: 20, agility: 8, arcana: 15, vigor: 20 } } };
    s = { ...s, rider: { ...s.rider, hp: riderMaxHp(data, s.rider) } };
    s = withDragon(s, { hp: dragonMaxHp(data, activeDragon(s)!) });
    s = startGrowthQuest(data, s);
    expect(s.run!.questId).toBe('first-flight');
    expect(s.run!.fights[0]!.intro!.length).toBeGreaterThan(0);
    let grew: string | undefined;
    for (let i = 0; i < 300 && s.run; i++) {
      if (!s.run.battle) s = startFight(data, s);
      const r = playRound(data, s, autoOrders(data, s.run!.battle!));
      s = r.save;
      if (r.report?.grewTo) grew = r.report.grewTo;
      if (r.report && r.report.outcome !== 'won') break;
    }
    expect(grew).toBe('juvenile');
    const d = activeDragon(s)!;
    expect(d.stage).toBe('juvenile');
    expect(d.level).toBeGreaterThanOrEqual(10);
    expect(d.statPoints).toBeGreaterThanOrEqual(5);
    expect(s.questsDone).toContain('first-flight');
  });

  it('gates zones by life stage', () => {
    const s = hatched();
    const cinder = data.zones.find((z) => z.id === 'cinder-pass')!;
    expect(zoneLock(data, s, cinder)).toContain('Juvenile');
    expect(() => startRun(data, s, 'cinder-pass')).toThrow(GameError);
    expect(zoneLock(data, withDragon(s, { stage: 'juvenile', level: 12 }), cinder)).toBeNull();
  });
});

describe('ride mode', () => {
  function adultAtBoss(): SaveData {
    let s = withDragon(rich(hatched(), 0, 27), { stage: 'adult', level: 27, bond: 70 });
    s = { ...s, rider: { ...s.rider, stats: { strength: 30, agility: 15, arcana: 25, vigor: 30 } } };
    s = { ...s, rider: { ...s.rider, hp: riderMaxHp(data, s.rider), mp: 60 } };
    s = withDragon(s, { stats: { might: 40, scale: 30, swift: 20, spirit: 25 } });
    s = withDragon(s, { hp: dragonMaxHp(data, activeDragon(s)!) });
    s = { ...s, run: { zoneId: 'thunderspire', fights: [{ kind: 'boss', enemies: [{ enemyId: 'storm-roc', level: 28 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } };
    return s;
  }

  it('merges rider and dragon into one unit with combined HP', () => {
    const s = adultAtBoss();
    expect(canRide(data, s)).toBe(true);
    const b = startFight(data, s, { ride: true }).run!.battle!;
    expect(b.mode).toBe('ride');
    expect(b.dragon).toBeNull();
    expect(b.rider.maxHp).toBe(riderMaxHp(data, s.rider) + dragonMaxHp(data, activeDragon(s)!));
    expect(b.canFlee).toBe(false);
  });

  it('is not offered for hatchlings or regular fights', () => {
    const s = adultAtBoss();
    expect(canRide(data, withDragon(s, { stage: 'juvenile' }))).toBe(false);
    const regular = { ...s, run: { ...s.run!, fights: [{ kind: 'normal' as const, enemies: [{ enemyId: 'gale-hawk', level: 20 }] }] } };
    expect(canRide(data, regular)).toBe(false);
    expect(startFight(data, regular, { ride: true }).run!.battle!.mode).toBe('normal');
  });

  it('beats the Storm Roc mounted, splits HP back, and drops a Storm egg the first time', () => {
    let won = 0;
    let egg = 0;
    for (let seed = 1; seed <= 10; seed++) {
      let s = { ...adultAtBoss(), seed };
      s = startFight(data, s, { ride: true });
      for (let i = 0; i < 100 && s.run?.battle; i++) {
        const r = playRound(data, s, autoOrders(data, s.run.battle));
        s = r.save;
        if (r.report) {
          if (r.report.outcome === 'won') {
            won++;
            if (r.report.egg === 'storm') egg++;
            expect(s.eggs).toEqual(['storm']);
            expect(s.bossesDefeated).toContain('thunderspire');
          }
          const d = activeDragon(s)!;
          expect(s.rider.hp).toBeLessThanOrEqual(riderMaxHp(data, s.rider));
          expect(d.hp).toBeLessThanOrEqual(dragonMaxHp(data, d));
        }
      }
    }
    expect(won).toBeGreaterThan(0);
    expect(egg).toBe(won);
  });

  it('Skyfire needs a full breath meter', () => {
    const b0 = startFight(data, adultAtBoss(), { ride: true }).run!.battle! as BattleState;
    const r = resolveRound(data, b0, { rider: { type: 'ride', move: 'skyfire', target: 'e0' } });
    expect(r.events.some((e) => e.text.includes("isn't full"))).toBe(true);
    const full = { ...b0, breath: data.combat.breath.max };
    const r2 = resolveRound(data, full, { rider: { type: 'ride', move: 'skyfire', target: 'e0' } });
    expect(r2.events.some((e) => (e.t === 'hit' || e.t === 'miss') && e.text.includes('Skyfire'))).toBe(true);
  });
});
