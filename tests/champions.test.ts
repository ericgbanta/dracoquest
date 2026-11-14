import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { createBattle, enemyFighter, resolveRound, type BattleSetup, type BattleState, type Orders } from '../src/core/battle';
import { autoOrders } from '../src/core/ai';
import { hatchDragon, newRider } from '../src/core/characters';
import { createRng } from '../src/core/rng';
import { planRun, rollRewards, rollSpecials, zoneRare } from '../src/core/run';
import { chooseEgg, hatchEgg, playRound, startFight, warmEgg } from '../src/core/game';
import { CURRENT_VERSION, newSave, parseSave, type SaveData } from '../src/core/save';
import type { DragonState, GameData } from '../src/core/types';
import fixtureV12 from './fixtures/save-v12.json';

const data = gameData;
const NOW = 1794355200000;

/** Every hit lands and nothing crits, so trait effects are easy to compare. */
const sure: GameData = {
  ...data,
  combat: { ...data.combat, hit: { ...data.combat.hit, min: 1, max: 1 }, crit: { ...data.combat.crit, base: 0, max: 0, perAgility: 0, perSwift: 0 } },
};

/** Game data where champions and rares always (or never) show up. */
function rates(champion: number, rare: number): GameData {
  return { ...data, champions: { ...data.champions, champion: { ...data.champions.champion, chance: champion }, rare: { ...data.champions.rare, chance: rare } } };
}

function dragon(extra: Partial<DragonState> = {}): DragonState {
  return { ...hatchDragon(data, createRng(9), { id: 'd', name: 'Pip', element: 'fire', colors: { primary: '#f00', secondary: '#000' }, now: 0 }), ...extra };
}

function setup(traits: string[] | undefined, over: Partial<BattleSetup> = {}): BattleSetup {
  return {
    rider: newRider(data, 'Ash'), dragon: dragon(), seed: 42, canFlee: true,
    enemies: [{ enemyId: 'barkback-boar', level: 4, ...(traits ? { traits } : {}) }], ...over,
  };
}

const claw: Orders = { rider: { type: 'defend' }, dragon: { type: 'claw', target: 'e0' } };
const swing: Orders = { rider: { type: 'attack', target: 'e0' } };
const hold: Orders = { rider: { type: 'defend' }, dragon: { type: 'guard' } };

function damageTo(events: ReturnType<typeof resolveRound>['events'], target: string, actor?: string): number {
  return events.filter((e) => e.t === 'hit' && e.target === target && (!actor || e.actor === actor)).reduce((s, e) => s + (e.t === 'hit' ? e.amount : 0), 0);
}

function hatched(): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  return hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
}

describe('champion data', () => {
  it('every zone has one named rare built on one of its regular enemies', () => {
    expect(data.champions.rares).toHaveLength(data.zones.length);
    for (const z of data.zones) {
      const r = zoneRare(data, z.id);
      expect(r, z.id).toBeDefined();
      expect(z.encounters.some((e) => e.enemies.includes(r!.enemy))).toBe(true);
      expect(r!.traits.length).toBeGreaterThan(0);
    }
  });

  it('has at least six traits, each with a tint', () => {
    const ids = Object.keys(data.champions.traits);
    expect(ids.length).toBeGreaterThanOrEqual(6);
    for (const id of ids) expect(data.champions.traits[id]!.tint).toBeTruthy();
  });
});

describe('champion and rare rolls', () => {
  const zone = data.zones[0]!;
  const spawn = [{ enemyId: 'thornling', level: 3 }];

  it('makes champions with one or two different traits when the chance hits', () => {
    for (let seed = 1; seed < 40; seed++) {
      const out = rollSpecials(rates(1, 0), zone, 3, spawn, createRng(seed));
      expect(out[0]!.traits!.length).toBeGreaterThanOrEqual(1);
      expect(out[0]!.traits!.length).toBeLessThanOrEqual(2);
      expect(new Set(out[0]!.traits).size).toBe(out[0]!.traits!.length);
    }
  });

  it('never makes champions below the minimum rider level', () => {
    expect(rollSpecials(rates(1, 0), zone, 1, spawn, createRng(1))).toEqual(spawn);
  });

  it('a rare replaces the whole fight, alone', () => {
    const out = rollSpecials(rates(0, 1), zone, 5, [{ enemyId: 'moss-wisp', level: 4 }, { enemyId: 'moss-wisp', level: 4 }], createRng(3));
    expect(out).toEqual([{ enemyId: 'barkback-boar', level: 5 + data.champions.rare.levelOffset, rare: 'old-mossjaw' }]);
  });

  it('mini-boss and boss fights stay plain', () => {
    const fights = planRun(rates(1, 1), 'mossy-hollow', 8, createRng(5));
    const last = fights.at(-1)!;
    expect(['boss', 'mini']).toContain(last.kind);
    expect(last.enemies[0]!.traits).toBeUndefined();
    expect(last.enemies[0]!.rare).toBeUndefined();
  });

  it('champions show up at about the set rate in hunts', () => {
    let enemies = 0, champs = 0;
    const rng = createRng(77);
    for (let i = 0; i < 3000; i++) {
      for (const f of planRun(data, 'mossy-hollow', 5, rng)) {
        if (f.kind !== 'normal') continue;
        for (const e of f.enemies) { enemies++; if (e.traits) champs++; }
      }
    }
    const rate = champs / enemies;
    expect(rate).toBeGreaterThan(data.champions.champion.chance * 0.8);
    expect(rate).toBeLessThan(data.champions.champion.chance * 1.2);
  });
});

describe('champion fighters', () => {
  it('get the trait prefix and the champion HP bonus', () => {
    const plain = enemyFighter(data, data.enemies['thornling']!, 5, 0);
    const champ = enemyFighter(data, data.enemies['thornling']!, 5, 0, { traits: ['swift'] });
    expect(champ.name).toBe('Swift Thornling');
    expect(champ.maxHp).toBe(Math.round(plain.maxHp * data.champions.champion.stats.hp!));
    expect(champ.traits).toEqual(['swift']);
  });

  it('a rare uses its own name, fixed traits and stat line', () => {
    const plain = enemyFighter(data, data.enemies['barkback-boar']!, 6, 0);
    const rare = enemyFighter(data, data.enemies['barkback-boar']!, 6, 0, { rare: 'old-mossjaw' });
    expect(rare.name).toBe('Old Mossjaw');
    expect(rare.rare).toBe('old-mossjaw');
    expect(rare.traits).toEqual(['armored', 'enraged']);
    expect(rare.maxHp).toBe(Math.round(plain.maxHp * data.champions.rare.stats.hp!));
    expect(rare.attack).toBeCloseTo(plain.attack! * data.champions.rare.stats.attack!);
    // Armored on top of the rare line.
    expect(rare.defense).toBeCloseTo(plain.defense * (data.champions.rare.stats.defense ?? 1) * data.champions.traits.armored!.stats!.defense!);
  });
});

describe('traits in battle (fixed seeds)', () => {
  it('Swift: more initiative and dodge', () => {
    const plain = createBattle(data, setup(undefined)).enemies[0]!;
    const swift = createBattle(data, setup(['swift'])).enemies[0]!;
    expect(swift.swift).toBeCloseTo(plain.swift * 1.6);
    expect(swift.dodge).toBeCloseTo(plain.dodge * 1.6);
  });

  it('Armored: plain claws do less', () => {
    const a = resolveRound(sure, createBattle(sure, setup(undefined)), claw);
    const b = resolveRound(sure, createBattle(sure, setup(['armored'])), claw);
    const plainHit = damageTo(a.events, 'e0', 'dragon');
    const armoredHit = damageTo(b.events, 'e0', 'dragon');
    expect(plainHit).toBeGreaterThan(0);
    expect(armoredHit).toBeLessThan(plainHit);
  });

  it('Thorned: a weapon swing hurts the rider back, but never knocks them out', () => {
    const s = createBattle(sure, setup(['thorned'], { dragon: null }));
    const r = resolveRound(sure, s, swing);
    const hit = damageTo(r.events, 'e0', 'rider');
    const recoil = r.events.find((e) => e.t === 'recoil');
    expect(recoil).toBeDefined();
    expect(recoil!.t === 'recoil' && recoil!.amount).toBe(Math.max(1, Math.round(hit * 0.2)));
    // At 2 HP the thorns stop at 1.
    const low = { ...s, rider: { ...s.rider, hp: 2 } };
    let st: BattleState = low;
    for (let i = 0; i < 5 && st.outcome === 'ongoing'; i++) {
      const res = resolveRound(withOnlyHarmless(), st, swing);
      st = res.state;
      expect(st.rider.hp).toBeGreaterThanOrEqual(1);
    }
  });

  it('Thorned: spells and breath are safe', () => {
    const s = createBattle(sure, setup(['thorned'], { dragon: null }));
    const r = resolveRound(sure, s, { rider: { type: 'spell', spell: 'arc-bolt', target: 'e0' } });
    expect(r.events.some((e) => e.t === 'recoil')).toBe(false);
  });

  it('Vampiric: heals for part of what it deals', () => {
    const d = withOnlyAttack();
    const s = createBattle(d, setup(['vampiric'], { dragon: null }));
    const hurt = { ...s, enemies: [{ ...s.enemies[0]!, hp: 10 }] };
    const r = resolveRound(d, hurt, { rider: { type: 'defend' } });
    const dealt = damageTo(r.events, 'rider');
    expect(dealt).toBeGreaterThan(0);
    const heal = r.events.find((e) => e.t === 'heal' && e.target === 'e0');
    expect(heal && heal.t === 'heal' && heal.amount).toBe(Math.round(dealt * 0.3));
  });

  it('Enraged: hits harder below half HP and says so', () => {
    const d = withOnlyAttack();
    const calm = createBattle(d, setup(['enraged'], { dragon: null }));
    const angry = { ...calm, enemies: [{ ...calm.enemies[0]!, enraged: true }] };
    const a = damageTo(resolveRound(d, calm, { rider: { type: 'defend' } }).events, 'rider');
    const b = damageTo(resolveRound(d, angry, { rider: { type: 'defend' } }).events, 'rider');
    expect(b).toBeGreaterThan(a);
    // Knocking it under half sets it off.
    const s = createBattle(sure, setup(['enraged']));
    const nearly = { ...s, enemies: [{ ...s.enemies[0]!, hp: Math.ceil(s.enemies[0]!.maxHp * 0.5) + 1 }] };
    const r = resolveRound(sure, nearly, claw);
    expect(r.state.enemies[0]!.enraged).toBe(true);
    expect(r.events.some((e) => e.t === 'act' && e.text.includes('flies into a rage'))).toBe(true);
  });

  it('Shielded: starts behind a Ward', () => {
    const f = createBattle(data, setup(['shielded'])).enemies[0]!;
    const ward = f.statuses.find((x) => x.id === 'ward');
    expect(ward?.shield).toBe(Math.round(f.maxHp * data.statuses.ward.shieldFraction!));
  });

  it('Hulking: much more HP', () => {
    const plain = createBattle(data, setup(undefined)).enemies[0]!;
    const big = createBattle(data, setup(['hulking'])).enemies[0]!;
    expect(big.maxHp).toBe(Math.round(plain.maxHp * data.champions.champion.stats.hp! * 1.5));
  });

  it('Mending: heals at the end of each round', () => {
    const s = createBattle(data, setup(['mending']));
    const hurt = { ...s, enemies: [{ ...s.enemies[0]!, hp: 10 }] };
    const r = resolveRound(data, hurt, hold);
    const heal = r.events.filter((e) => e.t === 'heal' && e.target === 'e0' && e.actor === 'e0').at(-1);
    expect(heal && heal.t === 'heal' && heal.amount).toBe(Math.round(s.enemies[0]!.maxHp * 0.05));
  });

  it('the auto-battler beats an on-level champion and a rare most of the time', () => {
    let won = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const enemies = seed % 2 ? [{ enemyId: 'thornling', level: 4, traits: ['thorned', 'vampiric'] }] : [{ enemyId: 'barkback-boar', level: 5, rare: 'old-mossjaw' }];
      const rider = { ...newRider(data, 'Ash'), level: 5, stats: { strength: 12, agility: 5, arcana: 10, vigor: 11 } };
      let s = createBattle(data, { rider, dragon: dragon({ level: 5, stats: { might: 13, scale: 10, swift: 5, spirit: 9 } }), enemies, seed, canFlee: true });
      for (let i = 0; i < 80 && s.outcome === 'ongoing'; i++) s = resolveRound(data, s, autoOrders(data, s)).state;
      if (s.outcome === 'won') won++;
    }
    expect(won).toBeGreaterThanOrEqual(24);
  });
});

/** Every enemy only attacks. */
function withOnlyAttack(): GameData {
  const e = sure.enemies['barkback-boar']!;
  return { ...sure, enemies: { ...sure.enemies, 'barkback-boar': { ...e, moves: [{ id: 'gore', name: 'Gore', intent: 'attack', weight: 1, power: 1, physical: true }] } } };
}

/** Every enemy only braces itself, so the rider's HP only moves from thorns. */
function withOnlyHarmless(): GameData {
  const e = sure.enemies['barkback-boar']!;
  return { ...sure, enemies: { ...sure.enemies, 'barkback-boar': { ...e, moves: [{ id: 'bark-up', name: 'Bark Up', intent: 'buff', weight: 1, buff: 'harden', target: 'self' }] } } };
}

describe('champion and rare rewards', () => {
  const battleWith = (enemies: BattleSetup['enemies']) => {
    const s = createBattle(data, setup(undefined, { enemies }));
    return { ...s, enemies: s.enemies.map((e) => ({ ...e, hp: 0 })), outcome: 'won' as const };
  };

  it('champions pay more XP and gold', () => {
    const plain = rollRewards(data, 'mossy-hollow', battleWith([{ enemyId: 'thornling', level: 5 }]), createRng(1));
    const champ = rollRewards(data, 'mossy-hollow', battleWith([{ enemyId: 'thornling', level: 5, traits: ['swift'] }]), createRng(1));
    expect(champ.xp).toBe(Math.round(plain.xp * data.champions.champion.rewards.xp));
    expect(champ.gold).toBeGreaterThan(plain.gold);
  });

  it('a rare pays embers and items on top', () => {
    const r = rollRewards(data, 'mossy-hollow', battleWith([{ enemyId: 'barkback-boar', level: 6, rare: 'old-mossjaw' }]), createRng(1));
    expect(r.embers).toBe(data.champions.rare.rewards.embers);
    for (const [id, n] of Object.entries(data.champions.rare.rewards.items!)) expect(r.drops[id]).toBeGreaterThanOrEqual(n);
  });

  it('beating a rare counts it in the save and gives its embers', () => {
    let s = hatched();
    s = { ...s, rider: { ...s.rider, level: 6, hp: 999, stats: { strength: 40, agility: 5, arcana: 10, vigor: 40 } } };
    s = { ...s, run: { zoneId: 'mossy-hollow', fights: [{ kind: 'normal', enemies: [{ enemyId: 'barkback-boar', level: 6, rare: 'old-mossjaw' }] }, { kind: 'mini', enemies: [{ enemyId: 'elder-thornling', level: 6 }] }], index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} } } };
    s = startFight(data, s);
    const embers = s.embers;
    let report = null;
    for (let i = 0; i < 80 && !report; i++) {
      const r = playRound(data, s, autoOrders(data, s.run!.battle!));
      s = r.save;
      report = r.report;
    }
    expect(report?.outcome).toBe('won');
    expect(report?.rare).toEqual({ id: 'old-mossjaw', name: 'Old Mossjaw', first: true });
    expect(s.rares['old-mossjaw']).toEqual({ fought: 1, defeated: 1 });
    expect(s.embers).toBe(embers + data.champions.rare.rewards.embers!);
  });
});

describe('save v13', () => {
  it('loads a version 12 save, adds the rare count, and keeps its run playable', () => {
    expect(fixtureV12.version).toBe(12);
    const s = parseSave(JSON.stringify(fixtureV12));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Twelve');
    expect(s.rider.gold).toBe(1212);
    expect(s.rider.spellPlus).toEqual({ 'arc-bolt': 1 });
    expect(s.rares).toEqual({});
    const fight = startFight(data, s);
    expect(fight.run!.battle!.enemies[0]!.name).toBe('Thornling');
  });

  it('new saves start with no rares seen', () => {
    expect(newSave(NOW).rares).toEqual({});
  });
});
