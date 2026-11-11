import { describe, expect, it } from 'vitest';
import { gameData as data } from '../src/core/data';
import {
  activeDragon, chooseEgg, eggReady, feedDragon, GameError, groomDragon, hatchEgg, leaveRun, playRound,
  rest, spendDragonPoint, spendRiderPoint, startFight, startRun, warmEgg,
} from '../src/core/game';
import { autoOrders } from '../src/core/ai';
import { newSave, type SaveData } from '../src/core/save';
import { planRun } from '../src/core/run';
import { createRng } from '../src/core/rng';
import { groomBond } from '../src/core/care';
import { dragonMaxHp, riderMaxHp } from '../src/core/characters';

const NOW = 1794355200000;
const TODAY = '2026-11-11';

function hatched(element: 'fire' | 'tide' | 'verdant' = 'fire'): SaveData {
  let s = chooseEgg(data, newSave(NOW), element);
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  s = hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
  const inventory = { ...s.rider.inventory };
  for (const f of data.foods) inventory[f.id] = 5;
  return { ...s, rider: { ...s.rider, inventory } };
}

describe('egg and hatching', () => {
  it('picks a starter egg, warms it, and hatches a named dragon', () => {
    let s = chooseEgg(data, newSave(NOW), 'tide');
    expect(eggReady(data, s)).toBe(false);
    expect(() => hatchEgg(data, s, 'Pip', { primary: '#000', secondary: '#fff' }, NOW)).toThrow(GameError);
    for (let i = 0; i < data.dragons.hatchTaps + 5; i++) s = warmEgg(data, s);
    expect(s.egg!.warmth).toBe(data.dragons.hatchTaps);
    s = hatchEgg(data, s, '  Ripple  ', { primary: '#3f8fd8', secondary: '#e9e4da' }, NOW);
    const d = activeDragon(s)!;
    expect(d.name).toBe('Ripple');
    expect(d.element).toBe('tide');
    expect(d.colors.primary).toBe('#3f8fd8');
    expect(d.stage).toBe('hatchling');
    expect(s.egg).toBeNull();
  });

  it('only offers the three starter elements', () => {
    expect(() => chooseEgg(data, newSave(NOW), 'storm')).toThrow(GameError);
  });

  it('advances the save RNG so two saves with the same seed hatch the same dragon', () => {
    expect(hatched().dragons).toEqual(hatched().dragons);
  });
});

describe('care', () => {
  it('feeding gives a stat point and bond, up to 3 meals a day', () => {
    let s = hatched();
    const food = data.foods.find((f) => f.id !== activeDragon(s)!.favoriteFood)!;
    for (let i = 0; i < data.care.mealsPerDay; i++) s = feedDragon(data, s, food.id, TODAY).save;
    const d = activeDragon(s)!;
    expect(d.statPoints).toBe(data.care.mealsPerDay);
    expect(d.bond).toBe(data.care.bondPerMeal * data.care.mealsPerDay);
    expect(() => feedDragon(data, s, food.id, TODAY)).toThrow(RangeError);
    // A new day resets the meal count.
    expect(() => feedDragon(data, s, food.id, '2026-11-12')).not.toThrow();
    expect(s.rider.inventory[food.id]).toBe(5 - data.care.mealsPerDay);
  });

  it('feeding needs food in the bag', () => {
    const s = hatched();
    const empty = { ...s, rider: { ...s.rider, inventory: { ...s.rider.inventory, sweetroot: 0 } } };
    expect(() => feedDragon(data, empty, 'sweetroot', TODAY)).toThrow(GameError);
  });

  it('the favorite food gives double bond', () => {
    const s = hatched();
    const r = feedDragon(data, s, activeDragon(s)!.favoriteFood, TODAY);
    expect(r.result.favorite).toBe(true);
    expect(r.result.bondGained).toBe(data.care.bondPerMeal * data.care.favoriteBondMultiplier);
  });

  it('groom bond depends on taps and is once a day', () => {
    expect(groomBond(data, 0)).toBe(data.care.groom.bondBase);
    expect(groomBond(data, 1000)).toBe(data.care.groom.maxBond);
    const s = groomDragon(data, hatched(), 10, TODAY).save;
    expect(() => groomDragon(data, s, 10, TODAY)).toThrow(RangeError);
  });

  it('rest restores HP and doing all care grants Well kept once', () => {
    let s = hatched();
    s = { ...s, rider: { ...s.rider, hp: 1 }, dragons: s.dragons.map((d) => ({ ...d, hp: 0 })) };
    s = rest(data, s, TODAY);
    expect(s.rider.hp).toBe(riderMaxHp(data, s.rider));
    expect(activeDragon(s)!.hp).toBe(dragonMaxHp(data, activeDragon(s)!));
    expect(s.wellKeptFights).toBe(0);
    s = groomDragon(data, s, 5, TODAY).save;
    expect(s.wellKeptFights).toBe(0);
    s = feedDragon(data, s, data.foods[0]!.id, TODAY).save;
    expect(s.wellKeptFights).toBe(data.care.wellKept.fights);
    s = feedDragon(data, s, data.foods[0]!.id, TODAY).save;
    expect(s.wellKeptFights).toBe(data.care.wellKept.fights);
  });

  it('missing days costs nothing', () => {
    const s = hatched();
    const later = rest(data, s, '2027-03-01');
    expect(activeDragon(later)!.bond).toBe(activeDragon(s)!.bond);
    expect(activeDragon(later)!.stats).toEqual(activeDragon(s)!.stats);
  });
});

describe('stat points', () => {
  it('spends rider and dragon points', () => {
    let s = hatched();
    s = { ...s, rider: { ...s.rider, statPoints: 1 }, dragons: s.dragons.map((d) => ({ ...d, statPoints: 1 })) };
    s = spendRiderPoint(s, 'arcana');
    s = spendDragonPoint(s, 'spirit');
    expect(s.rider.statPoints).toBe(0);
    expect(activeDragon(s)!.statPoints).toBe(0);
    expect(s.rider.stats.arcana).toBe(data.progression.riderBaseStats.arcana + 1);
  });
});

describe('zone runs', () => {
  it('plans 3 to 5 fights then a mini-boss, or the boss once unlocked', () => {
    const rng = createRng(3);
    const zone = data.zones[0]!;
    for (let i = 0; i < 50; i++) {
      const low = planRun(data, zone.id, 1, rng);
      expect(low.length).toBeGreaterThanOrEqual(zone.fights.min + 1);
      expect(low.length).toBeLessThanOrEqual(zone.fights.max + 1);
      expect(low.at(-1)!.kind).toBe('mini');
      for (const f of low.slice(0, -1)) for (const e of f.enemies) {
        expect(e.level).toBeGreaterThanOrEqual(zone.minLevel);
        expect(e.level).toBeLessThanOrEqual(zone.maxLevel);
      }
    }
    expect(planRun(data, zone.id, zone.boss.unlockRiderLevel, rng).at(-1)).toEqual({
      kind: 'boss', enemies: [{ enemyId: zone.boss.enemy, level: zone.boss.level }],
    });
  });

  it('plays a full run: wins pay XP and gold, and the run ends with a report', () => {
    let s = startRun(data, hatched(), 'mossy-hollow');
    expect(s.run!.battle).not.toBeNull();
    let wins = 0;
    let complete = false;
    for (let i = 0; i < 400 && s.run?.battle; i++) {
      const r = playRound(data, s, autoOrders(data, s.run.battle));
      s = r.save;
      if (r.report) {
        if (r.report.outcome !== 'won') break;
        wins++;
        expect(r.report.rewards!.xp).toBeGreaterThan(0);
        if (r.report.runComplete) { complete = true; break; }
        s = startFight(data, s);
      }
    }
    expect(wins).toBeGreaterThan(0);
    expect(s.stats.fightsWon).toBe(wins);
    expect(s.rider.xp + s.rider.level).toBeGreaterThan(1);
    expect(s.bestiary['thornling'] ?? s.bestiary['bog-hopper'] ?? Object.values(s.bestiary)[0]).toBeDefined();
    if (complete) {
      expect(s.run).toBeNull();
      expect(s.stats.runsCompleted).toBe(1);
    }
  });

  it('a loss ends the run but keeps rewards already earned', () => {
    let s = hatched();
    s = startRun(data, { ...s, rider: { ...s.rider, hp: 1 } }, 'mossy-hollow');
    const goldBefore = s.rider.gold;
    let lost = false;
    for (let i = 0; i < 100 && s.run?.battle; i++) {
      const r = playRound(data, s, { rider: { type: 'defend' } });
      s = r.save;
      if (r.report) { lost = r.report.outcome === 'lost'; break; }
    }
    expect(lost).toBe(true);
    expect(s.run).toBeNull();
    expect(s.rider.gold).toBe(goldBefore);
    expect(s.stats.fightsLost).toBe(1);
    expect(s.rider.hp).toBe(1);
  });

  it('cannot rest or start a second run during a run', () => {
    const s = startRun(data, hatched(), 'mossy-hollow');
    expect(() => rest(data, s, TODAY)).toThrow(GameError);
    expect(() => startRun(data, s, 'mossy-hollow')).toThrow(GameError);
    expect(() => leaveRun(s)).toThrow(GameError);
  });
});
