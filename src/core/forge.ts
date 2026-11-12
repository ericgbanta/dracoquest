/**
 * The Forge: upgrade rider gear to +1, +2 or +3 with materials, gold and
 * embers, and craft Forge-only pieces. All numbers live in forge.json and the
 * Forge building's levels in roost.json.
 */
import type { Bonus, BonusKey, GameData, GearData, MaterialId, Materials, RiderState } from './types';
import type { RoostState } from './roost';
import { MATERIALS, RIDER_SLOTS } from './types';

export class ForgeError extends Error {}

const PCT_KEYS = new Set<BonusKey>([
  'riderCrit', 'riderDamagePct', 'dragonCrit', 'clawPct', 'breathPct', 'breathStatusChance', 'strongBonus',
  'guardReduction', 'healPct', 'comboPct', 'goldPct', 'dropPct',
]);

/** A gear piece as it is at `plus`: more damage and bigger bonuses, and "+N" on its name. */
export function forgedGear(data: GameData, g: GearData, plus: number): GearData {
  if (!plus) return g;
  const e = data.forge.effect;
  const bonus: Bonus = {};
  for (const [k, v] of Object.entries(g.bonus) as [BonusKey, number][]) {
    if (PCT_KEYS.has(k)) bonus[k] = Math.round(v * (1 + e.bonusPct * plus) * 1000) / 1000;
    else bonus[k] = v + Math.max(1, Math.round(v * e.bonusPct)) * plus;
  }
  const out: GearData = { ...g, name: `${g.name} +${plus}`, bonus };
  if (g.damage !== undefined) out.damage = g.damage + Math.max(1, Math.round(g.damage * e.weaponDamagePct)) * plus;
  return out;
}

/** The rider's Forge level on a gear piece (0 if never upgraded). */
export function plusOf(rider: Pick<RiderState, 'upgrades'>, gearId: string): number {
  return rider.upgrades?.[gearId] ?? 0;
}

/** Highest plus the Forge at its current level allows (0 if not built). */
export function maxPlus(data: GameData, roost: Pick<RoostState, 'levels'>): number {
  const level = roost.levels.forge ?? 0;
  return level > 0 ? data.roost.buildings.forge.levels[level - 1]?.maxPlus ?? 0 : 0;
}

export interface ForgeCost { gold: number; embers: number; materials: Materials }

/** What it costs to take a gear piece to `plus`, or null past the last plus. */
export function upgradeCostFor(data: GameData, g: GearData, plus: number): ForgeCost | null {
  const u = data.forge.upgrades.find((x) => x.plus === plus);
  if (!u) return null;
  const materials: Materials = {};
  for (const [m, c] of Object.entries(u.materials) as [MaterialId, { base: number; perLevels: number }][]) {
    materials[m] = c.base + Math.floor(g.level / c.perLevels);
  }
  return { gold: Math.max(u.minGold, Math.round(g.price * u.goldPct)), embers: u.embers, materials };
}

/** Gear the Forge can work on: rider gear only (weapon, armor, trinket). */
export function forgeable(g: GearData): boolean {
  return (RIDER_SLOTS as readonly string[]).includes(g.slot);
}

export function canAfford(have: { gold: number; embers: number; materials: Materials }, cost: ForgeCost): boolean {
  if (have.gold < cost.gold || have.embers < cost.embers) return false;
  return MATERIALS.every((m) => (have.materials[m] ?? 0) >= (cost.materials[m] ?? 0));
}

/** Why the next upgrade can't happen, or null if it can. */
export function upgradeBlocker(
  data: GameData, rider: RiderState, embers: number, roost: Pick<RoostState, 'levels'>, gearId: string,
): string | null {
  const g = data.gear[gearId];
  if (!g || !rider.gear.includes(gearId)) return 'You do not own that';
  if (!forgeable(g)) return 'The Forge works on rider gear only';
  const top = maxPlus(data, roost);
  if (top === 0) return 'Build the Forge first';
  const next = plusOf(rider, gearId) + 1;
  if (next > data.forge.upgrades.length) return 'Already at the highest plus';
  if (next > top) return `Upgrade the Forge to reach +${next}`;
  const cost = upgradeCostFor(data, g, next)!;
  if (!canAfford({ gold: rider.gold, embers, materials: rider.materials }, cost)) return 'Not enough materials, gold or embers';
  return null;
}

function spend(rider: RiderState, cost: { gold: number; materials: Materials }): RiderState {
  const materials = { ...rider.materials };
  for (const m of MATERIALS) if (cost.materials[m]) materials[m] = (materials[m] ?? 0) - cost.materials[m]!;
  return { ...rider, gold: rider.gold - cost.gold, materials };
}

/** Upgrade one gear piece by one plus. Returns the new rider and the embers spent. */
export function upgradeGear(
  data: GameData, rider: RiderState, embers: number, roost: Pick<RoostState, 'levels'>, gearId: string,
): { rider: RiderState; embersSpent: number; plus: number } {
  const blocker = upgradeBlocker(data, rider, embers, roost, gearId);
  if (blocker) throw new ForgeError(blocker);
  const plus = plusOf(rider, gearId) + 1;
  const cost = upgradeCostFor(data, data.gear[gearId]!, plus)!;
  const next = spend(rider, cost);
  return { rider: { ...next, upgrades: { ...rider.upgrades, [gearId]: plus } }, embersSpent: cost.embers, plus };
}

/** Craft a Forge-only piece. */
export function craftGear(
  data: GameData, rider: RiderState, embers: number, roost: Pick<RoostState, 'levels'>, gearId: string,
): { rider: RiderState; embersSpent: number } {
  const recipe = data.forge.recipes.find((r) => r.gear === gearId);
  if (!recipe) throw new ForgeError('There is no recipe for that');
  if ((roost.levels.forge ?? 0) < recipe.forgeLevel) throw new ForgeError(`Needs a level ${recipe.forgeLevel} Forge`);
  if (rider.gear.includes(gearId)) throw new ForgeError('You already have one');
  const cost: ForgeCost = { gold: recipe.gold, embers: recipe.embers, materials: recipe.materials };
  if (!canAfford({ gold: rider.gold, embers, materials: rider.materials }, cost)) throw new ForgeError('Not enough materials, gold or embers');
  const next = spend(rider, cost);
  return { rider: { ...next, gear: [...next.gear, gearId] }, embersSpent: cost.embers };
}

/** Add materials to a rider's bag. */
export function addMaterials(rider: RiderState, add: Materials): RiderState {
  const materials = { ...rider.materials };
  for (const m of MATERIALS) if (add[m]) materials[m] = (materials[m] ?? 0) + add[m]!;
  return { ...rider, materials };
}

/** "3 Iron Ore, 1 Sky Crystal" */
export function formatMaterials(data: GameData, m: Materials): string {
  return MATERIALS.filter((k) => m[k]).map((k) => `${m[k]} ${data.forge.materials[k].name}`).join(', ');
}
