/**
 * The hunter's log (VARIETY_PLAN V4): goals for defeating each regular enemy of
 * a zone 10, 25, 50 and 100 times, counted from the bestiary. Each goal pays
 * once when claimed; claiming them all in a zone earns its title.
 */
import { enemyGold } from './progression';
import type { SaveData } from './save';
import type { GameData, StoryReward, ZoneData } from './types';

export type GoalState = 'open' | 'ready' | 'claimed';
export interface LogGoal { count: number; reward: StoryReward; state: GoalState }
export interface LogEntry { enemyId: string; defeated: number; goals: LogGoal[] }

/** How a claimed goal is stored in the save. */
export const logKey = (enemyId: string, count: number) => `${enemyId}:${count}`;

/** A zone's regular enemies, in the order its encounter table first lists them. */
export function logEnemies(zone: ZoneData): string[] {
  const out: string[] = [];
  for (const enc of zone.encounters) for (const id of enc.enemies) if (!out.includes(id)) out.push(id);
  return out;
}

/** A goal's reward, with its gold worked out at the zone's top level. */
export function goalReward(data: GameData, zone: ZoneData, tier: GameData['hunterLog']['tiers'][number]): StoryReward {
  const { goldFights, ...rest } = tier.reward;
  const gold = goldFights ? Math.round(goldFights * enemyGold(data.progression, zone.maxLevel, 1)) : 0;
  return gold ? { gold, ...rest } : { ...rest };
}

export function logFor(data: GameData, save: SaveData, zone: ZoneData): LogEntry[] {
  return logEnemies(zone).map((enemyId) => {
    const defeated = save.bestiary[enemyId]?.defeated ?? 0;
    const goals = data.hunterLog.tiers.map((t) => ({
      count: t.count,
      reward: goalReward(data, zone, t),
      state: (save.hunterLog.includes(logKey(enemyId, t.count)) ? 'claimed' : defeated >= t.count ? 'ready' : 'open') as GoalState,
    }));
    return { enemyId, defeated, goals };
  });
}

export function logReady(data: GameData, save: SaveData, zone: ZoneData): number {
  return logFor(data, save, zone).reduce((n, e) => n + e.goals.filter((g) => g.state === 'ready').length, 0);
}

export function logProgress(data: GameData, save: SaveData, zone: ZoneData): { claimed: number; total: number } {
  const all = logFor(data, save, zone).flatMap((e) => e.goals);
  return { claimed: all.filter((g) => g.state === 'claimed').length, total: all.length };
}

/** The zone's title, once every goal in it is claimed. */
export function zoneTitle(data: GameData, save: SaveData, zone: ZoneData): string | null {
  const p = logProgress(data, save, zone);
  return p.total > 0 && p.claimed === p.total ? data.hunterLog.title.replace('{zone}', zone.name) : null;
}

/** Every title the rider has earned. */
export function titles(data: GameData, save: SaveData): string[] {
  return data.zones.map((z) => zoneTitle(data, save, z)).filter((t): t is string => !!t);
}
