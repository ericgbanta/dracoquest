/**
 * Gear and talent bonuses. Everything a character wears or has learned adds
 * up into one Bonus, which the stat formulas and the battle engine read.
 */
import type {
  Bonus, BonusKey, DragonState, DragonStats, GameData, GearData, GearSetData, RiderState, RiderStats, TalentData, TalentTree,
} from './types';
import { DRAGON_STATS, RIDER_STATS } from './types';
import { temperament } from './roost';

export function addBonus(into: Bonus, add: Bonus | undefined, times = 1): Bonus {
  if (!add) return into;
  for (const [k, v] of Object.entries(add) as [BonusKey, number][]) into[k] = (into[k] ?? 0) + v * times;
  return into;
}

export const bonusOf = (b: Bonus, k: BonusKey): number => b[k] ?? 0;

export function gearItem(data: GameData, id: string | undefined): GearData | null {
  return id ? data.gear[id] ?? null : null;
}

export interface ActiveSet {
  set: GearSetData;
  /** Pieces of the set equipped. */
  count: number;
  /** Bonus tiers reached. */
  bonuses: Bonus[];
}

/** Sets with at least one piece equipped, and the bonus tiers each one reaches. */
export function equippedSets(data: GameData, equipment: Partial<Record<string, string>>): ActiveSet[] {
  const ids = new Set(Object.values(equipment ?? {}).filter((x): x is string => !!x));
  const out: ActiveSet[] = [];
  for (const set of data.sets) {
    const count = set.pieces.filter((p) => ids.has(p)).length;
    if (count === 0) continue;
    out.push({ set, count, bonuses: set.bonuses.filter((b) => count >= b.pieces).map((b) => b.bonus) });
  }
  return out;
}

/** The set a gear piece belongs to, if any. */
export function setOf(data: GameData, gearId: string): GearSetData | undefined {
  return data.sets.find((s) => s.pieces.includes(gearId));
}

/** How many separate slots a set fills when complete (its three weapons share one slot). */
export function setSize(data: GameData, set: GearSetData): number {
  return new Set(set.pieces.map((id) => data.gear[id]?.slot)).size;
}

export function riderBonus(data: GameData, rider: Pick<RiderState, 'equipment'>): Bonus {
  const b: Bonus = {};
  for (const id of Object.values(rider.equipment ?? {})) addBonus(b, gearItem(data, id)?.bonus);
  for (const active of equippedSets(data, rider.equipment ?? {})) for (const bonus of active.bonuses) addBonus(b, bonus);
  return b;
}

export function dragonBonus(data: GameData, dragon: Pick<DragonState, 'equipment' | 'talents'> & Partial<Pick<DragonState, 'temper'>>): Bonus {
  const b: Bonus = {};
  const temper = temperament(data, dragon);
  if (temper) addBonus(b, data.roost.temperament.types[temper].bonus);
  for (const id of Object.values(dragon.equipment ?? {})) addBonus(b, gearItem(data, id)?.bonus);
  for (const [id, rank] of Object.entries(dragon.talents ?? {})) addBonus(b, talentById(data, id)?.bonusPerRank, rank);
  return b;
}

export function effectiveRiderStats(data: GameData, rider: Pick<RiderState, 'stats' | 'equipment'>): RiderStats {
  const b = riderBonus(data, rider);
  const out = { ...rider.stats };
  for (const k of RIDER_STATS) out[k] += bonusOf(b, k);
  return out;
}

export function effectiveDragonStats(data: GameData, dragon: Pick<DragonState, 'stats' | 'equipment' | 'talents'> & Partial<Pick<DragonState, 'temper'>>): DragonStats {
  const b = dragonBonus(data, dragon);
  const out = { ...dragon.stats };
  for (const k of DRAGON_STATS) out[k] += bonusOf(b, k);
  return out;
}

/** The equipped weapon, or the starting weapon if none. */
export function riderWeapon(data: GameData, rider: Pick<RiderState, 'equipment'>): GearData {
  const w = gearItem(data, rider.equipment?.weapon);
  if (w) return w;
  const start = gearItem(data, data.progression.startingGear.weapon);
  if (!start) throw new Error('No starting weapon in data');
  return start;
}

// ---------- Talents ----------

export function talentById(data: GameData, id: string): TalentData | undefined {
  return data.talents.talents.find((t) => t.id === id);
}

function stageIndex(data: GameData, stage: string): number {
  return data.dragons.stages.findIndex((s) => s.id === stage);
}

/** Talent points earned: one per dragon level from the Juvenile stage on. */
export function talentPointsEarned(data: GameData, dragon: Pick<DragonState, 'level' | 'stage'>): number {
  const juvenile = data.dragons.stages[1];
  if (!juvenile || stageIndex(data, dragon.stage) < 1) return 0;
  return Math.max(0, dragon.level - (juvenile.minLevel - 1));
}

export function talentPointsSpent(dragon: Pick<DragonState, 'talents'>): number {
  return Object.values(dragon.talents ?? {}).reduce((a, b) => a + b, 0);
}

export function talentPointsLeft(data: GameData, dragon: Pick<DragonState, 'level' | 'stage' | 'talents'>): number {
  return talentPointsEarned(data, dragon) - talentPointsSpent(dragon);
}

export function pointsInTree(data: GameData, dragon: Pick<DragonState, 'talents'>, tree: TalentTree): number {
  let n = 0;
  for (const [id, rank] of Object.entries(dragon.talents ?? {})) if (talentById(data, id)?.tree === tree) n += rank;
  return n;
}

export type LearnCheck = { ok: true } | { ok: false; reason: string };

export function canLearn(data: GameData, dragon: Pick<DragonState, 'level' | 'stage' | 'talents'>, talentId: string): LearnCheck {
  const t = talentById(data, talentId);
  if (!t) return { ok: false, reason: 'Unknown talent' };
  if (stageIndex(data, dragon.stage) < 1) return { ok: false, reason: 'Talents open when your dragon becomes a Juvenile' };
  if (t.requiresStage && stageIndex(data, dragon.stage) < stageIndex(data, t.requiresStage)) {
    return { ok: false, reason: `Capstones need an ${data.dragons.stages.find((s) => s.id === t.requiresStage)?.name ?? t.requiresStage} dragon` };
  }
  if (talentPointsLeft(data, dragon) <= 0) return { ok: false, reason: 'No talent points left' };
  const rank = dragon.talents?.[talentId] ?? 0;
  if (rank >= t.ranks) return { ok: false, reason: 'Already at max rank' };
  const inTree = pointsInTree(data, dragon, t.tree);
  if (inTree < t.tier) return { ok: false, reason: `Needs ${t.tier} points in ${t.tree}` };
  return { ok: true };
}

export function learnTalent(data: GameData, dragon: DragonState, talentId: string): DragonState {
  const check = canLearn(data, dragon, talentId);
  if (!check.ok) throw new RangeError(check.reason);
  return { ...dragon, talents: { ...dragon.talents, [talentId]: (dragon.talents[talentId] ?? 0) + 1 } };
}

/** Gold cost of the next respec, or 0 while the stage's free respec is unused. */
export function respecCost(data: GameData, dragon: Pick<DragonState, 'level' | 'freeRespecsUsed'>): number {
  const r = data.talents.respec;
  return dragon.freeRespecsUsed < r.freePerStage ? 0 : r.goldPerDragonLevel * dragon.level;
}

/** Active talent skills the dragon has learned. */
export function learnedSkills(data: GameData, dragon: Pick<DragonState, 'talents'>): TalentData[] {
  return data.talents.talents.filter((t) => t.skill && (dragon.talents?.[t.id] ?? 0) > 0);
}
