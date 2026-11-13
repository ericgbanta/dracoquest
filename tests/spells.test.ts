import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { createBattle, resolveRound, type BattleSetup, type BattleState, type Orders } from '../src/core/battle';
import { autoOrders, suggestedLoadout } from '../src/core/ai';
import { hatchDragon, newRider, riderMaxHp } from '../src/core/characters';
import { createRng } from '../src/core/rng';
import { CURRENT_VERSION, newSave, parseSave } from '../src/core/save';
import { chooseEgg, GameError, type FightReport, hatchEgg, playRound, setSpells, startFight, startRun, warmEgg } from '../src/core/game';
import { defaultLoadout, knownSpells, learnSpells, riderLoadout, setLoadout, SpellError } from '../src/core/spells';
import { xpToNext } from '../src/core/progression';
import type { ElementId, RiderState } from '../src/core/types';
import fixtureV6 from './fixtures/save-v6.json';

const data = gameData;
const spells = data.combat.riderMoves.spells;
const size = data.progression.spellLoadoutSize;

function rider(level: number, spellIds?: string[]): RiderState {
  const r = { ...newRider(data, 'Ash'), level, stats: { strength: 10, agility: 10, arcana: 20, vigor: 10 }, mp: 999 };
  return { ...r, spells: spellIds ?? defaultLoadout(data, level) };
}

function setup(r: RiderState, over: Partial<BattleSetup> = {}): BattleSetup {
  const d = hatchDragon(data, createRng(9), { id: 'd', name: 'Pip', element: 'fire', colors: { primary: '#f00', secondary: '#000' }, now: 0 });
  return { rider: r, dragon: d, enemies: [{ enemyId: 'thornling', level: 5 }], seed: 42, canFlee: true, ...over };
}

/** The rider casts `spell` and the dragon guards, so only the rider's action matters. */
const cast = (spell: string, target = 'e0'): Orders => ({ rider: { type: 'spell', spell, target }, dragon: { type: 'guard' } });

describe('spell data', () => {
  it('has fourteen spells, two from level 1, one per element of the ring plus Shadow, Light, Aether and Void', () => {
    expect(spells).toHaveLength(14);
    expect(knownSpells(data, 1).map((s) => s.id)).toEqual(['arc-bolt', 'mend']);
    const elements = spells.filter((s) => s.element).map((s) => s.element).sort();
    expect(elements).toEqual([...data.elements.ring, 'shadow', 'light', 'aether', 'void'].sort());
    expect(spells.find((s) => s.id === 'radiant-lance')).toMatchObject({ element: 'light', level: 42 });
    expect(spells.find((s) => s.id === 'umbral-bolt')).toMatchObject({ element: 'shadow', level: 32 });
    for (const s of spells) if (s.status) expect(data.statuses[s.status]).toBeDefined();
  });

  it('teaches a strong spell for each zone within two levels of the zone opening', () => {
    // Two-element areas need a spell that beats either of their elements.
    const ring = data.elements.ring;
    const beats = (a: ElementId, b: ElementId) => ring.indexOf(b) === (ring.indexOf(a) + 1) % ring.length;
    for (const zone of data.zones) {
      const els = (zone.elements ?? [zone.element]).filter((el) => ring.includes(el));
      if (!els.length) continue;
      const strong = knownSpells(data, zone.minLevel + 2).find((s) => s.element && els.some((el) => beats(s.element!, el)));
      expect(strong, zone.id).toBeDefined();
    }
  });
});

describe('spell loadout', () => {
  it('fills from the first spells learned', () => {
    expect(defaultLoadout(data, 1)).toEqual(['arc-bolt', 'mend']);
    expect(defaultLoadout(data, 50)).toEqual(['arc-bolt', 'mend', 'frost-dart', 'static-lash']);
    expect(newRider(data, 'New').spells).toEqual(['arc-bolt', 'mend']);
  });

  it('drops unknown, repeated and extra spells', () => {
    expect(riderLoadout(data, { level: 5, spells: ['mend', 'thorn-snare', 'mend', 'nope', 'frost-dart'] })).toEqual(['mend', 'frost-dart']);
    expect(riderLoadout(data, { level: 50, spells: spells.map((s) => s.id) })).toHaveLength(size);
  });

  it('refuses a spell not learned yet, a repeat, or too many', () => {
    expect(() => setLoadout(data, rider(5), ['thorn-snare'])).toThrow(SpellError);
    expect(() => setLoadout(data, rider(5), ['mend', 'mend'])).toThrow(SpellError);
    expect(() => setLoadout(data, rider(50), spells.slice(0, size + 1).map((s) => s.id))).toThrow(SpellError);
    expect(setLoadout(data, rider(20), ['shale-spike', 'mend']).spells).toEqual(['shale-spike', 'mend']);
    expect(setLoadout(data, rider(20), []).spells).toEqual([]);
  });

  it('setSpells turns a bad loadout into a GameError', () => {
    const s = { ...newSave(0), rider: rider(5) };
    expect(() => setSpells(data, s, ['greater-mend'])).toThrow(GameError);
    expect(setSpells(data, s, ['frost-dart']).rider.spells).toEqual(['frost-dart']);
  });

  it('puts newly learned spells in empty slots only', () => {
    const r = learnSpells(data, rider(6, ['arc-bolt', 'mend']), 2);
    expect(r.learned.map((s) => s.id)).toEqual(['frost-dart', 'static-lash']);
    expect(r.rider.spells).toEqual(['arc-bolt', 'mend', 'frost-dart', 'static-lash']);
    const full = learnSpells(data, rider(12, ['arc-bolt', 'mend', 'frost-dart', 'static-lash']), 11);
    expect(full.learned.map((s) => s.id)).toEqual(['tide-surge']);
    expect(full.rider.spells).toEqual(['arc-bolt', 'mend', 'frost-dart', 'static-lash']);
    expect(learnSpells(data, rider(7), 6).learned).toEqual([]);
  });
});

describe('spells in battle', () => {
  it('copies the loadout into the battle', () => {
    expect(createBattle(data, setup(rider(12, ['tide-surge', 'mend']))).spells).toEqual(['tide-surge', 'mend']);
  });

  it('an element spell uses its element: Frost Dart is strong against a Verdant enemy', () => {
    const b = createBattle(data, setup(rider(5, ['frost-dart'])));
    const { events, state } = resolveRound(data, b, cast('frost-dart'));
    const hit = events.find((e) => e.t === 'hit' && e.actor === 'rider');
    expect(hit && hit.t === 'hit' && hit.matchup).toBe('strong');
    expect(state.rider.mp).toBe(b.rider.mp - spells.find((s) => s.id === 'frost-dart')!.mp);
  });

  it('an element spell can inflict its status (fixed seeds)', () => {
    let chilled = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const b = createBattle(data, setup(rider(5, ['frost-dart']), { seed, enemies: [{ enemyId: 'thornling', level: 30 }] }));
      const { events } = resolveRound(data, b, cast('frost-dart'));
      if (events.some((e) => e.t === 'status' && e.status === 'chill' && e.target === 'e0')) chilled++;
    }
    // Status chance is 40% on a hit, so some but not all casts chill.
    expect(chilled).toBeGreaterThan(5);
    expect(chilled).toBeLessThan(30);
  });

  it('Bright Ward shields the rider or the dragon', () => {
    const b = createBattle(data, setup(rider(10, ['bright-ward'])));
    const r1 = resolveRound(data, b, cast('bright-ward', 'rider'));
    expect(r1.events.some((e) => e.t === 'status' && e.status === 'ward' && e.target === 'rider')).toBe(true);
    const r2 = resolveRound(data, b, cast('bright-ward', 'dragon'));
    expect(r2.events.some((e) => e.t === 'status' && e.status === 'ward' && e.target === 'dragon')).toBe(true);
  });

  it('Greater Mend heals more than Mend', () => {
    const healed = (spell: string) => {
      const b = createBattle(data, setup(rider(24, [spell])));
      const hurt: BattleState = { ...b, rider: { ...b.rider, hp: 1 } };
      const ev = resolveRound(data, hurt, cast(spell, 'rider')).events.find((e) => e.t === 'heal' && e.target === 'rider');
      return ev && ev.t === 'heal' ? ev.amount : 0;
    };
    expect(healed('greater-mend')).toBeGreaterThan(healed('mend'));
  });

  it('a spell outside the loadout is not cast', () => {
    const b = createBattle(data, setup(rider(50, ['mend'])));
    const { events, state } = resolveRound(data, b, cast('thorn-snare'));
    expect(events.some((e) => e.text.includes("doesn't know that spell"))).toBe(true);
    expect(state.rider.mp).toBe(b.rider.mp);
  });
});

describe('auto-battler spells', () => {
  it('suggests the strong spell for a zone', () => {
    expect(suggestedLoadout(data, 50, 'storm')).toContain('shale-spike');
    expect(suggestedLoadout(data, 50, 'stone')[1]).toBe('thorn-snare');
    expect(suggestedLoadout(data, 50, 'verdant')).toHaveLength(size);
    expect(suggestedLoadout(data, 1, 'verdant')).toEqual(['mend', 'arc-bolt']);
  });

  it('casts the strongest damage spell in the loadout against the target', () => {
    const r = { ...rider(18, ['arc-bolt', 'frost-dart', 'shale-spike', 'mend']), equipment: { weapon: 'ash-blade' } };
    const full = { ...r, hp: riderMaxHp(data, r) };
    const b = createBattle(data, setup(full, { enemies: [{ enemyId: 'thornling', level: 18 }] }));
    // Thornling is Verdant: Frost beats it. Stone is beaten by Verdant, so Shale Spike is the worst pick.
    expect(autoOrders(data, b).rider).toEqual({ type: 'spell', spell: 'frost-dart', target: 'e0' });
    const noFrost = createBattle(data, setup({ ...full, spells: ['arc-bolt', 'shale-spike', 'mend'] }, { enemies: [{ enemyId: 'thornling', level: 18 }] }));
    expect(autoOrders(data, noFrost).rider).toEqual({ type: 'spell', spell: 'arc-bolt', target: 'e0' });
  });
});

describe('learning spells from fights', () => {
  it('a level-up that crosses a spell level reports the spell and slots it', () => {
    let s = chooseEgg(data, newSave(1), 'fire');
    for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
    s = hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, 1);
    s = { ...s, rider: { ...s.rider, level: 2, xp: xpToNext(data.progression, 2) - 1 } };
    s = startFight(data, startRun(data, s, 'mossy-hollow'));
    let report: FightReport | null = null;
    for (let i = 0; i < 60 && !report; i++) {
      const r = playRound(data, s, autoOrders(data, s.run!.battle!));
      s = r.save;
      report = r.report;
    }
    // Fixed seed: the first Mossy Hollow fight is won and takes the rider to level 3.
    expect(report?.outcome).toBe('won');
    expect(s.rider.level).toBe(3);
    expect(report?.spellsLearned).toEqual([{ id: 'frost-dart', name: 'Frost Dart', equipped: true }]);
    expect(s.rider.spells).toEqual(['arc-bolt', 'mend', 'frost-dart']);
  });
});

describe('save v6 to v7', () => {
  it('migrates the version 6 fixture: a loadout for the rider and the old spells in the open battle', () => {
    expect(fixtureV6.version).toBe(6);
    const s = parseSave(JSON.stringify(fixtureV6));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Six');
    expect(s.rider.level).toBe(26);
    expect(s.rider.spells).toEqual(['arc-bolt', 'mend', 'frost-dart', 'static-lash']);
    expect(s.run?.battle?.spells).toEqual(['arc-bolt', 'mend']);
    // The migrated fight still plays.
    const next = playRound(data, s, autoOrders(data, s.run!.battle!));
    expect(next.save.run).toBeDefined();
  });
});
