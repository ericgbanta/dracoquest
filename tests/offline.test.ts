import { describe, expect, it } from 'vitest';
import { gameData as data } from '../src/core/data';
import { chooseEgg, hatchEgg, warmEgg, zoneLock } from '../src/core/game';
import { PREFETCH_LEVELS_AHEAD, zoneEnemies, zonesToPrefetch } from '../src/core/offline';
import { zoneRare } from '../src/core/run';
import { newSave, type SaveData } from '../src/core/save';

const NOW = 1794355200000;

function hatched(level: number): SaveData {
  let s = chooseEgg(data, newSave(NOW), 'fire');
  for (let i = 0; i < data.dragons.hatchTaps; i++) s = warmEgg(data, s);
  s = hatchEgg(data, s, 'Pip', { primary: '#e8603c', secondary: '#f5e27a' }, NOW);
  return { ...s, rider: { ...s.rider, level } };
}

describe('offline art: which areas to save', () => {
  it('lists every enemy an area can show: hunts, bosses, its rare and its stories', () => {
    for (const zone of data.zones) {
      const ids = zoneEnemies(data, zone.id);
      for (const enc of zone.encounters) for (const id of enc.enemies) expect(ids).toContain(id);
      expect(ids).toContain(zone.boss.enemy);
      expect(ids).toContain(zone.miniBoss.enemy);
      const rare = zoneRare(data, zone.id);
      if (rare) expect(ids).toContain(rare.enemy);
      for (const q of data.stories.filter((s) => s.zone === zone.id)) for (const st of q.steps) for (const id of st.enemies) expect(ids).toContain(id);
      expect(new Set(ids).size).toBe(ids.length);
      for (const id of ids) expect(data.enemies[id], id).toBeDefined();
    }
    expect(zoneEnemies(data, 'nowhere')).toEqual([]);
  });

  it('a new rider gets Mossy Hollow and the areas a few levels ahead, not the far ones', () => {
    const list = zonesToPrefetch(data, hatched(1));
    expect(list).toContain('mossy-hollow');
    expect(list).toContain('sunpetal-meadow');
    expect(list).not.toContain('dragonsrest');
    expect(list).not.toContain('frostmere');
    // Open areas always count; locked ones only when they open within a few levels.
    const s = hatched(1);
    for (const id of list) {
      const z = data.zones.find((x) => x.id === id)!;
      if (zoneLock(data, s, z)) expect(z.unlock?.level ?? z.minLevel).toBeLessThanOrEqual(1 + PREFETCH_LEVELS_AHEAD);
    }
  });

  it('grows as the rider levels up', () => {
    const low = zonesToPrefetch(data, hatched(1));
    const high = zonesToPrefetch(data, hatched(20));
    expect(high.length).toBeGreaterThan(low.length);
    for (const id of low) expect(high).toContain(id);
  });

  it('an area that opens after another area waits until that area is open', () => {
    const z = data.zones.find((x) => x.unlock?.afterBoss)!;
    const s = hatched(z.unlock!.level);
    const prereqOpen = zonesToPrefetch(data, s);
    const after = z.unlock!.afterBoss!;
    if (!prereqOpen.includes(after)) expect(prereqOpen).not.toContain(z.id);
    else expect(prereqOpen).toContain(z.id);
  });
});
