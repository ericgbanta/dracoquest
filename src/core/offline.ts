/**
 * Which areas' art to save for offline play. Enemy art and backdrops aren't
 * in the install download; the UI fetches them for the areas listed here.
 */
import type { GameData } from './types';
import type { SaveData } from './save';
import { zoneLock } from './game';
import { zoneRare } from './run';

/** Areas this many rider levels ahead count as coming up next. */
export const PREFETCH_LEVELS_AHEAD = 3;

/** Every enemy that can appear in an area: hunts, bosses, its rare, its stories and quests. */
export function zoneEnemies(data: GameData, zoneId: string): string[] {
  const zone = data.zones.find((z) => z.id === zoneId);
  if (!zone) return [];
  const out = new Set<string>();
  for (const enc of zone.encounters) for (const id of enc.enemies) out.add(id);
  out.add(zone.miniBoss.enemy);
  out.add(zone.boss.enemy);
  const rare = zoneRare(data, zoneId);
  if (rare) out.add(rare.enemy);
  const told = [...data.stories, ...Object.values(data.quests)].filter((q) => q.zone === zoneId);
  for (const q of told) for (const step of q.steps) for (const id of step.enemies) out.add(id);
  return [...out];
}

/**
 * Areas whose art should be on the phone: every open area, plus areas that
 * open soon (within a few rider levels, after an area that is already open).
 */
export function zonesToPrefetch(data: GameData, save: SaveData): string[] {
  const soon = save.rider.level + PREFETCH_LEVELS_AHEAD;
  const open = new Set(data.zones.filter((z) => !zoneLock(data, save, z)).map((z) => z.id));
  return data.zones.filter((z) => {
    if (open.has(z.id)) return true;
    if (z.unlock) {
      const after = z.unlock.afterBoss ?? z.unlock.afterMini;
      return z.unlock.level <= soon && (!after || open.has(after));
    }
    return z.minLevel <= soon;
  }).map((z) => z.id);
}
