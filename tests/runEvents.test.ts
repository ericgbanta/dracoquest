import { describe, expect, it } from 'vitest';
import { gameData } from '../src/core/data';
import { autoOrders, eventChoice } from '../src/core/ai';
import { createRng } from '../src/core/rng';
import { dragonMaxHp, riderMaxHp } from '../src/core/characters';
import { activeDragon, chooseEgg, chooseEvent, dismissEvent, GameError, hatchEgg, leaveRun, playRound, startFight, warmEgg } from '../src/core/game';
import { eventById, eventsFor, optionCost, resolveOption, rollEvent, MIMIC, type RunEvent } from '../src/core/runEvents';
import { enemyGold } from '../src/core/progression';
import { CURRENT_VERSION, newSave, parseSave, serializeSave, type SaveData } from '../src/core/save';
import type { PlannedFight } from '../src/core/run';
import type { GameData } from '../src/core/types';
import fixtureV13 from './fixtures/save-v13.json';

const data = gameData;
const NOW = 1794355200000;
const zone = data.zones[0]!;

function hatched(): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  s = hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
  return { ...s, rider: { ...s.rider, level: 9, gold: 500 } };
}

const thorn: PlannedFight = { kind: 'normal', enemies: [{ enemyId: 'thornling', level: 8 }] };

/** A Mossy Hollow hunt after its first win, with this event waiting. */
function atEvent(id: string, seed = 1234, base = hatched()): SaveData {
  return {
    ...base,
    run: {
      zoneId: 'mossy-hollow', fights: [thorn, thorn, { kind: 'mini', enemies: [{ enemyId: 'elder-thornling', level: 8 }] }],
      index: 1, battle: null, totals: { xp: 0, gold: 0, drops: {} }, event: { id, seed }, boon: null,
    },
  };
}

/** A seed whose pick of this option lands on the outcome whose text includes `text`. */
function seedFor(id: string, option: string, text: string): number {
  for (let seed = 1; seed < 500; seed++) {
    if (resolveOption(data, zone, 9, { id, seed }, option).text.includes(text)) return seed;
  }
  throw new Error(`no seed for ${id}/${option}/${text}`);
}

const fightGold = (level: number) => enemyGold(data.progression, level, 1);

describe('run event data', () => {
  it('has at least 8 events, at least 5 with a real choice', () => {
    expect(data.runEvents.events.length).toBeGreaterThanOrEqual(8);
    expect(data.runEvents.events.filter((e) => e.options.length > 1).length).toBeGreaterThanOrEqual(5);
  });

  it('every risky option has a safe one beside it', () => {
    for (const e of data.runEvents.events) {
      const risky = e.options.some((o) => o.outcomes.some((x) => x.fight || x.hpCost));
      if (risky) expect(e.options.some((o) => o.safe), e.id).toBe(true);
    }
  });

  it('every option of every event resolves', () => {
    for (const e of data.runEvents.events) {
      for (const o of e.options) {
        const r = resolveOption(data, zone, 9, { id: e.id, seed: 99 }, o.id);
        expect(r.option).toBe(o.id);
        expect(r.text.length).toBeGreaterThan(0);
      }
    }
  });

  it('the lost egg needs level 5 and the wandering dragon needs a dragon', () => {
    expect(eventsFor(data, 3, true).some((e) => e.id === 'egg')).toBe(false);
    expect(eventsFor(data, 5, true).some((e) => e.id === 'egg')).toBe(true);
    expect(eventsFor(data, 9, false).some((e) => e.id === 'wander')).toBe(false);
  });
});

describe('rolling events', () => {
  it('happens at about the set chance', () => {
    const rng = createRng(5);
    let n = 0;
    for (let i = 0; i < 4000; i++) if (rollEvent(data, 9, true, rng)) n++;
    expect(n / 4000).toBeGreaterThan(data.runEvents.chance * 0.9);
    expect(n / 4000).toBeLessThan(data.runEvents.chance * 1.1);
  });

  it('comes after a won regular hunt fight, but never right before the boss, in a story or after the run', () => {
    const always: GameData = { ...data, runEvents: { ...data.runEvents, chance: 1 } };
    const strong = (s: SaveData): SaveData => ({ ...s, rider: { ...s.rider, hp: 9999, stats: { strength: 80, agility: 5, arcana: 10, vigor: 80 } } });
    const win = (d: GameData, s: SaveData) => {
      let x = startFight(d, s);
      for (let i = 0; i < 80 && x.run?.battle; i++) {
        const r = playRound(d, x, autoOrders(d, x.run.battle));
        x = r.save;
        if (r.report) return { save: x, report: r.report };
      }
      throw new Error('no end');
    };
    const hunt = (fights: PlannedFight[], extra: Partial<NonNullable<SaveData['run']>> = {}): SaveData => ({
      ...strong(hatched()), run: { zoneId: 'mossy-hollow', fights, index: 0, battle: null, totals: { xp: 0, gold: 0, drops: {} }, ...extra },
    });
    const boss: PlannedFight = { kind: 'boss', enemies: [{ enemyId: 'bramble-troll', level: 8 }] };
    expect(win(always, hunt([thorn, thorn])).save.run!.event).toBeTruthy();
    expect(win(always, hunt([thorn, boss])).save.run!.event ?? null).toBeNull();
    expect(win(always, hunt([thorn, thorn], { storyId: data.stories[0]!.id })).save.run!.event ?? null).toBeNull();
    expect(win(always, hunt([thorn])).save.run).toBeNull();
  });
});

describe('choosing (fixed seeds)', () => {
  it('blocks the next fight until a choice is made, then clears the event when it starts', () => {
    const s = atEvent('stream');
    expect(() => startFight(data, s)).toThrow(GameError);
    const chosen = chooseEvent(data, s, 'search').save;
    expect(() => chooseEvent(data, chosen, 'search')).toThrow(GameError);
    const fight = startFight(data, chosen);
    expect(fight.run!.event).toBeNull();
    expect(fight.run!.battle).not.toBeNull();
  });

  it('a reload shows the same event, and the same result after a choice', () => {
    const s = atEvent('chest', 777);
    const reloaded = parseSave(serializeSave(s));
    expect(reloaded.run!.event).toEqual({ id: 'chest', seed: 777 });
    const a = chooseEvent(data, s, 'open');
    const b = chooseEvent(data, reloaded, 'open');
    expect(b.result).toEqual(a.result);
    const again = parseSave(serializeSave(a.save));
    expect(again.run!.event!.chosen).toBe('open');
    expect(again.run!.event!.result).toEqual(a.result);
  });

  it('chest, opened: gold and two supplies', () => {
    const seed = seedFor('chest', 'open', 'Gold');
    const s = atEvent('chest', seed);
    const { save, result } = chooseEvent(data, s, 'open');
    expect(result.gold).toBe(Math.round(3 * fightGold(9)));
    expect(save.rider.gold).toBe(s.rider.gold + result.gold);
    expect(Object.values(result.items).reduce((a, b) => a + b, 0)).toBe(2);
    expect(save.run!.fights).toHaveLength(3);
  });

  it('chest, a mimic: an extra fight goes in front, with its art and a zone enemy\'s stats, and pays more', () => {
    const s = atEvent('chest', seedFor('chest', 'open', 'mimic'));
    const { save, result } = chooseEvent(data, s, 'open');
    expect(result.fight!.enemies[0]!.enemyId).toBe(MIMIC);
    expect(save.run!.fights).toHaveLength(4);
    expect(save.run!.fights[1]).toEqual(result.fight);
    let x = startFight(data, { ...save, rider: { ...save.rider, hp: 9999, stats: { strength: 80, agility: 5, arcana: 10, vigor: 80 } } });
    const mimic = x.run!.battle!.enemies[0]!;
    expect(mimic.name).toBe(data.enemies[MIMIC]!.name);
    // Stats come from the sturdiest Mossy Hollow enemy (the Barkback Boar), not the level 40 mimic's curve.
    const boar = data.enemies['barkback-boar']!;
    expect(mimic.maxHp).toBe(Math.round(boar.base.hp + boar.perLevel.hp * 7));
    let report = null;
    for (let i = 0; i < 80 && !report; i++) {
      const r = playRound(data, x, autoOrders(data, x.run!.battle!));
      x = r.save;
      report = r.report;
    }
    expect(report?.outcome).toBe('won');
    expect(report?.bonus).toBe(2.5);
  });

  it('chest, left shut: nothing happens', () => {
    const s = atEvent('chest');
    const { save } = chooseEvent(data, s, 'leave');
    expect(save.rider).toEqual(s.rider);
    expect(save.run!.fights).toHaveLength(3);
  });

  it('shrine: praying heals the rider and dragons by half (HP only)', () => {
    const base = hatched();
    const hurt = { ...base, rider: { ...base.rider, hp: 5, mp: 0 }, dragons: base.dragons.map((d) => ({ ...d, hp: 3 })) };
    const { save } = chooseEvent(data, atEvent('shrine', 1, hurt), 'pray');
    expect(save.rider.hp).toBe(5 + Math.round(riderMaxHp(data, save.rider) * 0.5));
    expect(save.rider.mp).toBe(0);
    expect(activeDragon(save)!.hp).toBe(3 + Math.round(dragonMaxHp(data, activeDragon(save)!) * 0.5));
    // Never past full.
    const full = chooseEvent(data, atEvent('shrine'), 'pray').save;
    expect(full.rider.hp).toBeLessThanOrEqual(riderMaxHp(data, full.rider));
  });

  it('shrine: an offering costs HP and the rider starts the next fight with Fury', () => {
    const s = atEvent('shrine');
    const { save } = chooseEvent(data, s, 'offer');
    expect(save.rider.hp).toBe(Math.max(1, s.rider.hp - Math.round(riderMaxHp(data, s.rider) * 0.15)));
    expect(save.run!.boon).toBe('fury');
    const fight = startFight(data, save);
    expect(fight.run!.battle!.rider.statuses.some((x) => x.id === 'fury')).toBe(true);
    expect(fight.run!.boon).toBeNull();
  });

  it('peddler: buying costs gold and refuses when short', () => {
    const s = atEvent('peddler');
    const { save } = chooseEvent(data, s, 'potions');
    expect(save.rider.gold).toBe(s.rider.gold - 38);
    expect(save.rider.inventory['potion']).toBe((s.rider.inventory['potion'] ?? 0) + 3);
    const ore = chooseEvent(data, s, 'ore').save;
    const cost = optionCost(data, eventById(data, 'peddler')!.options[1]!, 9);
    expect(cost).toBe(Math.round(4 * fightGold(9)));
    expect(ore.rider.materials.ore).toBe((s.rider.materials.ore ?? 0) + 1);
    const poor = { ...s, rider: { ...s.rider, gold: 10 } };
    expect(() => chooseEvent(data, poor, 'potions')).toThrow('Not enough gold');
    expect(chooseEvent(data, poor, 'pass').save.rider.gold).toBe(10);
  });

  it('lost egg: taking it adds an egg of the zone element; leaving it grows the bond', () => {
    const s = atEvent('egg');
    const took = chooseEvent(data, s, 'take').save;
    expect(took.eggs).toHaveLength(s.eggs.length + 1);
    expect(took.eggs.at(-1)!.element).toBe(zone.element);
    const left = chooseEvent(data, s, 'leave').save;
    expect(activeDragon(left)!.bond).toBe(activeDragon(s)!.bond + 3);
    expect(activeDragon(left)!.temper.gentle).toBe(activeDragon(s)!.temper.gentle + data.runEvents.temperPoints);
  });

  it('ambush: standing firm adds a pair fight with a bonus; slipping away adds nothing', () => {
    const s = atEvent('ambush');
    const { save, result } = chooseEvent(data, s, 'fight');
    expect(result.fight!.enemies).toHaveLength(2);
    expect(result.fight!.bonus).toBe(1.75);
    expect(save.run!.fights[1]).toEqual(result.fight);
    expect(chooseEvent(data, s, 'slip').save.run!.fights).toHaveLength(3);
  });

  it('fork: the bramble path adds a champion fight', () => {
    const { result } = chooseEvent(data, atEvent('fork'), 'bramble');
    expect(result.fight!.enemies[0]!.traits!.length).toBeGreaterThan(0);
    expect(chooseEvent(data, atEvent('fork'), 'quiet').save.run!.fights).toHaveLength(3);
  });

  it('wandering dragon: exploring finds something and makes it bolder; calling it back grows the bond', () => {
    const s = atEvent('wander');
    const { save, result } = chooseEvent(data, s, 'follow');
    expect(result.gold + (result.materials.ore ?? 0)).toBeGreaterThan(0);
    expect(activeDragon(save)!.temper.bold).toBe(activeDragon(s)!.temper.bold + data.runEvents.temperPoints);
    expect(activeDragon(chooseEvent(data, s, 'call').save)!.bond).toBe(activeDragon(s)!.bond + 3);
  });

  it('campfire leaves a potion; stream pays gold; traveler gives a treat; satchel has supplies', () => {
    const base = hatched();
    const camp = chooseEvent(data, atEvent('campfire'), 'rest').save;
    expect(camp.rider.inventory['potion']).toBe((base.rider.inventory['potion'] ?? 0) + 1);
    const stream = chooseEvent(data, atEvent('stream'), 'search').save;
    expect(stream.rider.gold).toBe(base.rider.gold + Math.round(2 * fightGold(9)));
    const trav = chooseEvent(data, atEvent('traveler'), 'listen').save;
    expect(trav.rider.inventory['dragon-treat']).toBe((base.rider.inventory['dragon-treat'] ?? 0) + 1);
    const bag = chooseEvent(data, atEvent('satchel'), 'look').save;
    expect(bag.rider.materials.ore).toBe((base.rider.materials.ore ?? 0) + 1);
  });

  it('leaving the run mid-event clears it; dismissing a chosen event leads to the interlude', () => {
    expect(leaveRun(atEvent('chest')).run).toBeNull();
    expect(() => dismissEvent(atEvent('chest'))).toThrow(GameError);
    const done = chooseEvent(data, atEvent('chest'), 'leave').save;
    expect(dismissEvent(done).run!.event).toBeNull();
  });
});

describe('the auto-battler at events', () => {
  const rider = { level: 9, gold: 500, hp: 100 };
  const ev = (id: string): RunEvent => ({ id, seed: 1 });

  it('takes the safe option', () => {
    expect(eventChoice(data, ev('chest'), rider, 100)).toBe('leave');
    expect(eventChoice(data, ev('ambush'), rider, 100)).toBe('slip');
    expect(eventChoice(data, ev('fork'), rider, 100)).toBe('quiet');
    expect(eventChoice(data, ev('peddler'), rider, 100)).toBe('pass');
  });

  it('heals at a shrine when hurt', () => {
    expect(eventChoice(data, ev('shrine'), { ...rider, hp: 30 }, 100)).toBe('pray');
  });
});

describe('save v14', () => {
  it('loads a version 13 save with a run in progress, and the run has no event yet', () => {
    expect(fixtureV13.version).toBe(13);
    const s = parseSave(JSON.stringify(fixtureV13));
    expect(s.version).toBe(CURRENT_VERSION);
    expect(s.rider.name).toBe('Fixture Thirteen');
    expect(s.rares).toEqual({ 'old-mossjaw': { fought: 1, defeated: 1 } });
    expect(s.run!.event).toBeNull();
    expect(s.run!.boon).toBeNull();
    expect(startFight(data, s).run!.battle).not.toBeNull();
  });

  it('a version 13 save without a run stays without one', () => {
    const s = parseSave(JSON.stringify({ ...fixtureV13, run: null }));
    expect(s.run).toBeNull();
  });
});
