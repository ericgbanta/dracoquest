/**
 * Daily care at the Roost. Care is a bonus, never a chore: nothing decays
 * and skipping days costs nothing.
 */
import type { DragonState, GameData } from './types';

export interface CareDay {
  /** Local date, YYYY-MM-DD. */
  day: string;
  meals: number;
  groomed: boolean;
  rested: boolean;
  wellKeptGiven: boolean;
}

export function freshCareDay(day: string): CareDay {
  return { day, meals: 0, groomed: false, rested: false, wellKeptGiven: false };
}

/** The care record for `today`, starting a new one if the date changed. */
export function careFor(care: CareDay, today: string): CareDay {
  return care.day === today ? care : freshCareDay(today);
}

export interface FeedResult { dragon: DragonState; care: CareDay; favorite: boolean; bondGained: number; statPoints: number }

export function feed(data: GameData, dragon: DragonState, care: CareDay, foodId: string): FeedResult {
  const food = data.foods.find((f) => f.id === foodId);
  if (!food) throw new Error(`Unknown food ${foodId}`);
  if (care.meals >= data.care.mealsPerDay) throw new RangeError('No more meals today');
  const favorite = dragon.favoriteFood === food.id;
  const bondGained = data.care.bondPerMeal * (favorite ? data.care.favoriteBondMultiplier : 1);
  const bond = Math.min(data.progression.bond.max, dragon.bond + bondGained);
  const foodsTried = dragon.foodsTried.includes(food.id) ? dragon.foodsTried : [...dragon.foodsTried, food.id];
  return {
    dragon: { ...dragon, bond, statPoints: dragon.statPoints + food.statPoints, foodsTried },
    care: { ...care, meals: care.meals + 1 },
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

export function groom(data: GameData, dragon: DragonState, care: CareDay, taps: number): { dragon: DragonState; care: CareDay; bondGained: number } {
  if (care.groomed) throw new RangeError('Already groomed today');
  const gain = groomBond(data, taps);
  const bond = Math.min(data.progression.bond.max, dragon.bond + gain);
  return { dragon: { ...dragon, bond }, care: { ...care, groomed: true }, bondGained: bond - dragon.bond };
}

export function allCareDone(care: CareDay): boolean {
  return care.meals > 0 && care.groomed && care.rested;
}

/**
 * Once all care actions are done in a day, grant the Well kept buff.
 * Returns the new care record and how many buffed fights to add.
 */
export function checkWellKept(data: GameData, care: CareDay): { care: CareDay; fights: number } {
  if (care.wellKeptGiven || !allCareDone(care)) return { care, fights: 0 };
  return { care: { ...care, wellKeptGiven: true }, fights: data.care.wellKept.fights };
}
