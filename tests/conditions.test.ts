import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { gameData } from '../src/core/data';
import { autoOrders } from '../src/core/ai';
import { createBattle, resolveRound, type BattleSetup } from '../src/core/battle';
import { hatchDragon, newRider } from '../src/core/characters';
import { battleCondition, conditionById, conditionFor, describeCondition } from '../src/core/conditions';
import { createRng } from '../src/core/rng';
import { planRun } from '../src/core/run';
import { chooseEgg, hatchEgg, playRound, startFight, startRun, warmEgg } from '../src/core/game';
import { CURRENT_VERSION, newSave, parseSave, type SaveData } from '../src/core/save';
import type { DragonState, ZoneData } from '../src/core/types';
import fixtureV14 from './fixtures/save-v14.json';

const data = gameData;
const NOW = 1794355200000;
const mossy = data.zones[0]!;
const zone = (id: string) => data.zones.find((z) => z.id === id)!;

function hatched(): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  return hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
}

/** A day on which this zone has this condition. */
function dayWith(z: ZoneData, id: string): string {
  for (let i = 0; i < 2000; i++) if (conditionFor(data, z, `2026-01-${i}`).id === id) return `2026-01-${i}`;
  throw new Error(`no day with ${id}`);
}

function dragon(extra: Partial<DragonState> = {}): DragonState {
  return { ...hatchDragon(data, createRng(9), { id: 'd', name: 'Pip', element: 'fire', colors: { primary: '#f00', secondary: '#000' }, now: 0 }), ...extra };
}
const setup = (over: Partial<BattleSetup> = {}): BattleSetup => ({
  rider: newRider(data, 'Ash'), dragon: dragon(), enemies: [{ enemyId: 'thornling', level: 2 }], seed: 42, canFlee: true, ...over,
});

describe('daily conditions', () => {
  it('has a calm day and several conditions, each with a name and text', () => {
    const ids = data.conditions.conditions.map((c) => c.id);
    expect(ids).toContain('calm');
    expect(ids.length).toBeGreaterThanOrEqual(6);
  });

  it('the same day and zone always give the same condition; zones differ', () => {
    expect(conditionFor(data, mossy, '2026-11-15')).toEqual(conditionFor(data, mossy, '2026-11-15'));
    const days = Array.from({ length: 60 }, (_, i) => `2026-03-${i}`);
    const a = days.map((d) => conditionFor(data, mossy, d).id).join();
    const b = days.map((d) => conditionFor(data, zone('saltmarsh-shore'), d).id).join();
    expect(a).not.toBe(b);
  });

  it('picks conditions about as often as their weights say', () => {
    const total = data.conditions.conditions.reduce((s, c) => s + c.weight, 0);
    const counts: Record<string, number> = {};
    for (let i = 0; i < 6000; i++) {
      const id = conditionFor(data, mossy, `day-${i}`).id;
      counts[id] = (counts[id] ?? 0) + 1;
    }
    for (const c of data.conditions.conditions) {
      expect(counts[c.id]! / 6000, c.id).toBeGreaterThan((c.weight / total) * 0.8);
      expect(counts[c.id]! / 6000, c.id).toBeLessThan((c.weight / total) * 1.2);
    }
  });

  it('a surge picks one of the zone\'s elements and names it', () => {
    const fen = zone('whispering-fen');
    const c = conditionFor(data, fen, dayWith(fen, 'surge'));
    expect(fen.elements).toContain(c.element);
    const text = describeCondition(data, c)!;
    expect(text.name).toBe(`${data.elements.info[c.element!].name} surge`);
    expect(text.text).not.toContain('{element}');
  });

  it('a hunt keeps the condition of the day it started, for every fight', () => {
    const day = dayWith(mossy, 'fog');
    const s = startRun(data, hatched(), 'mossy-hollow', day);
    expect(s.run!.condition).toEqual({ id: 'fog' });
    expect(s.run!.battle!.condition).toEqual({ dodgeBonus: conditionById(data, 'fog')!.battle!.dodgeBonus });
    expect(startRun(data, hatched(), 'mossy-hollow').run!.condition).toBeNull();
  });
});

describe('what each condition does (fixed seeds)', () => {
  it('Fog: more misses on both sides', () => {
    const fog = battleCondition(data, { id: 'fog' });
    let plain = 0, foggy = 0;
    for (let seed = 1; seed <= 300; seed++) {
      const orders = { rider: { type: 'attack' as const, target: 'e0' } };
      const a = resolveRound(data, createBattle(data, setup({ seed, dragon: null })), orders).events;
      const b = resolveRound(data, createBattle(data, setup({ seed, dragon: null, condition: fog })), orders).events;
      plain += a.filter((e) => e.t === 'miss').length;
      foggy += b.filter((e) => e.t === 'miss').length;
    }
    expect(foggy).toBeGreaterThan(plain * 1.3);
  });

  it('Surge: hits of that element are 20 percent stronger', () => {
    const surge = battleCondition(data, { id: 'surge', element: 'frost' });
    const orders = { rider: { type: 'spell' as const, spell: 'frost-dart', target: 'e0' } };
    const sure = { ...data, combat: { ...data.combat, hit: { ...data.combat.hit, min: 1, max: 1 } } };
    const rider = { ...newRider(data, 'Ash'), level: 3, spells: ['frost-dart'] };
    const hit = (cond: typeof surge) => resolveRound(sure, createBattle(sure, setup({ rider, dragon: null, enemies: [{ enemyId: 'thornling', level: 2 }], condition: cond })), orders)
      .events.find((e) => e.t === 'hit' && e.actor === 'rider');
    const a = hit(null)!, b = hit(surge)!;
    expect(a.t === 'hit' && b.t === 'hit' && b.amount / a.amount).toBeGreaterThan(1.1);
    expect(data.combat.riderMoves.spells.find((x) => x.id === 'frost-dart')!.element).toBe('frost');
  });

  it('Tailwind: breath fills faster', () => {
    const wind = battleCondition(data, { id: 'tailwind' });
    const orders = { rider: { type: 'defend' as const }, dragon: { type: 'guard' as const } };
    const a = resolveRound(data, createBattle(data, setup()), orders).state.breath;
    const b = resolveRound(data, createBattle(data, setup({ condition: wind })), orders).state.breath;
    expect(b - a).toBe(conditionById(data, 'tailwind')!.battle!.breathPerRound);
  });

  it('Full moon: champions twice as likely in a hunt', () => {
    const count = (odds: number) => {
      const rng = createRng(3);
      let n = 0, champs = 0;
      for (let i = 0; i < 2500; i++) for (const f of planRun(data, 'mossy-hollow', 5, rng, { champion: odds })) {
        if (f.kind === 'normal') for (const e of f.enemies) { n++; if (e.traits) champs++; }
      }
      return champs / n;
    };
    expect(count(2) / count(1)).toBeGreaterThan(1.7);
    expect(conditionById(data, 'full-moon')!.championMultiplier).toBe(2);
  });

  it('Bounty day: twice the gold from a won fight', () => {
    const win = (day: string) => {
      let s = startRun(data, { ...hatched(), rider: { ...hatched().rider, hp: 999, stats: { strength: 60, agility: 5, arcana: 10, vigor: 60 } } }, 'mossy-hollow', day);
      s = { ...s, run: { ...s.run!, fights: [{ kind: 'normal', enemies: [{ enemyId: 'thornling', level: 1 }] }, s.run!.fights.at(-1)!], battle: null } };
      s = startFight(data, s);
      for (let i = 0; i < 40; i++) {
        const r = playRound(data, s, autoOrders(data, s.run!.battle!));
        s = r.save;
        if (r.report) return r.report.rewards!.gold;
      }
      throw new Error('no end');
    };
    let plain = 0, bounty = 0;
    for (let i = 0; i < 30; i++) {
      plain += win(dayWith(mossy, 'calm'));
      bounty += win(dayWith(mossy, 'bounty-day'));
    }
    expect(bounty / plain).toBeGreaterThan(1.7);
    expect(bounty / plain).toBeLessThan(2.3);
  });
});

describe('save v15', () => {
  it('loads a version 14 save mid-event; the run has no condition and keeps its event', () => {
    expect(fixtureV14.version).toBe(14);
    const s = parseSave(JSON.stringify(fixtureV14));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Fourteen');
    expect(s.run!.condition).toBeNull();
    expect(s.run!.event).toEqual({ id: 'stream', seed: 99 });
  });
});

describe('V7: three more enemies in each of the first four zones', () => {
  const MORE: Record<string, string[]> = JSON.parse(readFileSync('tools/art/painted/zones.json', 'utf8')) as never;
  const assets = JSON.parse(readFileSync('src/art/assets.json', 'utf8')) as { rigs: Record<string, { parts: { parts: { file: string }[] }[] }> };
  const zonesWithMore = ['mossy-hollow', 'saltmarsh-shore', 'whispering-fen', 'cinder-pass'];

  it('each zone has 8 regular enemies, and each new one has moves, art, an encounter and (where the zone has a board) a bounty', () => {
    for (const id of zonesWithMore) {
      const z = zone(id);
      const regular = new Set(z.encounters.flatMap((e) => e.enemies));
      expect(regular.size, id).toBe(8);
      for (const eid of (MORE[id] as unknown as { more: string[] }).more) {
        const e = data.enemies[eid]!;
        expect(e.moves.length).toBe(3);
        expect(z.encounters.some((enc) => enc.enemies.length === 1 && enc.enemies[0] === eid)).toBe(true);
        expect(assets.rigs[`enemy.${eid}`]!.parts[0]!.parts.map((p) => p.file)).toEqual([`painted/enemies/${eid}.webp`, `painted/enemies/${eid}-attack.webp`]);
        // Cinder Pass has no bounty board yet (one of the five zones without stories or bounties).
        const pool = data.bounties.pools[id];
        if (pool) expect(pool.some((b) => b.kind === 'defeat' && b.enemy === eid), eid).toBe(true);
      }
    }
  });

  it('each new enemy is beaten on level by the auto-battler most of the time', () => {
    for (const id of zonesWithMore) {
      for (const eid of (MORE[id] as unknown as { more: string[] }).more) {
        const level = zone(id).minLevel + 2;
        let won = 0;
        for (let seed = 1; seed <= 20; seed++) {
          const rider = { ...newRider(data, 'Ash'), level, stats: { strength: 5 + level * 2, agility: 5, arcana: 5 + level, vigor: 5 + level * 2 } };
          rider.hp = 9999;
          let s = createBattle(data, { rider, dragon: dragon({ level, stats: { might: 5 + level * 2, scale: 5 + level, swift: 5, spirit: 5 + level } }), enemies: [{ enemyId: eid, level }], seed, canFlee: true });
          for (let i = 0; i < 80 && s.outcome === 'ongoing'; i++) s = resolveRound(data, s, autoOrders(data, s)).state;
          if (s.outcome === 'won') won++;
        }
        expect(won, eid).toBeGreaterThanOrEqual(17);
      }
    }
  });
});
