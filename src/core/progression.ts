import type { DragonState, DragonStat, GameData, ProgressionData, RiderStat, RiderState } from './types';

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(p: ProgressionData, level: number): number {
  return Math.round(p.xpBase * Math.pow(level, p.xpExponent));
}

/** XP an enemy of this level gives before multipliers. */
export function enemyXp(p: ProgressionData, level: number, multiplier = 1): number {
  return Math.max(1, Math.round(p.enemyXpBase * Math.pow(level, p.enemyXpExponent) * multiplier));
}

export function enemyGold(p: ProgressionData, level: number, multiplier = 1): number {
  return Math.round((p.enemyGoldBase + p.enemyGoldPerLevel * level) * multiplier);
}

export interface LevelResult<T> { state: T; levelsGained: number }

/** Highest level a dragon can reach in its current life stage. */
export function dragonLevelCap(data: GameData, dragon: DragonState): number {
  const stage = data.dragons.stages.find((s) => s.id === dragon.stage);
  return Math.min(stage?.maxLevel ?? data.progression.levelCap, data.progression.levelCap);
}

function applyXp<T extends { level: number; xp: number; statPoints: number }>(
  p: ProgressionData, who: T, amount: number, cap: number,
): LevelResult<T> {
  let { level, xp, statPoints } = who;
  let gained = 0;
  xp += Math.max(0, Math.round(amount));
  while (level < cap && xp >= xpToNext(p, level)) {
    xp -= xpToNext(p, level);
    level += 1;
    statPoints += p.statPointsPerLevel;
    gained += 1;
  }
  // At the cap, XP stops at the threshold so it isn't lost when the cap rises.
  if (level >= cap) xp = Math.min(xp, xpToNext(p, level) - 1);
  return { state: { ...who, level, xp, statPoints }, levelsGained: gained };
}

export function giveRiderXp(data: GameData, rider: RiderState, amount: number): LevelResult<RiderState> {
  return applyXp(data.progression, rider, amount, data.progression.levelCap);
}

export function giveDragonXp(data: GameData, dragon: DragonState, amount: number): LevelResult<DragonState> {
  return applyXp(data.progression, dragon, amount, dragonLevelCap(data, dragon));
}

export function allocateRider(rider: RiderState, stat: RiderStat, points = 1): RiderState {
  if (points < 1 || points > rider.statPoints) throw new RangeError('Not enough stat points');
  return { ...rider, statPoints: rider.statPoints - points, stats: { ...rider.stats, [stat]: rider.stats[stat] + points } };
}

export function allocateDragon(dragon: DragonState, stat: DragonStat, points = 1): DragonState {
  if (points < 1 || points > dragon.statPoints) throw new RangeError('Not enough stat points');
  return { ...dragon, statPoints: dragon.statPoints - points, stats: { ...dragon.stats, [stat]: dragon.stats[stat] + points } };
}

export function addBond(data: GameData, dragon: DragonState, amount: number): DragonState {
  return { ...dragon, bond: Math.max(0, Math.min(data.progression.bond.max, dragon.bond + amount)) };
}
