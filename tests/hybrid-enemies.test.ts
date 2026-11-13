import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { createBattle, resolveRound, type BattleEvent, type BattleState } from '../src/core/battle';
import { hatchDragon, newRider } from '../src/core/characters';
import { createRng } from '../src/core/rng';
import { defenseMultiplier, matchupVs, weaknessesOfFighter } from '../src/core/elements';
import { autoOrders } from '../src/core/ai';
import { zoneEgg } from '../src/core/eggs';
import type { ElementId, EnemyData, GameData } from '../src/core/types';

// A Steam (Fire and Tide) enemy that only uses its special move, and one that shifts to Magma (Fire and Stone).
const steam: EnemyData = {
  id: 'test-steam', name: 'Test Steam', element: 'fire', element2: 'tide', flavor: '',
  base: { hp: 400, attack: 20, power: 10, defense: 2, swift: 10, dodge: 0 },
  perLevel: { hp: 0, attack: 0, power: 0, defense: 0, swift: 0, dodge: 0 },
  moves: [{ id: 'scald', name: 'Scald', intent: 'attack', weight: 1, power: 1 }],
};
const shifter: EnemyData = {
  ...steam, id: 'test-shifter', name: 'Test Shifter',
  moves: [{ id: 'cool', name: 'Cool Down', intent: 'shift', weight: 1, shiftTo: 'fire', shiftTo2: 'stone', target: 'self', condition: 'notShifted' }],
};
const data: GameData = { ...gameData, enemies: { ...gameData.enemies, [steam.id]: steam, [shifter.id]: shifter } };
const hybridFactor = data.combat.hybridBreathMultiplier;

function battle(dragonEl: ElementId, enemy = steam.id, seed = 5): BattleState {
  const rider = { ...newRider(data, 'Ash'), level: 60, spells: ['tempest', 'mend', 'arc-bolt', 'frost-dart'] };
  const dragon = hatchDragon(data, createRng(9), { id: 'd', name: 'Pip', element: dragonEl, colors: { primary: '#f00', secondary: '#000' }, now: 0 });
  return createBattle(data, { rider: { ...rider, mp: 99 }, dragon: { ...dragon, level: 30 }, enemies: [{ enemyId: enemy, level: 30 }], seed, canFlee: true });
}
const hitsOn = (events: BattleEvent[], target: string) => events.filter((e): e is Extract<BattleEvent, { t: 'hit' }> => e.t === 'hit' && e.target === target);

describe('hybrid enemies', () => {
  it('fight with both elements', () => {
    const s = battle('fire');
    expect(s.enemies[0]).toMatchObject({ element: 'fire', element2: 'tide' });
  });

  it('defend with the average of their two matchups', () => {
    const e = battle('fire').enemies[0]!;
    // Storm: neutral on Fire, strong on Tide. Frost: weak on Fire, neutral on Tide.
    expect(defenseMultiplier(data.elements, 'storm', e)).toBeCloseTo((1 + 1.5) / 2);
    expect(defenseMultiplier(data.elements, 'frost', e)).toBeCloseTo((0.75 + 1) / 2);
    expect(matchupVs(data.elements, 'storm', e)).toBe('strong');
    expect(matchupVs(data.elements, 'frost', e)).toBe('weak');
    expect(matchupVs(data.elements, 'verdant', e)).toBe('neutral');
    expect(weaknessesOfFighter(data.elements, e)).toEqual(expect.arrayContaining(['storm', 'tide']));
    expect(weaknessesOfFighter(data.elements, e)).not.toContain('fire');
  });

  it('a spell hit says how the hybrid matchup went', () => {
    const s = battle('fire');
    s.intents.e0 = 'scald';
    const r = resolveRound(data, s, { rider: { type: 'spell', spell: 'tempest', target: 'e0' }, dragon: { type: 'guard' } });
    const hit = hitsOn(r.events, 'e0').find((h) => h.actor === 'rider');
    expect(hit).toMatchObject({ element: 'storm', matchup: 'strong' });
  });

  it('special moves use the better element against the target, at the hybrid factor', () => {
    // Against a Fire dragon, Tide is the better half of Steam.
    let seen = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const s = battle('fire', steam.id, seed);
      s.intents.e0 = 'scald';
      const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'guard' } });
      for (const h of r.events.filter((e) => e.t === 'hit' && e.actor === 'e0') as Extract<BattleEvent, { t: 'hit' }>[]) {
        expect(h.element).toBe('tide');
        seen++;
      }
    }
    expect(seen).toBeGreaterThan(0);
    expect(hybridFactor).toBeLessThan(1);
  });

  it('hits for less than a single-element enemy of the same stats would', () => {
    const one: EnemyData = { ...steam, id: 'test-tide', element: 'tide', element2: undefined };
    const d2: GameData = { ...data, enemies: { ...data.enemies, [one.id]: one } };
    const dealt = (enemyId: string) => {
      let total = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const rider = { ...newRider(d2, 'Ash'), level: 30 };
        const dragon = hatchDragon(d2, createRng(9), { id: 'd', name: 'Pip', element: 'fire', colors: { primary: '#f00', secondary: '#000' }, now: 0 });
        const s = createBattle(d2, { rider, dragon: { ...dragon, level: 30 }, enemies: [{ enemyId, level: 30 }], seed, canFlee: true });
        s.intents.e0 = 'scald';
        const r = resolveRound(d2, s, { rider: { type: 'defend' }, dragon: { type: 'guard' } });
        for (const h of r.events) if (h.t === 'hit' && h.actor === 'e0') total += h.amount;
      }
      return total;
    };
    expect(dealt(steam.id)).toBeLessThan(dealt(one.id));
  });

  it('can shift from one hybrid to another', () => {
    const s = battle('fire', shifter.id);
    s.intents.e0 = 'cool';
    const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'guard' } });
    expect(r.state.enemies[0]).toMatchObject({ element: 'fire', element2: 'stone', shifted: true });
    const ev = r.events.find((e) => e.t === 'shift');
    expect(ev?.text).toContain('turns Magma');
  });

  it('the auto-battler aims its spells at the weaker half', () => {
    const s = battle('verdant');
    s.spells = ['tempest', 'ember-lance', 'mend'];
    s.rider.hp = s.rider.maxHp;
    const o = autoOrders(data, s);
    expect(o.rider).toMatchObject({ type: 'spell', spell: 'tempest' });
  });
});

describe('The Confluence', () => {
  const zone = gameData.zones.find((z) => z.id === 'the-confluence')!;
  const ids = [...new Set(zone.encounters.flatMap((e) => e.enemies)), zone.miniBoss.enemy, zone.boss.enemy];

  it('every enemy is a hybrid of two elements that can mix', () => {
    expect(ids).toHaveLength(7);
    for (const id of ids) {
      const e = gameData.enemies[id]!;
      expect(e.element2, id).toBeDefined();
      expect(e.element2).not.toBe(e.element);
    }
  });

  it('the boss shifts from Steam to Magma', () => {
    const seethe = gameData.enemies.seethe!;
    expect([seethe.element, seethe.element2]).toEqual(['fire', 'tide']);
    expect(seethe.moves.find((m) => m.intent === 'shift')).toMatchObject({ shiftTo: 'fire', shiftTo2: 'stone' });
  });

  it('its boss drops hybrid eggs, picked with the seeded RNG', () => {
    const seen = new Set<string>();
    for (let seed = 1; seed <= 200; seed++) {
      const egg = zoneEgg(gameData, createRng(seed), zone.eggDrop!);
      expect(egg.element2, `seed ${seed}`).not.toBeNull();
      seen.add(`${egg.element}+${egg.element2}`);
    }
    expect([...seen].sort()).toEqual(zone.eggDrop!.hybrids!.map(([a, b]) => `${a}+${b}`).sort());
    expect(zoneEgg(gameData, createRng(7), zone.eggDrop!)).toEqual(zoneEgg(gameData, createRng(7), zone.eggDrop!));
  });

  it('other zones still drop eggs of one element', () => {
    const sky = gameData.zones.find((z) => z.id === 'skyreach-isles')!;
    for (let seed = 1; seed <= 50; seed++) {
      const egg = zoneEgg(gameData, createRng(seed), sky.eggDrop!);
      expect(egg.element2).toBeNull();
      expect(['storm', 'light']).toContain(egg.element);
    }
  });
});
