import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { autoOrders } from '../src/core/ai';
import { echoScale, enemyFighter, typicalGrowth } from '../src/core/battle';
import { goalReward, logEnemies, logFor, logReady, titles, zoneTitle } from '../src/core/hunterLog';
import { enemyGold } from '../src/core/progression';
import { createRng } from '../src/core/rng';
import { planEcho } from '../src/core/run';
import { storiesFor } from '../src/core/adventures';
import {
  chooseEgg, chooseEvent, claimLogGoal, echoOpen, GameError, hatchEgg, playRound, startEcho, startFight, startRun, startStory, warmEgg,
} from '../src/core/game';
import { CURRENT_VERSION, newSave, parseSave, type SaveData } from '../src/core/save';
import fixtureV15 from './fixtures/save-v15.json';

const data = gameData;
const NOW = 1794355200000;
const zone = (id: string) => data.zones.find((z) => z.id === id)!;
const mossy = zone('mossy-hollow');

function hatched(): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  return hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
}

const withDefeats = (s: SaveData, n: Record<string, number>): SaveData => ({
  ...s, bestiary: { ...s.bestiary, ...Object.fromEntries(Object.entries(n).map(([id, d]) => [id, { fought: d, defeated: d }])) },
});

describe('V4: hunter\'s log', () => {
  it('lists a zone\'s regular enemies with a goal per tier', () => {
    const log = logFor(data, hatched(), mossy);
    expect(log.map((e) => e.enemyId)).toEqual(logEnemies(mossy));
    expect(log).toHaveLength(8);
    for (const e of log) expect(e.goals.map((g) => g.count)).toEqual([10, 25, 50, 100]);
  });

  it('defeats from the bestiary count, so old saves get credit; goals open, ready, then claimed', () => {
    let s = withDefeats(hatched(), { thornling: 27 });
    const t = () => logFor(data, s, mossy).find((e) => e.enemyId === 'thornling')!.goals.map((g) => g.state);
    expect(t()).toEqual(['ready', 'ready', 'open', 'open']);
    expect(logReady(data, s, mossy)).toBe(2);
    const gold = s.rider.gold;
    s = claimLogGoal(data, s, 'mossy-hollow', 'thornling', 10);
    expect(s.rider.gold).toBe(gold + Math.round(4 * enemyGold(data.progression, mossy.maxLevel, 1)));
    expect(t()).toEqual(['claimed', 'ready', 'open', 'open']);
    const ore = s.rider.materials.ore ?? 0;
    s = claimLogGoal(data, s, 'mossy-hollow', 'thornling', 25);
    expect(s.rider.materials.ore).toBe(ore + 1);
    expect(() => claimLogGoal(data, s, 'mossy-hollow', 'thornling', 25)).toThrow('Already claimed');
    expect(() => claimLogGoal(data, s, 'mossy-hollow', 'thornling', 50)).toThrow('Not finished yet');
    expect(() => claimLogGoal(data, s, 'mossy-hollow', 'storm-roc', 10)).toThrow(GameError);
  });

  it('the 50 goal pays an ember and the 100 goal embers and a Sky Crystal', () => {
    expect(goalReward(data, mossy, data.hunterLog.tiers[2]!).embers).toBe(1);
    expect(goalReward(data, mossy, data.hunterLog.tiers[3]!)).toEqual({ embers: 3, materials: { crystal: 1 } });
  });

  it('claiming every goal in a zone earns its title', () => {
    let s = withDefeats(hatched(), Object.fromEntries(logEnemies(mossy).map((id) => [id, 100])));
    expect(zoneTitle(data, s, mossy)).toBeNull();
    for (const e of logFor(data, s, mossy)) for (const g of e.goals) s = claimLogGoal(data, s, 'mossy-hollow', e.enemyId, g.count);
    expect(zoneTitle(data, s, mossy)).toBe('Warden of Mossy Hollow');
    expect(titles(data, s)).toEqual(['Warden of Mossy Hollow']);
  });
});

describe('V5: stories and bounties for the five zones that had none', () => {
  const FIVE = ['cinder-pass', 'thunderspire', 'frostmere', 'deepstone-mines', 'eclipse-peak'];

  it('every zone now has a story and a bounty board', () => {
    for (const z of data.zones) {
      expect(storiesFor(data, z.id).length, z.id).toBeGreaterThan(0);
      expect(data.bounties.pools[z.id]?.length, z.id).toBeGreaterThan(0);
    }
  });

  it('each of the five has a five-quest chain: choices in the second and fourth, the mini-boss, then the boss', () => {
    for (const id of FIVE) {
      const z = zone(id);
      const qs = storiesFor(data, id);
      expect(qs).toHaveLength(5);
      qs.forEach((q, i) => {
        expect(q.requires).toBe(i ? qs[i - 1]!.id : undefined);
        expect(!!q.choice, `${q.id} choice`).toBe(i === 1 || i === 3);
        expect(q.minLevel).toBeGreaterThanOrEqual(z.minLevel);
        expect(q.steps.at(-1)!.level).toBeLessThanOrEqual(z.maxLevel);
      });
      expect(qs[3]!.steps.at(-1)).toMatchObject({ mini: true, enemies: [z.miniBoss.enemy] });
      expect(qs[4]!.steps.at(-1)).toMatchObject({ boss: true, enemies: [z.boss.enemy], level: z.boss.level });
      const pool = data.bounties.pools[id]!;
      for (const e of logEnemies(z)) expect(pool.some((b) => b.enemy === e), e).toBe(true);
      expect(pool.some((b) => b.enemy === z.miniBoss.enemy)).toBe(true);
    }
  });

  it('a new story starts like the others', () => {
    // Cinder Pass needs a Juvenile dragon, like its hunts.
    const h = hatched();
    const s = { ...h, rider: { ...h.rider, level: 12 }, dragons: h.dragons.map((d) => ({ ...d, stage: 'juvenile' })) };
    const run = startStory(data, s, 'hot-feet').run!;
    expect(run.storyId).toBe('hot-feet');
    expect(run.fights[0]!.enemies[0]!.enemyId).toBe('ash-lizard');
  });
});

describe('V6: echo runs', () => {
  const past = (level: number): SaveData => ({ ...hatched(), rider: { ...hatched().rider, level }, bossesDefeated: ['mossy-hollow'] });

  it('opens only past the zone\'s top level with its boss beaten', () => {
    expect(echoOpen(data, past(8), mossy)).toBe(false);
    expect(echoOpen(data, past(9), mossy)).toBe(true);
    expect(echoOpen(data, { ...past(20), bossesDefeated: [] }, mossy)).toBe(false);
    expect(() => startEcho(data, past(8), 'mossy-hollow')).toThrow(GameError);
  });

  it('every enemy is at the rider\'s level, grown from the zone\'s top level, and the run ends with the boss', () => {
    const fights = planEcho(data, 'mossy-hollow', 40, createRng(4));
    const last = fights.at(-1)!;
    expect(last).toMatchObject({ kind: 'boss', enemies: [{ enemyId: mossy.boss.enemy, level: 40, echoFrom: mossy.boss.level }] });
    for (const f of fights.slice(0, -1)) {
      for (const e of f.enemies) {
        expect(e.echoFrom).toBe(mossy.maxLevel);
        expect(e.level).toBe(f.enemies.length > 1 && !e.rare ? 40 + mossy.multiEnemyLevelOffset : 40);
      }
    }
  });

  it('an echo enemy keeps its own stats from the top level, grown like a typical enemy, with the echo curve', () => {
    const e = data.enemies['thornling']!;
    const f = enemyFighter(data, e, 40, 0, { echoFrom: 8, echoMult: 1 });
    const at8 = e.base.hp + e.perLevel.hp * 7;
    expect(f.maxHp).toBe(Math.round(at8 * typicalGrowth(data, 'hp', 8, 40) * echoScale(data, 40)));
    // Much stronger than the plain level 8 Thornling, and its defense grows without the curve.
    expect(f.maxHp).toBeGreaterThan(at8 * 4);
    expect(f.defense).toBeCloseTo((e.base.defense + e.perLevel.defense * 7) * typicalGrowth(data, 'defense', 8, 40));
  });

  it('pays 25 percent more XP and gold', () => {
    const won = (echo: boolean) => {
      let s: SaveData = { ...past(30), rider: { ...past(30).rider, hp: 9999, stats: { strength: 200, agility: 5, arcana: 10, vigor: 200 } } };
      s = { ...s, run: { zoneId: 'mossy-hollow', fights: [{ kind: 'normal', enemies: [{ enemyId: 'thornling', level: 30, echoFrom: 8 }] }, { kind: 'boss', enemies: [{ enemyId: 'bramble-troll', level: 30 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} }, echo } };
      s = startFight(data, s);
      for (let i = 0; i < 40; i++) {
        const r = playRound(data, s, autoOrders(data, s.run!.battle!));
        s = r.save;
        if (r.report) return r.report.rewards!;
      }
      throw new Error('no end');
    };
    const a = won(false), b = won(true);
    expect(b.xp).toBe(Math.round(a.xp * data.echo.rewards.xp));
    expect(b.gold).toBeGreaterThan(a.gold);
  });

  it('startEcho marks the run, and an event fight in an echo follows the rider\'s level', () => {
    const s = startEcho(data, past(40), 'mossy-hollow', '2026-11-15');
    expect(s.run!.echo).toBe(true);
    expect(s.run!.battle!.enemies[0]!.level).toBeGreaterThanOrEqual(39);
    const ev = { ...s, run: { ...s.run!, battle: null, index: 1, event: { id: 'ambush', seed: 5 } } };
    const after = chooseEvent(data, ev, 'fight').save;
    for (const e of after.run!.fights[1]!.enemies) expect(e).toMatchObject({ level: 40, echoFrom: mossy.maxLevel });
  });

  it('a normal hunt is not an echo', () => {
    expect(startRun(data, past(9), 'mossy-hollow').run!.echo).toBeUndefined();
  });
});

describe('save v16', () => {
  it('loads a version 15 save: an empty hunter\'s log, the run is not an echo and keeps its condition', () => {
    expect(fixtureV15.version).toBe(15);
    const s = parseSave(JSON.stringify(fixtureV15));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Fifteen');
    expect(s.hunterLog).toEqual([]);
    expect(s.run!.echo).toBe(false);
    expect(s.run!.condition).toEqual({ id: 'fog' });
    // Old defeats count toward the log right away.
    expect(logReady(data, s, mossy)).toBe(2);
  });

  it('new saves start with an empty log', () => {
    expect(newSave(NOW).hunterLog).toEqual([]);
  });
});
