import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { createBattle, resolveRound } from '../src/core/battle';
import { hatchDragon, newRider } from '../src/core/characters';
import { createRng } from '../src/core/rng';
import { canHaveThird, isPartner, setLead, setSecond, setThird, startFight, startRun, thirdDragon } from '../src/core/game';
import { newSave, type SaveData } from '../src/core/save';
import type { DragonState } from '../src/core/types';

const data = gameData;
const NOW = 1794355200000;
const mk = (id: string, element: DragonState['element']): DragonState =>
  ({ ...hatchDragon(data, createRng(id.length), { id, name: id, element, colors: { primary: '#f00', secondary: '#000' }, now: 0 }), stage: 'elder', level: 50 });

function party(level: number): SaveData {
  const s = newSave(NOW);
  const dragons = [mk('Ash', 'fire'), mk('Brook', 'tide'), mk('Moss', 'verdant'), mk('Zap', 'storm')];
  return { ...s, rider: { ...s.rider, level }, dragons, activeDragonId: 'Ash', secondDragonId: 'Brook', thirdDragonId: null };
}

describe('a third partner', () => {
  it('joins at rider level 60', () => {
    expect(data.progression.thirdPartnerRiderLevel).toBe(60);
    expect(canHaveThird(data, party(59))).toBe(false);
    expect(() => setThird(data, party(59), 'Moss', NOW)).toThrow('rider level 60');
    const s = setThird(data, party(60), 'Moss', NOW);
    expect(thirdDragon(s)?.id).toBe('Moss');
    expect(isPartner(s, 'Moss')).toBe(true);
    expect(() => setThird(data, party(60), 'Ash', NOW)).toThrow('already your lead');
  });

  it('swaps seats cleanly with the lead and the second', () => {
    let s = setThird(data, party(60), 'Moss', NOW);
    s = setSecond(data, s, 'Moss', NOW);
    expect([s.secondDragonId, s.thirdDragonId]).toEqual(['Moss', 'Brook']);
    s = setLead(data, s, 'Brook', NOW);
    expect([s.activeDragonId, s.secondDragonId, s.thirdDragonId]).toEqual(['Brook', 'Moss', 'Ash']);
    s = setThird(data, s, null, NOW);
    expect(s.thirdDragonId).toBeNull();
  });

  it('fights: it gets its own turn, breath and target, and enemies can hit it', () => {
    const [lead, two, three] = [mk('Ash', 'fire'), mk('Brook', 'tide'), mk('Moss', 'verdant')];
    let s = createBattle(data, { rider: { ...newRider(data, 'Keeper'), level: 60 }, dragon: lead, second: two, third: three, enemies: [{ enemyId: 'bramble-troll', level: 30 }], seed: 4, canFlee: true });
    expect(s.third?.fighter.id).toBe('dragon3');
    const r = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'guard' }, second: { type: 'guard' }, third: { type: 'claw', target: 'e0' } });
    expect(r.events.some((e) => (e.t === 'hit' || e.t === 'miss') && e.actor === 'dragon3')).toBe(true);
    expect(r.state.third!.breath).toBeGreaterThan(0);
    s = { ...r.state, third: { ...r.state.third!, breath: data.combat.breath.max } };
    const b = resolveRound(data, s, { rider: { type: 'defend' }, dragon: { type: 'guard' }, second: { type: 'guard' }, third: { type: 'breath', target: 'e0' } });
    expect(b.state.third!.breath).toBeLessThan(data.combat.breath.max);
    // Over many rounds, some enemy attack lands on the third dragon.
    let hitThird = false;
    for (let seed = 1; seed <= 30 && !hitThird; seed++) {
      const t = createBattle(data, { rider: newRider(data, 'Keeper'), dragon: lead, second: two, third: three, enemies: [{ enemyId: 'bramble-troll', level: 30 }], seed, canFlee: true });
      hitThird = resolveRound(data, t, { rider: { type: 'defend' }, dragon: { type: 'claw', target: 'e0' } }).events.some((e) => e.t === 'hit' && e.target === 'dragon3');
    }
    expect(hitThird).toBe(true);
  });

  it('comes along on a run only from rider level 60', () => {
    let s = setThird(data, party(60), 'Moss', NOW);
    s = startFight(data, startRun(data, s, 'mossy-hollow'));
    expect(s.run?.battle?.third?.fighter.name).toBe('Moss');
    let low = { ...setThird(data, party(60), 'Moss', NOW) };
    low = { ...low, rider: { ...low.rider, level: 59 } };
    low = startFight(data, startRun(data, low, 'mossy-hollow'));
    expect(low.run?.battle?.third).toBeNull();
  });
});
