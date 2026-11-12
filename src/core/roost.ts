/**
 * The Roost: buildings, real-time timers, embers, and temperament.
 *
 * Timers use the device clock, passed in as `now` (ms). Every timer is
 * capped, so time away is rewarded up to a limit and never punished.
 * If the clock goes backwards, timers restart from the new time instead
 * of producing anything.
 */
import type { Rng } from './rng';
import { enemyXp } from './progression';
import type { BuildingId, Cost, DragonState, GameData, Materials, TemperamentId } from './types';
import { MATERIALS } from './types';
export type { Assignment } from './types';

const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;

export interface PantryState { lastAt: number; stored: number }
export interface IncubatingEgg { element: DragonState['element']; readyAt: number }

export interface RoostState {
  /** Building levels. 0 means not built yet. */
  levels: Record<BuildingId, number>;
  pantry: PantryState;
  hatchery: { eggs: IncubatingEgg[] };
}

export const BUILDINGS: readonly BuildingId[] = ['nest', 'pantry', 'hatchery', 'training', 'expeditions', 'forge'];

export function newRoost(now: number): RoostState {
  return {
    levels: { nest: 1, pantry: 1, hatchery: 0, training: 0, expeditions: 0, forge: 0 },
    pantry: { lastAt: now, stored: 0 },
    hatchery: { eggs: [] },
  };
}

// ---------- Buildings ----------

type LevelOf<B extends BuildingId> = GameData['roost']['buildings'][B]['levels'][number];

/** The current level's numbers, or null if the building isn't built. */
export function buildingLevel<B extends BuildingId>(data: GameData, roost: RoostState, b: B): LevelOf<B> | null {
  const lvl = roost.levels[b];
  if (lvl <= 0) return null;
  return (data.roost.buildings[b].levels[lvl - 1] as LevelOf<B>) ?? null;
}

/** Cost of the next level (or of building it), or null at max level. */
export function upgradeCost(data: GameData, roost: RoostState, b: BuildingId): Cost | null {
  const next = data.roost.buildings[b].levels[roost.levels[b]];
  if (!next) return null;
  return next.cost ?? { gold: 0, embers: 0 };
}

export function nestSlots(data: GameData, roost: RoostState): number {
  return buildingLevel(data, roost, 'nest')?.slots ?? 3;
}

// ---------- Pantry ----------

/** Bring the pantry up to `now`: add food made since last time, up to its store. */
export function tickPantry(data: GameData, roost: RoostState, now: number): RoostState {
  const lvl = buildingLevel(data, roost, 'pantry');
  if (!lvl) return roost;
  const p = roost.pantry;
  if (now < p.lastAt) return { ...roost, pantry: { ...p, lastAt: now } };
  const period = lvl.minutesPerFood * MINUTE;
  const made = Math.floor((now - p.lastAt) / period);
  if (made <= 0) return roost;
  const stored = Math.min(lvl.store, p.stored + made);
  // A full pantry stops making food, so the clock restarts from now.
  const lastAt = stored >= lvl.store ? now : p.lastAt + made * period;
  return { ...roost, pantry: { lastAt, stored } };
}

/** Minutes until the next food, or null when the pantry is full. */
export function pantryNextIn(data: GameData, roost: RoostState, now: number): number | null {
  const lvl = buildingLevel(data, roost, 'pantry');
  if (!lvl || roost.pantry.stored >= lvl.store) return null;
  const period = lvl.minutesPerFood * MINUTE;
  return Math.max(0, Math.ceil((roost.pantry.lastAt + period - Math.max(now, roost.pantry.lastAt)) / MINUTE));
}

/** Empty the pantry into a list of food ids. Premium food has a chance at higher levels. */
export function collectPantry(data: GameData, roost: RoostState, now: number, rng: Rng): { roost: RoostState; food: string[] } {
  const ticked = tickPantry(data, roost, now);
  const lvl = buildingLevel(data, ticked, 'pantry');
  const basic = data.foods.filter((f) => !f.premium);
  const food: string[] = [];
  for (let i = 0; i < ticked.pantry.stored; i++) {
    food.push(lvl && rng.chance(lvl.premiumChance) ? data.roost.premiumFood : rng.pick(basic).id);
  }
  return { roost: { ...ticked, pantry: { ...ticked.pantry, stored: 0 } }, food };
}

// ---------- Hatchery ----------

export function hatcherySlotsFree(data: GameData, roost: RoostState): number {
  const lvl = buildingLevel(data, roost, 'hatchery');
  return lvl ? Math.max(0, lvl.slots - roost.hatchery.eggs.length) : 0;
}

export function incubate(data: GameData, roost: RoostState, element: IncubatingEgg['element'], now: number): RoostState {
  const lvl = buildingLevel(data, roost, 'hatchery');
  if (!lvl) throw new RangeError('Build the Hatchery first');
  if (hatcherySlotsFree(data, roost) <= 0) throw new RangeError('The Hatchery is full');
  return { ...roost, hatchery: { eggs: [...roost.hatchery.eggs, { element, readyAt: now + lvl.hours * HOUR }] } };
}

export function eggReady(egg: IncubatingEgg, now: number): boolean {
  return now >= egg.readyAt;
}

// ---------- Training Yard ----------

/** Hours of training banked since `since`, capped by the yard. Negative clock jumps count as zero. */
export function trainingHours(data: GameData, roost: RoostState, since: number, now: number): number {
  const lvl = buildingLevel(data, roost, 'training');
  if (!lvl) return 0;
  return Math.min(lvl.maxHours, Math.max(0, (now - since) / HOUR));
}

export function trainingXp(data: GameData, roost: RoostState, dragon: Pick<DragonState, 'level'>, since: number, now: number): number {
  const lvl = buildingLevel(data, roost, 'training');
  if (!lvl) return 0;
  const fights = trainingHours(data, roost, since, now) * lvl.fightsPerHour;
  return Math.floor(fights * enemyXp(data.progression, dragon.level));
}

// ---------- Expedition Board ----------

export function tripById(data: GameData, id: string) {
  return data.roost.trips.find((t) => t.id === id);
}

/** Trips this dragon can take with the board's current level. */
export function availableTrips(data: GameData, roost: RoostState, dragon: Pick<DragonState, 'level'>) {
  const lvl = buildingLevel(data, roost, 'expeditions');
  if (!lvl) return [];
  return data.roost.trips.filter((t) => t.hours <= lvl.maxHours && dragon.level >= t.minLevel);
}

export interface TripLoot { gold: number; food: string[]; embers: number; xp: number; materials: Materials }

export function rollTripLoot(data: GameData, roost: RoostState, tripId: string, dragon: Pick<DragonState, 'level'>, rng: Rng): TripLoot {
  const trip = tripById(data, tripId);
  if (!trip) throw new RangeError('Unknown trip');
  const mult = buildingLevel(data, roost, 'expeditions')?.lootMultiplier ?? 1;
  const basic = data.foods.filter((f) => !f.premium);
  const food = Array.from({ length: trip.food }, () => rng.pick(basic).id);
  const embers = rng.chance(trip.emberChance) ? rng.int(1, Math.max(1, Math.round(trip.hours / 4))) : 0;
  const materials: Materials = {};
  for (const m of MATERIALS) {
    const range = trip.materials?.[m];
    if (!range) continue;
    const n = Math.round(rng.int(range[0], range[1]) * mult);
    if (n > 0) materials[m] = n;
  }
  return {
    materials,
    gold: Math.round(rng.int(trip.gold[0], trip.gold[1]) * mult),
    food,
    embers,
    // A trip is good exercise: about half a fight's XP per hour.
    xp: Math.floor(trip.hours * 0.5 * enemyXp(data.progression, dragon.level)),
  };
}

// ---------- Temperament ----------

export type TemperamentPoints = Record<TemperamentId, number>;
export const TEMPERAMENTS: readonly TemperamentId[] = ['bold', 'gentle', 'clever', 'proud'];

export function emptyTemper(): TemperamentPoints {
  return { bold: 0, gentle: 0, clever: 0, proud: 0 };
}

const SOURCE: Record<keyof GameData['roost']['temperament']['points'], TemperamentId> = {
  fightWon: 'bold', bossWon: 'proud', care: 'gentle', groom: 'gentle', skill: 'clever', expedition: 'clever', training: 'proud',
};

export function addTemper(data: GameData, dragon: DragonState, source: keyof typeof SOURCE, times = 1): DragonState {
  if (times <= 0) return dragon;
  const kind = SOURCE[source];
  const pts = data.roost.temperament.points[source] * times;
  const temper = { ...(dragon.temper ?? emptyTemper()) };
  temper[kind] += pts;
  return { ...dragon, temper };
}

/** The temperament the dragon leans toward. */
export function leaning(dragon: Partial<Pick<DragonState, 'temper'>>): TemperamentId | null {
  const t = dragon.temper ?? emptyTemper();
  let best: TemperamentId | null = null;
  for (const k of TEMPERAMENTS) if (t[k] > 0 && (!best || t[k] > t[best])) best = k;
  return best;
}

/** The settled temperament, once the dragon has enough history; null before. */
export function temperament(data: GameData, dragon: Partial<Pick<DragonState, 'temper'>>): TemperamentId | null {
  const t = dragon.temper ?? emptyTemper();
  const total = TEMPERAMENTS.reduce((a, k) => a + t[k], 0);
  return total >= data.roost.temperament.settleAt ? leaning(dragon) : null;
}

// ---------- Dates ----------

/** The day before a YYYY-MM-DD date. */
export function previousDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  if (!y || !m || !d) return '';
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() - 1);
  return date.toISOString().slice(0, 10);
}
