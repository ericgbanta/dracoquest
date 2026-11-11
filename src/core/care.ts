/**
 * Daily care at the Roost. Care is a bonus, never a chore: nothing decays
 * and skipping days costs nothing.
 *
 * Meals and grooming count per dragon. Rest and the Well kept buff are for
 * the whole Roost: rest, then feed and groom any dragon on the same day.
 */
import type { DragonCare, DragonState, GameData } from './types';

/** The Roost's day: rest and whether Well kept was already given. */
export interface CareDay {
  /** Local date, YYYY-MM-DD. */
  day: string;
  rested: boolean;
  wellKeptGiven: boolean;
}

export function freshCareDay(day: string): CareDay {
  return { day, rested: false, wellKeptGiven: false };
}

/** The care record for `today`, starting a new one if the date changed. */
export function careFor(care: CareDay, today: string): CareDay {
  return care.day === today ? care : freshCareDay(today);
}

export function freshDragonCare(day: string): DragonCare {
  return { day, meals: 0, groomed: false };
}

export function dragonCareFor(dragon: Pick<DragonState, 'care'>, today: string): DragonCare {
  return dragon.care?.day === today ? dragon.care : freshDragonCare(today);
}

export interface FeedResult { dragon: DragonState; favorite: boolean; bondGained: number; statPoints: number }

export function feed(data: GameData, dragon: DragonState, foodId: string, today: string): FeedResult {
  const food = data.foods.find((f) => f.id === foodId);
  if (!food) throw new Error(`Unknown food ${foodId}`);
  const care = dragonCareFor(dragon, today);
  if (care.meals >= data.care.mealsPerDay) throw new RangeError('No more meals today');
  const favorite = dragon.favoriteFood === food.id;
  const bondGained = data.care.bondPerMeal * (favorite ? data.care.favoriteBondMultiplier : 1);
  const bond = Math.min(data.progression.bond.max, dragon.bond + bondGained);
  const foodsTried = dragon.foodsTried.includes(food.id) ? dragon.foodsTried : [...dragon.foodsTried, food.id];
  return {
    dragon: { ...dragon, bond, statPoints: dragon.statPoints + food.statPoints, foodsTried, care: { ...care, meals: care.meals + 1 } },
    favorite,
    bondGained: bond - dragon.bond,
    statPoints: food.statPoints,
  };
}

/** Bond from the Groom and Play mini-game, based on how many targets were tapped. */
export function groomBond(data: GameData, taps: number): number {
  const g = data.care.groom;
  return Math.min(g.maxBond, g.bondBase + Math.floor(Math.max(0, taps) / g.tapsPerBond));
}

export function groom(data: GameData, dragon: DragonState, taps: number, today: string): { dragon: DragonState; bondGained: number } {
  const care = dragonCareFor(dragon, today);
  if (care.groomed) throw new RangeError('Already groomed today');
  const gain = groomBond(data, taps);
  const bond = Math.min(data.progression.bond.max, dragon.bond + gain);
  return { dragon: { ...dragon, bond, care: { ...care, groomed: true } }, bondGained: bond - dragon.bond };
}

/** Rest done today, and at least one dragon fed and groomed today. */
export function allCareDone(care: CareDay, dragons: DragonState[], today: string): boolean {
  if (care.day !== today || !care.rested) return false;
  return dragons.some((d) => {
    const c = dragonCareFor(d, today);
    return c.meals > 0 && c.groomed;
  });
}

/**
 * Once all care actions are done in a day, grant the Well kept buff.
 * Returns the new care record and how many buffed fights to add.
 */
export function checkWellKept(data: GameData, care: CareDay, dragons: DragonState[], today: string): { care: CareDay; fights: number } {
  if (care.wellKeptGiven || !allCareDone(care, dragons, today)) return { care, fights: 0 };
  return { care: { ...care, wellKeptGiven: true }, fights: data.care.wellKept.fights };
}
