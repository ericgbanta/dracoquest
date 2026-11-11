import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import {
  breathReady, comboAvailable, createBattle, damageFormula, intentOf, resolveRound,
  type BattleSetup, type BattleState, type Orders,
} from '../src/core/battle';
import { autoOrders } from '../src/core/ai';
import { hatchDragon, newRider } from '../src/core/characters';
import { createRng } from '../src/core/rng';
import type { DragonState, ElementId, EnemyMove, GameData } from '../src/core/types';

const data = gameData;
const c = data.combat;

function dragon(element: ElementId = 'fire', extra: Partial<DragonState> = {}): DragonState {
  return { ...hatchDragon(data, createRng(9), { id: 'd', name: 'Pip', element, colors: { primary: '#f00', secondary: '#000' }, now: 0 }), ...extra };
}

function setup(over: Partial<BattleSetup> = {}): BattleSetup {
  return { rider: newRider(data, 'Ash'), dragon: dragon(), enemies: [{ enemyId: 'thornling', level: 1 }], seed: 42, canFlee: true, ...over };
}

/** A copy of the game data where one enemy only uses the given move. */
function withOnlyMove(enemyId: string, move: EnemyMove): GameData {
  const e = data.enemies[enemyId]!;
  return { ...data, enemies: { ...data.enemies, [enemyId]: { ...e, moves: [move] } } };
}

function playOut(d: GameData, state: BattleState, orders?: (s: BattleState) => Orders): BattleState {
  let s = state;
  for (let i = 0; i < 100 && s.outcome === 'ongoing'; i++) s = resolveRound(d, s, orders ? orders(s) : autoOrders(d, s)).state;
  return s;
}

describe('damage formula', () => {
  it('computes base × (1 + stat/50) × element × crit × rand − defense', () => {
    expect(damageFormula(c, { base: 10, stat: 5, element: 1, crit: false, roll: 1, defense: 0 })).toBeCloseTo(11);
    expect(damageFormula(c, { base: 10, stat: 50, element: 1.5, crit: false, roll: 1, defense: 0 })).toBeCloseTo(30);
    expect(damageFormula(c, { base: 10, stat: 0, element: 1, crit: true, roll: 1, defense: 0 })).toBeCloseTo(15);
    expect(damageFormula(c, { base: 10, stat: 0, element: 1, crit: false, roll: 0.9, defense: 2 })).toBeCloseTo(7);
  });

  it('never drops below 1', () => {
    expect(damageFormula(c, { base: 1, stat: 0, element: 0.5, crit: false, roll: 0.9, defense: 99 })).toBe(1);
  });
});

describe('battle', () => {
  it('is deterministic for a fixed seed and orders', () => {
    const a = playOut(data, createBattle(data, setup()));
    const b = playOut(data, createBattle(data, setup()));
    expect(a).toEqual(b);
    const r1 = resolveRound(data, createBattle(data, setup()), { rider: { type: 'attack', target: 'e0' }, dragon: { type: 'claw', target: 'e0' } });
    const r2 = resolveRound(data, createBattle(data, setup()), { rider: { type: 'attack', target: 'e0' }, dragon: { type: 'claw', target: 'e0' } });
    expect(r1.events).toEqual(r2.events);
  });

  it('does not mutate the previous state', () => {
    const s = createBattle(data, setup());
    const copy = structuredClone(s);
    resolveRound(data, s, { rider: { type: 'attack', target: 'e0' }, dragon: { type: 'claw', target: 'e0' } });
    expect(s).toEqual(copy);
  });

  it('shows an intent for every enemy', () => {
    const s = createBattle(data, setup({ enemies: [{ enemyId: 'moss-wisp', level: 2 }, { enemyId: 'moss-wisp', level: 2 }] }));
    for (const e of s.enemies) expect(intentOf(data, s, e)).not.toBeNull();
  });

  it('wins a level 1 fight against a Thornling with the auto player', () => {
    const end = playOut(data, createBattle(data, setup()));
    expect(end.outcome).toBe('won');
    expect(end.enemies[0]!.hp).toBe(0);
  });

  it('fills the breath meter and only breathes when full', () => {
    let s = createBattle(data, setup({ enemies: [{ enemyId: 'bramble-troll', level: 8 }] }));
    expect(breathReady(data, s)).toBe(false);
    const orders: Orders = { rider: { type: 'defend' }, dragon: { type: 'breath', target: 'e0' } };
    const first = resolveRound(data, s, orders);
    // Not full: breath falls back to Claw.
    expect(first.events.some((e) => e.t === 'hit' && e.text.includes('Claw')) || first.events.some((e) => e.t === 'miss')).toBe(true);
    s = first.state;
    expect(s.breath).toBeGreaterThan(0);
    let rounds = 1;
    while (!breathReady(data, s) && rounds < 10 && s.outcome === 'ongoing') {
      s = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'guard' } }).state;
      rounds++;
    }
    expect(breathReady(data, s)).toBe(true);
    const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'breath', target: 'e0' } });
    expect(r.events.some((e) => (e.t === 'hit' || e.t === 'miss') && e.text.includes('Breath'))).toBe(true);
  });

  it('Defend roughly halves damage taken by the rider', () => {
    const d = withOnlyMove('thornling', { id: 'jab', name: 'Jab', intent: 'attack', weight: 1, power: 1, physical: true });
    const riderDamage = (rider: Orders['rider']) => {
      let total = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const s = createBattle(d, setup({ dragon: null, seed, enemies: [{ enemyId: 'thornling', level: 5 }] }));
        const r = resolveRound(d, s, { rider });
        total += s.rider.hp - r.state.rider.hp;
      }
      return total;
    };
    const ratio = riderDamage({ type: 'defend' }) / riderDamage({ type: 'item', item: 'none' });
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.65);
  });

  it('lets the dragon take hits for the rider with Guard', () => {
    const d = withOnlyMove('thornling', { id: 'jab', name: 'Jab', intent: 'attack', weight: 1, power: 1, physical: true });
    for (let seed = 1; seed <= 50; seed++) {
      const s = createBattle(d, setup({ seed }));
      const r = resolveRound(d, s, { rider: { type: 'defend' }, dragon: { type: 'guard' } });
      expect(r.state.rider.hp).toBe(s.rider.hp);
    }
  });

  it('applies statuses from enemy moves', () => {
    const d = withOnlyMove('thornling', { id: 'snare', name: 'Snare', intent: 'attack', weight: 1, power: 0.5, status: 'root', statusChance: 1 });
    const s = createBattle(d, setup({ dragon: null }));
    let rooted = false;
    let state = s;
    for (let i = 0; i < 5 && !rooted; i++) {
      const r = resolveRound(d, state, { rider: { type: 'defend' } });
      rooted = r.events.some((e) => e.t === 'status' && e.status === 'root');
      state = r.state;
    }
    expect(rooted).toBe(true);
  });

  it('ticks Burn each round and expires it', () => {
    let s = createBattle(data, setup({ enemies: [{ enemyId: 'barkback-boar', level: 3 }] }));
    s = { ...s, enemies: s.enemies.map((e) => ({ ...e, statuses: [{ id: 'burn' as const, turns: 2 }] })) };
    const r1 = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'guard' } });
    const dot = r1.events.find((e) => e.t === 'dot');
    expect(dot && dot.t === 'dot' ? dot.amount : 0).toBe(Math.round(s.enemies[0]!.maxHp * data.statuses.burn.dotFraction!));
    const r2 = resolveRound(data, r1.state, { rider: { type: 'defend' }, dragon: { type: 'guard' } });
    expect(r2.state.enemies[0]!.statuses.some((x) => x.id === 'burn')).toBe(false);
  });

  it('applies the breath element status to the target', () => {
    let applied = false;
    for (let seed = 1; seed <= 40 && !applied; seed++) {
      let s = createBattle(data, setup({ seed, dragon: dragon('fire'), enemies: [{ enemyId: 'bramble-troll', level: 8 }] }));
      s = { ...s, breath: c.breath.max };
      const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'breath', target: 'e0' } });
      applied = r.events.some((e) => e.t === 'status' && e.status === 'burn' && e.target === 'e0');
    }
    expect(applied).toBe(true);
  });

  it('keeps fighting when the dragon is knocked out, at reduced power', () => {
    const s = createBattle(data, setup({ dragon: dragon('fire', { hp: 0 }) }));
    expect(s.dragon).toBeNull();
    const end = playOut(data, s);
    expect(['won', 'lost']).toContain(end.outcome);
  });

  it('loses when the rider falls', () => {
    const rider = { ...newRider(data, 'Ash'), hp: 1 };
    const end = playOut(data, createBattle(data, setup({ rider, dragon: null, enemies: [{ enemyId: 'bramble-troll', level: 8 }] })),
      () => ({ rider: { type: 'attack', target: 'e0' } }));
    expect(end.outcome).toBe('lost');
  });

  it('cannot flee from a boss', () => {
    const s = createBattle(data, setup({ enemies: [{ enemyId: 'bramble-troll', level: 8 }] }));
    expect(s.canFlee).toBe(false);
    const r = resolveRound(data, s, { rider: { type: 'flee' }, dragon: { type: 'guard' } });
    expect(r.state.outcome).not.toBe('fled');
  });

  it('can flee from a regular fight', () => {
    let fled = false;
    for (let seed = 1; seed <= 20 && !fled; seed++) {
      const r = resolveRound(data, createBattle(data, setup({ seed })), { rider: { type: 'flee' }, dragon: { type: 'guard' } });
      fled = r.state.outcome === 'fled';
    }
    expect(fled).toBe(true);
  });

  it('only allows a combo at the bond threshold', () => {
    const low = createBattle(data, setup({ dragon: dragon('fire', { bond: 19 }) }));
    expect(comboAvailable(data, low, 'tandem-strike')).toBe(false);
    const high = createBattle(data, setup({ dragon: dragon('fire', { bond: 20 }) }));
    expect(comboAvailable(data, high, 'tandem-strike')).toBe(true);
    expect(comboAvailable(data, high, 'sky-dive')).toBe(false);
    const r = resolveRound(data, high, { rider: { type: 'attack', target: 'e0' }, dragon: { type: 'combo', combo: 'tandem-strike', target: 'e0' } });
    expect(r.events.some((e) => e.text.includes('Tandem Strike'))).toBe(true);
    // The combo uses both actions, so the rider's Strike never happens.
    expect(r.events.some((e) => e.text.includes('Strike') && !e.text.includes('Tandem'))).toBe(false);
  });

  it('shifts element with an element-shift move', () => {
    const d = withOnlyMove('spore-puffer', { id: 'frost-spores', name: 'Frost Spores', intent: 'shift', weight: 1, shiftTo: 'frost', target: 'self' });
    const s = createBattle(d, setup({ enemies: [{ enemyId: 'spore-puffer', level: 1 }] }));
    const r = resolveRound(d, s, { rider: { type: 'defend' }, dragon: { type: 'guard' } });
    expect(r.state.enemies[0]!.element).toBe('frost');
  });
});
