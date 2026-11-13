import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { createBattle, resolveRound, type BattleState } from '../src/core/battle';
import { hatchDragon, newRider } from '../src/core/characters';
import { createRng } from '../src/core/rng';
import { defenseMultiplier, matchup } from '../src/core/elements';
import { canMix } from '../src/core/eggs';

const data = gameData;
const c = data.combat;

function battle(seed = 3, enemy = 'shardling'): BattleState {
  const rider = { ...newRider(data, 'Ash'), level: 30, spells: ['comet-shard', 'mend', 'arc-bolt', 'frost-dart'] };
  const dragon = hatchDragon(data, createRng(9), { id: 'd', name: 'Pip', element: 'fire', colors: { primary: '#f00', secondary: '#000' }, now: 0 });
  return createBattle(data, { rider: { ...rider, mp: 99 }, dragon: { ...dragon, level: 30 }, enemies: [{ enemyId: enemy, level: 30 }], seed, canFlee: true });
}
const silence = (turns = 3) => [{ id: 'silence' as const, turns }];
const hollow = (turns = 3) => [{ id: 'hollow' as const, turns }];

describe('Aether and Void', () => {
  it('are an opposed pair: each beats the other, nothing else, and they cannot mix', () => {
    expect(matchup(data.elements, 'aether', 'void')).toBe('strong');
    expect(matchup(data.elements, 'void', 'aether')).toBe('strong');
    expect(matchup(data.elements, 'aether', 'fire')).toBe('neutral');
    expect(matchup(data.elements, 'fire', 'void')).toBe('neutral');
    expect(canMix(data.elements, 'aether', 'void')).toBe(false);
    expect(defenseMultiplier(data.elements, 'void', { element: 'aether', element2: 'fire' })).toBeCloseTo((1.5 + 1) / 2);
  });

  it('Silence stops the rider casting: the spell becomes a weapon attack and costs no MP', () => {
    const s = battle();
    s.rider.statuses = silence();
    const mp = s.rider.mp;
    const r = resolveRound(data, s, { rider: { type: 'spell', spell: 'comet-shard', target: 'e0' }, dragon: { type: 'claw', target: 'e0' } });
    expect(r.events.some((e) => e.t === 'act' && e.text.includes('silenced and attacks instead'))).toBe(true);
    expect(r.state.rider.mp).toBe(mp);
  });

  it('Silence stops breath, and the meter stays full for later', () => {
    let s = battle();
    s = { ...s, breath: c.breath.max };
    s.dragon!.statuses = silence();
    const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'breath', target: 'e0' } });
    expect(r.events.some((e) => e.t === 'act' && e.text.includes('silenced and claws instead'))).toBe(true);
    expect(r.state.breath).toBe(c.breath.max);
  });

  it('a silenced enemy can only use its plain attack', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const s = battle(seed, 'starwarden');
      s.enemies[0]!.statuses = silence();
      s.intents.e0 = 'star-screech';
      const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'claw', target: 'e0' } });
      expect(r.events.some((e) => e.t === 'act' && e.text.includes("is silenced and can't use Starlight Screech"))).toBe(true);
      expect(r.events.some((e) => e.t === 'status' && e.status === 'silence' && e.target !== 'e0')).toBe(false);
    }
  });

  it('Hollow halves healing received', () => {
    const run = (statuses: BattleState['rider']['statuses']) => {
      const s = battle();
      s.rider.hp = 10;
      s.rider.statuses = statuses;
      const r = resolveRound(data, s, { rider: { type: 'spell', spell: 'mend', target: 'rider' }, dragon: { type: 'claw', target: 'e0' } });
      return r.events.find((e) => e.t === 'heal' && e.target === 'rider');
    };
    const full = run([]);
    const half = run(hollow());
    expect(full && half && full.t === 'heal' && half.t === 'heal').toBe(true);
    if (full?.t === 'heal' && half?.t === 'heal') expect(half.amount).toBeCloseTo(full.amount / 2, -1);
  });

  it('Hollow halves the breath a dragon gains each round', () => {
    const gain = (statuses: BattleState['rider']['statuses']) => {
      const s = battle();
      s.dragon!.statuses = statuses;
      s.enemies[0]!.hp = s.enemies[0]!.maxHp * 10; // nobody wins this round
      s.enemies[0]!.maxHp *= 10;
      s.intents.e0 = 'curl-up';
      return resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'guard' } }).state.breath;
    };
    expect(gain(hollow())).toBe(Math.round(gain([]) / 2));
  });

  it('Starglass Hollow is in the Hidden Reach and opens at 30 after the Storm Roc', () => {
    const z = data.zones.find((x) => x.id === 'starglass-hollow')!;
    expect(z).toMatchObject({ minLevel: 30, maxLevel: 40, elements: ['aether', 'frost'], unlock: { level: 30, afterBoss: 'thunderspire' } });
    expect(data.regions.regions.find((r) => r.id === 'hidden-reach')!.zones).toContain('starglass-hollow');
    expect(data.statuses[data.elements.info.aether.status].silenced).toBe(true);
    expect(data.statuses[data.elements.info.void.status].healMultiplier).toBe(0.5);
  });
});
