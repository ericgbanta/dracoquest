import type { DragonState, DragonStats, ElementId, GameData, RiderState } from './types';
import type { Rng } from './rng';
import { bonusOf, dragonBonus, effectiveDragonStats, effectiveRiderStats, riderBonus } from './loadout';

type RiderLike = Pick<RiderState, 'level' | 'stats'> & Partial<Pick<RiderState, 'equipment'>>;
type DragonLike = Pick<DragonState, 'level' | 'stats'> & Partial<Pick<DragonState, 'equipment' | 'talents' | 'temper'>>;

export function riderMaxHp(data: GameData, r: RiderLike): number {
  const c = data.combat.rider;
  const full = { stats: r.stats, equipment: r.equipment ?? {} };
  const stats = effectiveRiderStats(data, full);
  return Math.round(c.baseHp + c.hpPerVigor * stats.vigor + c.hpPerLevel * (r.level - 1) + bonusOf(riderBonus(data, full), 'riderHp'));
}

export function riderMaxMp(data: GameData, r: Omit<RiderLike, 'level'>): number {
  const c = data.combat.rider;
  const full = { stats: r.stats, equipment: r.equipment ?? {} };
  const stats = effectiveRiderStats(data, full);
  return Math.round(c.baseMp + c.mpPerArcana * stats.arcana + bonusOf(riderBonus(data, full), 'riderMp'));
}

export function dragonMaxHp(data: GameData, d: DragonLike): number {
  const c = data.combat.dragon;
  const full = { stats: d.stats, equipment: d.equipment ?? {}, talents: d.talents ?? {}, temper: d.temper };
  const stats = effectiveDragonStats(data, full);
  return Math.round(c.baseHp + c.hpPerScale * stats.scale + c.hpPerLevel * (d.level - 1) + bonusOf(dragonBonus(data, full), 'dragonHp'));
}

export function newRider(data: GameData, name: string): RiderState {
  const p = data.progression;
  const base = { level: 1, stats: { ...p.riderBaseStats } };
  return {
    name,
    level: 1,
    xp: 0,
    statPoints: 0,
    stats: base.stats,
    hp: riderMaxHp(data, base),
    mp: riderMaxMp(data, base),
    gold: p.startingGold,
    inventory: { ...p.startingInventory },
    gear: Object.values(p.startingGear).filter((x): x is string => !!x),
    equipment: { ...p.startingGear },
  };
}

export function dragonBaseStats(data: GameData, element: ElementId): DragonStats {
  const stats = { ...data.dragons.baseStats };
  const bonus = data.dragons.elementBonus[element] ?? {};
  for (const [k, v] of Object.entries(bonus)) stats[k as keyof DragonStats] += v;
  return stats;
}

export interface HatchOptions {
  id: string;
  name: string;
  element: ElementId;
  colors: { primary: string; secondary: string };
  now: number;
}

/** Create a newly hatched dragon. The favorite food is picked by the RNG and kept hidden. */
export function hatchDragon(data: GameData, rng: Rng, opts: HatchOptions): DragonState {
  const stats = dragonBaseStats(data, opts.element);
  const stage = data.dragons.stages[0];
  if (!stage) throw new Error('No life stages in data');
  const name = opts.name.trim().slice(0, data.dragons.nameMaxLength) || 'Dragon';
  const dragon: DragonState = {
    id: opts.id,
    name,
    element: opts.element,
    stage: stage.id,
    level: 1,
    xp: 0,
    statPoints: 0,
    stats,
    hp: 0,
    bond: 0,
    colors: opts.colors,
    favoriteFood: rng.pick(data.foods).id,
    foodsTried: [],
    hatchedAt: opts.now,
    talents: {},
    freeRespecsUsed: 0,
    equipment: {},
    care: { day: '', meals: 0, groomed: false },
    assignment: { kind: 'idle' },
    temper: { bold: 0, gentle: 0, clever: 0, proud: 0 },
  };
  return { ...dragon, hp: dragonMaxHp(data, dragon) };
}

/** Fully heal rider and dragon (used by Rest and level-ups). */
export function restoreRider(data: GameData, r: RiderState): RiderState {
  return { ...r, hp: riderMaxHp(data, r), mp: riderMaxMp(data, r) };
}

export function restoreDragon(data: GameData, d: DragonState): DragonState {
  return { ...d, hp: dragonMaxHp(data, d) };
}
