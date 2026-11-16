import { describe, expect, it } from 'vitest';
import { gameData, loadGameData } from '../src/core/data';
import { storiesFor } from '../src/core/adventures';
import { chooseEgg, hatchEgg, startRun, warmEgg, zoneLock } from '../src/core/game';
import { zoneRare } from '../src/core/run';
import { logEnemies } from '../src/core/hunterLog';
import { newSave, type SaveData } from '../src/core/save';

const data = gameData;
const NOW = 1794355200000;
const meadow = data.zones.find((z) => z.id === 'sunpetal-meadow')!;

function hatched(level = 3): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  s = hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
  return { ...s, rider: { ...s.rider, level } };
}
const beatElder = (s: SaveData): SaveData => ({ ...s, bestiary: { ...s.bestiary, 'elder-thornling': { fought: 1, defeated: 1 } } });

describe('V8: Sunpetal Meadow', () => {
  it('is a Storm and Verdant area for levels 3 to 12, right after Mossy Hollow', () => {
    expect(meadow).toMatchObject({ name: 'Sunpetal Meadow', element: 'storm', elements: ['storm', 'verdant'], minLevel: 3, maxLevel: 12 });
    const i = data.zones.findIndex((z) => z.id === 'mossy-hollow');
    expect(data.zones[i + 1]!.id).toBe('sunpetal-meadow');
    expect(logEnemies(meadow)).toEqual(['buzzbee', 'dandelion-hare', 'clover-sprite', 'static-lamb', 'hay-golem']);
    expect(data.enemies[meadow.miniBoss.enemy]!.name).toBe('Queen Buzzbee');
    expect(data.enemies[meadow.boss.enemy]).toMatchObject({ name: 'Thunderhoof', boss: true });
    expect(meadow.eggDrop).toEqual({ element: 'storm', chance: 0.1 });
  });

  it('opens at level 3 once Mossy Hollow\'s mini-boss is beaten', () => {
    expect(zoneLock(data, hatched(2), meadow)).toBe('Opens at rider level 3, after you beat the Elder Thornling');
    expect(zoneLock(data, hatched(5), meadow)).toBe('Opens after you beat the Elder Thornling');
    expect(zoneLock(data, beatElder(hatched(2)), meadow)).toBe('Opens at rider level 3');
    expect(zoneLock(data, beatElder(hatched(3)), meadow)).toBeNull();
    // Beating Mossy Hollow's boss counts too, for saves that never logged the mini-boss.
    expect(zoneLock(data, { ...hatched(9), bossesDefeated: ['mossy-hollow'] }, meadow)).toBeNull();
    expect(() => startRun(data, hatched(5), 'sunpetal-meadow')).toThrow('Elder Thornling');
    expect(startRun(data, beatElder(hatched(5)), 'sunpetal-meadow').run!.zoneId).toBe('sunpetal-meadow');
  });

  it('rejects an unlock that names both a boss and a mini-boss, or neither', () => {
    const raw = (unlock: unknown) => {
      const zones = data.zones.map((z) => (z.id === 'sunpetal-meadow' ? { ...z, unlock } : z));
      return () => loadGameData({ ...rawData(), zones });
    };
    expect(raw({ level: 3, afterBoss: 'mossy-hollow', afterMini: 'mossy-hollow' })).toThrow('afterBoss or afterMini');
    expect(raw({ level: 3 })).toThrow('afterBoss or afterMini');
    expect(raw({ level: 3, afterMini: 'mossy-hollow' })).not.toThrow();
  });

  it('has a five-piece set, a five-quest story with two choices, a bounty board, a rare and a log', () => {
    const set = data.sets.find((s) => s.zone === 'sunpetal-meadow')!;
    expect(set.pieces).toHaveLength(5);
    for (const id of set.pieces) expect(data.gear[id]).toBeDefined();
    expect(meadow.boss.trophy?.gear).toBe('sunpetal-armor');
    const qs = storiesFor(data, 'sunpetal-meadow');
    expect(qs).toHaveLength(5);
    expect(qs.filter((q) => q.choice)).toHaveLength(2);
    expect(qs.at(-1)!.steps.at(-1)).toMatchObject({ boss: true, enemies: ['thunderhoof'], level: 12 });
    expect(data.bounties.pools['sunpetal-meadow']).toHaveLength(8);
    expect(zoneRare(data, 'sunpetal-meadow')).toMatchObject({ name: 'Old Strawhat', enemy: 'hay-golem' });
  });

  it('has a pin and a landmark on the Wilds map', () => {
    const wilds = data.regions.regions.find((r) => r.id === 'wilds')!;
    expect(wilds.zones).toContain('sunpetal-meadow');
    expect(wilds.map!.pins['sunpetal-meadow']).toEqual([0.4, 0.66]);
    expect(wilds.map!.stickers).toEqual([{ zone: 'sunpetal-meadow', art: 'landmark-sunpetal-meadow', x: 0.4, y: 0.62, w: 0.2 }]);
  });
});

/** The raw JSON the game loads, for re-validating with one change. */
function rawData() {
  return {
    elements: data.elements, combat: data.combat, statuses: data.statuses, progression: data.progression, dragons: data.dragons,
    care: data.care, foods: data.foods, items: data.items, enemies: Object.values(data.enemies), zones: data.zones,
    gear: Object.values(data.gear), talents: data.talents, quests: Object.values(data.quests), shop: data.shop, roost: data.roost,
    events: data.events, sets: data.sets, forge: data.forge, stories: data.stories, bounties: data.bounties, regions: data.regions,
    champions: data.champions, runEvents: data.runEvents, conditions: data.conditions, hunterLog: data.hunterLog, echo: data.echo,
  };
}
